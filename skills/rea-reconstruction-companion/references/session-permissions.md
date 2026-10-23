# Account, session and permission changes

Use for the selected account/workspace switch, logout, expiry, re-authentication
or changed-access journey. Extend the existing [workflow rows](blueprint.md#consequential-workflow-states)
proportionally. Planning stays planning; recovering one boundary does not authorize
real accounts, permission probes or an authentication backend. Keep original
observations, proposed reconstruction policy and unresolved behavior separate.

## Recover identity, authority and transition timing

Bind evidence to target/version, account, tenant/workspace, resource, session
lifetime and relevant grant/version. The same resource label or account after
re-login need not be the same lifetime. Trace transition trigger → authoritative
identity/access observation → local invalidation → recovery → effects. Distinguish
explicit switch/logout, locally suspected expiry, service rejection and confirmed
revocation. A connection indicator, decoded token or hidden button does not prove
current authorization. Recover how quickly changes become known, including other
tabs/devices only where relevant and authorized; do not promise immediate global
revocation from one client event.

Identify the trusted component enforcing each read, write, export and object/tenant
boundary using [security guidance](reconstruction-security.md). Recheck permission
at the effect boundary; missing/unknown grants cannot silently become allowance.
Authentication recovery does not itself restore previous permissions. Separate
unauthenticated, forbidden, absent and unavailable outcomes where the evidence
supports that distinction, without disclosing protected resource existence in
feedback. A retry following re-authentication needs fresh applicability checks.

## Recover displayed data, retained work and pending operations

For each selected boundary, record what happens to displayed content, selection,
cache, history/back restoration, drafts, queued intent, in-flight work and feedback.
Key retained state by the actual owner/resource scope, not list position or label.
Clear or quarantine no-longer-authorized display/cache and prevent stale callbacks
from repopulating it. Guard success, errors, finalizers, notifications and stores
under [asynchronous applicability](asynchronous-results.md). A → B → A and expiry →
same-account re-login need new lifetime checks as well as identity equality.

Preserve useful edits according to the selected retention policy without displaying,
exporting or sending one owner's work as another owner. Define whether work is held
in memory, protected persistent storage, discarded by explicit choice, or requires
a recovery decision. Retention may itself be forbidden by a real policy: distinguish
local unsent edits from revoked service content and record that conflict rather
than universally promise retention. Logout must not be indefinitely vetoed by an
unsaved prompt. Use [departure/save rules](unsaved-navigation.md) where applicable;
do not promise an asynchronous save during forced expiry or browser close.

Recover same-owner recovery explicitly: verify the authenticated owner, current
resource/access and current remote revision, then offer an applicable restore,
merge, export or discard choice. Restoring a draft does not mark it saved or make
an old write safe to resend. Different identity must not inherit that choice.
Do not put drafts or authentication material in URLs, logs or shared evidence.
An in-memory owner map demonstrates neither encryption nor durable protection.

Keep captured payload/revision and operation ownership through session changes.
A dispatched write may still commit after local logout or permission feedback;
ignoring its response is not cancellation, revocation is not rollback, and timeout
is not known rejection. Retain a scoped pending/unknown outcome and reconcile via
an authoritative receipt/status/readback before consequential replay. A missing
receipt can race unfinished work. No automatic retry under another account or new
key; use [uncertain effects](asynchronous-results.md#reconcile-uncertain-effects-before-retrying)
and [offline intent](offline-sync.md) for the applicable recovery contract. A late
receipt may inform the original operation without certifying newer edits or the
new session's current display. Preserve unavailable service checks as pending
under [backend limits](unavailable-backends.md).

## Freeze distinguishing ordered checks

Freeze literal intermediate identity/lifetime/grants, displayed/cache data,
draft/revision, pending/captured intent, feedback and independently recorded effects
before adapting the candidate. Use observed evidence or label a separately reasoned
proposed contract. Include ordinary same-owner read/edit/save and known denial
controls, then selected contrasts: account versus workspace switch with identical
resource IDs; expiry/logout and same-owner re-login; downgrade/unknown grants and
regain; direct calls bypassing controls; stale success/error/cleanup; edits after
capture; and a write committed before response loss or revocation feedback.

Use controlled completions without sleep races; reset independent cases and keep
state inside each sequence. Challenge plausible faults that pass ordinary controls
before a named state/value/effect mismatch rejects them. Propagate harness failures;
exceptions are not useful mutation kills. Disclose authorship, source exposure,
finite coverage and untested service/platform/storage behavior. Reassess dependent
evidence when identity, grants or retention assumptions change.

The repository-only `evals/session-permissions/README.md` provides a dependency-free
volatile proposed policy with simulated identity/grants and controlled promises.
Standalone installations omit it. It proves no real authentication, authorization,
revocation, storage durability, original parity or model quality. The
[research basis](research-basis.md#r24-session-and-permission-boundaries) records
primary guidance and distinguishes it from these proposed recovery choices.
