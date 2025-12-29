require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { classifyTabs } = require('./classifier');
const { renderResultsPage } = require('./renderer');
const { saveSession } = require('./memory');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// POST /classifyBrowserContext - Main endpoint for tab classification
app.post('/classifyBrowserContext', async (req, res) => {
  try {
    const { tabs, engine } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).json({ error: 'Invalid request: tabs array required' });
    }

    console.log(`Received ${tabs.length} tabs for classification via ${engine || 'default'}`);

    // Call LLM classifier with specified engine
    const classification = await classifyTabs(tabs, engine);

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
    const { tabs, engine } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).send('<html><body><h1>Error: Invalid request</h1></body></html>');
    }

    console.log(`Received ${tabs.length} tabs for classification via ${engine || 'default'}`);

    const classification = await classifyTabs(tabs, engine);
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
