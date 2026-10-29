# Navigation, deep links and history restoration

For direct links, selected routes/filters, refresh or Back/Forward restoration, use [navigation and history contracts](navigation-history.md) to recover destination and entry identity, URL versus transient/persisted state, malformed/missing destinations and delayed-load ownership. Reuse unsaved departure policy for dirty drafts; distinguish model traversal and fresh-instance checks from real browser history/reload evidence.

Use for a selected item's direct link, route/filter state, refresh or Back/Forward
journey. Extend the existing [workflow rows](blueprint.md#consequential-workflow-states)
proportionally; recovering one destination does not require a routing framework.
Planning remains planning. Keep observed original behavior, hypotheses, user
requirements, proposed policy and unknowns distinct. A screenshot or URL string
alone does not establish what opens, restores or persists.

## Recover destination identity and state ownership

Trace entry link/control → raw destination → parsing/validation → selected owner
and item → load → displayed result. Bind evidence to target version, environment,
account/workspace where relevant and the starting route/history position. Recover
path and query types, encoding, defaults, duplicate/unknown parameters and invalid
or missing destination behavior. Distinguish malformed links from a valid identity
that is absent, inaccessible or still loading; do not infer existence or permission
from parsing success. Establish canonicalization and redirect policy from evidence,
including whether it replaces or adds a history entry and preserves intended state.

Identify which state belongs in the shareable URL (selected stable item, filter,
sort/page if applicable), an entry's transient state (scroll, focus, expanded rows),
the current editor/session, or persistent preferences. Do not put drafts, tokens or
private data into a URL merely to restore a view. Recover precedence when route
parameters, saved preferences and defaults disagree using [preference contracts](settings-preferences.md).
Check filtered-out selection, changed/missing items and a fresh entry without an
existing in-app session. A row number, display label or current list index may not
be a stable item identity.

## Recover entry and restoration semantics

Distinguish push, replace, traversal and fresh load. The same URL can occur in
different entries with different local state; URL equality alone need not identify
an entry. Recover same-destination behavior, Back/Forward bounds, branching after
Back, redirects and entry lifetime. Check both selected identity and visible
filter/order/page plus relevant scroll/focus, rather than only the address bar.

Choose the boundary claimed: view recreation, new app instance, actual browser
reload, external deep-link entry or process restart. Determine which state is
restored, reset, stale, unavailable or intentionally discarded at each boundary;
session memory or a storage double establishes no disk durability. Record direct
link/reload hosting fallback and platform integration only when in scope and
actually exercised. A local state machine establishes neither server route
fallback nor browser-native history, scroll restoration or native deep-link dispatch.

## Preserve loading ownership and departure intent

Apply [asynchronous applicability](asynchronous-results.md) at values, errors,
loading cleanup, cache/store and navigation effects. A → B → A can return to the
same URL under a new owner/lifetime; a stale completion may still be inapplicable.
Retain useful old outcomes as evidence without letting them overwrite the active
view or certify its draft. Ignoring a result does not cancel its external work.

Use [unsaved departure contracts](unsaved-navigation.md) for dirty editors. Bind
leave intent to departing document/revision, exact destination and navigation
kind/entry. Recover save/discard/cancel, repeated or replaced intents, save failure,
new edits during the decision/save, and late completions. Do not let a stale choice
discard newer edits or release another departure. Saving and leaving are separate
effects; a save label does not prove successful persistence or permission to leave.

Real history traversal may already have moved the browser's active entry when an
app receives a notification. Recover the actual adapter's cancellation/recovery
and URL/view reconciliation; a pre-commit in-memory guard does not demonstrate a
browser traversal veto. For unload/native close, retain the platform limitations
in the unsaved guide rather than promise asynchronous save completion.

When saves and session changes overlap departure, recover one precedence contract
across them. Bind approval to an exact departure ID, source revision/lifetime and
destination kind/entry; replacing a destination need not transfer approval. Check
the actual target's rule for a manual save already in progress, cancellation and
new edits. A late save acknowledgement must not release a different proposal.
Session invalidation can supersede departure without cancelling the external write.
Test the shared lifecycle and independently recorded history/service effects; three
passing isolated examples do not establish their composition. The repository-only
`evals/combined-navigation/README.md` freezes one proposed policy and its limits.

## Freeze distinguishing ordered checks

Before adaptation, freeze literal intermediate expected destination/entry, URL,
selected item/filter, local view state, loading/error, draft and pending intent
from supported observations or a separately reasoned proposed contract. Reset
independent scenarios and preserve state inside a sequence. Select ordinary
direct-link and clean-navigation controls, then consequential contrasts: malformed
versus missing destination, replace versus push, Back/Forward and branch truncation,
same URL under distinct entries/lifetimes, fresh-instance/reload state, delayed
success/error/finalizer and dirty departure decisions. Test actual adapter effects
where claimed; do not compare only authored routing decisions or final screens.

Challenge plausible faulty variants that pass declared ordinary controls before a
named state/value/effect mismatch rejects them. Harness/adapter/load exceptions are
failures to investigate, not useful mutation kills. Preserve source exposure,
authorship, finite coverage and untested platform/persistence behavior. Reassess
affected evidence when route, owner or restoration policy changes.

The repository-only example `evals/navigation-history/README.md` uses a proposed
item/filter grammar, volatile history entries, controlled read promises and
discard/cancel choices. Standalone installations omit it. Instance recreation is
an explicit double, not a browser reload; no original behavior, real storage,
browser lifecycle, native dispatch, production router or model quality is proven.
