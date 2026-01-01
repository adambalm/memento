# Lanesborough Log: Memento MCP Architecture

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Invoked:** 2026-01-01
**Status:** TURN 1 - GA Proposal submitted, awaiting HO approval
**Max Iterations:** 5

## Skill Forge Mode

**Mode:** Non-Strict (Manual Transport)
**Transport:** HO copies log to ChatGPT, pastes response back

### Strict vs Non-Strict Mode

| Mode | Transport | Audit | Use Case |
|------|-----------|-------|----------|
| **Strict** | Automated API calls, PR gates on every turn | Full git history, programmatic | Production dialogues, high-stakes decisions |
| **Non-Strict** | Manual copy-paste by HO | Log file captures content, HO attests | Exploratory dialogues, skill development |

In non-strict mode:
- HO manually copies the current log state to ChatGPT
- ChatGPT responds; HO pastes response into log
- HO commits and can still use PRs for review
- Trade-off: Less automation, but faster iteration during skill development

This dialogue is in **non-strict mode** as we develop the Skill Forge pattern itself.

## Role Assignments

| Role | Agent | Platform | Responsibility |
|------|-------|----------|----------------|
| HO | Ed O'Connell | Human | Approves PRs, can interject, breaks deadlocks |
| GA | Claude Code (Opus 4.5) | Claude Code CLI | Proposes architecture, refines based on feedback |
| IA | ChatGPT (5.2) | OpenAI | Critiques, validates, offers alternatives |

## Problem Statement

Design the Memento MCP server architecture for Claude Desktop integration. Key questions:
1. How should Memento expose its session data to Claude Desktop?
2. How should context.json (active projects) be managed?
3. How should re-classification with updated context work?
4. What's the right boundary between Memento MCP and Basic Memory MCP?

---

# Exchange Rules

Both GA (Claude) and IA (ChatGPT) must follow these rules.

## Turn Structure

Each turn MUST be formatted as:

```
---

## Turn N: [ROLE] ([Agent Name])
**Timestamp:** [ISO 8601]
**Type:** proposal | critique | refinement | handshake | escalation

### Summary
[1-2 sentence summary of this turn's contribution]

### Content
[Full response]

### Questions for Other Party
[Numbered list of specific questions, or "None - proposing handshake"]

### Position
[ ] Proposing handshake (I believe we have agreement)
[x] Requesting refinement (I have concerns/questions)
[ ] Escalating to HO (We need human decision)

---
```

## Role Responsibilities

**GA (Generalizing AI - Claude):**
- Proposes architectures and high-level designs
- Synthesizes IA feedback into refined proposals
- Initiates handshake when agreement seems reached

**IA (Inspecting AI - ChatGPT):**
- Critiques GA proposals from first principles
- Identifies edge cases, failure modes, alternatives
- Challenges assumptions (your value is as critic, not yes-man)
- Validates or rejects handshake proposals

**HO (Human Orchestrator):**
- Reviews each turn via PR before it's "official"
- Can comment, modify, or reject turns
- Breaks deadlocks after 5 turns

## Handshake Protocol

1. When one party believes agreement is reached, mark "Proposing handshake"
2. Other party must respond with either:
   - "Agreed" + summary of what was agreed -> HANDSHAKE COMPLETE
   - "Not yet" + remaining concerns -> Continue refinement
3. After handshake, HO must approve before execution

## Instructions for ChatGPT (IA)

When you receive this log:
1. Read the full context to understand the problem
2. Read the GA proposal carefully
3. Respond in the Turn Structure format above
4. Be specific - reference function names, edge cases, concrete examples
5. Challenge assumptions - don't just agree
6. Propose alternatives if you see better approaches
7. Ask clarifying questions if the proposal is ambiguous

---

# Dialogue Log

---

## Turn 1: GA (Claude Code)
**Timestamp:** 2026-01-01T09:30:00Z
**Type:** proposal

### Summary

Proposing that Memento become an MCP server exposing session data to Claude Desktop, with context management via MCP tools rather than file-based staleness checks.

### Content

#### Background

Memento is a browser session capture and classification system:
- Chrome extension captures open tabs (URL, title, content)
- Express backend classifies tabs using LLM (currently Anthropic Claude or local Ollama)
- Four-pass architecture: (1) Classify, (2) Deep dive, (3) Visualization, (4) Thematic analysis
- Sessions saved to `memory/sessions/*.json`
- Context from `~/.memento/context.json` provides active projects for smarter classification

**The problem we hit today:** The context.json file has a 24-hour staleness check. When it expired, Pass 4 (thematic analysis) stopped running because it requires active projects. This raised the question: how should context be managed?

**The insight:** If Memento were an MCP server, Claude Desktop could orchestrate between Memento and Basic Memory. Context refresh becomes an MCP tool call, not a file staleness heuristic.

#### Proposed Architecture

Memento MCP Server exposes these tools:

```
Session Query Tools:
- list_sessions() -> [{timestamp, tabCount, narrative, sessionPattern}]
- read_session(id) -> full session JSON
- get_latest() -> most recent session
- search_sessions(query) -> sessions matching keywords

Context Management Tools:
- get_active_projects() -> current context.json content
- set_active_projects([{name, keywords, categoryType}]) -> update context
- refresh_context_from_basic_memory() -> pull projects from Basic Memory

Re-classification Tools:
- reclassify_session(session_id) -> re-run classification with current context
```

#### Why This Architecture

1. **Claude Desktop as orchestrator:** It already has access to Basic Memory MCP. Adding Memento MCP means it can coordinate between them. "Update my Memento context from my current projects" becomes a natural command.

2. **No staleness heuristics:** Context is updated explicitly via `set_active_projects()`, not implicitly via file timestamps.

3. **Re-classification becomes possible:** With `reclassify_session()`, you can re-analyze an old session with updated project keywords.

4. **Queryable history:** "What was I researching yesterday?" becomes a Claude Desktop query against Memento.

#### Open Questions

1. **Context.json as implementation detail?** Should `set_active_projects()` write to context.json internally, or should we move to a database/in-memory store?

2. **Boundary with Basic Memory:** Basic Memory stores knowledge and projects. Memento stores browsing sessions. Should Memento know about Basic Memory directly (for `refresh_context_from_basic_memory()`), or should that always go through Claude Desktop as orchestrator?

3. **Re-classification scope:** When re-classifying, should we re-run all 4 passes? Just Pass 1? What about the thematic analysis (Pass 4)?

4. **Session mutability:** Is a session immutable once captured? Or can re-classification update it in place? (Audit implications)

### Questions for Other Party

1. Does the MCP server approach make sense, or is there a simpler solution I'm missing?
2. What edge cases or failure modes do you see in this architecture?
3. For the Memento/Basic Memory boundary: orchestrator pattern (Claude Desktop coordinates) vs. direct integration (Memento calls Basic Memory)? Which is cleaner?
4. Any concerns about the `reclassify_session` concept from an auditability perspective?

### Position

[ ] Proposing handshake (I believe we have agreement)
[x] Requesting refinement (I have concerns/questions)
[ ] Escalating to HO (We need human decision)

---

## Turn 2: IA (ChatGPT)
**Status:** Awaiting Turn 1 approval by HO

[ChatGPT response will be appended here after HO approves Turn 1 PR]

---
