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

## Evidence dependencies

Record why a conclusion is supported and what could falsify it. Two reports derived from the same capture are not two independent observations. Do not turn confidence labels into unsupported statistical probabilities. Preserve contradictory findings and conditions that explain them. When the target or an analysis assumption changes, reassess the dependent claims instead of carrying forward their verified status.

## Comparison and test oracles

A test oracle is the basis for deciding whether a result is acceptable. Choose it explicitly:

- **Reference comparison:** replay equivalent inputs against the original and rebuild, or use captured original outputs. Compare meaningful outputs, state changes, and failure behavior. A difference is a candidate discrepancy, not proof that the rebuild is wrong; investigate allowed variation, reference defects, and harness errors. [R5](research-basis.md#r5-differential-testing)
- **Independent specification/model:** test against a documented contract or separately reasoned domain model. Identify whether that model was validated against the reference or is proposed behavior.
- **Properties and metamorphic relations:** when exact answers are unavailable, test justified relationships between related runs, such as a lossless supported export/import preserving chosen fields. Specify the relation's preconditions; do not assume universal idempotence, sorting invariance, or reversibility. Passing establishes the tested relationship, not parity. [R6](research-basis.md#r6-metamorphic-testing)
- **Stateful testing:** generate or enumerate useful action sequences and compare state/invariants after each step. Preserve failing sequences and reduce them to understandable cases. Use the project's existing language/tooling rather than requiring Hypothesis. [R7](research-basis.md#r7-state-models)

Keep raw reference fixtures separate from regenerated outputs. Never update an expected result merely to make a failing test pass. Record normalization/tolerances and their semantic justification. Treat nondeterministic comparisons as distributions or bounded properties when necessary, with adequate observations and explicit limits.

## Coverage and failure reduction

Cover input partitions, boundaries, invalid cases, meaningful state transitions, and relevant configuration combinations. For large configuration spaces, constrained pairwise or higher-strength combinations can reduce work; choose strength by risk and state exactly what is covered. Interaction coverage is not code coverage, temporal sequence coverage, or a proof that all failures are found. [R8](research-basis.md#r8-combinatorial-coverage)

When a mismatch occurs, minimize the input or action sequence while preserving it and keep the result as a regression case. Maintain a separate set of reference cases not used to tune the implementation when practical. Held-out cases help reveal overfitting to a few examples; they do not prove global correctness. Reduction is grounded in [R5](research-basis.md#r5-differential-testing); the held-out split is a workflow recommendation.

For visual fidelity, compare consistent viewport, scale, fonts, platform, and UI state. Explain dynamic-region masks and examine semantic behavior separately. Screenshot agreement alone does not validate data or interaction correctness. [R9](research-basis.md#r9-visual-baselines)
