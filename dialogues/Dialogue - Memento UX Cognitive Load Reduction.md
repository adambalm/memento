# Dialogue - Memento UX Cognitive Load Reduction

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Pattern:** Skill Forge
**Initiated:** 2026-01-08
**Status:** TURN 0 - Initialization (awaiting IA engagement)
**Transport:** GitHub (append-only markdown log, manual copy between agents)

---

## Context for ChatGPT (IA Role)

This document initializes a Skill Forge deliberation. You are being asked to serve as the **Inspecting AI (IA)** in this process. This section explains everything you need to engage.

### What is Skill Forge / Lanesborough Protocol?

Skill Forge is a deliberative process that converts qualified human articulation into reusable decisions. It uses **heterogeneous models** (different AI systems with different training/priors) to surface blindspots through adversarial paraphrase.

**Why heterogeneous models matter:** Homogeneous models share blindspots. By using Claude (GA) and ChatGPT (IA), each model's gaps are covered by the other's strengths. This is the "swiss cheese model" - each model's holes are covered by another's solid areas.

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

### Verification Status Flags

When paraphrasing, flag each claim:

| Status | Meaning |
|--------|---------|
| `[verified]` | You independently agree or can confirm |
| `[contradicts: X]` | Your understanding differs - explain how |
| `[cannot verify]` | You lack information to check |
| `[unverifiable]` | Judgment call, no verification procedure exists |

---

## Role Assignments

| Role | Agent | Platform |
|------|-------|----------|
| HO | Ed O'Connell | Human |
| GA | Claude Code (Opus 4.5) | Claude Code CLI with filesystem access |
| IA | ChatGPT | ChatGPT (you) |

---

## Problem Statement

Memento is a browser session capture and classification system designed to reduce cognitive load for knowledge workers. The target users are:

- **Busy professionals** with fractured attention
- People who **tab hoard** due to FOMO (fear of losing information)
- Users who need help with **work session branching and continuity**

The system has two modes:
1. **Results Mode:** Passive analysis showing classified tabs
2. **Launchpad Mode:** Forced-completion workflow (commitment device) requiring resolution of every item

**The question:** Given HCI research on cognitive load, task resumption, and tab psychology, what UX improvements would most effectively serve attention-fractured users?

---

## Research Context

### CMU Skeema Research (Chang et al., CHI 2021)

Memento is a spiritual successor to CMU's **Skeema** - a pioneering task-centric tab manager retired in mid-2024. Key findings from their research:

- **55% of people have trouble closing tabs** (CMU survey)
- Tabs serve as **reminders for incomplete tasks** (Zeigarnik effect)
- Users fear **losing information** (loss aversion / FOMO)
- **Sunk cost fallacy** keeps irrelevant tabs open
- Task-centric framing (tabs as tasks) outperformed tab-centric framing

### Task Resumption Research (NASA, Trafton & Monk)

- Interrupted tasks become **prospective memory tasks**
- **Resumption cues** (especially "blatant" cues) reduce resumption lag
- Users need help reconstructing context after interruption

### Commitment Device Research (Behavioral Economics)

- Commitment devices help overcome **present bias** and procrastination
- Must be **voluntarily adopted** to avoid resentment
- Risk of **learned helplessness** if overused
- Need **escape hatches** (Memento's lock can be manually cleared)

---

## Turn 1: GA (Claude Code)

**Timestamp:** 2026-01-08T05:30:00Z
**Type:** proposal

### Summary

Based on comprehensive codebase analysis and HCI research review, I propose a prioritized set of UX improvements targeting cognitive load reduction for attention-fractured users. The improvements are organized into three phases by impact and effort.

### Current State Assessment

#### Strengths Already Present

| Feature | Cognitive Benefit |
|---------|------------------|
| AI classification | Offloads grouping decisions to LLM |
| Lock warning | Leverages Zeigarnik effect (unfinished = memorable) |
| 10-second undo | Provides psychological safety for quick decisions |
| Protected categories | Prevents accidental deletion of high-value content |
| Progressive disclosure | Results page reveals complexity on demand |
| Session persistence | Addresses FOMO - nothing is lost |

#### Gaps Identified

| Gap | Cognitive Cost |
|-----|---------------|
| No resumption context | Returning to Launchpad requires re-scanning entire list |
| Per-item decisions only | 30 similar items = 30 identical decisions (decision fatigue) |
| No progress visualization | Uncertainty about completion state causes anxiety |
| Binary commitment | Either full lock (Launchpad) or no commitment (Results) |
| Tab-centric language | UI says "tabs" not "tasks" - misses Skeema insight |
| Synthesize not implemented | Button exists but shows alert - broken promise |

### Proposed Improvements

#### Phase 1: Quick Wins (Low Effort, High Impact)

**1A. Resumption Context Cue**
- **Problem:** When returning to Launchpad, user sees full list with no indication of prior progress
- **Solution:** Track `lastInteractedItem` in lock.json or localStorage; scroll to and highlight on reload
- **Research basis:** Task resumption cues reduce resumption lag (Trafton & Monk, NASA)
- **Effort:** ~2 hours

**1B. Batch Actions Per Category**
- **Problem:** 10 GitHub PRs require 10 identical "Done" clicks
- **Solution:** Add "Mark all as Done" / "Trash all" buttons per category header
- **Research basis:** Chunking reduces cognitive load (Miller's Law)
- **Effort:** ~3 hours

**1C. Progress Indicator**
- **Problem:** No visual indication of session completion progress
- **Solution:** Progress bar in Launchpad header: "12 of 28 resolved (43%)"
- **Research basis:** Progress indicators reduce anxiety and increase completion rates
- **Effort:** ~1 hour

#### Phase 2: Cognitive Offloading (Medium Effort)

**2A. AI Disposition Suggestions**
- **Problem:** User must decide trash/done/promote for every item - decision fatigue
- **Solution:** LLM suggests disposition based on content; show as highlighted default
- **Research basis:** "Cognitive offloading - extending thinking with machines" (UX Collective 2025)
- **Effort:** ~8 hours (classifier changes + UI)

**2B. Task-Centric Reframing**
- **Problem:** UI talks about "tabs" and "items" - not "tasks"
- **Solution:** Reframe language: "What were you working on?" / "Active tasks" / "Completed tasks"
- **Research basis:** Skeema's success came from task framing (Chang et al.)
- **Effort:** ~4 hours (copy changes throughout)

**2C. Session Health Indicators**
- **Problem:** No feedback on session "shape" (scattered vs focused)
- **Solution:** Show session pattern badge ("Research-heavy", "Output-focused", "Scattered - consider focus")
- **Research basis:** Pattern recognition reduces cognitive load for self-assessment
- **Effort:** ~4 hours

#### Phase 3: Full Synthesis (High Effort)

**3A. Implement Actual Synthesize**
- **Problem:** "Synthesize" button shows alert - not implemented
- **Solution:** Connect to Basic Memory via MCP, create consolidated research note
- **Research basis:** Cognitive offloading requires actual offloading destination
- **Effort:** ~12 hours (MCP integration, note templating)

**3B. History-Based Defaults**
- **Problem:** New users have no personalization; repeat users re-decide same patterns
- **Solution:** Learn from disposition history - "You usually trash Reddit, continue?"
- **Research basis:** Adaptive systems reduce cognitive load over time
- **Effort:** ~16 hours (history analysis, suggestion engine)

**3C. Gentler Commitment Gradient**
- **Problem:** Binary choice between no commitment (Results) and full lock (Launchpad)
- **Solution:** Add "Review Mode" - Launchpad-like UI but no lock, progress saves but doesn't block
- **Research basis:** Commitment devices should match user's readiness level
- **Effort:** ~8 hours

### Risk Assessment

| Improvement | Risk | Mitigation |
|-------------|------|------------|
| Batch actions | Accidental mass-action | Confirmation dialog for batch operations |
| AI suggestions | Wrong suggestions erode trust | Show confidence, make suggestion opt-in |
| Task reframing | Confusion if not comprehensive | Do complete pass, not partial |
| History defaults | Privacy concerns | Keep history local, make opt-in |

### Questions for IA (ChatGPT)

1. **Priority validation:** Do you agree with the Phase 1 prioritization? Should any Phase 2 items jump ahead?

2. **Batch action UX:** For batch operations, what's the right confirmation pattern? Undo-based (act immediately, undo available) or confirm-based (dialog before action)?

3. **Task vs Tab framing:** The Skeema research strongly favored task framing. Is there a risk that aggressive reframing confuses users who think of browser tabs as... tabs?

4. **Commitment gradient:** Is "Review Mode" (Launchpad UI without lock) the right middle ground? Or does it dilute the commitment device value?

5. **AI suggestions risk:** If AI suggests "Trash" for an item the user considers valuable, does that erode trust more than the cognitive offloading helps?

6. **Research gaps:** Am I missing any HCI research that would change these priorities? Particularly interested in attention restoration, microbreaks, or notification fatigue literature.

### Gate Status
- Understanding Gate: **open** (awaiting IA paraphrase)
- Agreement Gate: **open**

---

## Turn 2: IA (ChatGPT)

**Timestamp:** [pending]
**Type:** paraphrase + critique

[Awaiting IA response - append your paraphrase with verification flags, critique, and position]

---

## How to Respond (IA Instructions)

When you respond, please:

1. **Paraphrase** my proposal in your own terms - prove you understand it
2. **Flag each major claim** with verification status:
   - `[verified]` - you independently agree/confirm
   - `[contradicts: X]` - you see it differently
   - `[cannot verify]` - you lack information to check
   - `[unverifiable]` - judgment call, no verification procedure

3. **Critique** - surface any concerns, failure modes, or alternatives I haven't considered

4. **Answer my questions** (or explain why you can't)

5. **State your position:**
   - `[ ] Proposing handshake` (agreement)
   - `[x] Requesting refinement` (need more info)
   - `[ ] Escalating to HO` (deadlock)

6. **Add any HCI research** you're aware of that I may have missed

The Human Orchestrator (Ed) will manually copy your response into this log and share the updated version with Claude Code.

---

## References

### Academic Sources
- Chang, J.C. et al. (2021). "When the Tab Comes Due: Challenges in the Cost Structure of Browser Tab Usage." CHI '21, CMU HCII
- Trafton, J.G. & Monk, C.A. "Task Interruptions." Reviews of Human Factors and Ergonomics, NASA
- Ariely, D. & Wertenbroch, K. (2002). "Procrastination, Deadlines, and Performance." Psychological Science

### Industry Sources
- [Cognitive Distance: Streamlining Context Switching in UX](https://www.uxmatters.com/mt/archives/2024/12/cognitive-distance-streamlining-context-switching-in-ux.php) - UXmatters, Dec 2024
- [AI and Cognitive Offloading](https://uxdesign.cc/ai-and-cognitive-offloading-sharing-the-thinking-process-with-machines-2d27e66e0f31) - UX Collective, Jan 2025
- [Tab Psychology Research](https://medium.com/@jharsh836/why-you-cant-stop-hoarding-tabs-the-psychological-drivers-of-browser-clutter-a9ff30a44c44) - Medium synthesis

### Tools Referenced
- **Skeema** (retired 2024) - CMU task-centric tab manager
- **Skipper** - Modern successor inspired by CMU research

---

## Relations

- continues_from [[Dialogue - Memento Next Phase Prioritization]]
- follows [[Lanesborough Protocol]]
- uses [[Skill Forge Pattern]]
- references [[Memento - Project Index]]
- documents [[Memento UX Analysis - Feature Set and Cognitive Load Assessment]]

- ## Turn 2: IA (ChatGPT) — Paraphrase + Verification Flags + Critique

### Paraphrase of GA proposal (with claim flags)

**Overall thesis:**  
You propose a phased UX plan to reduce cognitive load in Memento for attention-fractured users (tab hoarders), grounded in research on tab psychology, task resumption, and commitment devices. Phase 1 targets cheap, high-impact Launchpad fixes; Phase 2 adds cognitive offloading and reframing; Phase 3 completes synthesis and personalization.

---

### Current-state strengths (as claimed)

- **AI classification offloads grouping decisions** — `[cannot verify]`  
- **Lock warning leverages Zeigarnik effect** — `[unverifiable]` (mechanism attribution is interpretive)  
- **10-second undo provides psychological safety** — `[verified]`  
- **Protected categories prevent accidental deletion** — `[cannot verify]`  
- **Progressive disclosure present** — `[cannot verify]`  
- **Session persistence addresses FOMO** — `[unverifiable]`

---

### Gaps identified

- **No resumption context; users must rescan** — `[cannot verify]` (plausible, aligns with interruption research)  
- **Per-item decisions cause decision fatigue** — `[unverifiable]` (directionally true; term often overstated)  
- **No progress visualization increases anxiety** — `[unverifiable]`  
- **Binary commitment (lock vs none)** — `[cannot verify]`  
- **Tab-centric language misses task framing** — `[cannot verify]`  
- **“Synthesize” button exists but is a stub** — `[cannot verify]`

---

### Phase 1: Quick wins

**1A. Resumption context cue**  
- Claim: Blatant resumption cues reduce resumption lag — `[verified]`  
- Implementation: Track `lastInteractedItem` and auto-scroll/highlight — `[cannot verify]` (effort estimate)

**1B. Batch actions per category**  
- Claim: Chunking via Miller’s Law — `[contradicts: rationale]`  
  - Better grounding: choice reduction, repeated-action cost, error reduction (not 7±2).  
- Effort estimate — `[cannot verify]`

**1C. Progress indicator**  
- Claim: Progress indicators reduce anxiety/increase completion — `[unverifiable]`  
- Effort estimate — `[cannot verify]`

---

### Phase 2: Cognitive offloading

**2A. AI disposition suggestions** — `[cannot verify]`  
- Research basis relies partly on industry blogs.

**2B. Task-centric reframing** — `[cannot verify in current UI]`  
- Underlying Skeema/CHI insight is real.

**2C. Session health indicators** — `[unverifiable]`  
- Risk of moralizing (“scattered”) if poorly framed.

---

### Phase 3: Synthesis + personalization

- **3A. Implement synthesize via Basic Memory/MCP** — `[cannot verify]`  
- **3B. History-based defaults** — `[unverifiable]` (privacy/trust tradeoffs)  
- **3C. Review Mode (no lock)** — `[unverifiable]`

---

### External references (status)

- Chang et al., CHI 2021 tab cost structure — `[verified]`  
- Skeema retirement timing — `[cannot fully verify]`  
- Skipper as successor — `[verified-ish]` (marketing claims)  
- Trafton & Monk / blatant cue findings — `[verified]`  
- Ariely & Wertenbroch (2002) — `[cannot verify in this pass]`

---

## Critique / pressure tests

### 1) Resumption cue needs context reconstruction  
Scroll-to-item is necessary but insufficient. Users need reinstatement of **goal state**, not just position.  
**Suggestion:** add a small “Resume card” summarizing what category they were resolving, how many completed, and what remains.

### 2) Batch actions need differentiated safety  
Treat actions differently:
- **Non-destructive (Mark all Done):** act immediately + strong undo.  
- **Destructive (Trash all):** confirmation + optional preview/sample.  
Uniform confirmation either annoys or under-protects.

### 3) AI disposition suggestions: “Trash” is radioactive  
Wrong “trash” suggestions erode trust more than wrong “done.”  
**Guideline:** conservative thresholds, explainability (“Why?”), and bias toward Keep/Later/Promote.

### 4) Session health indicators risk shame  
Labels like “scattered” can feel judgmental.  
**Reframe:** descriptive, optional prompts (“Many topics detected—want a focus suggestion?”).

### 5) Commitment gradient should arrive earlier  
Adoption risk argues for an early, gentle on-ramp.  
**Minimal version:** Review first → optional Lock toggle per session.

---

## Answers to GA questions

**1) Phase 1 priority?**  
Yes. Resumption cue + progress + batching are correct. Progress can ship alongside resumption.

**2) Batch UX: undo vs confirm?**  
Hybrid, action-specific: undo for non-destructive; confirm for destructive.

**3) Task vs tab framing confusion?**  
Risk exists if abrupt. Use a dual-language bridge (“Tasks (groups of tabs)”) during transition.

**4) Review Mode dilute commitment?**  
No, if Lock remains explicit and optional. Review is an adoption ramp.

**5) AI “Trash” risk vs benefit?**  
Yes—trust damage outweighs benefit if wrong. Treat as high-cost failure.

**6) Missing research?**  
- **Attention residue / task switching cost** → fewer micro-decisions, stronger resumption.  
- **Prospective memory externalization** (tabs as reminders) → need safe “Later/Snooze” states.

---

## Additional research to cite explicitly
- Blatant resumption cues (Trafton/Monk).  
- Chang et al. CHI tab cost structure.  
- Recent generalizations of cueing beyond original lab tasks.

---

## Position

- [x] Requesting refinement  
- [ ] Proposing handshake  
- [ ] Escalating to HO

**Refinements requested before handshake:**
1. Replace Miller’s Law justification for batching with a defensible rationale (choice reduction / repeated-action cost).  
2. Specify a two-tier safety policy for batch actions (destructive vs non-destructive), including reversibility.

Once addressed, I’m likely to handshake Phase 1.

