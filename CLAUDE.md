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
- Gathers open tabs (URL, title, first 8000 chars of page content via `chrome.scripting.executeScript`)
- Two output modes: **Results** (passive viewing) and **Launchpad** (forced-completion)
- Sends JSON payload to backend, opens results or launchpad page
- Timeouts: 2s per tab extraction, 240s for LLM classification, 300s global

### Express Backend (`backend/`)

**Core files:**
- `server.js` - HTTP endpoints for classification, results, and launchpad routes
- `classifier.js` - Orchestrates LLM classification with mock fallback; contains prompt template and response parsing
- `models/index.js` - Model dispatch layer: `runModel(engine, prompt)` and `getEngineInfo(engine)`
- `models/localOllama.js` - Ollama driver with retry logic and timeout
- `memory.js` - Saves session JSON to `memory/sessions/YYYY-MM-DDTHH-MM-SS.json`
- `renderer.js` - Generates HTML results page

**Nuclear Option / Launchpad mode:**
- `launchpad.js` - Renders Launchpad UI for forced-completion workflow
- `lockManager.js` - Session lock at `~/.memento/lock.json`; blocks new Launchpad captures until resolved
- `dispositions.js` - Append-only action tracking (trash, complete, promote, regroup, reprioritize)

**Supporting files:**
- `contextLoader.js` - Loads user context from `memento-context.json`
- `pdfExtractor.js` - Playwright-based visual extraction for PDFs
- `mcp-server.js` - MCP server for Claude Desktop integration

### Data Flow

**Results mode (passive):**
```
Extension popup → POST /classifyAndRender → classifier.js
    → runModel() → Ollama API (or mock fallback)
    → saveSession() → memory/sessions/*.json
    → HTML response → Extension opens blob URL
```

**Launchpad mode (forced-completion):**
```
Extension popup → POST /classifyBrowserContext → classifier.js
    → saveSession() → memory/sessions/*.json
    → POST /api/acquire-lock → lockManager.js
    → Extension opens /launchpad/:sessionId
    → User actions → POST /api/launchpad/:sessionId/disposition
    → All resolved → POST /api/launchpad/:sessionId/clear-lock
```

### Configuration

Environment variables (with defaults):
- `OLLAMA_ENDPOINT` - `http://adambalm:11434/api/generate`
- `OLLAMA_MODEL` - `qwen2.5-coder`

To switch LLM engines, modify `DEFAULT_ENGINE` in `classifier.js`. Stubs exist for `anthropic` and `openai` in `models/index.js`.

### Session Schema (v1.3.0)

Output includes:
- `meta` block with `schemaVersion`, `engine`, `model`, `endpoint` for provenance tracking
- `dispositions` array (empty at creation, append-only thereafter)
- `groups` as object format: `{ "Category": [items...] }`

See: `docs/SESSION-ARTIFACT-INVARIANTS.md` for disposition semantics and immutability guarantees.

### Special Categories

- **Financial (Protected)** - Banking, payments, tax. No Trash button in Launchpad UI.
- **Academic (Synthesis)** - arxiv, journals, research. Shows "Synthesize" button for note consolidation.

## MCP Integration

`backend/mcp-server.js` provides tools for Claude Desktop:
- `list_sessions`, `read_session`, `get_latest_session`, `search_sessions`
- `get_context`, `set_context` - manage user project context
- `reclassify_session` - re-run classification with different engine
- `get_lock_status`, `clear_lock` - session lock management

Run with: `node backend/mcp-server.js` (stdio transport)

## Known Issues

None currently tracked.

### Fixed Issues

**Tab Capture Incomplete (resolved 2026-01-08)**
- Original symptom: Extension reports capturing N tabs, but visible browser tabs not all present
- Root cause: **Chrome profile isolation** — extension only sees tabs from its own profile
- Resolution: Diagnostic logging (popup.js lines 143-211) confirmed capture works correctly within profile scope
- Evidence: Recent sessions consistently capture 22-28 tabs with totalTabs matching grouped items

**Groups Format Mismatch (fixed 2025-01-02)**
- Session files store groups as object `{"Category": [...]}` not array
- Fixed in `dispositions.js` and `launchpad.js` with format detection

**MCP Protocol Corruption (fixed 2025-01-01)**
- MCP server was logging to stdout, corrupting JSON-RPC protocol
- Fixed by routing all logs to stderr (`console.error`)
