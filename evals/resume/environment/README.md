# Measured environment-aware revalidation

This maintainer-authored local example executes identical target and candidate
bytes with a score cap of 100, then 200. The cap is a **controlled test setting**,
passed explicitly to both implementations; it is not discovered machine
configuration. Actual output changes at five listed inputs despite identical app
bytes and Node version. Independent expectations check target, candidate and
composition. The formatter's standalone evidence remains applicable; integration
must run again. This extends the [resume examples](../README.md) and their
[component dependency example](../selective/README.md).

Use existing Node.js 20+ and a new directory whose parent exists:

```sh
node evals/resume/environment/run.mjs prepare ./environment-case
node evals/resume/environment/run.mjs continue ./environment-case drift
node --test tests/resume-environment.test.mjs
```

For unchanged reuse, prepare another fresh directory and use `same` instead of
`drift`. Preparation and continuation are separate processes. The default
continuation scenario is `drift`. Repeated continuation refuses to overwrite
outputs. No packages, network, model, REA connection, extra workers or paid
services are needed. Repository-only examples are not installed with the skill.

## What is observed

| Category | Evidence | Limit |
| --- | --- | --- |
| Measured local runtime | Fixed child probe reads Node and V8 versions, OS platform and architecture | Selected identity only; no complete environment fingerprint or compatibility guarantee |
| Controlled test setting | Runner selects cap 100 or 200, executes the same fixture bytes and checks actual outputs | Local configuration behavior; not an OS or cross-version change |
| User declaration | Explicit `none-supplied` record | No declaration is promoted to measurement |
| Unsupported probe | Cross-host compatibility remains unknown | No second host is certified |
| Failed/malformed runtime probe | `unknown`, affected checks and a fixed reason; no raw diagnostic | Blocks dependent reuse; passing comparisons cannot resolve environment identity |

The child uses the current Node executable with fixed flags, source and a minimal
environment. Only Windows/temp plumbing is inherited; its values are never
reported or hashed. No environment dump, credentials, usernames, hostnames,
machine IDs, hardware IDs or absolute paths appear in generated records. Node
options from the parent are not inherited. Version equality alone cannot prove
behavior compatibility; a changed version alone does not establish regression.
Tests that change runtime hashes or force probe failure are **simulations**, not
measurements of another installed runtime. The worked record is local execution,
not an independent agent reconstruction, live REA trial or cross-host handoff.

## Reuse and report identity

The fixed dependency lists in `run.mjs` cover these three checks only:

| Check | Bound dependencies |
| --- | --- |
| Score | Target, candidate, corpus, runtime, cap, harness |
| Formatter | Formatter bytes, independent format corpus, runtime, harness |
| Integration | Both components, both corpora, runtime, cap, harness |

Missing/malformed relevant identities mean unknown; differing identities mean
stale applicability, not a behavioral failure. Unrelated observations do not
invalidate these reports. Arbitrary dependency discovery is outside this example.
An integration report includes the score setting even though standalone formatter
behavior does not depend on it. Checks compare identity applicability separately
from their actual outputs. The helper `assess` assumes the runner's separately
validated historical reports; matching bindings alone never authenticate a claim.

Inspect `environment.json`, `baseline.json`, `current-environment.json`,
`triage.json`, `fresh-report.json` and `result.json`. Baseline checks comprise 16
score, four formatter and 16 integration comparisons. Target reassessment adds 16
independent comparisons. Drift runs 16 fresh score and 16 fresh integration
comparisons; unchanged reuse runs neither standalone candidate check nor
composition. Both continuations always reassess the selected target. Integration
execution exercises the formatter again, without duplicating its standalone
report. Reused records name the historical report and its SHA-256. Requirements
keep implementation and verification separate. Unknown runtime evidence remains
`unknown-environment` even if comparisons pass; overall parity stays unverified.

The runner checks trusted fixture hashes before execution, validates the receipt
and reconstructs expected historical report data without rerunning old conditions.
It never imports a command or path from evidence. All original bytes are retained
and re-read for preservation hashes. The receipt detects accidental damage, not
an adversary replacing trusted package and history together; historical runtime
provenance still relies on the original capture. Parent aliases, concurrent
filesystem replacement and hostile host privileges remain outside this bounded
trusted-package, quiescent-filesystem demonstration.

Regression tests include unchanged reuse, actual local cap drift, irrelevant
changes, missing identities, malformed and unavailable probe simulations, stale
integration selection, damaged history, commands in modified evidence, and a
deliberately wrong cap-100 candidate. That candidate passes preparation but fails
five score and five integration comparisons after drift; failures remain visible.
The tests do not certify unsupported runtime/OS combinations or full parity.

[worked-result.json](worked-result.json) retains an actual local same/drift run,
its measured runtime, selected identities, comparisons and preservation hashes.
Other hosts should capture new results rather than relabeling this record.
