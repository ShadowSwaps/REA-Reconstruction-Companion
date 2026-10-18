# Focused validation methods

Read the relevant section when it can resolve a selected reconstruction risk. Use existing local tools, preserve independent evidence, and obey the main skill's no-additional-charges constraint. These methods do not require a particular language, framework, cloud service, or REA capability.

## Bounded differential fuzzing

Start with an independently preserved reference corpus and a comparator for meaningful outputs, errors, and state effects. Record target/version, reset procedure, generator/seed, input-size limits, iteration/time/resource budgets, and reproduction command. Run only in an authorized disposable environment; a reference process may have side effects. Never fuzz a live service or user's original data by implication.

Generate inputs appropriate to the recovered contract: boundary values and malformed bytes for a decoder, grammar-aware messages for a structured protocol, or valid and invalid action sequences for a stateful feature. Use coverage guidance when available; otherwise call the work generated differential testing and report that code coverage is unknown. Do not install a fuzzing engine just to satisfy this guidance. [R17](research-basis.md#r17-differential-fuzzing)

Replay equivalent cases on the reference and reconstruction, resetting state between independent cases. Preserve state within a sequence. Retain raw results and justified normalization. Classify differences as behavioral discrepancies, allowed variation, reference defects, or harness/environment failures before changing the implementation. A crash or timeout is an observation to investigate, not automatically proof of a reconstruction defect.

Minimize an input or sequence while preserving the same discrepancy; retain the smallest verified reproducer and a regression check with its independent expected outcome. Keep held-out cases separate from tuning cases. Stop at the declared budget and report cases run, failures, reductions, exclusions, and coverage actually measured. Coverage growth and a clean bounded run are not proof of equivalence.

## Targeted mutation testing

After ordinary tests pass, select a consequential slice and a few plausible faults: off-by-one boundaries, inverted guards, removed validation, incorrect state persistence, or ignored authentication failure. Mutate only a disposable copy of the reconstruction. Keep the reference, raw fixtures, expected outcomes, installed apps, and production data unchanged. Use deterministic local tools or small manual mutations; a mutation service is not required. [R18](research-basis.md#r18-mutation-testing)

Run the same relevant tests for each mutation, with bounded execution. Record each mutation and actual outcome:

- **Killed:** a relevant assertion detects the deliberate behavioral error.
- **Survived:** tested behavior did not distinguish the mutant; examine the missing scenario or oracle.
- **Not covered:** the mutated behavior was not exercised.
- **Invalid/equivalent:** it cannot execute, or evidence shows no meaningful behavioral difference in scope; explain exclusions.
- **Inconclusive:** timeout, infrastructure failure, or unrelated test failure; investigate separately instead of counting it as a useful kill.

Do not assume a survivor is equivalent merely because tests pass, or change golden outputs to increase a score. Add a meaningful acceptance test only where a survivor exposes a real gap. Report selected/killed/surviving/excluded/inconclusive counts and reasons; small targeted samples and mutation scores do not certify overall test quality. Discard the disposable mutations after recording results; never ship a deliberate defect.

## Executable interface contracts

For an actual consumer/provider boundary, turn observed or proposed expectations into executable cases. Each case identifies the consumer/provider versions, initial provider state, request/event and encoding, missing versus null fields, relevant response/error semantics, and observable side effects. Include applicable authentication, retry/idempotency, ordering, and version behavior without expanding a narrow task unnecessarily. [R19](research-basis.md#r19-executable-contracts)

Test the consumer against these expectations, then replay them against the real provider in an authorized local/test environment with controlled fixtures. Assert outcomes and persistent effects, not merely schema-valid success responses. Keep contract files and evidence versioned; surface breaking changes and explain any tolerance. No hosted broker, external upload, or paid testing API is needed.

Label each interaction as verified against a named real provider/version, tested only with a mock, proposed, or blocked. When the provider is inaccessible, consumer/mock checks remain provisional and cannot validate its implementation. Contracts cover the recorded interactions; retain integration and end-to-end checks for behavior outside that boundary.

For [local substitutes or supplied finite replay](unavailable-backends.md), freeze proposed expectations separately from original observations. Check unavailable versus empty, replay mismatch and local-versus-remote state effects; challenge structured misleading completion claims through the actual comparison path. These checks do not certify arbitrary prose or an unseen provider.
