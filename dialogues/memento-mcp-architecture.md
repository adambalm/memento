# Lanesborough Log: Memento MCP Architecture

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Pattern:** Skill Forge (see Basic Memory: `patterns/skill-forge-pattern`)
**Invoked:** 2026-01-01
**Status:** TURN 1 - GA Proposal submitted, awaiting HO approval
**Max Iterations:** 5
**Transport:** Manual (HO copies log to ChatGPT, pastes response back)

## Context Sage Integration

This dialogue is part of the **Context Sage** pipeline:
```
CAPTURE (Memento) → ORGANIZE (Basic Memory) → EVALUATE (Rubric System)
```

The question at hand: How should Memento expose its data to Claude Desktop via MCP?

## Role Assignments

| Role | Agent | Platform | Responsibility |
|------|-------|----------|----------------|
| HO | Ed O'Connell | Human | Approves gates, can interject, breaks deadlocks, articulates outcome |
| GA | Claude Code (Opus 4.5) | Claude Code CLI | Proposes architecture, refines based on feedback |
| IA | ChatGPT (5.2) | OpenAI | Paraphrases with verification, critiques, offers alternatives |

## Problem Statement

Design the Memento MCP server architecture for Claude Desktop integration. Key questions:
1. How should Memento expose its session data to Claude Desktop?
2. How should context.json (active projects) be managed?
3. How should re-classification with updated context work?
4. What's the right boundary between Memento MCP and Basic Memory MCP?

---

# Skill Forge Exchange Rules

This dialogue follows the **Skill Forge Pattern** for multi-model deliberation. The goal is **qualified human judgment** — expanding what complexity a human can competently decide by observing models surface each other's errors.

## Gates

### Understanding Gate (UG)

"We are talking about the same thing, and I have responded to your verification flags."

The paraphrasing model (IA) must:
1. Restate the proposal in its own terms
2. Flag each claim with verification status (see below)
3. NOT proceed without flagging — silence is not verification

The originating model (GA) must:
1. Confirm the paraphrase captures consequences, OR correct misunderstandings
2. Respond to each verification flag (defend, concede, or acknowledge uncertainty)

**UG closes when:** GA has *responded* to all flags (not when all flags are green). Unverified claims are explicitly acknowledged, not papered over.

### Agreement Gate (AG)

"We think the same thing is true/workable."

The reviewing model commits to a falsifiable, conditional, or explicitly unresolved stance. Agreement without demonstrated understanding is invalid.

**Critical distinction:** Understanding does NOT imply agreement. These are orthogonal.

## Verification Flags

Each claim in a paraphrase must be flagged:

| Flag | Meaning | Who Resolves |
|------|---------|--------------|
| `[verified]` | IA independently confirmed | IA |
| `[contradicts: X]` | IA's understanding differs | Models debate → resolve or escalate |
| `[cannot verify: no access to Y]` | IA lacks information to check | HO may certify |
| `[unverifiable: judgment call]` | No verification procedure exists | HO may certify |
| `[unresolved]` | Not resolved, proceed with caution | Logged as open |

**Human certification:** When models cannot verify a claim, HO may certify it: `[certified by HO, YYYY-MM-DD]`. This puts the human's name on the claim, not "the models agreed."

## Turn Structure

Each turn MUST be formatted as:

```
---

## Turn N: [ROLE] ([Agent Name])
**Timestamp:** [ISO 8601]
**Type:** proposal | paraphrase | critique | refinement | handshake | escalation

### Summary
[1-2 sentence summary of this turn's contribution]

### Content
[Full response with verification flags where applicable]

### Gate Status
- Understanding Gate: [open | pending-response | closed]
- Agreement Gate: [open | pending | closed]

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
- Responds to IA verification flags (defend, concede, or acknowledge uncertainty)
- Synthesizes IA feedback into refined proposals
- Initiates handshake when agreement seems reached

**IA (Inspecting AI - ChatGPT):**
- Paraphrases GA proposals with verification flags on each claim
- Critiques from first principles
- Identifies edge cases, failure modes, alternatives
- Challenges assumptions (your value is as critic, not yes-man)
- Validates or rejects handshake proposals

**HO (Human Orchestrator):**
- Reviews each turn via PR before it's "official"
- Can comment, modify, or reject turns
- Certifies claims that models cannot verify
- Breaks deadlocks after max iterations
- **Must articulate the outcome in own words** — this is the success test

## Handshake Protocol

1. When one party believes agreement is reached, mark "Proposing handshake"
2. Other party must respond with either:
   - "Agreed" + summary of what was agreed → HANDSHAKE COMPLETE
   - "Not yet" + remaining concerns → Continue refinement
3. After handshake, HO must:
   - Approve before execution
   - Articulate the core decision in their own words (proves qualification)
4. Human articulation becomes substrate for reusable skill

## Instructions for ChatGPT (IA)

When you receive this log:
1. Read the full context to understand the problem
2. Read the GA proposal carefully
3. **Paraphrase** the proposal in your own terms
4. **Flag each claim** with verification status: `[verified]`, `[contradicts: X]`, `[cannot verify]`, `[unverifiable]`
5. After paraphrase, provide substantive **critique**
6. Be specific — reference function names, edge cases, concrete examples
7. Challenge assumptions — your value is as critic, not yes-man
8. Propose alternatives if you see better approaches
9. Update Gate Status in your response

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

### Gate Status
- Understanding Gate: **open** (awaiting IA paraphrase with verification flags)
- Agreement Gate: **open**

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

[ChatGPT will paraphrase Turn 1 with verification flags, then critique]

Turn 2: IA (ChatGPT)

Timestamp: 2026-01-01T10:02:00Z
Type: paraphrase + critique

Summary

I restate GA’s proposed MCP architecture for Memento, flagging which claims I can verify, which depend on design judgment, and which hinge on unresolved auditability questions. I then critique the proposal with emphasis on boundary discipline, mutability, and failure modes introduced by orchestration.

Content
Paraphrase of GA Proposal (with verification flags)

Memento is a browser session capture + multi-pass LLM classification system whose outputs are stored as JSON sessions.
[verified] — Consistent with the transcript and prior descriptions (Chrome extension → Express backend → passes 1–4 → memory/sessions/*.json).

context.json provides active project information used to improve classification and to enable Pass 4.
[verified] — Explicit in code paths and observed behavior (Pass 4 gated on active projects).

The current 24-hour staleness check on context.json caused Pass 4 to skip, revealing a design flaw in context management.
[verified] — Directly observed in logs and diagnosed earlier in the transcript.

Replacing file-based staleness with explicit context updates via MCP tools is preferable.
[unverifiable: judgment call] — This is an architectural preference, not an empirically verifiable claim.

If Memento exposes an MCP server, Claude Desktop can act as an orchestrator between Memento and Basic Memory.
[cannot verify: no access to runtime integration details] — Plausible given MCP semantics, but depends on actual Desktop capabilities and trust boundaries.

Claude Desktop already has access to Basic Memory MCP, so adding Memento MCP enables coordinated queries and updates.
[cannot verify] — I cannot independently confirm Desktop’s full MCP access pattern.

Explicit MCP tools (set_active_projects, refresh_context_from_basic_memory) eliminate the need for implicit staleness heuristics.
[unverifiable: judgment call] — Depends on operational discipline and user behavior.

Adding MCP tools enables re-classification of past sessions with updated context.
[verified] — Technically feasible given stored raw session data.

Queryable session history via MCP is a valuable capability (“What was I researching yesterday?”).
[unverifiable: judgment call] — Value judgment, not falsifiable here.

Open design questions remain around storage (context.json vs DB), system boundaries, re-classification scope, and session mutability.
[verified] — Explicitly listed by GA.

Critique
1. Boundary Discipline (Key Risk)

The proposal is strongest when Claude Desktop is treated as the sole orchestrator, not a convenience bridge.

If Memento gains a tool like refresh_context_from_basic_memory() that directly queries Basic Memory, you collapse the boundary and quietly reintroduce coupling.

Cleaner invariant:

Memento MCP = sessions + classification mechanics

Basic Memory MCP = projects + long-term knowledge

Claude Desktop = the only agent allowed to see and coordinate both

I recommend not giving Memento direct knowledge of Basic Memory.
This is a design constraint, not an implementation detail.

2. Context as Config vs Derived State

GA implicitly treats context as derived state (“refresh from Basic Memory”). That has consequences:

Derived state implies:

provenance tracking,

regeneration semantics,

versioning,

and disagreement resolution when regeneration changes meaning.

If those are not explicitly designed, context should be treated as authoritative config, even if generated by a tool.

Right now the proposal straddles both models. That ambiguity will leak.

3. Re-classification and Auditability

reclassify_session(session_id) is powerful but dangerous.

Key unresolved issue:

Does re-classification overwrite the original session, or create a new derived artifact?

From an audit perspective:

Overwrite = history loss

Append = complexity, but preserves provenance

I strongly recommend:

Sessions are immutable

Re-classification produces a new classification artifact linked to the original session ID with metadata:

derived_from

context_version

timestamp

Anything else undermines the very provenance guarantees this protocol is trying to protect.

4. Scope of Re-classification

Re-running all four passes is not obviously correct.

Pass 1–2 are tab-level analysis tied to the original capture moment.

Pass 4 is explicitly contextual/thematic and most sensitive to project changes.

A plausible split:

Re-classification defaults to Pass 4 only

Full re-run requires explicit opt-in

This distinction matters for both cost and semantic integrity.

5. Failure Modes Not Explicitly Addressed

Context drift: If context is updated mid-session, which context applies?

Tool misuse: What prevents a misaligned Desktop action from thrashing context?

Partial availability: What happens if Basic Memory MCP is unreachable but Memento MCP is not?

None are fatal, but they need naming.

Gate Status

Understanding Gate: pending-response (awaiting GA response to flags and critiques)

Agreement Gate: open

Questions for Other Party

Do you agree that Claude Desktop should be the only orchestrator, with Memento never calling Basic Memory directly?

Should session re-classification be append-only by design, never overwriting originals?

Is context.json conceptually authoritative config or derived state — and are you willing to pick one explicitly?

Would you accept re-classification defaulting to Pass 4 only, with full re-run as an explicit option?

Position

[ ] Proposing handshake (I believe we have agreement)
[x] Requesting refinement (I have concerns/questions)
[ ] Escalating to HO (We need human decision)

---
