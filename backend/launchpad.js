/**
 * Launchpad Renderer
 *
 * Generates the Launchpad UI for forced-completion mode.
 * Unlike Results (read-only), Launchpad allows user actions:
 * - Trash (discard as noise)
 * - Complete (mark as done)
 * - Promote (create KB artifact)
 * - Regroup (move to different category via drag/drop)
 *
 * See: docs/SESSION-ARTIFACT-INVARIANTS.md
 */

/**
 * Render the Launchpad page for a session
 * @param {string} sessionId - Session ID
 * @param {Object} sessionState - Session with dispositions applied
 * @returns {string} HTML page
 */
function renderLaunchpadPage(sessionId, sessionState) {
  const { originalGroups, itemStates, itemCategories, unresolvedCount, capturedAt } = sessionState;

  // Build items by current category (after regrouping)
  const categorizedItems = new Map();

  // Handle both object format { "Category": [...] } and array format [{ category, items }]
  const groups = originalGroups || {};
  const isObjectFormat = !Array.isArray(groups);

  if (isObjectFormat) {
    // Object format: { "Research": [...], "Development": [...] }
    for (const [category, items] of Object.entries(groups)) {
      for (const item of (items || [])) {
        const itemId = item.url || item.id;
        const currentCategory = itemCategories[itemId] || category;
        const state = itemStates[itemId] || { status: 'pending' };

        if (!categorizedItems.has(currentCategory)) {
          categorizedItems.set(currentCategory, []);
        }

        categorizedItems.get(currentCategory).push({
          ...item,
          itemId,
          state
        });
      }
    }
  } else {
    // Array format: [{ category: "Research", items: [...] }]
    for (const group of groups) {
      for (const item of (group.items || [])) {
        const itemId = item.url || item.id;
        const currentCategory = itemCategories[itemId] || group.category;
        const state = itemStates[itemId] || { status: 'pending' };

        if (!categorizedItems.has(currentCategory)) {
          categorizedItems.set(currentCategory, []);
        }

        categorizedItems.get(currentCategory).push({
          ...item,
          itemId,
          state
        });
      }
    }
  }

  // Generate category sections
  const categorySections = Array.from(categorizedItems.entries())
    .map(([category, items]) => renderCategorySection(category, items))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launchpad - ${unresolvedCount} items remaining</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #333;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .header .status {
      font-size: 14px;
      color: #888;
    }

    .header .status .count {
      color: #f59e0b;
      font-weight: 600;
    }

    .header .status.complete .count {
      color: #10b981;
    }

    .category {
      margin-bottom: 24px;
      background: #141414;
      border-radius: 8px;
      overflow: hidden;
    }

    .category-header {
      padding: 12px 16px;
      background: #1a1a1a;
      font-weight: 600;
      font-size: 14px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
    }

    .category.protected .category-header {
      background: #422006;
      color: #fbbf24;
    }

    .category.protected {
      border: 1px solid #854d0e;
    }

    .category.synthesis .category-header {
      background: #1e3a5f;
      color: #7dd3fc;
    }

    .category.synthesis {
      border: 1px solid #0369a1;
    }

    .category-header .item-count {
      color: #666;
    }

    .item {
      padding: 12px 16px;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background 0.15s, opacity 0.3s;
    }

    .item:last-child { border-bottom: none; }

    .item:hover { background: #1a1a1a; }

    .item.trashed {
      opacity: 0.4;
      text-decoration: line-through;
    }

    .item.completed {
      opacity: 0.6;
    }

    .item.completed .item-title::before {
      content: '✓ ';
      color: #10b981;
    }

    .item.promoted {
      opacity: 0.6;
    }

    .item.promoted .item-title::before {
      content: '↗ ';
      color: #3b82f6;
    }

    .item.deferred {
      opacity: 0.6;
    }

    .item.deferred .item-title::before {
      content: '⏸ ';
      color: #a855f7;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-title a {
      color: #60a5fa;
      text-decoration: none;
    }

    .item-title a:hover { text-decoration: underline; }

    .item-url {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .item-actions {
      display: flex;
      gap: 8px;
      opacity: 0.7;
      transition: opacity 0.15s;
    }

    .item:hover .item-actions,
    .item-actions:focus-within {
      opacity: 1;
    }

    .item.trashed .item-actions,
    .item.completed .item-actions,
    .item.promoted .item-actions,
    .item.deferred .item-actions {
      display: none;
    }

    .action-btn {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .action-btn.trash {
      background: #7f1d1d;
      color: #fca5a5;
    }
    .action-btn.trash:hover { background: #991b1b; }

    .action-btn.complete {
      background: #14532d;
      color: #86efac;
    }
    .action-btn.complete:hover { background: #166534; }

    .action-btn.promote {
      background: #1e3a8a;
      color: #93c5fd;
    }
    .action-btn.promote:hover { background: #1e40af; }

    .action-btn.defer {
      background: #581c87;
      color: #d8b4fe;
    }
    .action-btn.defer:hover { background: #6b21a8; }

    .action-btn.undo {
      background: #374151;
      color: #d1d5db;
    }
    .action-btn.undo:hover { background: #4b5563; }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-info {
      font-size: 12px;
      color: #666;
    }

    .clear-lock-btn {
      padding: 8px 16px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      opacity: 0.5;
      pointer-events: none;
    }

    .clear-lock-btn.enabled {
      opacity: 1;
      pointer-events: auto;
    }

    .clear-lock-btn.enabled:hover {
      background: #059669;
    }

    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #1f2937;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s, transform 0.3s;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .toast.error { border-left: 3px solid #ef4444; }
    .toast.success { border-left: 3px solid #10b981; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Launchpad</h1>
    <div class="status ${unresolvedCount === 0 ? 'complete' : ''}">
      <span class="count" id="unresolved-count">${unresolvedCount}</span> items remaining
      <span style="color: #666; margin-left: 8px;">Captured: ${formatTimestamp(capturedAt)}</span>
    </div>
  </div>

  <div id="categories">
    ${categorySections}
  </div>

  <div class="footer">
    <div class="footer-info">
      Session: ${sessionId}
    </div>
    <button id="clear-lock-btn" class="clear-lock-btn ${unresolvedCount === 0 ? 'enabled' : ''}"
            onclick="clearLock()" ${unresolvedCount > 0 ? 'disabled' : ''}>
      ${unresolvedCount === 0 ? 'Complete Session' : 'Resolve all items to unlock'}
    </button>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const SESSION_ID = '${sessionId}';
    let unresolvedCount = ${unresolvedCount};
    const lastActions = new Map(); // Track last action per item for undo

    async function recordDisposition(itemId, action, extra = {}) {
      try {
        const response = await fetch('/api/launchpad/' + SESSION_ID + '/disposition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, itemId, ...extra })
        });

        const result = await response.json();

        if (result.success) {
          // Update UI
          const itemEl = document.querySelector('[data-item-id="' + CSS.escape(itemId) + '"]');
          if (itemEl) {
            const statusClass = action === 'trash' ? 'trashed' : action === 'complete' ? 'completed' : action === 'defer' ? 'deferred' : 'promoted';
            itemEl.classList.add(statusClass);

            // Track action for undo and show undo button
            lastActions.set(itemId, action);
            showUndoButton(itemEl, itemId, action);
          }

          // Update count
          unresolvedCount--;
          document.getElementById('unresolved-count').textContent = unresolvedCount;

          // Enable clear button if all resolved
          if (unresolvedCount === 0) {
            const btn = document.getElementById('clear-lock-btn');
            btn.classList.add('enabled');
            btn.disabled = false;
            btn.textContent = 'Complete Session';
            document.querySelector('.status').classList.add('complete');
          }

          showToast('Item ' + action + (action === 'trash' ? 'ed' : 'd'), 'success');
        } else {
          showToast(result.message || 'Failed', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function showUndoButton(itemEl, itemId, lastAction) {
      // Remove existing undo button if any
      const existingUndo = itemEl.querySelector('.undo-container');
      if (existingUndo) existingUndo.remove();

      // Create undo container
      const undoContainer = document.createElement('div');
      undoContainer.className = 'undo-container';
      undoContainer.style.cssText = 'display: flex; gap: 8px; margin-left: auto;';

      const undoBtn = document.createElement('button');
      undoBtn.className = 'action-btn undo';
      undoBtn.textContent = 'Undo';
      undoBtn.onclick = () => undoDisposition(itemId, lastAction);

      undoContainer.appendChild(undoBtn);
      itemEl.appendChild(undoContainer);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (undoContainer.parentNode) {
          undoContainer.remove();
        }
      }, 10000);
    }

    async function undoDisposition(itemId, undoneAction) {
      try {
        const response = await fetch('/api/launchpad/' + SESSION_ID + '/disposition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'undo', itemId, undoes: undoneAction })
        });

        const result = await response.json();

        if (result.success) {
          // Update UI - restore to pending
          const itemEl = document.querySelector('[data-item-id="' + CSS.escape(itemId) + '"]');
          if (itemEl) {
            itemEl.classList.remove('trashed', 'completed', 'promoted', 'deferred');

            // Remove undo button
            const undoContainer = itemEl.querySelector('.undo-container');
            if (undoContainer) undoContainer.remove();
          }

          // Update count
          unresolvedCount++;
          document.getElementById('unresolved-count').textContent = unresolvedCount;

          // Disable clear button if items now pending
          if (unresolvedCount > 0) {
            const btn = document.getElementById('clear-lock-btn');
            btn.classList.remove('enabled');
            btn.disabled = true;
            btn.textContent = 'Resolve all items to unlock';
            document.querySelector('.status').classList.remove('complete');
          }

          lastActions.delete(itemId);
          showToast('Action undone', 'success');
        } else {
          showToast(result.message || 'Failed to undo', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    async function clearLock() {
      if (unresolvedCount > 0) return;

      try {
        const response = await fetch('/api/launchpad/' + SESSION_ID + '/clear-lock', {
          method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
          showToast('Session complete! Lock cleared.', 'success');
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          showToast(result.message || 'Failed to clear lock', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  </script>
</body>
</html>`;
}

/**
 * Render a category section with its items
 */
function renderCategorySection(category, items) {
  const pendingCount = items.filter(i => i.state.status === 'pending').length;

  // Determine special category classes
  // Protected categories have (Protected) suffix - these get no Trash button
  const isProtected = category.toLowerCase().includes('protected');
  const isSynthesis = category.toLowerCase().includes('synthesis') || category.toLowerCase().includes('academic');
  const categoryClass = isProtected ? 'protected' : (isSynthesis ? 'synthesis' : '');

  const itemHtml = items.map(item => `
    <div class="item ${item.state.status}" data-item-id="${escapeHtml(item.itemId)}">
      <div class="item-content">
        <div class="item-title">
          <a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.title || item.url)}</a>
        </div>
        <div class="item-url">${escapeHtml(item.url)}</div>
      </div>
      <div class="item-actions">
        ${isProtected ? `<button class="action-btn defer" onclick="recordDisposition('${escapeJs(item.itemId)}', 'defer')">Defer</button>` : `<button class="action-btn trash" onclick="recordDisposition('${escapeJs(item.itemId)}', 'trash')">Trash</button>`}
        <button class="action-btn complete" onclick="recordDisposition('${escapeJs(item.itemId)}', 'complete')">Done</button>
        <button class="action-btn promote" onclick="recordDisposition('${escapeJs(item.itemId)}', 'promote', {target: 'basic-memory://notes/promoted'})">${isSynthesis ? 'Synthesize' : 'Promote'}</button>
      </div>
    </div>
  `).join('\n');

  return `
    <div class="category ${categoryClass}">
      <div class="category-header">
        <span>${escapeHtml(category)}</span>
        <span class="item-count">${pendingCount} pending / ${items.length} total</span>
      </div>
      ${itemHtml}
    </div>
  `;
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(isoString) {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape for JavaScript string
 */
function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

module.exports = {
  renderLaunchpadPage
};
