# Copy, cut and paste

Use for the selected transfer or editing operation. Extend existing
[workflow/acceptance rows](blueprint.md#consequential-workflow-states); one paste
may need only a short contract. Planning remains planning. Do not trial a real
clipboard or user document by implication: contents can be sensitive and a write
can replace data owned by another application.

## Recover the selected transfer

Trace source owner/selection → captured representation → clipboard write/read →
destination validation → insertion/replacement → source removal → feedback.
Bind evidence to target/version, configuration, identities and ordered actions.
Separate original observations, causal hypotheses, desired requirements and
proposed improvements. A shortcut or menu label does not establish data effects.

| Boundary | Recover where consequential |
| --- | --- |
| Source and destination | Exact document/owner, selected IDs/range/order, cursor and replacement selection. What is captured now versus read later? What if selection, content, revision or owner changes? |
| Representation | Supported plain text versus structured/rich fragments, version/encoding, preference/fallback, relevant values/order/relationships and identity policy. Copy may create fresh IDs while a move retains them; recover the target's policy. Matching labels/counts or a self-roundtrip cannot establish compatibility. |
| Copy/paste effects | When clipboard ownership/content changes, when insertion or replacement commits, repeated paste and feedback after failure. Keep clipboard data distinct from selection/draft and saved content. |
| Cut and retention | Immediate removal versus pending move; what successful clipboard writing guarantees, when deletion is safe and what rejection leaves unchanged. For deferred moves, recover source applicability and destination acceptance at actual removal. A payload claiming a source/move identity does not itself authorize deletion. |
| Unavailable access | Actual platform permissions, gesture/focus/lifecycle requirements and read/write rejection or unavailable formats. Unavailable access differs from an empty clipboard; a double does not establish OS/browser behavior. |

Do not impose one cut policy universally. Immediate cut can need different
history/recovery than deferred move. Trace enforcement to the component owning
each effect; a UI guard cannot enforce another component's deletion. Identify
partial/uncertain effects and recovery for cross-document/application transfers;
a gesture is not proof of a transaction. Use [asynchronous applicability and
reconciliation](asynchronous-results.md) before consequential retries rather
than assume an exception means nothing changed.

Treat representations as untrusted. Apply proportional [security boundaries](reconstruction-security.md)
and [format compatibility](file-compatibility.md): supported formats and limits
before effects, safe text/rich-content sinks, selected prior-state retention on
rejection and no unrelated source-field disclosure. One operation does not need
a universal clipboard/parser framework.

## History and distinguishing checks

Recover relevant [undo/redo](undo-destructive.md) grouping, identity/order/view
restoration, ownership, rejected actions and repeated paste. Local undo can
restore document data without restoring the clipboard, reversing another app's
paste or making data saved; use [unsaved boundaries](unsaved-navigation.md).

Freeze literal intermediate values, IDs/order, selection/history and relevant
clipboard effects from evidence or a separately reasoned proposed contract
before candidate adaptation. Select useful contrasts: ordinary copy/paste,
insertion versus replacement, plain text versus structured values, cut followed
by write/read rejection or paste validation failure, changed source/destination,
repeat paste and undo/redo. Check actual data/effects, reset independent cases
and retain state within sequences. Leave unavailable platform cases unverified.

Challenge plausible disposable faults that pass ordinary controls before a named
value/state/effect assertion rejects them. Harness errors and exceptions are not
useful detections. Disclose exposure, authorship, doubles, formats and unrun cases.
Double success is not permission, interoperability, durability or concurrency
evidence. Preserve historical oracles and reassess affected results when the
transfer, identity, representation or history contract changes.

Repository-only `evals/clipboard/README.md` demonstrates three families using
synthetic in-memory documents and a recording/failure double. Its deferred-cut
policy is proposed, not original parity or a universal requirement. Standalone
installations omit evaluation files.
