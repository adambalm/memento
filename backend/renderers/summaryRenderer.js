/**
 * Summary Renderer - Hub Screen
 * Bird's eye view of the session with paths to deeper information
 */

const { escapeHtml, wrapInLayout } = require('./layout');

/**
 * Get category badge class based on category name
 */
function getCategoryBadgeClass(category) {
  const lower = category.toLowerCase();
  if (lower.includes('research') || lower.includes('academic')) return 'badge-research';
  if (lower.includes('development') || lower.includes('dev')) return 'badge-development';
  if (lower.includes('productivity') || lower.includes('work')) return 'badge-productivity';
  if (lower.includes('social') || lower.includes('media')) return 'badge-social';
  return 'badge-other';
}

/**
 * Render the summary page
 */
function renderSummaryPage(sessionData, sessionId, mirrorInsight = null) {
  const { narrative, groups, tasks, totalTabs, timestamp, thematicAnalysis, visualization, _dispositions, _trashedItems, _completedItems } = sessionData;

  // Calculate category counts
  const categoryCounts = Object.entries(groups || {}).map(([name, tabs]) => ({
    name,
    count: tabs.length,
    badgeClass: getCategoryBadgeClass(name)
  })).sort((a, b) => b.count - a.count);

  // Get session pattern
  const sessionPattern = thematicAnalysis?.sessionPattern;
  const alternativeNarrative = thematicAnalysis?.alternativeNarrative;
  const hiddenConnection = thematicAnalysis?.hiddenConnection;

  // Get suggested actions (top 3)
  const suggestedActions = (thematicAnalysis?.suggestedActions || []).slice(0, 3);

  const extraStyles = `
    .summary-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5em;
      margin-top: 1.5em;
    }
    @media (max-width: 800px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }

    .narrative-section {
      font-size: 1.1em;
      line-height: 1.8;
      margin-bottom: 1em;
    }

    .insight-card {
      background: linear-gradient(135deg, #f8f7f2 0%, #f0efe8 100%);
      border-left: 4px solid var(--accent-blue);
      padding: 1em 1.25em;
      margin-bottom: 1em;
      border-radius: 0 6px 6px 0;
    }
    .insight-card h4 {
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    .insight-card p {
      font-style: italic;
      margin: 0;
    }

    .category-list {
      list-style: none;
    }
    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5em 0;
      border-bottom: 1px solid var(--border-light);
    }
    .category-item:last-child {
      border-bottom: none;
    }
    .category-item a {
      color: var(--text-primary);
      text-decoration: none;
    }
    .category-item a:hover {
      color: var(--accent-link);
    }

    .action-list {
      list-style: none;
    }
    .action-item {
      padding: 0.75em 0;
      border-bottom: 1px solid var(--border-light);
    }
    .action-item:last-child {
      border-bottom: none;
    }
    .action-text {
      font-weight: 500;
      margin-bottom: 0.25em;
    }
    .action-reason {
      font-size: 0.9em;
      color: var(--text-muted);
    }
    .action-priority {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.75em;
      font-family: system-ui, sans-serif;
      text-transform: uppercase;
      margin-right: 0.5em;
    }
    .action-priority.high { background: #dcfce7; color: #166534; }
    .action-priority.medium { background: #fef3c7; color: #92400e; }
    .action-priority.low { background: #f3f4f6; color: #6b7280; }

    .pattern-badge {
      display: inline-block;
      padding: 4px 12px;
      background: var(--bg-secondary);
      border-radius: 20px;
      font-size: 0.85em;
      color: var(--text-secondary);
      margin-top: 0.5em;
    }

    .quick-actions {
      display: flex;
      gap: 0.75em;
      margin-top: 1.5em;
      flex-wrap: wrap;
    }

    .disposition-stats {
      display: flex;
      gap: 1.5em;
      padding: 0.75em 1em;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 0.9em;
      margin-bottom: 1.5em;
    }
    .disposition-stat {
      display: flex;
      align-items: center;
      gap: 0.4em;
    }
    .disposition-stat .icon {
      font-size: 1.1em;
    }
    .disposition-stat.trashed .icon { color: #dc2626; }
    .disposition-stat.completed .icon { color: #16a34a; }
    .disposition-stat.regrouped .icon { color: #2563eb; }

    .mirror-banner {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #f5f5f5;
      padding: 1.5em;
      margin: -2em -2em 1.5em -2em;
      text-align: center;
    }
    .mirror-banner p {
      font-size: 1.2em;
      margin: 0;
    }
    .mirror-banner .detail {
      font-size: 0.9em;
      opacity: 0.8;
      margin-top: 0.5em;
    }
    .mirror-banner .actions {
      margin-top: 1em;
      display: flex;
      justify-content: center;
      gap: 1em;
    }
    .mirror-banner .btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
    }
    .mirror-banner .btn:hover {
      background: rgba(255,255,255,0.1);
    }
  `;

  const content = `
    <div class="page-content">
      ${mirrorInsight ? `
        <div class="mirror-banner">
          <p>"${escapeHtml(mirrorInsight.headline)}<br>${escapeHtml(mirrorInsight.subhead)}"</p>
          ${mirrorInsight.detail ? `<p class="detail">${escapeHtml(mirrorInsight.detail)}</p>` : ''}
          <div class="actions">
            ${(mirrorInsight.actions || []).map(a => `
              <button class="btn">${a.icon || ''} ${escapeHtml(a.label)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <h1>Session Summary</h1>

      ${_dispositions && _dispositions.count > 0 ? `
        <div class="disposition-stats">
          ${_dispositions.completedCount > 0 ? `
            <span class="disposition-stat completed">
              <span class="icon">&#10003;</span>
              <span>${_dispositions.completedCount} completed</span>
            </span>
          ` : ''}
          ${_dispositions.trashedCount > 0 ? `
            <span class="disposition-stat trashed">
              <span class="icon">&#10005;</span>
              <span>${_dispositions.trashedCount} trashed</span>
            </span>
          ` : ''}
          ${_dispositions.regroupedCount > 0 ? `
            <span class="disposition-stat regrouped">
              <span class="icon">&#8644;</span>
              <span>${_dispositions.regroupedCount} moved</span>
            </span>
          ` : ''}
        </div>
      ` : ''}

      <p class="narrative-section">${escapeHtml(narrative)}</p>

      ${sessionPattern ? `
        <span class="pattern-badge">${escapeHtml(sessionPattern.type || 'mixed')} session</span>
      ` : ''}

      <div class="summary-grid">
        <div class="main-column">
          ${alternativeNarrative ? `
            <div class="insight-card">
              <h4>Another Way to See This</h4>
              <p>${escapeHtml(alternativeNarrative)}</p>
            </div>
          ` : ''}

          ${hiddenConnection ? `
            <div class="insight-card">
              <h4>Something You Might Not See</h4>
              <p>${escapeHtml(hiddenConnection)}</p>
            </div>
          ` : ''}

          ${suggestedActions.length > 0 ? `
            <div class="card">
              <div class="card-header">
                <span class="card-title">Suggested Actions</span>
              </div>
              <ul class="action-list">
                ${suggestedActions.map(action => `
                  <li class="action-item">
                    <div class="action-text">
                      <span class="action-priority ${action.priority || 'medium'}">${action.priority || 'medium'}</span>
                      ${escapeHtml(action.action)}
                    </div>
                    ${action.reason ? `<div class="action-reason">${escapeHtml(action.reason)}</div>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="quick-actions">
            <a href="/results/${sessionId}/map" class="btn btn-secondary">View Map</a>
            <a href="/results/${sessionId}/tabs" class="btn btn-secondary">Browse All Tabs</a>
            <a href="/results/${sessionId}/analysis" class="btn btn-secondary">Deep Analysis</a>
          </div>
        </div>

        <div class="side-column">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Categories</span>
              <span class="badge badge-count">${totalTabs} tabs</span>
            </div>
            <ul class="category-list">
              ${categoryCounts.map(cat => `
                <li class="category-item">
                  <a href="/results/${sessionId}/tabs?filter=${encodeURIComponent(cat.name)}">${escapeHtml(cat.name)}</a>
                  <span class="badge ${cat.badgeClass}">${cat.count}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          ${tasks && tasks.length > 0 ? `
            <div class="card">
              <div class="card-header">
                <span class="card-title">Inferred Tasks</span>
              </div>
              <ul class="action-list">
                ${tasks.slice(0, 3).map(task => `
                  <li class="action-item">
                    <div class="action-text">${escapeHtml(task.description)}</div>
                    <div class="action-reason">${escapeHtml(task.suggestedAction)}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  return wrapInLayout(content, {
    sessionId,
    currentPage: 'summary',
    title: 'Session Summary',
    sessionData: { totalTabs, timestamp },
    extraHead: extraStyles
  });
}

module.exports = { renderSummaryPage };
