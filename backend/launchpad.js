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
 * @param {Object} lockStatus - Current lock status with resume state
 * @param {boolean} reviewMode - If true, renders in review mode (no lock)
 * @returns {string} HTML page
 */
function renderLaunchpadPage(sessionId, sessionState, lockStatus = {}, reviewMode = false) {
  const { originalGroups, itemStates, itemCategories, unresolvedCount, capturedAt } = sessionState;
  const resumeState = lockStatus.resumeState || {};
  const pageTitle = reviewMode ? 'Review' : 'Launchpad';

  // Calculate progress
  const totalItems = Object.keys(itemStates).length;
  const resolvedCount = totalItems - unresolvedCount;
  const percentComplete = totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0;


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
  <title>${pageTitle} - ${unresolvedCount} items remaining</title>
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

    .progress-container {
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #f59e0b, #10b981);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 13px;
      color: #888;
      min-width: 120px;
    }

    .progress-text .resolved {
      color: #10b981;
      font-weight: 600;
    }

    .progress-text .total {
      color: #666;
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

    .item.later {
      opacity: 0.6;
    }

    .item.later .item-title::before {
      content: '⏱ ';
      color: #f59e0b;
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
    .item.deferred .item-actions,
    .item.later .item-actions {
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

    .action-btn.later {
      background: #78350f;
      color: #fcd34d;
    }
    .action-btn.later:hover { background: #92400e; }

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

    .dev-clear-btn {
      margin-left: 12px;
      padding: 4px 8px;
      background: transparent;
      color: #f59e0b;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .dev-clear-btn:hover {
      opacity: 1;
      background: rgba(245, 158, 11, 0.1);
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

    /* Batch Actions */
    .batch-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1f2937;
      border-top: 1px solid #374151;
      padding: 12px 20px;
      display: none;
      align-items: center;
      gap: 16px;
      z-index: 100;
    }

    .batch-bar.visible {
      display: flex;
    }

    .batch-count {
      font-size: 14px;
      color: #9ca3af;
    }

    .batch-count strong {
      color: #f59e0b;
    }

    .batch-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .batch-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .batch-btn.later {
      background: #78350f;
      color: #fcd34d;
    }
    .batch-btn.later:hover { background: #92400e; }

    .batch-btn.done {
      background: #14532d;
      color: #86efac;
    }
    .batch-btn.done:hover { background: #166534; }

    .batch-btn.trash {
      background: #7f1d1d;
      color: #fca5a5;
    }
    .batch-btn.trash:hover { background: #991b1b; }

    .batch-btn.cancel {
      background: #374151;
      color: #d1d5db;
    }
    .batch-btn.cancel:hover { background: #4b5563; }

    .item-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #f59e0b;
      cursor: pointer;
      flex-shrink: 0;
    }

    .item.trashed .item-checkbox,
    .item.completed .item-checkbox,
    .item.promoted .item-checkbox,
    .item.deferred .item-checkbox,
    .item.later .item-checkbox {
      display: none;
    }

    /* Confirmation Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .modal-overlay.visible {
      display: flex;
    }

    .modal {
      background: #1f2937;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
    }

    .modal h3 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #ef4444;
    }

    .modal p {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 20px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .modal-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .modal-btn.cancel {
      background: #374151;
      color: #d1d5db;
    }

    .modal-btn.confirm {
      background: #991b1b;
      color: #fca5a5;
    }

    /* Resume Card */
    .resume-card {
      background: linear-gradient(135deg, #1e3a5f 0%, #1a1a2e 100%);
      border: 1px solid #3b82f6;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .resume-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .resume-card-title {
      font-size: 13px;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .resume-card-time {
      font-size: 12px;
      color: #6b7280;
    }

    .goal-section {
      margin-top: 12px;
    }

    .goal-label {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 6px;
    }

    .goal-input-wrapper {
      display: flex;
      gap: 8px;
    }

    .goal-input {
      flex: 1;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      color: #e0e0e0;
      outline: none;
    }

    .goal-input:focus {
      border-color: #3b82f6;
    }

    .goal-input::placeholder {
      color: #6b7280;
    }

    .goal-save-btn {
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .goal-save-btn:hover {
      background: #2563eb;
    }

    .goal-display {
      font-size: 16px;
      color: #e0e0e0;
      padding: 8px 0;
    }

    .goal-display .goal-text {
      color: #fcd34d;
      font-weight: 500;
    }

    .goal-edit-btn {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
    }

    .goal-edit-btn:hover {
      color: #9ca3af;
    }

    /* Review Mode */
    .review-banner {
      background: linear-gradient(90deg, #7c3aed, #4f46e5);
      color: white;
      padding: 10px 20px;
      text-align: center;
      font-size: 14px;
      margin-bottom: 16px;
      border-radius: 8px;
    }

    .review-banner strong {
      margin-right: 8px;
    }

    body.review-mode .clear-lock-btn {
      display: none;
    }

    body.review-mode .footer {
      justify-content: center;
    }
  </style>
</head>
<body class="${reviewMode ? 'review-mode' : ''}">
  ${reviewMode ? `
  <div class="review-banner">
    <strong>Review Mode</strong> You're reviewing a past session. Actions are recorded but no lock is held.
  </div>
  ` : ''}
  <div class="header">
    <div>
      <h1>${pageTitle}</h1>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: ${percentComplete}%"></div>
        </div>
        <div class="progress-text">
          <span class="resolved" id="resolved-count">${resolvedCount}</span> of <span class="total" id="total-count">${totalItems}</span> resolved
        </div>
      </div>
    </div>
    <div class="status ${unresolvedCount === 0 ? 'complete' : ''}">
      <span class="count" id="unresolved-count">${unresolvedCount}</span> items remaining
      <span style="color: #666; margin-left: 8px;">Captured: ${formatTimestamp(capturedAt)}</span>
    </div>
  </div>

  ${!reviewMode ? `
  <!-- Resume Card -->
  <div class="resume-card">
    <div class="resume-card-header">
      <div>
        <div class="resume-card-title">Session Focus</div>
        <div class="resume-card-time">
          ${resumeState.lastActivity ? `Last activity: ${formatTimestamp(resumeState.lastActivity)}` : `Started: ${formatTimestamp(lockStatus.lockedAt)}`}
        </div>
      </div>
    </div>
    <div class="goal-section">
      <div class="goal-label">What are you trying to accomplish?</div>
      <div id="goal-container">
        ${resumeState.goal ? `
          <div class="goal-display" id="goal-display">
            <span class="goal-text">${escapeHtml(resumeState.goal)}</span>
            <button class="goal-edit-btn" onclick="showGoalInput()">Edit</button>
          </div>
        ` : `
          <div class="goal-input-wrapper" id="goal-input-wrapper">
            <input type="text" class="goal-input" id="goal-input" placeholder="e.g., Clean up research tabs, close old projects..." />
            <button class="goal-save-btn" onclick="saveGoal()">Set Goal</button>
          </div>
        `}
      </div>
    </div>
  </div>
  ` : ''}

  <div id="categories">
    ${categorySections}
  </div>

  <div class="footer">
    <div class="footer-info">
      Session: ${sessionId}
      <button class="dev-clear-btn" onclick="forceClearLock()" title="Development only: Force clear lock without resolving all items">
        Force Clear Lock (Dev)
      </button>
    </div>
    <button id="clear-lock-btn" class="clear-lock-btn ${unresolvedCount === 0 ? 'enabled' : ''}"
            onclick="clearLock()" ${unresolvedCount > 0 ? 'disabled' : ''}>
      ${unresolvedCount === 0 ? 'Complete Session' : 'Resolve all items to unlock'}
    </button>
  </div>

  <div id="toast" class="toast"></div>

  <!-- Batch Actions Bar -->
  <div id="batch-bar" class="batch-bar">
    <div class="batch-count"><strong id="batch-count">0</strong> items selected</div>
    <div class="batch-actions">
      <button class="batch-btn cancel" onclick="clearSelection()">Cancel</button>
      <button class="batch-btn later" onclick="batchAction('later')">Later All</button>
      <button class="batch-btn done" onclick="batchAction('complete')">Done All</button>
      <button class="batch-btn trash" onclick="confirmBatchTrash()">Trash All</button>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <div id="confirm-modal" class="modal-overlay">
    <div class="modal">
      <h3>Confirm Batch Trash</h3>
      <p id="confirm-message">Are you sure you want to trash <strong>0</strong> items? This action cannot be undone for batches.</p>
      <div class="modal-actions">
        <button class="modal-btn cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn confirm" onclick="executeBatchTrash()">Trash All</button>
      </div>
    </div>
  </div>

  <script>
    const SESSION_ID = '${sessionId}';
    let unresolvedCount = ${unresolvedCount};
    const totalItems = ${totalItems};
    let resolvedCount = ${resolvedCount};
    const lastActions = new Map(); // Track last action per item for undo

    function updateProgress() {
      const percent = totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0;
      document.getElementById('progress-fill').style.width = percent + '%';
      document.getElementById('resolved-count').textContent = resolvedCount;
    }

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
            const statusClass = action === 'trash' ? 'trashed' : action === 'complete' ? 'completed' : action === 'defer' ? 'deferred' : action === 'later' ? 'later' : 'promoted';
            itemEl.classList.add(statusClass);

            // Track action for undo and show undo button
            lastActions.set(itemId, action);
            showUndoButton(itemEl, itemId, action);
          }

          // Update counts and progress
          unresolvedCount--;
          resolvedCount++;
          document.getElementById('unresolved-count').textContent = unresolvedCount;
          updateProgress();

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
            itemEl.classList.remove('trashed', 'completed', 'promoted', 'deferred', 'later');

            // Remove undo button
            const undoContainer = itemEl.querySelector('.undo-container');
            if (undoContainer) undoContainer.remove();
          }

          // Update counts and progress
          unresolvedCount++;
          resolvedCount--;
          document.getElementById('unresolved-count').textContent = unresolvedCount;
          updateProgress();

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
          // Show completion overlay
          showCompletionScreen();

          // Try to close window (may fail due to browser security)
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          showToast(result.message || 'Failed to clear lock', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function showCompletionScreen() {
      const overlay = document.createElement('div');
      overlay.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      \`;
      overlay.innerHTML = \`
        <div style="text-align: center; color: #fff;">
          <div style="font-size: 4em; margin-bottom: 0.3em;">✨</div>
          <h1 style="font-size: 2.5em; font-weight: 300; margin-bottom: 0.3em; color: #4ade80;">Session Complete</h1>
          <p style="font-size: 1.2em; color: #a0a0a0; margin-bottom: 2em;">All items resolved. Lock cleared.</p>
          <p style="font-size: 1em; color: #666;">You can close this tab now.</p>
          <div style="margin-top: 2em;">
            <a href="/history" style="color: #4a9eff; text-decoration: none; margin-right: 2em;">← View History</a>
            <a href="/tasks" style="color: #4a9eff; text-decoration: none;">Next Task →</a>
          </div>
        </div>
      \`;
      document.body.appendChild(overlay);
    }

    // Development helper: Force clear lock without resolving all items
    async function forceClearLock() {
      if (!confirm('Force clear the lock? This is for development only.')) return;

      try {
        const response = await fetch('/api/lock/force-clear', {
          method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
          showToast('Lock force-cleared (dev mode)', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
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

    // Batch Actions
    const selectedItems = new Set();

    function toggleItemSelection(itemId, checkbox) {
      if (checkbox.checked) {
        selectedItems.add(itemId);
      } else {
        selectedItems.delete(itemId);
      }
      updateBatchBar();
    }

    function updateBatchBar() {
      const batchBar = document.getElementById('batch-bar');
      const batchCount = document.getElementById('batch-count');
      batchCount.textContent = selectedItems.size;

      if (selectedItems.size > 0) {
        batchBar.classList.add('visible');
      } else {
        batchBar.classList.remove('visible');
      }
    }

    function clearSelection() {
      selectedItems.clear();
      document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
      updateBatchBar();
    }

    async function batchAction(action) {
      if (selectedItems.size === 0) return;

      const dispositions = Array.from(selectedItems).map(itemId => ({
        action,
        itemId
      }));

      try {
        const response = await fetch('/api/launchpad/' + SESSION_ID + '/batch-disposition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dispositions })
        });

        const result = await response.json();

        if (result.success) {
          // Update UI for each item
          const statusClass = action === 'trash' ? 'trashed' : action === 'complete' ? 'completed' : action === 'later' ? 'later' : 'promoted';

          selectedItems.forEach(itemId => {
            const itemEl = document.querySelector('[data-item-id="' + CSS.escape(itemId) + '"]');
            if (itemEl) {
              itemEl.classList.add(statusClass);
              const checkbox = itemEl.querySelector('.item-checkbox');
              if (checkbox) checkbox.checked = false;
            }
          });

          // Update counts
          const count = selectedItems.size;
          unresolvedCount -= count;
          resolvedCount += count;
          document.getElementById('unresolved-count').textContent = unresolvedCount;
          updateProgress();

          // Check if all resolved
          if (unresolvedCount === 0) {
            const btn = document.getElementById('clear-lock-btn');
            btn.classList.add('enabled');
            btn.disabled = false;
            btn.textContent = 'Complete Session';
            document.querySelector('.status').classList.add('complete');
          }

          clearSelection();
          showToast(count + ' items ' + (action === 'trash' ? 'trashed' : action === 'complete' ? 'completed' : 'marked later'), 'success');
        } else {
          showToast(result.message || 'Batch action failed', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function confirmBatchTrash() {
      if (selectedItems.size === 0) return;

      const modal = document.getElementById('confirm-modal');
      const message = document.getElementById('confirm-message');
      message.innerHTML = 'Are you sure you want to trash <strong>' + selectedItems.size + '</strong> items? This action cannot be undone for batches.';
      modal.classList.add('visible');
    }

    function closeModal() {
      document.getElementById('confirm-modal').classList.remove('visible');
    }

    function executeBatchTrash() {
      closeModal();
      batchAction('trash');
    }

    // Goal Management
    async function saveGoal() {
      const input = document.getElementById('goal-input');
      const goal = input.value.trim();
      if (!goal) return;

      try {
        const response = await fetch('/api/launchpad/' + SESSION_ID + '/resume-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal })
        });

        const result = await response.json();
        if (result.success) {
          // Switch to display mode
          const container = document.getElementById('goal-container');
          container.innerHTML = '<div class="goal-display" id="goal-display"><span class="goal-text">' + escapeForHtml(goal) + '</span><button class="goal-edit-btn" onclick="showGoalInput()">Edit</button></div>';
          showToast('Goal saved', 'success');
        } else {
          showToast('Failed to save goal', 'error');
        }
      } catch (error) {
        showToast('Error: ' + error.message, 'error');
      }
    }

    function showGoalInput() {
      const container = document.getElementById('goal-container');
      const currentGoal = container.querySelector('.goal-text')?.textContent || '';
      container.innerHTML = '<div class="goal-input-wrapper" id="goal-input-wrapper"><input type="text" class="goal-input" id="goal-input" value="' + escapeForHtml(currentGoal) + '" placeholder="e.g., Clean up research tabs, close old projects..." /><button class="goal-save-btn" onclick="saveGoal()">Save</button></div>';
      document.getElementById('goal-input').focus();
    }

    function escapeForHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
      <input type="checkbox" class="item-checkbox" onchange="toggleItemSelection('${escapeJs(item.itemId)}', this)" />
      <div class="item-content">
        <div class="item-title">
          <a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.title || item.url)}</a>
        </div>
        <div class="item-url">${escapeHtml(item.url)}</div>
      </div>
      <div class="item-actions">
        ${isProtected ? `<button class="action-btn defer" onclick="recordDisposition('${escapeJs(item.itemId)}', 'defer')">Defer</button>` : `<button class="action-btn trash" onclick="recordDisposition('${escapeJs(item.itemId)}', 'trash')">Trash</button>`}
        <button class="action-btn later" onclick="recordDisposition('${escapeJs(item.itemId)}', 'later')">Later</button>
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
