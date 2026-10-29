# Undo, redo and destructive actions

For undo/redo or destructive actions, use [history and destructive-effect contracts](undo-destructive.md) to recover restoration, identity/order/view state, grouping, history lifetime and redo branching. Trace confirmation/cancel/repetition and distinguish reversible deletion from permanent or uncertain effects. Keep one-operation requests bounded and planning requests in planning mode.

Use for the selected editing or destructive workflow. Extend the existing
[finding/requirement/transition rows](blueprint.md#consequential-workflow-states);
one operation can need only a compact contract. A plan stays a plan, and a
request to recover one action does not authorize redesigning all history or
performing a real deletion to demonstrate it.

## Recover what restoration means

Bind observations to target/version, starting data and identities, ordered
actions, configuration and capture. Separate observed original behavior, causal
hypotheses, user requirements and proposed improvements. A visible Undo button
or handler does not establish what it restores. Keep unresolved semantics and
dependent acceptance explicit; use [evidence reconciliation](reconstruction-methods.md#conflicting-evidence-and-ambiguous-behavior)
for conflicting captures or uncertain mechanisms.

| Boundary | Recover where consequential |
| --- | --- |
| Restored state | Actual values, stable item identities, order/relationships and relevant selection, focus, cursor or viewport state. Equal labels/counts can hide a recreated identity or wrong position. Decide which view state belongs to a history entry and which stays current. |
| History ownership/lifetime | Document/session/tab or shared scope; what save, reopen, replacement/import or switching owner does to history; retention limits and empty-history behavior. Durable data does not imply durable undo. |
| Entries/grouping | What constitutes one action, explicit batch or coalesced edit; where a group begins/ends, which earlier/later edits remain independent, and how a failed/partially applied group is handled. An atomic-looking UI gesture does not establish transactional storage. |
| No-op/failure/new branch | Whether a no-op or rejected edit consumes history, changes feedback or invalidates redo; what a genuinely new edit after undo does to redo. Do not import an editor library's policy as observed original behavior. |
| Undo/redo failure | Whether restoration can fail, conflict with newer data or become inapplicable after an identity/owner change; what remains committed, pending or recoverable. Undo itself can have effects. Record partial completion rather than treating an exception as a full rollback. |

Keep deletion, soft removal/trash, local undo, backup restore, compensating
actions and permanent effects distinct. Describe exactly what each can recover,
its prerequisites and what later data a restore could lose. Use
[safe-change recovery](safe-changes.md#implement-recover-and-report-proportionally)
for selected backups/migrations and [checkpoint applicability](checkpoints.md#on-resuming)
when identity, history policy or evidence changes; do not copy those procedures
into every undo specification.

## Trace the destructive effect boundary

Recover request → target binding → confirmation/cancel → actual effect →
readback/feedback. Confirmation may be absent, required or conditional in the
original; a dialog's presence alone does not prove enforcement, authorization,
reversibility or completion. If changing that policy, label it as proposed.

Identify the exact item(s), revision/owner and effect being confirmed. Determine
what happens if selection/data changes before confirmation, the prompt is
dismissed, confirmation is repeated, or a shortcut/direct call bypasses a view.
Cancel before commit, aborting in-flight work and undo after completion have
different meanings. Inspect the component that owns the effect, including any
separate permission checks. A disabled button is not service-side enforcement.

Record reversible local changes separately from external effects such as a
sent message, remote deletion or released resource. A local undo or backup does
not establish that an external consequence was reversed. For delayed completion,
uncertain/partial effects and repeat/retry decisions, use
[asynchronous applicability and reconciliation](asynchronous-results.md).
Keep unknown outcomes unknown until applicable evidence supports a conclusion;
do not replay a consequential action merely because its response was lost.

## Freeze distinguishing sequences

Freeze literal intermediate values/IDs/order and relevant history/view/effect
state from supported observations or a separately reasoned proposed contract
before adapting the candidate. Select consequential cases, without requiring
an exhaustive generic history engine:

- Edit → undo → redo, multiple independent edits and the selected group boundary.
  Check intermediate restoration, not only the final round trip.
- Undo → new edit → redo; contrast a real edit with a no-op and rejected edit.
- Delete a middle/selected item → undo → redo; verify identity, position and the
  selected restoration policy. Test relevant changed-selection/owner conditions.
- Request → cancel versus request → confirm, changed target before confirmation,
  repeated confirmation, and the chosen irreversible/partial-effect boundary.
  Exercise actual data/effect handling in authorized disposable fixtures; keep
  unavailable original/backend cases pending rather than trial real user data.

Use plausible disposable faults that pass declared ordinary controls, then fail
a specific value/state/effect assertion. Infrastructure errors do not count as
useful detection. Keep source exposure, oracle authorship, doubles and untested
sequences explicit. Preserve historical oracles; a policy change requires a
separate acceptance profile and affected revalidation. Finite local success does
not establish original parity, arbitrary history correctness, crash durability,
concurrent editing or backend reversal. The separate repository-only example is
`evals/undo-destructive/README.md`; standalone installations omit it.
