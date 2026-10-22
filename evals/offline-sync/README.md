# Bounded offline/reconnect policy example

Run with existing Node.js 20+; no dependencies, sockets, account, credentials,
user data, real connectivity changes, model calls or external service:

```sh
node evals/offline-sync/check.mjs
node --test tests/offline-sync.test.mjs
```

This is a same-author, source-exposed teaching contract, not recovered target
behavior or an independent model/REA trial. `expectations.json` freezes 91 complete
literal checkpoints in ten sequences across state/ownership, reconnect/retry and
conflict/recovery. The separately reasoned states were frozen and hash-bound in
`identity.json` before writing `candidate.mjs`; no candidate output generated the
oracle. Twelve ordinary checkpoints establish sequential success and a known
no-effect retry. Tests challenge plausible faults after those controls pass.

`candidate.mjs` edits one synthetic Alice/note document, with one outstanding
intent slot. `accept` captures value, edit number, base revision and operation ID
into volatile memory. It performs no save: draft, slot and counters disappear
when the process ends. Further edits remain live, while another accept is blocked
until the pending operation resolves. This is explicit serialization, not a
multi-item persistent queue. Reconnect changes an indicator only; send is explicit.
Known no-effect failures retain the exact intent for a new numbered attempt.
Unknown results block send and discard until receipt reconciliation succeeds;
absent receipts remain unknown, without an automatic retry. Repeated reconciliation
after confirmation does nothing. New acceptance uses the confirmed base revision.

`double.mjs` owns the observable attempts, synthetic effects, server revision,
lookups and replies independently of editor snapshots. The harness releases
completions explicitly without timers. `lost-ack` applies the synthetic write and
records a receipt/effect, then returns an unknown outcome with no acknowledgement
record. `unknown-before` withholds a definitive outcome without applying a write;
its empty lookup deliberately supplies no safe-replay proof. `no-effect` explicitly
guarantees no write in this double. A service completion can still apply after the
active owner changes; the editor keeps that intent unknown until the original
owner returns and reconciles. Owner selection is simulated scope, not real auth.

The double enforces conditional base revision and retains successful receipts
for its entire lifetime, binding owner/document/key to the complete operation.
Repeated identical keys can recover that receipt without another effect; changed
bindings throw a fixture error. Those are explicit double assumptions, not
guarantees obtained from the ID alone. Receipts confirm the operation's historical
revision; they do not prove no subsequent writer exists. The tests also inspect
the separate current server state.

A conflict retains captured intent and current draft separately. Explicit rebase
keeps the captured value/edit, allocates a new operation ID and uses the observed
remote revision; it may conflict again if the server advances. Explicit discard
removes queued/conflicted intent, adopts observed remote state as the baseline
when available, and retains the live draft. It cannot retract a committed effect.
An older reply cannot clear a newer intent. Unexpected harness, service and import
errors propagate; they are not successful fault detections.

No persistence/restart, real retry backoff, parallel queue, merge algorithm,
production synchronization engine, expiry, real transport/backend cancellation,
authentication, distributed atomicity/exactly-once behavior or original-app parity
is established. These finite checks do not measure instruction following or
cross-host/model quality. Use the [portable guidance](../../skills/rea-reconstruction-companion/references/offline-sync.md)
to recover the selected target's policy and its unverified boundaries.
