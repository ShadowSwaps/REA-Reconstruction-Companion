# Pocket Ledger: proposed security boundary (SEC-20261020)

Frozen before the separate boundary implementation. The original synthetic
import/export codec and safe-change baseline remain unchanged. This is a new
local teaching requirement, not an observed original protection. Author and
scripted evaluator are the same agent with full source exposure. Literal
expectations are separate from candidate outputs, not independently authored.

The runner supplies a simulated session resolver. A reader can export/display
the demo ledger; a writer can also import. An absent session, unknown role or
different ledger cannot read or write. Every dispatch checks the resolved grant;
caller-supplied roles/ledger IDs are not authority. The factory keeps its store
private. This is no real authentication, network service or OS isolation: code
controlling this process/files can bypass it.

Imports are Uint8Array bytes, at most 2048 bytes, strict UTF-8 and at most four
simultaneously open JSON containers outside strings, checked before JSON.parse.
Existing Pocket Ledger schema1/schema2 rules still apply, including exact fields,
16 records, title lengths, duplicate IDs and staged commit. Bad bytes, excess
depth/size, invalid syntax or schema and late invalid rows must preserve prior
file and state. No paths, URLs or commands are selected by imported content.

Markup-looking titles remain literal domain data. A text projection assigns
textContent and never innerHTML; a deterministic sink double checks that choice,
not actual browser XSS resistance. Valid Unicode and old-schema import/export
are retained. The boundary does not detect personal data in free-form titles.
Titles are intentionally persisted and included in authorized exports.

Session metadata and rejected input contain synthetic token/contact markers.
These must not occur in active ledger bytes, exports, public errors, diagnostic
events or the generated result. Error/event projections contain fixed codes
only, without input values or session metadata. Known-marker checks do not
establish redaction of unknown data. No real credentials or personal data used.

The run checks allowed reads/writes, direct unauthorized reads/writes, attempted
role spoofing, malformed/oversized/deep input, prototype-like unknown fields,
late invalid records, safe text projection, metadata non-disclosure and reopen.
It uses disposable ordinary local files. No crash, hostile filesystem, concurrency,
real auth/session lifecycle, provider, browser, penetration or live model test.
