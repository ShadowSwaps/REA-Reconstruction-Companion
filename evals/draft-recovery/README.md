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

The Read store control performs a fresh native `getItem` and renders exact bytes.
Record that plus actual DOM values/visibility, revision, scope, pending flag, URL
and native reload/close/reopen actions. Diagnostic labels alone are insufficient.

## Evidence and limits

The 28 October 2026 author trial captured 41 candidate DOM/native-store checkpoints
and 14 checkpoints on three disposable faulty copies. Each copy passed seed,
ordinary save and actual reload controls before a named mismatch: missing base
guard overwrote a newer native record; missing slot scope offered A's draft to B;
restore falsely said Saved with unchanged native saved content. The 24 Node tests
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
