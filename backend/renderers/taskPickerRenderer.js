/**
 * Task Picker Renderer
 *
 * Renders the "One Thing" interface - a single task with LLM-enriched content.
 * The core of the Task-Driven Attention System.
 *
 * Key elements:
 * 1. Insight - The confrontational observation
 * 2. Why This Matters - LLM-derived context connecting to user's goals
 * 3. The Question - The derived goal framed as a question
 * 4. Actions - Generated based on the specific situation
 *
 * @see ../docs/plans/task-driven-attention.md for design context
 */

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the task picker page
 *
 * @param {Object} enrichedTask - Task enriched with LLM content, or null
 * @param {Object} stats - Attention stats from taskGenerator
 * @returns {string} HTML page
 */
function renderTaskPickerPage(enrichedTask, stats = {}) {
  if (!enrichedTask) {
    return renderEmptyState(stats);
  }

  const {
    id,
    type,
    title,
    url,
    domain,
    projectName,
    openCount,
    daysSinceActive,
    affectedCount,
    insight,
    whyThisMatters,
    theQuestion,
    actions,
    conversationPrompts,
    categories,
    score
  } = enrichedTask;

  // Get the display title based on task type
  const displayTitle = title || projectName || 'This pattern';
  const displaySubtitle = type === 'ghost_tab' ? domain :
                          type === 'project_revival' ? `${daysSinceActive} days dormant` :
                          type === 'tab_bankruptcy' ? `${affectedCount} tabs` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One Thing — Memento</title>
  <style>
    :root {
      --bg-dark: #0d0d0d;
      --bg-card: #1a1a1a;
      --text-primary: #f5f5f5;
      --text-secondary: #a0a0a0;
      --text-muted: #666666;
      --accent-blue: #4a9eff;
      --accent-green: #4ade80;
      --accent-red: #f87171;
      --border-subtle: #2a2a2a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2em;
    }

    .container {
      max-width: 600px;
      width: 100%;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 2em;
    }
    .header-brand {
      font-size: 0.85em;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 0.5em;
    }
    .header-brand a {
      color: var(--text-muted);
      text-decoration: none;
    }
    .header-brand a:hover {
      color: var(--text-secondary);
    }

    /* Insight Section */
    .insight-section {
      text-align: center;
      margin-bottom: 2em;
    }
    .insight-text {
      font-size: 1.8em;
      font-weight: 300;
      line-height: 1.4;
      margin-bottom: 1em;
    }
    .insight-text strong {
      color: var(--accent-blue);
      font-weight: 400;
    }

    /* Item Card */
    .item-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 1.25em;
      margin-bottom: 1.5em;
    }
    .item-title {
      font-size: 1.1em;
      font-weight: 500;
      margin-bottom: 0.25em;
      color: var(--text-primary);
    }
    .item-title a {
      color: var(--text-primary);
      text-decoration: none;
    }
    .item-title a:hover {
      color: var(--accent-blue);
    }
    .item-subtitle {
      font-size: 0.9em;
      color: var(--text-muted);
    }
    .item-meta {
      display: flex;
      gap: 1em;
      margin-top: 0.75em;
      font-size: 0.85em;
      color: var(--text-secondary);
    }
    .item-meta-badge {
      background: var(--border-subtle);
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Why This Matters */
    .why-section {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-left: 3px solid var(--accent-blue);
      border-radius: 0 12px 12px 0;
      padding: 1.25em;
      margin-bottom: 1.5em;
    }
    .why-header {
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-blue);
      margin-bottom: 0.75em;
    }
    .why-text {
      font-size: 1em;
      line-height: 1.6;
      color: var(--text-secondary);
    }
    .the-question {
      margin-top: 1em;
      padding-top: 1em;
      border-top: 1px solid var(--border-subtle);
      font-style: italic;
      color: var(--text-primary);
      font-size: 1.05em;
    }

    /* Actions */
    .actions-section {
      margin-bottom: 2em;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75em;
    }
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25em 1em;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.95em;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .action-btn:hover {
      background: #252525;
      border-color: var(--text-muted);
      transform: translateY(-2px);
    }
    .action-btn.primary {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: white;
    }
    .action-btn.primary:hover {
      background: #3a8eef;
    }
    .action-btn.release {
      border-color: var(--accent-red);
    }
    .action-btn.release:hover {
      background: rgba(248, 113, 113, 0.1);
    }
    .action-icon {
      font-size: 1.5em;
      margin-bottom: 0.5em;
    }
    .action-label {
      text-align: center;
      line-height: 1.3;
    }

    /* Skip link */
    .skip-section {
      text-align: center;
      margin-top: 1em;
    }
    .skip-link {
      color: var(--text-muted);
      font-size: 0.9em;
      text-decoration: none;
      cursor: pointer;
      border: none;
      background: none;
      font-family: inherit;
    }
    .skip-link:hover {
      color: var(--text-secondary);
    }

    /* Loading state for buttons */
    .action-btn.loading {
      opacity: 0.7;
      pointer-events: none;
    }
    .action-btn .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Completion toast */
    .completion-toast {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(74, 222, 128, 0.95);
      color: #000;
      padding: 1em 2em;
      border-radius: 12px;
      font-size: 1.5em;
      font-weight: 500;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
    }
    .completion-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .completion-toast.release {
      background: rgba(248, 113, 113, 0.95);
    }
    .completion-toast.defer {
      background: rgba(251, 191, 36, 0.95);
    }
    .toast-icon {
      font-size: 1.2em;
      margin-right: 0.3em;
    }

    /* Confirmation modal */
    .confirm-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .confirm-modal.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .confirm-content {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 2em;
      max-width: 400px;
      text-align: center;
    }
    .confirm-icon {
      font-size: 2.5em;
      margin-bottom: 0.5em;
    }
    .confirm-title {
      font-size: 1.3em;
      margin-bottom: 0.5em;
    }
    .confirm-message {
      color: var(--text-secondary);
      margin-bottom: 1.5em;
      line-height: 1.5;
    }
    .confirm-actions {
      display: flex;
      gap: 1em;
      justify-content: center;
    }
    .confirm-btn {
      padding: 0.75em 1.5em;
      border-radius: 8px;
      font-family: inherit;
      font-size: 1em;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
    }
    .confirm-btn.cancel {
      background: var(--bg-card);
      color: var(--text-secondary);
    }
    .confirm-btn.cancel:hover {
      background: #252525;
    }
    .confirm-btn.confirm {
      background: var(--accent-red);
      border-color: var(--accent-red);
      color: white;
    }
    .confirm-btn.confirm:hover {
      background: #e85555;
    }

    /* Stats footer */
    .stats-footer {
      text-align: center;
      padding-top: 2em;
      border-top: 1px solid var(--border-subtle);
      margin-top: 2em;
      color: var(--text-muted);
      font-size: 0.85em;
    }
    .stats-footer a {
      color: var(--text-secondary);
      text-decoration: none;
    }
    .stats-footer a:hover {
      color: var(--accent-blue);
    }

    /* Task type badge */
    .task-type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1em;
    }
    .task-type-ghost_tab {
      background: rgba(74, 158, 255, 0.2);
      color: var(--accent-blue);
    }
    .task-type-project_revival {
      background: rgba(74, 222, 128, 0.2);
      color: var(--accent-green);
    }
    .task-type-tab_bankruptcy {
      background: rgba(248, 113, 113, 0.2);
      color: var(--accent-red);
    }

    /* Conversation prompts (hidden in MVP) */
    .conversation-section {
      display: none; /* Hidden in MVP Phase 1 */
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 1em;
      margin-bottom: 1.5em;
    }
    .conversation-header {
      font-size: 0.85em;
      color: var(--text-muted);
      margin-bottom: 0.75em;
    }
    .conversation-prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
    }
    .prompt-chip {
      background: var(--border-subtle);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .prompt-chip:hover {
      background: #333;
      color: var(--text-primary);
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-brand">
        <a href="/history">Memento</a> · One Thing
      </div>
      <span class="task-type-badge task-type-${escapeHtml(type)}">${formatTaskType(type)}</span>
    </header>

    <section class="insight-section">
      <p class="insight-text">${formatInsight(insight)}</p>
    </section>

    <div class="item-card">
      <h2 class="item-title">
        ${url ? `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(displayTitle)}</a>` : escapeHtml(displayTitle)}
      </h2>
      <p class="item-subtitle">${escapeHtml(displaySubtitle)}</p>
      ${renderItemMeta(enrichedTask)}
    </div>

    <section class="why-section">
      <h3 class="why-header">Why This Matters</h3>
      <p class="why-text">${escapeHtml(whyThisMatters)}</p>
      ${theQuestion ? `<p class="the-question">${escapeHtml(theQuestion)}</p>` : ''}
    </section>

    <section class="actions-section">
      <div class="actions-grid">
        ${renderActions(actions, id)}
      </div>
    </section>

    <div class="skip-section">
      <button class="skip-link" onclick="skipTask()">
        Show me something else
      </button>
      <span style="font-size: 0.8em; color: var(--text-muted); margin-left: 0.5em;">(won't be recorded)</span>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirm-modal" class="confirm-modal">
      <div class="confirm-content">
        <div id="confirm-icon" class="confirm-icon">🌊</div>
        <h3 id="confirm-title" class="confirm-title">Let this go?</h3>
        <p id="confirm-message" class="confirm-message">This will mark the item as released across all sessions.</p>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" onclick="cancelConfirm()">Cancel</button>
          <button id="confirm-proceed" class="confirm-btn confirm" onclick="proceedConfirm()">Yes, let it go</button>
        </div>
      </div>
    </div>

    <footer class="stats-footer">
      ${stats.ghostTabCount ? `${stats.ghostTabCount} ghost tabs` : ''}
      ${stats.neglectedProjectCount ? ` · ${stats.neglectedProjectCount} neglected projects` : ''}
      ${stats.totalSessions ? ` · ${stats.totalSessions} sessions analyzed` : ''}
      <br>
      <a href="/history">Browse all sessions</a>
    </footer>
  </div>

  <script>
    const taskId = '${escapeHtml(id)}';
    const taskData = ${JSON.stringify({
      id,
      type,
      title: displayTitle,
      url,
      score,
      insight,
      theQuestion
    })};

    let currentClickedBtn = null;
    let pendingAction = null;

    // Toast messages for each action
    const toastMessages = {
      engage: { icon: '⚡', text: 'On it!', class: '' },
      release: { icon: '🌊', text: 'Let go', class: 'release' },
      defer: { icon: '⏰', text: 'Saved for later', class: 'defer' },
      skip: { icon: '➡️', text: 'Skipping...', class: '' },
      triage: { icon: '🎯', text: 'Opening triage...', class: '' },
      detailed: { icon: '📋', text: 'Opening review...', class: '' },
      release_all: { icon: '🔥', text: 'Cleared!', class: 'release' },
      pause: { icon: '⏸️', text: 'Project paused', class: 'defer' }
    };

    // Confirmation details for destructive actions
    const confirmDetails = {
      release: {
        icon: '🌊',
        title: 'Let this go?',
        message: 'This will mark the item as released and it won\\'t appear again.',
        button: 'Yes, let it go'
      },
      release_all: {
        icon: '🔥',
        title: 'Declare tab bankruptcy?',
        message: 'This will clear ALL stale tabs across all sessions. This cannot be undone.',
        button: 'Yes, clear everything'
      }
    };

    function showToast(action) {
      const msg = toastMessages[action] || { icon: '✓', text: 'Done', class: '' };
      const toast = document.createElement('div');
      toast.className = 'completion-toast ' + msg.class;
      toast.innerHTML = '<span class="toast-icon">' + msg.icon + '</span> ' + msg.text;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('visible'));
      return toast;
    }

    function setButtonLoading(btn, loading) {
      if (!btn) return;
      if (loading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn._originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span>';
      } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        if (btn._originalContent) {
          btn.innerHTML = btn._originalContent;
        }
      }
    }

    function showConfirmModal(action) {
      const details = confirmDetails[action];
      if (!details) return false;

      document.getElementById('confirm-icon').textContent = details.icon;
      document.getElementById('confirm-title').textContent = details.title;
      document.getElementById('confirm-message').textContent = details.message;
      document.getElementById('confirm-proceed').textContent = details.button;

      pendingAction = action;
      document.getElementById('confirm-modal').classList.add('visible');
      return true;
    }

    function cancelConfirm() {
      document.getElementById('confirm-modal').classList.remove('visible');
      if (currentClickedBtn) {
        setButtonLoading(currentClickedBtn, false);
        currentClickedBtn = null;
      }
      pendingAction = null;
    }

    function proceedConfirm() {
      document.getElementById('confirm-modal').classList.remove('visible');
      if (pendingAction) {
        executeAction(pendingAction);
      }
    }

    async function recordAction(taskId, action, event) {
      // Get the clicked button
      if (event && event.target) {
        currentClickedBtn = event.target.closest('.action-btn');
      }

      // Check if this action needs confirmation
      if (confirmDetails[action]) {
        if (showConfirmModal(action)) {
          return;
        }
      }

      executeAction(action);
    }

    async function executeAction(action) {
      // Show loading state
      setButtonLoading(currentClickedBtn, true);

      try {
        const response = await fetch('/api/tasks/' + taskId + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            taskType: '${escapeHtml(type)}',
            action,
            task: taskData
          })
        });

        const result = await response.json();

        if (result.success) {
          // Show completion toast
          showToast(action);

          // Wait a moment for user to see feedback
          await new Promise(r => setTimeout(r, 1200));

          // Redirect to refresh with next task
          window.location.href = '/tasks?completed=' + action;
        } else {
          setButtonLoading(currentClickedBtn, false);
          alert('Failed: ' + result.message);
        }
      } catch (error) {
        console.error('Action failed:', error);
        setButtonLoading(currentClickedBtn, false);
        alert('Something went wrong. Please try again.');
      }
    }

    function skipTask() {
      // Skip doesn't record - just shows the next task
      window.location.href = '/tasks';
    }

    function openUrl(url, event) {
      window.open(url, '_blank');
      recordAction(taskId, 'engage', event);
    }
  </script>
</body>
</html>`;
}

/**
 * Format task type for display
 */
function formatTaskType(type) {
  switch (type) {
    case 'ghost_tab': return 'Ghost Tab';
    case 'project_revival': return 'Neglected Project';
    case 'tab_bankruptcy': return 'Tab Debt';
    default: return type;
  }
}

/**
 * Format insight with emphasis
 * Note: We escape HTML but preserve apostrophes for readability
 */
function formatInsight(insight) {
  if (!insight) return '';

  // Escape HTML characters but preserve apostrophes (they're safe in content)
  let formatted = insight
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // Don't escape apostrophes - they display fine and &#39; looks ugly

  // Bold numbers in the insight
  formatted = formatted.replace(/(\d+)/g, '<strong>$1</strong>');

  return formatted;
}

/**
 * Render item metadata based on task type
 */
function renderItemMeta(task) {
  const badges = [];

  if (task.openCount) {
    badges.push(`Opened ${task.openCount}x`);
  }
  if (task.categories && task.categories.length > 0) {
    badges.push(task.categories[0]);
  }
  if (task.daysSinceActive) {
    badges.push(`${task.daysSinceActive} days`);
  }
  if (task.totalSessions) {
    badges.push(`${task.totalSessions} sessions`);
  }
  if (task.affectedCount) {
    badges.push(`${task.affectedCount} items`);
  }

  if (badges.length === 0) return '';

  return `
    <div class="item-meta">
      ${badges.map(b => `<span class="item-meta-badge">${escapeHtml(b)}</span>`).join('')}
    </div>
  `;
}

/**
 * Render action buttons
 */
function renderActions(actions, taskId) {
  // Tooltip descriptions for actions
  const tooltips = {
    engage: 'Open this and mark as handled',
    release: 'Let this go - closes the open loop',
    defer: 'Save for later - will hide temporarily',
    triage: 'Keep the most important, release the rest',
    detailed: 'Review each item one by one',
    release_all: 'Clear everything and start fresh',
    pause: 'Put this project on hold'
  };

  if (!actions || actions.length === 0) {
    return `
      <button class="action-btn primary" onclick="recordAction('${escapeHtml(taskId)}', 'engage', event)" title="${tooltips.engage}">
        <span class="action-icon">⚡</span>
        <span class="action-label">Deal with it</span>
      </button>
      <button class="action-btn release" onclick="recordAction('${escapeHtml(taskId)}', 'release', event)" title="${tooltips.release}">
        <span class="action-icon">🌊</span>
        <span class="action-label">Let it go</span>
      </button>
    `;
  }

  return actions.map((action, i) => {
    const isPrimary = i === 0;
    const isRelease = action.type === 'release' || action.type === 'release_all';
    const btnClass = isPrimary ? 'primary' : (isRelease ? 'release' : '');
    const tooltip = tooltips[action.type] || '';

    return `
      <button class="action-btn ${btnClass}"
              title="${escapeHtml(tooltip)}"
              onclick="${action.type === 'engage' && actions[0]?.url ?
                `openUrl('${escapeHtml(actions[0].url)}', event)` :
                `recordAction('${escapeHtml(taskId)}', '${escapeHtml(action.type)}', event)`}">
        <span class="action-icon">${action.icon || '⚡'}</span>
        <span class="action-label">${escapeHtml(action.label)}</span>
      </button>
    `;
  }).join('');
}

/**
 * Render empty state when no tasks
 */
function renderEmptyState(stats) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Clear — Memento</title>
  <style>
    :root {
      --bg-dark: #0d0d0d;
      --bg-card: #1a1a1a;
      --text-primary: #f5f5f5;
      --text-secondary: #a0a0a0;
      --text-muted: #666666;
      --accent-green: #4ade80;
      --border-subtle: #2a2a2a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2em;
      text-align: center;
    }

    .container {
      max-width: 500px;
    }

    .empty-icon {
      font-size: 4em;
      margin-bottom: 0.5em;
    }

    h1 {
      font-size: 2em;
      font-weight: 300;
      margin-bottom: 0.5em;
      color: var(--accent-green);
    }

    .empty-message {
      color: var(--text-secondary);
      font-size: 1.1em;
      line-height: 1.6;
      margin-bottom: 2em;
    }

    .stats {
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 2em;
    }

    .action-link {
      display: inline-block;
      padding: 0.75em 1.5em;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s;
    }
    .action-link:hover {
      background: #252525;
      color: var(--text-primary);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="empty-icon">✨</div>
    <h1>Nothing Urgent</h1>
    <p class="empty-message">
      No attention patterns need your immediate focus.
      ${stats.totalSessions ? `I've analyzed ${stats.totalSessions} sessions and ${stats.totalTabs || 0} tabs.` : ''}
      Come back after your next browsing session.
    </p>
    ${stats.ghostTabCount || stats.neglectedProjectCount ? `
      <p class="stats">
        ${stats.ghostTabCount ? `${stats.ghostTabCount} recurring tabs tracked` : ''}
        ${stats.neglectedProjectCount ? ` · ${stats.neglectedProjectCount} projects monitored` : ''}
      </p>
    ` : ''}
    <a href="/history" class="action-link">Browse session history</a>
  </div>
</body>
</html>`;
}

/**
 * Render completion feedback page
 */
function renderCompletionPage(action, nextTask = null) {
  const messages = {
    engage: { icon: '⚡', title: 'On it!', message: 'Good. Now do the thing.' },
    release: { icon: '🌊', title: 'Let go', message: 'That open loop is closed.' },
    defer: { icon: '⏰', title: 'Later', message: "I'll remind you." },
    pause: { icon: '⏸️', title: 'Paused', message: 'Project on hold. No guilt.' },
    skip: { icon: '➡️', title: 'Skipped', message: 'Moving on.' },
    triage: { icon: '🎯', title: 'Triaged', message: 'Keep what matters.' },
    release_all: { icon: '🔥', title: 'Cleared', message: 'Fresh start.' }
  };

  const msg = messages[action] || messages.engage;

  if (nextTask) {
    // Auto-redirect to next task
    return renderTaskPickerPage(nextTask, {});
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Done — Memento</title>
  <meta http-equiv="refresh" content="2;url=/tasks">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d0d0d;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { text-align: center; }
    .icon { font-size: 4em; margin-bottom: 0.25em; }
    h1 { font-weight: 300; font-size: 2em; margin-bottom: 0.5em; }
    p { color: #a0a0a0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${msg.icon}</div>
    <h1>${escapeHtml(msg.title)}</h1>
    <p>${escapeHtml(msg.message)}</p>
  </div>
</body>
</html>`;
}

module.exports = {
  renderTaskPickerPage,
  renderEmptyState,
  renderCompletionPage
};
