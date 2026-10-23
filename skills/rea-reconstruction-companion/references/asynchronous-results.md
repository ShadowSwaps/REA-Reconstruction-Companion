# Asynchronous results and uncertain effects

Use this for a selected workflow whose work can finish after inputs, selection,
owner or connection state changes. Extend the existing
[workflow finding/requirement/acceptance rows](blueprint.md#consequential-workflow-states);
do not require a separate asynchronous framework or whole-app investigation.

## Establish applicability at the effect boundary

For each consequential operation, trace identity, triggering input/context,
owner/lifecycle, pending/completed/failed/cancelled/unknown outcome and the
component able to accept its result. Separate static handlers, actual completion
traces, causal hypotheses, desired policy and proposed controls. A late result is
not inherently wrong: decide whether it still applies to the selected state.
An unchanged input string alone cannot distinguish two operations or a replaced
owner. A latest-request policy suits some reads; ordered writes, merges and
background jobs can require different contracts.

Check acceptance before every consequential effect: values, errors, status,
loading cleanup/finalizers, notifications, cache/store changes and navigation.
For route changes and Back/Forward, use [navigation ownership](navigation-history.md)
to distinguish a destination URL from an entry or a new lifetime at that same URL.
An old failure or `finally` can damage newer state even when successful values
are guarded. State who owns the guard and when it is checked; checking only at
dispatch, disabling a button or using a request token in the UI cannot enforce
server writes. Preserve old outcomes as evidence without presenting them as
current UI state. Identify persistence or authorization boundaries separately.

## Cancellation has a scope

For identity, session or grant changes, use [session and access transitions](session-permissions.md)
to bind applicability to account/workspace/resource and a fresh lifetime, hide
inaccessible retained state and recover drafts under the verified owner. Account
equality after re-login alone cannot accept an earlier session's callback.

Distinguish dismissing a view, invalidating/ignoring its result, requesting an
abort and confirming cancellation at the relevant worker/service. Record which
occurred, what can still complete, and whether side effects are known. Closing
a view need not stop work. An abort signal is a notification to participating
APIs, not a universal rollback or proof that a backend never applied a request.
Define what a cancellation acknowledgement actually guarantees, including work
that finished before it. Keep an uncertain write outcome unknown even if its
client promise rejects with an abort error. See
[Node AbortController](https://nodejs.org/download/release/v24.21.0/docs/api/globals.html#class-abortcontroller)
and the [Fetch abort algorithm](https://fetch.spec.whatwg.org/#abort-fetch).

## Reconcile uncertain effects before retrying

A timeout, disconnect or lost response can follow a committed effect. Preserve
operation identity, exact intended payload, evidence and pending/unknown state.
Do not silently convert that uncertainty into failure, absence or success. A
read retry and an effectful retry need their own applicable contracts; even a
repeatable read can return a different snapshot or affect rate limits.

For a consequential write, identify authoritative reconciliation (operation
receipt/status or applicable readback) and evidence for any safe replay rule.
An empty lookup may be stale or race an operation still in flight: it does not
necessarily establish that the original cannot later commit. If relying on
idempotency, establish key/payload binding, enforcing owner, retention window,
scope, concurrent-duplicate behavior and recovery assumptions. A fresh key can
create a second effect; a client token alone prevents neither duplicate writes
nor partial application. Bound retries and stop with the unresolved effect and
next evidence requirement when reconciliation is missing or ambiguous. HTTP
[RFC 9110 section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
describes the conditions for retrying non-idempotent requests; it does not supply
a target's application contract. Apply
[unavailable backend handling](unavailable-backends.md) without inventing server
semantics or contacting a provider outside the user's authority.

## Select distinguishing ordered checks

Freeze initial state and literal intermediate expectations from supported
reference evidence or a separately reasoned proposed contract. Include ordinary
sequential success/error, then selected order changes: old success after newer
success, old error/finalizer while newer work is pending, replacement with the
same input but different owner, dismissal/abort followed by completion, confirmed
cancellation, and effect committed before response loss where consequential.
Observe actual callbacks/promises and relevant data effects; comparing authored
decision labels alone cannot establish handling.

Use an explicit controlled scheduler to release selected completions without
sleep-dependent races. First show ordinary workflows pass plausible faulty
variants, then reject them through the intended value/state/effect assertion.
Label scheduler, adapters, failures and cancellation acknowledgements as doubles;
these checks establish the tested local policy, not real network timing, actual
backend cancellation, distributed exactly-once effects or original-app parity.
Keep finite coverage, source exposure and untested orders visible. Preserve
historical oracles and reassess dependent results when identity, lifecycle,
failure location or provider guarantees change. The separate repository-only
example is `evals/asynchronous-results/README.md`; standalone installations omit it.
