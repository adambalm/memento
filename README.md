# Memento MVP

Browser session capture and classification system with forced-completion workflow.

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
3. Choose output mode:
   - **Results** - Passive view of classified tabs
   - **Launchpad** - Forced-completion mode (must resolve all items)
4. Click "Capture Session"

## Output Modes

### Results Mode
Read-only view of classified tabs. No commitment required. Good for quick review.

### Launchpad Mode
Forced-completion workflow:
- Acquires session lock (blocks new Launchpad captures)
- Must resolve every item: Trash, Done, or Promote
- Lock clears when all items resolved
- Lock status visible globally (even in Results mode)

## Configuration

Environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_ENDPOINT` | `http://adambalm:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2.5-coder` | Model to use for classification |

## API Endpoints

### Classification
- `POST /classifyBrowserContext` - Classify tabs, returns JSON
- `POST /classifyAndRender` - Classify tabs, returns HTML page
- `GET /results?data=...` - Render results from encoded JSON

### Launchpad
- `GET /launchpad/:sessionId` - Render Launchpad UI
- `GET /api/launchpad/:sessionId/state` - Get session with dispositions applied
- `POST /api/launchpad/:sessionId/disposition` - Record user action
- `POST /api/launchpad/:sessionId/clear-lock` - Clear lock when complete

### Lock Management
- `GET /api/lock-status` - Get current lock status
- `POST /api/acquire-lock` - Acquire session lock

## Project Structure

```
memento-mvp/
├── backend/
│   ├── server.js           # Express server, all HTTP routes
│   ├── classifier.js       # LLM classification with mock fallback
│   ├── renderer.js         # Results HTML renderer
│   ├── launchpad.js        # Launchpad HTML renderer
│   ├── memory.js           # Session persistence
│   ├── dispositions.js     # Append-only action tracking
│   ├── lockManager.js      # Session lock (~/.memento/lock.json)
│   ├── contextLoader.js    # User context injection
│   ├── pdfExtractor.js     # Playwright PDF extraction
│   ├── mcp-server.js       # MCP server for Claude Desktop
│   └── models/
│       ├── index.js        # Model dispatch layer
│       └── localOllama.js  # Ollama driver
├── extension/
│   ├── manifest.json       # Chrome extension manifest v3
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Capture and mode logic
├── memory/
│   └── sessions/           # Saved session JSON files
├── docs/
│   └── SESSION-ARTIFACT-INVARIANTS.md  # Disposition semantics
└── package.json
```

## Session Schema (v1.3.0)

Each capture saves a timestamped JSON file to `memory/sessions/`:

```json
{
  "timestamp": "2025-01-02T...",
  "totalTabs": 14,
  "narrative": "Summary of browsing session...",
  "groups": { "Development": [...], "Research": [...] },
  "tasks": [{ "category": "Development", "suggestedAction": "..." }],
  "summary": { "categories": [...], "tabsByCategory": {...} },
  "dispositions": [],
  "source": "llm",
  "meta": {
    "schemaVersion": "1.3.0",
    "engine": "ollama-local",
    "model": "qwen2.5-coder",
    "endpoint": "http://..."
  }
}
```

**Immutability guarantee:** Capture-time fields are frozen. Only `dispositions` array grows (append-only). See `docs/SESSION-ARTIFACT-INVARIANTS.md`.

## MCP Integration

For Claude Desktop integration, run the MCP server:

```bash
node backend/mcp-server.js
```

Available tools:
- `list_sessions`, `read_session`, `get_latest_session`, `search_sessions`
- `get_context`, `set_context` - User project context
- `reclassify_session` - Re-run with different engine
- `get_lock_status`, `clear_lock` - Lock management

## Model Dispatch

The `backend/models/` layer supports multiple engines:

- `ollama-local` - Local Ollama instance (implemented)
- `anthropic` - Anthropic API (stub)
- `openai` - OpenAI API (stub)

To switch engines, modify `DEFAULT_ENGINE` in `classifier.js`.
