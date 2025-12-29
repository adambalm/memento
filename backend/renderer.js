/**
 * Renders classification results as an HTML page
 * Design: Tufte-inspired readability + reasoning flow transparency
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
  const { narrative, groups, tasks, summary, timestamp, totalTabs, source, meta, deepDiveResults, deepDive } = data;

  const safeSource = source || 'unknown';
  const modelName = meta?.model || null;
  const timing = meta?.timing || {};
  const usage = meta?.usage || null;
  const cost = meta?.cost || null;

  // Flow trace - showing the reasoning chain
  const triageDecisions = deepDive || [];
  const flowHtml = `
    <section class="flow-trace">
      <h2>Reasoning Flow</h2>

      <div class="flow-stage">
        <h3>Pass 1 — Classify & Triage</h3>
        <p class="flow-desc">Analyzed ${totalTabs} tabs. Classified each into categories and identified ${triageDecisions.length} tabs needing deeper analysis.</p>
        ${triageDecisions.length > 0 ? `
          <div class="triage-decisions">
            <p class="label">Flagged for deep dive:</p>
            <ul>
              ${triageDecisions.map(d => `
                <li>
                  <span class="tab-ref">Tab ${d.tabIndex}</span>
                  <span class="arrow">→</span>
                  <span class="hints">${escapeHtml((d.extractHints || []).join(', ') || 'general analysis')}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : '<p class="flow-note">No tabs flagged for deep analysis.</p>'}
      </div>

      ${deepDiveResults && deepDiveResults.length > 0 ? `
        <div class="flow-stage">
          <h3>Pass 2 — Deep Analysis</h3>
          <p class="flow-desc">Each flagged tab was analyzed with its full content. Extracted summaries, key points, and entities.</p>
          <div class="deep-dive-trace">
            ${deepDiveResults.map((dive, i) => `
              <div class="dive-trace-item ${dive.error ? 'failed' : ''}">
                <span class="trace-num">${i + 1}</span>
                <div class="trace-content">
                  <p class="trace-title">${escapeHtml(dive.title || 'Unknown')}</p>
                  ${dive.analysis ? `
                    <p class="trace-result">
                      ${dive.analysis.keyPoints ? `${dive.analysis.keyPoints.length} key points` : ''}
                      ${dive.analysis.entities ? `, entities: ${Object.values(dive.analysis.entities).flat().filter(e => e).length}` : ''}
                    </p>
                  ` : `<p class="trace-error">Failed: ${escapeHtml(dive.error || 'unknown error')}</p>`}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="flow-stage">
        <h3>Pass 3 — Synthesis</h3>
        <p class="flow-desc">Combined classification results with deep analysis insights to generate narrative summary.</p>
      </div>
    </section>
  `;

  // Deep dive detail (full results, shown after tabs)
  const deepDiveHtml = (deepDiveResults && deepDiveResults.length > 0) ? `
    <section>
      <h2>Deep Analysis Detail</h2>
      ${deepDiveResults.map(dive => `
        <article class="deep-dive">
          <h3><a href="${escapeHtml(dive.url)}" target="_blank">${escapeHtml(dive.title)}</a></h3>
          <p class="reason">${escapeHtml(dive.reason)}</p>
          ${dive.analysis ? `
            <p>${escapeHtml(dive.analysis.summary || '')}</p>
            ${dive.analysis.keyPoints && dive.analysis.keyPoints.length > 0 ? `
              <ul>
                ${dive.analysis.keyPoints.map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
              </ul>
            ` : ''}
          ` : '<p class="error">Analysis failed</p>'}
        </article>
      `).join('')}
    </section>
  ` : '';

  // Grouped tabs
  const groupsHtml = Object.entries(groups).map(([category, tabs]) => `
    <h3>${escapeHtml(category)} <span class="count">(${tabs.length})</span></h3>
    <ul class="tab-list">
      ${tabs.map(tab => `
        <li><a href="${escapeHtml(tab.url)}" target="_blank">${escapeHtml(tab.title)}</a></li>
      `).join('')}
    </ul>
  `).join('');

  // Tasks
  const tasksHtml = tasks.length > 0 ? `
    <section>
      <h2>Inferred Tasks</h2>
      <table class="tasks-table">
        <thead><tr><th>Category</th><th>Task</th><th>Suggested Action</th></tr></thead>
        <tbody>
          ${tasks.map(task => `
            <tr>
              <td>${escapeHtml(task.category)}</td>
              <td>${escapeHtml(task.description)}</td>
              <td>${escapeHtml(task.suggestedAction)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  ` : '';

  // Timing (at the end, as diagnostic info)
  const totalTime = timing.total || (timing.pass1 || 0) + (timing.pass2 || 0) + (timing.pass3 || 0);
  const timingHtml = totalTime ? `
    <section class="timing-section">
      <h2>Timing</h2>
      <table class="timing-table">
        <tr><td>Pass 1 (Classify)</td><td class="timing-value">${((timing.pass1 || 0) / 1000).toFixed(1)}s</td></tr>
        <tr><td>Pass 2 (Deep Dive)</td><td class="timing-value">${((timing.pass2 || 0) / 1000).toFixed(1)}s</td></tr>
        <tr><td>Pass 3 (Synthesis)</td><td class="timing-value">${((timing.pass3 || 0) / 1000).toFixed(1)}s</td></tr>
        <tr class="total"><td>Total</td><td class="timing-value">${(totalTime / 1000).toFixed(1)}s</td></tr>
      </table>
    </section>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memento — Session Analysis</title>
  <style>
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
      max-width: 55em;
      margin: 0 auto;
      padding: 2em;
    }
    header {
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 1px solid var(--border-light);
    }
    h1 {
      font-weight: 400;
      font-style: italic;
      font-size: 2em;
      margin-bottom: 0.5em;
    }
    .meta {
      color: var(--text-muted);
      font-size: 0.9em;
    }
    .meta span { margin-right: 1em; }
    .model-badge {
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 0.85em;
    }
    .cost { color: #2f5233; font-weight: 600; }
    h2 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.4em;
      margin-top: 2em;
      margin-bottom: 0.75em;
    }
    h3 {
      font-weight: 400;
      font-style: italic;
      font-size: 1.1em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    section { margin-bottom: 2em; }
    a { color: var(--accent-link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .summary { font-size: 1.05em; margin-bottom: 1.5em; }
    .count { color: var(--text-muted); font-weight: normal; font-style: normal; }

    /* Flow trace */
    .flow-trace {
      background: var(--bg-secondary);
      padding: 1.5em;
      margin: 1.5em 0;
    }
    .flow-trace h2 { margin-top: 0; }
    .flow-stage {
      margin: 1.5em 0;
      padding-left: 1em;
      border-left: 3px solid var(--border-light);
    }
    .flow-stage h3 {
      margin-top: 0;
      color: var(--text-secondary);
    }
    .flow-desc {
      color: var(--text-secondary);
      font-size: 0.95em;
      margin-bottom: 0.75em;
    }
    .flow-note {
      color: var(--text-muted);
      font-style: italic;
    }
    .triage-decisions { margin-top: 0.75em; }
    .triage-decisions .label {
      font-size: 0.9em;
      color: var(--text-muted);
      margin-bottom: 0.25em;
    }
    .triage-decisions ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .triage-decisions li {
      padding: 0.25em 0;
      font-size: 0.9em;
    }
    .tab-ref {
      font-family: Consolas, monospace;
      background: var(--bg-primary);
      padding: 1px 4px;
      border-radius: 2px;
    }
    .arrow { color: var(--text-muted); margin: 0 0.5em; }
    .hints { color: var(--text-secondary); font-style: italic; }

    /* Deep dive trace */
    .deep-dive-trace {
      margin-top: 0.75em;
    }
    .dive-trace-item {
      display: flex;
      align-items: flex-start;
      padding: 0.5em 0;
      border-bottom: 1px solid var(--border-light);
    }
    .dive-trace-item:last-child { border-bottom: none; }
    .dive-trace-item.failed { opacity: 0.7; }
    .trace-num {
      font-family: Consolas, monospace;
      background: var(--border-light);
      width: 1.5em;
      height: 1.5em;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.8em;
      margin-right: 0.75em;
      flex-shrink: 0;
    }
    .trace-content { flex: 1; }
    .trace-title {
      font-size: 0.9em;
      margin: 0;
    }
    .trace-result {
      font-size: 0.85em;
      color: var(--text-muted);
      margin: 0.25em 0 0 0;
    }
    .trace-error {
      font-size: 0.85em;
      color: var(--accent-link);
      margin: 0.25em 0 0 0;
    }

    /* Deep dive detail */
    .deep-dive {
      margin-bottom: 1.5em;
      padding-bottom: 1.5em;
      border-bottom: 1px solid var(--border-light);
    }
    .deep-dive:last-child { border-bottom: none; }
    .deep-dive h3 { margin-top: 0; }
    .reason {
      font-style: italic;
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 0.75em;
    }
    .deep-dive ul { margin-left: 1.5em; margin-top: 0.5em; }
    .deep-dive li { margin-bottom: 0.25em; }
    .error { color: var(--accent-link); font-style: italic; }

    /* Tab list */
    .tab-list { list-style: none; margin-left: 0; }
    .tab-list li {
      padding: 0.3em 0;
      border-bottom: 1px solid var(--border-light);
    }
    .tab-list li:last-child { border-bottom: none; }

    /* Tasks table */
    .tasks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95em;
    }
    .tasks-table th {
      text-align: left;
      font-weight: 600;
      padding: 0.5em;
      border-bottom: 2px solid var(--border-light);
    }
    .tasks-table td {
      padding: 0.5em;
      border-bottom: 1px solid var(--border-light);
      vertical-align: top;
    }

    /* Timing */
    .timing-section {
      margin-top: 3em;
      padding-top: 1em;
      border-top: 1px solid var(--border-light);
    }
    .timing-table {
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .timing-table td {
      padding: 0.25em 1em 0.25em 0;
    }
    .timing-table .timing-value {
      font-family: Consolas, monospace;
      text-align: right;
    }
    .timing-table .total td {
      font-weight: 600;
      border-top: 1px solid var(--border-light);
      padding-top: 0.5em;
    }

    /* JSON toggle */
    .json-section {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid var(--border-light);
    }
    .json-toggle {
      cursor: pointer;
      color: var(--text-muted);
      font-size: 0.9em;
    }
    .json-toggle:hover { color: var(--accent-link); }
    .json-content {
      display: none;
      background: var(--bg-secondary);
      padding: 1em;
      margin-top: 0.5em;
      overflow-x: auto;
      font-family: Consolas, monospace;
      font-size: 0.85em;
    }
    .json-content.visible { display: block; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <header>
    <h1>Memento</h1>
    <div class="meta">
      <span>${totalTabs} tabs</span>
      <span>${new Date(timestamp).toLocaleString()}</span>
      <span class="model-badge">${escapeHtml(modelName || safeSource)}</span>
      ${usage ? `<span>${(usage.totalInputTokens || 0).toLocaleString()} in / ${(usage.totalOutputTokens || 0).toLocaleString()} out</span>` : ''}
      ${cost ? `<span class="cost">$${cost.totalCost}</span>` : ''}
    </div>
  </header>

  <p class="summary">${escapeHtml(narrative)}</p>

  ${flowHtml}

  <section>
    <h2>Grouped Tabs</h2>
    ${groupsHtml}
  </section>

  ${deepDiveHtml}

  ${tasksHtml}

  ${timingHtml}

  <div class="json-section">
    <span class="json-toggle" onclick="document.querySelector('.json-content').classList.toggle('visible')">▸ Raw JSON</span>
    <pre class="json-content">${escapeHtml(JSON.stringify(summary, null, 2))}</pre>
  </div>
</body>
</html>`;
}

module.exports = { renderResultsPage };
