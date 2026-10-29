# Multi-selection and bulk actions

For multi-selection or bulk actions, use [selection and batch contracts](multi-selection.md) to recover selected/page/all-filtered scope, stable identities, preview applicability, partial outcomes and safe retry/undo boundaries. Scale to the requested operation; keep observed behavior, unknowns and proposed policies distinct.

Use for the selected multi-item workflow, including natural requests such as
“apply this to everything matching” or “try only the ones that failed.” Extend
the relevant [workflow contract](blueprint.md#consequential-workflow-states);
one bulk operation does not require a general batch framework. Planning stays
planning; use authorized disposable fixtures for effects.

## Recover scope before effects

Bind observations to target/version, starting data/revisions, view and ordered
actions. Separate observed behavior, unresolved mechanisms, desired requirements
and intentional reconstruction choices. A count, checked header or enabled
button cannot establish which records the effect owner will change.

| Boundary | Recover where consequential |
| --- | --- |
| Selection universe | Explicit selected IDs, current page, loaded rows or all filtered results, including unseen pages. Recover exclusions, select-all/clear semantics and whether hidden selections persist, clear or require acknowledgement. Label counts and scope accurately. |
| Identity and view | Stable identity and owner/revision rather than row position or equal labels. What survives sort, filter, pagination, reload, removal or replacement? Use [search and ordering contracts](search-filter-sort.md) for the view itself. |
| Preview and confirmation | Exact operation/parameters, IDs or a query with explicit evaluation time, scope and exclusions. Determine whether later additions, removals or edits change the intended set, reject it or require a refreshed preview. A frozen query string is not a frozen membership set. |
| Empty/invalid/cancel | Empty selection, duplicate IDs, ineligible members and cancellation before commit. Preserve unrelated items and prior state according to the selected contract; inspect actual effect handling rather than infer it from a dialog. |

Do not impose snapshot membership on every target: a live “all matching” action
can be intentional. Specify when membership is evaluated and how changes become
visible to the user. Recover component/service enforcement, permissions and
cross-owner boundaries separately from UI guards; see [security boundaries](reconstruction-security.md)
when relevant. A selected ID alone is not authorization.

## Batch outcomes and safe continuation

Trace preview → confirmation/cancel → dispatch → per-item effect → reconciliation
and feedback. Recover atomic versus best-effort behavior from actual evidence.
One gesture, one request or an exception does not prove a transaction or rollback.
For atomic behavior, establish the actual transaction boundary and what happens
when validation or commit fails. For best effort, retain the exact attempted
members and distinguish successes, known failures, skipped/ineligible items and
unknown outcomes. Report counts from those identities; do not count a skipped
item as a success or hide a partial result behind a generic failure message.

Freeze operation intent at the applicable boundary, then recheck stale/removed
members under the chosen policy without silently substituting rows or broadening
scope. Preserve untouched data on refusal/failure. Account for duplicates,
repeated confirmation and partial completion. Keep unresolved outcomes pending;
use [asynchronous reconciliation](asynchronous-results.md) before replay when a
response is lost or cancellation races with effects.

A retry needs an eligible set, unchanged/applicable intent and an actual policy
for stale data. Retry only supported failures; exclude known successes and do
not assume an unknown outcome failed. Stable IDs alone do not make an increment,
message or deletion idempotent. Recover deduplication/reconciliation evidence
where necessary. State when retries stop, require a fresh preview or need user
input; do not silently extend an operation to newly matching records.

## History and distinguishing checks

Recover [undo grouping and restoration](undo-destructive.md): one entry for all
successful members versus per-item entries, partial-batch history, identity/order
restoration and applicability after later edits. A failed member should not gain
a fictitious successful history entry. Describe conflict behavior and the limits
of compensation. Local undo cannot establish reversal of remote or permanent
effects, nor recovery after the history owner closes.

Freeze literal expected IDs, intermediate values/revisions, per-item outcomes,
attempts and history from evidence or a separately reasoned proposed contract.
Choose useful contrasts for the selected workflow:

- Selected/page/all-filtered scope; hidden selection across sort/filter/page.
- Preview then change selection/view, add a match, edit or remove a target;
  compare cancel, empty selection and repeated confirmation.
- Early success plus later failure: distinguish atomic retention from best
  effort, refusal, skipped and unknown outcomes using actual state/effects.
- Retry eligible failures after partial success, then stale failure/unknown
  outcome; assert that successes and new matches are not replayed.
- Grouped versus per-item undo, partial success and later-edit conflicts;
  verify intermediate values and untouched items, not only counts/round trips.

Use plausible disposable faults that pass ordinary controls before a named
state/effect assertion rejects them. Harness errors are not useful detections.
Disclose oracle authorship, source exposure, doubles and unrun boundaries.
Finite local checks establish neither original parity nor production
transactions, permission enforcement, concurrency, durability or remote undo.
The repository-only `evals/multi-selection/README.md` illustrates one proposed
policy; standalone installations omit evaluation files.
