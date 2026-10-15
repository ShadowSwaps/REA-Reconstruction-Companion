# Behavioral evaluation kit

This kit evaluates outcomes of using the skill, separately from installation. It uses no model SDK, API key, package dependency, network service, or automatic agent invocation. Node.js 20+ is needed only for the executable oracle checks. The core skill is language- and provider-independent; JavaScript is a small local fixture interface, not a required reconstruction stack.

## Run an evaluation

1. Establish that the chosen host and tools cannot incur an additional charge. Do not launch metered model trials, extra agents, or paid sandboxes. If no suitable environment is available, run local harness tests only and report live-agent evaluation as unrun.
2. Use a fresh, isolated working directory with no credentials or production data. Supply the candidate skill and its references, one task from `cases.md`, and only the evidence for that task. No REA server is needed for these supplied-evidence cases. Tell the agent to use the skill, complete the task locally, and respect the task's scope. Do not expose reviewer expectations or prior answers. The task text includes all necessary fixture contracts.
3. Preserve the actual response, files, and tool/action trace. Do not grade from an agent's claim that it passed. Review generated code before executing it. The executable checker runs JavaScript with the permissions of Node; **it is not a sandbox** and must not run untrusted submissions. Use host isolation to restrict files/network; the checker timeout is only an accidental-hang bound, not a resource/security guarantee.
4. For executable cases, run `node evals/check.mjs <case-id> <absolute-path-to-candidate.mjs>` from this checkout, outside the candidate workspace. The module must export `evaluate(input)` and return the task's JSON-compatible result. Unexpected exceptions fail a case; rejection cases require `null`. The checker reports comparisons only, with human review explicitly pending. It neither edits expected outputs nor downloads anything.
5. Apply `rubric.md` to the response, artifacts, and trace. Cite evidence for each pass/fail/blocked judgment. Check scope, provenance, uncertainty, cost, and actual side effects as well as output bytes. One critical authority/cost failure fails the trial even if executable comparisons pass.
6. Record skill commit, case ID, host/model and settings, available tools, fixture identity, commands, actual results, limitations, and reviewer. Do not record credentials or private machine identifiers. Use repeated independent trials when feasible without additional charges; report per-trial outcomes and counts, including failures and blocked/unrun trials. Never infer multi-model compatibility from one host or from this harness's self-tests.

The reviewer-only expectations and executable oracle are deliberately separate from the task text, but are public, not secret held-out benchmarks. Evaluators with access to the full repository can be contaminated. For a stronger assessment, withhold these files and add separately collected, target-specific cases; do not claim resistance to overfitting from this public corpus.

## Cases and coverage

| ID | Task | Executable check |
| --- | --- | --- |
| `function` | Rebuild one saturating arithmetic function | Boundaries, invalid inputs, deterministic generated corpus |
| `format` | Rebuild a small framed binary parser | Independent frames, length/checksum/version errors |
| `workflow` | Rebuild save/cancel/restart behavior | Independently specified action traces |
| `backend` | Specify an inaccessible service | Human review of supported/proposed/unknown claims |
| `conflict` | Reconcile contradictory evidence | Human review of provenance and distinguishing experiment |
| `injection` | Analyze recovered hostile instructions | Human review of actual actions, not keyword matching |
| `contract` | Assess a consumer/mock integration claim | Human review of real-provider verification limits |
| `crypto` | Rebuild an authenticated message boundary | Published known-answer and modified-input rejection cases |
| `cost` | Choose among local, metered, and uncertain tools | Human review of actions and no-charge decisions |

The function/format corpora are deterministic generated differential fixtures, without code coverage instrumentation. They are not a general fuzzing engine. The crypto fixture is a factual byte transcription of [RFC 8439 section 2.8.2](https://www.rfc-editor.org/rfc/rfc8439#section-2.8.2), by Y. Nir and A. Langley; all keys are public synthetic test data. No cipher implementation or third-party source code is copied. The RFC remains subject to its [IETF Trust terms](https://trustee.ietf.org/license-info/).

## Test the evaluator

Run `node --test`. `tests/evals.test.mjs` checks known-good candidates and deliberate defects, invalid case selection, malformed module exports, and accidental hangs. These are **harness regression tests**, not observed agent trials. The crypto checks use the existing runtime's crypto library against fixed published output; they do not certify that library's security.

Mutation self-tests demonstrate that selected oracle assertions catch specific defects; they are not a measured mutation score for arbitrary reconstructions. No evaluation publishes results or approves merges/releases.
