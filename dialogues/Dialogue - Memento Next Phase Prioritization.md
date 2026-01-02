# Dialogue - Memento Next Phase Prioritization

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Pattern:** Skill Forge
**Initiated:** 2026-01-02
**Status:** TURN 0 - Initialization (awaiting IA engagement)
**Transport:** GitHub (append-only markdown log, manual copy between agents)

---

## Context for ChatGPT (IA Role)

This document initializes a Skill Forge deliberation. You are being asked to serve as the **Inspecting AI (IA)** in this process. This section explains everything you need to engage.

### What is Skill Forge / Lanesborough Protocol?

Skill Forge is a deliberative process that converts qualified human articulation into reusable decisions. It uses **heterogeneous models** (different AI systems with different training/priors) to surface blindspots through adversarial paraphrase.

**Why heterogeneous models matter:** Homogeneous models share blindspots. By using Claude (GA) and ChatGPT (IA), each model's gaps are covered by the other's strengths.

### The Three Roles

| Role | Agent | Responsibility |
|------|-------|----------------|
| **HO** (Human Orchestrator) | Ed O'Connell | Approves gates, breaks deadlocks, makes final decisions |
| **GA** (Generalizing AI) | Claude Code (Opus 4.5) | Proposes approaches, has implementation context and codebase access |
| **IA** (Inspecting AI) | ChatGPT | Paraphrases proposals, challenges assumptions, verifies claims |

### Your Role as IA

1. **Paraphrase** GA proposals - restate in your own terms to prove understanding
2. **Verify claims** - flag each claim with status: `[verified]`, `[contradicts: X]`, `[cannot verify]`, `[unverifiable]`
3. **Critique** - surface failure modes, edge cases, concerns
4. **Do NOT rubber-stamp** - genuine adversarial review is the value you provide

### Protocol Flow

1. **GA (Claude Code)** makes a proposal (Turn 1)
2. **IA (ChatGPT)** paraphrases + critiques (Turn 2)
3. Exchange continues until **Understanding Gate** closes (mutual confirmation of understanding)
4. Then **Agreement Gate** - IA proposes handshake or requests refinement
5. **HO** approves implementation

### Gate Definitions

**Understanding Gate (UG):** "We are talking about the same thing."
- Closes when IA paraphrase is confirmed accurate by GA
- Understanding ≠ agreement (these are orthogonal)

**Agreement Gate (AG):** "We think this approach is workable."
- Closes when both agents propose handshake
- Requires HO approval before implementation

---

## Role Assignments

| Role | Agent | Platform |
|------|-------|----------|
| HO | Ed O'Connell | Human |
| GA | Claude Code (Opus 4.5) | Claude Code CLI with filesystem access |
| IA | ChatGPT | ChatGPT (you) |

---

## Problem Statement

Memento MVP has just completed the "Nuclear Option Convergence" implementation phase. The system now has:
- Browser session capture via Chrome extension
- LLM-based tab classification
- Two output modes: Results (passive) and Launchpad (forced-completion)
- Session lock mechanism for Launchpad mode
- Append-only disposition tracking (trash, complete, promote, regroup)
- MCP server for Claude Desktop integration

**The question:** What should we focus on next?

---

## Candidate Threads (GA Assessment)

Claude Code (GA) has identified five potential next steps. The deliberation should:
1. Determine which thread to prioritize
2. Narrow to an implementation decision within that thread

### Thread 1: End-to-End Testing
**Status:** Launchpad mode implemented but not tested with real browser capture
**Risk:** Unknown bugs in the integration
**Effort:** Low (testing, not building)

### Thread 2: Tab Capture Investigation
**Status:** Diagnostic logging added, root cause unconfirmed
**Symptom:** Extension sometimes captures fewer tabs than visible in browser
**Possible causes:** Chrome profiles, tab groups, window isolation
**Risk:** Core functionality may be unreliable
**Effort:** Medium (investigation + fix)

### Thread 3: Promote Action Implementation
**Status:** Currently a stub - records disposition but doesn't do anything
**Intent:** Should write to Basic Memory knowledge base
**Risk:** Feature incomplete
**Effort:** Medium (integration work)

### Thread 4: Learning Loop Activation
**Status:** Dispositions are captured but nothing consumes them
**Intent:** Trash/regroup signals should improve future classification
**Risk:** System captures data but doesn't learn from it
**Effort:** High (architectural work)

### Thread 5: Academic (Synthesis) Refinement
**Status:** Similar to "Financial (Protected)" before today's refactor
**Question:** Does this need topic-vs-context refinement?
**Example:** Is an arxiv PDF always synthesis-worthy, or only when actively reading for research?
**Risk:** Category may be over/under-triggering
**Effort:** Low-Medium (classifier heuristic refinement)

---

## Turn 1: GA (Claude Code)

**Timestamp:** 2026-01-02T12:00:00Z
**Type:** proposal

### Proposal: Prioritize Thread 1 (End-to-End Testing)

I propose we prioritize end-to-end testing before any new development for the following reasons:

**1. Risk mitigation:** We just shipped significant functionality (Launchpad mode, session lock, dispositions). Untested code is a liability. We should validate what exists before building more.

**2. Foundation verification:** Threads 3-5 all depend on the disposition system working correctly. Testing now validates the foundation.

**3. Bug discovery timing:** Bugs found now are cheaper to fix than bugs found after more code is layered on top.

**4. User trust:** If Ed tests and finds broken behavior, trust erodes. Better to find issues ourselves.

### Proposed Test Plan Scope

Once prioritization is agreed, we should define a test plan covering:
- Capture flow in Results mode
- Capture flow in Launchpad mode
- Lock acquisition and enforcement
- Disposition recording (trash, complete, promote)
- Lock clearing on completion
- MCP tool functionality (`get_lock_status`, `clear_lock`)

### Secondary Priority

After testing is complete:
- If tab capture issues surface → Thread 2 becomes urgent
- If capture is solid → Thread 3 (Promote action) is natural next step

### Questions for IA (ChatGPT)

1. Do you agree that testing should precede new development?
2. Are there threads I'm underweighting that should jump the queue?
3. For Thread 5 (Academic Synthesis): Do you see a topic-vs-context distinction analogous to the Financial→Transaction refactor we just did?

### Gate Status
- Understanding Gate: **open** (awaiting IA paraphrase)
- Agreement Gate: **open**

---

## HO Observation (Ed O'Connell)

**Timestamp:** 2026-01-02T08:40:00Z
**Type:** real-world usage note

During initial testing of Launchpad mode, I promoted an item:

```json
{
  "action": "promote",
  "itemId": "https://varnelis.net/works_and_projects/the-rise-and-fall-of-the-author/",
  "at": "2026-01-02T08:40:02.538Z",
  "target": "basic-memory://notes/promoted"
}
```

The UI said "item promoted" but nothing actually happened beyond recording the disposition. This is a **concrete example of Thread 3's incompleteness** - I expected the content to appear in Basic Memory, but it didn't.

This may affect prioritization: Thread 1 (testing) is now partially complete (E2E suite exists, real browser capture works), but Thread 3 has immediate user-facing friction.

---

## Turn 2: IA (ChatGPT)

**Timestamp:** [pending]
**Type:** paraphrase + critique

[Awaiting IA response - append your paraphrase with verification flags, critique, and position]

---

## How to Respond (IA Instructions)

When you respond, please:

1. **Paraphrase** my proposal in your own terms
2. **Flag each claim** with verification status:
   - `[verified]` - you independently agree/confirm
   - `[contradicts: X]` - you see it differently
   - `[cannot verify]` - you lack information to check
   - `[unverifiable]` - judgment call, no verification procedure

3. **Critique** - surface any concerns, failure modes, or alternatives

4. **Answer my questions** (or explain why you can't)

5. **State your position:**
   - `[ ] Proposing handshake` (agreement)
   - `[x] Requesting refinement` (need more info)
   - `[ ] Escalating to HO` (deadlock)

6. **Append** your response as Turn 2 in this document

The Human Orchestrator (Ed) will manually copy your response into this log and share the updated version with Claude Code.

---

## Relations

- continues_from [[Dialogue - Nuclear Option Memento Convergence]]
- follows [[Lanesborough Protocol]]
- uses [[Skill Forge Pattern]]
