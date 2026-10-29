# Inaccessible backends and external services

For an unavailable backend or external service, use [inaccessible backend handling](unavailable-backends.md) to choose an authorized local substitute, supplied finite replay or deferred integration. Preserve hard real-service requirements and keep local/replayed success distinct from remote verification.

Use this when the selected workflow depends on an unavailable service. Retain the
user's mode, scope, hard requirements and useful first-slice decisions. A failed
connection or inaccessible account establishes an access limitation, not absent
functionality. A product name supplies neither credentials nor authorization.

## Separate evidence from replacement design

State what the actual evidence supports: visible client controls/state, recovered
request construction, or named request/response captures with version, initial
state and coverage. A client displaying “done” is an observed display; it does not
prove a remote commit. Client code may show intended calls without establishing
that they succeeded. Authorization, storage, business rules, queueing, duplicate
handling and transactional guarantees remain unknown unless separately supported.
A timeout can be consistent with a write committed before its response was lost.

Keep three things distinct in the existing requirement/decision row: observed
reference contract and source limits; proposed reconstruction behavior and its
reason; unresolved expectations and their next evidence/revisit trigger. Do not
fill server gaps with a plausible architecture and label it recovered fact.

## Select a useful authorized path

| Path | Appropriate result and limit |
| --- | --- |
| Local substitute | Independently specify the behavior needed for the authorized local goal. Label the substitute in its interface/status and result. Test that proposed contract; this is not the unavailable reference or remote compatibility. |
| Supplied finite replay | Use selected sanitized recordings with known request/state/version context and explicit matching rules. Reject a missing/mismatching interaction instead of fabricating success or silently falling back. Passing covers those captures only, not unseen provider behavior or current live end-to-end integration. |
| Deferred integration | Keep required service behavior pending/blocked, name the missing evidence/access and concrete revisit trigger. Continue independent useful work within the chosen scope; if no requested useful result is possible, explain that boundary. |

These paths can coexist: local editing may work while actual sharing remains
pending. Do not silently substitute away an explicit requirement for the real
service, its authorization model or exact compatibility. Ask one focused question
if choosing a substitute would consequentially change success; otherwise use
existing build authorization for routine local choices. Understanding/future
planning stays specification-only. Do not obtain accounts, bypass login, provision
cloud resources or contact a provider simply to make the example complete. Follow
the skill's no-additional-charges and host authorization constraints.

## Keep the boundary small and replaceable

Apply [security boundaries](reconstruction-security.md) to any substitute that
simulates identity or access. Label simulated authentication; hidden controls and
editable local roles cannot establish real-service authorization. Preserve
required real identity/session/access checks as pending.

Define only what the selected slice needs: inputs/outputs/types, missing/null and
empty behavior, error semantics, relevant auth/identity assumptions, state ownership,
persistence/effects, time/retry/order rules and dependency ownership. Distinguish
observed guarantees from proposed choices and unknowns. Use one replaceable adapter
where useful; no generic provider SDK or framework is required. Replacing an adapter
later does not establish remote correctness.

Make state labels describe actual effects: empty success differs from unavailable;
locally saved differs from remotely synchronized; replayed success differs from
provider verification. Retain drafts/prior data on rejected operations as required
by the proposed contract, and expose pending/unknown remote outcomes. Bound retries
and waits; do not retry an ambiguous remote write on assumed idempotency. No hidden
remote fallback. A local happy path alone cannot complete a required real-service
journey.

For delayed/overlapping completions, use [asynchronous results](asynchronous-results.md)
to trace operation/context/owner and guard success, error and finalization at the
relevant boundary. Dismissal, ignoring stale state and client abort do not prove
provider cancellation. Retain unknown effects and establish applicable
reconciliation/key retention before deciding a write can be repeated.

## Validate and resume honestly

Freeze expectations before implementation, using supplied observations when
available or an explicitly proposed independent specification. Exercise useful
local success, unavailable versus empty, malformed/mismatching responses and
consequential persistence/pending/error recovery through the actual runner. Label
synthetic faults, source exposure and same-agent review. Where a structured contract
exists, challenge misleading completion fields and changed observations through
the same checker; do not infer a general prose truth classifier from that test.

See [executable interface contracts](validation-methods.md#executable-interface-contracts)
for later authorized provider checks. Report local contract, finite replay and
live-provider/end-to-end verification separately. On resume, retain the chosen
path and historical limits; reassess dependent checks when provider identity,
recordings, auth assumptions or requirements change. A newly available provider
is a reason to revisit pending integration, not permission for remote mutations.
