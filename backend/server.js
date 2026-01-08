require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { classifyTabs } = require('./classifier');
const { renderResultsPage } = require('./renderer');
const { saveSession, readSession } = require('./memory');
const { loadContext } = require('./contextLoader');
const { processVisualExtractionTabs } = require('./pdfExtractor');
const { renderLaunchpadPage } = require('./launchpad');
const { appendDisposition, getSessionWithDispositions } = require('./dispositions');
const { getLockStatus, clearLock, acquireLock } = require('./lockManager');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// POST /classifyBrowserContext - Main endpoint for tab classification
app.post('/classifyBrowserContext', async (req, res) => {
  try {
    const { tabs, engine, context: requestContext, debugMode } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).json({ error: 'Invalid request: tabs array required' });
    }

    // Check for tabs needing visual extraction (PDFs, etc.)
    const visualExtractionCount = tabs.filter(t => t.needsVisualExtraction).length;
    console.log(`Received ${tabs.length} tabs for classification via ${engine || 'default'}${debugMode ? ' (debug mode)' : ''}${visualExtractionCount > 0 ? ` (${visualExtractionCount} PDFs to extract)` : ''}`);

    // Process PDFs and other visual content first
    let processedTabs = tabs;
    if (visualExtractionCount > 0) {
      console.log(`[Pass 0] Extracting content from ${visualExtractionCount} PDF(s)...`);
      processedTabs = await processVisualExtractionTabs(tabs);
    }

    // Load context: request context > file context > none
    const context = requestContext || loadContext();

    // Call LLM classifier with specified engine, context, and debugMode
    const classification = await classifyTabs(processedTabs, engine, context, debugMode);

    // Save to memory and get session ID
    const sessionId = await saveSession(classification);

    // Return JSON response with session ID
    res.json({
      ...classification,
      meta: {
        ...classification.meta,
        sessionId
      }
    });
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: 'Classification failed' });
  }
});

// GET /results - Render results as HTML page
app.get('/results', (req, res) => {
  const data = req.query.data ? JSON.parse(decodeURIComponent(req.query.data)) : null;
  if (!data) {
    return res.status(400).send('No data provided');
  }
  res.send(renderResultsPage(data));
});

// POST /classifyAndRender - Classify and return HTML directly
app.post('/classifyAndRender', async (req, res) => {
  try {
    const { tabs, engine, context: requestContext, debugMode } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).send('<html><body><h1>Error: Invalid request</h1></body></html>');
    }

    // Check for tabs needing visual extraction (PDFs, etc.)
    const visualExtractionCount = tabs.filter(t => t.needsVisualExtraction).length;
    console.log(`Received ${tabs.length} tabs for classification via ${engine || 'default'}${debugMode ? ' (debug mode)' : ''}${visualExtractionCount > 0 ? ` (${visualExtractionCount} PDFs to extract)` : ''}`);

    // Process PDFs and other visual content first
    let processedTabs = tabs;
    if (visualExtractionCount > 0) {
      console.log(`[Pass 0] Extracting content from ${visualExtractionCount} PDF(s)...`);
      processedTabs = await processVisualExtractionTabs(tabs);
    }

    // Load context: request context > file context > none
    const context = requestContext || loadContext();

    const classification = await classifyTabs(processedTabs, engine, context, debugMode);
    const sessionId = await saveSession(classification);
    res.send(renderResultsPage(classification, sessionId));
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).send('<html><body><h1>Error: Classification failed</h1></body></html>');
  }
});

// ═══════════════════════════════════════════════════════════════
// LAUNCHPAD ROUTES - Nuclear Option forced-completion mode
// See: docs/SESSION-ARTIFACT-INVARIANTS.md
// ═══════════════════════════════════════════════════════════════

// GET /launchpad/:sessionId - Render Launchpad UI
app.get('/launchpad/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionState = await getSessionWithDispositions(sessionId);

    if (!sessionState) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }

    res.send(renderLaunchpadPage(sessionId, sessionState));
  } catch (error) {
    console.error('Launchpad error:', error);
    res.status(500).send('<html><body><h1>Error loading Launchpad</h1></body></html>');
  }
});

// GET /api/launchpad/:sessionId/state - Get session state with dispositions
app.get('/api/launchpad/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionState = await getSessionWithDispositions(sessionId);

    if (!sessionState) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(sessionState);
  } catch (error) {
    console.error('State fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch session state' });
  }
});

// POST /api/launchpad/:sessionId/disposition - Record a user action
app.post('/api/launchpad/:sessionId/disposition', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { action, itemId, from, to, target, priority, undoes } = req.body;

    const result = await appendDisposition(sessionId, {
      action,
      itemId,
      from,
      to,
      target,
      priority,
      undoes
    });

    res.json(result);
  } catch (error) {
    console.error('Disposition error:', error);
    res.status(500).json({ success: false, message: 'Failed to record disposition' });
  }
});

// POST /api/launchpad/:sessionId/clear-lock - Clear session lock when complete
app.post('/api/launchpad/:sessionId/clear-lock', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify all items are resolved
    const sessionState = await getSessionWithDispositions(sessionId);
    if (!sessionState) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (sessionState.unresolvedCount > 0) {
      return res.json({
        success: false,
        message: `Cannot clear lock: ${sessionState.unresolvedCount} items still unresolved`
      });
    }

    // Clear the lock
    const result = await clearLock(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Clear lock error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear lock' });
  }
});

// GET /api/lock-status - Get current lock status (for extension/Results page)
app.get('/api/lock-status', async (req, res) => {
  try {
    const status = await getLockStatus();
    res.json(status);
  } catch (error) {
    console.error('Lock status error:', error);
    res.status(500).json({ error: 'Failed to get lock status' });
  }
});

// POST /api/acquire-lock - Acquire session lock (for Launchpad mode)
app.post('/api/acquire-lock', async (req, res) => {
  try {
    const { sessionId, itemsRemaining } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId required' });
    }

    const result = await acquireLock(sessionId, itemsRemaining || 0);
    res.json(result);
  } catch (error) {
    console.error('Acquire lock error:', error);
    res.status(500).json({ success: false, message: 'Failed to acquire lock' });
  }
});

// POST /api/lock/force-clear - Force clear lock (testing/emergency override)
app.post('/api/lock/force-clear', async (req, res) => {
  try {
    const result = await clearLock(null, true); // override=true bypasses session check
    console.error('Force clear lock requested');
    res.json(result);
  } catch (error) {
    console.error('Force clear lock error:', error);
    res.status(500).json({ success: false, message: 'Failed to force clear lock' });
  }
});

app.listen(PORT, () => {
  console.log(`Memento backend running at http://localhost:${PORT}`);
  console.log(`POST /classifyBrowserContext - Classify tabs and return JSON`);
  console.log(`POST /classifyAndRender - Classify tabs and return HTML page`);
  console.log(`GET  /launchpad/:sessionId - Launchpad UI (Nuclear Option mode)`);
});
