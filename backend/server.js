require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { classifyTabs } = require('./classifier');
const { renderResultsPage } = require('./renderer');
const { saveSession } = require('./memory');
const { loadContext } = require('./contextLoader');
const { processVisualExtractionTabs } = require('./pdfExtractor');

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

    // Save to memory
    await saveSession(classification);

    // Return JSON response
    res.json(classification);
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
    await saveSession(classification);
    res.send(renderResultsPage(classification));
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).send('<html><body><h1>Error: Classification failed</h1></body></html>');
  }
});

app.listen(PORT, () => {
  console.log(`Memento backend running at http://localhost:${PORT}`);
  console.log(`POST /classifyBrowserContext - Classify tabs and return JSON`);
  console.log(`POST /classifyAndRender - Classify tabs and return HTML page`);
});
