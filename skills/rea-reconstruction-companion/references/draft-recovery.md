# Reload and retained draft recovery

Use for the selected reload/reopen or interrupted-save journey, alongside
[unsaved changes](unsaved-navigation.md) and [session transitions](session-permissions.md).
Do not add persistent storage to a real application merely to investigate its
behavior. Recover the observed retention policy or label a new policy as proposed.

Separate the last confirmed record, recoverable checkpoint, editor memory and
captured save operation. An accepted draft checkpoint is not a successful record
save. Bind each to account/workspace, document, base revision and applicable
session/draft lifetime. Define retention, eligibility, explicit restore/discard,
storage bounds and malformed-state behavior before implementing recovery.
Persistent retention can itself be inappropriate; plaintext local storage and
logical identity keys provide no authentication, encryption or confidentiality.

Exercise ordinary save/readback before unsaved reload and actual tab close/reopen
at the same origin. Record exact surviving values and feedback independently.
A new instance in a model is not browser reload evidence; tab reopen is not
browser-process restart or crash durability. Do not depend on a closing-page
callback completing an asynchronous save. Checkpoint during supported active-page
events and expose pending/failed checkpoints honestly. Native API acceptance
does not prove power-loss durability. Distinguish injected errors from actual
storage quota/denial and failed acknowledgement from known rejection.

Restore is a fresh explicit decision. Revalidate owner/resource/lifetime and
current saved revision; restoring text must not mark it saved, replay an unknown
write or silently overwrite a newer record. Include edit/save overlaps, changed
draft slots in another tab, expiry and A to B to A transitions. Use the actual
target's cooperation/transaction mechanism where necessary: a revision comparison
alone does not serialize concurrent writers. Reconcile uncertain effects using
supported readback/receipts before retry; a local pre-effect cancellation guard
does not roll back or cancel a dispatched service operation.

## Explicit choices when retained and latest content conflict

Inspect the exact retained checkpoint or current editor text alongside a fresh
read of the latest saved content and revision, without replacing either. Identify
the selected source, account/document/lifetime, base revision and read time.
Label last-known snapshots and memory-only text honestly; comparing is not
restoring, checkpointing or saving. A successful native read does not make the
display permanently current.

Recover the target's explicit resolution policy. For a proposed keep-both choice,
define the separate destination, copy identity allocation, retention/eligibility,
capacity, malformed-state and failure behavior before implementation. Preserve
the original and other writers' draft slots. Never silently merge, overwrite,
discard, evict retained data or transfer a draft across identities. A recovered
copy is distinct from saving the original or marking the live editor clean.

Capture the selected payload/source/base, destination, current saved revision,
draft snapshot and decision identity. New input, another writer, account/document/
lifetime changes or expiry while comparison/confirmation is pending must
invalidate the choice or require a fresh applicable decision. Revalidate at the
actual effect under the supported transaction/cooperation mechanism; a disabled
button or storage notification alone is insufficient. Allocate copy identities
there too. Distinguish repeated confirmation from a new deliberate copy request;
unknown acknowledgement requires authoritative readback before another decision,
not automatic replay. Keep newer editor text unsaved when an older copy receipt
arrives. Failure must disclose what remains only in memory.

Verify ordinary copy and readback, then the distinguishing boundaries: exact
whitespace/text, latest original and peer-slot preservation, changes after
comparison and during confirmation, concurrent identity allocation, full/invalid/
unavailable storage, acknowledgement loss and actual reload recovery. Keep
deterministic doubles, controlled timing and native DOM/storage observations
separate; finite observations cannot establish distributed exactly-once behavior.

For the bounded proposed local policy and disclosed browser observations, see
repository-only `evals/draft-recovery/README.md`. Its Web Locks/localStorage lab
has synthetic identity and a 24-hour draft eligibility policy, separate from the
historical volatile navigation examples. Source doubles, real browser captures,
package checks and independent acceptance remain different evidence categories.
No original parity, real auth/service enforcement, secure retention, restart/crash
durability or model quality follows from that example.
