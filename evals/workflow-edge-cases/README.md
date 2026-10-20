# Bounded workflow edge cases

Run from the repository root using existing Node.js 20+:

```sh
node evals/workflow-edge-cases/run.mjs NEW_DISPOSABLE_DIRECTORY
node --test tests/workflow-edge-cases.test.mjs
```

The destination must not exist. Earlier results are never overwritten; a failed
check leaves its disposable state for inspection. No model, network, dependency
installation, real account/data or service deployment is used.

Read the [contract and existing-record mapping](CONTRACT.md), literal
[expectations](expectations.json) and [freeze identity](identity.json). The
[variant](variant.mjs) adds session-only preview and explicit confirmation to the
existing Pocket Ledger codec/store. The [runner](run.mjs) compares result,
screen, committed rows, preview and exact file bytes after every selected action.
It also checks for staging residue. Expected cells are authored literals, never
computed by the variant. Historical fixtures and oracle bytes are unchanged.

Two ordinary success workflows start with absent and existing data. Six selected
transition sequences cover failure/retry/repeated confirmation, failure/cancel/
stale confirmation, replacement/wrong-token cancel, abandoned-preview reopen,
failed-save reopen/new selection, and malformed input with a pending preview.
Tests first run ordinary cases on each deliberate faulty wrapper, then show a
specific transition assertion rejects it. This demonstrates the gap in success
coverage; it is not a mutation score for the full product. Additional tests
check caller/snapshot isolation and literal v1 import/empty replacement so the
session wrapper does not silently drop those codec obligations.

All contract, candidate, expectations and tests are source-exposed, same-author
work. Hash checks detect accidental drift; they are not an independent source of
truth or a general record-validation service. The chosen sequences are finite,
not exhaustive transition, combination or code coverage. Self-review is not
independent user acceptance. The fixtures do not evaluate model instruction
following, recover hidden internals or establish original-application parity.

Failure injection is a synchronous hook before file rename. Reopen constructs a
new instance in the same process. Direct stale-token calls exercise guards,
not asynchronous races. No process crash, power loss, concurrency, live permission
change, external persistence or remote integration was tested. Those unknowns
remain in the same requirement/evidence rows; success here cannot close them.

For real work, select consequential state assumptions and evidence as described
in [workflow states](../../skills/rea-reconstruction-companion/references/blueprint.md#consequential-workflow-states).
Changed assumptions require reassessing dependent sequence results; retain
applicable unrelated observations instead of either reusing every pass or
restarting the whole task.
