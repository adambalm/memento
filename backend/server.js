require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { classifyTabs } = require('./classifier');
const { renderResultsPage } = require('./renderer');
const { renderSummaryPage } = require('./renderers/summaryRenderer');
const { renderMapPage } = require('./renderers/mapRenderer');
const { renderTabsPage } = require('./renderers/tabsRenderer');
const { renderAnalysisPage } = require('./renderers/analysisRenderer');
const { renderHistoryPage } = require('./renderers/historyRenderer');
const { saveSession, readSession, listSessions, searchSessions } = require('./memory');
const { loadContext } = require('./contextLoader');
const { processVisualExtractionTabs } = require('./pdfExtractor');
const { renderLaunchpadPage } = require('./launchpad');
const { appendDisposition, appendBatchDisposition, getSessionWithDispositions, getSessionWithDispositionsApplied } = require('./dispositions');
const { getLockStatus, clearLock, acquireLock, updateResumeState } = require('./lockManager');
const { getMirrorInsight } = require('./mirror');
const { getTopTask, getAllCandidateTasks, getAttentionStats } = require('./taskGenerator');
const { enrichTopTask } = require('./taskEnricher');
const { getRecentEntries: getRecentTaskEntries, getStats: getTaskLogStats } = require('./taskLog');
const { executeAction: executeTaskAction, skipTask } = require('./taskActions');
const { renderTaskPickerPage, renderCompletionPage } = require('./renderers/taskPickerRenderer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GET /history - Browse all sessions
app.get('/history', async (req, res) => {
  try {
    const query = req.query.q || null;
    const sessions = query ? await searchSessions(query) : await listSessions();
    res.send(renderHistoryPage(sessions, query));
  } catch (error) {
    console.error('History page error:', error);
    res.status(500).send('<html><body><h1>Error loading history</h1></body></html>');
  }
});

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

// GET /results/:sessionId - View saved session results (Summary hub screen)
app.get('/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Use dispositions-applied version to show current state (after user corrections)
    const sessionData = await getSessionWithDispositionsApplied(sessionId);
    if (!sessionData) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }
    // Get mirror insight for confrontational reflection
    const mirrorInsight = await getMirrorInsight();
    res.send(renderSummaryPage(sessionData, sessionId, mirrorInsight));
  } catch (error) {
    console.error('Results view error:', error);
    res.status(500).send('<html><body><h1>Error loading results</h1></body></html>');
  }
});

// GET /results/:sessionId/map - Session visualization (Mermaid diagram)
app.get('/results/:sessionId/map', async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Map uses original session data (visualization reflects original analysis)
    const sessionData = await readSession(sessionId);
    if (!sessionData) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }
    res.send(renderMapPage(sessionData, sessionId));
  } catch (error) {
    console.error('Map view error:', error);
    res.status(500).send('<html><body><h1>Error loading map</h1></body></html>');
  }
});

// GET /results/:sessionId/tabs - Grouped tabs list view
app.get('/results/:sessionId/tabs', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const filterCategory = req.query.filter || null;
    // Use dispositions-applied version to show current state
    const sessionData = await getSessionWithDispositionsApplied(sessionId);
    if (!sessionData) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }
    res.send(renderTabsPage(sessionData, sessionId, filterCategory));
  } catch (error) {
    console.error('Tabs view error:', error);
    res.status(500).send('<html><body><h1>Error loading tabs</h1></body></html>');
  }
});

// GET /results/:sessionId/analysis - Deep analysis view
app.get('/results/:sessionId/analysis', async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Analysis uses original session data (shows what AI analyzed)
    const sessionData = await readSession(sessionId);
    if (!sessionData) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }
    res.send(renderAnalysisPage(sessionData, sessionId));
  } catch (error) {
    console.error('Analysis view error:', error);
    res.status(500).send('<html><body><h1>Error loading analysis</h1></body></html>');
  }
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
    // Get mirror insight for confrontational reflection
    const mirrorInsight = await getMirrorInsight();
    res.send(renderResultsPage(classification, sessionId, mirrorInsight));
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

    // Get lock status for Resume Card
    const lockStatus = await getLockStatus();

    res.send(renderLaunchpadPage(sessionId, sessionState, lockStatus));
  } catch (error) {
    console.error('Launchpad error:', error);
    res.status(500).send('<html><body><h1>Error loading Launchpad</h1></body></html>');
  }
});

// GET /review/:sessionId - Review Mode (no lock required)
app.get('/review/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionState = await getSessionWithDispositions(sessionId);

    if (!sessionState) {
      return res.status(404).send('<html><body><h1>Session not found</h1></body></html>');
    }

    // Review mode - no lock status needed
    res.send(renderLaunchpadPage(sessionId, sessionState, {}, true));
  } catch (error) {
    console.error('Review mode error:', error);
    res.status(500).send('<html><body><h1>Error loading Review</h1></body></html>');
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

// POST /api/launchpad/:sessionId/batch-disposition - Record multiple actions atomically
app.post('/api/launchpad/:sessionId/batch-disposition', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { dispositions } = req.body;

    if (!Array.isArray(dispositions)) {
      return res.status(400).json({ success: false, message: 'dispositions array required' });
    }

    const result = await appendBatchDisposition(sessionId, dispositions);
    res.json(result);
  } catch (error) {
    console.error('Batch disposition error:', error);
    res.status(500).json({ success: false, message: 'Failed to record batch disposition' });
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

// POST /api/launchpad/:sessionId/resume-state - Update resume state for task resumption
app.post('/api/launchpad/:sessionId/resume-state', async (req, res) => {
  try {
    const { goal, focusCategory } = req.body;

    const result = await updateResumeState({ goal, focusCategory });
    res.json(result);
  } catch (error) {
    console.error('Resume state error:', error);
    res.status(500).json({ success: false, message: 'Failed to update resume state' });
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

// ═══════════════════════════════════════════════════════════════
// TASK ROUTES - Task-Driven Attention System
// "One Thing, One Goal" - surfaces the most important task
// ═══════════════════════════════════════════════════════════════

// GET /tasks - Task picker page (renders top task with LLM enrichment)
app.get('/tasks', async (req, res) => {
  try {
    const { completed } = req.query;

    // If just completed an action, show brief feedback then load next task
    if (completed) {
      console.error(`[Tasks] Action completed: ${completed}`);
    }

    // Get top task and enrich it
    const topTask = await getTopTask();
    const stats = await getAttentionStats();

    if (!topTask) {
      // No tasks to show
      res.send(renderTaskPickerPage(null, stats));
      return;
    }

    console.error(`[Tasks] Top task: ${topTask.type} (score: ${topTask.score})`);

    // Enrich with LLM
    const enrichedTask = await enrichTopTask(topTask);

    res.send(renderTaskPickerPage(enrichedTask, stats));
  } catch (error) {
    console.error('Tasks page error:', error);
    res.status(500).send('<html><body><h1>Error loading tasks</h1><p>' + error.message + '</p></body></html>');
  }
});

// GET /api/tasks/candidates - Get raw candidate tasks (before enrichment)
app.get('/api/tasks/candidates', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const candidates = await getAllCandidateTasks({ limit });
    res.json({ candidates });
  } catch (error) {
    console.error('Candidates fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /api/tasks/stats - Get attention stats and task log stats
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const [attentionStats, logStats] = await Promise.all([
      getAttentionStats(),
      getTaskLogStats()
    ]);
    res.json({
      attention: attentionStats,
      actions: logStats
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/tasks/log - Get recent task log entries
app.get('/api/tasks/log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const entries = await getRecentTaskEntries(limit);
    res.json({ entries });
  } catch (error) {
    console.error('Log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// POST /api/tasks/:taskId/action - Execute REAL task action
app.post('/api/tasks/:taskId/action', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action, taskType, task } = req.body;

    console.error(`[Tasks] Action: ${action} on ${taskType} (${taskId})`);

    let result;

    // Skip is special - doesn't create permanent record
    if (action === 'skip') {
      result = await skipTask(task);
    } else {
      // Execute the real action (modifies dispositions, blocklists, etc.)
      result = await executeTaskAction(task, action);
    }

    res.json(result);
  } catch (error) {
    console.error('Task action error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to execute action' });
  }
});

app.listen(PORT, () => {
  console.log(`Memento backend running at http://localhost:${PORT}`);
  console.log(`POST /classifyBrowserContext - Classify tabs and return JSON`);
  console.log(`POST /classifyAndRender - Classify tabs and return HTML page`);
  console.log(`GET  /launchpad/:sessionId - Launchpad UI (Nuclear Option mode)`);
  console.log(`GET  /tasks - Task-Driven Attention System (One Thing)`);
});
