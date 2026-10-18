# Choose a useful first reconstruction slice

This is a maintainer-authored planning example and manual scenario review. It
shows how to select work using the skill's
[roadmap guidance](../skills/rea-reconstruction-companion/references/blueprint.md#choose-the-first-useful-slice).
It is not a new REA trial, executable planner, independent evaluation, model
benchmark or measurement of user time/token savings. The same author reviewed
the guidance, historical source/answers and scenarios. No separate model
evaluations, additional agents, packages or remote target experiments were run.

## Before and after: a save-first command-line tool

Request: “Plan replacing this command-line task tool. Keep its odd row selection
for old scripts; saving is the first useful outcome.” The selected evidence is
the historical [Pocket Tasks investigation](reference/WALKTHROUGH.md), especially
its W1–W7 observations and R1–R6 requirements. It covers selected single-writer
behavior in Pocket Tasks 1.0.0, not a graphical app or arbitrary backend.

An inadequate plan could say: “Inventory commands; build the command menu, then
editing, storage and tests.” That leaves useful success and the storage/failure
dependencies unclear. This is an illustrative weak plan, not captured output
from an earlier model. The existing guidance already asked for vertical slices;
the improvement explains how to choose and bound them.

A more useful proposed response:

> I’ll plan around creating a task, saving it and seeing it after reopening the
> tool. I’ll retain the row-selection behavior for script compatibility. The
> first result needs real storage and honest save failures; a command menu alone
> would not satisfy it. This is a specification, so I won’t implement it now.

| Order and outcome | Essential work and prerequisites | Evidence → acceptance |
| --- | --- | --- |
| 1. Add a task, save it and reopen it safely | Process entry point, draft/saved separation, schema-1 loading and explicit persistence. Include valid-empty/malformed startup and failed-save preservation before trusting existing data. Check supplied interface bounds relevant to this slice. | R1/R2/R5/R6; W1/W2/W5–W7 → unsaved data stays unsaved, saved content/IDs survive restart with transient state reset, accepted title text is retained, empty stores stay empty, malformed data is preserved on rejection, and a pending-file collision retains the dirty draft and both existing files. |
| 2. Edit/cancel through filtering and selection | Reuse the same state/storage model. Retain row-based selection rather than quietly adopting stable-ID selection. | R3/R4; W2–W4 → cancel restores saved data while retaining filter/row state; filtering and removal retarget selection in the recorded sequences. Recheck slice 1 where shared state changes. |
| 3. Complete remaining requested command/interface coverage | Reconcile remaining command cases and capacity/input boundaries with the selected [task contract](reference/TASK.md). Keep untested cases explicit. | Contract plus independent reviewer scenarios → exercise remaining selected cases through the process interface; use the [existing reconstruction validation](reference/reconstruction/README.md) as historical teaching evidence, not proof of a future candidate. |

The storage/schema decisions serve several workflows, so a small shared state
and store boundary helps; a general plugin platform does not follow from this
request. Slice 1 retains the safety behavior needed for the first outcome,
rather than postponing all failures until “testing.” R3/R4 remain binding in the
full requested reconstruction even though their selected workflows come next.

Deferred/outside coverage stays visible: no UI is requested; crash durability,
concurrent writers and hostile path races are not established by W1–W7. Stable-ID
selection would be an intentional difference requiring a changed compatibility
goal. None of these observations establishes production performance. For an
actual build, resolve critical gaps in the selected slice before dependent work;
these proposed checks do not claim a new implementation ran or passed.

## Bounded manual scenario assessment

The minimum expected constraints were written before instruction edits and
review of response variants. They are reasoned same-agent judgments, not blind
or independently authored oracles. Each row records the frozen constraint and
the concrete response/next step considered against the revised guidance. Other
plans can satisfy the same constraints; these are not required user phrases or
a classifier specification. Context is part of each request.

| ID and varied request/context | Frozen constraint | Manual response/next step and rationale |
| --- | --- | --- |
| P1. Selected notes app: “Make something like this here.” | Build now; infer a reversible principal journey from context, label proposals, retain remaining requested scope. No exhaustive inventory first. | “I’ll start with create/edit/save/reopen as the proposed first useful journey.” Inspect storage and entry-point evidence, then build when critical contracts suffice. Ask only if another plausible journey materially changes design/success. |
| P2. “I spend all day finding old notes; build that first.” | Explicit search outcome outranks an assumed new-note editor. | Start with existing-data access/import, indexing and search→open/read. Check representative existing notes and no-result/error behavior. These dependencies make the outcome usable. |
| P3. “Recover my existing notes first, but exact animations are also the top priority.” | Preserve both priorities; clarify a consequential conflict without a questionnaire. | Ask whether the first usable result must include exact animations or may begin with data recovery. Meanwhile inspect safe schema/read evidence. Do not silently turn required fidelity into optional polish. |
| P4. “It must work offline and keep my schema-1 files unchanged; sync can wait.” | Offline/format constraints bind the first slice; sync is deferred. | Plan local read/edit/save/reopen with independent schema-1 fixtures and failed-save preservation. Resolve what “unchanged” means for bytes/schema before a potentially incompatible write; no cloud or lossy replacement. |
| P5. “Animations would be nice; first I need to trust it with today's notes.” | Optional cosmetics cannot displace persistence/error behavior. | Start with save/reopen and relevant rejection/retry behavior. Defer animations. Label any crash-durability target proposed/unverified until supported. |
| P6. “Import old notes, then search them and edit matches.” Shared schema/IDs. | Respect order and shared dependencies without disconnected implementations. | Define a bounded schema/identity/storage contract once; validate import→search→edit with representative records. No generalized platform detached from those results. |
| P7. Unknown file version/encryption and unexplained theme assets. | Investigate unknowns by effect on design, not count or visibility. | Inspect version/encoding and key availability before committing import/storage design. Defer theme details; identifying encryption does not supply keys. |
| P8. Backend unavailable: “Rebuild sharing exactly; local editing is useful too.” | Exact sharing stays blocked/unverified; local work cannot replace it silently. | Specify observed client boundaries. Continue an authorized useful local-editing slice, retaining sharing as blocked. Clarify if missing sharing prevents useful success; mock success cannot verify server parity. |
| P9. “Someday I'd love my own version. For now explain the main workflow.” | Future aspiration does not authorize implementation. | Explain the selected journey with evidence/unknowns; add a short proposed sequence only if useful to the explanation. No candidate code. |
| P10. “Rebuild only decodeFrame, no app or UI.” | Complete function contract and consequential dependencies only. | Recover inputs/outputs/errors and independent vectors; implement that function when sufficiently specified. No app map or prioritization report. |
| P11. Selected build checkpoint with passing editor results: “Resume, but import my old files before search now.” | Revise priorities/applicability, preserve applicable results and history. | Read identities/current intent; move format/import prerequisites forward. Reuse justified editor checks and recheck shared schema effects. Editor evidence is not import proof. |
| P12. Earlier broad build: “Actually just map export, no coding today.” | Current scope/mode supersede the old build. | Stop implementation; explain export inputs/outputs/errors and gaps. Retain useful findings without continuing old slices. |
| P13. Prior context selects local candidate: “can u get my notes back when i reopen it? fancy bits later” | Contextual build continuation despite paraphrase/typos; persistence leads. | Implement/validate save/reopen and consequential failure recovery for the candidate. Defer cosmetics. No literal keyword routing rule. |
| P14. Save-first command-line plan above. | No code; coherent save/restart/failure slice; retain row compatibility and remaining requirements. | Link W1/W2/W5–W7 first, W2–W4 next, then remaining supplied contract cases. Historical evidence stays historical; no fresh parity claim. |

The review found these interpretations consistent with the revised guidance.
It does not prove that arbitrary models will follow it, that all paraphrases
work, or that a host will select/reload the skill. The
[first-use review](first-use.md) separately covers existing mode/context
boundaries, including genuine ambiguity. No executable test was added merely
to match these sentences.

## Executable validation is separate

Existing checks can exercise the evidence and runtime contracts used here:

```sh
node --test tests/evals.test.mjs tests/selection-evals.test.mjs tests/reference-walkthrough.test.mjs tests/reference-reconstruction.test.mjs tests/resume.test.mjs tests/resume-walkthrough.test.mjs tests/resume-selective.test.mjs
```

Those tests compare actual behavior, reject selected wrong candidates and check
checkpoint applicability; they do not grade this plan or the natural-language
rows. Commands listed here are not passing results. Source/package/install,
manifest, genuine skill validator and CI checks remain release gates. A future
host trial uses the existing [evaluation procedure](README.md#run-an-evaluation)
without worked answers, with exposure and actual actions reported, only where
no additional charge can occur.
