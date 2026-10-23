# Bounded session and permission example

Run with existing Node.js 20+, no dependencies, accounts or services:

```sh
node evals/session-permissions/check.mjs
node --test tests/session-permissions.test.mjs
```

This same-author, source-exposed **proposed policy** contains 23 sequences and
140 complete literal state/effect checkpoints. The initial expectations were
reasoned and hash-bound before the candidate; four denied/expired outcome displays
were corrected during author review to hide retained payloads. `identity.json`
retains both hashes and that amendment. No transition simulator or candidate output
generated expectations. Sixteen disposable faults first pass 15 ordinary checkpoints
and then fail named state/value comparisons. Extra checks cover workspace isolation,
fresh-read conflict, direct denied calls, duplicate send, snapshot ownership and
independent effect comparison. This is neither held-out testing nor independent review.

The finite single-document profile uses synthetic `account/workspace` scope strings;
every scope refers to the same document label. `context` replaces the entire
simulated session: omitted scope is `a/x`, omitted active/read/write are `true`.
It is an explicit test event, not a partial grant-update API, real login, token,
clock-based expiry detector or trusted identity source. The model checks active
and explicit true read/write grants at its local dispatch boundary. No permission
is inferred from a disabled control, missing grant or restored draft.

Every context event creates a new local lifetime, clears visible content/cache,
editor and loading/saving feedback, and marks outstanding old-scope writes unknown.
Retained drafts/outcomes are volatile and scoped; outcomes are hidden when inactive
or lacking read access. Switching back does not redisplay a draft or send anything.
A fresh permitted read creates a clean editor; explicit same-scope `restore`
can recover retained edits, including their old base. Restore cannot replace a dirty
editor. A differing fresh remote text versus the retained saved base blocks save
as `conflict`; there is no merge/overwrite operation. This text comparison is only
a fixture check, not remote revision/concurrency control. Real retention and revoked
content rules must be recovered separately; an owner map supplies no protection
against someone controlling this runtime.

Only one fresh read per context is supported after successful load; refreshing an
editor is blocked to avoid overwriting work. A failed read can be explicitly retried.
Edits require write access; restore may expose same-owner retained edits with read
access only, while save remains blocked. No automatic read, save, restore, retry,
reconciliation, export or account transition is triggered by a completion.

Reads and writes return real promises released explicitly by the double. Lifetimes
and scope guard value/error/cleanup acceptance, including same-owner re-login.
The separately recorded dispatch calls capture scope and write payload. The service
double has independent synthetic grants checked at `commit`, records an effect
before acknowledgement, and can lose that acknowledgement. Its default allowance
and manual grant updates are teaching assumptions, not real service security.
Client revocation can therefore coexist with a later effect; service denial can
instead prevent that effect. No ignored callback is described as cancellation.

A write captures text/revision and remains an owner-bound ledger entry. Unknown
or pending writes block further sends even after re-login; this example has no
receipt lookup/replay mechanism, so unresolved response loss stops there. Known
denial has no recorded effect and permits a later explicit attempt if current
grants allow it. A late receipt updates the original ledger but cannot update
another lifetime's display. A current success certifies only its captured revision;
newer edits remain unsaved with `older-save` feedback. It does not refresh a real
remote snapshot or implement distributed ordering/exactly-once guarantees.

Snapshots and adapter records are copied. Malformed success payloads, unknown
operations and harness/adapter exceptions propagate as failures; they are not
fault detections. Maps retain finite-run operations/drafts for teaching and have
no production eviction or storage implementation. The example tests no real
authentication, authorization, expiry timing, revocation propagation, token/cookie
handling, browser tabs/history, secure storage, durability, concurrent writer,
original behavior or model quality. Standalone skill installations omit this
repository-only example; use the [portable reference](../../skills/rea-reconstruction-companion/references/session-permissions.md)
to recover the actual target contract.
