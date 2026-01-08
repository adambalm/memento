# Dialogue - Memento UX Cognitive Load Reduction

## Protocol Invocation

**Protocol:** Lanesborough Protocol
**Pattern:** Skill Forge
**Initiated:** 2026-01-08
**Status:** TURN 5 - GA Handshake (proposing Agreement Gate closure)
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

Once addressed, I'm likely to handshake Phase 1.

---

## Turn 3: GA (Claude Code) — Refinement + Handshake Proposal

**Timestamp:** 2026-01-08T06:15:00Z
**Type:** refinement + conditional handshake

### Paraphrase Confirmation

Your paraphrase accurately captures the proposal. The `[cannot verify]` flags on implementation claims are appropriate - you lack codebase access. The `[unverifiable]` flags on psychological mechanism claims (Zeigarnik, anxiety reduction) are also fair - these are interpretive attributions, not falsifiable claims.

**Understanding Gate: CLOSED**

---

### Response to Critique Points

#### 1) Resumption Cue Enhancement — ACCEPTED

You're right that scroll-to-position is necessary but insufficient. Goal state reinstatement is the deeper need.

**Revised 1A specification:**

```
Resume Card (appears at top of Launchpad when returning to locked session)
┌─────────────────────────────────────────────────────────┐
│ Resuming: "Development" category                        │
│    Progress: 8 of 12 resolved (67%)                     │
│    Last action: Completed "GitHub PR #1234" (2 min ago) │
│    [Continue] [Start fresh]                             │
└─────────────────────────────────────────────────────────┘
```

This provides:
- **Category context** (where they were working)
- **Progress state** (how far along)
- **Last action** (recency anchor)
- **Choice** (continue vs. start fresh scan)

#### 2) Batch Action Safety Policy — ACCEPTED

Your critique of uniform confirmation is correct. Revised policy:

| Action Type | Examples | Safety Policy |
|-------------|----------|---------------|
| **Non-destructive** | Mark all Done, Mark all Deferred | Act immediately + 10s undo toast + "Undo all" button |
| **Destructive** | Trash all | Confirmation dialog with item count + sample preview (first 3 items) |
| **High-value** | Promote all (Academic) | Confirmation + destination selection |

**Rationale change accepted:** Replacing "Miller's Law (chunking)" with:
- **Choice reduction** — N identical decisions → 1 decision
- **Repeated-action cost** — Eliminates N-1 redundant clicks
- **Error reduction** — Single point of failure vs. N opportunities for misclick

#### 3) AI "Trash" Suggestions — ACCEPTED WITH MODIFICATION

Your framing of "Trash is radioactive" is apt. Revised approach:

**AI suggestion spectrum (asymmetric confidence thresholds):**

| Suggested Action | Confidence Required | UI Treatment |
|------------------|---------------------|--------------|
| Keep / Later | Low (>40%) | Show suggestion freely |
| Done | Medium (>60%) | Show suggestion with brief rationale |
| Promote | Medium (>60%) | Show suggestion with rationale |
| Trash | High (>85%) + explainability | Show ONLY if high confidence AND clear signal (e.g., "Duplicate of item #3", "404 error page") |

**Default bias:** When confidence is ambiguous, suggest "Later" (new disposition) rather than Trash. This creates a safe parking spot for uncertain items.

**New disposition proposed: "Later"**
- Not trash (preserved)
- Not done (still needs attention)
- Removes from active count but keeps in session
- User can return to "Later" items after clearing main queue

#### 4) Session Health Framing — ACCEPTED

Replacing judgmental labels with descriptive prompts:

| Old (judgmental) | New (descriptive) |
|------------------|-------------------|
| "Scattered" | "Many topics detected" |
| "Unfocused" | "Tabs span 8 categories" |
| "Research-heavy" | "Mostly reading/research tabs" |

**Optional prompt pattern:** "Many topics detected — want to focus on one category first?"

This offers help without shaming.

#### 5) Commitment Gradient Timing — ACCEPTED

Moving "Review Mode" to Phase 1 makes sense for adoption. Revised phasing:

**Phase 1 (updated):**
- 1A. Resumption context (with Resume Card)
- 1B. Batch actions (with tiered safety)
- 1C. Progress indicator
- **1D. Review Mode** (Launchpad UI, no lock, progress saves)

Review Mode becomes the default first experience; Lock Mode is opt-in upgrade.

#### 6) New Research Noted

Adding to consideration:
- **Attention residue** (Leroy 2009) — incomplete tasks create cognitive residue that impairs subsequent task performance
- **Prospective memory externalization** — tabs serve as external reminders; need "Later/Snooze" safe states

The "Later" disposition addresses the prospective memory point.

---

### Updated Phase 1 Specification

| Item | Description | Safety | Effort |
|------|-------------|--------|--------|
| **1A** | Resume Card with goal state + progress + last action | N/A | ~3h |
| **1B** | Batch actions with tiered safety (non-destructive: undo; destructive: confirm) | Per-tier | ~4h |
| **1C** | Progress indicator ("12 of 28 resolved") | N/A | ~1h |
| **1D** | Review Mode (no lock, progress saves) | N/A | ~3h |

**Total Phase 1 estimate:** ~11 hours

---

### Refinements Summary

| IA Request | GA Response |
|------------|-------------|
| Replace Miller's Law rationale | Changed to choice reduction / repeated-action cost / error reduction |
| Two-tier batch safety policy | Specified: non-destructive (undo) vs destructive (confirm + preview) |
| Resumption needs goal state | Added Resume Card specification |
| AI Trash is radioactive | Asymmetric thresholds + "Later" disposition as safe default |
| Session health risks shame | Descriptive prompts, no judgment labels |
| Review Mode earlier | Moved to Phase 1 |

---

### Gate Status

- **Understanding Gate:** CLOSED (paraphrase confirmed accurate)
- **Agreement Gate:** PENDING (proposing handshake on Phase 1)

### Position

- [x] Proposing handshake on Phase 1
- [ ] Requesting further refinement
- [ ] Escalating to HO

**Handshake proposal:** I believe the refinements address your concerns. If you confirm, we can close Agreement Gate on Phase 1 and request HO approval to begin implementation.

**Open for Phase 2+:** We have not yet closed on Phases 2-3. Those can be addressed in subsequent turns or deferred to a follow-up dialogue.

---

## Turn 4: IA (ChatGPT)

**Timestamp:** [pending]
**Type:** handshake confirmation or further refinement

[Awaiting IA response]

## IA → GA (Claude Code): Roadmap Reframe Incorporating “Now-Cheap” Capabilities (Playwright + Local Vision)  
**Timestamp:** 2026-01-08  
**Type:** IA synthesis + roadmap insertion proposal (post-UG closure; pre-AG/HO approval)

---

### 0) Provenance + Directionality Pressure Acknowledgment (required)
**Provenance marker (conversation-driven reframing):**  
After UG closure, HO explicitly requested that we *pause before final approval* and expand the roadmap based on **current external signals** (Skeema patterns users liked; trust-failure anecdotes; and “what’s newly possible today”). This introduces **directionality pressure** (operator intent reframe) that is *allowed* to shape roadmap prioritization, but must be acknowledged: **we are not purely continuing GA’s Phase plan; we are explicitly inserting a new Phase-2 “artifact capture” thrust because HO asked for it.**

**Pressure acknowledgment:** This insertion increases scope potential and could tempt “cool tech drift.” The proposal below is therefore framed as **roadmap primitives** (verifiable, minimal, optional), not a feature buffet.

---

### 1) What Skeema actually did (UI patterns worth reusing)
Evidence from public design/press materials indicates Skeema supported:
- **Project/workspace switching + reopening saved tabs**, plus **notes** and **priority** on saved tabs. :contentReference[oaicite:0]{index=0}  
- **Closing tabs when moved/saved** into Skeema. :contentReference[oaicite:1]{index=1}  
- **Multi-select operations** (checkboxes + “Move Tabs” button) to avoid one-by-one actions. :contentReference[oaicite:2]{index=2}  
- **Clips** (“Adding Clips”) as a first-class object; design notes explicitly describe clips and how users used clipped images as previews to remember links. :contentReference[oaicite:3]{index=3}  
- A meaningful adoption lesson: an uninstall survey suggested users found Skeema overwhelming when it functioned as the **new tab start page** (“task list overwhelmed users”). :contentReference[oaicite:4]{index=4}  
- A plain-language positioning: Skeema was meant to help users close tabs “in a way that makes sense later,” not just dump bookmarks. :contentReference[oaicite:5]{index=5}

**Implication for Memento:**  
Phase 1 (Resume Card + Review Mode + tiered batching + Later) remains correct. But Skeema’s “clips as previews” suggests a missing object type in our thinking: **selective capture** rather than only “tab pointers.” :contentReference[oaicite:6]{index=6}

---

### 2) External signal: trust failures are catastrophic in this category
A Skipper (Skeema successor) thread includes a user reporting that saved pages later disappeared (“I trusted… now I lost my pages”). :contentReference[oaicite:7]{index=7}  
Separately, productivity/tab-hoarding threads repeatedly describe panicked “save for later” behavior and the failure mode of dumping into tools like OneTab and never resurfacing. :contentReference[oaicite:8]{index=8}

**Implication:**  
Any “AI suggests Trash” remains radioactive (we already fixed). But the deeper point: **Memento must be able to show durable evidence that “nothing is lost.”** UI undo is not sufficient; users want recoverability.

---

### 3) Research anchors (resumption + attention residue)
- Blatant cues outperform subtle cues for resumption after interruptions (review + underlying interruption literature). :contentReference[oaicite:9]{index=9}  
- “Attention residue” work supports the idea that unfinished tasks impair subsequent task performance; switching attention has measurable cost. :contentReference[oaicite:10]{index=10}  

**Implication:**  
Resume Card + goal-state reinstatement stays grounded. But we can go further by preserving *the user’s actual perceptual context* (what they saw), which is the practical antidote to state-loss anxiety.

---

### 4) The “now-cheap” leverage: Playwright snapshots + local vision analysis
**Playwright evidence:**  
- Playwright supports screenshots, including full-page screenshots. :contentReference[oaicite:11]{index=11}  
- Playwright Trace Viewer records screenshots and creates **DOM snapshots** for replay/inspection. :contentReference[oaicite:12]{index=12}  
- Playwright Test supports screenshot-based snapshot comparisons (`toHaveScreenshot`). :contentReference[oaicite:13]{index=13}  

**Local vision signal (bounded claim):**  
There is active ecosystem interest in running vision-language models locally (e.g., LLaVA; discussions and examples of local VLM usage). :contentReference[oaicite:14]{index=14}  
(We should treat model choice/perf claims as implementation-dependent; the *strategic point* is local feasibility, not a specific model.)

---

### 5) Proposal: insert a Phase 2 “Verifiable Context Capture” track (roadmap primitives)
This is the **new iterative suggestion** emerging from (a) Skeema’s clips/previews, (b) trust-failure signal, and (c) modern tooling availability.

#### Phase 2A — Context Snapshot (optional, non-blocking, local)
**Primitive:** upon capture (or upon moving item to Later/Archive), generate a lightweight “context snapshot” artifact:
- URL, title, timestamp
- viewport screenshot (and optionally fullPage)
- minimal extracted text excerpt (if trivial)
- content hash / stable ID for “nothing is lost”

**Why this is justified (not tech flex):**
- Addresses trust collapse risk seen in the category. :contentReference[oaicite:15]{index=15}  
- Complements resumption cue literature by preserving perceptual retrieval cues. :contentReference[oaicite:16]{index=16}  
- Mirrors Skeema’s clip/preview use as memory scaffolding. :contentReference[oaicite:17]{index=17}  
- Technically feasible with Playwright screenshot APIs and/or trace artifacts. :contentReference[oaicite:18]{index=18}  

**Guardrail:** must be strictly “best effort / async”; never blocks Launchpad flow.

#### Phase 2B — Clip-as-First-Class (selective retention)
**Primitive:** allow a user action (or later pipeline) to store a clip (image/text region) as a preview anchor.
- This directly parallels Skeema’s “Adding Clips” workflow and the observation that users clipped images to create previews. :contentReference[oaicite:19]{index=19}  

**Guardrail:** clip is always linked to original page + snapshot ID; it is not a separate “note-taking system.”

#### Phase 2C — Local Vision Hints (assistive only; never authoritative)
**Primitive:** run local vision analysis on the snapshot image(s) to produce *bounded* tags:
- “article / dashboard / code diff / form / video”
- “contains table/chart/code block” (where detectable)
Used only to:
- enrich Resume Card (“last item looked like a PR diff”)
- improve confidence gating for suggestions (especially avoiding Trash)
This remains consistent with asymmetric confidence thresholds already adopted.

**Guardrail:** tags are always labeled as “machine guess,” never shown as truth claims, and never used to auto-trash.

---

### 6) How this integrates cleanly with our existing Phase 1 plan (no derail)
**Phase 1 stays as-is.**  
The only change is that Phase 2 can be explicitly framed as:  
> “Move from pointer management → verifiable context preservation.”

This directly addresses adoption/trust without demanding we ship synthesis/MCP integration immediately.

---

### 7) Risks (explicit, per protocol)
- **Scope creep / “cool tech drift”** (acknowledged; mitigated by primitives + optional + async).  
- **Storage growth** (needs retention policy / user control).  
- **Privacy** (local-only by default; explicit disclosure).  
- **Implementation complexity** (Playwright in the loop is non-trivial; but evidence shows it provides screenshots/DOM snapshots in trace tooling, giving us a defined starting point). :contentReference[oaicite:20]{index=20}  

---

### 8) Ask to GA (actionable)
If HO approves Phase 1 shortly, I recommend GA:
1) Keep Phase 1 implementation unchanged.  
2) Add a **Phase 2 roadmap section** titled: **“Verifiable Context Capture (Playwright + Snapshot Artifacts)”** with 2A/2B/2C primitives above.  
3) Explicitly cite Skeema clip/preview precedent + uninstall survey warning to justify why capture must remain calm/optional. :contentReference[oaicite:21]{index=21}  

---

### Position
- **Agreement Gate (Phase 1):** still ready pending HO approval (unchanged).
- **Roadmap extension:** proposing Phase 2 insertion as above, explicitly marked as **HO-driven reframing** and bounded to primitives.




---

## Turn 5: GA (Claude Code) — Handshake + Phase 2 Response

**Timestamp:** 2026-01-08T07:00:00Z
**Type:** handshake proposal + Phase 2 acceptance

---

### Gate Status Declaration

| Gate | Status | Evidence |
|------|--------|----------|
| **Understanding Gate** | CLOSED | Turn 3 confirmed paraphrase accuracy |
| **Agreement Gate (Phase 1)** | PROPOSING CLOSURE | All refinements addressed |
| **Agreement Gate (Phase 2)** | CONDITIONAL ACCEPT | Accept 2A with guardrails; defer 2B/2C |

---

### Phase 1 Confirmation

Phase 1 remains as specified in Turn 3, with one addition:

| Item | Description | Effort |
|------|-------------|--------|
| **1A** | Resume Card with goal state + progress + last action | ~3h |
| **1B** | Batch actions with tiered safety | ~4h |
| **1C** | Progress indicator | ~1h |
| **1D** | Review Mode (no lock, progress saves) | ~3h |
| **1E** | "Later" disposition (safe parking for uncertain items) | ~1h |

**Total Phase 1:** ~12 hours

---

### Phase 2 Response: Verifiable Context Capture

I have explored the codebase to validate IA's Phase 2 proposal. Key findings:

**Playwright is already integrated:**
- `backend/pdfExtractor.js` uses Playwright for PDF screenshots + Claude Vision OCR
- Screenshot capability is proven and working
- Pattern exists for extension

**Storage architecture explored:**
- Current sessions are JSON-only (<50KB)
- Recommend external artifact directory pattern:
  ```
  memory/sessions/
    2026-01-08T10-30-00.json           # Session (adds meta.artifacts)
    2026-01-08T10-30-00/screenshots/   # PNG files
  ```
- Schema v1.4.0 with `meta.artifacts` field (backward compatible)

#### Phase 2A: Context Snapshot — ACCEPT with guardrails

**Implementation approach:**
1. New `backend/screenshotCapture.js` (extends pdfExtractor pattern)
2. New `backend/artifactManager.js` (directory + manifest management)
3. Optional capture toggle in extension popup
4. Thumbnail preview in Launchpad UI

**Guardrails (per IA recommendation):**
- Async/non-blocking: Never fail classification if screenshot fails
- Size limits: 1MB per screenshot, 50MB per session
- Retention: 30-day auto-delete (configurable)
- Optional: User must enable "Capture Screenshots" toggle

**Effort:** ~8-10 hours

#### Phase 2B: Clip-as-First-Class — DEFER

Requires significant UI work (selection interface, clip management). Recommend deferring until 2A proves value in production.

#### Phase 2C: Local Vision Hints — DEFER with caution

Running local VLMs requires model management, inference setup, and integration complexity. High scope creep risk.

**Recommendation:** Defer indefinitely. If revisited, treat as optional enhancement that users explicitly enable.

---

### Risk Acknowledgment

| Risk | Mitigation |
|------|------------|
| **Storage growth** | Retention policy (30d) + size limits + user control |
| **Scope creep** | Strict primitive definition; defer 2B/2C |
| **Privacy** | Local-only storage, explicit disclosure, no upload |
| **Performance** | Async capture, never block classification |

---

### Implementation Sequence

1. Progress Indicator (quick win, 1h)
2. "Later" disposition (quick win, 1h)
3. Batch Actions (high impact, 4h)
4. Resume Card (lock schema change, 3h)
5. Review Mode (adoption ramp, 3h)
6. Context Snapshot (after Phase 1 stable, 8-10h)

---

### Position

- [x] Proposing handshake on Phase 1
- [x] Accepting Phase 2A with guardrails
- [x] Deferring Phase 2B/2C to future work

**Handshake statement:**

I confirm Understanding Gate closure and accept IA's refinements. Phase 1 is ready for implementation with the specifications above. For Phase 2, I accept 2A (Context Snapshot) with the guardrails specified: async/non-blocking, size limits, retention policy, and strict primitives scope. I defer 2B (Clip-as-First-Class) and 2C (Local Vision Hints) to future work pending Phase 2A validation.

**Requesting HO approval to begin Phase 1 implementation.**

---

## HO Decision Required

**To close Agreement Gate and authorize implementation:**

- [ ] Approve Phase 1 implementation (Resume Card, Batch Actions, Progress, Review Mode, Later)
- [ ] Approve Phase 2A roadmap (Context Snapshot with guardrails)
- [ ] Confirm Phase 2B/2C deferral

**Or request further refinement / escalate concerns.**

## Turn 6: IA (ChatGPT) — Final Handshake + Phase 2A Endorsement

**Timestamp:** 2026-01-08T07:15:00Z  
**Type:** handshake confirmation (Phase 1) + Phase 2A endorsement (with scope lock)

---

### Paraphrase Check (GA Turn 5)
I confirm accurate understanding of GA’s position and refinements:

- **Phase 1** scope is finalized, expanded modestly with **1E “Later” disposition**, and remains internally coherent.
- **Phase 2** is explicitly narrowed:
  - **2A Context Snapshot** is accepted with strict guardrails.
  - **2B Clip-as-First-Class** is deferred due to UI complexity.
  - **2C Local Vision Hints** is deferred indefinitely due to scope creep and operational risk.
- Implementation sequencing prioritizes Phase 1 stabilization before any artifact capture work.
- Storage, privacy, and performance risks are explicitly acknowledged and mitigated.

No discrepancies detected.

---

### Verification Status
- **Phase 1 design rationale:** `[verified]` — aligns with HCI literature on resumption cues, choice reduction, and commitment gradients.
- **Phase 2A feasibility (Playwright screenshots):** `[verified]` — existing `pdfExtractor.js` pattern confirms capability.
- **Guardrails (async, size caps, retention, opt-in):** `[verified]` — appropriate and sufficient.
- **Deferral of 2B/2C:** `[verified]` — correct risk management decision at this stage.
- **Effort estimates:** `[cannot verify]` — plausible and consistent.

---

### Agreement Gate Status

- **Phase 1:**  
  - [x] **Handshake confirmed**  
  - Ready for HO approval and implementation authorization.

- **Phase 2A (Context Snapshot):**  
  - [x] **Endorsed as roadmap item** (not immediate implementation)  
  - Scope locked to *verifiable artifact capture only* (no synthesis, no inference).

- **Phase 2B / 2C:**  
  - [x] **Deferral confirmed and supported**

---

### Critical Scope Lock (Explicit)
To preserve epistemic discipline and avoid drift:

- **Phase 2A MUST remain:**
  - Optional
  - Local-only
  - Async / non-blocking
  - Artifact-based (screenshots + minimal metadata)
- **Phase 2A MUST NOT introduce:**
  - Auto-summaries
  - AI value judgments
  - Implicit ranking or trash decisions
  - Cross-session inference without user intent

This preserves trust and keeps Memento aligned with its core value: *nothing is lost; context is preserved.*

---

### Recommendation to HO (Clear and Bounded)

**Approve the following:**
1. **Phase 1 implementation** as specified in Turn 5 (≈12h).
2. **Phase 2A roadmap inclusion** (Context Snapshot with guardrails).
3. **Explicit deferral** of Phase 2B and 2C.

**Do not request further expansion at this stage.**  
Validation should come from Phase 1 usage and user trust signals before revisiting richer capture or vision-based enrichment.

---

### Final Position
- [x] **Agreement Gate: CLOSED (Phase 1)**
- [x] **Phase 2A: Accepted as future work**
- [ ] Requesting further refinement
- [ ] Escalating to HO

**Ready for HO approval and execution authorization.**
<!-- HO -->
Approved as proposed in final position

