# Version-change reconstruction trial

Exactly three workflows: change detection, selective revalidation and
migration/recovery. Node.js 20+ and standard libraries only. This is a runnable
MIT synthetic, source-exposed, same-agent exercise. The literals are independent
of candidate outputs, **not** independent authorship, blind testing or an
external-app benchmark. No model API, extra agent, install, service or network.

From the repository root, select a new disposable directory with an existing
parent. The two commands run as separate processes:

```sh
node evals/version-change/run.mjs prepare ./version-case
node evals/version-change/run.mjs continue ./version-case
node --test tests/version-change.test.mjs
```

`prepare` runs the saved v1 candidate/reference, exports a schema-1 document and
captures its reports/checkpoint. `continue` compares applicability, demonstrates
the old candidate's schema-2 rejection and selects the adapted v2 candidate.
It refuses overwrite of a completed attempt. Test artifacts use the host temp
directory; choose a writable `TEMP`/`TMP` (Windows) or `TMPDIR` (Unix) if needed.
The runner is trusted local code, not a sandbox or general checkpoint engine.
Only reviewed module paths run; saved records cannot supply commands.

## Evidence and interpretation

[CONTRACT.md](CONTRACT.md), [expectations.json](expectations.json),
[dependencies.json](dependencies.json), both reference releases, the old
candidate and [reference observations](observed.json) were hash-frozen and
committed before adaptation. [identity.json](identity.json) also binds the
unchanged historical codecs. Verification never rewrites these expectations.
Product versions are API wrappers over those pre-existing schema codecs:
release 1 exposes schema-1 import/export, release 2 also exposes schema 2 and
explicit migration. This trial uses v1 **exported data** as the saved migration
input. It does not claim a historical v1 application's native on-disk format or
prove a new codec implementation. The v1 wrapper's inherited internal storage
is the historical codec, which already writes schema 2.

The consequential observed change is schema-2 acceptance with `done=true` and
lossy-downgrade rejection. Title listing remains unchanged for the selected
normalized rows. Differing release-note bytes alone have no behavioral edge;
the tests exercise that negative control separately from actual codec changes.

| Record | Dependencies and action |
| --- | --- |
| F-codec → V-codec → R-codec | New API/schema identity: retain implementation history, stale verification, adapt and rerun |
| F-titles → V-titles → R-titles | Same module, interface, corpus, Node/platform/architecture and harness: reuse scoped baseline |
| V-interface → V-integration | Both branches: rerun despite unchanged titles |
| V-migration | Codec, persistence and migration corpus: run fresh; baseline migration was unrun |

The existing [resume applicability evaluator](../resume/selective/README.md)
now accepts a separately trusted fixture map. The new trial checks its results
against separately frozen literal affected/retained sets. Omitted edges,
contradictory child identities and unknown environments reject reuse; tests
also reject blanket invalidation, runtime/corpus/candidate drift and altered
reports with edited receipts. Scope decisions and implementation status are
separate from verification. An unrun migration node has dependency applicability,
never a historical passing result. Environment identity is deliberately bounded,
not a complete machine fingerprint or evidence of cross-host equivalence.

## Migration and recovery

The old export contains `a: Café 🧾` followed by `b: Second`. Opening in v2 leaves
bytes unchanged. Explicit migration saves schema 2 with both completion values
false. Independent literals, the old schema-1 reader, the new reference reader
and a fresh candidate process check values, ordering and representable export.
After importing the completed v2 row, schema-1 export rejects rather than drops
completion. Schema 3, invalid late rows and duplicate IDs preserve memory/bytes.

A pre-rename exception is **injected**, then disabled for a successful same-
instance retry. A second fault redirects replacement to a nonempty directory:
the rename is a **controlled real OS I/O failure**, with the original bytes
retained separately by the test before restoring the destination and reopening.
That fault does not claim the active pathname remained a file: the harness
itself deliberately replaced it. All fault artifacts remain reviewable.
These caught errors do not prove crash, transaction, fsync/power-loss,
concurrency or hostile-path safety. The migration has no general backup manager.

`triage.json`, `change-observed.json` and `result.json` retain historical versus
fresh claims, actual identities, reused report hash, executed IDs, migration,
recovery labels and original file hashes. Tests challenge the real runner with
six faulty candidates, including no-op migration and destructive rejection.
Full release regression, package/install/upgrade checks and substantive review
remain required; selective reuse is not a release-testing waiver.
