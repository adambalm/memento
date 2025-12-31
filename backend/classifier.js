/**
 * LLM Tab Classifier
 * Primary: LLM via model dispatch layer
 * Fallback: Mock keyword-based classifier
 */

const { runModel, getEngineInfo } = require('./models');

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_ENGINE = 'ollama-local';

// ============================================================
// LLM CLASSIFIER
// ============================================================

/**
 * Build context injection block for the prompt
 * If user has active projects, tell the LLM about them
 */
function buildContextBlock(context) {
  if (!context || !context.activeProjects || context.activeProjects.length === 0) {
    return { contextBlock: '', customCategories: [] };
  }

  const projectLines = context.activeProjects.map(p => {
    const keywords = p.keywords && p.keywords.length > 0
      ? ` (keywords: ${p.keywords.join(', ')})`
      : '';
    const category = `${p.categoryType || 'Project'}: ${p.name}`;
    return `- ${p.name}${keywords} → classify as "${category}"`;
  }).join('\n');

  const customCategories = context.activeProjects.map(p =>
    `${p.categoryType || 'Project'}: ${p.name}`
  );

  const contextBlock = `
USER'S ACTIVE PROJECTS:
${projectLines}

If a tab clearly relates to one of these projects (matching keywords, topics, or research areas), classify it under the project-specific category instead of a generic one.

`;

  return { contextBlock, customCategories };
}

/**
 * Build the classification prompt for the LLM (Pass 1)
 * Uses minimal output format to force explicit enumeration of ALL tabs
 * Accepts optional context with active projects for smarter classification
 */
function buildPrompt(tabs, context = null) {
  const { contextBlock, customCategories } = buildContextBlock(context);

  const tabSummaries = tabs.map((tab, i) =>
    `${i + 1}. ${tab.title || 'Untitled'} | ${tab.url || 'unknown'}`
  ).join('\n');

  // Base categories + any custom project categories
  const baseCategories = 'Development, Research, Shopping, Social Media, Entertainment, News, Communication, Productivity, Education, Finance, Health, Travel, Other';
  const allCategories = customCategories.length > 0
    ? `${baseCategories}, ${customCategories.join(', ')}`
    : baseCategories;

  return `${contextBlock}Assign each of these ${tabs.length} browser tabs to exactly one category.

TABS:
${tabSummaries}

Categories: ${allCategories}

OUTPUT FORMAT - respond with ONLY this JSON (no markdown, no explanation):
{
  "assignments": {
    "1": {"category": "Category", "signals": ["signal1", "signal2"], "confidence": "high|medium|low"},
    "2": {"category": "Category", "signals": ["signal1"], "confidence": "medium"}
  },
  "narrative": "2-3 sentence summary of user's browsing focus",
  "sessionIntent": "1 sentence hypothesis about what user is trying to accomplish",
  "deepDive": [5, 12],
  "overallConfidence": "high|medium|low",
  "uncertainties": ["any tabs or patterns you're uncertain about"]
}

CRITICAL RULES:
1. The "assignments" object MUST have EXACTLY ${tabs.length} entries (keys "1" through "${tabs.length}")
2. Every value must be an object with "category", "signals", and "confidence" fields
3. "signals" = evidence that led to this classification (URL patterns, title keywords, known sites)
4. "confidence" = how certain: high (clear signals), medium (some ambiguity), low (guessing)
5. "sessionIntent" = your hypothesis about what the user is trying to accomplish overall
6. "uncertainties" = be explicit about what you're unsure of - this enables human correction
7. "deepDive" = array of tab numbers for technical docs needing deeper analysis. Empty [] if none.
8. DO NOT skip any tabs. List ALL ${tabs.length} assignments with reasoning.

Your reasoning must be AUDITABLE. A human reviewing your output should understand exactly why each tab was classified the way it was.

VERIFY before responding: Count your assignments. You must have exactly ${tabs.length} entries.`;
}

/**
 * Strip ANSI escape codes from text to prevent terminal formatting issues
 */
function stripAnsiCodes(text) {
  if (!text) return text;
  // Remove ANSI escape sequences (CSI sequences and other control sequences)
  // Matches: \x1b[...m, \u001b[...m, ESC[...m, and other control sequences
  return text
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')  // CSI sequences
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')    // CSI sequences (hex)
    .replace(/\u001b\[[0-9;]*m/g, '')         // SGR (Select Graphic Rendition) sequences
    .replace(/\x1b\[[0-9;]*m/g, '');          // SGR sequences (hex)
}

/**
 * Parse LLM response (simplified format) into full structured format
 * Converts {assignments: {"1": "Cat", ...}} → {groups: {"Cat": [{tab}, ...]}}
 */
function parseLLMResponse(responseText, tabs, engineInfo) {
  // Strip ANSI codes first to prevent terminal formatting issues
  let cleanedText = stripAnsiCodes(responseText);

  // Try to extract JSON from response
  let jsonStr = cleanedText.trim();

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Find JSON object boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    jsonStr = jsonStr.slice(startIdx, endIdx + 1);
  }

  const parsed = JSON.parse(jsonStr);

  // Handle auditable format: {assignments: {"1": {category, signals, confidence}, ...}}
  const rawAssignments = parsed.assignments || {};
  const narrative = parsed.narrative || 'Session analyzed.';
  const sessionIntent = parsed.sessionIntent || null;
  const overallConfidence = parsed.overallConfidence || 'unknown';
  const uncertainties = parsed.uncertainties || [];
  const deepDiveIndices = parsed.deepDive || [];

  // Log assignment count for debugging
  const assignmentCount = Object.keys(rawAssignments).length;
  console.log(`[Parser] Got ${assignmentCount}/${tabs.length} assignments from LLM`);

  // Build groups and reasoning from assignments
  const groups = {};
  const reasoning = {};  // Store per-tab reasoning for auditability

  for (const [indexStr, assignment] of Object.entries(rawAssignments)) {
    const tabIndex = parseInt(indexStr, 10);
    if (tabIndex >= 1 && tabIndex <= tabs.length) {
      const tab = tabs[tabIndex - 1];

      // Handle both old format (string) and new format (object)
      let category, signals, confidence;
      if (typeof assignment === 'string') {
        category = assignment;
        signals = [];
        confidence = 'unknown';
      } else {
        category = assignment.category || 'Other';
        signals = assignment.signals || [];
        confidence = assignment.confidence || 'unknown';
      }

      if (!groups[category]) groups[category] = [];
      groups[category].push({
        tabIndex,
        title: tab.title || 'Untitled',
        url: tab.url || ''
      });

      // Store reasoning for this tab
      reasoning[tabIndex] = {
        category,
        signals,
        confidence,
        title: tab.title || 'Untitled',
        url: tab.url || ''
      };
    }
  }

  // Check for missing tabs and assign to "Unclassified"
  const classifiedIndices = new Set(Object.keys(rawAssignments).map(k => parseInt(k, 10)));
  const missingTabs = [];
  for (let i = 1; i <= tabs.length; i++) {
    if (!classifiedIndices.has(i)) {
      missingTabs.push(i);
      const tab = tabs[i - 1];
      if (!groups['Unclassified']) groups['Unclassified'] = [];
      groups['Unclassified'].push({
        tabIndex: i,
        title: tab.title || 'Untitled',
        url: tab.url || ''
      });
    }
  }
  if (missingTabs.length > 0) {
    console.warn(`[Parser] ${missingTabs.length} tabs not classified by LLM: ${missingTabs.join(', ')}`);
  }

  // Generate tasks from groups
  const actionMap = {
    'Development': 'Continue coding or review documentation',
    'Research': 'Compile research notes or findings',
    'Shopping': 'Compare products or complete purchase',
    'Communication': 'Respond to messages or schedule meetings',
    'Productivity': 'Update documents or review tasks',
    'Education': 'Review course materials or complete assignments',
    'Unclassified': 'Review and organize these tabs'
  };

  const tasks = Object.entries(groups).map(([category, categoryTabs]) => ({
    category,
    description: `${category} activity with ${categoryTabs.length} tab${categoryTabs.length > 1 ? 's' : ''}`,
    suggestedAction: actionMap[category] || 'Review and organize',
    tabs: categoryTabs.map(t => ({ title: t.title, url: t.url }))
  }));

  // Normalize deepDive (now just array of integers)
  const normalizedDeepDive = (Array.isArray(deepDiveIndices) ? deepDiveIndices : [])
    .filter(idx => typeof idx === 'number' && idx >= 1 && idx <= tabs.length)
    .map(idx => ({
      tabIndex: idx,
      reason: 'Flagged for deeper analysis',
      extractHints: ['summary', 'key points', 'entities']
    }));

  return {
    timestamp: new Date().toISOString(),
    totalTabs: tabs.length,
    classifiedCount: assignmentCount,
    narrative,
    sessionIntent,  // Hypothesis about user's goal
    groups,
    tasks,
    deepDive: normalizedDeepDive,
    // AUDITABLE REASONING - human can review why each decision was made
    reasoning: {
      perTab: reasoning,  // Per-tab: category, signals, confidence
      overallConfidence,
      uncertainties,
      sessionIntent
    },
    summary: {
      categories: Object.keys(groups),
      tabsByCategory: Object.fromEntries(
        Object.entries(groups).map(([k, v]) => [k, v.length])
      )
    },
    source: 'llm',
    meta: {
      schemaVersion: SCHEMA_VERSION,
      engine: engineInfo.engine,
      model: engineInfo.model,
      endpoint: engineInfo.endpoint,
      passes: 1
    }
  };
}

/**
 * Build the deep dive prompt for Pass 2
 * Analyzes a specific tab in detail based on hints from Pass 1
 */
function buildDeepDivePrompt(tab, hints, fullContent) {
  const hintsStr = hints.length > 0 ? hints.join(', ') : 'general summary and key points';

  // Truncate content to avoid overwhelming the model
  const truncatedContent = fullContent.slice(0, 4000);

  return `Analyze this tab. Respond with ONLY a JSON object - no explanation, no apology, no markdown fences.

URL: ${tab.url || 'unknown'}
Title: ${tab.title || 'Untitled'}
Focus: ${hintsStr}

Content:
${truncatedContent}

RESPOND WITH EXACTLY THIS FORMAT:
{"summary":"2-3 sentences","keyPoints":["point1","point2"],"entities":{"authors":[],"organizations":[],"technologies":[]},"relevance":"why it matters"}`
}

/**
 * Run deep dive analysis on a single tab (Pass 2)
 */
async function runDeepDive(tab, hints, engine) {
  // Use full content for deep dive (not truncated)
  const fullContent = tab.content || '';
  const prompt = buildDeepDivePrompt(tab, hints, fullContent);

  try {
    const response = await runModel(engine, prompt);
    const responseText = response.text;

    // Parse the deep dive response
    let cleanedText = stripAnsiCodes(responseText);
    let jsonStr = cleanedText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find JSON object boundaries
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
    }

    const parsed = JSON.parse(jsonStr);

    return {
      url: tab.url,
      title: tab.title,
      analysis: {
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        entities: parsed.entities || {},
        relevance: parsed.relevance || ''
      }
    };
  } catch (error) {
    console.warn(`Deep dive failed for ${tab.url}: ${error.message}`);
    return {
      url: tab.url,
      title: tab.title,
      analysis: null,
      error: error.message
    };
  }
}

/**
 * Build the visualization prompt for Pass 3
 * Generates a Mermaid diagram of the browsing session
 */
function buildVisualizationPrompt(result, deepDiveResults, failures) {
  // Build category summary
  const categorySummary = Object.entries(result.groups)
    .map(([cat, tabs]) => `- ${cat}: ${tabs.length} tabs (${tabs.map(t => t.tabIndex).join(', ')})`)
    .join('\n');

  // Build deep dive summary
  const deepDiveSummary = deepDiveResults && deepDiveResults.length > 0
    ? deepDiveResults.map(d => {
        if (d.analysis) {
          return `- Tab ${d.title}: ${d.analysis.summary || 'analyzed'}`;
        } else {
          return `- Tab ${d.title}: FAILED - ${d.error}`;
        }
      }).join('\n')
    : 'None';

  // Build failures summary
  const failureSummary = failures && failures.length > 0
    ? failures.map(f => `- Tab "${f.title}": ${f.error}`).join('\n')
    : 'None';

  return `Generate a Mermaid diagram visualizing this browsing session.

SESSION DATA:
Narrative: ${result.narrative}

Categories and tabs:
${categorySummary}

Deep dive results:
${deepDiveSummary}

Failures:
${failureSummary}

OUTPUT FORMAT - respond with ONLY valid Mermaid code (no markdown fences, no explanation):

Requirements:
1. Use "graph TB" (top to bottom)
2. Create a subgraph for each category containing its tab nodes
3. Use short node IDs like T1, T2 (tab index)
4. Label nodes with truncated titles (max 30 chars)
5. If there are deep dive insights, add annotation nodes connected with dotted lines
6. If there are failures, style those nodes with fill:#f66
7. Keep it readable - don't overcrowd

Example structure:
graph TB
    subgraph Development
        T3[mem0 GitHub]
        T7[MCP Toolbox]
    end
    subgraph Research
        T4[arXiv paper]
    end
    T4 -.->|"key insight"| I4[35% faster training]
    style T4 fill:#f66`;
}

/**
 * Run visualization generation (Pass 3)
 */
async function generateVisualization(result, deepDiveResults, engine) {
  // Identify failures from deep dive results
  const failures = (deepDiveResults || []).filter(d => d.error);

  const prompt = buildVisualizationPrompt(result, deepDiveResults, failures);

  try {
    const pass1Response = await runModel(engine, prompt);
  const responseText = pass1Response.text;
  const pass1Usage = pass1Response.usage;

    // Clean the response - strip any markdown fences
    let cleanedText = stripAnsiCodes(responseText).trim();

    // Remove markdown code fences if present
    const mermaidMatch = cleanedText.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
    if (mermaidMatch) {
      cleanedText = mermaidMatch[1].trim();
    }

    // Basic validation - should start with graph or flowchart
    if (!cleanedText.match(/^(graph|flowchart)\s+(TB|TD|BT|LR|RL)/i)) {
      throw new Error('Invalid Mermaid: does not start with graph/flowchart directive');
    }

    return {
      success: true,
      mermaid: cleanedText,
      failuresVisualized: failures.length
    };
  } catch (error) {
    console.warn(`Visualization failed: ${error.message}`);
    return {
      success: false,
      mermaid: null,
      error: error.message
    };
  }
}

/**
 * Classify tabs using LLM (three-pass architecture)
 * Pass 1: Classify all tabs, identify candidates for deep dive
 * Pass 2: Run detailed analysis on flagged tabs (if any)
 * Pass 3: Generate session visualization
 *
 * @param {Array} tabs - Array of tab objects with url, title, content
 * @param {string} engine - LLM engine to use (default: ollama-local)
 * @param {Object|null} context - Optional context with activeProjects for smarter classification
 */
async function classifyWithLLM(tabs, engine = DEFAULT_ENGINE, context = null) {
  const engineInfo = getEngineInfo(engine);

  // Log context usage
  if (context && context.activeProjects) {
    console.log(`[Context] Using ${context.activeProjects.length} active project(s) for classification`);
  }

  // === PASS 1: Classification + Triage ===
  console.log(`[Pass 1] Calling LLM via ${engineInfo.engine} (${engineInfo.model})...`);
  const pass1Start = Date.now();
  const prompt = buildPrompt(tabs, context);
  const pass1Response = await runModel(engine, prompt);
  const pass1Duration = Date.now() - pass1Start;
  const responseText = pass1Response.text;
  const pass1Usage = pass1Response.usage;
  console.log('[Pass 1] Response received, parsing...');

  const result = parseLLMResponse(responseText, tabs, engineInfo);

  // === PASS 2: Deep Dive (Conditional) ===
  const pass2Start = Date.now();
  if (result.deepDive && result.deepDive.length > 0) {
    console.log(`[Pass 2] ${result.deepDive.length} tab(s) flagged for deep dive`);

    const deepDiveResults = [];
    for (const dive of result.deepDive) {
      // tabIndex is 1-based from the prompt
      const tabIdx = dive.tabIndex - 1;
      if (tabIdx >= 0 && tabIdx < tabs.length) {
        const tab = tabs[tabIdx];
        console.log(`[Pass 2] Analyzing: ${tab.title || tab.url}`);
        const diveResult = await runDeepDive(tab, dive.extractHints, engine);
        deepDiveResults.push(diveResult);
      }
    }

    // Fold deep dive results into the main result
    result.deepDiveResults = deepDiveResults;

    // Enhance narrative with deep dive insights
    const insights = deepDiveResults
      .filter(d => d.analysis && d.analysis.summary)
      .map(d => d.analysis.summary)
      .join(' ');

    if (insights) {
      result.narrative += ` [Deep analysis: ${insights}]`;
    }

    // Update meta to reflect two passes
    result.meta.passes = 2;
    result.meta.timing = result.meta.timing || {};
    result.meta.timing.pass2 = Date.now() - pass2Start;
    console.log(`[Pass 2] Complete. ${deepDiveResults.length} deep dive(s) processed in ${result.meta.timing.pass2}ms`);
  } else {
    console.log('[Pass 1] No tabs flagged for deep dive');
    result.deepDiveResults = [];
    result.meta.timing = { pass1: pass1Duration, pass2: 0 };
  }

  // === PASS 3: Visualization ===
  console.log('[Pass 3] Generating session visualization...');
  const pass3Start = Date.now();
  const vizResult = await generateVisualization(result, result.deepDiveResults, engine);
  const pass3Duration = Date.now() - pass3Start;

  if (vizResult.success) {
    result.visualization = {
      mermaid: vizResult.mermaid,
      failuresVisualized: vizResult.failuresVisualized
    };
    result.meta.passes = 3;
      result.meta.timing = result.meta.timing || { pass1: pass1Duration };
      result.meta.timing.pass1 = pass1Duration;
      result.meta.timing.pass3 = pass3Duration;
      result.meta.timing.total = pass1Duration + (result.meta.timing.pass2 || 0) + pass3Duration;
      console.log(`[Timing] Pass1: ${pass1Duration}ms, Pass2: ${result.meta.timing.pass2 || 0}ms, Pass3: ${pass3Duration}ms, Total: ${result.meta.timing.total}ms`);
      if (pass1Usage) {
        result.meta.usage = {
          pass1: pass1Usage,
          totalInputTokens: pass1Usage.input_tokens || 0,
          totalOutputTokens: pass1Usage.output_tokens || 0
        };
        // Claude 3.5 Haiku pricing: $1/1M input, $5/1M output
        const inputCost = (pass1Usage.input_tokens || 0) * 0.000001;
        const outputCost = (pass1Usage.output_tokens || 0) * 0.000005;
        result.meta.cost = {
          inputCost: inputCost.toFixed(6),
          outputCost: outputCost.toFixed(6),
          totalCost: (inputCost + outputCost).toFixed(6),
          currency: 'USD'
        };
      }
    console.log('[Pass 3] Visualization generated successfully');
  } else {
    result.visualization = {
      mermaid: null,
      error: vizResult.error
    };
    console.warn(`[Pass 3] Visualization failed: ${vizResult.error}`);
  }

  return result;
}

// ============================================================
// MOCK FALLBACK CLASSIFIER
// ============================================================

const CATEGORY_PATTERNS = {
  'Development': {
    urlPatterns: ['github.com', 'stackoverflow.com', 'developer.', 'docs.', 'api.', 'npm', 'gitlab', 'bitbucket'],
    keywords: ['code', 'function', 'class', 'programming', 'developer', 'api', 'documentation', 'repository']
  },
  'Research': {
    urlPatterns: ['wikipedia.org', 'scholar.google', 'arxiv.org', 'medium.com', 'research'],
    keywords: ['research', 'study', 'paper', 'article', 'analysis', 'report', 'findings']
  },
  'Shopping': {
    urlPatterns: ['amazon.', 'ebay.', 'shop.', 'store.', 'cart', 'checkout', 'buy'],
    keywords: ['price', 'cart', 'shipping', 'order', 'buy', 'product', 'sale', 'discount']
  },
  'Social Media': {
    urlPatterns: ['twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'reddit.com'],
    keywords: ['post', 'share', 'follow', 'like', 'comment', 'feed', 'profile']
  },
  'Entertainment': {
    urlPatterns: ['youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com', 'hulu.com'],
    keywords: ['video', 'watch', 'stream', 'music', 'play', 'episode', 'movie']
  },
  'News': {
    urlPatterns: ['news.', 'cnn.com', 'bbc.', 'nytimes.com', 'reuters.com', 'theguardian.com'],
    keywords: ['breaking', 'headline', 'report', 'journalist', 'politics', 'world']
  },
  'Email & Communication': {
    urlPatterns: ['mail.', 'gmail.com', 'outlook.', 'slack.com', 'discord.com', 'zoom.'],
    keywords: ['inbox', 'message', 'send', 'reply', 'meeting', 'chat']
  },
  'Productivity': {
    urlPatterns: ['notion.', 'trello.', 'asana.', 'docs.google', 'sheets.google', 'drive.google'],
    keywords: ['task', 'project', 'document', 'spreadsheet', 'notes', 'calendar']
  },
  'Education': {
    urlPatterns: ['.edu', 'school', 'academy', 'university', 'college', 'coursera', 'udemy'],
    keywords: ['student', 'teacher', 'class', 'course', 'learn', 'education', 'grade']
  }
};

function detectCategory(tab) {
  const url = (tab.url || '').toLowerCase();
  const title = (tab.title || '').toLowerCase();
  const content = (tab.content || '').toLowerCase();

  let bestCategory = 'Other';
  let highestScore = 0;

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns.urlPatterns) {
      if (url.includes(pattern)) score += 3;
    }
    for (const keyword of patterns.keywords) {
      if (title.includes(keyword)) score += 2;
      if (content.includes(keyword)) score += 1;
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function generateNarrative(groups) {
  const narrativeParts = [];
  const totalTabs = Object.values(groups).reduce((sum, tabs) => sum + tabs.length, 0);

  narrativeParts.push(`You have ${totalTabs} open tabs across ${Object.keys(groups).length} categories.`);

  for (const [category, tabs] of Object.entries(groups)) {
    if (tabs.length === 1) {
      narrativeParts.push(`In ${category}, you have "${tabs[0].title}".`);
    } else if (tabs.length <= 3) {
      const titles = tabs.map(t => `"${t.title}"`).join(', ');
      narrativeParts.push(`In ${category}, you have ${tabs.length} tabs: ${titles}.`);
    } else {
      const firstTwo = tabs.slice(0, 2).map(t => `"${t.title}"`).join(', ');
      narrativeParts.push(`In ${category}, you have ${tabs.length} tabs including ${firstTwo}, and ${tabs.length - 2} more.`);
    }
  }

  const largestGroup = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0];
  if (largestGroup && largestGroup[1].length > 2) {
    narrativeParts.push(`Your primary focus appears to be ${largestGroup[0]} with ${largestGroup[1].length} related tabs.`);
  }

  return narrativeParts.join(' ');
}

function inferTasks(groups) {
  const tasks = [];
  const actionMap = {
    'Development': 'Continue coding or review documentation',
    'Research': 'Compile research notes or findings',
    'Shopping': 'Compare products or complete purchase',
    'Email & Communication': 'Respond to messages or schedule meetings',
    'Productivity': 'Update documents or review tasks',
    'Education': 'Review course materials or complete assignments'
  };

  for (const [category, tabs] of Object.entries(groups)) {
    if (tabs.length > 0) {
      tasks.push({
        category,
        description: `${category} activity with ${tabs.length} tab${tabs.length > 1 ? 's' : ''}`,
        tabs: tabs.map(t => ({ title: t.title, url: t.url })),
        suggestedAction: actionMap[category] || 'Review and organize'
      });
    }
  }

  return tasks;
}

async function classifyWithMock(tabs) {
  const groups = {};

  for (const tab of tabs) {
    const category = detectCategory(tab);
    if (!groups[category]) groups[category] = [];
    groups[category].push({
      title: tab.title || 'Untitled',
      url: tab.url || '',
      contentPreview: (tab.content || '').slice(0, 200)
    });
  }

  return {
    timestamp: new Date().toISOString(),
    totalTabs: tabs.length,
    narrative: generateNarrative(groups),
    groups,
    tasks: inferTasks(groups),
    summary: {
      categories: Object.keys(groups),
      tabsByCategory: Object.fromEntries(
        Object.entries(groups).map(([k, v]) => [k, v.length])
      )
    },
    source: 'mock',
    meta: {
      schemaVersion: SCHEMA_VERSION,
      engine: 'mock',
      model: null,
      endpoint: null
    }
  };
}

// ============================================================
// MAIN EXPORT
// ============================================================

/**
 * Main classification function
 * Tries LLM first, falls back to mock classifier
 *
 * @param {Array} tabs - Array of tab objects with url, title, content
 * @param {string} engine - LLM engine to use (default: ollama-local)
 * @param {Object|null} context - Optional context with activeProjects for smarter classification
 */
async function classifyTabs(tabs, engine = DEFAULT_ENGINE, context = null) {
  try {
    const result = await classifyWithLLM(tabs, engine, context);
    console.log(`Classification completed via ${engine}`);
    return result;
  } catch (error) {
    console.warn(`LLM failed: ${error.message}. Falling back to mock classifier.`);
    const result = await classifyWithMock(tabs);
    console.log('Classification completed via mock fallback');
    return result;
  }
}

module.exports = { classifyTabs };
