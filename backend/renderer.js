/**
 * Renders classification results as an HTML page
 * Design: Tufte-inspired readability + reasoning flow transparency
 * v1.1: Cognitive debugging trace panels for inspecting prompts and responses
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
 * Render a trace panel for cognitive debugging
 * Shows prompt, raw response, and parsing metadata
 */
function renderTracePanel(trace, passName, tokens = null) {
  if (!trace || !trace.prompt) return '';

  const tokensInfo = tokens ? ` • ${tokens.toLocaleString()} tokens` : '';

  return `
    <details class="trace-panel">
      <summary>${passName}${tokensInfo}</summary>
      <div class="trace-grid">
        <div class="trace-prompt">
          <h4>Prompt Sent to LLM</h4>
          <pre class="trace-code">${escapeHtml(trace.prompt)}</pre>
        </div>
        <div class="trace-response">
          <h4>Raw LLM Response</h4>
          <pre class="trace-code">${escapeHtml(trace.rawResponse || '(no response captured)')}</pre>
        </div>
      </div>
      ${trace.parsing ? `
        <div class="trace-parsing">
          <h4>Parsing Process</h4>
          <ul>
            <li>ANSI codes stripped: ${trace.parsing.ansiStripped || 0}</li>
            <li>Markdown fences removed: ${trace.parsing.fencesRemoved || 0}</li>
            ${trace.parsing.jsonByteRange ? `<li>JSON extracted from bytes ${trace.parsing.jsonByteRange[0]}-${trace.parsing.jsonByteRange[1]}</li>` : ''}
            <li>Status: <span class="parse-status-${trace.parsing.status || 'unknown'}">${trace.parsing.status || 'unknown'}</span></li>
            ${trace.parsing.missingTabs && trace.parsing.missingTabs.length > 0 ? `<li class="parse-warning">Missing tabs: ${trace.parsing.missingTabs.join(', ')}</li>` : ''}
          </ul>
        </div>
      ` : ''}
      ${trace.contextUsed ? `
        <div class="trace-context">
          <h4>Context Injected</h4>
          <ul>
            <li>Projects: ${trace.contextUsed.projects?.join(', ') || 'none'}</li>
            <li>Keywords: ${trace.contextUsed.keywords?.join(', ') || 'none'}</li>
          </ul>
        </div>
      ` : ''}
    </details>
  `;
}

/**
 * Render per-tab attribution for debugging classification decisions
 *
 * Attribution shows WHY this tab was classified as it was:
 * - context.json matches: keywords from your active projects found in tab content
 * - domain matches: URL patterns that suggest a category (github.com → Development)
 */
function renderTabAttribution(tabIndex, attribution) {
  if (!attribution || !attribution.attributionChain || attribution.attributionChain.length === 0) {
    return `<div class="no-attribution">No keyword matches found in tab content</div>`;
  }

  const contextMatches = attribution.attributionChain.filter(c => c.source === 'context.json');
  const domainMatches = attribution.attributionChain.filter(c => c.source === 'domain');

  let html = '<div class="attribution-detail">';

  if (contextMatches.length > 0) {
    html += '<div class="attr-group"><strong>Context keywords found:</strong><ul>';
    html += contextMatches.map(c =>
      `<li class="attr-context">${escapeHtml(c.match)}${c.project ? ` (project: ${escapeHtml(c.project)})` : ''}</li>`
    ).join('');
    html += '</ul></div>';
  }

  if (domainMatches.length > 0) {
    html += '<div class="attr-group"><strong>Domain signals:</strong><ul>';
    html += domainMatches.map(c =>
      `<li class="attr-domain">${escapeHtml(c.match)} → ${escapeHtml(c.signal || 'detected')}</li>`
    ).join('');
    html += '</ul></div>';
  }

  if (attribution.noContextMatch) {
    html += '<div class="attr-warning">No active project keywords matched this tab</div>';
  }

  html += '</div>';

  return `
    <details class="tab-attribution">
      <summary>Why this classification?</summary>
      ${html}
    </details>
  `;
}

/**
 * Render thematic analysis section (Pass 4)
 * Shows project support relationships, throughlines, and session pattern
 */
function renderThematicAnalysis(thematicAnalysis) {
  if (!thematicAnalysis) return '';

  const { projectSupport, thematicThroughlines, alternativeNarrative, sessionPattern } = thematicAnalysis;

  // Project support section
  const projectSupportHtml = Object.keys(projectSupport || {}).length > 0 ? `
    <div class="project-support">
      <h3>Cross-Category Project Support</h3>
      ${Object.entries(projectSupport).map(([project, support]) => `
        <div class="project-support-item">
          <h4>${escapeHtml(project)}</h4>
          ${support.directTabs?.length > 0 ? `
            <p class="direct-tabs"><strong>Direct:</strong> tabs ${support.directTabs.join(', ')}</p>
          ` : ''}
          ${support.supportingTabs?.length > 0 ? `
            <p class="supporting-tabs"><strong>Supporting:</strong> tabs ${support.supportingTabs.join(', ')}</p>
          ` : ''}
          ${support.supportingEvidence?.length > 0 ? `
            <ul class="support-evidence">
              ${support.supportingEvidence.map(e => `
                <li><span class="tab-ref">Tab ${e.tabIndex}</span> ${escapeHtml(e.reason)}</li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // Thematic throughlines section
  const throughlinesHtml = thematicThroughlines?.length > 0 ? `
    <div class="thematic-throughlines">
      <h3>Thematic Throughlines</h3>
      ${thematicThroughlines.map(t => `
        <div class="throughline-item">
          <h4>${escapeHtml(t.theme)}</h4>
          <p class="throughline-tabs">Tabs: ${(t.tabs || []).join(', ')}</p>
          ${t.projects?.length > 0 ? `<p class="throughline-projects">Projects: ${t.projects.map(p => escapeHtml(p)).join(', ')}</p>` : ''}
          ${t.insight ? `<p class="throughline-insight">${escapeHtml(t.insight)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // Session pattern section
  const sessionPatternHtml = sessionPattern ? `
    <div class="session-pattern">
      <h3>Session Pattern</h3>
      <div class="pattern-details">
        <span class="pattern-type pattern-${sessionPattern.type || 'unknown'}">${escapeHtml(sessionPattern.type || 'Unknown')}</span>
        ${sessionPattern.intakeVsOutput ? `<span class="intake-output">${escapeHtml(sessionPattern.intakeVsOutput)}</span>` : ''}
      </div>
      ${sessionPattern.riskFlags?.length > 0 ? `
        <p class="risk-flags"><strong>Risk flags:</strong> ${sessionPattern.riskFlags.map(f => escapeHtml(f)).join(', ')}</p>
      ` : ''}
      ${sessionPattern.recommendation ? `
        <p class="pattern-recommendation">${escapeHtml(sessionPattern.recommendation)}</p>
      ` : ''}
    </div>
  ` : '';

  // Alternative narrative
  const altNarrativeHtml = alternativeNarrative ? `
    <div class="alternative-narrative">
      <h3>Alternative Perspective</h3>
      <p>${escapeHtml(alternativeNarrative)}</p>
    </div>
  ` : '';

  return `
    <section class="thematic-section">
      <h2>Thematic Analysis</h2>
      ${altNarrativeHtml}
      ${projectSupportHtml}
      ${throughlinesHtml}
      ${sessionPatternHtml}
    </section>
  `;
}

/**
 * Render action cards for suggested actions (Pass 4)
 * Advisory buttons with mocked functionality
 */
function renderActionCards(suggestedActions) {
  if (!suggestedActions || suggestedActions.length === 0) return '';

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedActions = [...suggestedActions].sort((a, b) =>
    (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  );

  return `
    <section class="action-section">
      <h2>What To Do Now</h2>
      <div class="action-cards">
        ${sortedActions.map(action => `
          <div class="action-card priority-${action.priority || 'medium'}">
            <div class="action-header">
              <span class="priority-badge">${escapeHtml(action.priority || 'medium')}</span>
              ${action.project ? `<span class="project-tag">${escapeHtml(action.project)}</span>` : ''}
            </div>
            <p class="action-text">${escapeHtml(action.action)}</p>
            ${action.reason ? `<p class="action-reason">${escapeHtml(action.reason)}</p>` : ''}
            <div class="action-buttons">
              <button class="btn-primary" onclick="alert('Action: ${escapeHtml(action.action).replace(/'/g, "\\'")}\\n\\nThis is a mock button. In a future version, this could open your writing app or copy notes to clipboard.')">
                Start
              </button>
              ${action.tabsToClose?.length > 0 ? `
                <button class="btn-secondary" onclick="alert('Would close tabs: ${action.tabsToClose.join(', ')}\\n\\nThis requires browser extension integration.')">
                  Close ${action.tabsToClose.length} tab${action.tabsToClose.length > 1 ? 's' : ''}
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderResultsPage(data, sessionId = null) {
  const { narrative, groups, tasks, summary, timestamp, totalTabs, source, meta, deepDiveResults, deepDive, trace, thematicAnalysis } = data;

  const safeSource = source || 'unknown';
  const modelName = meta?.model || null;
  const timing = meta?.timing || {};
  const usage = meta?.usage || null;
  const cost = meta?.cost || null;

  // Debug mode detection
  const hasTrace = trace && (trace.pass1?.prompt || trace.pass2?.length > 0 || trace.pass3?.prompt);
  const perTabAttribution = trace?.perTabAttribution || {};

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

      ${thematicAnalysis ? `
        <div class="flow-stage">
          <h3>Pass 4 — Thematic Analysis</h3>
          <p class="flow-desc">Analyzed cross-category relationships. Found ${thematicAnalysis.thematicThroughlines?.length || 0} thematic throughlines and generated ${thematicAnalysis.suggestedActions?.length || 0} suggested actions.</p>
          ${thematicAnalysis.sessionPattern ? `
            <div class="session-pattern-summary">
              <p><strong>Pattern:</strong> ${escapeHtml(thematicAnalysis.sessionPattern.type || 'unknown')} — ${escapeHtml(thematicAnalysis.sessionPattern.recommendation || '')}</p>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </section>
  `;

  // Deep dive detail (full results, shown after tabs)
  const deepDiveHtml = (deepDiveResults && deepDiveResults.length > 0) ? `
    <section>
      <h2>Deep Analysis Detail</h2>
      ${deepDiveResults.map(dive => `
        <article class="deep-dive">
          <h3><a href="${escapeHtml(dive.url)}" target="_blank">${escapeHtml(dive.title)}</a></h3>
          ${dive.analysis ? `
            <div class="analysis-summary">
              <h4>Summary</h4>
              <p>${escapeHtml(dive.analysis.summary || 'No summary available')}</p>
            </div>
            ${dive.analysis.keyPoints && dive.analysis.keyPoints.length > 0 ? `
              <div class="analysis-keypoints">
                <h4>Key Points</h4>
                <ul>
                  ${dive.analysis.keyPoints.map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${dive.analysis.entities && (
              (dive.analysis.entities.authors && dive.analysis.entities.authors.length > 0) ||
              (dive.analysis.entities.organizations && dive.analysis.entities.organizations.length > 0) ||
              (dive.analysis.entities.technologies && dive.analysis.entities.technologies.length > 0)
            ) ? `
              <div class="analysis-entities">
                <h4>Entities</h4>
                <dl>
                  ${dive.analysis.entities.authors?.length > 0 ? `<dt>Authors</dt><dd>${dive.analysis.entities.authors.map(e => escapeHtml(e)).join(', ')}</dd>` : ''}
                  ${dive.analysis.entities.organizations?.length > 0 ? `<dt>Organizations</dt><dd>${dive.analysis.entities.organizations.map(e => escapeHtml(e)).join(', ')}</dd>` : ''}
                  ${dive.analysis.entities.technologies?.length > 0 ? `<dt>Technologies</dt><dd>${dive.analysis.entities.technologies.map(e => escapeHtml(e)).join(', ')}</dd>` : ''}
                </dl>
              </div>
            ` : ''}
            ${dive.analysis.relevance ? `
              <div class="analysis-relevance">
                <h4>Relevance</h4>
                <p>${escapeHtml(dive.analysis.relevance)}</p>
              </div>
            ` : ''}
          ` : '<p class="error">Analysis failed</p>'}
        </article>
      `).join('')}
    </section>
  ` : '';

  // Grouped tabs with margin notes for reasoning
  const reasoning = data.reasoning?.perTab || {};
  const groupsHtml = Object.entries(groups).map(([category, tabs]) => `
    <h3>${escapeHtml(category)} <span class="count">(${tabs.length})</span></h3>
    <ul class="tab-list">
      ${tabs.map(tab => {
        const r = reasoning[tab.tabIndex] || {};
        const signals = Array.isArray(r.signals) ? r.signals : [];
        const confidence = r.confidence || 'unknown';
        const hasReasoning = signals.length > 0 || confidence !== 'unknown';
        const attribution = perTabAttribution[tab.tabIndex];
        return `
        <li class="tab-item">
          <div class="tab-main">
            <a href="${escapeHtml(tab.url)}" target="_blank">${escapeHtml(tab.title)}</a>
            ${hasReasoning ? `
              <span class="margin-note">
                <span class="confidence confidence-${confidence}">${confidence}</span>
                ${signals.length > 0 ? `<span class="signals">${signals.map(s => escapeHtml(s)).join(', ')}</span>` : ''}
              </span>
            ` : ''}
          </div>
          ${hasTrace && attribution ? renderTabAttribution(tab.tabIndex, attribution) : ''}
        </li>`;
      }).join('')}
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
  const totalTime = timing.total || (timing.pass1 || 0) + (timing.pass2 || 0) + (timing.pass3 || 0) + (timing.pass4 || 0);
  const timingHtml = totalTime ? `
    <section class="timing-section">
      <h2>Timing</h2>
      <table class="timing-table">
        <tr><td>Pass 1 (Classify)</td><td class="timing-value">${((timing.pass1 || 0) / 1000).toFixed(1)}s</td></tr>
        <tr><td>Pass 2 (Deep Dive)</td><td class="timing-value">${((timing.pass2 || 0) / 1000).toFixed(1)}s</td></tr>
        <tr><td>Pass 3 (Synthesis)</td><td class="timing-value">${((timing.pass3 || 0) / 1000).toFixed(1)}s</td></tr>
        ${timing.pass4 ? `<tr><td>Pass 4 (Thematic)</td><td class="timing-value">${((timing.pass4 || 0) / 1000).toFixed(1)}s</td></tr>` : ''}
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
    .summary { font-size: 1.05em; margin-bottom: 1em; }
    .uncertainties {
      font-size: 0.9em;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 1.5em;
      padding: 0.5em 1em;
      background: #fff8e6;
      border-left: 3px solid #f0ad4e;
    }
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
    .deep-dive h4 {
      font-size: 0.9em;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 1em 0 0.25em 0;
      font-style: normal;
    }
    .deep-dive h4:first-child { margin-top: 0; }
    .analysis-summary, .analysis-keypoints, .analysis-entities, .analysis-relevance {
      margin-bottom: 0.75em;
    }
    .analysis-entities dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25em 1em;
      margin: 0;
      font-size: 0.9em;
    }
    .analysis-entities dt {
      font-weight: 600;
      color: var(--text-secondary);
    }
    .analysis-entities dd { margin: 0; }
    .deep-dive ul { margin-left: 1.5em; margin-top: 0.5em; }
    .deep-dive li { margin-bottom: 0.25em; }
    .error { color: var(--accent-link); font-style: italic; }

    /* Tab list with margin notes */
    .tab-list { list-style: none; margin-left: 0; }
    .tab-item {
      padding: 0.4em 0;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1em;
    }
    .tab-item:last-child { border-bottom: none; }
    .tab-item > a { flex: 1; min-width: 0; }

    /* Margin notes - Tufte style */
    .margin-note {
      flex-shrink: 0;
      font-size: 0.8em;
      color: var(--text-muted);
      text-align: right;
      max-width: 40%;
    }
    .confidence {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 0.85em;
      margin-right: 0.5em;
    }
    .confidence-high { background: #d4edda; color: #155724; }
    .confidence-medium { background: #fff3cd; color: #856404; }
    .confidence-low { background: #f8d7da; color: #721c24; }
    .confidence-unknown { background: var(--bg-secondary); color: var(--text-muted); }
    .signals {
      font-style: italic;
      font-size: 0.9em;
    }

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

    /* Trace panels for cognitive debugging */
    .trace-section {
      background: #f5f5f0;
      border: 2px solid #e0ddd5;
      padding: 1.5em;
      margin: 2em 0;
      border-radius: 4px;
    }
    .trace-section h2 {
      margin-top: 0;
      color: #555;
    }
    .trace-intro {
      font-size: 0.9em;
      color: var(--text-muted);
      margin-bottom: 1em;
    }
    .trace-panel {
      margin: 1em 0;
      border-left: 3px solid #6b6b6b;
      background: var(--bg-primary);
    }
    .trace-panel summary {
      cursor: pointer;
      padding: 0.75em 1em;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }
    .trace-panel summary:hover {
      background: #e8e8e0;
    }
    .trace-panel[open] summary {
      border-bottom: 1px solid var(--border-light);
    }
    .trace-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1em;
      padding: 1em;
    }
    @media (min-width: 1000px) {
      .trace-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .trace-prompt, .trace-response {
      background: var(--bg-secondary);
      padding: 0.75em;
      border-radius: 4px;
    }
    .trace-prompt h4, .trace-response h4, .trace-parsing h4, .trace-context h4 {
      margin: 0 0 0.5em 0;
      font-size: 0.9em;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .trace-code {
      max-height: 400px;
      overflow: auto;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 0.8em;
      background: #fafaf5;
      padding: 0.75em;
      border: 1px solid var(--border-light);
      border-radius: 3px;
      margin: 0;
    }
    .trace-parsing, .trace-context {
      padding: 0.75em 1em;
      border-top: 1px solid var(--border-light);
    }
    .trace-parsing ul, .trace-context ul {
      margin: 0;
      padding-left: 1.5em;
      font-size: 0.9em;
    }
    .trace-parsing li, .trace-context li {
      margin: 0.25em 0;
    }
    .parse-status-success { color: #155724; font-weight: 600; }
    .parse-status-unknown { color: var(--text-muted); }
    .parse-warning { color: #856404; font-weight: 600; }

    /* Tab item with attribution */
    .tab-main {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1em;
    }
    .tab-main > a { flex: 1; min-width: 0; }
    .tab-attribution {
      margin-top: 0.25em;
      margin-left: 1em;
      font-size: 0.85em;
    }
    .tab-attribution summary {
      cursor: pointer;
      color: var(--text-muted);
    }
    .tab-attribution[open] summary {
      margin-bottom: 0.25em;
    }
    .attribution-chain {
      margin: 0;
      padding-left: 1.5em;
      font-size: 0.9em;
    }
    .attribution-chain li {
      margin: 0.15em 0;
    }
    .attr-source {
      font-family: Consolas, monospace;
      font-size: 0.9em;
      background: var(--bg-secondary);
      padding: 1px 4px;
      border-radius: 2px;
    }
    .attr-context .attr-source { background: #d4edda; color: #155724; }
    .attr-domain .attr-source { background: #cce5ff; color: #004085; }
    .no-attribution {
      font-size: 0.85em;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Thematic Analysis Section */
    .thematic-section {
      background: linear-gradient(135deg, #f8f7f2 0%, #f5f4ef 100%);
      padding: 1.5em;
      margin: 2em 0;
      border-radius: 6px;
      border: 1px solid var(--border-light);
    }
    .thematic-section h2 {
      margin-top: 0;
      color: #4a4a4a;
    }
    .alternative-narrative {
      background: #fff8e6;
      padding: 1em;
      margin-bottom: 1.5em;
      border-left: 4px solid #f0ad4e;
      border-radius: 0 4px 4px 0;
    }
    .alternative-narrative h3 {
      margin-top: 0;
      font-size: 1em;
      color: #856404;
    }
    .alternative-narrative p {
      margin: 0;
      font-style: italic;
    }
    .project-support, .thematic-throughlines, .session-pattern {
      margin-bottom: 1.5em;
    }
    .project-support-item, .throughline-item {
      background: var(--bg-primary);
      padding: 0.75em 1em;
      margin: 0.5em 0;
      border-radius: 4px;
      border-left: 3px solid #6b6b6b;
    }
    .project-support-item h4, .throughline-item h4 {
      margin: 0 0 0.5em 0;
      font-size: 1em;
      color: var(--text-secondary);
    }
    .support-evidence {
      margin: 0.5em 0 0 0;
      padding-left: 1.5em;
      font-size: 0.9em;
    }
    .support-evidence li {
      margin: 0.25em 0;
    }
    .throughline-tabs, .throughline-projects {
      font-size: 0.9em;
      color: var(--text-muted);
      margin: 0.25em 0;
    }
    .throughline-insight {
      font-style: italic;
      margin: 0.5em 0 0 0;
    }
    .session-pattern {
      background: var(--bg-primary);
      padding: 1em;
      border-radius: 4px;
    }
    .session-pattern h3 {
      margin-top: 0;
    }
    .pattern-details {
      display: flex;
      gap: 1em;
      align-items: center;
      margin-bottom: 0.5em;
    }
    .pattern-type {
      font-family: Consolas, monospace;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    .pattern-research-heavy { background: #fff3cd; color: #856404; }
    .pattern-output-focused { background: #d4edda; color: #155724; }
    .pattern-balanced { background: #cce5ff; color: #004085; }
    .pattern-scattered { background: #f8d7da; color: #721c24; }
    .intake-output {
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .risk-flags {
      font-size: 0.9em;
      color: #856404;
      margin: 0.5em 0;
    }
    .pattern-recommendation {
      font-weight: 600;
      margin: 0.5em 0 0 0;
    }

    /* Action Cards */
    .action-section {
      margin: 2em 0;
    }
    .action-section h2 {
      margin-bottom: 1em;
    }
    .action-cards {
      display: grid;
      gap: 1em;
    }
    .action-card {
      background: var(--bg-primary);
      border: 2px solid var(--border-light);
      border-radius: 8px;
      padding: 1.25em;
      transition: box-shadow 0.2s;
    }
    .action-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .action-card.priority-high {
      border-left: 4px solid #28a745;
      background: linear-gradient(90deg, #f0fff0 0%, var(--bg-primary) 30%);
    }
    .action-card.priority-medium {
      border-left: 4px solid #ffc107;
      background: linear-gradient(90deg, #fffef0 0%, var(--bg-primary) 30%);
    }
    .action-card.priority-low {
      border-left: 4px solid #6c757d;
    }
    .action-header {
      display: flex;
      gap: 0.75em;
      align-items: center;
      margin-bottom: 0.75em;
    }
    .priority-badge {
      font-family: Consolas, monospace;
      font-size: 0.75em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 3px;
      background: var(--bg-secondary);
      color: var(--text-muted);
    }
    .priority-high .priority-badge { background: #d4edda; color: #155724; }
    .priority-medium .priority-badge { background: #fff3cd; color: #856404; }
    .project-tag {
      font-size: 0.85em;
      color: var(--text-secondary);
      font-style: italic;
    }
    .action-text {
      font-size: 1.1em;
      font-weight: 500;
      margin: 0 0 0.5em 0;
      color: var(--text-primary);
    }
    .action-reason {
      font-size: 0.9em;
      color: var(--text-muted);
      margin: 0 0 1em 0;
    }
    .action-buttons {
      display: flex;
      gap: 0.75em;
    }
    .btn-primary, .btn-secondary {
      font-family: inherit;
      font-size: 0.9em;
      padding: 0.5em 1em;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #4a4a4a;
      color: white;
    }
    .btn-primary:hover {
      background: #333;
    }
    .btn-secondary {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
    }
    .btn-secondary:hover {
      background: #e8e8e0;
    }

    /* Focus Mode button */
    .focus-mode-btn {
      background: linear-gradient(135deg, #4a4a4a 0%, #333 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      font-family: Palatino, Georgia, serif;
      font-size: 0.95em;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      margin-top: 1em;
    }
    .focus-mode-btn:hover {
      background: linear-gradient(135deg, #333 0%, #222 100%);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .focus-mode-btn:active {
      transform: translateY(0);
    }
    .focus-mode-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .focus-mode-icon {
      font-size: 1.1em;
    }
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
    ${sessionId ? `
    <button id="focus-mode-btn" class="focus-mode-btn" onclick="enterFocusMode()">
      <span class="focus-mode-icon">&#9881;</span>
      Enter Focus Mode
    </button>
    <script>
      const BACKEND_URL = 'http://localhost:3000';
      const SESSION_ID = '${escapeHtml(sessionId)}';
      const TOTAL_ITEMS = ${totalTabs};

      async function enterFocusMode() {
        const btn = document.getElementById('focus-mode-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="focus-mode-icon">&#8987;</span> Acquiring lock...';

        try {
          // First check if already locked
          const statusRes = await fetch(BACKEND_URL + '/api/lock-status');
          const status = await statusRes.json();

          if (status.locked && status.sessionId !== SESSION_ID) {
            alert('Another session is already in Focus Mode.\\n\\nSession: ' + status.sessionId + '\\nItems remaining: ' + status.itemsRemaining + '\\n\\nPlease complete that session first.');
            btn.disabled = false;
            btn.innerHTML = '<span class="focus-mode-icon">&#9881;</span> Enter Focus Mode';
            return;
          }

          // Acquire lock for this session
          const lockRes = await fetch(BACKEND_URL + '/api/acquire-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: SESSION_ID, itemsRemaining: TOTAL_ITEMS })
          });
          const lockResult = await lockRes.json();

          if (lockResult.success) {
            // Redirect to Launchpad
            window.location.href = BACKEND_URL + '/launchpad/' + SESSION_ID;
          } else {
            alert('Could not acquire lock: ' + (lockResult.message || 'Unknown error'));
            btn.disabled = false;
            btn.innerHTML = '<span class="focus-mode-icon">&#9881;</span> Enter Focus Mode';
          }
        } catch (err) {
          alert('Error connecting to backend: ' + err.message);
          btn.disabled = false;
          btn.innerHTML = '<span class="focus-mode-icon">&#9881;</span> Enter Focus Mode';
        }
      }
    </script>
    ` : ''}
  </header>

  <p class="summary">${escapeHtml(narrative)}</p>

  ${data.reasoning?.uncertainties?.length > 0 ? `
    <p class="uncertainties"><strong>Uncertainties:</strong> ${data.reasoning.uncertainties.map(u => escapeHtml(u)).join('; ')}</p>
  ` : ''}

  ${flowHtml}

  ${hasTrace ? `
  <section class="trace-section">
    <h2>🔍 Cognitive Debug Trace</h2>
    <p class="trace-intro">Debug mode enabled. Inspect the prompts and raw LLM responses for each pass.</p>

    ${renderTracePanel(trace.pass1, 'Pass 1: Classification & Triage', usage?.pass1?.input_tokens)}

    ${trace.pass2 && trace.pass2.length > 0 ? `
      <div class="pass2-traces">
        <h3>Pass 2: Deep Dive Analysis (${trace.pass2.length} tabs)</h3>
        ${trace.pass2.map((p2, i) => `
          <details class="trace-panel pass2-panel">
            <summary>Tab ${p2.tabIndex}: ${escapeHtml(p2.title?.slice(0, 50) || 'Unknown')}</summary>
            <div class="trace-grid">
              <div class="trace-prompt">
                <h4>Deep Dive Prompt</h4>
                <pre class="trace-code">${escapeHtml(p2.prompt || '(no prompt)')}</pre>
              </div>
              <div class="trace-response">
                <h4>Raw LLM Response</h4>
                <pre class="trace-code">${escapeHtml(p2.rawResponse || '(no response)')}</pre>
              </div>
            </div>
          </details>
        `).join('')}
      </div>
    ` : ''}

    ${trace.pass3 && trace.pass3.prompt ? `
      ${renderTracePanel(trace.pass3, 'Pass 3: Visualization Generation')}
    ` : ''}

    ${trace.pass4 && trace.pass4.prompt ? `
      ${renderTracePanel(trace.pass4, 'Pass 4: Thematic Analysis & Actions')}
    ` : ''}
  </section>
  ` : ''}

  <section>
    <h2>Grouped Tabs</h2>
    ${groupsHtml}
  </section>

  ${deepDiveHtml}

  ${renderThematicAnalysis(thematicAnalysis)}

  ${renderActionCards(thematicAnalysis?.suggestedActions)}

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
