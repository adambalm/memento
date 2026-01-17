/**
 * History Renderer - Session Browser
 * Lists all past sessions with search and quick stats
 */

const { escapeHtml } = require('./layout');

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown date';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

/**
 * Get pattern badge class
 */
function getPatternClass(pattern) {
  if (!pattern) return 'pattern-unknown';
  const p = pattern.toLowerCase();
  if (p.includes('research')) return 'pattern-research';
  if (p.includes('output') || p.includes('focused')) return 'pattern-focused';
  if (p.includes('balanced')) return 'pattern-balanced';
  if (p.includes('scattered')) return 'pattern-scattered';
  return 'pattern-other';
}

/**
 * Render the history page
 */
function renderHistoryPage(sessions, searchQuery = null) {
  const totalSessions = sessions.length;
  const totalTabs = sessions.reduce((sum, s) => sum + (s.tabCount || 0), 0);

  // Group sessions by date
  const groupedByDate = {};
  sessions.forEach(session => {
    const date = session.timestamp ? new Date(session.timestamp).toDateString() : 'Unknown';
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(session);
  });

  const styles = `
    :root {
      --bg-primary: #fffff8;
      --bg-secondary: #f9f9f5;
      --text-primary: #111111;
      --text-secondary: #454545;
      --text-muted: #6b6b6b;
      --accent-link: #a00000;
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

    .page-content {
      max-width: 55em;
      margin: 0 auto;
      padding: 2em;
    }

    h1 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.8em;
      margin-bottom: 0.5em;
    }

    .stats-summary {
      display: flex;
      gap: 2em;
      font-size: 0.95em;
      color: var(--text-muted);
      margin-bottom: 1.5em;
    }
    .stats-summary strong {
      color: var(--text-primary);
    }

    /* Search */
    .search-bar {
      margin-bottom: 2em;
    }
    .search-input {
      width: 100%;
      max-width: 400px;
      padding: 0.6em 1em;
      font-family: inherit;
      font-size: 1em;
      border: 1px solid var(--border-light);
      border-radius: 4px;
      background: white;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--text-muted);
    }

    /* Date groups */
    .date-group {
      margin-bottom: 2em;
    }
    .date-header {
      font-size: 0.9em;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 0.5em;
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 0.75em;
    }

    /* Session cards */
    .session-list {
      list-style: none;
    }
    .session-item {
      display: block;
      padding: 1em;
      margin-bottom: 0.75em;
      background: white;
      border: 1px solid var(--border-light);
      border-radius: 6px;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.2s, border-color 0.2s;
    }
    .session-item:hover {
      border-color: var(--text-muted);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-decoration: none;
    }

    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5em;
    }
    .session-time {
      font-size: 0.95em;
      color: var(--text-secondary);
    }
    .session-relative {
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .session-meta {
      display: flex;
      gap: 0.75em;
      align-items: center;
    }
    .session-tabs {
      font-family: system-ui, sans-serif;
      font-size: 0.85em;
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 10px;
      color: var(--text-muted);
    }
    .session-pattern {
      font-family: system-ui, sans-serif;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: lowercase;
    }
    .pattern-research { background: #dbeafe; color: #1e40af; }
    .pattern-focused { background: #dcfce7; color: #166534; }
    .pattern-balanced { background: #fef3c7; color: #92400e; }
    .pattern-scattered { background: #fee2e2; color: #991b1b; }
    .pattern-other { background: #f3f4f6; color: #4b5563; }
    .pattern-unknown { background: #f3f4f6; color: #9ca3af; }

    .session-narrative {
      font-size: 0.9em;
      color: var(--text-secondary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4em 2em;
      color: var(--text-muted);
    }
    .empty-state h2 {
      font-weight: 400;
      margin-bottom: 0.5em;
    }

    /* Search results */
    .search-results-info {
      font-size: 0.9em;
      color: var(--text-muted);
      margin-bottom: 1em;
    }
    .clear-search {
      color: var(--accent-link);
      text-decoration: none;
      margin-left: 0.5em;
    }
    .clear-search:hover {
      text-decoration: underline;
    }
  `;

  const content = sessions.length > 0 ? `
    <div class="page-content">
      <h1>Session History</h1>

      <div class="stats-summary">
        <span><strong>${totalSessions}</strong> sessions</span>
        <span><strong>${totalTabs.toLocaleString()}</strong> total tabs analyzed</span>
      </div>

      <div class="search-bar">
        <form action="/history" method="get">
          <input
            type="text"
            name="q"
            class="search-input"
            placeholder="Search sessions..."
            value="${escapeHtml(searchQuery || '')}"
          />
        </form>
      </div>

      ${searchQuery ? `
        <div class="search-results-info">
          Showing results for "${escapeHtml(searchQuery)}"
          <a href="/history" class="clear-search">Clear</a>
        </div>
      ` : ''}

      ${Object.entries(groupedByDate).map(([date, dateSessions]) => `
        <div class="date-group">
          <div class="date-header">${date}</div>
          <ul class="session-list">
            ${dateSessions.map(session => `
              <a href="/results/${escapeHtml(session.id)}" class="session-item">
                <div class="session-header">
                  <div>
                    <span class="session-time">${formatTimestamp(session.timestamp)}</span>
                    <span class="session-relative">${getRelativeTime(session.timestamp)}</span>
                  </div>
                  <div class="session-meta">
                    <span class="session-tabs">${session.tabCount} tabs</span>
                    ${session.sessionPattern ? `
                      <span class="session-pattern ${getPatternClass(session.sessionPattern)}">${escapeHtml(session.sessionPattern)}</span>
                    ` : ''}
                  </div>
                </div>
                ${session.narrative ? `
                  <div class="session-narrative">${escapeHtml(session.narrative)}</div>
                ` : ''}
              </a>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  ` : `
    <div class="page-content">
      <h1>Session History</h1>
      <div class="empty-state">
        <h2>No sessions yet</h2>
        <p>Capture your first browser session using the Memento extension.</p>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session History - Memento</title>
  <style>${styles}</style>
</head>
<body>
  <nav class="main-nav">
    <div class="nav-brand">
      <a href="/history">Memento</a>
    </div>
    <div class="nav-links">
      <a href="/history" class="nav-link active">History</a>
    </div>
  </nav>
  ${content}
</body>
</html>`;
}

module.exports = { renderHistoryPage };
