# Offline unsaved-change and navigation example

Run `node --test tests/unsaved-navigation.test.mjs` from the repository root.
No dependency installation, network, real user data or browser is used.

This is a proposed teaching policy, not recovered behavior of an original app.
The same author reasoned and froze `expectations.json` and its SHA-256 identity
before adapting `candidate.mjs`. Its 16 sequences contain 72 literal intermediate
snapshots. After first execution, one final no-op expectation was corrected:
`repeat-save-and-choice` step 5 must retain `a1`/revision 1 already committed at
step 4. The original frozen bytes and failed run remain in private task evidence;
no candidate change was made for this correction. The identity records this
provenance. It is source exposed, not an independent author or model evaluation.

The editor starts on document `a`, owner 1, draft/saved `a0`, revision 0; `b` and
`c` contain `b0`/`c0`. Independent cases reset the editor, store and controlled
promise jobs. State remains live inside each sequence. `check.mjs` compares full
draft, canonical saved content/revisions, document/owner, dirty, feedback,
captured save and pending destination at each step. The checker never computes
expectations through the candidate and propagates exceptions.

## Chosen contract and valid inputs

- Distinct string edits increment revision; equal text is a no-op. Dirty means
  revision differs from canonical saved revision, even after editing back to old
  text. There is one active save per owner. A save captures document, owner,
  revision and text; controlled promise success commits that snapshot in memory.
- Editing during a save retains the newer draft. Success saves only the captured
  revision and leaves newer edits dirty. Failure keeps prior saved content, draft
  and destination, reports failed, and permits an explicit retry.
- Clean switch/close proceeds. Dirty departure records the exact target. Save
  waits for a clean current draft before navigating; discard abandons the draft
  and opens the target without updating saved data; cancel clears navigation.
- New leave requests replace pending destinations; repeating the same request or
  save choice starts no extra save. Cancel while saving cancels only navigation;
  the save can finish. A newer edit blocks navigation after an older save succeeds.
- Discard while saving is outside this finite profile and rejects. Close uses the
  explicit `closed` destination and ends with no open document. `replaceOwner` is
  a synthetic teardown/reopen test hook that abandons the old draft; it is not a
  UI route around the leave decision. Old-owner completions cannot commit the
  model store, change feedback or clear a newer save, even on the same document.
- Actions use known document IDs, string text, positive scheduled operation IDs
  and boolean completion outcomes. Complete each scheduled promise at most once;
  error completion is a controlled rejection-of-save result, not response loss.
  Invalid actions throw; this is not an arbitrary-input navigation library.

The real promises run actual completion callbacks, with manual releases rather
than time-dependent sleeps. Storage, failures and scheduler are doubles. The guard
owns this in-memory commit; a real external write could already have committed
before a stale callback is ignored and needs its own reconciliation policy.

## Distinguishing faults and limits

Twelve disposable source mutations each pass the same four ordinary checkpoints
(edit → save and clean switch), then fail a named intermediate state comparison:
newer-revision certification, saving the live draft, stale owner success, old error
clearing a newer save, failed-save draft loss/navigation, old destination capture,
cancel retaining navigation, discard committing, duplicate save, navigation with
newer edits, and close opening another document. Tests stop at that assertion so
later invalid sequences cannot count as useful kills. Infrastructure failures
propagate. Oracle/hash edits are not a way to make a mutant pass.

This finite local success does not establish original parity, backend durability,
crash recovery, network timing, uncertain-write replay, concurrent writers,
production keyboard/dialog behavior or actual browser/native leave/close hooks.
Reopening after discard uses only the retained in-memory canonical store.
See the selectively loaded
[guidance](../../skills/rea-reconstruction-companion/references/unsaved-navigation.md)
for investigating the real selected application. Standalone installations omit
these repository-only evaluation files.
