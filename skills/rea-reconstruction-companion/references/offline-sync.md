# Offline editing, reconnect and synchronization

Use for a selected journey such as editing without a connection, pending changes
after reconnect, repeated uploads or conflicting versions. Infer relevance from
the whole request and context; planning remains planning. Extend the existing
[workflow rows](blueprint.md#consequential-workflow-states) for this operation,
without requiring an app-wide sync architecture or implementing a production engine.

## Recover state and ownership before naming success

Bind evidence to target/version, account or tenant, document identity, local edit
revision, operation identity and remote revision. Separate observed behavior,
causal hypotheses, unresolved rules and proposed reconstruction choices. A network
indicator is evidence about that indicator; it proves neither service availability
nor a committed write. Static queue code shows intended behavior, not persistence.

Keep these boundaries distinct where relevant:

| Boundary | Evidence or question that changes the decision |
| --- | --- |
| Live draft | What can still change? Is it owned by this document/session? |
| Locally accepted or saved | Was it merely accepted into memory, or written to a named store? What survives reopen, process termination or storage failure? |
| Queued intent | Which exact payload, base revision and account are retained? Where is the queue stored, and what can supersede it? |
| In flight | Which attempt is outstanding, and can the provider still apply it after disconnect or client cancellation? |
| Server confirmed | Which captured operation/revision was acknowledged or authoritatively read back? This need not include newer local edits or establish the current latest remote value. |
| Conflicted | Which local/base/remote revisions diverged, and what remains retained for a decision? |
| Unknown outcome | Could an effect have occurred without its acknowledgement? What evidence can resolve it? |

These dimensions can coexist: an older captured payload may be confirmed while
the live draft has newer unsent edits. In-memory acceptance or a queue snapshot
is not durable saved state. Exercise the actual storage/reopen boundary only in
an authorized disposable environment; keep crash, concurrent-writer and real
backend guarantees unverified unless separately demonstrated. Use
[saved boundaries](unsaved-navigation.md) for edit/save/departure interactions.

## Reconnect does not decide whether replay is safe

Trace reconnect → service/session readiness → reconciliation → eligible dispatch
→ effect → acknowledgement → local acceptance. Recover the target's actual
trigger and ordering policy; do not prescribe automatic replay merely because a
connection returns. Recheck account/document applicability at dispatch and result
acceptance. Account switching must not route an old user's queued work or late
feedback into the new account. Real authorization belongs at the trusted service
boundary under [security guidance](reconstruction-security.md).

Separate a known no-effect rejection from a disconnect, timeout or lost response
after a possible write. Preserve the original operation, exact payload, base
revision, attempts and unknown state. Reconcile through a sufficiently
authoritative receipt/status or readback before replay; an absent receipt can
be stale, expired or race unfinished work. See
[uncertain effects](asynchronous-results.md#reconcile-uncertain-effects-before-retrying)
for key/payload binding, scope, retention, concurrent duplicates and bounded
recovery. A stable ID, reconnect event or client guard alone supplies neither
idempotency nor exactly-once effects. Keep unresolved operations blocked with
the next evidence requirement when safe retry cannot be established.

Capture intent separately from the mutable draft. A retry must follow the
recovered payload/revision policy, not accidentally send whatever the editor
contains later. Guard late success, failure and cleanup by operation/attempt and
owner applicability; ignoring a UI reply does not undo a provider effect. Track
which edits remain unsent after acknowledgement. Establish whether queued writes
are ordered, coalesced, dependent, independent or explicitly serialized. A newer
write must not overtake an unresolved predecessor under an ordered contract.
Recover retry limits and stop/checkpoint conditions instead of adding an unbounded
background loop. Use [unavailable backend handling](unavailable-backends.md) when
the real service or reconciliation path is inaccessible.

## Conflict and recovery retain the decision's inputs

Recover how the service detects divergence: revisions, conditional writes or
another supported rule. Equal visible content does not establish equal revision
or absence of other effects. Retain captured local intent, its base and observed
remote state. Distinguish the target's resolution from an explicitly proposed
merge, rebase, overwrite or discard choice; never silently impose last-write-wins.

For a rebase, specify the chosen content, new base, new operation/key rules and
what happens to edits made after the original capture. Revalidate at the actual
effect boundary: the remote may advance again while the user decides. For discard,
state whether it discards queued intent, live edits or both, and which already
committed effects remain. Cancelling tracking or dropping an unknown queue entry
does not prove cancellation or remote reversal. Preserve unresolved outcomes when
resuming and reassess stale contracts/results under [checkpoints](checkpoints.md).

## Freeze distinguishing checks

Reason literal intermediate draft/captured values, identities, revisions and
pending states before adapting a candidate. Record attempts, actual effects and
acknowledgements separately using supported reference evidence or a disclosed
proposed contract. Include ordinary offline acceptance → reconnect → confirmation
and known-no-effect retry controls. Select consequential contrasts: edits after
capture; lost acknowledgement after a separately recorded effect; unresolved
receipt absence; repeated reconnect/send; stale reply during newer work; account
switch; revision conflict, explicit resolution/discard and another remote change
during recovery. Include queue ordering and reopen only where the selected policy
actually implements them; leave untested boundaries visible.

Challenge plausible faults that pass ordinary controls before named value,
revision, attempt or effect assertions reject them. Propagate harness/load errors
instead of counting exceptions as detections. Disclose source exposure, author,
doubles and finite coverage. The repository-only `evals/offline-sync/README.md`
contains a dependency-free volatile single-slot policy and a controlled service
that can record a synthetic effect while withholding its acknowledgement.
Standalone installations omit that example. Its receipt retention and simulated
scope are teaching assumptions, not real network/authentication, backend
durability, distributed exactly-once effects, original parity or model evaluation.
