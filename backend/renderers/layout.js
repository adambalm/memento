/**
 * Shared Layout Module
 * Common HTML structure, CSS, and navigation for all screens
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
 * Render the navigation header
 */
function renderNav(sessionId, currentPage, sessionData = {}) {
  const pages = [
    { id: 'summary', label: 'Summary', path: `/results/${sessionId}` },
    { id: 'map', label: 'Map', path: `/results/${sessionId}/map` },
    { id: 'tabs', label: 'Tabs', path: `/results/${sessionId}/tabs` },
    { id: 'analysis', label: 'Analysis', path: `/results/${sessionId}/analysis` },
  ];

  return `
    <nav class="main-nav">
      <div class="nav-brand">
        <a href="/results/${sessionId}">Memento</a>
        <span class="nav-session-info">${sessionData.totalTabs || '?'} tabs · ${formatDate(sessionData.timestamp)}</span>
      </div>
      <div class="nav-links">
        ${pages.map(p => `
          <a href="${p.path}" class="nav-link ${currentPage === p.id ? 'active' : ''}">${p.label}</a>
        `).join('')}
        <a href="/history" class="nav-link ${currentPage === 'history' ? 'active' : ''}">History</a>
      </div>
      <div class="nav-actions">
        <a href="/launchpad/${sessionId}" class="nav-btn">Launchpad</a>
      </div>
    </nav>
  `;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Wrap content in the standard page layout
 */
function wrapInLayout(content, { sessionId, currentPage, title, sessionData = {}, extraHead = '', extraScripts = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Memento</title>
  <style>
    :root {
      --bg-primary: #fffff8;
      --bg-secondary: #f9f9f5;
      --text-primary: #111111;
      --text-secondary: #454545;
      --text-muted: #6b6b6b;
      --accent-link: #a00000;
      --accent-blue: #2563eb;
      --border-light: #e0ddd5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Palatino, "Palatino Linotype", Georgia, serif;
      font-size: 15px;
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--bg-primary);
    }

    /* Navigation */
    .main-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75em 2em;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-brand {
      display: flex;
      align-items: baseline;
      gap: 1em;
    }
    .nav-brand a {
      font-size: 1.2em;
      font-weight: 600;
      font-style: italic;
      color: var(--text-primary);
      text-decoration: none;
    }
    .nav-session-info {
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .nav-links {
      display: flex;
      gap: 0.25em;
    }
    .nav-link {
      padding: 0.4em 0.8em;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .nav-link:hover {
      background: rgba(0,0,0,0.05);
    }
    .nav-link.active {
      background: var(--text-primary);
      color: white;
    }
    .nav-actions {
      display: flex;
      gap: 0.5em;
    }
    .nav-btn {
      padding: 0.4em 1em;
      background: var(--text-primary);
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .nav-btn:hover {
      background: #333;
    }

    /* Main content area */
    .page-content {
      max-width: 55em;
      margin: 0 auto;
      padding: 2em;
    }
    .page-content.full-width {
      max-width: none;
      padding: 1em 2em;
    }

    /* Common elements */
    h1 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.8em;
      margin-bottom: 0.5em;
    }
    h2 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.4em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h3 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.1em;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    a { color: var(--accent-link); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Cards */
    .card {
      background: white;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 1.25em;
      margin-bottom: 1em;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75em;
    }
    .card-title {
      font-weight: 600;
      font-size: 1em;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-family: system-ui, sans-serif;
    }
    .badge-count {
      background: var(--bg-secondary);
      color: var(--text-muted);
    }
    .badge-research { background: #dbeafe; color: #1e40af; }
    .badge-development { background: #dcfce7; color: #166534; }
    .badge-productivity { background: #fef3c7; color: #92400e; }
    .badge-social { background: #fce7f3; color: #9d174d; }
    .badge-other { background: #f3f4f6; color: #4b5563; }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      padding: 0.5em 1em;
      border: none;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.9em;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--text-primary);
      color: white;
    }
    .btn-primary:hover {
      background: #333;
      text-decoration: none;
    }
    .btn-secondary {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
    }
    .btn-secondary:hover {
      background: #eee;
      text-decoration: none;
    }

    /* Empty states */
    .empty-state {
      text-align: center;
      padding: 3em;
      color: var(--text-muted);
    }
    .empty-state-icon {
      font-size: 2em;
      margin-bottom: 0.5em;
    }

    ${extraHead}
  </style>
</head>
<body>
  ${renderNav(sessionId, currentPage, sessionData)}
  ${content}
  ${extraScripts}
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  renderNav,
  wrapInLayout,
  formatDate
};
