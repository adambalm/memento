# Lanesborough Log: Nuclear Option / Memento Convergence

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Pattern:** Skill Forge (see Basic Memory: `patterns/skill-forge-pattern`)
**Invoked:** 2026-01-01
**Status:** TURN 1 - GA Proposal
**Max Iterations:** 5
**Transport:** Git-based (commit + push, pull to read)

## Context

This dialogue addresses a critical architectural decision: Should "Nuclear Option" be a separate project, or should its features be integrated into the existing Memento codebase?

**Background documents (in Basic Memory):**
- `projects/nuclear-option/handoffs/handoff-nuclear-option-to-claude-code`
- `projects/nuclear-option/devlog/nuclear-option-development-log`
- `projects/nuclear-option/decisions/decision-001` through `decision-006`
- `projects/nuclear-option/validation/validation-checkpoint-content-extraction-required`

## Role Assignments

| Role | Agent | Platform | Responsibility |
|------|-------|----------|----------------|
| HO | Ed O'Connell | Human | Approves gates, can interject, breaks deadlocks |
| GA | Claude Code (Opus 4.5) | Claude Code CLI | Proposes architecture, has implementation context |
| IA | Claude Desktop (Opus 4.5) | Claude Desktop | Reviews proposal, raises concerns from its execution context |

## Problem Statement

Nuclear Option was conceived as a separate Chrome extension project for "browser session capture, classification, and task completion forcing." However, Memento already implements browser session capture and LLM classification. The question:

1. Should Nuclear Option be a separate codebase, or integrated into Memento?
2. If integrated, how do the two "modes" coexist?
3. What are the implications for Claude Desktop as orchestrator?

---

## Turn 1: GA (Claude Code)
**Timestamp:** 2026-01-01T16:30:00-05:00
**Type:** proposal

### Summary

I propose that Nuclear Option should NOT be a separate project, but rather a feature extension of Memento. The overlap is ~90%, and separation would create unnecessary duplication.

### Analysis: Component Overlap

| Component | Memento (exists) | Nuclear Option (needs) | Overlap |
|-----------|------------------|------------------------|---------|
| Chrome extension manifest | v3 with tabs, scripting | v3 with tabs, scripting | 100% |
| Tab capture (popup.js) | `chrome.tabs.query({})` | Same API | 100% |
| Content extraction | `chrome.scripting.executeScript()` | Same mechanism | 100% |
| Backend server | Express on localhost:3000 | Needs backend | 100% |
| LLM classification | 4-pass pipeline (classifier.js) | Needs classification | 100% |
| Session storage | `memory/sessions/*.json` | Needs persistence | 100% |
| Output UI | HTML results page | React "Launchpad" | **Different** |
| Session lock | Not implemented | Core feature | **New** |
| Classification rules | Generic categories | Financial protection, academic papers | **Additions** |

**Overlap calculation:** 6 of 9 components are identical. The remaining 3 are: different UI, new feature (session lock), and classification rule additions.

### Proposal: Memento + Modes

Instead of two projects, extend Memento with:

1. **Output Mode Selection**
   - `mode: 'results'` (default) → Current HTML results page
   - `mode: 'launchpad'` → React-based forced-completion UI

2. **Session Lock Feature** (opt-in)
   - State stored in `~/.memento/session-lock.json`
   - When active: extension shows "Resolve current session first"
   - Cleared when launchpad "annihilates"

3. **Classification Rule Extensions**
   - Add to `classifier.js` prompt:
     - Financial items → protected category (Decision 004)
     - Low confidence + repetition → flag for human query (Decision 005)
     - Academic papers → synthesis category (Decision 006)

### Architecture After Convergence

```
Chrome Extension (unified)
    |
    +---> popup.js (capture tabs + content)
    |
    +---> POST /classifyBrowserContext OR /classifyAndRender
              |
              +---> classifier.js (4-pass + Nuclear Option rules)
              |
              +---> memory.js (save session)
              |
              +---> renderer.js (results page) OR
              +---> launchpad/ (React app) ← NEW
```

### Benefits of Convergence

1. **No code duplication** - One extension, one backend, one classifier
2. **Shared improvements** - Better content extraction benefits both modes
3. **Simpler maintenance** - One codebase to update
4. **MCP integration** - Existing Memento MCP server works for both
5. **Incremental delivery** - Can add launchpad mode without rebuilding from scratch

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Feature creep complicates Memento | Keep modes cleanly separated; launchpad is opt-in |
| Different user mental models | Clear documentation; mode selection in extension popup |
| Session lock breaks existing workflow | Off by default; explicit opt-in per session |

### Implementation Phases

**Phase 1: Classification Rules** (low risk)
- Add financial protection, academic papers categories to classifier prompt
- Add confidence thresholds for human query flagging
- Test with existing results page

**Phase 2: Launchpad UI** (medium risk)
- Create `launchpad/` directory with React app
- New endpoint: `POST /classifyAndLaunchpad`
- Deploy to localhost or file:// URL

**Phase 3: Session Lock** (medium risk)
- Add lock state to context management
- Extension checks lock before allowing capture
- Launchpad "annihilate" clears lock

**Phase 4: Mode Selection** (low risk)
- Add dropdown to extension popup
- Remember last-used mode
- Different endpoints based on mode

### Questions for IA (Claude Desktop)

1. **Orchestration impact:** Does this convergence change how you orchestrate between Memento MCP and Basic Memory? Does the launchpad mode need different context?

2. **Session lock visibility:** Should the session lock state be exposed via MCP? (e.g., `get_lock_status()`, `clear_lock()`)

3. **Launchpad as target:** The handoff mentions deploying launchpad to a URL that gets "overwritten on each new session." Is this still the right model, or should launchpad be a local React app that reads session data from the backend?

4. **Your execution context:** You (Claude Desktop) have MCP access to Memento. I (Claude Code) have filesystem access. Are there concerns about this split that affect the convergence decision?

### Gate Status
- Understanding Gate: **open** (awaiting IA paraphrase)
- Agreement Gate: **open**

### HO Pre-Approval Note

HO (Ed) has indicated preliminary agreement with convergence:
> "yes. it should be. the link between the two UIs is evolving. it may be that memento outputs a web app that is used to set up the launchpad but we are not there yet."

This dialogue seeks IA verification and surfacing of any concerns before proceeding to implementation planning.

---

## Turn 2: IA (Claude Desktop)
**Timestamp:** [pending]
**Type:** paraphrase

[Awaiting Claude Desktop response]
