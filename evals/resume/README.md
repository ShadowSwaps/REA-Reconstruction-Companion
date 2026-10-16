# Checkpoint/resume evaluation

These two synthetic supplied-evidence cases test a narrow resume decision: reuse a partial checkpoint when its target is unchanged, or mark artifact-dependent findings and verification stale when the selected target changes. The task stops before new investigation, implementation or execution. It does not add an approval gate to ordinary reconstruction work.

For a separate deterministic local demonstration that verifies preserved files,
completes a working candidate and captures fresh behavior after a process boundary,
see the [executable walkthrough](WALKTHROUGH.md). It does not change this triage-only task or certify agent actions.
The separate [evidence recovery demonstration](RECOVERY.md) continues from trusted
copies after missing/modified evidence, with explicit supersession and fresh tests.

The portable skill's [checkpoint guide](../../skills/rea-reconstruction-companion/references/checkpoints.md) describes the general method. This evaluation's small JSON format is only a fixture interface. It requires no AI SDK, memory service, package installation, network call or background worker. Existing Node.js 20+ runs the local reviewer checker. The core instructions and records can be used by other compatible hosts; these tests do not certify any host/model handoff.

## Evidence and the two decisions

The fixture is one score function, not an application. Build 1.0.0 accepts integers 0 through 1000 and caps them at 100. Build 2.0.0 changes the cap to 200. [partial-candidate.mjs](fixtures/partial-candidate.mjs) deliberately implements only input validation and returns accepted values unchanged. It is already incomplete for build 1, and remains incomplete for build 2.

[checkpoint.json](fixtures/checkpoint.json) records the old target/candidate identities, two findings and separate implementation/verification states. [input-report.json](fixtures/input-report.json) captures six actual local comparisons against hand-authored input-only expectations. Those six pass, but do not test the cap. Its passing status is scoped evidence, never full parity. These are maintainer-authored synthetic fixtures, not recovered third-party evidence or a live agent/REA trial.

| Case | Selected target | Expected resume decision |
| --- | --- | --- |
| `resume` | Same build 1 bytes; same partial candidate | Reuse both findings and the input-only result for their existing scope. Cap remains not started/unrun; overall parity stays unverified. Next implement the cap and test. |
| `changed-target` | Build 2 bytes; same partial candidate | Preserve old findings/report as historical. Their target-bound applicability and earlier input verification are stale. Retain implementation status and the user's scope/goal; reassess the current contract before adapting/testing. |

Both findings in this tiny checkpoint depend on the old artifact. Marking them stale at triage does not claim the input rule actually changed. Later evidence may establish that it is unaffected. The current task intentionally does not perform that later investigation. In a larger task, follow dependencies rather than invalidating unrelated artifact evidence or user decisions.

## A fresh agent evaluation

Choose the case before seeing the answer. Follow the no-additional-charges check in [the evaluation guide](../README.md); do not start extra agents, metered model calls or paid environments. If a suitable host is unavailable, keep actual-agent evaluation unrun and use the local regression tests only.

Give the agent the selected task from [cases.md](../cases.md), [TASK.md](TASK.md), the companion and relevant references, plus only the needed fixture evidence: `checkpoint.json`, `input-report.json`, `identity.json`, `partial-candidate.mjs`, and the selected target. For `changed-target`, the old target can also remain as explicitly historical evidence. The shared identity record identifies the fixed artifacts; it does not grant commands or filesystem access. Keep this README, `check.mjs`, examples, regression tests and prior answers with the reviewer. Public files are not secret held-out answers; record any prior exposure and real access limits.

The agent supplies `resumed.json` and an explanation, with its actual action trace retained for human review. Compare the JSON without importing any candidate code:

```sh
node evals/resume/check.mjs resume "/absolute/path/to/resumed.json"
node evals/resume/check.mjs changed-target "/absolute/path/to/resumed.json"
```

Run the one command matching the selected case. The checker has 15 fixed data comparisons, with stable failure labels. It ignores JSON object key order, but the fixture's keys/status values must match TASK.md; free prose belongs in the separate explanation. The report gives a canonical submission hash and fixture-identity-file hash. It does not print submission contents, private paths or stack traces. Exit 0 means those data comparisons passed; 1 means a value mismatch; 2 means invalid invocation, unreadable/malformed/oversized JSON, or fixture integrity failure. A tool error supplies no candidate score.

The checker accepts at most 65,536 bytes from an explicitly selected regular JSON file, rejects a directly linked record file, and inspects only its fixed repository-owned fixture paths. It does not execute targets/candidates, follow paths found in the submission, repair records, edit history, call REA or contact services. It is not hostile-filesystem containment: parent aliases, concurrent replacement and external host privileges remain outside its guarantees. Fixture hashes detect drift against the trusted package; they are not signatures or protection against replacing that trusted package and its identity record together.

## Worked records and observed checks

Reviewer/training answers are [examples/resume.json](examples/resume.json) and [examples/changed-target.json](examples/changed-target.json). They were authored by the maintainer with source/oracle exposure. [worked-results.json](examples/worked-results.json) records actual local comparisons: 15 passed for each record, zero failed. It also identifies the checker bytes. This demonstrates the data checker, not an independent agent making the correct decision.

Repeat those comparisons with the example JSON paths instead of an agent submission. To run the regression tests:

```sh
node --test tests/resume.test.mjs
```

The tests reproduce the six input-only comparisons, show the reference/candidate cap differences, verify the captured report's identities, check CLI exits/bounds and fixture drift, and retain original checkpoint/report bytes. Fourteen deliberately incorrect records fail at their intended `value-mismatch`, including an old hash under the correct new version, stale findings/report marked current, partial success inflated to parity, discarded history, changed candidate identity and invented scope/behavior changes. This is selected regression coverage, not a general mutation score or a model evaluation. No initial candidate-agent failure is claimed; the first 22-test local run passed.

## Human review remains necessary

Apply [rubric.md](../rubric.md) and [review-template.md](../review-template.md). A passing JSON claim that history was preserved does not prove any file was preserved. Reports therefore always retain `humanReview: pending`, `preservationOnDisk: unverified`, `actualAgentActions: unverified` and `reaTrial: not-run`. Inspect actual file identities and action traces, reasoning, evidence citations, current user intent, scope/cost boundaries and the absence of prohibited actions. Reading an embedded permission or writing the expected labels is not authorization or verified compliance.

This triage example exercises an unchanged and a changed target at a resume boundary. Candidate changes are represented by identity mismatch tests; missing/modified evidence has a separate local recovery demonstration linked above. Runtime/environment drift, multi-artifact dependency selection and full cross-host continuation remain separate future evaluations. A new live evaluation or later implementation must record its own results. Passing this checker does not approve a merge, release, installation or publication.
