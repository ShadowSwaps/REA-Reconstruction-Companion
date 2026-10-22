# Offline multi-selection and bulk-action example

Run `node --test tests/multi-selection.test.mjs` from the repository root.
Existing Node.js is sufficient; no dependency, model call, network, OS clipboard
or real user data is involved. `double.mjs` records synthetic synchronous batch
attempts independently of candidate snapshots.

One proposed teaching profile covers three families: scope/identity, atomic
versus best-effort outcomes, and retry/undo. The same author separately reasoned
and froze 16 sequences / 70 literal intermediate states and attempt lists before
candidate implementation. `identity.json` binds `expectations.json`; the checker
does not calculate expected outputs from the candidate. A preliminary oracle
draft was retained privately and corrected before implementation to preserve
earlier refusals/unknown outcomes after retry. Source is exposed and authorship
is shared; this is not independent evidence or a model-following benchmark.

## Finite proposed contract

Rows are `[stable ID, group, value, revision]` in one in-memory owner. IDs are
one to eight lowercase letters; groups are `x`/`y`, values integers 0–99 and
revisions positive safe integers. The operation increments a value once.
Selection is an explicit unique ID set, reported in ascending ID order. It
persists across view changes and removal; missing selections stay visible in
the selection/report rather than silently becoming another row. Removed IDs
cannot be reused during this fixture's lifetime. Production ID reuse/owner
generations need their own evidence and policy.

The view filters by group, orders IDs ascending/descending and pages by two.
Selected, page and all-filtered scope differ; filtered includes unseen pages.
Preview captures exact membership, values/revisions, mode and undo grouping.
Later view/selection changes or matching additions cannot broaden it. Empty
scope creates no preview; cancel clears it; confirmation consumes it before
dispatch, including error paths. A new preview replaces retry intent. These
snapshot choices illustrate a policy, not universal select-all behavior.

Confirmation checks missing/stale members before dispatch, including value and
revision changes and the finite numeric ceiling. Best effort skips those
members and applies only acknowledged successes from the double. Refusal,
retryable failure and unknown acknowledgement leave local values unchanged.
Atomic mode prevalidates the entire set: an invalid member skips otherwise
valid members without calling the double. With valid members, all must receive
synthetic success before any local write; otherwise acknowledged successes are
reported `rolled-back` and no local value/history changes. The double is not a
real remote transaction: `rolled-back` describes discarded local proposals,
and `retained` describes local data only. Unknown acknowledgements simulate a
reporting boundary; no actual response loss, external write or reconciliation
protocol is implemented or proven.

The report keeps every original member's latest outcome across retry. Retry
dispatches only best-effort `retryable` members from the preceding attempt,
using their original value/revision. Known successes, refusals, unknowns and
new matches are excluded. Changed/missing retries are reported without an
attempt. Atomic failures require a fresh preview rather than partial retry.
Each retry is explicitly dispatched by the caller; there is no automatic retry
loop. Repeated confirmation or retry with no eligible intent has no effects.

Successful local changes create one grouped history entry or one entry per
successful item in application order. Undo checks the complete top entry
before changing anything and restores values with the same IDs/order; revision
counters advance rather than rewind. Changed/missing members reject the whole
entry without losing it. Refused/failed members have no history entry. Selection,
view, the historical batch report and recorded attempts survive undo. There is
no redo, history persistence or general edit-history engine. Strict revision
checks can leave older entries inapplicable even after values are restored;
that conservative limit is intentional. Local undo cannot reverse external
effects or resolve an unknown acknowledgement.

## Checks and limits

Seventeen disposable faults each pass six ordinary selected/atomic checkpoints
before a specific state/attempt assertion rejects them: hidden selection,
page/filtered confusion, position identity, live selection/membership, stale
targets, partial atomic commit, retries of successes/unknowns/stale targets,
lost earlier outcomes, wrong grouping, recreated identity, undo conflicts,
effects on refusal and effects on cancel. Exceptions are not scored as useful
detections. Further checks cover atomic prevalidation, partial/grouped/per-item
undo, changed/removed retry members, revision restoration, ID reuse, finite
validation, detached state, adapter error propagation and comparator sensitivity
including independently observed concealed attempts.

No original app, real UI/backend, permissions, distributed atomicity,
idempotency service, concurrency, crash durability, permanent deletion or
external undo is tested. Adapter exceptions propagate and consume the preview;
they do not prove a real effect failed or is safe to replay. Use the
[focused guide](../../skills/rea-reconstruction-companion/references/multi-selection.md)
to recover the actual target's behavior. Standalone installations omit these
repository-only evaluation files. Existing historical examples are unchanged.
