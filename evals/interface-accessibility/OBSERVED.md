# Selected results — 2026-10-19

Same implementing/reviewing agent, source-exposed and synthetic. No independent
participant/model test or real user application. The historical v1.3.29 improved
fixture and candidate have separate loopback storage origins and equivalent seed.
The profile was frozen before candidate edits; original fixtures were not altered.

| Case | Actual coverage |
| --- | --- |
| Baseline distinction | Native browser Tab/Enter opens New task at Title; Tab to Cancel then Enter closes editor and leaves active element BODY. Blank Enter displays Title is required. and focuses Title, but aria-invalid/aria-describedby are absent. Read-only DOM confirms those attributes; this does not establish absent speech. |
| K1/F1 | Candidate native Tab/Shift+Tab order and Enter opening, Space checkbox toggle, Cancel returning to recreated row, filtered-away fallback, New task opening and Cancel return observed. |
| F2 | Native Enter submit from Title and Save, success/rejection/retry focus retained/recovered. The separate deterministic double covers deliberate focus movement elsewhere during a held save and disappearing copy-recovery control; those two cases are not live browser observations. |
| E1/N1 | Blank Enter retains exact stored bytes, focuses Title, sets invalid state and error description; nonblank correction clears obsolete error and Enter writes trimmed title. Rendered names/values and native roles inspected in captured AX/DOM. Native accessibility representations can differ: pressed row buttons are exposed as checkboxes by this host's native AX view. No screen-reader announcement was measured. |
| S1 | After success, controlled pre-native-write rejection produces fresh failure feedback and retains draft/store; keyboard retry succeeds. Persistent status/alert semantics inspected. Real storage denial and spoken output unrun. |
| V1 | Title, Save and restored-row keyboard focus visually inspected in screenshots at 1280×720 test viewport, with dark 3px outline/3px offset. Selected-row blue styling remains distinct. Other viewports, measured contrast, forced colors and device coverage unrun. |

[observed.json](observed.json) retains 22 unique checkpoints, read-only projected
values, exact stored bytes at relevant boundaries and native AX captures.
The reusable auditor recomputes against its literal profile and reports no errors.
Two earlier incomplete runs were retained privately: cross-realm array comparison
and omission of the empty-state text node from the capture projection. The harness
was corrected without changing expected outcomes or application logic; these were
not passing runs. A later REPL result-assignment error occurred after the complete
report was already persisted; re-auditing that retained report passed, without
repeating the successful workflow.

Fourteen focused tests pass: six application-transition cases, five deliberate
application defects rejected by the targeted behavioral assertions, historical
byte identity, capture-auditor negative cases, and action-error persistence.
Doubles do not establish native keyboard or assistive behavior. Full source/package
and release validation are separate project gates, not accessibility certification.

Screen-reader/device/other-browser checks remain unrun. Follow the practical
[manual announcement steps](README.md#bounded-results-and-remaining-checks) using
an already available setup if required for a real reconstruction. No blanket
WCAG conformance, accessibility-tree-to-speech equivalence, independent-user
validation, backend verification or all-device claim is made.
