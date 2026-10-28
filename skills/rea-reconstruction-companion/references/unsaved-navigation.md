# Unsaved changes and navigation

Use for the selected edit/save or leave/close/switch journey. Extend the existing
[finding/requirement/transition rows](blueprint.md#consequential-workflow-states);
one operation may need only a short contract. Planning remains planning, and a
request to recover one editor's behavior does not authorize a navigation framework
or destructive trials on real user data.

For direct links, route/filter state and Back/Forward entries, use
[navigation and history](navigation-history.md) alongside this departure policy.
Bind the destination to its navigation kind/entry; a browser traversal notification
does not imply the app can veto a history movement that already occurred.

## Recover the saved boundary

Bind evidence to document identity, owner/session, starting saved content, draft,
edit revision, save operation and ordered actions. Keep observed original behavior,
causal hypotheses, user requirements and proposed changes distinct. A “Saved”
label or static handler does not establish persisted content or durability.

Recover what dirty, saving, saved and failed mean for this target: revision versus
content equality, no-op edits, undo back to saved content, autosave/manual save,
and reopened state where consequential. Distinguish canonical saved data, the
current draft, a captured in-flight save payload and user feedback. Saving may
coexist with newer unsaved edits; a failed save can follow an earlier success.
Record which content survived and what feedback remains, rather than treating
“not saving” as “saved”. Keep unknown persistence semantics unresolved; use
[persistence validation](implementation.md#validate-at-the-right-boundaries)
and [proportional recovery](safe-changes.md#implement-recover-and-report-proportionally)
without duplicating their mechanisms.

For work completing later, apply [asynchronous applicability](asynchronous-results.md):
bind completion to the saved document, owner and captured revision at each effect
boundary. An old completion must not silently certify newer edits or another
document as saved, erase a new error or release unrelated pending navigation.
Establish separately whether an old write can still commit externally; ignoring
its UI callback is not storage cancellation. Preserve uncertain effects and
reconcile before consequential retries.

## Recover the departure decision

Trace leave/close/switch request → exact destination → prompt/choice → save or
discard effect → actual navigation and feedback. Identify the departing document
and selected target, including close with no destination. Determine whether a
prompt is present and what save, discard, cancel, dismissal and failure actually
do. Save may mean wait for captured content, require the latest draft to be saved,
or something else; distinguish recovered behavior from a proposed improvement.

Choose distinguishing sequences for consequential interactions: edits during the
save, changed owner/document, replacement or repetition of a pending destination,
cancel while saving, failure followed by retry, and repeated confirmation. Record
whether the pending intent is retained, replaced, cancelled or blocked, which
target eventually opens, and which draft/data remains. State restrictions such
as whether discard is available during an in-flight save. Cancelling navigation,
cancelling a save and discarding a draft are separate effects; use
[undo and destructive boundaries](undo-destructive.md) for restoration claims.

Browser unload/page lifecycle and native close hooks are platform-specific.
For retained drafts across reload/reopen, use [draft recovery](draft-recovery.md)
to define checkpoint eligibility, explicit restore and current-revision validation.
Do not promise that a closing page can finish an asynchronous save. Exercise
the actual supported lifecycle in an authorized disposable environment where
required; a local model or prompt cannot establish real browser-close behavior.

For a departure crossing route and account/session boundaries, recover which
event wins and which approval survives. Bind save payload/revision separately
from the exact departure choice; a replacement destination or newer edit may need
a fresh choice even when an older write succeeds. Cancellation of departure must
not be reported as cancellation of storage. On recovery, compare the retained
base against an applicable remote revision and known operation receipts; equal
text alone need not establish the same version. Keep unresolved writes blocking
consequential replay until reconciliation supports it. Exercise these interactions
in one lifecycle, as illustrated by the proposed repository-only
`evals/combined-navigation/README.md`, without silently changing isolated policies.

## Freeze distinguishing checks

Before adapting code, freeze literal intermediate draft/saved values, document
and owner identities, captured revision, feedback and pending destination from
supported observations or a separately reasoned proposed contract. Reset between
independent cases and preserve state within a sequence. Compare actual effects
and completion callbacks, not authored decision labels alone.

Select ordinary edit → save and clean departure controls, then the consequential
orders above. Challenge plausible disposable faults that pass declared ordinary
controls before a specific state/value assertion rejects them. Propagate harness,
load and scheduler errors; they are not useful mutation kills. Keep valid-input
preconditions, source exposure, authorship, storage/scheduler doubles and untested
orders explicit. Preserve historical oracles when policy changes and reassess
affected [checkpoint evidence](checkpoints.md#on-resuming).

The repository-only example is `evals/unsaved-navigation/README.md`; standalone
installations omit it. Its finite in-memory policy demonstrates controlled
completions and navigation, not original-app parity, real backend durability,
crash recovery, concurrent writers or browser/native close guarantees.
