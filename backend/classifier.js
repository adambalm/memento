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
 * Build the classification prompt for the LLM
 */
function buildPrompt(tabs) {
  const tabSummaries = tabs.map((tab, i) =>
    `${i + 1}. URL: ${tab.url || 'unknown'}\n   Title: ${tab.title || 'Untitled'}\n   Content: ${(tab.content || '').slice(0, 500)}`
  ).join('\n\n');

  return `Analyze these browser tabs and classify them into categories.

TABS:
${tabSummaries}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "groups": {
    "CategoryName": [
      {"title": "Tab Title", "url": "https://...", "contentPreview": "First 200 chars..."}
    ]
  },
  "narrative": "A 2-3 sentence summary of what the user appears to be working on.",
  "tasks": [
    {
      "category": "CategoryName",
      "description": "Brief description",
      "suggestedAction": "What the user might want to do next"
    }
  ]
}

Use categories like: Development, Research, Shopping, Social Media, Entertainment, News, Email & Communication, Productivity, Education, Finance, Health, Travel, or Other.
Group related tabs together. Be concise.`;
}

/**
 * Parse LLM response into structured format
 */
function parseLLMResponse(responseText, tabs, engineInfo) {
  // Try to extract JSON from response
  let jsonStr = responseText.trim();

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

  // Validate and normalize the response
  const groups = parsed.groups || {};
  const narrative = parsed.narrative || 'Session analyzed.';
  const tasks = parsed.tasks || [];

  // Ensure tasks have required fields
  const normalizedTasks = tasks.map(t => ({
    category: t.category || 'Other',
    description: t.description || `${t.category} activity`,
    suggestedAction: t.suggestedAction || 'Review and organize',
    tabs: (groups[t.category] || []).map(tab => ({ title: tab.title, url: tab.url }))
  }));

  return {
    timestamp: new Date().toISOString(),
    totalTabs: tabs.length,
    narrative,
    groups,
    tasks: normalizedTasks,
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
      endpoint: engineInfo.endpoint
    }
  };
}

/**
 * Classify tabs using LLM
 */
async function classifyWithLLM(tabs) {
  const prompt = buildPrompt(tabs);
  const engineInfo = getEngineInfo(DEFAULT_ENGINE);
  console.log(`Calling LLM via ${engineInfo.engine} (${engineInfo.model})...`);

  const responseText = await runModel(DEFAULT_ENGINE, prompt);
  console.log('LLM response received, parsing...');

  return parseLLMResponse(responseText, tabs, engineInfo);
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
 */
async function classifyTabs(tabs) {
  try {
    const result = await classifyWithLLM(tabs);
    console.log('Classification completed via LLM');
    return result;
  } catch (error) {
    console.warn(`LLM failed: ${error.message}. Falling back to mock classifier.`);
    const result = await classifyWithMock(tabs);
    console.log('Classification completed via mock fallback');
    return result;
  }
}

module.exports = { classifyTabs };
