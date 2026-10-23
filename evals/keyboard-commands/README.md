# Bounded keyboard-command policy example

Run with existing Node.js 20+; no dependencies or services:

```sh
node evals/keyboard-commands/check.mjs
node --test tests/keyboard-commands.test.mjs
```

This same-author, source-exposed teaching contract freezes 72 complete literal
checkpoints in 36 scenarios across input/command, context/applicability and
repeat/transition families. The separately reasoned expectations and effect
records were hash-bound before writing the candidate; candidate output did not
generate the oracle. Five ordinary save shortcut/menu checkpoints precede tests
of 16 plausible faulty variants. Named mismatches compare all snapshot fields
and the independent recording sink, including duplicate effects invisible in a
matching router snapshot. It is not independent user testing or a model trial.

The selected synthetic profile deliberately uses Ctrl plus logical `s` with no
extra modifiers; Meta is not an alias. This is a proposed example policy, not a
recommendation for every platform. Physical `code` tracks held keys, never the
save character. Composition and already-consumed inputs remain unclaimed. Plain
text/unmapped keys have no command; Delete/navigation apply only to the list.
Editable input may explicitly save but cannot delete the list selection. A modal
blocks background save/navigation/delete; Enter confirms and Escape cancels it.
The explicit menu route shares the same applicability guards.

A routed command is captured in a single volatile pending slot; a second route
cannot replace it. Routing claims the synthetic input (`consumed:true`) but
performs no sink effect until explicit `commit`. The host adapter is absent:
`consumed` calls neither preventDefault nor stopPropagation, and `defaultPrevented`
is just supplied data. A stale command can be dropped at commit after having
claimed its original input. The decision record describes that latest boundary;
it cannot undo an earlier real default-prevention call.

At commit the full current context must equal the captured focus/dialog/selection/
revision/disabled context and still be applicable. A changed-and-restored context
is deliberately equivalent under this value-based policy; lifecycle epochs,
external ownership and asynchronous dispatch are not modeled. The synchronous
recording sink runs immediately after the check with no callback/await boundary.
It records synthetic save, navigation, open/close confirmation and deletion
calls; these are in-memory effects, not filesystem writes or real deletion.

Key IDs stand for a host adapter's stable identity for one input. The per-router
seen set rejects re-entry even after commit; IDs must be unique across distinct
inputs for its lifetime. Seen IDs are never evicted in this finite teaching slice.
That is not a production memory/lifetime strategy. Held physical codes suppress
one-shot commands even when a repeated record omits `repeat`; navigation remains
repeatable. Release removes a held code; blur releases all held codes, drops the
pending command and clears focus. Opening/closing a dialog retains held state.
Cancel-pending drops uncommitted intent; Escape closes a confirmation dialog.
Repeated commit cannot repeat an effect. Unknown harness actions and sink errors
propagate rather than being counted as a fault detection or a successful command.

No native/browser dispatch, propagation/default action, actual IME/dead keys,
key layout, focus traversal, assistive technology, OS binding, async effect,
persistence, undo engine, real global hook/input injection, clipboard/user data,
accounts or external service is exercised. No target behavior was recovered.
Use the [portable reference](../../skills/rea-reconstruction-companion/references/keyboard-commands.md)
to investigate a selected target and preserve its actual unknowns.
