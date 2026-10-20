# File import, export and recovery

Use this focused procedure when reconstructing a file boundary; it does not
require a product-wide blueprint or a new parser dependency. Keep the selected
format/version and approved workflows explicit. A fully exposed source fixture
can use ordinary tools; use REA for applicable artifact/runtime evidence.

For untrusted input or sensitive exports, apply the relevant [security boundaries](reconstruction-security.md): pre-parse resource limits, safe downstream use and data/access handling remain separate from format compatibility and caught-write recovery.

1. Freeze the reference bytes, identity/version/license, exposure, observed
   behavior, representative corpus and acceptance decisions before implementing.
   Keep raw originals, generated outputs, candidate and reviewer oracle separate.
   Source-exposed same-agent work is not blind or independent. Record quirks and
   intentional changes separately; do not silently “fix” reference expectations.
2. Recover the actual file contract: raw byte bounds, encoding/BOM/newlines,
   schema/type checks, missing/null/default/unknown fields, duplicate keys and
   identifiers, order, numeric/string limits and version/migration behavior.
   Include truncation, unsupported formats and late rejection after valid rows.
   Check expansion during migration/canonical export as well as input length;
   a small supported import can otherwise produce an unreadable oversized save.
3. Specify expected semantic values independently of either codec's output.
   Validate reference → candidate and candidate → reference in each supported
   version/direction. Inspect raw encoding and required fields too. Round trips
   are supplemental: a reader and writer sharing a defect can agree. State when
   downgrade/export is lossy, rejected or deliberately transformed; preserve
   representability limits instead of quietly dropping fields.
4. Trace validation → staging → persistence → memory replacement → success.
   Reject before modifying committed state. For failures, inspect prior memory
   and exact stored bytes, feedback, retry and restart. Exercise validation after
   partial parsing and the relevant write/rename boundary in disposable paths.
   Distinguish controlled injections, controlled real OS I/O failures and actual
   spontaneous failures; none establishes every host's quota/permission behavior.
5. State the commit point and what remains unverified. Rename alone does not
   establish power-loss durability, multi-file atomicity, concurrent writer
   safety, hostile-path protection or recovery after interruption. Do not turn
   an in-process caught-error test into a crash-safety claim. Preserve failed
   runs and reduced cases; challenge the real comparator with missing/duplicate
   captures, wrong required values and destructive rejection mutations.

Link **evidence → requirement → codec/persistence component → acceptance case**.
Record parity and proposed improvements separately, retain unresolved cases,
and report tested directions/versions rather than global file compatibility.
The repository's `evals/import-export/` example supplies a bounded, redistributable
synthetic contract, frozen corpus and runnable procedure; it is not installed
with the portable skill. See [comparison and test oracles](reconstruction-methods.md#comparison-and-test-oracles)
and [implementation validation](implementation.md#validate-at-the-right-boundaries).
