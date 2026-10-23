# Combined navigation, edits and session recovery

Run with existing Node.js 20+, without dependencies, credentials or services:

```sh
node evals/combined-navigation/check.mjs
node --test tests/combined-navigation.test.mjs
```

This **same-author, source-exposed proposed composition** uses one state/effect
lifecycle across departure during save, expiry and explicit same-owner recovery,
and account switching while reads/writes finish. Twenty sequences freeze **189
complete literal checkpoints** with independent calls, service commits and history
effects. Twenty-two disposable source faults first pass **15 ordinary checkpoints**,
then fail a named state/effect assertion. The **34 focused tests** also cover
workspace/resource isolation, same-URL lifetimes, old success during a new owner's
save, manual-save approval, unknown grants, conditional service conflict and
response loss before a later commit. Exceptions never count as fault detections.

Expected declarations were reasoned and expanded into full literal JSON before
candidate adaptation; no candidate output or action-to-transition simulator
generated the oracle. Two initial re-login checkpoints omitted immediately readable
same-owner unknown outcomes. The original freeze/failed run remain private;
`identity.json` records the explicit corrections and original hash. One mutation
test initially named a nonexistent traversal checkpoint; its index was corrected
without changing the candidate/contract. These are author corrections, not
independent acceptance, original parity or evidence of model quality.

## Composition findings and proposed choices

The independent examples remain unchanged. Their policies differ:

| Existing bounded profile | Composition decision here |
| --- | --- |
| Navigation rejects replacement targets and omits save. | Each departure request, including repetition, supersedes the proposal with a fresh ID. |
| Unsaved navigation replaces targets and guards an in-memory commit. | Approval binds exact proposal/revision; external commit is independent of local applicability. |
| Session recovery retains scoped drafts for one document. | Ownership includes account/workspace and resource, with distinct session and route lifetimes. |

These choices are proposed, not recovered target behavior or universal improvements.
The narrow grammar is `/items/a`, `/items/b` or `/items/c`. Volatile entries have
keys; push truncates the forward branch, replace retains the current key, traversal
selects an existing key. Same-current-URL push/replace is a no-op, leaving any old
proposal unchanged. Distinct entries can share a URL. Each committed navigation
creates a route lifetime, clears display/editor and starts a controlled read.
The guard runs **before** modeled entry movement; it proves no browser traversal
veto, URL reconciliation, native history, reload or unload behavior.

1. Context invalidation wins over departure/display/feedback. It creates fresh
   session/route lifetimes, resets volatile history, clears the editor and marks
   pending writes unknown. Drafts/outcomes remain owner/resource scoped; outcomes
   are hidden without active read access. Synthetic context/grants are no trusted auth.
2. Departure binds ID, source lifetime/revision and exact kind/URL/entry. An old
   choice cannot cancel/release its replacement. New edits invalidate an old
   non-cancel choice. Cancel drops navigation only. Discard removes the retained
   current draft and is blocked by unresolved writes.
3. Save captures owner/session/route, payload/revision, remote base and approved
   proposal ID. Equal-text edit is a no-op; other edits increment revision,
   including editing back to old text. Dirty is revision-based. Acknowledgement
   certifies only the captured saved revision; newer text stays dirty. Departure
   also needs the same proposal and a clean latest draft. Manual save does not
   approve a later departure; save-choice during a write stops as unresolved.
4. Local invalidation cannot cancel service work. A late receipt updates its
   original ledger without changing another lifetime's editor, feedback, history
   or loading/saving. Service commit may precede acknowledgement, follow expiry/
   account switching, or occur even after response loss.
5. Recovery requires a fresh permitted same-owner read, then explicit restore into
   a clean editor. Other account/workspace/resource cannot inherit the draft.
   Restore does not send or mark saved. Pending/unknown writes block replay.
   Changed remote version, even with equal text, or a known receipt newer than the
   restored base blocks overwrite. No receipt lookup, automatic merge/replay or
   repair is supplied; these conservative stops remain unresolved.

The independent adapter records calls/effects and checks synthetic write grants
and expected remote version at commit. Known denial/conflict has no write effect;
response loss is unknown. Versions start at 1 per owner/resource and increment on
modeled writes. Read completions are separately supplied fixture observations,
not queries against that map; consistency with service state is a scenario
assumption. A supplemental test independently advances the service to exercise a
conditional conflict. Arbitrary readback/concurrent-writer correctness is unproven.

Only volatile maps, controlled real promises and recorded adapter effects are
exercised. Maps retain finite-run records without production eviction. There is
no real persistence, browser/router, focus/dialog/accessibility, authentication,
authorization, secure retention, distributed exactly-once delivery, original parity
or model benchmark. Local guards prove neither service cancellation nor rollback.
Standalone installations omit evals/tests; use the portable
[navigation](../../skills/rea-reconstruction-companion/references/navigation-history.md),
[unsaved work](../../skills/rea-reconstruction-companion/references/unsaved-navigation.md)
and [session recovery](../../skills/rea-reconstruction-companion/references/session-permissions.md)
guidance to recover a selected target's actual contract.
