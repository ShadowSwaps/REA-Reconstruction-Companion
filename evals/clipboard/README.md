# Offline clipboard example

Run `node --test tests/clipboard.test.mjs` from the repository root. No dependency,
network, model call, real clipboard or user document is used. The only clipboard
is the disposable recording/failure double in `double.mjs`.

One proposed teaching policy covers three families: copy/paste insertion or
replacement, cut with failure retention, and undo/identity boundaries. The same
author separately reasoned and froze 12 sequences / 30 literal intermediate
states in `expectations.json` and its SHA-256 identity before candidate adaptation.
Source is exposed; this is not independently authored evidence, original parity
or a model instruction-following test.

## Finite policy

Two synthetic in-memory documents have globally unique string IDs/text values;
initial IDs exclude the generated `n<number>` namespace. Only declared finite
copy/cut/paste/edit/undo/redo actions are supported: no document replacement,
owner lifecycle, parser or arbitrary object API. Copy/cut captures selected
items in document order. The double clones on read/write and independently
records attempted operations and rejection. Write rejection retains its old
payload. The checker reads the double separately from candidate snapshots.

The representation is plain text (one item) or a version-1 structured fragment
of one to three distinct ID/text pairs, with strings limited to 64 UTF-16 code
units. Empty text is valid. Unexpected fields, unsupported versions, duplicate
IDs and malformed later items reject before edits. These are finite object-shape
checks, not hostile-byte parsing or rich HTML sanitization. Markup-looking plain
text stays a value; no renderer executes it.

Paste names an owner, index and exact contiguous IDs to replace at that index.
Copy/text paste uses captured values and fresh IDs on each accepted paste. Cut
leaves the source intact until an accepted cross-document paste. Its local
ticket binds the full source snapshot and captured payload. Changed source,
foreign/forged move, same-document move, invalid destination, read rejection or
invalid format leaves both documents/history unchanged. The ticket is an
in-process teaching mechanism, not a platform capability or cross-app protocol.
No source revision/generation or concurrency guarantee exists: identical
restored source content is considered applicable under this local policy.

A move retains IDs and creates one history entry for both documents. Accepted
edits/pastes clear redo; copy/cut/rejection do not. Undo/redo restore exact values,
IDs/order without touching clipboard contents. Consumed cut tickets stay consumed
through undo; repeated paste rejects and redo retains the moved IDs. Moving again
requires a new cut. Allocation is monotonic and outside history. These are local
choices, not universal editor semantics. Snapshots report history depth/status
alongside actual document data; no saved-file persistence is implied.

## Checks and limits

Twelve faults each pass four ordinary checkpoints before a specific assertion
fails: selection order, insertion instead of replacement, removal on failed
cut write, partial invalid paste, stale source removal, wrong destination
selection, copying live values, undo/redo recreating IDs, undo clearing clipboard,
cut reuse after undo and foreign deletion authority. Exceptions do not count as
kills. Checks also cover detached snapshots/double values, representation limits,
direct rejection, comparator field sensitivity and concealed clipboard effects.

No real OS/browser permissions, focus/gesture behavior, native/rich formats,
cross-app interoperability, durability, concurrent editing, process crash,
clipboard replacement race or saved-file behavior is tested. Only synchronous
known rejection is injected; response-loss/partial effects are outside the example.
Local history cannot reverse external effects. Use the [focused guidance](../../skills/rea-reconstruction-companion/references/clipboard.md)
for the actual target. Standalone installations omit these repository-only
files. Historical fixtures and oracles remain unchanged.
