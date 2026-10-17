# Browser persistence and recovery follow-up — 2026-10-17

This bounded follow-up reused the unchanged Pocket Board 1.0.0 reference and
reconstruction from the [original trial](OBSERVED-BROWSER-TRIAL.md). The historical
trial's agent authored both targets and saw the reference source and expectations.
This follow-up used those visible sources and expectations in a fresh task chat;
one agent ran the new observations, wrote the audit and reviewed its own results.
This is source-exposed, same-agent review evidence, with no blind
benchmark, independent review or model/host comparison. Requested settings were
Sol, Medium reasoning and Standard speed; no extra agent, dependency, paid
service or scheduler was added.

Scope, four target hashes, environment, storage isolation and expectations were
saved before new browser observations. The original HTML and JavaScript hashes
match the earlier trial. Current companion baseline was v1.3.12 plus the merged
README cleanup. Earlier static REA evidence was reused only for unchanged target
bytes; no new REA browser execution is claimed. Ordinary supported browser
automation performed the interactions.

Exactly three groups were investigated through the existing in-app browser:

1. **Restart/persistence:** saved edits survived page reload and a fresh tab;
   unsaved drafts disappeared, with filter/editor state reset. No owned browser
   executable/profile or CDP endpoint was available. Actual browser-process
   restart remains **unrun**; reload and fresh-tab results do not substitute for it.
2. **Failed saves/recovery:** a separately identified fixture wrapper rejected one
   `localStorage.setItem` call before its native write. Existing and new-task
   failures retained drafts, prior rows and exact stored bytes, showed
   `Save failed.`, and recovered through retry and reload. After an earlier
   success, both targets also retained the stale `Saved` status alongside the
   failure alert. This shared weakness was recorded without changing either
   original. Controlled injection is **not real browser quota/permission denial**;
   that stage remains unrun.
3. **Concurrent tabs/conflicts:** deliberately same-origin tabs stayed stale after
   the other tab saved. A later stale whole-store write silently lost the first
   tab's edit, even when editing different records. Two new tasks independently
   allocated ID 3; the second save replaced the first new task. Reload converged
   both tabs to the last stored snapshot. No conflict warning or merge was
   observed. This establishes matching baseline data-loss behavior, not successful
   conflict handling or a recommended design.

Reference and candidate used distinct loopback ports, with the same synthetic
storage key. Each independent sequence explicitly reset and asserted the seed;
state was retained inside deliberate persistence/concurrency sequences. Original
files were preserved. Instrumented HTML added visible fault controls and a wrapper
before the unchanged app script; the wrapper affected only the selected key and
armed save in that document. This tests synchronous write rejection, not partial
writes, corruption, crash recovery or storage-engine durability.

All 54 captured checkpoints met their source-informed expected fields and exact
stored-byte expectations, with 27 matching paired semantic projections and stored
values. The projection covers rows/selection, filter, editor/title/done, status,
alerts and fault-control state; it does not cover every hidden browser state.
Saved results were audited by recomputing expectations and checking the complete
unique checkpoint set. The actual browser harness rejected two hidden-Save actions
at a declared short selector deadline despite matching unchanged UI. Failed
actions were retained separately and did not count as paired passes.

The initial navigation timed out while the reviewed loopback server ran in the
sandbox. Binding that failed tab also encountered a blocked generated error-page
URL. The unchanged server became reachable after an approved launch outside the
sandbox. These failures were preserved, not counted as application results.

Private evidence retains the frozen brief, original identities, instrumentation,
replay routines, AX/semantic/storage captures, errors, screenshots and audit.
This sanitized report is not a self-contained public benchmark. No reference or
candidate product change was justified by parity results. The companion guidance
now explicitly checks stored bytes, feedback after prior success, retry recovery
and stale-tab overwrite behavior. These are bounded method improvements, not an
enforcement engine or a certification of reliability. Runtime version/profile
identity, actual process restart, real storage denial, power-loss durability,
other browsers/hosts/models, performance, security and accessibility remain
unverified.
