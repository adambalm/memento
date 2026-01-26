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

## Project Structure

```
memento-mvp/
├── backend/                    # Express server
│   ├── server.js              # Main HTTP endpoints
│   ├── classifier.js          # LLM classification orchestration
│   ├── models/                # LLM drivers (Ollama, stubs for OpenAI/Anthropic)
│   ├── renderers/             # HTML page generators
│   │   ├── layout.js          # Shared layout utilities
│   │   ├── summaryRenderer.js # Results page
│   │   ├── launchpad.js       # Launchpad forced-completion UI
│   │   ├── taskPickerRenderer.js # Task flow UI
│   │   ├── dashboardRenderer.js  # Main dashboard (/)
│   │   ├── preferencesRenderer.js # Learned preferences (/preferences)
│   │   ├── devDashboardRenderer.js # Dev tracker (/dev)
│   │   └── workbenchRenderer.js   # Prompt experimentation
│   ├── taskGenerator.js       # Longitudinal attention tasks
│   ├── taskActions.js         # Task action handlers
│   ├── correctionAnalyzer.js  # Rule/preference learning from corrections
│   ├── lockManager.js         # Session lock for forced-completion
│   ├── dispositions.js        # Append-only action tracking
│   └── mcp-server.js          # MCP server for Claude Desktop
├── extension/                  # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html/js          # Extension popup UI
│   └── background.js          # Service worker
├── tests/                      # Test files
│   ├── e2e/                   # Playwright end-to-end tests
│   ├── mcp/                   # MCP server tests
│   └── screenshots/           # Test screenshots
├── docs/                       # Documentation
├── memory/                     # Session storage
│   └── sessions/              # JSON session files
├── dialogues/                  # Saved conversations/logs
├── CLAUDE.md                   # This file (project instructions)
├── README.md                   # User-facing documentation
└── TODO.md                     # Task tracking
```

### Related Projects (Sibling Directories)

- `../forensic-audio-skill-forge/` - Separate Skill Forge project for audio forensics (moved from memento-mvp on 2026-01-23)

## Cross-Project Context

This project is part of a three-project development sandbox:

| Project | Path | Purpose |
|---------|------|---------|
| portfolio | `C:/Users/Guest1/dev-sandbox/portfolio/` | Epistemic showcase, React 19 + Vite |
| **memento-mvp** (this) | `C:/Users/Guest1/dev-sandbox/memento-mvp/` | Browser session capture, Node.js + Chrome Extension |
| sca-website | `C:/Users/Guest1/dev-sandbox/sca-website/` | School website, Astro + Sanity CMS monorepo |

**Basic Memory Locations:**
- Extended context: `memory://projects/memento/`
- Session handoffs: `memory://continuity/cross-instance/memento-context.md`
- MCP architecture docs: `memory://decisions/Memento MCP Architecture Decision.md`

**Handoff Protocol:** Use `/sync-context save` before ending sessions; other instances use `/sync-context load memento` to resume.

## Current Development State (2026-01-23)

### Recently Completed (Product Coherence Sprint)

**Sprint 0-2 DONE:** Feedback loops and navigation hub

**Cleanup (2026-01-23):**
- Removed 23 `tmpclaude-*` temp files from root
- Moved scattered test files to `tests/e2e/`
- Moved `test-screenshots/` to `tests/screenshots/`
- Moved `forensic-audio-skill-forge/` to sibling directory (separate project)

1. **Preference visibility** - Results page now shows "Applied X preferences" when learned preferences influence classification
2. **Rules → Preferences rename** - `/rules` redirects to `/preferences`, all UI copy updated to friendlier language
3. **Task action feedback** - Toast messages show specific feedback like "Blocked example.com"
4. **Preference tracking** - Application counts tracked and displayed ("Used 12 times")
5. **Central dashboard** - New `/` route shows lock status, preferences, tasks, recent sessions
6. **Dev dashboard** - `/dev` route for sprint tracking (but see "Next Steps" - it's static)

### New Routes Added
- `GET /` - Main dashboard (navigation hub)
- `GET /dev` - Development sprint tracker
- `GET /preferences` - Renamed from /rules
- `GET /rules` - Redirects to /preferences

### New Files Created
- `backend/renderers/dashboardRenderer.js`
- `backend/renderers/preferencesRenderer.js`
- `backend/renderers/devDashboardRenderer.js`

### Next Steps (PRIORITY)

**Problem:** The `/dev` dashboard is static - it lies. Sprint status is hardcoded, not derived from code.

**What's needed:**
1. **Auto-generated route inventory** - Scan server.js, list all routes with their state (working/partial/stub)
2. **Screen inventory** - Every page, its purpose, clickable test links
3. **Living documentation** - Generated from code, always accurate

**Methodology to adopt:** Consider Architecture Decision Records (ADRs), screen inventories, and living documentation patterns. The goal is tooling that tells truth about the codebase, not static docs that rot.

### All Routes (for reference)
To get current routes: `grep -E "app\.(get|post)" backend/server.js`

### Remaining Sprints (from original plan)
- Sprint 3: Goal tracking (goals influence task generation)
- Sprint 4: Tab annotation UI
- Sprint 5: Workbench save flow
