---
name: rea-reconstruction-companion
license: MIT
description: "Use with reverse-engineer-anything (REA) for app reconstruction blueprints, evidence-based rebuilds, and performance-informed improvements. Infer the target type, requested scope, objective, requirements, and project settings from natural language. Apply product workflows to whole apps and scoped methods to selected features, functions, interfaces, or data. Keep narrow REA explanations, comparisons, and diagnostics narrow; do not expand them into a full product study."
---

# REA-Reconstruction-Companion

Turn a naturally stated target investigation into an evidence-backed specification and, when requested, a validated reconstruction. Scale the work from a selected function or interface to a whole product. The user does not need to complete a form or supply bracketed variables.

Load the installed `reverse-engineer-anything` skill through the host's skill mechanism, or read its explicitly supplied `SKILL.md`, if it is not already loaded. Use it for target routing, REA tools, evidence mechanics, runtime boundaries, and connection recovery; do not embed a machine-specific path or copy its provider catalog here. This skill adds product decomposition, requirements, design, development, and validation. It does not install REA or supply an analysis engine.

These instructions are independent of the model provider. Use the host's available file, coding, research, and REA interfaces; no particular tool namespace, model, API, or invocation prefix is required. REA may be exposed through MCP or its supported CLI as described by the base skill. Optional host metadata is not part of the core workflow. A host without the necessary artifact access or REA tools can work from supplied evidence but must state those limits rather than claim live analysis.

## Work with REA throughout the task

When the user wants to understand a target for reconstruction, plan a similar implementation, or rebuild selected functionality, apply this skill and `reverse-engineer-anything` together throughout the task. Loading one from the other continues the same investigation; do not recursively reload either skill or start duplicate investigations.

Maintain one resolved brief, question checklist, and evidence ledger. Use REA findings to refine requirements and design. When planning, implementation, or validation exposes an evidence gap, return to a focused REA investigation and reconcile its findings with the affected requirements, design choices, and tests. Share existing evidence and preserve observations, inferences, and unknowns.

Keep the combined workflow proportional to the user's target and objective. A request to explain a function, compare versions, or diagnose a problem does not by itself require reconstruction planning or implementation. If the base skill is unavailable, report the missing dependency and continue supported work without inventing REA results or installing anything implicitly.

## Classify the target before choosing a workflow

Identify three separate things from the user's request:

1. **Subject and scope**: a whole product/system, feature/workflow, subsystem/module/class, function/method, interface/protocol, data format/store, or behavior captured in a recording/runtime session.
2. **Evidence carrier**: the executable/library/package, source tree, web page, live runtime, database snapshot, or recording containing relevant evidence. Inspect metadata with the base REA skill when the format is uncertain; a file extension alone is not a reliable native/managed/runtime classification.
3. **Objective**: explain/specify, reconstruct/implement, optimize, compare, or diagnose. Multiple objectives can share a subject without expanding it to the whole product.

Bind names/paths/URLs and any selectors (module, qualified symbol, address, endpoint, table, scenario, or version pair) to the user's chosen subject. A function inside an executable remains a function-level task even if REA must open the whole executable. A named product can span multiple processes/packages; do not equate one binary with the complete system. Expand to dependencies only as necessary to answer the selected question and explain that boundary.

| Requested scope | Appropriate result |
| --- | --- |
| Whole app/product | Product/workflow map, requirements, architecture, quality profile, roadmap, and requested implementation/validation. |
| Feature or subsystem | Focused behavior/state map, component/data boundaries, contracts, and relevant integration tests. |
| Function, method, or module | Inputs/outputs, relevant types/ABI, side effects, dependencies, error/boundary behavior, and focused tests or reconstruction if requested. No mandatory product-wide blueprint. |
| API, protocol, file format, or data store | Observed schema/grammar and state rules, compatibility corpus, and conformance/interoperability tests within the requested scope. |
| Runtime session, trace, or crash | Scenario-bound observations and causal hypotheses, related static evidence when useful, and explicit limits on generalizing beyond the recording. |
| Selected version comparison | Changes in the selected subject and their supported behavioral implications; distinguish static deltas from observed behavior changes. |

If the user has not selected a subject, ask what to investigate. If only a selector is ambiguous, resolve that selector rather than asking the user to fill every field. A narrow explanation/comparison/diagnostic request can finish with the base REA skill. For a requested scoped rebuild or optimization, use only the applicable contract, development, validation, and performance guidance below. Ordinary complete-source analysis still uses normal repository tools.

## Infer the working brief

Resolve inputs in this order: the user's current request and explicit corrections; established choices in this chat; explicitly selected artifacts and relevant project instructions; focused inspection of the named target; then reversible defaults. Preserve explicit choices. Record each consequential value as **explicit**, **observed**, **assumed**, or **unresolved**, with its basis.

| Input | How to resolve it |
| --- | --- |
| Subject and target | Use the classified subject, named app/symbol/interface, attached artifact, supplied path/URL, or a target already selected in this chat. Resolve a human-readable app name to a clear installed artifact with a bounded lookup. Do not choose by whichever app, process, report, or fixture happens to be nearby. |
| Version and identity | Inspect package/application metadata and available hashes. Keep unknown version fields unknown; distinguish product version from runtime/framework version. |
| Mode | Infer from intent using the mode rules below. A roadmap or future aspiration is not a request to implement now. |
| Scope and priorities | Honor named features and exclusions. For a broad request, inventory capabilities and prioritize principal user journeys, dependencies, and technical risks. Explicitly retain deferred work. |
| Similarity | Default to functional and interaction similarity for the selected workflows. Treat visual fidelity, file/protocol compatibility, and intended improvements as separate dimensions, inferred from the request or left unspecified. |
| Quality goals | Infer relevant performance, resource use, reliability, accessibility, and maintainability concerns from the user's goals and principal workflows. Distinguish measured reference properties from proposed improvement targets. Do not assume that the original is optimally designed. |
| Output location | Reuse an established task destination. Otherwise put investigation artifacts under `docs/rea/<app-slug>/` in the current writable project, if repository conventions permit. Keep distinct target identities separate. Use a separate implementation directory unless the user selected an existing codebase. |
| Rebuild platform | Use explicit requirements or the existing implementation project's constraints. Do not equate the analysis host OS with the desired platform. If unspecified, propose a platform with rationale; clarify before a consequential incompatible implementation choice. |
| Stack and constraints | Inspect relevant project manifests and instructions. Do not invent budgets, deadlines, licenses, performance measurements, or deployment requirements. Recommend unresolved technical choices from the discovered requirements. |
| Runtime access and fixtures | Use artifacts, accounts, recordings, test data, and endpoints actually provided or available within the task scope. Do not infer credentials, access rights, or permission for external mutations from a product name. |

Show the resolved brief concisely, then proceed. Do not make its approval a mandatory gate. Ask only when the target is absent/ambiguous or when an unresolved choice would materially change scope, correctness, or a consequential action. Continue independent useful work while awaiting an answer. Record nonblocking unknowns instead of issuing a questionnaire. Never treat an assumption as evidence.

## Choose the mode

- **Understand and specify**: requests to understand, analyze, map, document, plan, or investigate an app for a possible future rebuild. This is the default when implementation intent is absent. Deliver a reconstruction blueprint; do not start product implementation.
- **Investigate and build**: explicit requests to implement, rebuild, or create a similar app now. Gather enough evidence for each slice and continue into implementation without a second routine approval gate. A full forensic understanding of every subsystem is not a prerequisite for the first well-specified slice.
- **Build from specification**: explicit implementation requests with an existing selected specification. Check its evidence and applicability, then investigate gaps that affect the build. Do not restart the whole investigation automatically.

A later user request can change mode or scope. Record that change and preserve useful prior work. Mode controls whether implementation is requested; target scope controls its size. A request to optimize the reconstruction uses the build workflow, while a request to explain the reference's optimization stays investigative. When a user asks a narrow REA question, answer that question with the base REA skill; this companion does not require a full blueprint.

## Investigate and specify

For product investigations or missing specifications, read [the blueprint workflow](references/blueprint.md). It defines the product map, requirements, architecture, evidence ledger, and implementation roadmap.

Start from the exact target and a prioritized question checklist. Use REA summaries and focused follow-ups to trace priority workflows from trigger through state/data changes to results. Read the base skill's target-specific references only when needed. Reuse matching evidence; a new target or version must not silently inherit another app's conclusions.

Distinguish **observed facts**, **inferences**, **unknowns**, and **proposed design choices** throughout. Static analysis does not establish runtime behavior, strings do not establish active features, and client/network evidence does not reveal an inaccessible backend's complete implementation. Use bounded experiments to resolve uncertainties that could change the design.

Use available REA tools and their actual schemas. If REA access is blocked, follow its recovery guidance and continue supported work; report the specific limitation without inventing analysis results. For a complete source repository, use ordinary source tools for questions it can already answer.

For experiments, uncertain decompilation, state recovery, or compatibility work, use the applicable sections of [reconstruction methods](references/reconstruction-methods.md). Preserve reproducible scenarios and reference outputs, check the assumptions behind recovered code, and distinguish multiple views of one observation from independent corroboration.

## Assess performance and quality

For a broad product investigation, identify the quality attributes that matter to its principal workflows and capture a practical baseline when runtime access permits. For performance questions or consequential performance requirements, read [profiling and optimization](references/performance.md). Adapt measurements and external research to the actual platform, stack, workload, and bottleneck. A static inspection may suggest an optimization mechanism but cannot establish its measured benefit.

Record successful reference techniques and observed weaknesses separately. In specification mode, deliver the baseline, proposed budgets, tradeoffs, and prioritized improvement experiments. In build mode, implement justified improvements in the reconstruction and recheck behavior. Investigation of an installed reference app does not imply modifying that app. Do not turn every request into an exhaustive performance or security audit.

## Implement and validate when requested

For either build mode, read [the implementation workflow](references/implementation.md). Use ordinary coding tools to implement the proposed design. Build coherent vertical slices, integrate continuously, and link requirements to meaningful tests and actual outcomes.

Keep the evidence-derived model of the original separate from choices for the new app. Original architecture and stack are inputs to a decision, not automatic requirements. A mock or passing isolated component test is insufficient evidence that a real end-to-end workflow works.

## Preserve useful outputs and stop honestly

Scale documentation to the task: a compact linked report may suffice; split large investigations into focused files. Maintain these logical records without duplicating their content:

- Resolved brief, target identity, scope, and investigation checklist.
- Product/workflow map, evidence ledger, and unresolved questions.
- Requirements, original/proposed architecture, data models, and contracts.
- Dependency-ordered implementation roadmap, decisions, and validation plan.
- Reproducible reference scenarios, relevant performance baselines, and quality tradeoffs.
- Implementation and parity status when building; setup/run instructions for runnable results.

Use stable local IDs and traceability: **feature -> evidence -> requirement -> component -> acceptance test**. Keep REA Evidence IDs alongside local IDs. Preserve needed evidence bundles before closing sessions according to the base REA skill.

Maintain a checkpoint in the task outputs with current mode, target identity, decisions, evidence locations, completed work, blockers, and next concrete actions. Read only task-relevant records when resuming; do not load another chat's state without the user's request.

When an artifact, environment, analysis assumption, or interface changes, mark affected findings and dependent requirements/tests stale until reassessed. Preserve the prior result and explain the revision. Stop digging into a mechanism once the selected behavior and design decision have adequate support; keep unanswered questions visible and prioritize those that could change the next implementation step.

In product specification mode, finish when the selected workflows have actionable requirements, a proposed design, a build sequence, validation criteria, and explicit remaining gaps. For narrower subjects, finish when the selected question or scoped contract is adequately answered with evidence and limits. In build mode, judge completion against the selected acceptance criteria and actual integration results. Report open required questions as partial or unresolved; never claim global equivalence or complete understanding from limited coverage.

The [research basis](references/research-basis.md) records the sources and limits behind this workflow. Read it when reviewing or extending the method; it is not a requirement to browse every source for each app.

## Invocation examples

- "Use REA on the installed Obsidian app so I can eventually build a similar local notes tool." Infer the target, investigate identity, default to understand/specify, and prioritize local note workflows; do not begin implementation from 'eventually'.
- "Use REA-Reconstruction-Companion on the attached app.asar and build a similar Windows app with local projects." Infer investigate/build, preserve Windows and local-project constraints, and investigate the supplied artifact before selecting a stack.
- "Continue building the app from this chat's REA specification." Reuse the selected specification and target-bound evidence, inspect implementation status, and resume the next slice.
- "Use REA to explain this DLL's export function." Keep the request scoped to that function with the base skill.
- "Reimplement the decodeFrame function in this DLL and make it faster for large inputs." Select that function inside the library; recover its contract, establish correctness and performance baselines, then implement and compare within that scope.
