# Frozen selected expectations

Frozen before candidate edits on 2026-10-19 against Pocket Board's historical
improved fixture in v1.3.29. Same-author/source-exposed teaching exercise. The
historical files, data schema, save/conflict behavior and existing oracles remain
unchanged. This is a proposed accessibility improvement, not reference parity.

| ID | Proposed outcome |
| --- | --- |
| K1 | Initial Tab order New task, Show, Alpha, Beta and reverse order; Enter opens the editor at Title; Tab reaches Done, Save, Cancel; Space toggles Done; Enter submits. Hidden editor controls are skipped. |
| F1 | Cancel restores New task or the current row with the opening task's stable id after rerender. If filtering removed it, New task is the fallback. |
| F2 | Async save success/rejection restores the invoking editor control when disabling it lost focus to body. A move elsewhere is respected; feedback is not focused. |
| E1 | Blank Title + Enter retains stored bytes, identifies/associates the error, sets invalid state and focuses Title. Nonblank correction clears obsolete error/invalid state; Enter saves trimmed input. |
| N1 | Rendered native controls retain their visible labels/names and row title/state. Error association is inspected separately from speech. |
| S1 | After earlier success, controlled pre-write rejection reports Save failed with useful alert, retains draft and previous bytes; keyboard retry succeeds. Existing status/alert regions persist. |
| V1 | Inspect keyboard focus on Title, Save and restored row/New task at the observed viewport. A focus image/CSS check is bounded visual evidence, not a measured contrast result. |

Retain create/edit/filter/trim/ID/storage/locking/conflict behavior. Deterministic
doubles and targeted mutants check application transitions; live browser inputs
establish only selected keyboard/focus behavior. Screen-reader announcements,
other devices/browsers, contrast measurements and whole-app WCAG conformance are
outside the demonstrated coverage. If unavailable, retain them as unrun and give
manual next steps. Stop at these cases or concrete limitations; do not expand to
a new widget framework or install assistive/auditing software.
