# Observed browser-app trial — 2026-10-16

This actual agent trial used companion v1.3.10 at commit
`5a4f2f7e124ace7a2b48377af48e84298d5f42f9` and an original, source-available
MIT fixture, Pocket Board 1.0.0. The same agent authored the reference, saw its
source and expectations, recorded browser observations, and separately authored
the reconstruction. No access isolation, independent review, blind benchmark or
held-out evaluation is claimed. The requested settings were Sol, Medium reasoning
and Standard speed; settings stayed unchanged.

Exactly three workflows and the parity profile were frozen before reconstruction:

1. Create/edit/save/cancel, visible title validation and Enter submission.
2. Filter/select with stable selection and keyboard interaction.
3. Reload/persistence, empty state and malformed-storage recovery.

The static HTML/CSS/JavaScript fixture used synthetic local-storage data and no
packages, remote assets or backend. Existing Node v24.21.0 served an allowlisted
loopback route set. The existing in-app browser performed the interactions; its
engine version and process lifecycle were not surfaced. No new dependency,
engine, model worker, paid API/service or installed-skill update was initiated.

## Evidence and reconstruction

Reference SHA-256 identities were recorded before browser observation and checked
unchanged afterward. The hashes were recorded in tool output; the frozen brief's
promised standalone `identity.json` was not created. The later requirement
checkpoint and audit consolidated identities. This procedural deviation remains
visible; a later receipt cannot be backdated into a pre-observation manifest.

- HTML: `686e977381dd33880dc9be478062053418077761107a7e364d04193161c999a3`.
- JavaScript: `ed392ef1d7c581bf40af3dbfb12bc157902580992c6aad052931aeb0369c7335`.
- Candidate JavaScript: `9022fd0a2145d6c47f1386bfac969f989bf84be0dcc71b89e7ca4e5dc3d34e2a`.

REA `analyze_javascript_application` inspected the two reference files as inert
text. Parent Evidence was
`ev_3da1b1b99e62ed563f52315a324fbd4fedb22b6353f9b4bb24134a2a3f6973b9`;
the summary was
`ev_8a16bd7c0a165264125a7cd78f72938bc407bf7767bab1433aad0693c0ba94fc`.
One JavaScript file parsed without failures. Application inventory was complete;
semantic coverage remained unknown with 117 unknowns. The full bundle was
exported privately. No caller-supplied browser executable or loopback CDP endpoint
was available through the selected browser surface, so REA browser-scenario and
runtime verification stages were unrun. Ordinary browser automation supplied the
interaction evidence; it was not relabeled as REA execution.

Ten initial browser observations and source evidence informed a saved
pre-implementation checkpoint linking five requirements to the three workflows,
architecture and acceptance cases. The candidate used Map-backed records,
explicit editor state, DOM listeners and a local-storage adapter. It did not
import, invoke or wrap the reference. Generated code and launch boundaries were
inspected before execution.

Thirty checkpoints passed on each target, with expected-state assertions and
thirty pairwise matches of the complete captured semantic state. Checks covered
blank/whitespace rejection, trimmed Unicode and markup-like text, new/existing
cancel, Enter/Space/Tab interactions and focus, selection while hidden by a
filter, draft replacement, status changes, lost unsaved edits on reload, fresh-tab
persistence, eight malformed/schema cases, repair by saving, and an empty saved
array followed by creation. Screenshots at 1280×720 showed the heading, controls,
two-panel layout, editor and selection affordance on both targets. This was visual
inspection, not a pixel metric or accessibility certification.

## Preserved failures and minimal guidance fixes

The first browser navigation timed out. A local probe showed sandbox socket
access denied; restarting the reviewed loopback server outside that sandbox
allowed the browser to load it. These environment failures were not parity passes.

A reference empty-store test left data shared by the candidate's different URL
path. The candidate visibly inherited the empty list. A deliberately applied
seed-state guard rejected that run. Explicit reset plus a starting-state assertion
then preceded each independent sequence; reload/fresh-tab checks intentionally
retained state. The implementation guide now calls out origin/context/storage
identity instead of assuming separate paths or tabs isolate data.

An initial checker also rejected identical semantic values because serialized
object keys differed in order. A retry retained an older checker binding in the
persistent session. Both failed reports were kept; the repaired binding compared
objects by fields while preserving array order. Three local guard regressions
passed, but their failed/absent-result example exercised a separate illustrative
comparator, not the executed browser helper. It did not establish integrated
action-failure coverage. The guide distinguishes incidental serialization order
from semantic state. No candidate behavior change was needed.

The private audit retains frozen scope, source/candidate bytes, setup/server,
browser harness, raw accessibility and semantic captures, original failures,
screenshots, REA bundle and hash-linked comparison report. Replay requires those
retained inputs and the supported browser interface; this sanitized report alone
is not a turnkey public benchmark. The existing CLI checker remains separate.

## Review follow-up

A same-agent review found that the saved browser helper retained only 28 of the
30 checkpoint routines; the two separately executed keyboard checkpoints had
captures but no saved replay routine. The original auditor also trusted stored
pass flags and silently collapsed duplicate successful labels. A reduced
reproduction accepted matching wrong states with forged flags and a duplicate
checkpoint. These are audit/replay weaknesses, not demonstrated product defects.

Read-only review verified all 18 originally recorded artifact hashes, recomputed
expected fields for the 60 original successful captures and confirmed all 30
pairs. A stricter verifier rejected matching wrong states, duplicates, missing
checkpoints, missing capture fields and nonboolean pass flags. Original files,
reports and failures were preserved.

A complete review helper then replayed all 30 checkpoints per target and retained
the keyboard routines and checkbox/Save focus checks. All 60 fresh captured states
matched their historical counterparts. Four additional cases per target covered
saving a changed existing title while preserving completion, its reload,
cancelling an invalid edit, and selection with sparse imported IDs. All 68 fresh
checkpoints passed, with 34 paired semantic-state matches. The capture projection
contains rows/selection, empty/filter/editor/title/done/status/alerts and focus tag;
it does not represent every browser or persistent-state detail.

Two actual hidden-Save actions, one on each target, exceeded the declared short
selector deadline. The review action wrapper retained both errors and rejected
the captures even though their unchanged UI matched the expected baseline and
each other. This establishes failure handling for that review path and probe;
it does not retroactively validate the illustrative guard or every failure mode.
The implementation guide now requires recomputed expectations, unique complete
checkpoint sets, complete replay routines and tests of the actual harness path.
The private review supplement binds its new scripts/captures with hashes. This
follow-up is additional source-exposed review, not a second independent trial.

Browser-process restart, storage-quota/permission save failure, concurrent tabs,
power-loss durability, responsive layouts, performance, security, other browsers,
models and hosts were unrun. Passing covers the recorded states in these three
workflows, not exhaustive equivalence or production readiness. Human review,
merge and release approval are not established by this record.
