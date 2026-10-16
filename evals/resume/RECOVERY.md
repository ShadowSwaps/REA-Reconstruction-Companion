# Recover missing or modified walkthrough evidence

This deterministic, maintainer-authored extension actually continues from a
separate trusted working copy after missing/modified evidence is found. The strict
`walkthrough.mjs continue` command still rejects drift. No models, REA, services,
network, dependencies or extra workers are used. Run with existing Node.js 20+.
This fixture does not certify an agent's recovery decisions.

Prepare a workspace as in [the walkthrough](WALKTHROUGH.md). To reproduce a missing
report, move its `input-report.json` aside manually. For a modified-evidence case,
append a comment to `candidate-before.mjs` in that disposable workspace. Retain
the original files elsewhere if you need their bytes; the runner never deletes
or edits the damaged workspace. Then use:

```sh
node evals/resume/recovery.mjs inspect resume "./old-case"
node evals/resume/recovery.mjs restore resume "./old-case" "./recovered-case"
```

`inspect` is read-only and returns per-file matching, missing, modified or
unverified status, expected/actual SHA-256 and affected dependency IDs. Missing
reports affect prior input verification only; missing targets affect both findings
and target-dependent tests. Matching unrelated evidence remains available. The
fixed scope, goal and unfinished cap requirement remain recorded. These decisions
come from this bounded invocation and trusted fixture, never damaged record text.

`restore` explicitly authorizes recovery from the hash-verified package originals
for the selected case. It requires at least one missing/modified file. Choose a
new nonexistent destination outside the source workspace, with an existing parent.
The runner records `recovery.json`, prepares `working/` from trusted originals,
then continues that copy with actual target/candidate execution. It retains fresh
partial-candidate failures and completed-candidate comparisons in `working/`.
The damaged original file set and its available bytes are checked again before
`result.json` is written. Missing historical bytes are never claimed preserved.
Restored fixture checkpoint/report bytes are identified as package copies, not
evidence that the damaged workspace was intact or its old results became fresh.

For an explicit new target selection, rather than original restoration:

```sh
node evals/resume/recovery.mjs supersede resume "./old-case" "./new-target-case"
```

This invocation authorizes only the fixed build-1 to build-2 fixture transition.
It separately captures build 2 with its checked package identity, keeps build-1
claims/report historical, records stale applicability, and reassesses the new
target before fresh verification. A modified build-1 target that happens to have
build-2 bytes remains modified in the source assessment; `restore` still selects
build 1. There is no implicit supersession, hash rewrite or arbitrary path import.

`restore changed-target` also supports damaged build-2 preparations. All paths
inside the demonstration are fixed by the runner. Record commands and status
claims are never executed or accepted as authority. Package hashes assume a
trusted package; replacing that package and its identity record together defeats
this trust basis. With unavailable/untrusted originals the runner blocks dependent
execution instead of falling back to changed bytes. In a real investigation use
the [checkpoint guidance](../../skills/rea-reconstruction-companion/references/checkpoints.md)
for authorized fresh capture and independent work while blocked.

Direct links, directories and oversized evidence are unverified and cannot be
recovered automatically. Unknown source entries (including outputs from an
interrupted continuation) are rejected and retained for manual review. Existing
destinations are refused. Interrupted recovery outputs remain for inspection;
choose a new destination. Parent aliases, hard links, concurrent mutation and
hostile-code containment remain outside the walkthrough's guarantees. This is
neither a filesystem sandbox nor a general checkpoint engine.

Exit 0 means inspection completed or recovery comparisons passed, 1 means fresh
candidate comparison failed, and 2 means invocation, integrity, filesystem or
execution error. An inspection exit 0 does not mean evidence is reusable: read
its states and applicability. Errors keep partial outputs and hide private paths.
Human review and overall parity remain pending/unverified. Coverage remains the
walkthrough's 1,014 JSON cases; live agent/REA and cross-host trials remain unrun.

Run `node --test tests/resume-recovery.test.mjs` for both target cases, every
missing/modified prepared file, real preservation and fresh behavior, dependency
selection, explicit supersession, hostile record/code text, unavailable trusted
originals, unsafe entries, bounds and overwrite refusal. Existing rejection tests
remain in [resume-walkthrough.test.mjs](../../tests/resume-walkthrough.test.mjs).
