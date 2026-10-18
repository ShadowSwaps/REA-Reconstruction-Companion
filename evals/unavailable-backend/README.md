# Worked unavailable backend boundary

This is a **synthetic, source-exposed, same-agent proposed design**. No original
app/backend was inspected; no real recording, account, service, REA runtime or model
evaluation was used. [CONTRACT.md](CONTRACT.md) and [reviewer literals](../backend-oracles.mjs)
preceded the [candidate](candidate.mjs). They are independently reasoned expectations,
not independent investigators or hidden benchmark data.

Run with existing Node.js 20+, from the repository root:

```sh
node evals/check.mjs backend-local evals/unavailable-backend/candidate.mjs
node --test tests/unavailable-backend.test.mjs
```

The existing worker runs the reviewed candidate against 23 literal scenarios.
Each invocation owns a temporary local note file and removes it afterward. Save
then reopen reads actual file bytes within that invocation; it is not a user data
store or proof of crash/concurrent-writer safety. The local adapter reads saved
state, replay consumes only exact supplied synthetic requests/responses, and the
deferred adapter returns unavailable. No mode writes remotely, retries or falls
back to a provider. A supplied timeout is a synthetic outcome, not a clock/network
experiment. Controlled failed save occurs before writing, not during a crash or
real permission/quota denial. Unexpected filesystem failures throw and fail the
run; the example makes no recovery guarantee for them.

Acceptance covers useful save/reopen, exact and empty text, empty-success versus
unavailable, malformed stores/responses, request mismatch/exhaustion, retained
draft/prior bytes on a rejected save, and explicit pending synchronization even
after replay success. `items:null` means no successful list yet; stale prior items
can remain visible alongside an explicit error. `remoteVerified:false` is required
for every observation. The replay is finite proposed data, not recordings of an
inaccessible reference.

Six deliberate output mutations run through **the same process checker**. Named
`value-mismatch` results must reject false remote verification, synchronized or
remote-complete status, changed replay observations, unavailable-as-empty and lost
drafts. They test a structured contract, not natural-language truth or arbitrary
instruction following. Checker's human review remains pending; see its
[report limits](../README.md#read-the-checker-report). Review candidate code before
execution; the worker is not a sandbox.

## Manual path decisions (reasoned, not executable model trials)

| Request/evidence | Expected decision and limitation |
| --- | --- |
| “Explain how sharing might work; build nothing.” Client has a request builder only. | Specification mode; distinguish intended request from observed success and unknown authorization/persistence. |
| “Make local editing work now; sharing can wait.” | Authorized local slice with labeled substitute and pending sharing; no routine plan-approval gate. |
| “Rebuild sharing exactly with this real provider.” Provider inaccessible. | Keep exact integration blocked; clarify only if a local substitute would change success. Do not report local editing as completion. |
| Supplied sanitized response captures from one version/account state. | Finite matched replay with explicit context and gaps; no live/current or broad auth claim. |
| A named target shows a login screen; no credentials supplied. | Record unavailable access, infer no credentials or bypass authority, continue supported local evidence work. |
| Connection fails. | Unavailable does not mean successful empty data or absent feature. |
| Client times out after a write. | Commit outcome unknown; do not infer rollback or retry safety. Proposed retry policy is a design decision. |
| Provider version, recordings or priorities change on resume. | Retain history and mode/scope; reassess affected contracts and pending integration/revisit trigger. New access alone grants no mutation authority. |

The manual rows assess the companion guidance against frozen task constraints;
they are not agent performance results. Local/replay checks cannot establish
provider compatibility, remote persistence, production end-to-end success,
whole-app parity, live-host loading or model independence in practice. Later real
integration requires the actual authorized provider/version, relevant auth/state
and side-effect checks, without silently relaxing hard user requirements.
