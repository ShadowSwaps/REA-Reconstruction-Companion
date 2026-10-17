# Frozen version-change contract

MIT synthetic Pocket Ledger product releases 1 and 2, source-exposed same-agent
authorship and review. Product release is distinct from file schema. These thin
reference releases use the frozen historical import/export codec; that codec
already understood both schemas. Release 1 exposes only schema-1 import/export;
release 2 exposes both, completion state and explicit migrate(). This is a
bounded constructed version transition, not evidence about an external product.

Change detection must observe release 1 rejecting schema 2 and release 2
accepting it with done=true, plus release 2 rejecting lossy schema-1 export.
Title listing is an unchanged standalone component. Its module, corpus, Node
version/platform/architecture and harness must match for report reuse. It accepts
normalized rows, so integration depends on the codec even when its own bytes
match. A release-note-only artifact changes bytes without changing selected
semantics; it is deliberately absent from behavioral dependencies.

The schema, bounds and error contract of the historical codec remain in
../import-export/CONTRACT.md. Release-1 boundary rejection precedes that codec's
validation for a parseable pocket-ledger document declaring another version.
On-disk v1 data remains readable by release 2. Opening does not rewrite it.
Explicit migration saves schema 2 with done=false, preserving IDs, titles and
order. Export to schema 1 is supported only while every done is false. Schema 3,
duplicate IDs and invalid late rows are rejected without changing committed
memory or stored bytes. Failed staging/replacement retains the original bytes;
retry and fresh-process reopening must preserve literal values.

Migration commit is the historical codec's successful single-file rename before
memory replacement. Pre-rename injection and a controlled real OS rename to a
nonempty directory exercise caught failures. No power-loss, crash, fsync,
concurrency, malicious-path, transaction or multi-file guarantee is claimed.
The frozen v1 input is separately retained as recovery evidence; migrate does
not implement a general backup manager. No code or commands in saved JSON run.

The frozen map links evidence (F), requirements (R), candidate components and
acceptance (V). Missing edges or identities mean unknown, differing dependencies
mean stale. Reuse of a scoped report never waives full release regression checks.
Literal expected rows/errors/affected sets precede candidate adaptation. They
are independent of candidate outputs, not independently authored or held out.
