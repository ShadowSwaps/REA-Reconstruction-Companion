# Worked quirk decisions and bounded assessment

These are synthetic, source-exposed teaching scenarios, reviewed by the same
host agent that edited the guidance. No model trial, independent review or
third-party app observation is claimed. Minimum expectations were frozen before
guidance edits; the table records the varied response variants then assessed
against them. Judgments are manual reasoning, not executable or phrase-matching
grades. Existing fixture tests below exercise concrete behavior separately.

## One mixed decision, traced to evidence

Suppose the user asks to rebuild Pocket Ledger import/export and improve Pocket
Board save reliability in a selected reconstruction. This is an illustrative
combined brief, not evidence that the two fixtures share storage or a product.

| Original evidence | Goal and affected dependency | Reconstruction decision and acceptance |
| --- | --- | --- |
| [Ledger R1/R2](import-export/CONTRACT.md): UTF-8 without BOM, terminal LF on export, ordered entries, duplicate object keys last-wins; duplicate row IDs rejected. | Existing readers require the selected format. Input interpretation and output bytes are external boundaries. | Preserve that profile, including the odd duplicate-key rule. Test frozen rows/errors, raw encoding/LF and both interoperability directions; changing to strict duplicate-key rejection would need a separate requirement/profile. JSON object key serialization order remains insignificant under this contract. |
| [Board historical baseline and acceptance](browser-improvement/ACCEPTANCE.md): selected rejected saves retain old data while feedback can remain misleading; stale tabs can overwrite. | User requests honest save feedback and conflict recovery. Affected boundaries include storage acceptance, competing writers and draft retention. | Improve in the candidate using the separate frozen acceptance profile; preserve original/parity bytes and historical observations. Test failure feedback after success, prior bytes, retry, overlapping cooperating writers and non-destructive recovery. No crash-durability or external-writer guarantee. |
| Animation fidelity is unspecified in this hypothetical brief. | It is outside the selected persistence/import outcome. | Defer pending a fidelity request or a demonstrated effect on that journey. Required import and save acceptance remain pending until tested; cosmetic deferral cannot complete them. |

The improvement's full-raw-byte comparison can conservatively reject unrelated
edits. Its exclusive Web Lock requires cooperating writers and actual platform
capability; missing capability fails closed. Those tradeoffs belong with the
proposed requirement, not in a claim about why the original was written that way.
The existing [worked browser report](browser-improvement/README.md) describes
historical bounded observations and exclusions, not new measurements here.

## Frozen scenarios and manual assessment

Each expected constraint is a semantic boundary, not a required sentence or one
mandated design. “Meets” below describes the assessed response variant only;
it does not establish that arbitrary agents will follow the instructions.

| ID / varied request or evidence | Frozen expected constraint | Assessed response variant and judgment |
| --- | --- | --- |
| Q1 “Make failed saves honest,” using Board evidence. | Separate UI feedback from actual stored bytes; improve only candidate, retain baseline. | Propose failure feedback/draft/prior-byte/retry acceptance including failure after success. Meets; control faults remain labeled. |
| Q2 “The old reader needs this odd encoding.” Hypothetical consumer, not a Ledger encoding observation. | Preserve externally significant bytes; independent reader checks. | Keep selected encoding profile and test consumption, allowing only justified normalization. Meets; reader unavailable means interoperability unverified. |
| Q3 Ledger duplicate keys look wrong. | Preserve explicit last-wins compatibility; distinguish duplicate row IDs. | Retain R1 interpretation and duplicate-ID rejection; propose strict import only as a separate authorized profile. Meets, without claiming a universal JSON policy. |
| Q4 “Stop stale tabs losing changes,” Board improvement. | Separate parity from reliability; verify coordination/dependencies and fallback. | Use frozen conflict acceptance with overlapping writers, retained draft/current state, cooperative lock and missing-capability checks. Meets within declared limits; revision comparison alone is insufficient. |
| Q5 “My consumer needs event A before B, within its timeout.” Hypothetical consumer. | Preserve required order/timing until impact evidence supports change. | Retain A→B and specified bound in consumer tests; ignore unrelated incidental delays only with rationale. Meets as a proposed test, not an executed timing result. |
| Q6 “Was that timeout a failed write?” [Retry fixture](cases.md). | Commit/cause unknown without backend; concrete question/trigger. | Defer exact diagnosis until a correlated status/readback becomes available; propose distinguishing experiment, keep required server parity blocked. Meets; a nicer retry UI is not backend evidence. |
| Q7 “Preserve all quirks for my old scripts.” | Honor fidelity within applicable safety/authority constraints; expose conflict. | Preserve selected observed traces and disclose data-loss consequence. If executing harmful behavior conflicts with constraints, resolve that specific tradeoff before dependent action. Meets; no silent universal fix or blind unsafe replay. |
| Q8 “Improve selection; you can implement it here.” [E-L2/E-L3](fixtures/selection-list.md). | Goal permits scoped improvement, not arbitrary changes or per-quirk gates. | Implement stable-ID selection under the selected improvement profile, retaining unchanged pin ordering/filter contracts. Meets; authorization is from this build request. |
| Q9 “Better selection, same export order.” Mixed hypothetical brief. | Separate dimensions and dependent tests. | Use improvement selection traces and preserved format/ordering cases separately. Meets; no averaged parity score or claim that fixtures share an implementation. |
| Q10 “Only reconstruct the decoder.” | Complete compact contract; no product-wide ceremony. | Note encoding/duplicate-key/error decisions at decoder boundary with independent cases and necessary dependencies. Meets; no UI/storage build implied. |
| Q11 “Saving first; animation can wait.” | Defer polish visibly, retain required save work. | Save/reopen/failure slice first; animation revisited when that journey is verified or user reprioritizes. Meets; pending core tests remain pending. |
| Q12 “Resume, but old scripts now need original selection.” | Reassess affected decisions/acceptance; retain history. | Select parity for new work, retain historical improvement result for its old profile, rerun affected behavior and keep scoped reuse. Meets; old failures do not become passes. |
| Q13 “Explain quirks for a possible future rebuild.” | Planning grants no implementation/original-app mutation. | Deliver observations, inferred intent/unknowns and proposed decisions only. Meets; no candidate or original edits. |
| Q14 Quirk repeats, intent/version cause unknown. | Reproducibility is not defect/intent/optimality evidence. | Record exact scenario and identity/configuration, competing explanations and distinguishing check. Meets; cause remains unresolved. |

## Executable coverage and limits

`node --test tests/selection-evals.test.mjs` runs actual checker comparisons:
18 frozen action sequences per profile, swapped-profile rejection and deliberate
defects. Added regressions challenge unchanged canonical pin order and hidden-pin
retention in the parity profile as well as the existing improvement tests. They
test the comparator's concrete dependency coverage, not prose comprehension.

`node --test tests/import-export.test.mjs tests/browser-improvement.test.mjs`
exercises the existing format/recovery and browser-model harness contracts with
frozen expectations and deliberate defects. These commands are test instructions;
actual execution results belong in the task's validation record. They do not
launch a live browser or establish new production persistence/concurrency facts.
Original fixtures/oracles and historical observations are unchanged. The manual
scenarios are bounded same-agent assessments with source exposure; no performance,
cross-model compliance, independent authorship or whole-app equivalence follows.
