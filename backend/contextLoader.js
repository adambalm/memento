/**
 * Context Loader
 * Loads user context from ~/.memento/context.json if available.
 * Returns null if file doesn't exist - Memento works fine without it.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Context file location (user-level, shared across projects)
const CONTEXT_PATH = path.join(os.homedir(), '.memento', 'context.json');

// Maximum age before context is considered stale (24 hours)
const MAX_CONTEXT_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Check if context is stale based on generated timestamp
 */
function isStale(generated, maxAgeMs = MAX_CONTEXT_AGE_MS) {
  if (!generated) return true;

  try {
    const generatedDate = new Date(generated);
    const ageMs = Date.now() - generatedDate.getTime();
    return ageMs > maxAgeMs;
  } catch {
    return true;
  }
}

/**
 * Load context from ~/.memento/context.json
 * Returns null if:
 * - File doesn't exist
 * - File is invalid JSON
 * - Context is stale (>24h old)
 */
function loadContext() {
  try {
    if (!fs.existsSync(CONTEXT_PATH)) {
      // No context file - this is fine, Memento works without it
      return null;
    }

    const raw = fs.readFileSync(CONTEXT_PATH, 'utf-8');
    const context = JSON.parse(raw);

    // Validate required fields
    if (!context.version || !context.activeProjects) {
      console.warn('[Context] Invalid context file: missing required fields');
      return null;
    }

    // Check staleness
    if (isStale(context.generated)) {
      console.log('[Context] Context file is stale (>24h), ignoring');
      return null;
    }

    console.log(`[Context] Loaded ${context.activeProjects.length} active project(s) from context.json`);
    return context;
  } catch (error) {
    // File doesn't exist or is invalid - this is fine
    if (error.code !== 'ENOENT') {
      console.warn(`[Context] Error loading context: ${error.message}`);
    }
    return null;
  }
}

/**
 * Get the path where context.json should be stored
 * Useful for the triage skill to know where to write
 */
function getContextPath() {
  return CONTEXT_PATH;
}

module.exports = { loadContext, getContextPath, isStale };
