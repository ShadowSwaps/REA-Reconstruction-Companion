# Worked reconstruction: implement the observed contract, then compare

This completes the [Pocket Tasks investigation](../WALKTHROUGH.md) with a separately written implementation and recorded executable validation. It is a **maintainer-informed teaching example**: the author had already seen the original source, reviewer scenarios, tests and prior answers. It is not a blind trial, clean-room reconstruction, model comparison, independent evaluation, or host compatibility certification.

The reference is still Pocket Tasks 1.0.0. The companion package containing this extension is v1.3.3. Those version numbers identify different artifacts. The historical investigation and its limitations remain unchanged; no new REA analysis is claimed for this implementation step. Its actual REA excerpt, runtime inputs/outputs and evidence-linked R1–R6 requirements remain in the linked investigation.

## Scope and implementation checkpoint

The existing investigation ended at an explicit implementation checkpoint: preserve the observed behavior, keep saved and draft state separate, and compare R1–R6 before claiming compatibility. The human subsequently requested this worked reconstruction and thorough validation. That request authorizes implementation and local tests; the selected compatibility goal still preserves the selection quirk. Source and reviewer exposure were known before implementation, not discovered after scoring.

The candidate implements the supplied process interface, all nine commands, schema-1 storage, explicit save/cancel/restart, command errors, and the stated capacity/input limits. It uses a single already available Node.js 20+ runtime and its standard library. No package installation, model SDK, paid API, extra agent, scheduler or network service is involved. It does not change the skill's runtime requirements or require users to install this example.

This is a bounded single-writer example. Concurrent writers, crashes during replacement, hostile filesystem races, UI rendering, inaccessible backends and production performance remain outside the parity claim. The local scripts do not enforce host billing or sandbox arbitrary code. Review the candidate before executing it through the host's normal permissions.

## Design chosen for the reconstruction

[candidate.mjs](candidate.mjs) is self-contained and imports only Node's filesystem and path libraries. It does not import, call, wrap, or load the reference, checker, captured observations or reviewer corpus. A regression test copies only that file to another directory and runs save behavior there. This demonstrates runtime independence on the tested runtime; prior source visibility still prevents a claim of independent discovery.

The implementation uses three cooperating pieces in one file:

- `TaskSession` retains saved/draft documents, a filter and a visible-row position. A command-handler map performs transitions, then snapshots the resulting state.
- `DiskStore` validates the supplied path, loads a valid document or the observed initial seed, and performs explicit save through an exclusively created `.pending` file. A collision never grants ownership of that foreign file.
- The process adapter validates the batch and byte limits before executing commands, emits one JSON array, and returns exit 2 with a diagnostic for startup/input errors.

These are reconstruction design choices, not a claim that REA recovered these classes in the original. Snapshot cloning prevents earlier responses changing when a later command edits the draft. The original row-position quirk is deliberate: filtering can retarget selection, and removal can move selection to another task. Stable-ID selection remains the separately proposed improvement; it was not silently introduced here.

## Requirements → implementation → checks

All rows below are required for this compatibility exercise and implemented. Verification is limited to the named scenarios and boundaries, not all possible command sequences.

| Requirement | Evidence and implementation | Actual acceptance coverage |
| --- | --- | --- |
| R1 Draft isolation and exact accepted titles | W1; `TaskSession` edits only its draft and snapshots cloned rows | W1 replay; checker startup/unsaved sessions; standalone and UTF-16 boundary tests |
| R2 Explicit save/restart | W2; `DiskStore.write`, new-session transient state | W2 replay; checker save/restart and imported-schema sessions; standalone save test |
| R3 Cancel restores saved data and identifier state | W2–W4; cancel replaces the draft, retaining filter and row | W2–W4 replay; checker cancel/identifier and dirty-state sessions |
| R4 Preserve row-selection quirks | W3–W4; selected row is resolved against the current filtered list | W3–W4 replay; checker filter, hidden-selection and removal sessions |
| R5 Valid empty stores and tested errors | W5–W6; strict schema loading, explicit error precedence | W5–W6 replay; checker empty/error/malformed-input sessions; invalid-store and input-limit tests |
| R6 Collision-safe failed save | W7; exclusive pending-file creation and ownership-aware cleanup | W7 replay compares foreign bytes; save-collision and retry test |
| Additional supplied interface bounds | TASK.md limits plus disclosed source inspection; validators and process adapter | 64/65 command boundary, 65,536/65,537 byte boundary, 32-task and ID exhaustion, 80/82 UTF-16 title cases, linked/relative paths |

These checks also exercise reordered valid JSON keys and operation names such as `constructor`; the handler map must treat unknown strings as unknown operations. The boundary tests use fixed expectations. They do not change the reviewer oracle or learn expected results from candidate output.

## Observed validation and failure history

[validation-report.json](validation-report.json) is an actual captured run of the fixed local validator. It binds the candidate, target, observations, checker, packet tool and validator to their SHA-256 identities. The existing checker's corpus identity remains in the report. Absolute command paths are omitted from this public derivative; hashes identify source bytes, not a signature, runtime binary or executing host.

- The independent hand-authored checker corpus passed **16 of 16 process sessions across 12 scenarios**, with zero failed or unrun sessions. “Independent” describes how the expected values were authored; the evaluator/author was not independent or unexposed.
- Replay against previously captured reference observations passed **10 of 10 sessions across seven scenarios**. These overlap the checker behavior and must not be counted as 26 independent real-world observations.
- A fresh evidence packet was prepared and verified before and after that validation run. This checks the copied evidence's integrity. The candidate was written earlier from the disclosed existing investigation and runs independently; this does not establish candidate access isolation or a fresh REA investigation.

[validation-history.json](validation-history.json) preserves the first focused test attempt: five of nine tests passed, and four failed in a restricted Windows sandbox. Save/replacement checks and directory-link creation were affected. Without changing the candidate, the same nine tests passed under the permitted local execution environment. This was an environment limitation; it is not a candidate bug fixed by editing expectations. No candidate-code mismatch was found in those successful comparisons. The later full regression suite additionally checks that the saved report's identities remain current.

The replay compares command response JSON and saved document JSON semantically; ordinary JSON key ordering and whitespace are not parity requirements. It requires error status and a diagnostic, but not identical diagnostic text. Malformed original stores and foreign pending files are compared byte-for-byte where preservation is required. No timestamps, task IDs, meaningful fields or failures are normalized away. A failed session blocks its dependent later sessions; independent scenarios continue.

## Repeat the example

From a trusted checkout or extracted release, first inspect `candidate.mjs` and `validate.mjs`. With existing Node.js 20+:

```sh
node evals/reference/reconstruction/validate.mjs
node --test tests/reference-reconstruction.test.mjs
```

The validator accepts no command override. It runs only the fixed repository-owned candidate, uses new disposable stores and a fresh evidence packet, prints a new JSON report, and removes its temporary directories. It does not overwrite the captured report, run a model, invoke REA, install anything, or publish results. Exit 0 means all comparisons passed; 1 means a behavioral comparison failed; 2 means validation could not complete. A thrown inspection or cleanup error is a tool error, not a fabricated comparison score.

To launch the candidate directly, use the process boundary:

```sh
node evals/reference/reconstruction/candidate.mjs --store "/absolute/path/to/disposable/tasks.json"
```

Use an existing directory and a disposable filename; send a JSON array on stdin and close it with EOF. For example, `[{"op":"add","title":"Example"},{"op":"save"}]` should return two responses and persist the added task. Windows absolute JSON paths may use forward slashes. `--help` describes this boundary. Do not point the example at a real task store you need to retain.

For a new agent trial, follow the [separate reference procedure](../README.md) and withhold this entire reconstruction directory, the worked investigation, tests and reviewer answers. This public example cannot become a held-out benchmark merely by copying it into a new directory. Record any prior exposure and actual host/REA use. A different implementation language can use the same process contract with an already available runtime; only the included Node candidate is demonstrated here.

## Review status and limits

The saved report deliberately leaves `humanReview: pending`, the checker's `reaTrial: unverified`, and `independentEvaluation: false`. Those are facts about what this executable run cannot establish. The historical investigation supplies disclosed REA evidence; this validator does not rerun or certify that session, skill discovery, integration settings, instruction following, or another host/model.

The automated checks support the named compatibility slices. They do not establish global equivalence, crash durability, hostile-process containment, security certification, production readiness or a performance improvement. The captured pending-review status is not updated automatically after a repository review. Passing tests do not approve a merge or release; the owner reviews the proposed commit and release artifacts separately.
