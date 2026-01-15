/**
 * Correction Analyzer Module
 *
 * Extracts learning signals from user disposition corrections to improve
 * future classification. Analyzes regroup actions to identify domains
 * that need better content extraction.
 *
 * Part of the learnable domain extractor system.
 */

const fs = require('fs').promises;
const path = require('path');
const { getAllSessions } = require('./aggregator');

const EXTRACTORS_PATH = path.join(__dirname, 'extractors.json');

// Default extractors for known problematic domains
const DEFAULT_EXTRACTORS = {
  domains: {
    'arxiv.org': {
      selectors: ['meta[name="citation_abstract"]', 'meta[name="citation_title"]', 'meta[name="citation_author"]'],
      expectedCategory: 'Academic',
      notes: 'Academic preprints - use citation metadata'
    },
    'scholar.google.com': {
      selectors: ['.gs_rs', '.gs_rt'],
      expectedCategory: 'Academic',
      notes: 'Google Scholar search results'
    },
    'github.com': {
      selectors: ['meta[name="description"]', '.f4.my-3', '.repository-content'],
      expectedCategory: null, // Can be many things
      notes: 'Repositories - check for README content'
    },
    'medium.com': {
      selectors: ['meta[name="description"]', 'article h1', 'article section'],
      expectedCategory: null,
      notes: 'Articles - paywall may limit extraction'
    }
  },
  version: '1.0.0',
  lastUpdated: null
};

/**
 * Load extractors config from disk, or return defaults
 */
async function loadExtractors() {
  try {
    const content = await fs.readFile(EXTRACTORS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // Return defaults if file doesn't exist
    return { ...DEFAULT_EXTRACTORS };
  }
}

/**
 * Save extractors config to disk
 */
async function saveExtractors(extractors) {
  extractors.lastUpdated = new Date().toISOString();
  await fs.writeFile(EXTRACTORS_PATH, JSON.stringify(extractors, null, 2));
  return extractors;
}

/**
 * Extract all correction events (regroup dispositions) from sessions
 * @param {Array<Object>} sessions - Optional sessions array (loads all if not provided)
 * @returns {Array<Object>} Array of correction events with context
 */
async function getCorrections(sessions = null) {
  if (!sessions) {
    sessions = await getAllSessions();
  }

  const corrections = [];

  for (const session of sessions) {
    if (!session.dispositions || !Array.isArray(session.dispositions)) continue;

    // Get regroup actions (AI said X, user moved to Y)
    const regroups = session.dispositions.filter(d => d.action === 'regroup');

    for (const regroup of regroups) {
      // Find the tab this disposition refers to
      const tab = findTabByItemId(session, regroup.itemId);

      if (!tab) continue;

      let domain = null;
      try {
        domain = new URL(tab.url).hostname;
      } catch (err) {}

      corrections.push({
        sessionId: session._id,
        sessionTimestamp: session.timestamp,
        url: tab.url,
        domain,
        title: tab.title,
        from: regroup.from,      // AI's classification
        to: regroup.to,          // User's correction
        at: regroup.at,          // When correction happened
        itemId: regroup.itemId
      });
    }
  }

  return corrections;
}

/**
 * Find a tab in session by itemId
 * itemId format varies: could be index, url, or title
 */
function findTabByItemId(session, itemId) {
  if (!session.groups) return null;

  // Handle both object and array group formats
  const groups = Array.isArray(session.groups)
    ? session.groups
    : Object.entries(session.groups);

  let tabIndex = 0;
  for (const entry of groups) {
    const [category, items] = Array.isArray(entry)
      ? entry
      : [entry.name, entry.items];

    if (!Array.isArray(items)) continue;

    for (const tab of items) {
      // Match by various identifiers
      if (tabIndex === itemId ||
          tab.url === itemId ||
          tab.title === itemId ||
          tab.tabIndex === itemId) {
        return { ...tab, originalCategory: category };
      }
      tabIndex++;
    }
  }

  return null;
}

/**
 * Aggregate corrections by domain
 * @returns {Map<string, Object>} Domain -> correction stats
 */
async function aggregateByDomain() {
  const corrections = await getCorrections();
  const domainStats = new Map();

  for (const correction of corrections) {
    if (!correction.domain) continue;

    if (!domainStats.has(correction.domain)) {
      domainStats.set(correction.domain, {
        domain: correction.domain,
        totalCorrections: 0,
        corrections: [],
        fromCategories: {},
        toCategories: {}
      });
    }

    const stats = domainStats.get(correction.domain);
    stats.totalCorrections++;
    stats.corrections.push(correction);

    // Track category transitions
    stats.fromCategories[correction.from] = (stats.fromCategories[correction.from] || 0) + 1;
    stats.toCategories[correction.to] = (stats.toCategories[correction.to] || 0) + 1;
  }

  return domainStats;
}

/**
 * Calculate correction rate for each domain
 * Requires knowing total tabs per domain (not just corrections)
 */
async function getCorrectionRates() {
  const { groupByDomain } = require('./aggregator');

  const domainTabs = await groupByDomain();
  const corrections = await getCorrections();

  const rates = [];

  // Group corrections by domain
  const correctionsByDomain = new Map();
  for (const c of corrections) {
    if (!c.domain) continue;
    if (!correctionsByDomain.has(c.domain)) {
      correctionsByDomain.set(c.domain, []);
    }
    correctionsByDomain.get(c.domain).push(c);
  }

  // Calculate rate for each domain
  for (const [domain, tabs] of domainTabs) {
    const domainCorrections = correctionsByDomain.get(domain) || [];
    const totalTabs = tabs.length;
    const correctionCount = domainCorrections.length;
    const correctionRate = totalTabs > 0 ? correctionCount / totalTabs : 0;

    // Only include domains with at least 2 tabs
    if (totalTabs >= 2) {
      rates.push({
        domain,
        totalTabs,
        correctionCount,
        correctionRate,
        corrections: domainCorrections,
        // What categories does AI typically assign?
        aiCategories: [...new Set(domainCorrections.map(c => c.from))],
        // What do users correct to?
        userCategories: [...new Set(domainCorrections.map(c => c.to))]
      });
    }
  }

  // Sort by correction rate descending
  return rates.sort((a, b) => b.correctionRate - a.correctionRate);
}

/**
 * Suggest domains that need better extractors based on correction patterns
 * @param {number} minCorrections - Minimum corrections to consider (default: 2)
 * @param {number} minRate - Minimum correction rate to flag (default: 0.3 = 30%)
 */
async function suggestExtractors(minCorrections = 2, minRate = 0.3) {
  const rates = await getCorrectionRates();
  const extractors = await loadExtractors();

  const suggestions = [];

  for (const rate of rates) {
    // Skip if already has custom extractor
    if (extractors.domains[rate.domain]) continue;

    // Flag if high correction rate
    if (rate.correctionCount >= minCorrections && rate.correctionRate >= minRate) {
      // Determine most common user correction
      const categoryVotes = {};
      for (const c of rate.corrections) {
        categoryVotes[c.to] = (categoryVotes[c.to] || 0) + 1;
      }
      const topCategory = Object.entries(categoryVotes)
        .sort((a, b) => b[1] - a[1])[0];

      suggestions.push({
        domain: rate.domain,
        priority: rate.correctionRate * rate.correctionCount, // Higher = more urgent
        stats: {
          totalTabs: rate.totalTabs,
          corrections: rate.correctionCount,
          rate: Math.round(rate.correctionRate * 100) + '%'
        },
        pattern: {
          aiTypicallyClassifiesAs: rate.aiCategories,
          usersCorrectedTo: rate.userCategories,
          suggestedCategory: topCategory ? topCategory[0] : null
        },
        recommendation: generateRecommendation(rate)
      });
    }
  }

  // Sort by priority descending
  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate a human-readable recommendation for a problematic domain
 */
function generateRecommendation(rate) {
  const { domain, correctionCount, aiCategories, userCategories } = rate;

  if (userCategories.length === 1) {
    // Consistent correction pattern
    return `Domain "${domain}" is consistently recategorized from ${aiCategories.join('/')} to ${userCategories[0]}. Consider adding a domain rule or better content extraction.`;
  } else {
    // Multiple corrections
    return `Domain "${domain}" has ${correctionCount} corrections across multiple categories (${userCategories.join(', ')}). May need context-aware classification or user-defined rules.`;
  }
}

/**
 * Add a domain to the extractors config
 * @param {string} domain - Domain name
 * @param {Object} config - Extractor configuration
 */
async function addExtractor(domain, config) {
  const extractors = await loadExtractors();

  extractors.domains[domain] = {
    selectors: config.selectors || [],
    expectedCategory: config.expectedCategory || null,
    notes: config.notes || `Added from correction analysis`,
    addedAt: new Date().toISOString()
  };

  return saveExtractors(extractors);
}

/**
 * Get extractors for a specific domain (if any)
 */
async function getExtractorForDomain(domain) {
  const extractors = await loadExtractors();
  return extractors.domains[domain] || null;
}

/**
 * Get summary statistics about corrections
 */
async function getCorrectionStats() {
  const corrections = await getCorrections();
  const extractors = await loadExtractors();
  const suggestions = await suggestExtractors();

  // Aggregate by from->to transitions
  const transitions = {};
  for (const c of corrections) {
    const key = `${c.from} → ${c.to}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }

  // Sort transitions by frequency
  const sortedTransitions = Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    totalCorrections: corrections.length,
    uniqueDomainsCorrected: new Set(corrections.map(c => c.domain).filter(Boolean)).size,
    configuredExtractors: Object.keys(extractors.domains).length,
    suggestedExtractors: suggestions.length,
    topTransitions: sortedTransitions.map(([transition, count]) => ({
      transition,
      count
    })),
    topSuggestions: suggestions.slice(0, 5)
  };
}

module.exports = {
  loadExtractors,
  saveExtractors,
  getCorrections,
  aggregateByDomain,
  getCorrectionRates,
  suggestExtractors,
  addExtractor,
  getExtractorForDomain,
  getCorrectionStats,
  DEFAULT_EXTRACTORS
};
