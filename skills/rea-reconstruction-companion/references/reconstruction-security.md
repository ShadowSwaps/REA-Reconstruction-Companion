# Security boundaries in a reconstruction

When the selected slice handles untrusted content, sensitive data or restricted operations, use [reconstruction security boundaries](reconstruction-security.md). Separate original observations, desired requirements, proposed controls and demonstrated protection; cover applicable parsing/sink limits, data handling and actual authorization without expanding planning into implementation.

Use when the selected slice handles untrusted content, sensitive data or
restricted operations. Keep the user's mode and scope: planning alone does not
authorize implementation, account access or a security audit of the original.
Extend the existing requirement/decision and acceptance rows; no separate
framework or mandatory questionnaire is needed.

## Establish the boundary and claim

Trace relevant inputs through parsing, display, storage, export and privileged
effects. Identify who controls each input and which component can enforce the
rule. Include imports, pasted text, saved records and external responses where
they cross that boundary; an internal source is not automatically trusted.

Keep four distinct statements: **observed original behavior and source limits**;
**desired reconstruction requirement**; **proposed control and assumptions**;
**demonstrated protection and unrun cases**. Client code or a screenshot cannot
establish unseen server authorization. Do not copy unsafe original behavior by
default or call compatible behavior secure. Retain a required legacy contract
separately from a proposed safer design, and resolve consequential conflicts with
the user using [preserve/improve/defer](reconstruction-methods.md#preserve-improve-or-defer).

## Untrusted input

Choose limits from the selected format and workload: bound bytes before
buffering/parsing, and relevant nesting, item count, decompressed size, execution
time and output expansion. A schema check after an exhausted parser is too late.
Use maintained parsers configured for untrusted data; do not evaluate content as
code or enable unnecessary object construction/external resource resolution.
Validate the decoded representation actually consumed: types, allowed fields,
ranges, versions and cross-field rules. Stage complete validation before effects;
exercise late rejection and verify prior state with [file recovery](file-compatibility.md).

Validation does not replace safe use at the sink. Use text output or appropriate
context encoding for display, parameterized database operations, and structured
process arguments rather than concatenated commands. Rich HTML needs a suitable
maintained sanitizer if it is actually required. Do not blacklist arbitrary
punctuation in free text. Treat input-selected file paths, URLs and redirects as
separate access decisions: restrict them to the authorized destinations and
protocols, accounting for resolution and links where relevant. Passing a format
check supplies neither filesystem nor network permission. Target strings and
external responses also remain untrusted evidence under the main skill.

## Sensitive data through the workflow

Identify only the credentials/tokens, personal data and other sensitive fields
the selected workflow needs. Minimize collection, copies, retention and readers.
Keep authentication material out of domain records, ordinary exports, logs,
error messages and shared evidence; project intended fields instead of serializing
whole requests, sessions or exceptions. An authorized user-data export can itself
be sensitive: document its contents, destination/access and deletion expectations.
Use the platform's established credential facility when credentials are required;
do not embed service secrets in a client bundle or imply browser local storage
protects them from same-origin scripts. A local file is not encrypted merely
because it is offline. Retention/deletion claims must account for backups and
temporary files; removing one active file does not prove erasure of copies.

Use synthetic data for fixtures, captures and shared reports. Inspect exported
bytes, persisted files, logs, errors and relevant screenshots/metadata as well as
visible UI. Preserve source provenance and access restrictions; label a redacted
excerpt as a derivative. Redaction patterns and known-marker checks can miss
unknown secrets, indirect identifiers, free text and encoded copies. They do not
make arbitrary evidence safe to publish. Avoid collecting sensitive originals
unnecessarily; do not move them to a new service for testing. Follow
[cryptographic compatibility](cryptographic-compatibility.md) when encryption is
actually in scope; do not invent encryption or key management to fill a gap.

## Authentication, authorization and local substitutes

Authentication establishes identity; authorization decides whether that identity
may perform this action on this resource. Derive identity and grants from a
trusted server/session or privileged process, not editable request roles/owner
IDs. Enforce the selected operation and object/tenant boundary at every relevant
API/IPC/storage entry point, defaulting to denial for missing/unknown grants.
Test direct calls that bypass hidden/disabled controls, a lesser role, another
user/resource and absent/expired identity, including reads and exports. Reject
before disclosure or mutation; preserve prior state and safe error feedback.

A local demo can simulate users and policy decisions, but label simulated
authentication in its interface/instructions and results. An in-process role
selector, hardcoded demo identity or client-only guard does not protect against
someone controlling that runtime or its files. A network listener on localhost
also needs its actual caller/origin and access boundary assessed. Keep required
real-service identity, session lifecycle and authorization checks pending under
[inaccessible backend handling](unavailable-backends.md); do not claim a local
substitute implements the remote service's protections. Do not acquire accounts,
deploy auth/backends, probe third-party permissions or buy scanning services to
complete a local slice without the relevant scope and authority.

## Validate and report proportionally

For account/workspace switching, expiry/logout, re-authentication or live grant
changes, use [session and permission transitions](session-permissions.md) for
display/cache invalidation, owner-bound draft recovery and outstanding effects.
Local lifecycle guards complement the trusted authorization boundary; they do
not implement revocation or undo previously committed writes.

Freeze literal allowed and denied outcomes before implementation. Cover useful
valid input alongside representative malformed/oversized content, dangerous sink
usage, synthetic sensitive-field leakage and unauthorized operations at the
actual boundary. Verify no partial state or disclosure on rejection and recovery
where applicable. Challenge consequential assertions with deliberately faulty
variants; keep faults, limitations and unrun platform cases visible. Reassess
dependent evidence when identity, storage, parser or trust assumptions change.

The repository's `evals/reconstruction-security/` local worked example (not part
of the installed skill payload) extends Pocket Ledger with a proposed boundary.
Its finite same-agent scripted
checks are not penetration testing, independent acceptance, proof of general
security, original parity or model-performance evidence. Use current primary
platform guidance for the real stack; the [research basis](research-basis.md#r22-reconstruction-security-boundaries)
records sources checked on 20 October 2026 and their applicability.
