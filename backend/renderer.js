/**
 * Renders classification results as an HTML page
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

function renderResultsPage(data) {
  const { narrative, groups, tasks, summary, timestamp, totalTabs } = data;

  const groupsHtml = Object.entries(groups).map(([category, tabs]) => `
    <div class="category">
      <h3>${escapeHtml(category)} <span class="count">(${tabs.length})</span></h3>
      <ul>
        ${tabs.map(tab => `
          <li>
            <a href="${escapeHtml(tab.url)}" target="_blank">${escapeHtml(tab.title)}</a>
            ${tab.contentPreview ? `<p class="preview">${escapeHtml(tab.contentPreview)}...</p>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  const tasksHtml = tasks.map(task => `
    <div class="task">
      <h4>${escapeHtml(task.category)}</h4>
      <p>${escapeHtml(task.description)}</p>
      <p class="action"><strong>Suggested:</strong> ${escapeHtml(task.suggestedAction)}</p>
    </div>
  `).join('');

  const jsonSummary = JSON.stringify(summary, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memento - Session Analysis</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    header h1 { font-size: 24px; margin-bottom: 10px; }
    header .meta { font-size: 14px; opacity: 0.9; }
    .narrative {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .narrative h2 { font-size: 18px; margin-bottom: 10px; color: #667eea; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .section h2 {
      font-size: 18px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #eee;
    }
    .category {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .category h3 {
      font-size: 16px;
      color: #444;
      margin-bottom: 10px;
    }
    .category .count {
      color: #888;
      font-weight: normal;
    }
    .category ul {
      list-style: none;
    }
    .category li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .category li:last-child { border-bottom: none; }
    .category a {
      color: #667eea;
      text-decoration: none;
    }
    .category a:hover { text-decoration: underline; }
    .preview {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .task {
      padding: 15px;
      background: #f0f4ff;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .task h4 { color: #667eea; margin-bottom: 5px; }
    .task .action { font-size: 14px; color: #666; margin-top: 8px; }
    .json-summary {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 13px;
    }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <header>
    <h1>Memento Session Analysis</h1>
    <div class="meta">
      <span>${totalTabs} tabs analyzed</span> &bull;
      <span>${new Date(timestamp).toLocaleString()}</span>
    </div>
  </header>

  <div class="narrative">
    <h2>Summary</h2>
    <p>${escapeHtml(narrative)}</p>
  </div>

  <div class="section">
    <h2>Grouped Tabs</h2>
    ${groupsHtml}
  </div>

  <div class="section">
    <h2>Inferred Tasks</h2>
    ${tasksHtml}
  </div>

  <div class="section">
    <h2>JSON Summary</h2>
    <div class="json-summary">
      <pre>${escapeHtml(jsonSummary)}</pre>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderResultsPage };
