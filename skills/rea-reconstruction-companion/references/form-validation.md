# Form validation and dependent fields

For forms with dependent inputs, changing validation messages or correction/resubmission, use [form contracts](form-validation.md) to recover edit/blur/submit timing, draft versus canonical values, applicable rules, hidden/disabled retention and payload policy. Verify invalid submission has no effects and keep accepted payload/outcome distinct from newer edits; preserve unresolved target rules and intentional design choices separately.

Use for a selected journey such as “the address becomes mandatory when I choose
shipping”, “fix the dates and try again” or “explain why this field keeps its
error”. Infer relevance from the request and context, including negation and
planning-only intent; these examples are not trigger phrases. Scale to the
consequential fields and submission, not a general form framework. Extend the
existing [workflow rows](blueprint.md#consequential-workflow-states).

## Recover values, rules and timing

Bind evidence to target/version, starting record, controlling values and action
sequence. Separate observed original behavior, unresolved rules, desired
requirements and intentional reconstruction choices. Static handlers, visible
errors and actual submitted payload/effects answer different questions.

For each relevant field, distinguish raw draft text, parsed/normalized value,
validation result, visible error and captured submitted value. Recover when
trimming, parsing, case conversion or rounding happens and whether it changes
the draft. A valid-looking display does not establish a valid canonical payload;
use [numeric](numeric-contracts.md) or [date/locale](date-locale.md) contracts
where value meaning matters.

Identify required, format/range and cross-field rules with their applicability
and error destination. Recover edit, blur and submit timing separately: which
rules run, when errors first appear, and when obsolete messages clear. Touched,
dirty, submitted and valid need not mean the same thing. Changing one field can
invalidate or repair another; re-evaluate affected rules and visible feedback
without accidentally discarding unrelated errors. Do not infer “validate only on
blur” merely because an untouched field has no visible message.

## Recover dependencies and inactive values

Trace controlling edit → applicability → value/error change → payload. For each
hidden, disabled or read-only dependent field, establish separately whether its
value is retained, cleared, reset, validated and included on submission. Hiding a
control alone does not prove omission; a disabled control's native browser form
behavior does not establish what custom serialization sends. Read-only and
disabled controls are distinct. Recover what reactivation restores, whether a
newly applicable field becomes required, and whether obsolete errors/touched
state survive toggling. Do not impose a universal clear-or-retain policy.

Check consequential chains and controlling-field changes against the current
draft, not a cached validity flag. Keep optional empty values distinct from
malformed nonempty ones and false/zero from absence. A field can be irrelevant
without its stored value being lost. Use [preferences](settings-preferences.md)
when effective/applied/persisted settings add a separate boundary.

## Submission and recovery

Trace submit entry point → complete applicable validation → captured canonical
payload → effect boundary → outcome → feedback. For rejected invalid submission,
verify no submission call or domain/storage effect; an error label or disabled
button alone is insufficient. Security authorization and backend validation
remain separate from UI checks: enforce rules at the actual trusted boundary
under [security guidance](reconstruction-security.md). A local form double does
not demonstrate backend protection.

Keep the live draft, in-flight payload, accepted payload and last attempt's
outcome distinct. A known rejection should preserve correctable input and useful
field/form messages under the recovered or explicitly proposed policy. Check
failure after an earlier success, correction and resubmission, obsolete-error
clearing, and duplicate activation where consequential. Do not call a newer
draft accepted because an older captured payload succeeded. For asynchronous
validation or submission, apply [result applicability](asynchronous-results.md)
to values, errors, status and cleanup; bind field results to their input and
dependencies as well as operation/owner identity. An uncertain remote write
needs reconciliation before retry, not an assumed no-effect failure. Use
[unsaved navigation](unsaved-navigation.md) only when departure is in scope.

Describe errors in text with a useful correction, associate them with fields and
choose a useful focus destination using [interface accessibility](interface-accessibility.md).
Recheck focus when dependencies hide/disable the current control. Model-level
checks alone cannot verify browser events, native constraint validation, focus,
screen-reader announcements or platform serialization.

## Freeze distinguishing checks

Freeze literal intermediate draft, applicability, visible errors, captured and
accepted payloads, outcomes and independently observed attempts/effects before
candidate adaptation. Derive expectations from authorized target evidence or a
separately reasoned proposed contract, preserving provenance. Start with ordinary
valid edit/blur/submit and known-failure/retry controls. Select contrasts by
consequence: untouched versus touched, required versus malformed, controlling
changes, cross-field repair, hidden/disabled retention and omission, invalid
submit, failure after success, edits during submission and stale completion.
Reset independent cases and retain state inside a sequence.

Challenge plausible faults that first pass declared ordinary controls, then fail
a named actual state/payload/effect assertion. Propagate load, adapter and harness
errors; exceptions are not mutation detections. Report same-author/source
exposure, doubles, finite coverage and unavailable target/platform evidence.
Preserve historical expectations and reassess affected evidence when rules,
normalization, dependencies or submission policy changes.

The repository-only `evals/form-validation/README.md` supplies one dependency-free
offline policy example. Standalone installations omit it. Its hidden-retain and
disabled-clear choices are teaching policy, not recovered target semantics or
a universal implementation requirement.
