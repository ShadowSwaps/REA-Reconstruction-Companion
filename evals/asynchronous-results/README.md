# Controlled asynchronous completions

From the repository root with existing Node.js 20+ (no dependencies):

```sh
node evals/asynchronous-results/check.mjs
node --test tests/asynchronous-results.test.mjs
```

The [contract](CONTRACT.md) extends the existing finding/requirement/acceptance
records. [Expectations](expectations.json) are separately authored literal
intermediate states, [frozen](identity.json) before candidate implementation and
first execution. The [candidate](candidate.mjs) handles actual Promise success,
rejection and finalization callbacks. The [controlled doubles](controlled.mjs)
release individual completions explicitly; there are no sleeps or network calls.
Each scenario starts with fresh state and a new in-memory effect store. No real
user data, installed copy, account, provider, scheduler or host setting is changed.

The reader's `view` tuple is `[owner, visible, input, value, error, status,
loading]`. Operation strings capture `id:owner:input:state:abortRequested` for
these synthetic delimiter-free values. They retain the old outcome without
applying it to the current view. Write intent tuples are `[key, payload, state,
receipt]`; effect values and send-attempt counts are compared independently.

Ordinary read success/error and write success/rejection/retry precede selected
old/new result orders, stale rejection/finalizer, same-input owner replacement,
dismissal, abort with ignored success, explicit worker cancellation, lost response
after commit, lost response before apply and unavailable reconciliation. Seven
deliberate faulty candidates pass every ordinary comparison before a specific
boundary value/state assertion rejects them. Load/runtime failures propagate;
they are not useful mutation kills. This is finite chosen ordering coverage,
not exhaustive event interleavings, code coverage or a general mutation score.

Cancellation acknowledgement is explicitly injected by a read-worker double;
it is not inferred from `signal.aborted`. Dismissal leaves the operation running.
The effect double retains key/payload receipts for one instance's lifetime,
serializes one in-flight attempt and returns `not-applied` only after it has
settled without an effect. That deliberately stronger local lookup contract does
not describe a real server's eventually consistent status lookup. Fresh keys
can duplicate effects; another instance has no receipts. No crash persistence,
eviction/expiry, concurrent writers, distributed exactly-once effects, real
network/fetch/server cancellation, browser UI or original-app parity is tested.

All source, literals and tests are exposed and same-author. Frozen hashes detect
drift, not truth or independent authorship. These checks exercise a proposed
local policy, not model instruction following. Keep historical workflow/codec
oracles unchanged; their synchronous results do not become asynchronous evidence.
