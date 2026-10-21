# Evidence collection and behavioral verification

Use only the sections relevant to the current question. These are method choices, not mandatory tool installations. Source IDs link to the [research basis](research-basis.md).

## Repeatable observation

Give each important experiment a scenario ID. Preserve the original input artifact; work on a copy when analysis or execution could modify it. Capture enough context to repeat the result: artifact identity, tool/provider versions and material analysis options, launch arguments, fixture identities, initial state/reset procedure, relevant configuration/account capabilities, action sequence, observations, and output locations. Include locale, clock, network/cache state, or display environment when they affect the claim.

Capture a baseline before varying a feature. Repeat unstable observations and distinguish nondeterminism, instrumentation effects, and environmental drift from product rules. Save relevant outputs and state changes, not just the investigator's interpretation. A capture without a known initial state is useful evidence with a reproducibility limitation. This is a task-sized adaptation of executable research artifacts, not a requirement to package every investigation as a research publication. [R4](research-basis.md#r4-reproducible-artifacts)

## Feature location and architecture

Compare scenarios that exercise the feature with similar scenarios that do not, then inspect the resulting code/data paths. Candidate differences help focus analysis; shared initialization, logging, libraries, and common services may appear in many features. A feature can span several components, and a component can support several features. Corroborate candidates using static dependencies and relevant runtime data rather than treating trace subtraction as causal proof. [R2](research-basis.md#r2-feature-location)

Keep mapping identities precise across modules, processes, functions, and versions. Reconcile static references with observed dynamic dispatch and plugin/loading behavior where these affect the design; preserve unresolved targets. [R1](research-basis.md#r1-architecture-reconstruction)

## Recovered-code assumptions

Treat decompiled pseudocode as a tool-produced interpretation. When a claim depends on uncertain recovered code, check relevant function boundaries, signatures, calling convention, data types/layout, indirect calls, and analysis warnings against lower-level evidence or a bounded runtime observation. Record manual type/signature corrections and which conclusions depend on them. Unresolved pointers, optimized code, missing runtime-loaded modules, or unsupported instructions are coverage limits, not proof a behavior is absent. Do not infer the original source structure from polished pseudocode. [R3](research-basis.md#r3-decompiler-assumptions)

## State and interface recovery

For sequence-dependent behavior, model observable states, triggers, guards, outputs, and persistent effects. Exercise sequences such as create/edit/save/restart/reopen, cancel/retry, and disconnect/reconnect when applicable. State names are hypotheses; similar screens can hide different states. Record reset assumptions and refine the model using counterexamples. Automated state exploration is optional and bounded by the available action vocabulary and test environment. [R7](research-basis.md#r7-state-models)

For format/API/IPC compatibility, maintain a small representative corpus. Compare controlled changes in inputs with changes in records or messages. Describe field types, units, encoding, defaults, missing versus null values, identifiers, ordering, errors, and version behavior only as far as established. Relevant public specifications can resolve gaps, but check that they apply to the target version.

Validate both directions of interoperability when required: original data read by the rebuild, and rebuild output consumed by the original or another independent implementation. A parser and writer sharing the same mistake can pass their own round-trip test. Samples are not proof of a complete schema. This contract procedure is a synthesis of evidence separation and independent comparison, not an automatic REA capability.

Make relevant interactions executable using [consumer/provider contracts](validation-methods.md#executable-interface-contracts). For cryptographic formats, record the [cryptographic interoperability profile](cryptographic-compatibility.md#interoperability-profile); neither an algorithm name nor successful self-roundtrip establishes compatibility.

## Evidence dependencies

Record why a conclusion is supported and what could falsify it. Two reports derived from the same capture are not two independent observations. Do not turn confidence labels into unsupported statistical probabilities. Preserve contradictory findings and conditions that explain them. When the target or an analysis assumption changes, reassess the dependent claims instead of carrying forward their verified status.

### Conflicting evidence and ambiguous behavior

Use the existing finding ledger and requirement/acceptance rows; a separate conflict
system is unnecessary. State the disputed claim at the smallest useful scope and
link each supporting or conflicting observation to its source location. Keep the
observation, explanation/hypothesis, desired behavior and proposed design distinct.
A reproducible original quirk does not decide which behavior the user wants.

Compare applicability before choosing an explanation: artifact identity/version,
source date versus capture date, environment/runtime, settings/feature flags,
permissions/account capability, input/data, initial state/reset, action sequence
and actual reproduction coverage. Keep unknown fields unknown. A newer document
can describe another release; a runtime result can cover another configuration;
a recording can omit an action. No source type, newest timestamp or majority
automatically wins. Link copies, summaries and reports to their common origin;
multiple views can help interpretation without becoming independent corroboration.

Retain plausible competing explanations, including capture/harness limitations
when supported. Choose a small authorized check that can distinguish consequential
alternatives. Before running it, record the controlled conditions and expected
outcomes under each explanation, including an inconclusive outcome. Then retain
actual outputs, deviations and remaining limits. Repeating an uncontrolled case
or obtaining the same success label does not necessarily discriminate causes.
Do not acquire unavailable access, spend money or turn planning into a build to
settle a conflict. A local fixture demonstrates its own mechanism, not the unseen
original or backend.

Resolve only the scoped claim the evidence supports. If consequential ambiguity
remains, keep dependent acceptance unresolved and name the smallest missing
observation or user decision. Ask a focused clarification only when available
evidence cannot resolve a choice that changes the requested outcome; continue
unaffected work. Preserve hard requirements, even if original behavior differs.

When stronger/new evidence arrives, record what it supersedes, why it applies and
which conclusions remain historical or unresolved. Follow the affected finding
-> requirement -> decision/component -> test dependencies, including indirect
ones, before reusing validation. Unchanged bytes alone do not preserve a result
whose assumed setting or interpretation was corrected. Keep unaffected scoped
evidence with its original identities; missing dependency coverage stays unknown.
See [checkpoint applicability](checkpoints.md#on-resuming). The bounded worked
example is repository-only at `evals/conflicting-evidence/README.md`; it is not
included in standalone skill installations. The procedure above is self-contained.

## Comparison and test oracles

A test oracle is the basis for deciding whether a result is acceptable. Choose it explicitly:

- **Reference comparison:** replay equivalent inputs against the original and rebuild, or use captured original outputs. Compare meaningful outputs, state changes, and failure behavior. A difference is a candidate discrepancy, not proof that the rebuild is wrong; investigate allowed variation, reference defects, and harness errors. [R5](research-basis.md#r5-differential-testing)
- **Independent specification/model:** test against a documented contract or separately reasoned domain model. Identify whether that model was validated against the reference or is proposed behavior.
- **Properties and metamorphic relations:** when exact answers are unavailable, test justified relationships between related runs, such as a lossless supported export/import preserving chosen fields. Specify the relation's preconditions; do not assume universal idempotence, sorting invariance, or reversibility. Passing establishes the tested relationship, not parity. [R6](research-basis.md#r6-metamorphic-testing)
- **Stateful testing:** generate or enumerate useful action sequences and compare state/invariants after each step. Preserve failing sequences and reduce them to understandable cases. Use the project's existing language/tooling rather than requiring Hypothesis. [R7](research-basis.md#r7-state-models)

Keep raw reference fixtures separate from regenerated outputs. Never update an expected result merely to make a failing test pass. Record normalization/tolerances and their semantic justification. Treat nondeterministic comparisons as distributions or bounded properties when necessary, with adequate observations and explicit limits.

## Preserve, improve or defer

For a consequential quirk or mismatch, first record what the selected original actually did, with scenario/evidence and version/configuration limits. Keep any explanation of its intent or cause as an inference. Then choose the reconstruction behavior from the current user goal and affected contracts, rather than assuming the original is optimal or that every awkward behavior is a defect.

| Decision | When it fits | Acceptance consequence |
| --- | --- | --- |
| Preserve | Required by the user's fidelity goal, an external consumer/file/protocol, or an established compatibility contract. | Retain meaningful outputs, state effects and required order/timing for that profile; compare against frozen original evidence. Don't normalize away a consumer dependency. |
| Improve | The authorized reconstruction goals support a deliberate difference and its dependency impact is understood sufficiently for the selected slice. | Define a separate proposed requirement and distinguishing test; retain unaffected compatibility checks and test the affected consumers/recovery paths. A better-looking result alone is insufficient. |
| Defer | Evidence is insufficient, a consequential choice remains unresolved, or work lies outside the useful current slice. | Keep the question, reason/impact and concrete next observation or revisit trigger visible. Required behavior stays pending or blocked; optional polish can wait. Deferral is neither a passing test nor removal of a hard requirement. |

Decide at the relevant interface/profile dimension: improved selection can coexist with a preserved export format. Check affected users, readers/writers, state transitions and indirect dependencies before changing a quirk. A duplicate-key rule or event sequence may look incidental yet be externally consumed. Preserve only the timing guarantees the contract needs, not every observed delay. Matching stale save feedback or silent data loss records parity; it does not meet a reliability goal. Don't reproduce harmful behavior unquestioningly: expose conflicts with safety constraints or other hard requirements and resolve the consequential tradeoff within actual authority.

Extend the existing requirement/decision row with a concise chain: original observation and evidence → user goal/constraint → affected interfaces/dependencies → disposition and rationale → reconstruction requirement and acceptance. Include material cost/tradeoff and unknowns. A short note suffices for a narrow function; no compulsory per-quirk form or approval ceremony. Existing build authorization supports routine decisions within its goals; ask a focused question when an unresolved consequential tradeoff needs the user's choice. Understanding or planning alone does not authorize implementation, and reconstruction authority does not authorize editing the original installed app.

Freeze original cases before adapting the candidate. An intentional-difference case should show how the original differs from the proposed acceptance and how the candidate satisfies it; retain relevant unchanged cases beside it. Keep profile results separate and never rewrite a historical oracle or switch profiles to make a failure pass. If original behavior cannot be observed, label that comparison unavailable and test a proposed contract only as such. On changed priorities or resume, reassess decisions and dependent acceptance applicability while retaining historical observations and justified reuse; see [checkpoint guidance](checkpoints.md#on-resuming).

## Coverage and failure reduction

### Selected transition checks

Use the [workflow state rows](blueprint.md#consequential-workflow-states) to
choose a few meaningful ordered cases. Reset between independent cases; preserve
state within each sequence. Fix expected outputs, errors and data invariants
from applicable reference evidence or a separately reasoned proposed contract
before adapting the candidate. Record which basis applies. Do not derive the
expected result from the implementation being checked.

Assert consequential intermediate states as well as the terminal outcome: for
example, failed save retains the prior committed bytes and a retryable session
draft; cancel removes the pending action; reopening reads committed data rather
than an abandoned preview. Those are examples of possible requirements, not
universal product rules. Test the selected guards through the actual action
boundary, rather than trusting a disabled control or status label.

Challenge coverage with a plausible faulty variant: first show that ordinary
success workflows still pass, then show that a selected transition check rejects
the defect. Preserve the original fixtures/oracles; keep deliberate defects in
test doubles or disposable candidates. Report sequences and initial states
actually exercised, skipped/unknown transitions, reset/reopen method and injected
faults. A finite authored example is neither general model understanding nor
original-app parity. The separate repository-only example is
`evals/workflow-edge-cases/README.md`; standalone installations do not include it.

For callbacks that can arrive after input/owner changes, apply
[controlled completion checks](asynchronous-results.md#select-distinguishing-ordered-checks).
Release actual promises explicitly and compare intermediate values, stale errors
and finalizers; a synchronous stale-token test does not exercise those paths.

### Coverage boundaries

Cover input partitions, boundaries, invalid cases, meaningful state transitions, and relevant configuration combinations. For large configuration spaces, constrained pairwise or higher-strength combinations can reduce work; choose strength by risk and state exactly what is covered. Interaction coverage is not code coverage, temporal sequence coverage, or a proof that all failures are found. [R8](research-basis.md#r8-combinatorial-coverage)

When a mismatch occurs, minimize the input or action sequence while preserving it and keep the result as a regression case. Maintain a separate set of reference cases not used to tune the implementation when practical. Held-out cases help reveal overfitting to a few examples; they do not prove global correctness. Reduction is grounded in [R5](research-basis.md#r5-differential-testing); the held-out split is a workflow recommendation.

When a larger input space justifies it, use [bounded differential fuzzing](validation-methods.md#bounded-differential-fuzzing) and report generator, seed, budgets, resets, and actual coverage. Challenge consequential tests with [targeted mutations](validation-methods.md#targeted-mutation-testing) in disposable reconstruction copies.

For visual fidelity, compare consistent viewport, scale, fonts, platform, and UI state. Explain dynamic-region masks and examine semantic behavior separately. Screenshot agreement alone does not validate data or interaction correctness. [R9](research-basis.md#r9-visual-baselines)
