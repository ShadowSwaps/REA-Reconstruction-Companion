# Drag, drop and reordering

Use for the selected placement or transfer workflow, including natural requests
such as “put this above that” or “move a card to the other column.” Extend the
existing [workflow and acceptance rows](blueprint.md#consequential-workflow-states);
one reorder does not need a general drag framework. Planning stays planning.
Use authorized disposable fixtures; a request to explain a gesture does not
authorize moving real files, user documents or external data.

## Recover identity, order and intent

Bind observations to target/version, source and destination owners, starting
identities/revisions, view configuration and ordered inputs. Separate original
observations, inferred mechanisms, unresolved policies and intentional changes
for the reconstruction. A dragged label, insertion marker or changed row count
does not establish which item moved or whether any effect committed.

| Boundary | Recover where consequential |
| --- | --- |
| Source | Stable item identity, owner and captured membership/order, distinct from a row index or equal label. Which selection is dragged, and when is it bound? Use [multi-selection](multi-selection.md) only when that scope matters. IDs or transfer payloads do not grant cross-owner permission. |
| Placement | Same-list reorder versus cross-list move/copy; before/after a stable anchor versus an explicit end slot. Account for source removal before calculating the insertion point, self/adjacent drops, empty lists and missing anchors. Recover identity/value policy for copies and identity retention for moves. |
| View versus data | Filtered/sorted/paged/virtualized display versus canonical order. What does a visible insertion slot mean for hidden items and unloaded pages? Manual reorder may be rejected under sorting, change a rank, change the sort mode or follow another target policy; do not impose one answer. Use [search and ordering](search-filter-sort.md) for the view pipeline. |
| Applicability | Source/destination identity, eligibility, owner/revision or anchor changes during the gesture and at commit. Establish the target's reject, rebase, refresh or conflict policy and enforcement at the actual effect owner. A UI preview cannot enforce service permissions or prevent later changes. |

Trace source binding → preview → validation → commit/refusal → readback/feedback.
Determine which state is tentative, when source removal and destination insertion
become effective, and whether a cross-list transfer is atomic or can partially
complete. An animation, one callback or one request is not transaction evidence.
Record known failure and unknown/partial outcome separately; for delayed work or
lost responses use [asynchronous reconciliation](asynchronous-results.md) before
replaying effects. Preserve unaffected items and values under the selected policy.

## Completion, cancellation and history

Recover invalid/absent drop targets, empty sources, empty destinations, unchanged
positions and repeated activation. Whether a no-op consumes history or changes
feedback is target policy. Check actual effects and history, not only the marker
or success text; repeated input must not silently duplicate or lose items.
If view rules affect eligibility, check them again at the effect boundary or
invalidate the affected preview. Include view changes after preview in selected
checks; a filter-only change need not invalidate stable canonical anchors under
the chosen policy. Specify whether refusal consumes the gesture and whether a
new preview or new gesture is needed before another attempt.
Cancel before commit, aborting pending work and undoing a completed move have
different guarantees. Do not claim cancellation reversed an already committed
or remote effect. A known rejected commit can support a fresh attempt; an unknown
outcome requires reconciliation, not an automatic replay.

Use [undo and restoration](undo-destructive.md) to specify history ownership,
grouping and actual restoration of identities, values, positions and relevant
selection/focus. Establish what later source/destination edits make undo conflict
or require compensation. Restoring an old whole-list snapshot can erase newer
items. Local undo does not establish remote reversal, persistence or crash recovery.

Keyboard or explicit move controls should reach the same applicable placement
and effect contract where the design offers equivalent operations. Recover their
actual selection, destination, focus and feedback behavior using
[interface accessibility](interface-accessibility.md). A model-level move command
does not prove keyboard reachability, pointer/touch/browser events, hit testing,
autoscroll, accessibility semantics or spoken announcements. Keep unavailable
interaction checks unrun rather than infer them from fixture success.

## Freeze distinguishing sequences

Freeze literal intermediate identities/order, values, preview, history and effect
attempts from evidence or a separately reasoned proposed policy before adapting
the candidate. Choose consequential contrasts for the selected operation:

- Reorder forward/backward and transfer/copy before/after/end, including duplicate
  labels, adjacent/self drops and an empty destination. Check untouched items.
- Filter/hide or sort rows, then place using stable identities/anchors; verify
  canonical order and the chosen sorted-view rule separately from displayed order.
- Preview then remove/change the source, destination or anchor; compare cancel,
  invalid/absent drop, repeat activation and known failure followed by a fresh attempt.
- Move/copy → undo, then contrast a later edit conflict and an equivalent explicit
  move. Check identity/order restoration and recorded effects at each boundary.

Use plausible disposable faults that pass ordinary controls before a named
state/effect assertion rejects them. An exception or harness error is not a
useful detection. Disclose oracle authorship, source exposure, doubles and unrun
boundaries; finite checks do not establish original parity, concurrency, service
authorization, durability or real input/accessibility behavior. Preserve historical
oracles and reassess affected acceptance when ownership, order or history changes.
Repository-only `evals/drag-drop/README.md` demonstrates one proposed finite
policy. Standalone installations omit evaluations; the guidance is self-contained.
