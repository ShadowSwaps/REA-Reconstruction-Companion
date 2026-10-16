# Iterative implementation and integration validation

Read only when the user requests implementation. Use the existing selected blueprint when available; investigate gaps that affect a slice rather than repeating complete analysis.

## Implement coherent increments

For an app or feature, start with a small vertical slice through its real entry point, domain logic, required dependencies, and observable result. For a function, decoder, or interface, start with its smallest complete contract and a test harness using independent reference cases; add only dependencies the contract requires. Do not introduce a UI, service, or storage layer to make a narrow task look like an application. Keep original artifacts and installation files separate from reconstruction code.

For each slice:

1. Select requirement IDs and acceptance scenarios; check evidence and unresolved prerequisites.
2. Define/refine interfaces, state transitions, and data invariants.
3. Implement the coherent behavior with normal development tools.
4. Run focused tests and inspect actual behavior through the relevant entry point.
5. Compare against the specification and, when available, controlled reference behavior.
6. Fix mismatches and regressions, then update decisions, traceability, and implementation status.

Use risk-driven prototypes for uncertain mechanisms. Integrate slices as they are developed. Preserve explicit user platform/stack constraints; when constraints make a requirement impractical, identify the conflict and continue independent work instead of silently changing the assignment.

Use original implementation choices as evidence, then make deliberate choices for the new product. Mark synthetic data, provisional contracts, mocks, and substitute services. Do not label an integration complete solely because its simulated dependency returns a success response.

Preserve independent reference fixtures before adjusting the implementation. Follow [comparison and test oracles](reconstruction-methods.md#comparison-and-test-oracles) for differential, stateful, property-based, or metamorphic checks when those methods fit the requirement. Tests derived only from the new code cannot establish parity with the original.

## Validate at the right boundaries

For risky comparison logic or integration boundaries, use [focused validation methods](validation-methods.md): bounded differential fuzzing to find discrepancies, targeted mutation testing to challenge the tests, and executable interface contracts to verify real interactions. For cryptographic boundaries, use [independent vectors and rejection tests](cryptographic-compatibility.md#independent-vectors-and-rejection-tests). Apply the skill's no-additional-charges constraint before selecting a tool or running a workload.

Select tests based on consequential behavior and risk, avoiding tests that merely mirror the implementation. Depending on scope, exercise:

- Domain rules and data invariants.
- API/IPC/adapter contracts and real component integration.
- Priority user journeys from their actual entry points.
- Persistence, shutdown/restart, and migrations.
- Invalid inputs, cancellation, timeouts, retries, and dependency failures.
- Concurrency, synchronization, and recovery.
- Relevant performance/resource targets, accessibility, and visual fidelity.
- Installation/configuration, startup, and requested deployment behavior.

For reference comparisons, use equivalent inputs, fixtures, initial state, versions, and environments; record unavoidable differences. Specify acceptable tolerances. An intentional design difference should be assessed against its proposed requirement, not reported as original parity.

For browser comparisons, record the actual origin, browser/profile or context, storage keys and reset method. Different URL paths and tabs can share persistent storage. Reset disposable state before each independent run and assert the expected starting UI; retain state only inside an intentional persistence sequence. Exercise visible controls and relevant keyboard, reload, empty and error behavior through the browser. Distinguish page reload, a fresh tab and browser-process restart; report unavailable stages separately from REA static analysis. Compare semantic records by fields rather than incidental object-key serialization order, preserving meaningful row order, selection and error states. A timeout, missing capture or matching failed action cannot establish agreement.

Investigate mismatches before choosing which behavior to reproduce: the reference, the reconstruction, or the comparison harness may be at fault, or the difference may be permitted. Reduce failures to small reproducible cases and retain them as regression fixtures. Preserve raw observations when normalizing timestamps, identifiers, or presentation noise; do not normalize away meaningful differences.

For measured bottlenecks or unmet quality requirements, use [profiling and optimization](performance.md). Establish a baseline early, optimize consequential paths, and run comparable before/after workloads alongside behavior tests. Record tradeoffs such as lower latency at the cost of memory, startup work, durability, or complexity.

Use REA's reconstruction verification only when its current schema supports the actual typed claims. A pass covers those comparable claims only. Combine it with the application tests needed for integration and user outcomes; it does not establish global equivalence.

## Parity and completion

Maintain a matrix linking each requirement to evidence, components, and tests, with these separate dimensions:

- **Scope/design**: required for parity, intentional difference, or out of scope.
- **Implementation**: not started, partial, implemented, or blocked.
- **Verification**: verified against the reference; tested against a proposed specification; partially tested; untested; or failed.

This prevents 'implemented' from being mistaken for 'verified equivalent.' Record test commands/scenarios, actual outcomes, environment, and limitations. Do not imply a test ran when only its code was written.

When required checks pass, avoid repeating them without a new change, failure, or unresolved concern. Continue toward the remaining requested scope rather than stopping after the first working slice.

Deliver runnable instructions, relevant configuration/fixture requirements, and a checkpoint of completed requirements, outstanding gaps, blockers, and next actions. Judge completion against the selected acceptance criteria and actual integration results. If a real dependency or required scenario remains unavailable, report partial coverage and its impact plainly.
