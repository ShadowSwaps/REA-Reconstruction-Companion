# Proposed import-confirmation workflow

This is a new local variant of Pocket Ledger, not a recovered original workflow.
It reuses the unchanged [candidate codec/store](../import-export/candidate.mjs).
The historical format/rejection corpus remains frozen and is checked separately.
The author has full source exposure. Literal expectations were authored alongside
the variant, frozen before its first validation, and are not generated from it.

| Existing record | Requirement / evidence basis | Selected acceptance |
| --- | --- | --- |
| F-codec / R-format | Historical synthetic codec: validated import replaces all rows; v1/v2 formats and errors remain applicable. | Exact bytes, ordering, Unicode and completion in empty/existing-data imports; original regression suite retained. |
| F-preview / R-preview | Proposed: selection is session-only; screen is not committed data. Source inspection and local execution can observe this variant only. | Preview preserves committed rows/file; input bytes copied; invalid selection preserves current preview and data. |
| F-save / R-retry | Proposed: only successful confirmation commits; controlled failure retains a retryable selection. | Injected pre-rename failure returns persistence error, preserves exact old bytes/rows and preview; retry commits once and clears pending state. |
| F-cancel / R-guard | Proposed: cancel or replacement invalidates the old selection token; stale confirmation has no effect. | Cancel after failure, stale confirmation after cancel/replacement, repeat confirmation and wrong-token cancel preserve current state/file. |
| F-reopen / R-session | Proposed: a new workflow instance reads committed data; pending selections are abandoned. | Reopen from preview/error discards pending state, rejects old token; successful data survives a new instance. |
| U-crash, U-concurrency, U-permission | Unknown and untested. No original app, async callback scheduler, remote service or live access mechanism is supplied. | Remain unverified; synchronous action calls and hook failures cannot satisfy these requirements if a real project needs them. |

Selected state vector: displayed `screen` (idle/preview/error/saved), committed
rows loaded by the store, and session `preview` or null. Tokens are opaque,
fresh per selection and valid only for the current pending selection. No token
is persisted. `select` validates before replacing pending state. Invalid input
returns a codec error with no state change. `confirm`/`cancel` without the matching
pending token return `stale-selection`, without changing even the displayed state.
Success clears the pending selection; persistence failure keeps it and displays
error. Cancellation clears pending/error feedback and returns idle. A reopen
means constructing a new instance over the same file in this process; it does
not mean process restart, power loss or crash recovery.

Use only newly created disposable directories, synthetic data and one writer.
This fixture is not a general installer, file-security boundary or transaction
engine. No permission/revocation, crash, concurrent save, cross-device, remote
sync or asynchronous interleaving behavior is claimed. Token checks exercise
ordered direct calls, not concurrent callbacks. The inherited store has no
fsync/durability guarantee. Atomic replacement on a particular host does not
prove power-loss durability.

R-retry depends on F-save's starting state, failure location and file-preservation
assumption. If any changes, revalidate failure/retry/cancel/reopen observations
and their dependent acceptance. Ordinary empty/existing imports remain scoped
historical results; unchanged code alone cannot make those results cover a new
failure location. A real original's pending-draft persistence could differ:
investigate that evidence before choosing parity or an intentional improvement.
