const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory', 'sessions');

function getSessionFilename() {
  const now = new Date();
  return now.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '') + '.json';
}

async function ensureDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function saveSession(data) {
  try {
    await ensureDir();
    const filename = getSessionFilename();
    const filepath = path.join(MEMORY_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`Session saved: ${filename}`);
  } catch (error) {
    console.error('Failed to save session:', error.message);
    // Non-fatal: don't throw
  }
}

/**
 * List all sessions with summary metadata
 * @returns {Promise<Array<{id, timestamp, tabCount, narrative, sessionPattern}>>}
 */
async function listSessions() {
  try {
    await ensureDir();
    const files = await fs.readdir(MEMORY_DIR);
    const sessions = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const filepath = path.join(MEMORY_DIR, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const session = JSON.parse(content);
        sessions.push({
          id: file.replace('.json', ''),
          timestamp: session.timestamp,
          tabCount: session.totalTabs || 0,
          narrative: session.narrative || null,
          sessionPattern: session.thematicAnalysis?.sessionPattern?.type || null
        });
      } catch (err) {
        // Skip malformed session files
        console.warn(`Skipping malformed session file: ${file}`);
      }
    }

    // Sort by timestamp descending (most recent first)
    return sessions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch (error) {
    console.error('Failed to list sessions:', error.message);
    return [];
  }
}

/**
 * Read a specific session by ID
 * @param {string} id - Session ID (filename without .json)
 * @returns {Promise<Object|null>} Full session JSON or null if not found
 */
async function readSession(id) {
  try {
    const filepath = path.join(MEMORY_DIR, `${id}.json`);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // Session not found
    }
    console.error(`Failed to read session ${id}:`, error.message);
    throw error;
  }
}

/**
 * Get the most recent session
 * @returns {Promise<Object|null>} Full session JSON or null if no sessions
 */
async function getLatestSession() {
  const sessions = await listSessions();
  if (sessions.length === 0) return null;
  return readSession(sessions[0].id);
}

/**
 * Search sessions for matching keywords
 * @param {string} query - Search query
 * @returns {Promise<Array>} Sessions matching the query with match context
 */
async function searchSessions(query) {
  const sessions = await listSessions();
  const queryLower = query.toLowerCase();
  const results = [];

  for (const summary of sessions) {
    try {
      const full = await readSession(summary.id);
      if (!full) continue;

      const searchable = JSON.stringify(full).toLowerCase();
      if (searchable.includes(queryLower)) {
        // Extract match context
        const matchIndex = searchable.indexOf(queryLower);
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(searchable.length, matchIndex + query.length + 50);
        const matchContext = '...' + searchable.slice(contextStart, contextEnd) + '...';

        results.push({
          ...summary,
          matchContext
        });
      }
    } catch (err) {
      // Skip sessions that fail to load
    }
  }

  return results;
}

module.exports = {
  saveSession,
  listSessions,
  readSession,
  getLatestSession,
  searchSessions
};
