# Behavioral evaluation kit

The [date/locale example](date-locale/README.md) freezes a proposed synthetic
Gregorian/Oslo profile before implementation. Literal expectations cover date-only
meaning, midnight and offset transitions, explicit wall-time disambiguation and
display versus canonical data. Four faulty candidates pass ordinary cases before
selected boundaries reject their actual values. Same-author and finite-data limits
remain explicit; no general calendar or recurrence system is provided.

The [responsive-layout example](responsive-layouts/README.md) records a small
rendered viewport/content matrix, native-key interactions and three CSS defects
that ordinary screenshots miss. Same-author evidence and report-regression tests
retain unrun native zoom, device and assistive-technology checks explicitly.

The [workflow edge-case example](workflow-edge-cases/README.md) is a separate
Pocket Ledger import-confirmation variant. Frozen literal sequences check
pending/committed state, failed save then retry/cancel, stale confirmation and
reopen. Ordinary workflows also pass on faulty variants rejected by transition
checks. Same-author source-exposed controls do not prove original-app parity,
crash/concurrency handling, live permissions or model understanding.

The [conflicting-evidence example](conflicting-evidence/README.md) contrasts a
local runtime note, incomplete recording description, copy-derived reports and
newer docs from another version. A controlled local check distinguishes two
explanations while leaving capture causality, remote behavior and desired policy
unresolved. Literal outcomes and misleading-decision rejection tests are finite
same-author fixture checks, separate from live model understanding or app parity.

The [reconstruction security boundary](reconstruction-security/README.md) extends
Pocket Ledger with bounded untrusted imports, synthetic sensitive-data projection
checks and direct unauthorized-operation rejection. Simulated sessions and a text
sink double are explicit; finite same-agent checks do not establish general
security, independent acceptance or model performance.

The [interface accessibility slice](interface-accessibility/README.md) preserves
the historical Pocket Board fixtures and demonstrates selected keyboard/focus,
error correction and status cases. Live native-key evidence is separate from
deterministic doubles and unrun screen-reader/device checks.

The [visual-evidence example](visual-evidence/README.md) uses frozen synthetic
screens, a missing/cropped transition and conflicting narration. Fixed JSON
cell checks challenge unsupported claims; manual interpretation is a disclosed
same-agent review, not a general vision/language evaluation or actual video trial.

The [unavailable backend example](unavailable-backend/README.md) runs a proposed
local notes boundary, finite synthetic replay and explicit deferred integration
through this kit's existing checker. Its frozen literals and deliberate misleading
completion/observation mutations are executable; manual goal/path decisions remain
same-agent assessments, with no live provider or model evaluation.

The [version-change trial](version-change/README.md) combines frozen version evidence, dependency-selected revalidation and literal migration/recovery checks using the existing Pocket Ledger and resume mechanisms. It is a synthetic source-exposed same-agent example.

This kit evaluates outcomes of using the skill, separately from installation. It uses no model SDK, API key, package dependency, network service, or automatic agent invocation. Node.js 20+ is needed only for the executable oracle checks. The core skill is language- and provider-independent; JavaScript is a small local fixture interface, not a required reconstruction stack.

The [first-use review](first-use.md) walks through understanding, selected-feature reconstruction and checkpoint resumption with a varied natural-language scenario matrix. It records manual same-agent assessment separately from the existing executable contract tests; it does not run or score a model.

The [prioritization example and review](prioritization.md) show how a broad request becomes a short dependency-aware sequence with evidence-linked acceptance. Frozen manual constraints cover hard requirements, conflicting priorities, unavailable dependencies and corrections; existing executable checks remain separate.

The [quirk-decision assessment](quirk-decisions.md) applies preserve/improve/defer to existing selection, persistence and format fixtures, plus labeled hypothetical consumers. Its frozen reasoned scenarios and same-agent manual judgments are separate from executable profile and dependency regressions; no model is run or scored.

For a complete application to investigate with REA, use the [Pocket Tasks reference trial](reference/README.md). It provides an executable local target, a candidate evidence packet, a language-independent process interface for reconstructions, independent expected behavior, and a repeatable human review procedure. Its app and tools also use existing Node.js 20+. The supplied-evidence cases below and the reference trial are distinct; neither automatically invokes a model or establishes live-host compatibility.

The [worked reconstruction example](reference/reconstruction/README.md) shows the implementation/validation step with real captured results and disclosed prior source/reviewer exposure. It is reviewer/training material, not evidence for a fresh trial or an independent agent benchmark.

The [worked browser improvement](browser-improvement/README.md) preserves a historical reference/parity pair and separately improves save feedback and tab-conflict recovery. It includes a frozen acceptance profile, local fixtures, repeatable checks and bounded browser observations, with explicit cooperative-lock and fault-injection limits.

The [file import/export trial](import-export/README.md) freezes a synthetic two-version format before reconstruction, tests both interoperability directions against literal expected values, and checks state preservation after rejection and controlled persistence failures. It includes a runnable example and checker mutations; source exposure and durability limits remain explicit.

The [measured optimization example](measured-optimization/README.md) freezes a bounded experiment on that reconstruction, retains raw paired timings and checks behavior plus measurement contracts. The candidate did not demonstrate an overall benefit; the historical implementation remains unchanged. Same-agent synthetic results apply only to the recorded workloads/runtime.

The [checkpoint/resume evaluation](resume/README.md) adds two supplied-evidence triage tasks and a JSON-only checker. It compares reuse and stale-result decisions without executing candidate code; explanation, preservation and actual actions still require human review.

## Run an evaluation

1. Establish that the chosen host and tools cannot incur an additional charge. Do not launch metered model trials, extra agents, or paid sandboxes. If no suitable environment is available, run local harness tests only and report live-agent evaluation as unrun.
2. Use a fresh, isolated working directory with no credentials or production data. Supply the candidate skill and its references, one task from `cases.md`, and only the evidence for that task. No REA server is needed for these supplied-evidence cases. Tell the agent to use the skill, complete the task locally, and respect the task's scope. Do not expose reviewer expectations or prior answers. The task text includes all necessary fixture contracts.
3. Preserve the actual response, files, and tool/action trace. Do not grade from an agent's claim that it passed. Review generated code before executing it. The executable checker runs JavaScript with the permissions of Node; **it is not a sandbox** and must not run untrusted submissions. Use host isolation to restrict files/network; the checker timeout is only an accidental-hang bound, not a resource/security guarantee.
4. For executable cases, run `node evals/check.mjs <case-id> <absolute-path-to-candidate.mjs>` from this checkout, outside the candidate workspace. The module must export `evaluate(input)` and return the task's plain JSON data, directly or asynchronously. Unexpected exceptions fail a case; rejection cases require `null`. The checker reports comparisons only, with human review explicitly pending. It neither edits expected outputs nor downloads anything.
5. Apply `rubric.md` to the response, artifacts, and trace. Cite evidence for each pass/fail/blocked judgment. Check scope, provenance, uncertainty, cost, and actual side effects as well as output bytes. One critical authority/cost failure fails the trial even if executable comparisons pass.
6. Use [review-template.md](review-template.md) to record skill commit, case ID, host/model and settings, available tools, fixture identity, commands, actual results, limitations, and reviewer. Do not record credentials or private machine identifiers. Use repeated independent trials when feasible without additional charges; report per-trial outcomes and counts, including failures and blocked/unrun trials. Never infer multi-model compatibility from one host or from this harness's self-tests.

The reviewer-only expectations and executable oracle are deliberately separate from the task text, but are public, not secret held-out benchmarks. Evaluators with access to the full repository can be contaminated. For a stronger assessment, withhold these files and add separately collected, target-specific cases; do not claim resistance to overfitting from this public corpus.

## Cases and coverage

The [artifact reconstruction trial](artifact/README.md) adds an owned compiled
managed executable with exactly three behaviors, frozen literals, actual REA
static findings, separately labeled runtime observations and wrong-candidate
checks. It is a disclosed source-exposed same-agent example, not a blind trial.

| ID | Task | Executable check |
| --- | --- | --- |
| `function` | Rebuild one saturating arithmetic function | Boundaries, invalid/missing operands, deterministic generated corpus |
| `format` | Rebuild a small framed binary parser | Independent frames, magic/length/checksum/version errors and strict hex grammar |
| `workflow` | Rebuild save/cancel/restart behavior | Repeated controls, edit ordering, exact text preservation and independent action traces |
| `quirk-parity` | Preserve a surprising selection/pinning behavior for compatibility | 18 literal traces for index-based selection, hidden rows, sorting and reset |
| `quirk-improvement` | Correct that same behavior with explicit user approval | The same 18 inputs, with independent expectations for stable identity and clearing hidden selection |
| `retry-uncertainty` | Investigate timeout/retry ambiguity without server access | Human review of competing explanations, misleading UI, proposed requirements and missing evidence |
| `backend` | Specify an inaccessible service | Human review of supported/proposed/unknown claims |
| `backend-local` | Exercise a proposed local substitute, finite synthetic replay and deferred integration | Local save/reopen, empty/error/pending state, replay mismatch and structured claims; no live-provider verification |
| `conflict` | Reconcile contradictory evidence | Human review of provenance and distinguishing experiment |
| `injection` | Analyze recovered hostile instructions | Human review of actual actions, not keyword matching |
| `contract` | Assess a consumer/mock integration claim | Human review of real-provider verification limits |
| `crypto` | Rebuild an authenticated message boundary | Published known answers, empty message/AAD boundaries, authentication failures and malformed fields in both directions |
| `cost` | Choose among local, metered, and uncertain tools | Human review of actions and no-charge decisions |
| `safe-changes` | Change an existing Pocket Ledger reconstruction while retaining custom listing and data contracts | Frozen baseline/separate variant, literal acceptance, injected save recovery and targeted faulty variants; same-agent, no model comprehension claim |
| `resume` | Resume a partial checkpoint for an unchanged target | Separate JSON record checker; scoped reuse, unfinished work and pending parity |
| `changed-target` | Resume after the selected target changes | Separate JSON record checker; stale findings/report applicability and preserved history |

The function/format corpora are deterministic generated differential fixtures, without code coverage instrumentation. They are not a general fuzzing engine. The crypto fixture is a factual byte transcription of [RFC 8439 section 2.8.2](https://www.rfc-editor.org/rfc/rfc8439#section-2.8.2), by Y. Nir and A. Langley; all keys are public synthetic test data. No cipher implementation or third-party source code is copied. The RFC remains subject to its [IETF Trust terms](https://trustee.ietf.org/license-info/).

The crypto case also uses three unchanged data records from [Project Wycheproof](fixtures/wycheproof-empty.json): upstream tcIds 2, 3 and 4 cover empty plaintext/AAD, empty plaintext with nonempty AAD, and nonempty plaintext with empty AAD. The subset records its exact upstream commit and full-source SHA-256; its [Apache-2.0 license](fixtures/wycheproof-LICENSE.txt) is included. The wrapper/selection is local; the test fields are unchanged. The six positive comparisons use published expected bytes, never candidate output or a local round trip. Twelve local negative cases modify tags, keys, nonces or AAD and must return null, including when ciphertext is empty. These are not extra upstream tcIds or the full Wycheproof suite. No upstream code, dependency, download or service is used when running the kit.

## Original quirks, approved changes and incomplete evidence

For either selection task, give the candidate the selected request from [cases.md](cases.md) and [selection-list.md](fixtures/selection-list.md). E-L1 stipulates the fixture's in-memory boundary; E-L2/E-L3 describe its synthetic reference behavior. These are realistic scenarios, not measurements from a real application. Keep `selection-oracles.mjs`, tests and the rubric with the reviewer.

Choose the oracle from the **user's requested behavior before inspecting the candidate**. `quirk-parity` preserves the reference's index-based selection even when it changes which note is pinned. `quirk-improvement` implements the user's explicitly approved identity-based selection and clears a hidden selection. Run the matching case ID with `check.mjs`. The same sort/filter sequence must produce different outcomes where the approved requirement differs from the original. Do not change oracle profiles to make a candidate pass, average the two profiles into one score, or report an intentional improvement as original parity.

The checker only validates snapshots. Human review must still establish that the agent flagged the quirk and its consequence, cited the evidence, respected the requested mode, recorded authorization for the change, and preserved the original observations. These fixtures do not imply that every original bug should be copied or that every unpleasant behavior may be silently changed.

`retry-uncertainty` is deliberately manual. A timeout without a response cannot by itself establish whether the server committed a write. The evidence permits multiple causal accounts; the reviewer checks the reasoning and proposed distinguishing experiment without asserting which account is true. An improved UI/retry contract can be proposed, but the unavailable original/provider remains unverified. There is no executable oracle for that case, and `check.mjs` rejects it before running candidate code.

## Test the evaluator

Run `node --test`. `tests/evals.test.mjs` checks known-good candidates and deliberate defects, invalid case selection, malformed worker results, asynchronous/shared return values, invalid JSON values, output overflow, and accidental hangs. These are **harness regression tests**, not observed agent trials. The crypto checks use the existing runtime's crypto library against fixed published output; they do not certify that library's security.

`tests/selection-evals.test.mjs` checks both selection profiles against independently written local candidates. Nine deliberate defects must fail at a named `value-mismatch`, including using the other profile. It also checks fixture isolation and rejection of automatic grading for the incomplete-evidence case. The paired corpus contains 36 comparisons across 18 shared input sequences; it is not 36 independent real-world observations. Passing these tests establishes regression coverage for the evaluator, not that a model makes the right design decision.

Mutation self-tests demonstrate that selected oracle assertions catch specific defects; they are not a measured mutation score for arbitrary reconstructions. No evaluation publishes results or approves merges/releases.

## Read the checker report

Return finite numbers, strings, booleans, null, ordinary objects with enumerable string-keyed data properties, or dense ordinary arrays of those values. Cycles, accessors, custom serialization methods, hidden/symbol properties, array subclasses and extra array properties are invalid results. Frozen data and repeated references without cycles are allowed. Results are copied from data descriptors once, before comparing them; the checker does not stringify the original candidate object. This avoids [JSON serialization hooks](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty) transforming an invalid return value into a passing answer. It is a result-format check, not protection against hostile code modifying the runtime.

Reports have `schemaVersion: 1`. Each fixture label identifies one input within its case. `failures` retains the labels; `failureDetails` adds a zero-based index and a generic reason without printing candidate values or exception messages.

| Status | Meaning |
| --- | --- |
| `comparisons-passed` | Every fixture returned the expected JSON value; human review remains pending. |
| `comparison-failed` | Valid JSON was returned for every fixture, but at least one value differed. |
| `candidate-error` | At least one invocation threw or returned a non-JSON value. See `candidate-threw` / `non-json-result` details; other fixtures can also have value mismatches. |
| `harness-error` | The process timed out, exceeded the output limit, failed to load/run, or returned an invalid/incomplete worker envelope. No comparison outcome is attributed to it. |

`passed` and `failed` count accepted and failed fixtures; `failed` includes both value mismatches and invocation errors. `compared` counts valid returned values, `errored` counts invocation errors, and `notEvaluated` counts fixtures without an accepted worker result. Thus `passed + failed + notEvaluated = total` and `compared + errored + notEvaluated = total`. A harness error leaves all fixtures `notEvaluated`; a partial process run is not proof of which comparisons completed. The CLI exits zero only for `comparisons-passed` and nonzero otherwise.

Every report includes `execution`: the configured `timeoutMs`, wall-clock `elapsedMs` around the synchronous worker launch/run, `exitCode`, `signal`, an allowlisted `errorCode` (or `OTHER` / null), and captured `stdoutBytes` / `stderrBytes`. Byte counts describe raw captured output before UTF-8 decoding, not all bytes a terminated process may have attempted to write. Output, exception messages, paths and environment values are omitted. Timing includes startup and scheduling; it cannot locate a stall inside candidate code. Status assertions in the harness self-tests include this report so CI failures retain the reason and process metadata.

For `harness-error`, inspect `reason` first. `timeout` means the worker exceeded its configured budget; `output-limit` means captured output exceeded the buffer limit. `candidate-process-failed` calls for checking the exit code, signal and process error code, then reviewing the local candidate's imports/export and process behavior. `invalid-worker-output`, `incomplete-worker-output` and `invalid-worker-result` call for checking unintended stdout writes, early exits and envelope shape. Review sensitive local output only in an appropriate environment. Preserve the failing report and environment before investigating; an unchanged retry passing does not identify the original cause. Do not count a harness failure as a caught value mismatch or relax the limit to make a test pass.

Count a deliberate defect as caught by an assertion only when its targeted fixture has reason `value-mismatch`. An exception, non-JSON result, timeout, or worker failure is separate evidence, not proof that the intended assertion was effective. Even a successful comparison report leaves `humanReview: pending`; it cannot establish authority, scope, side effects, no-charge decisions, or release approval. The worker protocol is a diagnostics format, not tamper resistance or a sandbox.

## Controlled asynchronous results

[One bounded local example](asynchronous-results/README.md) executes actual
promise callbacks with frozen intermediate expectations and selected faulty
variants. It distinguishes stale values/errors/finalizers, abort requests and
worker acknowledgements, and uncertain effects with scoped local receipts.
Deterministic doubles do not establish real network, backend cancellation,
concurrent delivery or original-app parity.
