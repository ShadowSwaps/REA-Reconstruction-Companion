# Settings, defaults and preference persistence

For settings, defaults or saved preferences, use [preference contracts](settings-preferences.md) to recover presence versus explicit values, applicable scope/precedence, effective value and source, pending versus applied/saved changes, reset and reopen behavior. Preserve unrelated/unknown data under the selected compatibility policy; do not infer missing storage from a default-looking screen.

Use this when a selected reconstruction depends on configurable behavior. Scale
to the consequential fields and transitions; extend existing finding/requirement/
acceptance rows rather than build a configuration framework. Planning remains
planning. Separate original observations, causal hypotheses, desired requirements
and proposed improvements; a convenient default is not evidence of the original.

## Resolve values and their sources

Trace input/control → validation → pending draft → applicable runtime value →
stored representation → reopen. Bind observations to target version, selected
account/profile/document/session, relevant flags and a repeatable starting state.
Inspect source and authorized disposable runtime evidence where available. A
default-looking screen cannot establish that a stored key is absent.

| Consequential distinction | Recover and test |
| --- | --- |
| Default versus explicit value | Source/version of a default; absent/unset versus null, false, zero or empty string; explicit value equal to the default. Recover valid types/ranges rather than treating falsy values as missing. |
| Scope and precedence | Which global, account, profile, document, session or per-operation source applies; actual precedence and inheritance/removal rules. Include only relevant scopes, with selected identity. Keep effective value and source separate; identical values can have different later behavior. |
| Draft, applied and saved | What a control edits, what affects current behavior, what is persisted and what survives reopen. Trace Apply, Save, Cancel, dismissal and repeated actions; names alone do not establish effects. Cancel may discard pending edits without undoing earlier Apply or Save. |
| Reset | Whether reset stages an edit, writes explicit defaults, removes overrides to inherit, or changes behavior immediately; exact scope and treatment of unrelated settings. Verify later Apply/Save/Cancel and reopen instead of equating all resets. |
| Temporary override | Owner/lifetime and applicable precedence; whether it masks a saved value, is cleared on scope change, or is deliberately persisted. Never copy an effective temporary value into storage without an evidenced or explicit proposed policy. |

For example, an explicit `false` preference and an absent preference can both
display Off today but diverge when the default changes. Compare stored presence
and provenance as well as visible values. A scope change can alter inheritance
without changing stored bytes; a changed default can affect only unset fields.
Do not impose one universal precedence or Apply/Save/reset policy.

## Persistence and compatibility boundaries

Determine when validation occurs, when changes become effective and what counts
as successful persistence. Check consequential reopen behavior at the actual
boundary claimed: view recreation, fresh instance/process, browser reload or
external service readback are different observations. A snapshot or in-memory
store double is not durability evidence. Keep pending edits and truthful feedback
after rejection or failed save, and distinguish known failure from uncertain
write outcomes through [asynchronous results](asynchronous-results.md).

Recover supported schema versions, malformed/type/range handling, unknown fields
and older/newer incompatible data policy. Determine whether reading migrates only
in memory, writes immediately, requests confirmation or blocks writes. Preserve
unknown/unrelated data according to the selected contract; do not silently drop
it, rewrite real user configurations or claim compatibility from a self-roundtrip.
Use [file compatibility](file-compatibility.md) for encoding, exact bytes, caught
write recovery and reader/writer directions, [numeric](numeric-contracts.md) and
[date/locale](date-locale.md) contracts for value meaning, and
[unsaved navigation](unsaved-navigation.md) for leaving a pending settings view.
No new migration, parsing, scheduling or storage engine is implied.

## Freeze distinguishing checks

Freeze literal expected presence, values, sources, draft/applied/saved state and
relevant bytes from supported evidence or a separately reasoned proposed policy
before candidate adaptation. Reset between independent cases, retaining state
inside a sequence. Include ordinary edit/save/reopen and cancel controls, then
select useful contrasts: missing versus explicit false/zero/empty/default,
override/inheritance precedence, Apply then edit/Cancel, reset then Cancel/Save,
temporary override then reopen, invalid/older data and unrelated-value retention.
Do not require an exhaustive cross-product for a small selected feature.

Challenge plausible disposable faults that first pass the declared ordinary
controls and then fail named actual value/state/byte assertions. Propagate harness
and I/O errors; exceptions are not useful mutation kills. Disclose supported
inputs, source exposure, same-author or independent authorship, storage doubles,
actual read/write/reopen boundaries and untested cases. Finite local success does
not establish original parity, cross-host persistence, crash recovery, concurrent
writers or arbitrary migration safety. Preserve historical oracles; use
[safe changes](safe-changes.md) and [checkpoints](checkpoints.md#on-resuming) when
defaults, precedence, scope or schema interpretation changes dependent evidence.

The repository-only `evals/settings-preferences/README.md` demonstrates one
proposed finite profile with disposable local files; standalone installations
omit it. Its Apply/Save/reset choices are teaching policy, not recovered semantics
or a product requirement for other targets.
