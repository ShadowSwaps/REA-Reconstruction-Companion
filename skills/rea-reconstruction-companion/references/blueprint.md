# Product investigation and reconstruction blueprint

Use this workflow for broad investigations or missing specification areas. Scale depth to the selected workflows; an inventory entry is not a requirement to analyze every feature equally.

## Question checklist and product map

Identify users/roles, their jobs, and the main outcomes. Map core/supporting capabilities, navigation and entry points, relevant integrations, background work, persistence, and synchronization. Include configuration, permissions, feature flags, and platform differences when they affect scope. Distinguish reachable behavior from dormant code or packaged resources.

For each priority workflow, capture the actor, trigger, preconditions, initial state, action sequence, system responses, inputs, transformations, outputs, persistent changes, and side effects. Examine meaningful loading, empty, success, failure, cancellation, and recovery states. Map dependencies between workflows; a collection of screens alone is not a product model.

Follow this chain as far as evidence supports it:

`trigger -> handler -> domain logic/state -> API/IPC/storage/job -> result -> user-visible outcome`

Classify each investigation question as answered, partially answered, or unresolved. Define the smallest useful end-to-end scope, but keep the rest of the user's requested scope visible rather than quietly reducing the assignment to an MVP.

Before runtime experiments, record a repeatable starting state and scenario using [reconstruction methods](reconstruction-methods.md#repeatable-observation). Use contrasting scenarios to locate feature-specific work; include state transitions and persistence effects, not just screens. Keep unexercised account tiers, configurations, and platform paths visible as coverage gaps.

## Findings and uncertainty

Keep a finding ledger containing:

- Local finding ID, claim, classification, and rationale.
- REA Evidence IDs plus precise file/function/capture locations where available.
- Artifact identity, version, environment, and coverage/search boundaries.
- Supporting and conflicting evidence.
- Remaining uncertainty, its impact, and the next useful experiment.
- Tool/analysis settings and scenario identity needed to reproduce the observation; dependencies on other findings that may later change.

Observed facts may come from static inspection or execution; say which. An inference about how a feature works is not a verified requirement. Proposed behavior belongs to the new design and must not be attributed to the original.

For an uncertain mechanism, formulate competing explanations and choose the smallest observation that distinguishes them. Reconcile static and runtime evidence explicitly. Do not describe an unsuccessful bounded search as proof of universal absence, or page exhaustion as proof of source completeness.

Unknown remote services, undocumented algorithms, unavailable feature tiers, or platform-specific behavior remain explicit. Specify observable contracts when internals cannot be recovered, and identify where an independent replacement is needed.

## Requirements and acceptance criteria

Give each selected requirement a stable ID and define:

- User/system need, priority, and scope.
- Preconditions, input, expected behavior, and outputs.
- Relevant validation, state transitions, persistence, permissions, and errors.
- Dependencies and compatibility obligations.
- Testable acceptance criteria, with normal and consequential edge cases.
- Supporting finding IDs, or a clear label that the behavior is proposed.

Use Given/When/Then scenarios when helpful. Keep functional parity, interaction fidelity, visual fidelity, and interoperability independently assessable. Separate required behavior from incidental implementation details and intentional differences.

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

Order implementation by dependencies and risk. Define milestones as usable vertical slices, each with requirements, component boundaries, validation, and unresolved prerequisites. Prototype uncertain mechanisms before large dependent work. Distinguish the first useful version from the remaining parity backlog.

Prepare a validation plan for the whole application, including equivalent reference scenarios where possible. Plan controlled initial states, representative fixtures, meaningful failure cases, comparison tolerances, and intentional differences.

For each critical acceptance criterion, identify an available source of expected results: a recorded reference case, an independent specification/model, or a justified invariant. Mark criteria lacking an oracle as unverified. Choose [comparison and coverage methods](reconstruction-methods.md#comparison-and-test-oracles) before implementation can accidentally define its own expected behavior.

The specification is ready for a slice when its observable behavior, required contracts, acceptance criteria, and critical unknowns are sufficiently defined. Unknowns outside that slice need not prevent progress. An unresolved critical dependency must not be silently replaced with assumed behavior.

Deliver a blueprint that another agent can act on without the original conversation. Include unresolved questions and the next investigation actions, with direct evidence references rather than an unqualified narrative of how the original supposedly works.
