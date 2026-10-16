# Recover an interrupted local walkthrough

Use existing Node.js 20+ and a trusted package. This small maintainer-authored
example uses no dependencies, models, REA, services or network. It recovers only
the fixed score-function walkthrough, not arbitrary tools or projects.

Ordinary `walkthrough.mjs continue` and `recovery.mjs` retain their strict refusal
of unexpected outputs. If continuation stopped after writing outputs, retain that
entire attempt. Choose a new nonexistent destination outside the source, with an
existing parent, then run from the repository root:

```sh
node evals/resume/interrupted.mjs resume "./failed-attempt" "./fresh-attempt"
```

For a repeatable complete example, prepare and continue a disposable workspace as
in [WALKTHROUGH.md](WALKTHROUGH.md), then run this command on that completed
workspace. The same method accepts an interrupted subset of known outputs.
To explicitly select build 2 while retaining a build-1 attempt:

```sh
node evals/resume/interrupted.mjs resume "./failed-attempt" "./build-2-attempt" changed-target
```

Use `changed-target` as the first argument when the source was prepared for build
2. There is no implicit target selection from output claims. Missing or damaged
prepared inputs still block this command. If there are no continuation outputs,
use [evidence recovery](RECOVERY.md). That command also deliberately refuses
workspaces containing continuation outputs. If prepared inputs are damaged and
continuation outputs exist, retain the entire attempt and start a separately
recorded trusted run:

```sh
node evals/resume/walkthrough.mjs prepare resume "./trusted-restart"
node evals/resume/walkthrough.mjs continue resume "./trusted-restart"
```

Choose the case explicitly and a fresh destination. Record the original attempt
and reason separately; this restart does not reuse its reports or certify their
preservation. Do not remove outputs or edit identities to get past rejection.
An incomplete preparation is not a completed checkpoint.

The command checks original inputs against hash-verified package fixtures and
allows only named walkthrough outputs. Direct links, non-files, unreadable files,
unknown entries and files over 256 KiB block recovery before destination creation.
Available output bytes remain untrusted history, including complete-looking
`result.json` files. They never authorize commands or execution of source code.

`recovery.json` records source file hashes and explicit target selection. A new
`working/` is prepared from trusted originals. The target always executes fresh
against an independent oracle. Only `before-report.json` is eligible for reuse:
its entire parsed record must match the expected completed report, including
target, partial candidate, corpus, Node version/platform/architecture, harness
bytes, fresh target comparison and every expected partial-candidate failure.
The fixture's trusted partial-candidate source returns accepted values unchanged;
this supplies independent expected failures, rather than accepting its report's
passing label or self-declared hash as proof. This is semantic validation of a
fixed fixture's evidence, not authentication of who produced the old file.

An absent, truncated, malformed, stale or mismatching report causes fresh
partial-candidate execution, with the missing proof recorded in
`working/execution-recovery.json`. In particular, historical cap failures are
preserved and never converted to passes. Target changes invalidate dependent
reuse. Runtime/corpus/harness drift also prevents reuse. Fields or ordering that
cannot be validated conservatively can trigger rerunning even if harmless.
Unverifiable JSON structure, including excessive nesting within the byte limit,
also falls back to fresh execution. The recovery record retains the initial plan
that final validation is required; the destination `result.json` records that
final execution actually completed, with its comparison outcome kept separately.

The completion is regenerated from trusted source and always tested fresh; old
`candidate-after.mjs`, `after-report.json`, triage and completion claims never
establish a passing current result. Source hashes/file set and trusted originals
are checked again before writing the destination `result.json`. No original bytes
are overwritten, repaired or deleted. Existing destinations are refused. If
recovery itself stops after preparation, retain its wrapper and retry using its
`working/` directory as the source with another fresh destination. If preparation
stopped partway before continuation outputs, use evidence recovery on that
working directory first. If prepared inputs are damaged and continuation outputs exist,
retain the wrapper and working directory and use the separately recorded restart
above.

Exit 0 means the fresh listed comparisons passed, 1 means fresh candidate
comparisons failed, and 2 means invocation, integrity, filesystem or execution
error. Errors retain partial attempts and hide private paths. Partial files and
status markers alone never mean a check passed.

Run `node --test tests/resume-interrupted.test.mjs`. Tests actually exit a child
process at deterministic writes, after triage, before-report, candidate output,
after-report and result; partial-write tests exit after writing a truncated file.
These are controlled process exits, not external kills, power-loss tests or
general crash-consistency guarantees. Report/dependency corruption is separately
injected and labeled. Tests preserve original bytes, rerun unknown work and
verify fresh completion. There are no timing races or production fault hooks.

The trusted-package, quiescent-workspace assumptions and filesystem limits in
[WALKTHROUGH.md](WALKTHROUGH.md) apply: parent aliases, hard links, concurrent
replacement and hostile-code containment are not certified. Coverage remains
1,014 JSON cases; broader parity, live agent/REA and cross-host behavior remain
unverified. Human review is pending; this command grants no publication authority.
