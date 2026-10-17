# IE-20261017 observed result

Same-agent source-exposed synthetic trial, authored and reviewed on 2026-10-17.
The reference/contract/corpus/observations were frozen in commit `beeecd8`
before candidate.mjs existed; [identity.json](identity.json) pins exact bytes.
Node.js 24.21.0 on Windows was used for local observations. The example is
model-independent; one host run is not a multi-model benchmark.

| Requirement | Evidence and implementation | Bounded result |
| --- | --- | --- |
| R1 import | E1–E5; candidate decode/validate; 21 corpus +12 boundary cases per target | Accepted literal values/order/defaults match; invalid encoding, truncation, schema, versions, duplicate IDs, limits and migration expansion rejected |
| R2 export | Separate expected rows/encoding checks; both readers; both representable versions | Both directions, self-roundtrip and v1→v2 migration pass; done=true→v1 rejects loss; CLI exports checked |
| R3 recovery | Staged write/rename before memory replacement; per-rejection snapshots, controlled faults | Prior memory and exact file bytes preserved; retry/reload/process restart pass; malformed startup fails closed |
| Checker challenges | Actual runTrial candidate wrappers and compareCases tests | Seven candidate defects plus empty/duplicate/missing/wrong observations are rejected |

The controlled pre-rename exception and controlled nonempty-directory rename
conflict both preserve prior memory/files. The latter caused actual OS EPERM
on this Windows host. It is an induced I/O failure, not evidence of a
spontaneous permission/disk/quota incident. Other platforms can report different
OS error codes. Caught-error success does not establish crash durability,
concurrent-writer safety, fsync guarantees, safe hostile paths, rollback after
rename or recovery of crash-left temporary files.

The first run with the host's default temp path returned an unexpected
`persistence` failure during setup. A rerun with an explicitly workspace-writable
temp path reached the checks; the host restriction's unique cause was not
established. That run then exposed an incorrect boundary fixture: shorter IDs
left the proposed v1 expansion under the limit. Corrected limit arithmetic uses
16-character IDs: input v1 is 8018 bytes and canonical v2 would be 8243. The
frozen reference/corpus were unchanged. Failed output was retained privately;
neither failure is counted as a passing test or a reference defect.

The candidate uses a bounded startup read; the original reference reads the
whole trusted startup fixture before checking parser size. This is a deliberate
implementation difference, not measured performance parity. The original
last-duplicate-JSON-key rule is preserved and documented; unknown fields remain
rejected. No unrelated format, app feature or production safety claim was added.

The reusable companion change is the [file compatibility procedure](../../skills/rea-reconstruction-companion/references/file-compatibility.md),
which adds migration-size checks, representability decisions and explicit
validation/persistence boundaries to the existing interoperability guidance.
Use the [repeatable procedure](README.md) for fresh results; this record does
not assert future host runs or the quality of arbitrary reconstructions.
