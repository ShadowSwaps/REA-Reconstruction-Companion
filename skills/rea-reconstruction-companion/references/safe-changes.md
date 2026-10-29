# Change an existing reconstruction

For a request to modify an existing reconstruction, use [safe changes](safe-changes.md) to reconcile current intent and custom work, retained contracts, affected dependencies, acceptance and recovery before editing. Keep changed requirements separate from changes to the reference version or environment.

Use for a request to modify the selected reconstruction, including a small fix,
changed priority, new workflow or intentional difference from the original. Use
the current project and [implementation workflow](implementation.md); this is not
a second planning framework. Explaining or planning a change remains
non-implementation until the user asks to build it.

## Establish what changes and what stays

Read the whole current request, corrections and relevant project state. Resolve
the intended outcome and selected codebase from context; distinguish the
reference app from the reconstruction. A new reconstruction requirement does
not imply that the reference changed. Use [version changes](version-changes.md)
for a selected new reference version, and [checkpoints](checkpoints.md) for relevant
runtime/configuration drift. Several causes can coexist; record them separately.

Inspect the current implementation and selected checkpoint/specification before
editing. Identify custom code, uncommitted work, deliberate differences, existing
data and public interfaces. Reconcile stale design notes with newer work rather
than regenerate the app from an older blueprint. Preserve unrelated work; avoid
whole-file replacement or resetting a checkout to make a change easier. A saved
checkpoint is evidence, not permission or current truth.

State the changed outcome and retained obligations briefly: hard requirements,
platform/stack constraints, exclusions, consumers, formats and intentional quirk
decisions. Infer routine details from ordinary wording and project evidence;
ask only about an ambiguity that would materially change correctness, scope or
data loss. An authorized routine edit needs neither a broad questionnaire nor a
new approval gate. A hard requirement that conflicts with the proposed approach
stays unresolved until reconciled; do not silently downgrade it to optional.

Keep three things distinct in the existing brief/requirement row: observed
current implementation, new user requirement, and proposed implementation. For
example, “currently imports completion state; now needs a single-entry toggle;
propose reusing the validated save path” does not claim reference parity for
the new action.

## Freeze acceptance and impact before the edit

Trace the changed requirement through affected components, callers, shared
dependencies, interfaces and persistence to relevant user journeys. Follow
indirect effects: a completion toggle may change export representability even
when the export module is untouched. Inspect actual callers/contracts; a missing
declared edge is not evidence of independence. Prioritize consequential unknowns
before unrelated cleanup. Keep deferred requested work and its next action visible.

Use the existing [evidence applicability record](checkpoints.md#on-resuming).
Mark affected findings/requirements/test results stale or unknown until reassessed;
retain original reports and justified scoped reuse with their identities and
limits. Reference observations can stay applicable while candidate integration
results become historical. Unchanged hashes alone do not establish unchanged
behavior when callers, contracts, data, configuration or runtime changed.

Before implementation, choose literal expected outcomes or another appropriate
independent oracle for the changed behavior, affected shared boundaries and
retained compatibility cases. Freeze the intentional-difference profile separately
from historical parity. Include relevant empty/error/cancel, save/reopen and
recovery cases. A new feature passing cannot compensate for a broken retained
workflow. Apply required release regressions even when a scoped report is reused.

## Implement, recover and report proportionally

Make the smallest coherent slice in the selected codebase, preserving custom and
unfinished work. Exercise the real entry point and affected integrations alongside
retained cases. Use [focused fault challenges](validation-methods.md) where they
test a consequential boundary; do not install a mutation service or broaden the
task into a general audit.

Choose recovery for the actual risk: a reversible source edit may need a retained
diff; a data/schema change may need a selected owned backup, reader compatibility,
explicit migration and tested restore. Do not force migrations or create backups
for no-op edits. Explain whether code rollback can read new saved data, which
later writes a data restore would lose, and whether recovery is a product feature
or a harness arrangement. Never overwrite original apps or real user data for a
demonstration. Caught write failures do not establish crash/transaction durability.

Report changed and retained acceptance separately, including failed, blocked and
unrun cases. Label manual contextual judgments, doubles, actual runtime results
and reused history. Checkpoint the current implementation, pending requirements,
data state, evidence applicability and next action if the change is deferred.
Selected success does not prove arbitrary intent comprehension or global
compatibility. The repository-only [worked change](https://github.com/ShadowSwaps/REA-Reconstruction-Companion/tree/main/evals/safe-changes)
shows a frozen baseline, separate variant, literal outcomes and caught faults;
it is a source-exposed teaching fixture, not a model evaluation or backup manager.
