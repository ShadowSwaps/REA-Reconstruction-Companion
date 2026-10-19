# SC-20261019: request-driven completion edit

Constructed request on the existing Pocket Ledger reconstruction: “Let me mark
one entry done without re-importing the file. Keep my title listing and old
import/export behavior. Don't migrate on open.” This is a new reconstruction
requirement; the original/reference version and selected environment do not
change. This fixture is source-exposed, same-agent authored/reviewed, not a live
user/model trial. The custom listTitles composition is explicitly retained.

Current implementation: frozen baseline.mjs wraps the existing candidate-v2 and
summary modules. It already reads both schemas, writes schema2, rejects lossy
schema1 exports, and exposes explicit migrate. It has no setDone action. Its
historical observations/contracts remain scoped to their original bytes.
New requirement: setDone(id, boolean) finds exactly one existing ID and changes
only its completion. It preserves IDs, titles, Unicode and row order. Wrong
types return schema; absent IDs return not-found. Validation completes before
any write. An unchanged value returns current rows without persistence or backup.
The proposed implementation is a separate variant.mjs; it must retain the current
API/custom listing and delegate validated save to the existing codec.

Affected: completion command, composition with codec, stored rows, schema1 export
representability, retry/reopen. Unchanged reference facts and standalone title
listing retain their original scope; whole candidate/integration results need
fresh checks even though the underlying codec/listing bytes are unchanged.
The fixture map is manually assessed, not inferred by a general dependency engine.
Literal expected values are frozen independently of candidate outputs. Source
hashes identify bytes, not behavioral equivalence or user authority.

Exercise empty/missing IDs, wrong types, late invalid import, successful import,
v1/v2 readers/exports, explicit migrate, no-op writes, failed setDone followed by
retry and fresh-process reopen. Opening old data must not rewrite it. Preserve
prior memory and exact file bytes after caught pre-rename injection. The existing
codec's staging/rename boundary remains; no crash/fsync/concurrent-writer,
transaction or universal compatibility claim. Real OS fault coverage remains
historical in the version-change trial; this trial injects an exception only.

Code rollback: the frozen baseline reads new schema2 done=true without changing
the file; it lacks the new action. A separate disposable pre-edit data copy can
be restored explicitly, losing the later completion by design. Do not restore
real data automatically, migrate schema, replace original apps, overwrite unknown
files or back up a no-op. No production backup manager is implemented.
