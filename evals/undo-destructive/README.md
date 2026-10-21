# Bounded undo and destructive-action example

Run `node --test tests/undo-destructive.test.mjs` from the repository root with
existing Node 20+. No packages, network, model calls, real data or destructive
system operations are used. The portable [guidance](../../skills/rea-reconstruction-companion/references/undo-destructive.md)
is usable separately; this fixture is repository-only.

## Evidence and valid-input profile

This is **proposed** `list-history-v1-proposed` behavior, not recovered original
behavior. The same author reasoned and froze the 14 scenarios / 58 literal
intermediate expectations before writing the candidate. `identity.json` binds
those bytes. The checker does not calculate expected states using the candidate;
source exposure and same-author judgments prevent an independent-evaluation claim.
Historical fixtures elsewhere remain unchanged.

Initial synthetic rows are `a:Alpha, b:Bravo, c:Charlie`, in that order, with
`b` selected and used as the viewport anchor. Inputs are the declared shapes:
existing unique string IDs, string text, nonempty batches of distinct existing
IDs, request kind `delete` or `purge`, and listed action types. The factory uses
the declared initial rows/selection/anchor; caller input and returned snapshots
are isolated. This is not a general input validator or public editing API.

- An edit changes text by stable ID. A batch commits all supplied text edits as
  one history entry. Separate dispatches stay separate; no clock-based coalescing.
- Entries store before/after data, ordered identities, selection and anchor.
  Undo/redo restore those snapshots. Selection alone has no entry. Empty history
  is unchanged. A new changed edit clears redo; unchanged text and an injected
  pre-commit failure preserve both stacks and all data. Failure injection tests
  only that local control path, not real persistence or partial batch failure.
- `request` binds ID and kind; while pending, selection or replacement request
  is allowed, editing/history actions are outside this profile. Cancel clears
  only pending state. Confirm consumes the request and acts on its bound ID,
  even after selection changes. Repeated confirm without a request is unchanged.
  Replacement requests are supported but not part of the frozen sequence set.
- Reversible deletion stores one entry, removing only the bound ID. If selected
  or anchored there, use the next row, otherwise the prior row, otherwise null;
  undo restores original identity/order/values/view. The middle-item scenario
  distinguishes restoration from appending the removed row at the end.
- `purge` uses an **in-memory recording-only effect double** outside history.
  Its chosen policy clears both stacks at successful confirmation, forming a
  barrier so older snapshots cannot resurrect that row. This is an intentional
  example policy, not a rule for every product. Subsequent local edits can be
  undone back to that barrier. Cancel produces no effect; repeated confirm adds
  none. There is no filesystem deletion, external provider or rollback guarantee.

Every independent scenario resets; sequences retain state between checkpoints.
Snapshots compare actual row values and IDs in order, selection, anchor, pending
request, undo/redo depths and recorded effects, plus the action outcome. In
`confirm-bound-to-requested-id`, changing selection to `c` before confirming
deletion of `b` preserves `c` on undo: the entry's view is captured at commit.
In `permanent-barrier-and-repeat`, undo cannot revive `b` or erase the effect log.

## Fault discrimination and limits

Ten disposable wrong candidates first pass the same six ordinary checkpoints:
edit/undo/redo, a single-edit group, and requesting/confirming the still-selected
item. Each then fails a named intermediate state/value/effect checkpoint:
retained redo after branching, split batch, appended restoration, retained
post-delete selection, no-op/failure clearing redo, cancel committing deletion,
confirmation using changed selection, purge entering history and a repeated
permanent effect. The full correct candidate also runs the separate ordinary
end-item delete/undo/redo scenario. Controls are declared; these are selected
challenges, not a comprehensive mutation score.

Each challenge stops at its intended assertion. Deliberate corruption can make
later actions invalid, so those later exceptions cannot be counted as kills.
Load/action/infrastructure errors propagate. Additional controls corrupt actual
values, identity, order, selection, anchor, pending state and effects and check
the comparator rejects them. Diagnostics retain literal expected and actual
states. Owned temporary mutants are removed; original expectations are untouched.

No UI, saved/reopened history, persistence, partial external completion, storage
failure, permissions, real backend, concurrent editing, latency or original-app
parity is verified. An unknown real effect needs the separate
[async/reconciliation guidance](../../skills/rea-reconstruction-companion/references/asynchronous-results.md),
not a local snapshot or this effect double. The candidate is a small teaching
fixture, not a reusable production history engine or backup manager.
