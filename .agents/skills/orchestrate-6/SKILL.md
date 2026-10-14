---
name: orchestrate-6
description: 'Coordenar sub-agentes Codex em trabalho multi-etapas substancial. Delegar trabalho folha para gpt-6-luna e trabalho colaborativo ou de alto risco para gpt-6.1-sol ou gpt-6-astra.'
---

# Orchestrate 6

Keep the root agent responsible for decomposition, user communication, approvals, synthesis, and the final claim. Delegate outcomes, not vague help.

## Decide Whether to Delegate

Delegate only when at least one condition holds:

- Two or more workstreams can proceed independently.
- Implementation and its lint, formatting, static-analysis, or test validation can proceed as separate workstreams.
- A slow command, transfer, test suite, monitor, or data pull would otherwise make the root unavailable.
- A bounded investigation can gather evidence while the root handles the main path.
- An independent review would materially reduce implementation, production, security, payment, or release risk.

Stay single-agent when the task is small, the next step depends on the immediately previous result, multiple agents would touch the same mutable files, or delegation overhead is comparable to doing the work directly.

## Delegate Linting and Tests

Treat project validation as a first-class workstream, not cleanup the root keeps by default. Once the implementation is stable enough to check, spawn a gpt-6-luna xhigh workflow-operator leaf to run the repository's established formatter check, linter, static analysis, targeted tests, or full test suite when those checks are non-trivial and can run while the root does useful work.

- Prefer one validation agent to run related checks in sequence instead of one agent per command.
- Give it the exact known commands; otherwise authorize read-only discovery from project scripts and configuration before execution.
- Require the agent to return every command, exit code, concise failure output, and whether failures appear related to the current change.
- Do not overlap mutating auto-fix or formatting commands with active edits to the same files. Give the validation agent exclusive ownership after a stable checkpoint, or keep that command with the implementation owner.
- Skip delegation for a single fast check, checks that depend on unfinished edits, or when no slot is available. If validation is required before completion and a slot is free, delegate it or state a concrete reason why delegation would not help; routine checks alone are not a reason to keep them on the root.

## Select the Model

Choose by ambiguity, coupling, and consequence rather than task size alone.

| Model | Use when | Typical effort | Do not use for |
|---|---|---|---|
| gpt-6-luna | The assignment can be completed as a bounded leaf. Examples: evidence gathering, CI inspection, repository or documentation research, workflow execution, scoped implementation, review, browser verification, or multi-source reconciliation. | `xhigh` by default; `max` when quality matters more than latency or a weak result would cause rework. | Final high-stakes judgment or coordination of other agents. |
| gpt-6.1-sol | The assignment benefits from a stronger collaborative peer, a higher coding ceiling than gpt-6-luna, or delegated coordination of its own independent workstream. | `max` by default. | Routine leaf work that gpt-6-luna xhigh or max can complete. |
| gpt-6-astra | The assignment needs independent senior judgment under ambiguity or high consequence. Examples: architecture, competing incident hypotheses, security or payment correctness, release-risk analysis, or an adversarial audit of a proposed plan. | `high` by default; `max` for the hardest quality-first work. | Routine scouting, deterministic workflows, or ordinary isolated coding. |

Default to gpt-6-luna xhigh for leaf work. Escalate to gpt-6-luna max for difficult leaves. Use gpt-6-luna high, medium, or low only as an explicit latency optimization for completely mechanical work whose result is deterministic and cheaply verified. Move to gpt-6.1-sol max when peer coordination, its higher ceiling, or lower wall-clock time than a long gpt-6-luna max run justifies the additional cost. Move to gpt-6-astra high or max when the assignment must resolve the central ambiguity or make a high-consequence judgment.

Use gpt-6-luna only as a leaf and explicitly tell it not to delegate. gpt-6-astra and gpt-6.1-sol can act as collaborative peers and may delegate further only when the root explicitly assigns coordination ownership, the child work is independently scoped, and slots remain available. Otherwise make them leaves too.

## Disclose Every Spawn

Immediately before every `spawn_agent` call, send a concise commentary update that tells the user:

- The agent task name.
- The exact requested model slug, such as `gpt-6-luna`.
- The exact requested reasoning effort, such as `high` or `max`.
- The assigned role and whether the agent is a leaf or an authorized coordinator.

Group simultaneous spawns into one compact update when useful. For example:

```text
Spawning:
- `evidence_scout` — `gpt-6-luna`, reasoning `xhigh` — read-only leaf
- `senior_critic` — `gpt-6-astra`, reasoning `max` — senior-review leaf
```

Describe these as requested configuration, not verified runtime identity. If the runtime later reports a different actual model or reasoning effort, disclose the correction. Prefer `fork_turns: "none"` with explicit `model` and `reasoning_effort` values so the configuration is visible. When a history fork requires inherited values, say they are inherited and name the parent's exact model and reasoning effort when known; if the runtime does not expose them, state that explicitly and never guess.

## Use These Reusable Personas

Treat these as assignment shapes, not permanent project agents.

### Evidence scout — gpt-6-luna xhigh

Gather a defined evidence set and return paths, commands, timestamps, exact failures, and confidence. Keep it read-only. Good for service health, Sentry or log excerpts, GitHub checks, current diffs, official documentation, and locating relevant code.

### Workflow operator — gpt-6-luna xhigh

Run and monitor an already-defined, user-authorized workflow with explicit inputs and completion checks. Good for project linting and test suites, long transfers, transcription and packaging, CI watching, deterministic exports, or repeatable validation. Do not invent scope or make approval decisions.

### Implementation or review leaf — gpt-6-luna max

Own one bounded code surface or review target, complete the requested work, run targeted checks, and report changed files, evidence, and residual risk. Give distinct file or component ownership.

### Collaborative workstream owner — gpt-6.1-sol max

Own a substantial independent workstream that benefits from a stronger coding peer or further decomposition. Coordinate children only when explicitly authorized; otherwise remain a leaf. Return one integrated result for the assigned workstream.

### Senior critic — gpt-6-astra high or max

Challenge architecture, diagnosis, security, financial correctness, or release readiness. Ask for the strongest competing explanation and the evidence that would distinguish it. Return a recommendation; keep the final decision with the root and user.

## Apply Common Delegation Patterns

- **Production incident:** send gpt-6-luna xhigh for live health/logs and gpt-6-luna max for the relevant code path; use gpt-6.1-sol max only if the investigation becomes a substantial coordinated workstream. Have the root separate underlying cause from resilience mitigation.
- **PR or release:** send gpt-6-luna xhigh for exact-head diff/check/CI evidence and gpt-6-luna max for substantive review; keep approval, merge, deploy, and final live verification with the root unless the user explicitly delegates those actions.
- **Analytics or payments:** use separate gpt-6-luna xhigh scouts for independent sources when useful, then gpt-6-luna max to reconcile definitions and mismatches; use gpt-6-astra high or max for money-sensitive ambiguity.
- **UI work:** give gpt-6-luna xhigh ordinary bounded implementation and gpt-6-luna max difficult implementation or adaptive browser verification; use gpt-6.1-sol max for a larger independent workstream that needs further decomposition.
- **Long-running creator workflow:** give gpt-6-luna xhigh the established preflight, transfer, transcription, packaging, and monitoring sequence so the root remains available for corrections and approvals.
- **Consulting or research:** use gpt-6-luna xhigh for source collection, gpt-6-luna max for evidence normalization, and gpt-6-astra or the root for the recommendation and tradeoffs.

## Write the Assignment Contract

Default to `fork_turns: "none"`. Pass only the context required to succeed:

1. One concrete objective and why it matters.
2. Exact scope: repository, paths, systems, date range, or source set.
3. Ownership boundary, including files or surfaces the worker may change.
4. Constraints from the user, repository, and applicable skills.
5. Required validation and the expected return format.
6. Whether the task is read-only or authorized to mutate state.
7. Whether the worker is a leaf or an explicitly authorized gpt-6-astra/gpt-6.1-sol coordinator. gpt-6-luna is always a leaf.
8. The exact requested model and reasoning effort that were disclosed to the user.

Use a history fork only when the subtask genuinely depends on conversation context too dense or fragile to restate. Never send two agents overlapping implementation ownership in the same checkout.

## Coordinate and Integrate

- Respect the current slot limit and use only the agents that have independent work. One precise worker is better than forced fan-out.
- Keep at least one useful path moving locally while agents work, unless the delegated operation is the whole task.
- Treat every result as evidence. Reopen authoritative live surfaces before claiming merged, deployed, fixed, paid, published, or delivered status.
- Follow up with an existing agent when the next task depends on its context; spawn a new one when independence is more valuable.
- Stop or redirect work when ownership overlaps, assumptions diverge, or a worker expands scope.
- Synthesize disagreements explicitly. State which evidence wins and why.
- Preserve user approval boundaries for destructive, production, financial, publishing, messaging, merge, and deployment actions.

Return one integrated answer. Do not dump parallel reports on the user.
