# Offline drag/drop and ordering example

Run with existing Node 20+ from the repository root:

```sh
node --test tests/drag-drop.test.mjs
```

No packages, network, real clipboard/files, browser, OS drag events, user documents
or model calls. `candidate.mjs` is an in-memory operation model; `double.mjs`
independently records commit attempts and successful effects and can reject one
attempt before any effect. It is not a storage implementation or production
transaction. This repository-only example is omitted from standalone installs.

The same author reasoned literal expectations before the first candidate run,
then implemented with full source exposure. `expectations.json` contains 81
intermediate snapshots and accumulated attempts/effects in 16 reset scenarios;
`identity.json` pins its SHA-256. State is retained within each sequence. Initial
freeze and a pre-execution amendment are retained privately: the amendment
corrected the derived sorted view after transfer and added a nonempty end contrast.
No candidate output generated expectations. This is neither independent acceptance
nor captured original-app behavior; separate non-author review remains required.

## Declared proposed policy

Lists start as left `[a,b,c]`, right `[x]`, empty `[]`; a and b both display
`Same`. Stable IDs bind the source and before/after anchors. Moves retain IDs and
values; copies get a fresh `copy-N` ID and retain the value. Removal precedes
anchor lookup. An end slot is explicit. Self/adjacent moves with unchanged order
produce no effect/history. Preview changes no data. One active gesture ignores
a second begin; drop consumes that gesture, so repeated drop has no extra effect.

Filtered views hide IDs without mutating canonical order; placement is relative
to the canonical anchor and preserves hidden items. A sorted view derives label
order with ID ties and refuses same-list manual placement, while cross-list
transfer remains available. These choices illustrate a profile, not universal
filter/sort/drop policy. View updates do not count as canonical data revisions.
Drop rechecks the current sorted-view rule before any commit attempt. Enabling
sorting after a valid same-list preview refuses both move and copy, leaves data
and history unchanged and consumes the gesture. Removing sorting does not
implicitly revive an invalid preview: request a new preview while the gesture
is still active, or begin a fresh gesture after a refused drop. Filter-only
changes retain stable canonical source/anchor intent, including hidden items;
cross-list transfer remains available with sorted source/destination views.

Source-list revision is captured at begin and destination revision at preview.
Changes to either before drop reject as stale, including removal of the anchor.
Invalid/missing previews reject. Cancel clears tentative state. A known failed
attempt leaves lists/history unchanged and consumes the gesture; a fresh gesture
can retry. The local double has no unknown/partial outcome. Real delayed writes
need applicability and reconciliation beyond this example.

Each successful operation records one before/after history entry. Undo restores
identity/value/order only when the entire board still equals that entry's after
state. Later list edits conflict and retain both data and history. This conservative
whole-board check is not a rebase algorithm; view settings stay current, revisions
advance and copy counters do not rewind. Redo, multi-item gestures, rank storage,
new owners and arbitrary history are outside the finite profile.

The explicit `move` action reaches the same begin/preview/drop contract. No
keyboard UI, pointer/touch events, focus, drag payload serialization, permissions,
screen-reader announcement, browser hit testing or autoscroll is exercised.

## Discriminating validation

Eight ordinary checkpoints cover move/copy and undo. Fourteen actual temporary
source mutations must pass those controls, then fail a named intermediate
comparison with all earlier checkpoints matching: visible-index identity,
same-list offset, end prepending, no-op history, self-drop loss, sorted reorder,
filter deletion, stale source/destination, cancel commit, repeated begin rebinding,
known-failure application, undo overwrite and explicit-action identity substitution.
The checker compares every exposed state field and independently recorded
attempts/effects; extra effects cannot hide behind unchanged success feedback.
Fixture/import/adapter errors propagate and do not count as successful detections.

`applicability-expectations.json` adds six separately reasoned regression
sequences and 39 literal checkpoints for view changes between preview and drop;
`applicability-identity.json` pins them independently. They were frozen before
adapting the candidate for non-author finding DD-NAR-001. The original oracle,
identity and 81 checkpoints remain unchanged. Checks cover consumed refusals,
explicit preview refresh after unsorting, cross-list transfer with both views
sorted and filter-only changes hiding the bound source and anchor. A fifteenth
source mutant removes the effect-boundary recheck: it passes all 81 historical
checkpoints, then fails the new sorted-at-drop state/effect assertion. The retained
pre-fix regression failure demonstrated this missing transition; these are still
same-author/source-exposed model checks, not independent original-app evidence.

These finite source-exposed checks establish only this proposed model profile.
They do not establish original parity, real input/accessibility behavior, backend
authorization/atomicity/concurrency, persistence, crash recovery, safe remote undo
or model performance. For another target, recover and freeze its own applicable
policy using the [standalone guidance](../../skills/rea-reconstruction-companion/references/drag-drop.md).
