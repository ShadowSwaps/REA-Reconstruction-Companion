# Keyboard shortcuts and command context

Use for a selected shortcut, keyboard-operated journey or competing command
scope. Infer relevance from the whole request, including negation and planning
intent; example key names are not required user wording. Extend the existing
[workflow rows](blueprint.md#consequential-workflow-states), without introducing
an app-wide hotkey framework. A request to specify behavior remains a plan.

## Separate input, routing and effects

Bind evidence to target/version, platform, keyboard layout/configuration, active
window/document, focus, dialog/scope, selection and ordered inputs. Keep original
observations, inspected handlers, unknowns and intentional reconstruction choices
separate. A shortcut label or static listener does not establish that the runtime
receives the input or which command actually runs.

Recover the selected policy at these boundaries:

| Boundary | Consequential distinction |
| --- | --- |
| Input target | Editable text, contenteditable/custom editor, read-only field, composite control or background surface. Which layer owns text entry, native editing and activation? Focus and selection can differ. |
| Composition and modifiers | Composition/dead keys, text production and modifier combinations including AltGraph. Do not steal a composition-confirm/cancel key or infer a command from a text-producing event. Recover target/platform handling rather than adding a universal IME workaround. |
| Key identity | Logical `key` reflects the key meaning; physical `code` identifies position. Choose deliberately from target evidence and user requirements. Layout-dependent labels and remapping matter; a physical position is not proof of the produced character. |
| Scope and applicability | Focused control, active dialog, document/app command, disabled/pending state and overlapping bindings. Recover precedence and whether an inapplicable command blocks fall-through or leaves another scope eligible. |
| Consumption | Already handled events, default action, propagation and downstream listeners. Specify who claims the input, when default behavior is suppressed and whether propagation continues. Preventing a default and stopping propagation are distinct; neither alone proves no second handler ran. |
| Effect | Routed command, captured payload/context, current applicability and independently observed consequence. A visible disabled style or a routing decision is not enforcement. |

Do not universally equate Ctrl and Meta, strip extra modifiers or map all input
by physical code. Consult the actual native/web platform and selected target's
configuration; browser, OS, assistive-technology and user-reserved bindings can
conflict or never reach the app. Preserve ordinary text editing and native control
behavior unless an explicit supported policy requires an override. Shortcut
metadata and ARIA do not implement behavior. Use [interface accessibility](interface-accessibility.md)
for focus traversal, activation, discoverability and actual assistive feedback.

## Resolve one input to the applicable command

Trace input → focused handler/scope → chosen command → guard → effect → feedback.
Record competing handlers and the precedence/default/fall-through decision, not
merely the last visible result. A dialog's Enter/Escape behavior must not also
trigger a background submit/delete. Avoid handling both a key event and the
native button click it generates as separate effects; recover which layer owns
activation. Event identity/claiming, listener lifetime and cleanup may matter.

Compare the equivalent explicit menu/button command where offered: it should
use the applicable domain guard and data policy, even if its input mechanics
differ. Do not allow a shortcut or programmatic command path to bypass disabled,
selection, confirmation or authorization rules. Verify the actual effect boundary;
a UI guard is not trusted backend authorization. Reuse [form submission](form-validation.md),
[clipboard effects](clipboard.md) and [undo/destructive consequences](undo-destructive.md)
for their existing payload, history and recovery contracts instead of copying
those systems into the shortcut layer.

## Repetition, transitions and cancellation

Distinguish intentional repeatable navigation from one-shot submission,
confirmation or destructive commands. Recover keydown/keyup, repeat flags,
held-key/latch policy, lost keyup on blur and lifecycle cleanup. A repeat flag
alone may not capture the selected target's one-shot policy. Releasing a key,
changing focus or opening a dialog can change the next input's applicability;
do not accidentally turn the same held key into a new destructive command.

Capture the selected identity/context at routing and recheck relevant focus,
scope, selection, revision, disabled state and pending operation at the actual
effect boundary. Decide whether a changed context cancels the command, requires
a fresh action or permits a documented rebind. Never silently act on a new
selection. An asynchronous boundary requires [result applicability](asynchronous-results.md);
a synchronous local guard proves no distributed transaction or remote permission.
Cancellation must identify whether it drops an uncommitted command, closes a
dialog, requests cancellation of work or reverses an actual effect. Retain unknown
outcomes and use existing recovery guidance when consequences may already exist.

## Freeze distinguishing checks and report limits

Before adapting a candidate, freeze literal input/context, chosen or rejected
command, consumption/default decision, intermediate pending/held state and
separately observed effects from supported reference evidence or a disclosed
proposed policy. Include ordinary shortcut and explicit-command controls, then
selected contrasts: editable/composing input; logical versus physical identity;
extra modifiers; competing dialog/background bindings; already consumed input;
disabled shortcut and menu; intentional navigation repeat versus one-shot hold;
duplicate dispatch; selection/focus/dialog changes before effect; cancel and blur.
Challenge plausible routing/guard/effect faults only after ordinary controls pass.
Exceptions or matching harness failures do not count as successful rejection.

The [bounded offline example](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/blob/main/evals/keyboard-commands/README.md)
uses declared synthetic records and a separate recording sink. It exercises no
native events, browser default actions/propagation, actual key layouts, IME,
focus traversal, screen reader or OS-reserved shortcut. Keep those checks unrun
until an authorized real target/host observation demonstrates them. No global
hooks, OS input injection, clipboard/user data, accounts or new service is
needed to reason about this bounded contract. Finite same-author checks do not
establish original parity, a production router, independent model quality or
all-platform accessibility.

## Primary basis

Checked 2026-10-23. Web-specific definitions: W3C Recommendations for
[logical key values](https://www.w3.org/TR/2025/REC-uievents-key-20250422/) and
[physical code values](https://www.w3.org/TR/2025/REC-uievents-code-20250422/).
WAI's informative [keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
covers focus/selection, keyboard conventions and shortcut conflicts. These
sources inform the questions; they do not establish a native target's behavior
or universal Ctrl/Meta mappings. Use platform-specific evidence for that target.
