// Proposed synchronous teaching profile. No filesystem, network or real deletion.
export function createEditor(initial) {
  let document = structuredClone({rows:initial.rows, selected:initial.selected, anchor:initial.anchor});
  let undo = [], redo = [], pending = null;
  const effects = []; // Recording-only permanent-effect double, outside undo state.
  const capture = () => structuredClone(document);
  const snapshot = () => ({...capture(), undo:undo.length, redo:redo.length,
    pending:structuredClone(pending), effects:[...effects]});
  function commit(next, kind) {
    const before = capture();
    document = next;
    undo.push({before, after:capture(), kind});
    redo = [];
  }
  function edited(edits) {
    const next = capture();
    for (const edit of edits) {
      const row = next.rows.find(row => row.id === edit.id);
      if (!row) throw Error('Outside valid profile: unknown edit ID');
      row.text = edit.text;
    }
    return next;
  }
  function removed(id) {
    const next = capture();
    const index = next.rows.findIndex(row => row.id === id);
    if (index < 0) throw Error('Outside valid profile: unknown delete ID');
    next.rows.splice(index, 1);
    const fallback = next.rows[index]?.id ?? next.rows[index - 1]?.id ?? null;
    if (next.selected === id) next.selected = fallback;
    if (next.anchor === id) next.anchor = fallback;
    return next;
  }
  function dispatch(action) {
    let outcome = 'unchanged';
    // Pending confirmation allows only view selection, replacement request,
    // cancellation and confirmation. It cannot secretly commit a local edit.
    if (pending && !['select','request','cancel','confirm','inspect'].includes(action.type))
      throw Error('Outside valid profile: resolve pending confirmation first');
    switch (action.type) {
      case 'inspect': break;
      case 'select':
        if (!document.rows.some(row => row.id === action.id)) throw Error('Unknown selection');
        document.selected = action.id; document.anchor = action.id;
        outcome = 'selected'; break;
      case 'edit':
      case 'batch': {
        // Controlled failure before any commit; not persistence/crash evidence.
        if (action.fail) { outcome = 'failed'; break; }
        const next = edited(action.type === 'edit' ? [action] : action.edits);
        if (JSON.stringify(next.rows) === JSON.stringify(document.rows)) break;
        commit(next, 'edit'); outcome = 'applied'; break;
      }
      case 'undo': {
        const entry = undo.pop();
        if (!entry) break;
        document = structuredClone(entry.before);
        redo.push(entry); outcome = 'applied'; break;
      }
      case 'redo': {
        const entry = redo.pop();
        if (!entry) break;
        document = structuredClone(entry.after);
        undo.push(entry); outcome = 'applied'; break;
      }
      case 'request':
        if (!['delete','purge'].includes(action.kind) || !document.rows.some(row => row.id === action.id))
          throw Error('Outside valid profile: unknown request');
        pending = {id:action.id, kind:action.kind}; outcome = 'pending'; break;
      case 'cancel':
        if (pending) { pending = null; outcome = 'cancelled'; }
        break;
      case 'confirm': {
        if (!pending) break;
        const request = pending;
        pending = null;
        const next = removed(request.id);
        if (request.kind === 'purge') {
          // This chosen barrier prevents snapshots resurrecting a purged row.
          // Real external failures/uncertainty are deliberately not simulated.
          effects.push(request.id);
          document = next; undo = []; redo = [];
        } else commit(next, 'delete');
        outcome = 'applied'; break;
      }
      default: throw Error('Outside valid profile: unknown action');
    }
    return {outcome, state:snapshot()};
  }
  return {dispatch, snapshot};
}
