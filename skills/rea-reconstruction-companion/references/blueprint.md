# Product investigation and reconstruction blueprint

Use this workflow for broad investigations or missing specification areas. Scale depth to the selected workflows; an inventory entry is not a requirement to analyze every feature equally.

## Question checklist and product map

Identify users/roles, their jobs, and the main outcomes. Start with the principal journey and enough of a capability map to choose useful work; expand it when dependencies or the requested coverage require it. Map relevant navigation and entry points, integrations, background work, persistence, and synchronization. Include configuration, permissions, feature flags, and platform differences when they affect scope. Distinguish reachable behavior from dormant code or packaged resources.

For each priority workflow, capture the actor, trigger, preconditions, initial state, action sequence, system responses, inputs, transformations, outputs, persistent changes, and side effects. Examine meaningful loading, empty, success, failure, cancellation, and recovery states. Map dependencies between workflows; a collection of screens alone is not a product model.

Follow this chain as far as evidence supports it:

`trigger -> handler -> domain logic/state -> API/IPC/storage/job -> result -> user-visible outcome`

Classify each investigation question as answered, partially answered, or unresolved. Define the smallest useful end-to-end scope, but keep the rest of the user's requested scope visible rather than quietly reducing the assignment to an MVP.

Before runtime experiments, record a repeatable starting state and scenario using [reconstruction methods](reconstruction-methods.md#repeatable-observation). Use contrasting scenarios to locate feature-specific work; include state transitions and persistence effects, not just screens. Keep unexercised account tiers, configurations, and platform paths visible as coverage gaps.

### Consequential workflow states

For a selected journey, extend the existing finding/requirement/acceptance rows
with the starting state, input/action, guard, next state, data/side effects and
observable result. Identify the evidence and its limits for each consequential
transition. A compact table or sequence is enough; do not create a parallel
state framework or require every combination to be enumerated.

Separate what the interface displays from session state (selection, draft,
pending operation) and persisted state. Record how each is established or reset.
The same screen can conceal different pending work or committed data. Hidden
state is a question to investigate, not proof of a recovered internal mechanism.
Label static/runtime observations, causal hypotheses, desired requirements and
proposed designs separately; reconcile conflicts through the finding ledger.

Choose a small set of sequences by the consequence of being wrong. Useful
contrasts can include empty versus existing data, rejected versus committed
actions, failure then retry, cancel then delayed confirmation, or reopen with
unfinished work. Examine changed permissions, concurrent actors or interruption
only where applicable and authorized. Check both the user-visible outcome and
relevant state/data after intermediate steps, including whether a rejected action
preserves data. A final happy-path result alone cannot establish completion.

Keep unobserved transitions and their dependent requirements unverified. A
synchronous injected failure exercises that control path; it does not test a
process crash, concurrent callback or live permission change. Revisit dependent
observations/tests when starting-state, guard or persistence assumptions change;
retain unrelated scoped evidence and historical results. Use
[sequence comparison](reconstruction-methods.md#selected-transition-checks) for
bounded checks and explicit coverage limits.

For [asynchronous operations](asynchronous-results.md), add operation identity,
triggering input/context, owner/lifecycle and the component enforcing result
acceptance to these same rows. Separate pending/outcome from applicability;
include late errors and cleanup as well as values. Distinguish dismissal, abort
request and confirmed cancellation; keep uncertain effects unresolved until
applicable reconciliation supports a retry or known outcome.

For [copy/cut/paste](clipboard.md), extend these same rows with source/destination
selection and identity, representation, insertion/replacement, source-removal
and clipboard effects. Keep original evidence separate from proposed cut/history
policies and unavailable platform behavior.

For [drag/drop and reordering](drag-drop.md), extend these rows with source owner
and stable identity, displayed versus canonical order, destination/anchor and
move/copy policy, tentative preview, commit applicability and actual effects.
Recover cancel, unchanged placement and history conflicts; keep equivalent move
controls distinct from unverified pointer/keyboard/accessibility behavior.

## Findings and uncertainty

For [offline editing and synchronization](offline-sync.md), extend the workflow
rows with account/document, draft and captured revisions, actual local persistence,
queued/in-flight/confirmed/conflicted/unknown outcomes and attempts versus effects.
Recover reconnect, reconciliation, retry/order and explicit resolution policies;
do not infer durability or safe replay from a connection indicator or stable ID.

For [forms and dependent fields](form-validation.md), extend these same rows with
raw/normalized/submitted values, validation and error visibility timing,
controlling-field applicability, inactive value/payload policy and actual
submission effects. Recover failure/correction/resubmission and distinguish an
accepted payload from newer draft edits; retain unknown target rules explicitly.

For [settings and preferences](settings-preferences.md), retain applicable scope,
default/override presence and precedence, effective value/source and pending,
applied and persisted transitions in the same rows. Recover reset and compatibility
policy without treating a displayed default or button name as storage evidence.

For date-bearing workflows, extend these same records with the selected value's
[date/time meaning and locale context](date-locale.md). Bind zone/offset and
runtime data to observations; keep display, parsing and persisted/exported values
separate. Field names and screenshots alone leave consequential semantics open.

For numeric workflows, extend these same rows with the [input/value/rounding/unit contract](numeric-contracts.md): accepted grammar, representation/range/scale, consequential rounding mode/stage, conversion basis and canonical storage/export. Separate original evidence from proposed rules; a formatted label does not establish a stored value or unit.

For [search/filter/sort workflows](search-filter-sort.md), retain the selected matching predicates, comparator/missing/tie policy, identity and page transitions in these rows. Distinguish the full result set from the displayed page and observed original rules from proposed changes.

For [undo/redo and destructive actions](undo-destructive.md), add the selected restoration/grouping/history contract and confirmation/cancel/effect boundary to these rows. Separate data, identity/order and relevant view restoration from irreversible or unresolved effects; retain original evidence separately from proposed policies.

For [unsaved changes and navigation](unsaved-navigation.md), retain document/owner,
draft versus saved revision, save feedback and the exact departure destination in
these rows. Resolve consequential save/discard/cancel, pending-edit and failure
semantics from evidence or label the selected policy as proposed.

Keep a finding ledger containing:

- Local finding ID, claim, classification, and rationale.
- REA Evidence IDs plus precise file/function/capture locations where available.
- Artifact identity, version, environment, and coverage/search boundaries.
- Supporting and conflicting evidence.
- Remaining uncertainty, its impact, and the next useful experiment.
- Tool/analysis settings and scenario identity needed to reproduce the observation; dependencies on other findings that may later change.

Observed facts may come from static inspection or execution; say which. An inference about how a feature works is not a verified requirement. Proposed behavior belongs to the new design and must not be attributed to the original.

For [visual or incomplete supplied evidence](visual-evidence.md), bind findings to images/frames, crop boundaries, actual timing and separately attributed narrative. Keep visible states distinct from demonstrated interactions and unseen effects; preserve consequential contradictions when deriving requirements.

For an uncertain mechanism, formulate competing explanations and choose the smallest observation that distinguishes them. Reconcile static and runtime evidence explicitly. Do not describe an unsuccessful bounded search as proof of universal absence, or page exhaustion as proof of source completeness.

For conflicting recordings, runtime results, documentation or descriptions, use
[evidence reconciliation](reconstruction-methods.md#conflicting-evidence-and-ambiguous-behavior).
Extend these same finding/acceptance rows with source applicability, competing
explanations, predicted distinguishing outcomes and actual limits. A scoped
resolution does not remove a separate desired-behavior decision or verify an
unobserved dependency.

Unknown remote services, undocumented algorithms, unavailable feature tiers, or platform-specific behavior remain explicit. Specify observable contracts when internals cannot be recovered, and identify where an independent replacement is needed.

Use [inaccessible backend handling](unavailable-backends.md) for the evidence/design split, local substitute versus finite replay versus deferred integration, and minimal replaceable boundary. A local first slice leaves required remote compatibility pending; failed access does not prove the feature absent.

## Requirements and acceptance criteria

Give each selected requirement a stable ID and define:

- User/system need, priority, and scope.
- Preconditions, input, expected behavior, and outputs.
- Relevant validation, state transitions, persistence, permissions, and errors.
- Dependencies and compatibility obligations.
- Testable acceptance criteria, with normal and consequential edge cases.
- Supporting finding IDs, or a clear label that the behavior is proposed.

Use Given/When/Then scenarios when helpful. Keep functional parity, interaction fidelity, visual fidelity, and interoperability independently assessable. Separate required behavior from incidental implementation details and intentional differences.

For selected UI journeys, define [accessibility acceptance](interface-accessibility.md) alongside those dimensions: keyboard actions, focus transitions, names/labels, error correction and dynamic feedback. Label proposed improvements and retain unobserved keyboard or assistive-technology behavior as unknown; an image or role/name inspection does not prove it.

Where content or window size changes matter, add a small [viewport/content matrix](visual-evidence.md#responsive-layouts-and-content-extremes) to those acceptance rows. Bind scale method, content identity, scroll/overlay and state assumptions to actual rendered and interaction evidence; retain unrun combinations and proposed differences separately from reference behavior.

For surprising original behavior, apply [preserve, improve or defer](reconstruction-methods.md#preserve-improve-or-defer) in the affected requirement row. Link the observation, user goal, consumer/dependency impact and chosen acceptance profile; keep unresolved required work and revisit triggers visible in the roadmap. Mixed fidelity/improvement goals can yield different decisions at different interfaces.

Define relevant nonfunctional targets: performance, reliability, accessibility, security/privacy, compatibility, and recovery. Measured original properties need measurement context; suggested targets need rationale and an explicit proposed status. Do not fabricate benchmarks.

Express consequential quality requirements as scenarios: context and workload, stimulus or failure, expected response, and a measurable criterion. For example, saving while a connection drops may require a local durable result and an explicit pending-sync state. Select criteria from the user's needs or label them as proposals. Use [profiling and optimization](performance.md) for performance baselines and improvement candidates.

## Architecture and contracts

Document the original's supported architecture and the reconstruction's proposed architecture as separate views. Use diagrams only where they clarify boundaries, relationships, or execution.

Recover useful views separately: modules/dependencies, runtime processes and interactions, deployment boundaries, and persistent data flow. Reconcile identities across them; a package dependency is not a runtime call, and a shared library is not necessarily a domain component. Validate architectural hypotheses against evidence instead of inferring a complete architecture from directory names or one call graph. See [R1](research-basis.md#r1-architecture-reconstruction).

Cover the mechanisms necessary for the selected scope:

- Components, responsibilities, boundaries, and communication.
- Entities, identifiers, relationships, invariants, state ownership/lifecycle.
- Storage formats, persistence, migrations, import/export, and compatibility.
- API/IPC/event contracts with inputs, outputs, errors, ordering, idempotency, and versioning where relevant.
- Authentication/authorization, background work, concurrency, caching, retries, synchronization, and error propagation.
- External dependencies, diagnostics, deployment, and operational behavior.

Recommend a stack from the requirements and existing project constraints. Record consequential tradeoffs and alternatives, particularly when diverging from the original. Identify unavailable dependencies and replacements; distinguish a provisional adapter/mock contract from a verified interface.

## Roadmap and specification handoff

### Choose the first useful slice

Resolve what the user needs to accomplish first: who acts, from what starting state, through which entry point, and what observable result makes the work useful. Infer this from the whole request and current context, including corrections; a broad app name alone does not rank its features. If context supports a reversible choice, state it briefly as proposed and proceed in the selected mode. If competing priorities would materially change architecture or useful success, ask a focused question and continue independent evidence work. Do not require a questionnaire or routine plan approval.

Separate the selected work by its role, with a brief reason:

- **Essential outcome and hard requirements:** the behavior that completes the journey, plus explicit platform, offline, format, fidelity or other constraints. A hard requirement stays binding even when expensive; if it conflicts with another requirement, expose the conflict rather than silently dropping it.
- **Enabling dependencies:** only the data, state, interfaces and integration mechanisms needed for that outcome. Shared identity/schema/storage may need to come first, but validate it through the journey it enables rather than build an unrelated general platform.
- **Consequential unknowns:** gaps that could invalidate the slice's behavior, compatibility or design. Investigate those before committing dependent work. A missing format version, persistence guarantee or service contract can matter more than an unexplained cosmetic detail; prioritize by the consequence of being wrong, not by counting unknowns.
- **Deferred work:** optional polish, lower-priority journeys and unresolved details outside the slice, with their reason and any condition for revisiting. Keep the rest of the requested scope and explicit exclusions visible. Deferring work is sequencing, not removing a hard requirement or declaring the assignment complete.

Choose a small end-to-end result through the actual entry point, domain behavior and necessary data/integration boundaries. Include persistence/reopen, failure feedback or recovery when the journey needs them. A disconnected screen, success-only mock or cheapest isolated component is not a completed working slice. For a search-first request over existing notes, reading/importing/indexing that data may precede a new-note editor. Do not impose the same starting feature on every app.

Evidence sufficiency is specific to the question and slice. Resolve critical unknowns with the smallest useful investigation or prototype; defer low-impact details with their limits intact. An unavailable backend can leave exact sharing blocked while a local-editing slice remains useful. Label provisional adapters and substitute behavior; they do not verify the original service. If the missing dependency prevents any useful requested result, report that blocker instead of presenting a mock as completed parity.

### Sequence and acceptance

Give a short dependency-aware sequence of usable slices. For each, name the user outcome, essential requirements/enabling boundaries, prerequisites or design-changing unknowns, and evidence-linked acceptance checks. Explain an ordering tradeoff where it matters; avoid arbitrary priority scores and exhaustive feature lists. A bounded enabling step can precede a usable result, but say what it enables and how that result will validate it. Distinguish the first useful version from the remaining parity backlog.

Prepare a validation plan for the selected scope and its relevant integration boundaries, including equivalent reference scenarios where possible. Plan controlled initial states, representative fixtures, meaningful failure cases, comparison tolerances, and intentional differences.

For each critical acceptance criterion, identify an available source of expected results: a recorded reference case, an independent specification/model, or a justified invariant. Mark criteria lacking an oracle as unverified. Choose [comparison and coverage methods](reconstruction-methods.md#comparison-and-test-oracles) before implementation can accidentally define its own expected behavior.

The specification is ready for a slice when its observable behavior, required contracts, acceptance criteria, and critical unknowns are sufficiently defined. Unknowns outside that slice need not prevent progress. An unresolved critical dependency must not be silently replaced with assumed behavior.

Deliver a blueprint that another agent can act on without the original conversation. Include unresolved questions and the next investigation actions, with direct evidence references rather than an unqualified narrative of how the original supposedly works.

Keep the output proportional: a compact brief and a few ordered steps may suffice. A roadmap in understand/specify mode remains a proposal; it does not authorize implementation. For a selected function or format, use its complete contract and consequential dependencies without an app-wide prioritization exercise. On correction or resume, revise priorities, slice boundaries and affected evidence/test applicability while retaining useful work and historical results; see [checkpoint guidance](checkpoints.md#on-resuming).
