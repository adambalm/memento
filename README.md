# Memento MVP

Browser session capture and classification prototype.

## Quick Start

### 1. Install dependencies and start backend

```bash
npm install
npm start
```

Backend runs at `http://localhost:3000`

### 2. Load Chrome extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project

### 3. Use the extension

1. Open some browser tabs
2. Click the Memento extension icon in Chrome toolbar
3. Click "Capture Session"
4. Results page opens with grouped tabs and analysis

## Configuration

Environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_ENDPOINT` | `http://adambalm:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2.5-coder` | Model to use for classification |

## API Endpoints

- `POST /classifyBrowserContext` - Classify tabs, returns JSON
- `POST /classifyAndRender` - Classify tabs, returns HTML page
- `GET /results?data=...` - Render results from encoded JSON

## Project Structure

```
memento-mvp/
├── backend/
│   ├── server.js           # Express server
│   ├── classifier.js       # LLM classification with mock fallback
│   ├── renderer.js         # HTML page renderer
│   ├── memory.js           # Session persistence
│   └── models/
│       ├── index.js        # Model dispatch layer
│       └── localOllama.js  # Ollama driver
├── extension/
│   ├── manifest.json       # Chrome extension manifest v3
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Capture logic
├── memory/
│   └── sessions/           # Saved session JSON files
└── package.json
```

## Session Output

Each capture saves a timestamped JSON file to `memory/sessions/`:

```json
{
  "timestamp": "2025-12-19T09:25:08.048Z",
  "totalTabs": 14,
  "narrative": "Summary of browsing session...",
  "groups": { "Development": [...], "Shopping": [...] },
  "tasks": [{ "category": "Development", "suggestedAction": "..." }],
  "summary": { "categories": [...], "tabsByCategory": {...} },
  "source": "llm",
  "meta": {
    "schemaVersion": "1.0.0",
    "engine": "ollama-local",
    "model": "qwen2.5-coder",
    "endpoint": "http://adambalm:11434/api/generate"
  }
}
```

## Model Dispatch

The `backend/models/` layer supports multiple engines:

- `ollama-local` - Local Ollama instance (implemented)
- `anthropic` - Anthropic API (stub)
- `openai` - OpenAI API (stub)

To switch engines, modify `DEFAULT_ENGINE` in `classifier.js`.
