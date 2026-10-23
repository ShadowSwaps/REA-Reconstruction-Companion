# Browser-backed combined workflow lab

This repository-only, dependency-free fixture exercises a **proposed** browser
transport around the unchanged [combined model](../combined-navigation/README.md).
It is portable across models and automation providers. Authentication, accounts,
grants, read/write responses and service commits remain visibly **simulated**.
Standalone skill installations omit evals and tests.

Run `node evals/browser-workflow/server.mjs` using the existing Node >=20 runtime.
Open the printed `http://127.0.0.1:PORT/items/a` in a fresh disposable tab/profile
that contains no private user data. The server binds only loopback, accepts only
GET with its loopback Host, serves five named modules and the fixture page, and
sets no cookies or persistent storage. Close task-owned tabs and stop only this
server with Ctrl+C after recording evidence. No install, external service, model
call, network API, telemetry or authentication credential is needed.

Use one new tab for each independent procedure below. Complete reads explicitly;
the operator's Commit and Complete controls separate a synthetic service effect
from its acknowledgement. Fail represents a read error or unknown write response,
not proof that a write was cancelled. A write can still commit after Fail.

## Browser contract and evidence

The native History API owns actual entries. `popstate` arrives **after** the URL
has moved. For a dirty or unresolved departure the fixture records that movement,
hides/disables the editor and pauses at **Resume URL reconciliation**. This
operator gate makes the intermediate DOM inspectable without timing sleeps. It
controls when `history.go` is issued; it does not synthesize a popstate event.
Resume restores the exact source entry before presenting its departure proposal.
An approved traversal pauses again before issuing the native move to its exact
destination. Clean traversals accept the already-moved native entry directly.
This is a bounded lab procedure, not a production navigation framework or a
pre-commit traversal veto.

Push truncates forward entries; replace retains the current key. Same URL entries
have separate keys. A session change replaces the current physical entry with a
new epoch while the model resets its volatile history. Older native entries still
exist: traversing one restores the current epoch's entry without loading the old
owner or reviving a choice. Foreign entries and unexpected traversal during
reconciliation stop with the editor hidden. Leaving the fixture document entirely
is outside this same-document procedure; the fixture cannot prevent native close,
external navigation or an out-of-range Back from unloading it. Start in a fresh
tab and do not traverse before the fixture's first entry.

Before adapting the transport, the author froze the separately reasoned proposed
outcomes in [expected-before-adaptation.json](expected-before-adaptation.json).
These are human-readable expectations, not a machine oracle. Record each action,
native address/entry, rendered editor/dialog value and visibility, revision,
loading/saving, proposal, controlled calls and independently recorded service
effects at intermediate points. The expandable rendered observation record
contains these fixture diagnostics; supplement it with actual DOM/role/value,
address and screenshot observations. A record's `hidden` event annotation alone
does not prove the DOM was hidden. Synthetic operator diagnostics deliberately
show old operation payloads and are separate from the current owner's editor.
They implement no protected service or confidentiality boundary.

## Three bounded families

1. **Native history and dirty editor.** Complete read1 at A, Push B / complete2,
   Push C / complete3, edit C1. Use the browser's actual Back. Observe native B,
   committed C, editor hidden, no dialog or write. Resume: native C, exact
   traversal proposal for B/key2, C1 retained. Cancel keeps C1. Repeat Back /
   Resume, Discard, observe the second hidden interval, then Resume / complete4.
   B/key2 opens. Forward / complete5 opens C/key3 with C0, without discarded C1.
   Back / complete6 then Push A / complete7 creates A/key4 and truncates C's
   forward branch. Native Forward stays at A/key4. Initial A/key1 remains distinct.
2. **Changed/cancelled departure during save.** Fresh tab, complete1, edit A1,
   Push B, Save and leave (write2). Replace C creates a fresh proposal. Replay
   prior Cancel must leave it intact. Commit2 records A1/version2 before Complete2;
   neither effect releases C. After Complete2, A is clean but C still needs the
   fresh Save and leave choice; it replaces entry1 with C, then complete3.
   In another fresh tab repeat A1/Push B/Save, then Cancel. Edit A2, Commit2 /
   Complete2: A2 remains dirty, saved revision1 and no departure. Push B, edit A3,
   Discard: stale departure is rejected; A3 remains.
3. **Simulated session transitions and late outcomes.** Fresh tab, complete1,
   edit A1, Push B, Save and leave, Simulate expiry. Editor/approval clear and
   write2 becomes unknown. Simulate login A / X starts read3; complete it, Restore,
   Save: unresolved blocks replay. Commit2 / Complete2 updates the original ledger
   without certifying the restored editor; another Save stops at conflict.
   For overlapping owners, fresh tab: leave read1 pending, Push B (read2 pending),
   Push C / complete3, edit C1, manual Save (write4), Push B, switch B / X (read5).
   Complete1 and Fail2 must preserve loading5 and empty editor. Complete5, Restore
   reports no-draft. Edit Q1 and Save (write6). Commit4 / Complete4 must leave Q1,
   saving6 and current feedback intact. Native Back into the old epoch hides the
   editor; Resume restores B/X's current A entry without another read/approval.
   Commit6 / Complete6 certifies only Q1. A separate fresh A1/manual-save2 → switch
   B / complete3 → Q1/save4 sequence uses Fail2, then Commit2: old error/finalizer
   cannot clear saving4, and response loss did not cancel the synthetic old effect.

Ordinary controls are A0 read, manual A1 save without navigation, and clean Push B
then native Back to original A/key1 with a fresh read. Each independent case starts
from a fresh tab, not a reload/persistence assumption. Buttons Native Back/Forward
also call the real History API; an automation API may instead reject a boundary
traversal before issuing it. Record that distinction.

## Regression and limits

Run `node --test tests/browser-workflow.test.mjs tests/combined-navigation.test.mjs`.
The history port in Node tests is explicitly a transport **double**, not browser
evidence. Four disposable controller faults must pass ordinary controls before
named state/effect mismatches reject wrong restoration direction, edits during
reconciliation, revived obsolete proposals and unchecked restored-entry keys.
The existing integrated model's regressions remain separate.

For a meaningful browser distinction, make a disposable copy of the fixture and
combined modules. In its app only, remove `blocked ||` from the expression assigning
the editor panel's `hidden` property. Ordinary read/save/clean Back must still work.
Dirty Back must then fail the DOM visibility expectation while native URL/view
disagree; a "hidden" status string is insufficient. Keep the original candidate
unchanged, bind the copy/origin/source hashes, retain the actual mismatch, and
close/stop that copy. Harness exceptions are failures, not useful fault kills.

Same-author, source-exposed finite checks establish only the recorded browser,
build and ordered procedures. They establish no original parity, model quality,
real authentication/service enforcement, durable or secure retention, browser
reload/unload persistence, arbitrary concurrent traversal, other-browser/device
coverage, assistive-technology announcement or accessibility certification. The
nonmodal departure region and native controls permit interaction; DOM roles and
focus observations do not establish screen-reader behavior. Required browser
checks remain unavailable if the existing authorized browser cannot load or
interact with the local fixture; model/static passes cannot replace them.
