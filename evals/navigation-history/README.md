# Bounded navigation and history example

Run with existing Node.js 20+, without dependencies or services:

```sh
node evals/navigation-history/check.mjs
node --test tests/navigation-history.test.mjs
```

This same-author, source-exposed proposed policy freezes **94 complete literal
checkpoints in 33 scenarios**, across route identity, entry restoration and
loading/dirty-departure ownership. Expectations and adapter effects were reasoned
separately and hash-bound before writing the candidate; no candidate output or
transition simulator generated the oracle. Eighteen disposable faulty variants
first pass five ordinary checkpoints and then fail a named state/effect comparison.
This is teaching evidence, not independent acceptance, a model trial or target parity.

The narrow grammar is `/items` or `/items/<id>`, with optional `filter=all|open|closed`.
IDs decode once and match lowercase ASCII letter followed by up to 31 lowercase
letters, digits or hyphens. Explicit `all` is removed from canonical URLs. Duplicate
or unknown query fields, malformed IDs, other paths, fragments, trailing slashes,
external destinations and invalid filters reject. Initial invalid routes throw;
in-app invalid navigation preserves history/data and reports `invalid`. No original
application's grammar was recovered. URL encoding and the built-in query parser
are used only within this profile; this is no general URL sanitizer/security boundary.

Item identity is independent of the filter: a selected detail may remain open even
if it would be absent from the filtered list. The read adapter receives the canonical
URL and returns supplied synthetic text or `null` for missing; it does not implement
a real list/filter backend or permission checks. Missing item links remain addressable
with `not-found` status; current read failure has separate `error` status. Both clear
loading. There is no redirect or automatic retry.

Each volatile entry has its own key, canonical URL and scroll value. Push appends
and truncates the forward branch; replace retains the key but resets entry scroll;
traversal selects an existing entry without pushing. A same-canonical-URL push or
replace is a no-op, but traversal to a distinct entry with that URL still loads.
All committed navigation starts a new lifetime, clears old display/draft and loads
the selected route. There is no data cache. Scroll is a stored number only: no DOM
scroll or focus adapter exists. The harness's `recreate` replaces the entire model
and adapter using only the current canonical URL; entries, scroll and drafts reset.
That is a fresh-instance contract, not a real reload/storage experiment.

Reads are real promises whose completion is explicitly released by the in-memory
adapter. Unique lifetime epochs guard success, failure and finalizer independently,
including A → B → A. Ignored outcomes can still finish in the double; they are not
aborted. `settle` awaits the selected operation chain, without timers or sleep races.
Read/history calls are recorded separately from snapshots, so duplicate traversal
effects cannot hide behind matching model state. Pending read records are finite
test data; the candidate keeps a finite-run operation map, not a production lifetime
or memory-management strategy. Unexpected fixture/adapter errors propagate.

Only a loaded item is editable. Dirty means text differs from loaded text; revision
increments for every edit. Push/replace/traversal of a dirty draft stores one exact
pending intent and performs no history/load effects. Further requests cannot replace
it. Cancel drops only that intent and retains edits and entry; discard rechecks the
source lifetime/revision, then commits exactly once. An edit during the prompt makes
the old discard stale, even if text later matches. This conservative proposed policy
is not universal. Save/autosave, durability, unload and save-during-leave are omitted;
use the separate [unsaved example](../unsaved-navigation/README.md) for its captured
save policy, and recover real save behavior through the [portable guidance](../../skills/rea-reconstruction-companion/references/navigation-history.md).

The model gates traversal *before* changing its index. Real browser traversal can
change the active URL before an app callback; no browser veto/repair is established.
No real browser Back/Forward, history.state/popstate, scroll restoration, reload,
hosting fallback, native deep link, actual storage, user data, account, permission,
remote service, concurrent writer, focus/accessibility or production router is tested.
