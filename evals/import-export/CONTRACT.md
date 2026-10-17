# Pocket Ledger IE-20261017 — frozen before reconstruction

Synthetic MIT-licensed local reference, authored for this trial. Source exposed;
the same host agent authors reference, oracle, reconstruction and review. This
is neither blind nor independent evaluation, nor a third-party product claim.
Node.js 20+ and standard libraries only. No REA artifact analysis is applicable
to this complete source fixture; normal file/runtime tools establish behavior.

Freeze order: commit this contract, corpus, oracle expectations, reference and
their SHA-256 identity before writing candidate.mjs. Preserve those original
bytes; any later amendment needs a new identity and explicit explanation.

## Three workflows and acceptance

**R1 import:** bytes are UTF-8 without BOM, at most 8192 bytes, a JSON object
with exactly `format`, `version`, `entries`. `format` is `pocket-ledger`;
`version` is the JSON number 1 or 2 (including equivalent 1.0/2e0 spellings).
Other numeric versions return `unsupported-version`; wrong types are `schema`.
JSON duplicate object keys follow JSON.parse's last-value rule. This is an
explicit synthetic quirk, not recommended for arbitrary formats. Envelope and
record unknown fields are rejected. `entries` is an array of at most 16 rows.
IDs match ASCII `[a-z][a-z0-9-]{0,15}` and are unique. In v1 rows have exactly
`id`,`text`; text becomes internal title and completion defaults to false.
In v2 rows have exactly `id`,`title`,`done`, with a boolean done. Titles contain
1–80 Unicode scalar values, preserve whitespace and escaping exactly, and may
contain newlines/NUL/markup; no lone surrogates. Order is significant. Valid
input replaces the entire ledger, including an empty ledger.

Rejection codes: `size` before decoding, `encoding` for invalid UTF-8/BOM,
`syntax` for invalid JSON, `schema` for structural/type/value errors,
`unsupported-version` for numeric unsupported versions, `duplicate-id` after
otherwise valid duplicate rows. Error precedence within multiple schema defects
is unspecified. A valid first row followed by an invalid row must not commit.
The canonical v2 representation must also fit 8192 bytes; otherwise import
returns `size`, including a smaller v1 file that would expand past that bound.

**R2 export:** version defaults to 2; only numeric 1 and 2 are supported.
UTF-8 without BOM, compact JSON, one terminal LF, the same envelope/row fields
as R1, preserving all scalar values and order. JSON key ordering and optional
escaping are insignificant; canonical output is bounded to 8192 bytes. Compare
semantic fields against separately written
oracle literals, and also inspect raw UTF-8/LF/size. Version 1 export rejects
`lossy-version` if any done is true. Self-roundtrip is supplemental. Required:
reference-v2 → candidate and candidate-v2 → reference; v1 both directions for
representable data; v1 → v2 migration checked against literal internal values.
Export does not change memory or persistence, including rejected export.

**R3 recovery:** fully decode/validate first; serialize canonical v2, write an
exclusive temporary sibling and rename it over the selected state file, then
replace memory. On validation or caught write/rename failure, report failure,
retain prior in-memory rows and prior state bytes, and allow retry. Reload must
read accepted stored values. Startup on malformed/unreadable existing state
fails closed, with no seed/repair write. Failure injection happens immediately
before rename; a separate controlled rename destination conflict must provoke
an actual OS I/O error. Label both as controlled faults, not spontaneous disk,
quota or permission failures. Use disposable paths and retain reference files.

No promise of fsync/power-loss durability, multi-file transactions, concurrent
writers, hostile-path/symlink protection, rollback after a successful rename,
or crash recovery of leftover temporary files. A successful rename followed by
process interruption is outside the exercised failure boundary. This is an
import/export teaching fixture, not a production storage implementation.

## Trace and oracle policy

E1 = this contract; E2 = frozen corpus.json; E3 = frozen reference.mjs;
E4 = observed.json captured before candidate exists; E5 = identity.json.
R1 → parser/import → corpus cases and preservation checks. R2 → writer → literal
expected rows/encoding assertions plus cross-reader tests. R3 → staging/rename
→ rejection, injected pre-rename failure, controlled real OS rename failure,
retry and restart checks. Actual results belong in a later report, never E1.

The corpus has literal expected rows/error codes. Additional boundary inputs
are constructed from the numeric limits above, never from candidate output.
Challenge the actual checker with wrong expected fields, empty/duplicate case
sets, dropped Unicode/done/order, and destructive failed import mutations.
The public corpus is not held out. A passing result covers these finite cases.
