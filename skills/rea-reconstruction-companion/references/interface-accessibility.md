# Accessibility of reconstructed interfaces

Use for selected UI workflows when interaction or accessibility matters to the
user's outcome. A decoder, protocol explanation or non-UI change does not require
a broad accessibility audit. Extend the existing requirement/evidence rows rather
than introduce another framework. This is engineering guidance, not legal advice,
certification or a claim of WCAG conformance.

## Separate evidence, fidelity and proposed improvements

Record the original artifact/version and starting state. Distinguish observed
keyboard/focus behavior, inspected names/roles/relationships, reported experience,
inference and unknowns. A screenshot can show a label or focus outline; it cannot
establish keyboard activation or a programmatic name. DOM/role/name/accessibility
tree evidence cannot establish that a screen reader announced an update.

Keep visual, interaction, functional/format compatibility and accessibility
acceptance independently assessable. An exact-looking copy can be inoperable;
an improved focus path can intentionally differ from the original. Apply
[preserve, improve or defer](reconstruction-methods.md#preserve-improve-or-defer):
link the original observation to the user goal, affected consumers and selected
acceptance. Preserve hard compatibility constraints. Do not blindly copy an
inaccessible quirk or silently redesign the product. Clarify only a consequential
unresolved conflict, such as an explicitly required focus/event sequence versus
the proposed accessible interaction; continue useful independent work.

Freeze a small set of relevant workflows and expectations before changing the
candidate. Preserve historical originals/oracles and label deliberate differences.
For example: open editor by keyboard → reject blank input → correct and save →
Cancel → return to a useful task control. Include failure after earlier success
when stale feedback could mislead. Select relevant cases, not every widget pattern.

## Specify observable behavior

| Concern | Useful selected acceptance and evidence |
| --- | --- |
| Keyboard | Reach actions in meaningful forward/reverse order, activate native controls with their platform keys, and complete the workflow without a pointer or trap. Specify arrow/Escape/Tab behavior for an actual custom composite or dialog using the matching platform/APG pattern; do not add those widgets solely for testing. |
| Focus | Identify entry, movement and return targets on open/close, validation, removal/rerender and asynchronous completion. Restore to a connected useful control when an invoker disappears; preserve a user's deliberate move elsewhere. Inspect a visible indicator at the selected viewport, including whether author content obscures it. Selection styling is distinct from keyboard focus. |
| Names and labels | Retain meaningful visible labels and programmatic associations; inspect name, role, value/state and error descriptions. Keep visible label text in the accessible name where applicable. Placeholder text, color or a decorative icon alone is insufficient evidence of a usable label. |
| Errors | Identify the field and a useful correction in text, associate the message with it, reflect invalid state, retain user data and choose a useful focus destination. Exercise correction/retry and clearing obsolete errors, not just the initial message. |
| Dynamic feedback | Distinguish pending, saved and failed outcomes. Check persistent status/alert semantics and actual text/state transitions without routinely moving focus to a message. Verify intended announcements separately with the selected assistive technology; avoid duplicate/noisy announcements. |

Prefer native controls and platform semantics when they fit the design. Adding
ARIA roles does not implement keyboard handling, focus management or persistence.
Use ARIA only with the behavior it promises; do not override working semantics
to mimic an appearance. For native/desktop targets consult that platform's
accessibility interfaces; web ARIA is not a universal desktop solution.

## Test and report only what was exercised

Use existing authorized tools. Through the real UI, record keyboard inputs,
active focus, resulting values/messages and relevant stored outcomes. A locator
click/fill can prepare data, but cannot substitute for an observed Tab sequence
or keyboard activation. Read-only DOM checks and rendered accessibility inspection
can supplement those actions. A screenshot alone is not measured contrast or
an accessibility pass. Keep tool/browser/context and candidate identities with
the selected cases, reset disposable state, and retain action failures/partial
captures; matching failures are not successful accessibility behavior.

Use existing tests for meaningful transition regressions or deliberate defects
when helpful: lost focus after rerender, stale success after rejection, invalid
state that survives correction. Label deterministic DOM/storage doubles separately
from live browser results; passing a double does not prove native key behavior,
an accessibility tree or spoken output. Same-author/source-exposed worked examples
are not independent user testing. Reassess affected checks when the candidate,
expectations or environment changes.

If a needed tool, screen reader or device is unavailable, keep that check unrun
with impact and a practical next step: in the user's existing chosen browser and
assistive technology, repeat the named workflow and record focus plus the actual
announced label/error/status and correction behavior. Do not install an auditor,
runtime or assistive tool, add a paid service, or bypass automation controls just
to complete a checklist. Stop at the agreed cases or a concrete limitation;
selected passes do not establish all-device coverage or whole-app conformance.

The [Pocket Board worked slice](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/blob/main/evals/interface-accessibility/README.md)
keeps the historical reference and intentional candidate separate. Its bounded
keyboard/focus/error evidence and unrun announcement checks illustrate this split.

## Primary basis

Checked 2026-10-19. The pinned [WCAG 2.2 Recommendation, 12 December 2024](https://www.w3.org/TR/2024/REC-WCAG22-20241212/)
provides normative criteria, not a claim that this selected slice satisfies all
conformance requirements. Relevant anchors: [2.1.1 keyboard](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#keyboard),
[2.1.2 traps](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#no-keyboard-trap),
[2.4.3 order](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-order),
[2.4.7 visibility](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-visible),
[2.4.11 obscuring](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-not-obscured-minimum),
[2.5.3 label in name](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#label-in-name),
[3.3.1 errors](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#error-identification),
[3.3.2 labels](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#labels-or-instructions),
[3.3.3 correction](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#error-suggestion),
[4.1.2 semantics](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#name-role-value),
and [4.1.3 status](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#status-messages).
WAI's [APG keyboard guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/),
[ARIA role promises](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
and [form notifications tutorial](https://www.w3.org/WAI/tutorials/forms/notifications/)
are informative implementation aids. Their examples still need testing in the
selected browser/assistive-technology combination.
