# Finite offline form-validation example

This proposed order-form policy demonstrates values, validation timing,
dependencies and submission recovery. It is repository-only; standalone skill
installations contain the linked guidance, not these fixtures. Use existing
Node.js 20+ with no packages, installation, services, model calls or networking:

```sh
node --test tests/form-validation.test.mjs
```

`expectations.json` holds 69 full literal intermediate checkpoints across 13
scenarios and three families. `identity.json` binds its bytes. The same author
reasoned and froze these proposed expectations before writing `candidate.mjs`;
there was source exposure and no independent original target or oracle author.
`check.mjs` compares all returned state plus the submission double's separately
recorded calls and effects. It does not derive expectations from the candidate.

## Selected policy

| Field or boundary | Proposed behavior |
| --- | --- |
| Draft | Raw strings retained. Title trims for validation/submission, required with at most 20 UTF-16 code units. Low/high accept exactly one ASCII digit 1–9, high >= low; cross-field message belongs to high. |
| Timing | Edit re-evaluates affected rules; local errors display for touched fields or after any submission attempt. Blur marks a field touched. Submit validates all applicable fields even if untouched. Error visibility is separate from validity. |
| Hidden address | Delivery requires a trimmed nonempty address. Pickup hides it, retains raw value, clears its visible error/touched state and omits it from payload. Reactivation restores the value and current rules. |
| Disabled code | Coupon enables code, required as two letters after trim/uppercase. Disabling clears raw code, error and touched state, and omits it. Re-enabling starts empty. This deliberately differs from hidden address. |
| Invalid submission | No submission call or recorded effect. Correctable draft and relevant messages remain. |
| Submission | Captures canonical payload/revision and one operation ID; duplicates while pending are ignored. Editing stays possible. The double releases actual callbacks in chosen order. |
| Known failure | No double effect. Retain draft and last accepted payload; show useful form/field error for the captured revision. Editing a rejected field (or its controller) clears its server error; unrelated edits retain it. Form message remains until a valid resubmission. |
| Success | Double records the captured payload as an in-memory effect. Accepted payload remains separate from live draft. If revision changed during submission, outcome is explicitly for an older draft; stale rejection cannot attach current field/form errors. |

Ordinary controls cover blur/valid submit/accept and known reject/resubmit/accept
(seven checkpoints). Each of 18 disposable source faults first passes all seven,
then a named intermediate assertion rejects it. Faults cover premature/missing
errors, invalid-effect calls, malformed input, cross-field edits, hidden/disabled
policies, normalization, server-error clearing, duplicate calls, accepted payload
identity, stale feedback and failure after success. Errors from module loading,
fixtures or adapters propagate; they are not counted as detections. Separate
checks challenge detached snapshots, invalid fixture actions and comparator
coverage. Only owned temporary mutant files are created and cleaned up.

## Limits

This is an in-memory state model and recording submission double. Accepted
effects are double observations, not storage, backend authorization, durability,
real delivery or payment. Failure results are explicit known no-effect responses;
timeouts, response loss, uncertain writes and cancellation are not simulated.
There is one owner and at most one candidate submission in flight. The double
permits extra calls so faults fail actual attempt assertions, not a fake service
exception. It supports only the three declared results.

No browser/DOM, native validation/events, visual layout, keyboard/focus,
screen-reader announcement, real serialization, asynchronous field validator,
multi-owner lifecycle, arbitrary dependency graph, locale parser or form
framework is implemented or verified. Additional grammar, direct service calls,
authorization and real backend rejection remain target-specific work.
Finite same-author tests do not establish original parity, general security or
model performance. The [installed guidance](../../skills/rea-reconstruction-companion/references/form-validation.md)
explains how to recover an actual target's policy and integrate existing
asynchronous, accessibility and security boundaries without imposing this one.
