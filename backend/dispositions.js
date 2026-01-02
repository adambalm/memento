/**
 * Dispositions Module
 *
 * Enforces the append-only dispositions invariant.
 * See: docs/SESSION-ARTIFACT-INVARIANTS.md
 *
 * INVARIANT: Disposition entries are append-only.
 * This module provides the ONLY path to modify the dispositions array.
 * No function exists to edit or delete existing entries.
 */

const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory', 'sessions');

/**
 * Valid disposition actions
 */
const VALID_ACTIONS = ['trash', 'complete', 'regroup', 'reprioritize', 'promote'];

/**
 * Get the file path for a session
 */
function sessionPath(sessionId) {
  return path.join(MEMORY_DIR, `${sessionId}.json`);
}

/**
 * Append a disposition to a session's dispositions array.
 *
 * This is the ONLY function that modifies the dispositions array.
 * It enforces append-only semantics.
 *
 * @param {string} sessionId - Session ID (filename without .json)
 * @param {Object} disposition - The disposition to append
 * @param {string} disposition.action - One of: trash, complete, regroup, reprioritize, promote
 * @param {string} disposition.itemId - The tab/item ID affected
 * @param {string} [disposition.from] - For regroup: original category
 * @param {string} [disposition.to] - For regroup: new category
 * @param {string} [disposition.target] - For promote: destination URI
 * @param {number} [disposition.priority] - For reprioritize: new priority
 * @returns {Promise<{success: boolean, message: string, disposition?: Object}>}
 */
async function appendDisposition(sessionId, disposition) {
  // Validate action
  if (!disposition.action || !VALID_ACTIONS.includes(disposition.action)) {
    return {
      success: false,
      message: `Invalid action: ${disposition.action}. Must be one of: ${VALID_ACTIONS.join(', ')}`
    };
  }

  // Validate itemId
  if (!disposition.itemId) {
    return {
      success: false,
      message: 'Missing required field: itemId'
    };
  }

  // Action-specific validation
  if (disposition.action === 'regroup') {
    if (!disposition.from || !disposition.to) {
      return {
        success: false,
        message: 'regroup action requires "from" and "to" fields'
      };
    }
  }

  if (disposition.action === 'promote') {
    if (!disposition.target) {
      return {
        success: false,
        message: 'promote action requires "target" field'
      };
    }
  }

  try {
    // Read current session
    const filepath = sessionPath(sessionId);
    const content = await fs.readFile(filepath, 'utf-8');
    const session = JSON.parse(content);

    // Build the disposition entry with timestamp
    const entry = {
      action: disposition.action,
      itemId: disposition.itemId,
      at: new Date().toISOString()
    };

    // Add action-specific fields
    if (disposition.from) entry.from = disposition.from;
    if (disposition.to) entry.to = disposition.to;
    if (disposition.target) entry.target = disposition.target;
    if (disposition.priority !== undefined) entry.priority = disposition.priority;

    // Ensure dispositions array exists
    if (!session.dispositions) {
      session.dispositions = [];
    }

    // APPEND ONLY — this is the invariant
    session.dispositions.push(entry);

    // Write back
    await fs.writeFile(filepath, JSON.stringify(session, null, 2));

    console.error(`Disposition appended: ${disposition.action} on ${disposition.itemId} in session ${sessionId}`);

    return {
      success: true,
      message: `Appended ${disposition.action} disposition`,
      disposition: entry
    };

  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        message: `Session not found: ${sessionId}`
      };
    }
    console.error(`Failed to append disposition: ${error.message}`);
    return {
      success: false,
      message: `Failed to append disposition: ${error.message}`
    };
  }
}

/**
 * Get all dispositions for a session
 *
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Array of disposition entries (empty if none)
 */
async function getDispositions(sessionId) {
  try {
    const filepath = sessionPath(sessionId);
    const content = await fs.readFile(filepath, 'utf-8');
    const session = JSON.parse(content);
    return session.dispositions || [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Get the current state of a session with dispositions applied.
 *
 * Returns items organized by their CURRENT category (after regrouping),
 * with disposition status (trashed, completed, promoted) indicated.
 *
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session with dispositions applied as a view layer
 */
async function getSessionWithDispositions(sessionId) {
  try {
    const filepath = sessionPath(sessionId);
    const content = await fs.readFile(filepath, 'utf-8');
    const session = JSON.parse(content);

    // Build a map of item states from dispositions
    const itemStates = new Map();
    const itemCategories = new Map();

    // Initialize from original groups
    // Groups can be either an object { "Category": [...items] } or array [{ category, items }]
    const groups = session.groups || {};
    const isObjectFormat = !Array.isArray(groups);

    if (isObjectFormat) {
      // Object format: { "Research": [...], "Development": [...] }
      for (const [category, items] of Object.entries(groups)) {
        for (const item of (items || [])) {
          const itemId = item.url || item.id;
          itemCategories.set(itemId, category);
          itemStates.set(itemId, { status: 'pending' });
        }
      }
    } else {
      // Array format: [{ category: "Research", items: [...] }]
      for (const group of groups) {
        for (const item of (group.items || [])) {
          const itemId = item.url || item.id;
          itemCategories.set(itemId, group.category);
          itemStates.set(itemId, { status: 'pending' });
        }
      }
    }

    // Apply dispositions in order
    for (const disp of (session.dispositions || [])) {
      const current = itemStates.get(disp.itemId) || { status: 'pending' };

      switch (disp.action) {
        case 'trash':
          current.status = 'trashed';
          current.trashedAt = disp.at;
          break;
        case 'complete':
          current.status = 'completed';
          current.completedAt = disp.at;
          break;
        case 'promote':
          current.status = 'promoted';
          current.promotedAt = disp.at;
          current.promotedTo = disp.target;
          break;
        case 'regroup':
          itemCategories.set(disp.itemId, disp.to);
          break;
        case 'reprioritize':
          current.priority = disp.priority;
          break;
      }

      itemStates.set(disp.itemId, current);
    }

    // Count unresolved items (not trashed, completed, or promoted)
    let unresolvedCount = 0;
    for (const [itemId, state] of itemStates) {
      if (state.status === 'pending') {
        unresolvedCount++;
      }
    }

    return {
      sessionId,
      capturedAt: session.meta?.capturedAt || session.timestamp,
      originalGroups: session.groups,
      itemStates: Object.fromEntries(itemStates),
      itemCategories: Object.fromEntries(itemCategories),
      dispositionCount: (session.dispositions || []).length,
      unresolvedCount,
      allResolved: unresolvedCount === 0
    };

  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

module.exports = {
  appendDisposition,
  getDispositions,
  getSessionWithDispositions,
  VALID_ACTIONS
};
