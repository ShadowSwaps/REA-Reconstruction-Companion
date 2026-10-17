# File import/export reconstruction trial

Small runnable, synthetic MIT-licensed Pocket Ledger fixture. The trial covers
exactly import, export and recovery. Node.js 20+ with standard libraries only;
no package install, model API, extra agent, network or service. The complete
source was exposed to the same agent that authored, implemented and reviewed
the trial. This is a teaching example, not an independent or blind benchmark.

From the repository root:

```sh
node evals/import-export/check.mjs
node --test tests/import-export.test.mjs
node evals/import-export/cli.mjs candidate /absolute/disposable/ledger.json
```

The last command accepts one JSON request per stdin line and writes one JSON
response per line. Choose `reference` for the original instead of `candidate`.
`{"op":"state"}` reads rows; `{"op":"export","version":2}` returns UTF-8 bytes
as hex; `{"op":"import","hex":"..."}` imports supplied hex bytes. For example,
`{"op":"import","hex":"7b"}` rejects a truncated opening brace with
`{"ok":false,"error":"syntax"}`. The chosen file is loaded at startup and
replaced only after validation and staging; use disposable data and an existing
parent directory. The JSON-lines driver and in-process fixture are trusted
local tooling, not a sandbox for hostile submissions or arbitrary paths.

The checker leaves disposable artifacts in the host temp directory, prints its
artifact path and records, and exits nonzero on failed assertions. In a
restricted host, select an already writable temporary directory through the
process's `TMPDIR` (Unix) or `TEMP`/`TMP` (Windows) before running. A host-policy
failure is an environment limitation, not a passing recovery observation.

## Repeatable procedure and provenance

1. Read [CONTRACT.md](CONTRACT.md), [identity.json](identity.json) and
   [corpus.json](corpus.json). Reference, corpus and observations were committed
   before candidate implementation. `verifyFreeze()` verifies their hashes;
   never regenerate them to make a candidate pass. `freeze.mjs --create` is
   intentionally refused once the identity or candidate exists.
2. Inspect [reference.mjs](reference.mjs) and its pre-candidate
   [observations](observed.json). For a future fresh evaluation, isolate the
   reference/oracle and collect target-specific cases separately. This public
   source-exposed exercise does not simulate that isolation or a held-out set.
3. Run the checker on the supplied reconstruction. It checks 21 frozen corpus
   cases and 12 contract-derived boundaries per target. Expected fields and
   errors come from separate literals/limit arithmetic, never candidate output.
   Both readers consume the other's v2 output and representable v1 output;
   downgrade with done=true is rejected. The v1 migration preserves literal
   expected ordering, title values and default completion.
4. The same run verifies exact old file/memory preservation for rejection,
   controlled pre-rename failure and a real OS failure induced by redirecting
   the rename attempt to a nonempty directory, plus a staging write whose
   temporary basename exceeds the host filesystem's component limit. These are
   controlled faults, not spontaneous disk/permission/quota observations. It checks retry, reload,
   malformed-startup fail-closed behavior and the CLI across process restart.
5. Run the test file to challenge the actual checker: Unicode/completion/order
   corruption, false import results, destructive rejection and always-failing
   candidates must fail. Missing, duplicate and wrong observation records must
   also fail. Review feedback/provenance/limits as well as passing assertions.

See [RESULTS.md](RESULTS.md) for bounded observed outcomes and retained failures.
No power-loss durability, multi-writer safety, hostile-path handling or
transactional guarantee is established. The original JSON last-key rule is
deliberately preserved; unknown fields are rejected. Candidate startup uses a
bounded read, while the frozen reference's startup reads the whole trusted
fixture file before its parser checks size. This implementation hardening is
separate from tested parity and is not a reference performance measurement.
An externally supplied v1 startup file is read without automatic migration;
if canonical v2 would exceed the limit, v2 export rejects `size` and the
original startup bytes remain intact. This clarifies startup compatibility;
import still checks canonical expansion before committing.
