# Supplied evidence: a filtered note list

This is a synthetic reference fixture, not a capture from a real product. Supply this file with either `quirk-parity` or `quirk-improvement`, together with that task's user request. The two tasks intentionally request different behavior from the same evidence.

## E-L1: fixture boundary

Reconstruct only the in-memory selection/pinning feature. Every `evaluate(actions)` invocation starts with these unpinned rows, ascending order, an empty filter and no selection:

| ID | Title |
| --- | --- |
| `a` | Amber |
| `b` | Birch |
| `c` | Cedar |

The visible list contains titles that include the filter text, using ASCII case-insensitive matching, without trimming. Sort ascending or descending by these titles; pinning never changes order or visibility. No filesystem, UI framework, backend or real pinning service is required.

Inputs are arrays of valid actions. Unknown/malformed actions are outside this fixture's contract. A `select` index is always a valid zero-based index in the currently visible list.

| Action | Meaning |
| --- | --- |
| `{type:"select",index:1}` | Select the visible row at this index. |
| `{type:"clear"}` | Clear selection explicitly. |
| `{type:"filter",text:"ced"}` | Replace the filter text. |
| `{type:"sort",order:"desc"}` | Replace sort order (`asc` or `desc`). |
| `{type:"pin"}` | Toggle the currently selected row's pin; do nothing when no row is selected. |

Return one `{visible,selected,pinned}` snapshot after **each** action. `visible` is an array of row IDs in visible order; `selected` is a row ID or null; `pinned` lists all pinned IDs, including hidden rows, in fixed `a,b,c` order. Empty action lists return `[]`. Snapshots must reflect their own step, and invocations must not share state.

These rules stipulate the executable fixture boundary; they do not claim how a real application's storage or malformed-input handling works.

## E-L2: reference behavior, build 1.0

The reference retains the selected **visible row index** across sorting and filtering, even when no row occupies that index. The selected row therefore changes when another row moves into that position. An out-of-range retained index produces `selected:null` and makes `pin` a no-op, but may select a row again when the list expands. Only `select` replaces the retained index and `clear` clears it.

Example capture:

```json
{
  "actions": [{"type":"select","index":0},{"type":"sort","order":"desc"},{"type":"pin"}],
  "snapshots": [
    {"visible":["a","b","c"],"selected":"a","pinned":[]},
    {"visible":["c","b","a"],"selected":"c","pinned":[]},
    {"visible":["c","b","a"],"selected":"c","pinned":["c"]}
  ]
}
```

## E-L3: another reference capture

After `select(2)`, filtering to `ced` leaves just row `c`, but selection becomes null because index 2 no longer exists. Clearing the filter restores selection to `c` without another selection action. Pin flags themselves survive filtering and sorting.

This surprising behavior can pin a different note from the one originally selected. Evidence about what the reference does does not decide whether a new product should preserve it; use the selected task's user request.
