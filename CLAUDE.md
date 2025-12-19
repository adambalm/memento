# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install    # Install dependencies
npm start      # Start backend server on http://localhost:3000
```

No test or lint commands configured yet.

## Architecture

Memento is a browser session capture and classification system with two main components:

### Chrome Extension (`extension/`)
- Manifest V3 extension with popup UI
- Gathers open tabs (URL, title, first 2000 chars of page content via `chrome.scripting.executeScript`)
- Sends JSON payload to backend, opens results page
- Timeouts: 1s per tab extraction, 65s for LLM classification, 70s global

### Express Backend (`backend/`)
- `server.js` - HTTP endpoints, calls classifier, saves to memory
- `classifier.js` - Orchestrates LLM classification with mock fallback; contains prompt template and response parsing
- `models/index.js` - Model dispatch layer: `runModel(engine, prompt)` and `getEngineInfo(engine)`
- `models/localOllama.js` - Ollama driver with retry logic and timeout
- `memory.js` - Saves session JSON to `memory/sessions/YYYY-MM-DDTHH-MM-SS.json`
- `renderer.js` - Generates HTML results page

### Data Flow
```
Extension popup → POST /classifyBrowserContext → classifier.js
    → runModel('ollama-local', prompt) → Ollama API (or mock fallback)
    → saveSession() → memory/sessions/*.json
    → JSON response → Extension opens /results page
```

### Configuration
Environment variables (with defaults):
- `OLLAMA_ENDPOINT` - `http://adambalm:11434/api/generate`
- `OLLAMA_MODEL` - `qwen2.5-coder`

To switch LLM engines, modify `DEFAULT_ENGINE` in `classifier.js`. Stubs exist for `anthropic` and `openai` in `models/index.js`.

### Session Schema (v1.0.0)
Output includes `meta` block with `schemaVersion`, `engine`, `model`, `endpoint` for provenance tracking.
