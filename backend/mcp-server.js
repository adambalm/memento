#!/usr/bin/env node
/**
 * Memento MCP Server
 *
 * Exposes session data and context management to Claude Desktop via MCP protocol.
 * Part of the Context Sage pipeline: CAPTURE (Memento) → ORGANIZE (Basic Memory)
 *
 * Architecture: Claude Desktop is the sole orchestrator. Memento never knows about Basic Memory.
 * See: dialogues/memento-mcp-architecture.md
 */

// MCP SDK imports
// Note: Using direct paths because package.json exports with Node CommonJS can be problematic
const path = require('path');
const sdkPath = path.join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'server');
const { McpServer } = require(path.join(sdkPath, 'mcp.js'));
const { StdioServerTransport } = require(path.join(sdkPath, 'stdio.js'));
const { z } = require('zod');

const { listSessions, readSession, getLatestSession, searchSessions } = require('./memory');
const { loadContext, saveContext } = require('./contextLoader');
const { reclassifySession } = require('./mcp/reclassify');

// Create the MCP server
const server = new McpServer({
  name: 'memento',
  version: '1.0.0'
});

// === SESSION QUERY TOOLS ===

server.tool(
  'list_sessions',
  'List all captured browsing sessions with summary metadata (id, timestamp, tabCount, narrative, sessionPattern)',
  {},
  async () => {
    const sessions = await listSessions();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(sessions, null, 2)
      }]
    };
  }
);

server.tool(
  'read_session',
  'Read the full JSON content of a specific session by ID',
  {
    id: z.string().describe('Session ID (timestamp-based, e.g., 2026-01-01T08-36-28)')
  },
  async ({ id }) => {
    const session = await readSession(id);
    if (!session) {
      return {
        content: [{
          type: 'text',
          text: `Session not found: ${id}`
        }],
        isError: true
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(session, null, 2)
      }]
    };
  }
);

server.tool(
  'get_latest',
  'Get the most recent browsing session',
  {},
  async () => {
    const session = await getLatestSession();
    if (!session) {
      return {
        content: [{
          type: 'text',
          text: 'No sessions found'
        }]
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(session, null, 2)
      }]
    };
  }
);

server.tool(
  'search_sessions',
  'Search sessions for matching keywords. Returns sessions containing the query string.',
  {
    query: z.string().describe('Search query to match against session content')
  },
  async ({ query }) => {
    const results = await searchSessions(query);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          matchCount: results.length,
          results
        }, null, 2)
      }]
    };
  }
);

// === CONTEXT MANAGEMENT TOOLS ===

server.tool(
  'get_active_projects',
  'Get current active projects from context.json. Returns null if no context file exists.',
  {},
  async () => {
    const context = loadContext();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(context, null, 2)
      }]
    };
  }
);

server.tool(
  'set_active_projects',
  'Update active projects in context.json. This is the authoritative config for classification.',
  {
    projects: z.array(z.object({
      name: z.string().describe('Project name'),
      keywords: z.array(z.string()).optional().describe('Keywords for matching'),
      categoryType: z.string().optional().describe('Category type (e.g., Project, Development, Creative Writing)')
    })).describe('Array of project objects')
  },
  async ({ projects }) => {
    try {
      const saved = await saveContext(projects);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Saved ${projects.length} active project(s)`,
            saved
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Failed to save context: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// === RE-CLASSIFICATION TOOLS ===

server.tool(
  'reclassify_session',
  'Re-run classification on an existing session with current context. Creates a new artifact, never overwrites original.',
  {
    session_id: z.string().describe('Session ID to reclassify'),
    scope: z.enum(['pass4', 'full']).default('pass4').describe('pass4 = thematic analysis only (default), full = all 4 passes')
  },
  async ({ session_id, scope }) => {
    try {
      const result = await reclassifySession(session_id, scope);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Re-classification failed: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('Memento MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
