# Proposed completion policy in existing records

No original application or service was supplied. These are proposed requirements
and same-author local observations after execution, not recovered internals.

| Existing record extension | Requirement and policy | Selected acceptance |
| --- | --- | --- |
| F-preview / R-preview | A read belongs to its operation, triggering input and owner instance. Latest applicable request owns the view. | Newer success/error survives old success; same input after owner replacement cannot reaccept the old value. |
| F-cancel / R-guard | Guard success, failure and finalization separately. Retain historical operation outcomes. | Old failure cannot replace current status/error; old finalizer cannot stop current loading. |
| F-cancel / R-guard | Dismissal invalidates the view but leaves work pending. Abort signals a request; only explicit double acknowledgement establishes worker cancellation. | Dismissed completion records outcome without updating view. Abort-requested state differs from confirmed cancelled; successful work can still finish after abort but is ignored. |
| F-save / R-retry | A lost response leaves an effect unknown. One writer retains exact key/payload; pending/unknown/completed work is not blindly retried. | Commit-before-response-loss changes actual store once; retry is blocked, applicable lookup recovers receipt. Reconciliation unavailable leaves unknown; settled no-effect lookup permits bounded explicit retry. |
| U-concurrency / U-backend | Double is one process/instance, one pending effect attempt, receipts retained only until disposal; cancellation is injected read-worker acknowledgement. | Local callback paths only. Pending lookup is unknown, retained key rejects different payload, repeated key returns same receipt; fresh key or fresh instance has no cross-key/instance guarantee. Real network/concurrent/crash semantics remain unverified. |

The superseded read's state can be `completed`/`failed` while its value is
inapplicable. UI loading can stop on abort request while operation remains
pending. A write's transport failure is `unknown`, distinct from the double's
explicit `not-applied` rejection. These dimensions cannot be inferred from one
screen label. Receipt lookup must bind the exact intent; unknown lookup is not
absence. The candidate deliberately exposes no replacement write over an
unresolved intent. A real requirement for durable pending operations needs
separate storage and recovery evidence.

Changing owner identity, guard policy, worker acknowledgement, effect failure
location, provider/key retention or reconciliation consistency invalidates
dependent acceptance until reassessed. Existing codec/workflow reference bytes
remain historical under their own scope. See the standalone
[method](../../skills/rea-reconstruction-companion/references/asynchronous-results.md).
