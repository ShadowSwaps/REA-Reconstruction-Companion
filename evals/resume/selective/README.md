# Selective revalidation across two components

This deterministic local demonstration changes component A (score cap 100 → 200)
while retaining component B (formatter), its implementation bytes and its scoped
passing report. It records findings, requirement implementation and verification
separately, follows transitive dependencies, and reruns shared interface and
end-to-end checks. It extends the [resume examples](../README.md), independently
of their two triage-only cases. Node.js 20+ and its standard library suffice;
no model, REA connection, dependency installation, network or paid service is used.

From the repository root, choose a new disposable directory whose parent exists:

```sh
node evals/resume/selective/run.mjs prepare ./selective-case
node evals/resume/selective/run.mjs continue ./selective-case
node --test tests/resume-selective.test.mjs
```

`prepare` executes the original candidate and target against independent
expectations, captures four baseline reports (62 comparisons), and writes a
checkpoint with byte identities. `continue` is a separate process: it selects
the supplied v2 target, retains all original bytes, records triage, checks the
changed target, demonstrates old candidate failures, and selects the separately
authored v2 reconstruction. It never edits the original candidate or reports.
The reconstruction is a fixed maintainer completion, not an inferred agent patch.

## Evidence boundaries

| Evidence | Actual dependencies | Decision after A target changes |
| --- | --- | --- |
| `F-score` | A target and shared interface | Stale; reassess against v2 |
| `F-format` | B target and shared interface | Retain for its original scope |
| `V-score`, `R-score` verification | Score finding, A candidate, A corpus, runtime, harness | Stale; adapt and recheck |
| `V-format`, `R-format` verification | Format finding, B candidate, B corpus, runtime, harness | Reuse original scoped report |
| `V-interface` | Both findings/candidates, both corpora, runtime, harness | Recheck producer/consumer compatibility |
| `V-integration` | All three verification nodes above, plus composition | Recheck transitively; unchanged B alone is insufficient |

Each node records the leaf hashes supporting its claim. The fixed evaluator
checks declared edges against this fixture's independent dependency map before
following them. Missing/extra/ambiguous edges, cycles and unavailable identities
produce **unknown**, including through transitive dependencies. They never mean
unchanged. Known differing identities produce **stale**. An unrelated finding or
implementation is retained. Changing the A corpus alone does not invalidate the
standalone B report. Shared interface or relevant runtime changes have wider
impact. Runtime identity is bounded to Node version, OS platform and architecture;
it is not a complete environment fingerprint.

The small JSON graph is only this evaluation's local convention, not a required
portable schema or general dependency discovery engine. Other tasks can use a
short Markdown dependency list. The source author supplies the edges; arbitrary
missing dependencies cannot be discovered automatically. The regression tests
simulate identity/edge changes, including missing transitive evidence. The CLI
refuses damaged checkpoint files before execution; it does not guess how to
recover them (see the separate [recovery demonstration](../RECOVERY.md)).

## Actual comparisons and preservation

The A corpus includes cap and domain boundaries and invalid JSON representatives.
The B corpus separately exercises null and integer formatting through 200.
Expectations are authored independently of target/candidate outputs; tests also
assert literal output arrays. B's target and reconstruction intentionally share
the same formatter module; it is preserved reuse, not an independent B rebuild.
Standalone B execution imports only B. Shared checks exercise B again in the
composition; reusing its standalone report does not skip integration execution.

Inspect these new records after continuation:

- `triage.json`: selected identities and applicability, with old implementation
  retained and score verification stale. Overall parity stays unverified.
- `reassessment.json`: 16 target comparisons against the cap-200 expectations.
- `before-report.json`: **five score and five end-to-end mismatches**, demonstrating
  why the old integration result cannot validate the changed task.
- `fresh-report.json`: 16 score, 23 interface and 16 end-to-end comparisons,
  zero failures for the supplied completion. No duplicate standalone B report
  is written when its dependencies match.
- `current-graph.json`: fresh claims and requirement implementation identities,
  separate from the historical graph.
- `result.json`: actual executed check IDs, reused B report hash and location,
  separate requirement statuses, and re-read SHA-256 identities for every original
  file. Historical reports and candidates remain byte-identical.

Tests deliberately reject false integration reuse, unnecessary blanket
invalidation and missing transitive dependencies, and inject a wrong completion
that retains fresh behavioral failures. They also cover corpus/runtime/interface/
candidate/composition drift, tampering, attempted self-rebaselining, embedded
commands, missing/oversized/linked evidence, package drift and repeat execution.
The [worked result](worked-result.json) is a real local capture from this
maintainer-authored demonstration; environment-dependent hashes are not golden
outputs. These tests are selected regression coverage, not a general mutation score.

## Trust and limits

Only fixed reviewed fixture modules are executed, with bounded subprocesses;
paths and commands embedded in records are never executed. Exit 0 means the
demonstration passed, 1 retains fresh comparison failures, and 2 means an
invocation, integrity or execution error with no completion claim. New files use
exclusive creation. Original files and trusted fixture bytes are re-read after
execution. Direct symlinks and oversized records are refused.

This runs code with Node's permissions; it is not a sandbox or hostile-filesystem
containment. Parent aliases, concurrent replacement and malicious replacement of
the trusted package/identity file together are outside its guarantees. Receipt
hashes are integrity checks, not signatures, authentication or proof of history.
The model-independent core remains prose and ordinary evidence records. No live
agent, REA, cross-host handoff, security certification or complete parity is
claimed. Human review remains pending. Passing this demo grants no merge,
publication or installed-skill update authority.
