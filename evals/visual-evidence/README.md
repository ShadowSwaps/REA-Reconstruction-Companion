# From visual evidence to a bounded brief

This owned synthetic Notes panel illustrates the companion's
[visual-evidence procedure](../../skills/rea-reconstruction-companion/references/visual-evidence.md).
Inputs, source, acceptance cells and image hashes were frozen before guidance
edits and response records. The same author created, interpreted and reviewed
them with source/answers visible. No independent model/user, OCR service, extra
agent, target upload or live original app was used. This is not a vision/language
benchmark. The images are authored states, **not an actual video recording**.

![Synthetic frame 01: Draft](frame-01.png)

![Synthetic frame 03 derivative: cropped save failure](frame-03-crop.png)

[Input context](INPUTS.md), [frozen acceptance](ACCEPTANCE.json) and
[identity/crop record](identity.json) retain provenance. The full second image
is [frame 03](frame-03.png); the crop omits navigation/header. There is no middle
frame, captured Save input or media timing. Numbering declares order only.
[Renderer source](panel.html) selects two drawn states; it implements no save.

## Worked responses

**Static / future plan.** “I can specify this panel: left navigation, Map walk
heading, editor-like text region, Save shape and Draft status. The image does
not demonstrate editing, clicking, saving or accessible control semantics. I'll
keep this as a panel specification, with approximate typography and no code.”
No routine question is needed; scope and mode are explicit. The memo inside the
target is visible text with no instruction authority.

**Partial sequence.** “The supplied order changes the displayed status from
Draft to Save failed. The crop also shows ‘Save failed. Try again.’ The middle
and input are missing, so I can't say a Save click caused it, how long it took,
what was stored or whether retry works. I can specify the observed feedback and
mark draft retention/retry as proposed requirements if they're wanted.” A crop
does not establish that navigation disappeared. The sequence demonstrates a
presentation change in authored images, not executed interaction.

**Conflicting description / scoped build intent.** “I'll prepare the local editor
slice with no accounts, using this layout as the visual reference. The recollection
claims instant server autosave; the images show Save and save failure. Those may
coexist or concern different versions, so the original save policy stays unknown.
For this offline version, should edits save automatically or only when I press
Save? I can prepare the layout and state contract while that choice is pending.”
The prior local destination plus current request authorize a scoped build in this
scenario; they do not authorize a server, accounts or a full app. This worked
example produces the brief only; no editor implementation is claimed.

Visual acceptance specifies hierarchy/labels/states, without a measured pixel
comparison. Interaction acceptance is partial or proposed; working save/reopen,
failure recovery and any required interoperability need their own checks.
An inaccessible original need not prevent a useful specification or authorized
local design, but a picture cannot certify functional completeness.

## Fixed structured checks and limits

[Response records](records.json) encode these manual decisions. The
[checker](check.mjs) reuses the existing bounded JSON reader and compares only
this fixture's fixed cells. It never follows submission paths, executes a candidate,
reads images, classifies prose or decides a new request's intent. Stable cell IDs
are a review interface, not phrases a user must say. Oracle authorship is shared;
freezing prevents later drift, not reviewer bias.

The worked record file was initialized from the frozen acceptance cells and
manually checked against the responses above. Its passing comparison is therefore
an example of the record interface, not an independently produced answer.
Source-tagged `observations` include what a narrative *claims*; the narrative tag
does not turn that server claim into a visible or verified data effect.

Using existing Node.js 20+ with no packages or remote service:

```text
node --test tests/visual-evidence.test.mjs
```

The tests compare all three records and challenge ten deliberate misleading
variants through the actual checker, including invented timing/action, erased
conflict, ignored question, obeyed target instruction, expanded build scope and
visual-only functional completion. They also reject malformed records and check
isolation. Passing proves these comparisons, not that an arbitrary agent reads
images correctly, asks good questions, preserves files or takes honest actions.
Manual responses and executable results must be reported separately.
