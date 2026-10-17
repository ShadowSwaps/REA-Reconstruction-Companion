# First-use workflow review

This is a bounded manual review by the same agent that edited the guidance, with source and worked-answer exposure. Each row below was read in its stated context and assessed for subject, objective, authority, next action and output size. The decisions are reviewer judgments, not captured responses from isolated candidate runs. No model API, second agent, service, dependency or automatic evaluator was used. A table of plausible interpretations cannot establish arbitrary models' understanding or host activation.

## Three paths through existing examples

| Goal and selected evidence | First useful action and proportional result | Boundary retained |
| --- | --- | --- |
| Understand Pocket Tasks' save/cancel behavior using the [investigation](reference/WALKTHROUGH.md), particularly W1, W2 and W7 | Identify the selected target and explain saved versus draft state, restart and the observed pending-file collision. Cite those observations and their single-writer limits; add requirements/roadmap only to the extent requested. | Static parsing does not prove runtime behavior. Reading the worked answer is source exposure, not a fresh REA investigation. No candidate implementation is needed. |
| Rebuild the selected save/cancel workflow using [workflow evidence](cases.md#workflow), then compare the broader [worked reconstruction](reference/reconstruction/README.md) | State the isolated draft/stored contract, implement that selected feature when requested, and exercise save/cancel/restart and exact text preservation against independent expectations. The broader example shows traceability without requiring every app command for this smaller fixture. | The workflow fixture explicitly excludes real disk persistence. Its checker cannot establish the worked app's filesystem guarantees or whole-app parity. Keep the requested original/improved behavior separate. |
| Continue the selected [resume checkpoint](resume/TASK.md) and [executable walkthrough](resume/WALKTHROUGH.md) | Read the checkpoint, target/candidate identity and input-only report, then identify unfinished cap behavior. Retain matching input-validation evidence; reassess target-bound claims on changed-target. Use [selective dependency guidance](../skills/rea-reconstruction-companion/references/checkpoints.md#on-resuming) for larger compositions. | Triage-only tasks do not authorize execution. The executable walkthrough separately demonstrates continuation and historical-byte preservation. Passing an input-only report never completes the function. |

The walkthrough exposed three documentation gaps: the usage section had no resume entry point; the understand-mode bullet said to deliver a blueprint even though later sections permit compact answers; and progressive loading/contextual interpretation was scattered rather than explicit at the decision point. The README now offers the resume path and explains ordinary-language use and host limits. The skill aligns the mode instruction with proportional outputs, interprets corrections/negation in context, and selects references by the next action. Existing consent, integration, updater, evidence and validation contracts remain applicable. No demonstrated need for a new classifier or checkpoint engine was found.

## Manual scenario assessment

Context is part of each input. These are illustrative variations, not an exhaustive phrase catalogue, executable routing tests or required user wording. “Next” names the first useful action, not permission for unrelated external actions. The reviewer checked each row against the revised skill; the interpretation and reason are recorded together so disagreements remain reviewable.

| ID | Request and context | Manual interpretation, reason and next action |
| --- | --- | --- |
| U1 | Selected Pocket Tasks artifact: “How does saving work? I might make my own one day.” | Understand save behavior; future aspiration does not authorize code. Inspect selected save evidence and return a compact explanation with gaps. |
| U2 | Same artifact: “Can you figure out what survives closing it?” | Investigate persistence/restart, with a focused scenario and explicit limits. “Can you” requests action without requiring the word analyze. |
| U3 | Same artifact: “wanna undrestand cancel first, no coding pls” | Understand cancel only despite typos; retain the no-code exclusion. Trace draft/stored changes and answer the question. |
| U4 | Same artifact: “Map the main workflows so I can plan a replacement.” | Product specification, no implementation intent. Use applicable blueprint sections and evidence-linked requirements/roadmap. |
| U5 | “Build nothing yet; tell me how this selected parser rejects malformed packets.” | Negated build stays investigative. Recover rejection contract and unknowns, not a UI or implementation. |
| U6 | Ordinary REA request: “Explain this DLL export.” No reconstruction goal. | Keep the function explanation with base REA; a companion blueprint is unnecessary. Select the export and evidence, not a product map. |
| B1 | Selected workflow fixture: “Could you make that save/cancel bit work locally?” Prior turn names the fixture and writable project. | Scoped build request by context. Implement draft/stored transitions and compare independent expected snapshots; no second routine approval. |
| B2 | Same fixture: “rebulid just save + cancel, keep restart behaving the same” | Build that workflow despite typo; retain restart parity and bounded in-memory contract. Do not invent filesystem persistence. |
| B3 | Selected function: “Only addByte, not the app around it. Make it here.” | Function build. Recover byte/saturation/invalid-input contract and run the existing function checker. The executable carrier does not expand scope. |
| B4 | Selected parser: “First explain its format, then implement only the decoder.” | Both objectives are authorized in sequence. Explain the contract, then implement the decoder once evidence suffices; no whole-app rebuild. |
| B5 | “I don't need another investigation; implement the selected spec's next slice.” Spec and target are supplied. | Build from specification. Check applicability and slice prerequisites; inspect only consequential gaps before coding. |
| B6 | “Match the odd row-selection behavior for compatibility; don't fix it.” Selected selection fixture. | Quirk parity is explicit. Preserve index-based behavior and test the distinguishing sort/filter cases; keep improvement suggestions separate. |
| B7 | Same fixture: “Keep the rest, but I want selection to follow the item ID now.” | Explicit selected improvement. Record the changed acceptance profile and compare its distinguishing cases without rewriting original observations. |
| B8 | “Make decodeFrame faster, but keep its outputs.” Selected library/function, local candidate destination established. | Scoped build/optimization. Establish correctness and relevant measurements before claiming a speed benefit; retain output compatibility. |
| C1 | Earlier broad build: “Actually, only the decoder, and no code yet.” | Current correction supersedes scope and mode. Preserve useful evidence and stop implementation; return the decoder contract. |
| C2 | Earlier no-code investigation: “Okay, implement that contract here now.” One contract and destination selected. | Context resolves “that”; switch to scoped build and retain exclusions. Check evidence before the next implementation slice. |
| C3 | Earlier feature build: “Not the upload bit; I meant import from disk.” | Scope correction. Record upload as deferred; inspect import evidence and compatibility boundaries rather than continuing the old feature. |
| C4 | Earlier selected contract: “Could we eventually build this? For today I just need a plan.” | Plan/specify now. The current time-bound request overrides the build wording; no implementation. |
| R1 | Selected unchanged checkpoint: “pick up where I left off” | Resume prior mode/scope; read the checkpoint and relevant identities/report first. Reuse only the report's tested slice and name unfinished work. |
| R2 | Same checkpoint: “Same files, finish the cap handling in this project.” | Local continuation is requested. Verify applicability, preserve input-only evidence and implement/test cap behavior rather than restarting the app investigation. |
| R3 | “Continue, but this is version 2 now.” New target identity supplied. | Resume with reassessment. Preserve original results as history; inspect the change and stale dependencies before adapting, retaining unaffected work. |
| R4 | Earlier checkpoint was specification-only: “Resume the notes from yesterday.” The record is explicitly supplied. | Resume investigation, not build. Read the selected record; do not load unrelated chats or infer implementation authority. |
| R5 | Selected composite checkpoint: “Only the scorer setting changed; keep the formatter results if they still apply.” | Check actual dependencies and environment evidence. Retain justified formatter reuse, recheck scorer/integration and leave unknown dependencies explicit. |
| A1 | No target/context: “Can you rebuild it?” | Missing subject is consequential. Ask which software or feature/artifact; do not select the nearest process or fixture. |
| A2 | Reference app and candidate both selected: “Make it better.” No stated outcome. | Target and action are ambiguous. Ask whether the user wants proposals or changes to the candidate, and which behavior; do not mutate the installed reference. |
| A3 | Two checkpoints supplied: “Continue that one.” Neither selected. | Ask which checkpoint. Do not choose by filename recency; independent safe reading can establish their identities. |
| A4 | “Replace the current installation with the rebuild.” Existing scope only covers a local candidate. | Installation is a consequential new action. Clarify exact target and replacement/backup authority before mutation; a build request alone is insufficient. |
| A5 | Selected upload evidence lacks backend access: “Can you tell me why retries duplicate things?” | Investigate bounded hypotheses from the client trace. Explain missing server evidence and the smallest distinguishing experiment; do not invent rollback or contact a provider. |

These 28 judgments cover paraphrases, indirect requests, typos, negation, aspirations, selected scopes, conversational references, corrections, continuation and genuine ambiguity. They establish that the guidance has a coherent interpretation for these examples under manual source-exposed review. They do not measure model reliability, prove every phrasing routes correctly, or enforce consent or billing in a host.

## Executable evidence is separate

Use the existing harnesses and tests rather than a prose classifier:

```sh
node --test tests/evals.test.mjs tests/selection-evals.test.mjs tests/reference-walkthrough.test.mjs tests/reference-reconstruction.test.mjs tests/resume.test.mjs tests/resume-walkthrough.test.mjs tests/resume-selective.test.mjs
```

These checks execute oracle comparisons and deliberate wrong implementations, replay saved observations, verify candidate runtime independence, and exercise checkpoint history/applicability. They test those contracts and mechanisms, not the natural-language rows above. Actual runs and identities belong in the trial/release record; this command alone is not evidence that they passed. Full source/package/install/upgrade/manifest/validator/CI checks still apply to a release. No new executable test is warranted for merely matching these documentation sentences.

For an actual future host trial, use the existing [evaluation procedure](README.md#run-an-evaluation) and [review template](review-template.md), supply selected evidence without the worked answers or reviewer oracle, and record real actions, failures and limitations. Run no model evaluation unless its environment is established to add no charge. Installation and explicit invocation help expose instructions; neither guarantees that a host activates them, reloads changes, or correctly interprets arbitrary conversation.
