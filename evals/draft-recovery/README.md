# Browser reload and draft recovery

This repository-only, dependency-free lab proposes a bounded persistence policy.
It does not modify the historical browser-workflow or Pocket Board examples.
Run `node evals/draft-recovery/server.mjs` with existing Node >=20, open its printed
loopback origin in task-owned disposable tabs, click **Put seed in setup field**
then **Apply synthetic envelope**. Stop only that server and close only those tabs.
No installation, network API, model call, real account or credential is involved.
Standalone skill installations omit the lab and tests.

## Proposed policy

Four synthetic saved records are keyed by account A/B and document X/Y. Eight
possible draft slots additionally include simulated lifetime 1/2. One versioned
localStorage envelope is limited to 64 KiB UTF-8, 2048 UTF-16 units per text and
integer revisions 1 through 1,000,000. Unknown/malformed structures fail closed;
startup never repairs or replaces them. Setup is a deliberately privileged fixture
control that can replace this envelope, including with invalid synthetic bytes.

Edits checkpoint drafts under an exclusive origin Web Lock. All cooperative
writers re-read/validate inside that lock and compare the selected draft snapshot.
A second editor cannot silently replace another editor's checkpoint. Missing or
refused locks block writes. Checkpoint failure retains memory but reports that the
edit lacks reload recovery. No unload/pagehide callback attempts an asynchronous
save. A checkpoint must have completed before the observed reload/close boundary.

Startup reads the saved record and offers matching recovery separately. **Restore
offered draft** is explicit and remains unsaved. Save compares the captured base
revision and exact checkpoint at the write effect; stale recovery cannot overwrite
a newer record. Another tab may resolve/save the shared slot first, so a conflict
can leave the old tab's text only in memory. There is no automatic merge or retry.
The editor remains editable during saving. If a newer edit arrives after the native
write but before acknowledgement, the receipt reconciles the confirmed saved base
and checkpoints the newer text through the same slot comparison. It keeps that text
unsaved; another writer's checkpoint still blocks replacement. A failed new checkpoint
reports memory-only recovery rather than certifying the newer text as saved.
**Read latest** explicitly replaces this editor's memory with saved content and a
fresh offer; checkpointed drafts remain separate. **Discard selected draft** removes
only the unchanged selected slot and reads the saved record.

Draft eligibility is at most 24 hours with no future timestamp. Stale/future slots
remain quarantined until explicit discard; there is no timed purge. Changing
account/document/lifetime selects another slot; expiry hides editor/recovery and
invalidates undispatched local work. Reload defaults to the visible synthetic A/X/1
context. These controls implement no real authentication, authorization, encryption,
secure erasure or confidentiality from scripts/users sharing the origin. Retention
and clock trust are proposed choices, not recovered original behavior.

## Distinguishing procedures

### Explicit conflicting-draft recovery (29 October 2026 proposal)

**Compare current editor** selects dirty live text; **Compare offered checkpoint**
selects the unchanged eligible checkpoint offered by the last context read. Both
read the latest saved record without replacing editor text, saved record or draft.
The comparison shows exact text/base/latest revision, scope, source/read time and
whether editor text is checkpointed or only in memory. It is a last-known snapshot.

**Confirm keep both as separate copy** explicitly appends the selected text to an
optional validated `copies` map in the same schema1 envelope. Legacy envelopes
without this field remain readable and are not changed on read. Earlier lab
versions reject extended envelopes without repair; this is a proposed local
format extension, not a production migration or downgrade guarantee. IDs1..8
are allocated from the highest existing ID under the same exclusive Web Lock.
At most eight copies total are retained; full capacity fails without eviction,
replacement or ID reuse. Copies are scoped to the same account/document/lifetime,
2048-unit text and 64KiB total UTF-8 limits. Same-scope copies can be inspected
after explicit read latest/reload; the editor remains separate. Eligibility is
24hours with no future timestamp, then quarantine without automatic deletion.
This example adds no copy editing, deletion, automatic merge or retention purge.

Confirmation consumes one decision before dispatch and rechecks input sequence,
context, clock, saved-record snapshot and selected draft slot at the locked effect.
Retained checkpoints also retain their original expiry. Input/restore/context
changes and observed storage events invalidate pending choices. Events are an
early UI signal; effect checks still apply without them. A peer's newer original
or draft requires a fresh comparison. Other-copy additions allocate a fresh ID
under the lock; an observed event may conservatively require re-comparison.
Repeated confirmation cannot replay a consumed decision. Unknown acknowledgement
blocks further decisions until explicit readback/reopen; no automatic retry occurs.
Copy receipts never mark editor text saved or replace a newer/other-owner editor.

Finite same-author browser observations on29October captured35 DOM/native-store
checkpoints: ordinary save/reload, exact retained comparison/copy, peer original
preservation with memory-only recovery, new input/storage-event invalidation,
held decision with peer changes, account/document/lifetime/expiry boundaries,
unknown acknowledgement and actual reload/close/reopen copy inspection, eight-copy
capacity with no eviction, quarantine/malformed input and the preserved DR-NAR-001
post-commit receipt regression. Timing/acknowledgement loss used explicit local
controls; native storage writes/readback and reload were real. Final failure-feedback
readback is recorded separately. A sandbox loopback timeout and selector/binding
capture errors remain private evidence; already-completed effects were not replayed.
Node conflict tests include three source-exposed mutations that pass ordinary
save/copy controls before named stale-revision, changed-slot and newer-input
assertions reject them. These are deterministic doubles, not extra browser trials.

To reproduce: checkpoint text, reload, compare the offered checkpoint, confirm
and reload again. Inspect exact copy text while the original/slot remain unchanged.
In a peer tab restore/edit/save a newer original; compare the old editor memory
and explicitly keep it separately. Hold a copy before dispatch, change input,
scope or the peer's record/slot, then release: no copy may be written. Use the
controlled copy acknowledgement loss, reload and inspect the accepted copy once.
No native quota/denial, process restart/crash, real service/auth or parity claim
follows. Run `node --test tests/draft-conflicts.test.mjs tests/draft-recovery.test.mjs`.

1. Save `Confirmed`, reload and observe that saved text. Edit `  Draft Ω <tag>  `,
   wait for **Draft checkpointed; not saved**, reload, and observe `Confirmed` plus
   **Recovery available**. Restore: exact whitespace/text survives, saved record
   remains `Confirmed`, status remains unsaved. Close that tab and reopen the same
   origin; repeat the explicit restore. This is tab reopen, not browser restart.
2. Reject next save: prior saved bytes and draft remain. Reload offers recovery.
   Hold a save before dispatch, inspect unchanged native record, close the tab,
   reopen and recover the checkpoint. In two tabs restore the same draft; hold
   the old tab, edit/save `Newer record` in the peer, release the old tab: conflict
   must preserve the peer's native revision/content. A newer edit during a hold
   supersedes the captured save and keeps its own checkpoint.
3. Hold A/X/1, expire, select B/X/1 and release: the old local effect cannot write
   or certify B's editor. A/Y/1 and A/X/2 cannot offer A/X/1 recovery. Return explicitly
   to A/X/1 to recover. Lose an acknowledgement after native write: the editor
   reports unknown and blocks replay; reload reconciles accepted saved bytes.
4. Setup a timestamp of 1 or 9999999999999 on a real checkpoint: restore is blocked
   without deleting it. Apply `{` or 65537 raw ASCII characters: editor stays hidden
   and native bytes remain unchanged. Explicit seed setup recovers the lab only.
5. **Hold next acknowledgement after native commit**, then Save `Captured save`.
   Read store must show that actual committed record while feedback stays Saving.
   Edit `Newer unsaved edit` before releasing the acknowledgement. Release must keep
   that editor dirty and create its checkpoint against the confirmed revision2,
   without saving the newer record. Actual reload/explicit restore retains it;
   normal Save then writes revision3. Repeat with a different simulated account
   active before release: its editor/checkpoint must stay unchanged. This is an
   explicit local acknowledgement gate around real native storage, not evidence
   of a particular uninstrumented browser schedule or external service timing.

The Read store control performs a fresh native `getItem` and renders exact bytes.
Record that plus actual DOM values/visibility, revision, scope, pending flag, URL
and native reload/close/reopen actions. Diagnostic labels alone are insufficient.

## Evidence and limits

The initial 28 October 2026 proposal captured 41 candidate DOM/native-store checkpoints
and 14 checkpoints on three disposable faulty copies. Independent review found a
missing post-commit/pre-acknowledgement sequence guard; those results remain historical
and do not accept that rejected proposal. The corrected trial captured **52 candidate
checkpoints and 20 on four faulty copies**, retaining the three families and adding
the acknowledgement regression and another-owner control. Each copy passed seed,
ordinary save and actual reload controls before a named mismatch: missing base
guard overwrote a newer native record; missing slot scope offered A's draft to B;
restore falsely said Saved with unchanged native saved content; and a missing
receipt-sequence guard marked newer unsaved text clean after an older commit.
The **28 Node tests**
include matching faults and injected storage/lock ports; they do not establish
browser behavior. A sandbox server timed out; normal-context loopback worked.
One browser capture timeout was preserved and recaptured after inspecting the
already-completed action, without replaying it. Private raw evidence remains with
the task reviewer; these are same-author, source-exposed finite observations.

Run `node --test tests/draft-recovery.test.mjs`. Native storage denial, crash/power
loss, browser-process restart, other browsers/devices, external writers ignoring
the shared lock, real service/auth enforcement, original parity, model quality
and host instruction reload remain unverified. Injected failure is not native
storage denial; controlled acknowledgement loss is not a real remote timeout.
Local pre-effect invalidation does not cancel an external service write.

Mechanism references: [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage),
[pagehide limitations](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event),
and [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
These support the mechanism and limitations, not acceptance of this policy.
