# Iterative implementation and integration validation

Read only when the user requests implementation. Use the existing selected blueprint when available; investigate gaps that affect a slice rather than repeating complete analysis.

For changes to an existing reconstruction, first apply [safe changes](safe-changes.md): reconcile the current implementation and user request with retained obligations, select affected/shared regressions and proportional recovery, then implement the authorized slice.

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

For inaccessible dependencies, apply [the selected substitute/replay/deferred path](unavailable-backends.md). Keep local save, pending synchronization and remote outcome separate through the real entry point; reject missing recordings or malformed responses without automatic remote fallback. Retain required provider checks as pending.

Preserve independent reference fixtures before adjusting the implementation. Follow [comparison and test oracles](reconstruction-methods.md#comparison-and-test-oracles) for differential, stateful, property-based, or metamorphic checks when those methods fit the requirement. Tests derived only from the new code cannot establish parity with the original.

## Validate at the right boundaries

For untrusted inputs, sensitive data or restricted operations, apply [security boundaries](reconstruction-security.md). Exercise relevant parser/sink limits, storage/export/log leakage and direct unauthorized calls at the enforcing component; keep simulated identity and client-only limits explicit. A successful ordinary workflow alone does not validate these protections.

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

For selected UI work, exercise [interface accessibility](interface-accessibility.md) through actual keyboard/focus/error/status workflows using existing supported tools. Keep markup inspection, deterministic doubles, live browser observations and unrun assistive-technology checks distinct; preserve the original and the separately selected improvement profile.

For reference comparisons, use equivalent inputs, fixtures, initial state, versions, and environments; record unavoidable differences. Specify acceptable tolerances. An intentional design difference should be assessed against its proposed requirement, not reported as original parity.

Carry each consequential [preserve/improve/defer decision](reconstruction-methods.md#preserve-improve-or-defer) into the selected tests. Exercise the intentional difference and affected dependencies alongside unchanged compatibility cases; keep deferred required scenarios pending. Don't edit the original or its frozen expected results to satisfy the candidate.

For browser comparisons, record the actual origin, browser/profile or context, storage keys and reset method. Different URL paths and tabs can share persistent storage. Reset disposable state before each independent run and assert the expected starting UI; retain state only inside an intentional persistence sequence. Exercise visible controls and relevant keyboard, reload, empty and error behavior through the browser. Distinguish page reload, a fresh tab and browser-process restart; report unavailable stages separately from REA static analysis. Compare semantic records by fields rather than incidental object-key serialization order, preserving meaningful row order, selection and error states. A timeout, missing capture or matching failed action cannot establish agreement.

When persistence reliability is in scope, check stored data as well as the visible UI. For a rejected save, verify prior bytes, draft retention, feedback after an earlier successful save, and retry/reload recovery. Label controlled storage faults separately from real browser quota or permission denial; preserve original targets and identify instrumentation. For concurrent tabs, deliberately share an origin within each target while isolating the reference from the candidate. Check stale reads, competing edits or identifiers, the observed overwrite/conflict policy, and reload recovery. Matching silent data loss or stale success feedback establishes that baseline behavior, not a reliability pass; keep proposed improvements separate from parity.

When an approved improvement changes conflict handling, freeze its acceptance profile separately and show a distinguishing reference failure plus unchanged workflows. Choose serialization from demonstrated platform capabilities: revision checks or storage events alone do not make a read/check/write atomic. Exercise overlapping requests as well as sequential stale tabs, state which writers must cooperate, and test a non-destructive recovery path that retains the draft and current stored data. If the required coordination is unavailable, declare the fallback policy and verify it rather than implying the supported guarantee still holds.

When auditing saved captures, recompute expected-field checks rather than trusting stored pass flags, and require the declared checkpoint set exactly once per target. Retain every routine needed to replay the claimed checks, including keyboard and setup actions. Challenge the actual action/capture/comparison path; a separate illustrative guard does not establish that the live harness rejects failures. Preserve original records and distinguish fresh review replays from historical observations.

Investigate mismatches before choosing which behavior to reproduce: the reference, the reconstruction, or the comparison harness may be at fault, or the difference may be permitted. Reduce failures to small reproducible cases and retain them as regression fixtures. Preserve raw observations when normalizing timestamps, identifiers, or presentation noise; do not normalize away meaningful differences.

For measured bottlenecks or unmet quality requirements, use [profiling and optimization](performance.md). Establish a baseline early, optimize consequential paths, and run comparable before/after workloads alongside behavior tests. Record tradeoffs such as lower latency at the cost of memory, startup work, durability, or complexity.

Use REA's reconstruction verification only when its current schema supports the actual typed claims. A pass covers those comparable claims only. Combine it with the application tests needed for integration and user outcomes; it does not establish global equivalence.

For [asynchronous result handling](asynchronous-results.md), exercise actual
callbacks/promises with explicitly controlled completion order and frozen
intermediate expectations. Check guards at each consequential effect, including
error/status/loading cleanup, changed owner/input and completion after dismissal
or abort. Verify any write-retry reconciliation at its enforcing boundary;
client tokens and successful doubles do not establish backend cancellation or
duplicate prevention. Keep deterministic scheduling separate from real network
or concurrent execution evidence.

For [numeric contracts](numeric-contracts.md), exercise explicit input grammar, representation/range/scale, signed rounding ties and stage, unit conversion and literal storage/export/reopen. Keep display-only rounding separate from domain changes; reject invalid/nonfinite/absent data according to the selected contract and verify prior data on semantic rejection.

For [search/filter/sort contracts](search-filter-sort.md#freeze-discriminating-checks), compare ordered identities and intermediate selection/page state through actual actions. Check relevant combined predicates, missing values and equal-key ordering; select then reorder/hide/delete items and recompute pages after data changes. Keep local snapshot checks separate from remote or asynchronous guarantees.

## Parity and completion

Maintain a matrix linking each requirement to evidence, components, and tests, with these separate dimensions:

- **Scope/design**: required for parity, intentional difference, or out of scope.
- **Implementation**: not started, partial, implemented, or blocked.
- **Verification**: verified against the reference; tested against a proposed specification; partially tested; untested; or failed.
- **Applicability**: current for the selected artifact, candidate, contract/corpus and relevant environment; historical; stale; or unknown. Reassess actual dependencies, including indirect ones, using [checkpoint guidance](checkpoints.md); retain justified scoped reuse.

This prevents 'implemented' from being mistaken for 'verified equivalent.' Record test commands/scenarios, actual outcomes, environment, and limitations. Do not imply a test ran when only its code was written.

For each completion claim, identify the selected behavior/cases and supporting source: static finding, runtime observation, inference or unresolved evidence. Preserve failed, blocked and unrun scenarios separately from passing ones, including unavailable platforms. Selected passing cases do not establish whole-app equivalence or exhaustive security/performance coverage. Keep sanitized excerpts labeled as derivatives with original provenance; they do not inherit canonical authority from retained IDs. State source exposure and whether authorship/review was same-agent or independent. A separately frozen literal oracle avoids self-comparison without becoming independently authored evidence.

Keep this proportional: extend the existing matrix or short result summary rather than require another report. Local checkers can reject particular malformed records and unsupported comparisons; they do not establish arbitrary prose correctness, runtime truth, honest reporting or complete dependency discovery.

When required checks pass, avoid repeating them without a new change, failure, or unresolved concern. Continue toward the remaining requested scope rather than stopping after the first working slice.

For runnable results, follow [runnable handoffs](runnable-handoffs.md) to give and exercise proportionate setup/run/stop, walkthrough, data and recovery instructions outside the development checkout. Deliver a checkpoint of completed requirements, outstanding gaps, blockers, and next actions. Judge completion against the selected acceptance criteria and actual integration results. If a real dependency or required scenario remains unavailable, report partial coverage and its impact plainly.
