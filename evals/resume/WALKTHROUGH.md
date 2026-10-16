# Executable checkpoint/resume walkthrough

This small, maintainer-authored local demonstration complements the [triage-only
evaluation](README.md). It reads actual files after a process boundary, checks
preserved bytes, completes a working copy of the score function, and captures
fresh execution results. It does not invoke an agent, model API, REA, network,
installer, worker or paid service. Use an existing Node.js 20+; no dependencies
are installed. The companion remains independent of model/provider; JavaScript
is only this fixture's executable format.

From the repository root, choose a **new, nonexistent directory** whose parent
already exists. Paths with spaces are supported. For example:

```sh
node evals/resume/walkthrough.mjs prepare resume "./resume-example"
node evals/resume/walkthrough.mjs continue resume "./resume-example"

node evals/resume/walkthrough.mjs prepare changed-target "./changed-example"
node evals/resume/walkthrough.mjs continue changed-target "./changed-example"
```

Use a directory outside the checkout for retained local results, or remove these
example directories before packaging/committing. The runner never deletes a run
or overwrites files; choose a new directory for another attempt. An interrupted
run with output files is retained for inspection and cannot be continued again.
Each command starts a separate process. The second command reads the prepared
files, not in-memory state left by the first. This is a local process boundary,
not a demonstrated cross-host or conversational handoff.

For missing/modified evidence, use the separate [recovery demonstration](RECOVERY.md).
Ordinary continuation still rejects drift; recovery preserves the damaged workspace
and executes a new trusted working copy with recorded provenance.

## What is checked

Preparation verifies the fixed package fixture hashes and copies the original
checkpoint, input-only report, partial candidate and selected target, plus a
small preparation record. It does not execute fixture code. Continuation checks
these bytes against the trusted package before any execution or repair. It
accepts only the two fixed cases; it never follows commands or executable paths
from checkpoint/report fields. The current invocation authorizes only this
bounded demonstration, not arbitrary work described by a checkpoint.

| Case | Triage | Continuation |
| --- | --- | --- |
| `resume` | Original input/cap findings remain applicable; earlier passing report covers only input cases. Cap stays not started/unrun. | Reuse the supplied contract; complete cap 100 in a separate candidate and capture fresh results. |
| `changed-target` | Old target-bound findings and verification are stale; implementation and scope are retained. | Reassess build 2 from selected source and fresh target execution, record input-rule continuity and cap 200 separately, then complete/test the working candidate. |

Both runs first compare the actual selected target to independent domain/cap
expectations, then execute the unchanged partial candidate and retain its
failures. The runner applies a fixed maintainer-authored completion, rather than
discovering or generating a solution. It executes that new candidate in another
bounded child process. There are 1,014 cases: every integer 0..1000 plus 13
invalid JSON representatives, including fractional/out-of-range numbers and
every other JSON type. Values around both caps are included. The original
candidate fails 900 cases for build 1 or 800 for build 2; the completed candidate
is expected to pass all 1,014. This expectation is not an observed run result;
inspect the reports from your own invocation.

Retained outputs are:

- `triage.json`: pre-execution applicability and unfinished requirements.
- `reassessment.json`: changed-target only; current source, probes and target comparison evidence, preserving historical claims separately.
- `before-report.json`: actual partial-candidate failures, target/candidate/corpus identities and local runtime.
- `candidate-after.mjs`: fixed completion; `candidate-before.mjs` remains untouched.
- `after-report.json`: fresh comparisons bound to the new candidate, selected target, corpus and runtime.
- `result.json`: completion summary and hashes of the original files re-read after execution, including the preparation record.

Exit 0 means preparation succeeded or the walkthrough passed. Exit 1 means the
completed candidate failed comparisons; exit 2 means invocation, integrity,
filesystem or execution error, not a candidate score. Return values must be
finite numbers or literal null before serialization; undefined, non-finite
numbers and objects cannot serialize themselves into a successful null rejection.
Errors keep partial outputs
and print a generic message without private paths or stack traces. Preparation
can also leave partial evidence on an I/O failure; inspect it and choose a new
destination rather than treating it as a successful checkpoint.

## Evidence limits and regression tests

Run `node --test tests/resume-walkthrough.test.mjs` for both process-boundary
cases, retained history/failures, identity drift, missing/tampered evidence,
stale-report relabeling, unexpected files, overwrite prevention and return values
that JSON serialization would otherwise disguise as null.

Source/oracle exposure is explicit: this is a deterministic demonstration by
the maintainer, not a blind benchmark or actual agent evaluation. Passing means
local preservation checks and the listed corpus passed. Overall parity remains
unverified outside that corpus, including JavaScript values not representable
in JSON. Human review stays pending; actual agent actions and cross-host
continuation remain unverified; REA is not run. No merge, release, installation
or publication is approved by these results.

Hash checks assume a trusted package and quiescent local workspace. They detect
drift, not malicious replacement of the package plus identities. Direct linked
evidence files/workspace directories are rejected, reads and child execution
are bounded, and Node environment options are not inherited by fixture children.
Parent aliases, hard links, concurrent replacement and hostile-code containment
are outside this example's guarantees. Do not use it as a general checkpoint
engine, a sandbox or a verifier for untrusted executables.
