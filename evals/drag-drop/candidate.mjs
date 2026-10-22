import {isDeepStrictEqual} from 'node:util';
// A finite proposed operation model, without browser or OS event handling.
export function createBoard(initial, recorder) {
  let lists = structuredClone(initial), drag = null, preview = null, status = 'idle', nextCopy = 1;
  const revisions = Object.fromEntries(Object.keys(lists).map(k => [k,0])), views = {}, history = [];
  const owns = owner => Object.hasOwn(lists,owner);
  const find = (owner,id) => owns(owner) && lists[owner].find(item => item.id === id);
  function snapshot() {
    const displayed = Object.fromEntries(Object.entries(views).map(([owner,view]) => {
      let items = lists[owner].filter(item => !view.hidden.includes(item.id));
      if (view.sorted) items = [...items].sort((a,b) => a.label < b.label ? -1 : a.label > b.label ? 1 : a.id < b.id ? -1 : 1);
      return [owner,items.map(item => item.id)];
    }));
    return structuredClone({lists,views:displayed,drag:drag && {owner:drag.owner,id:drag.id,mode:drag.mode},
      preview:preview && {dest:preview.dest,position:preview.position,anchor:preview.anchor,valid:preview.valid},status,history:history.length});
  }
  function begin(action) {
    if (drag) return;
    if (!find(action.owner,action.id) || !['move','copy'].includes(action.mode)) { status = 'rejected'; return; }
    drag = {owner:action.owner,id:action.id,mode:action.mode,revision:revisions[action.owner]};
    preview = null; status = 'dragging';
  }
  function aim(action) {
    if (!drag) return;
    const {dest,position,anchor} = action;
    const valid = owns(dest) && ['before','after','end'].includes(position) &&
      (position === 'end' ? anchor === null : Boolean(find(dest,anchor))) &&
      !(dest === drag.owner && views[dest]?.sorted);
    preview = {dest,position,anchor,valid,revision:revisions[dest]}; status = valid ? 'preview' : 'invalid';
  }
  function drop() {
    if (!drag) return;
    const captured = drag, target = preview; drag = null; preview = null;
    if (!target?.valid) { status = 'rejected'; return; }
    if (revisions[captured.owner] !== captured.revision || revisions[target.dest] !== target.revision) { status = 'stale'; return; }
    const before = structuredClone(lists), after = structuredClone(lists);
    const item = after[captured.owner].find(item => item.id === captured.id);
    if (captured.mode === 'move' && captured.owner === target.dest && target.anchor === captured.id) { status = 'unchanged'; return; }
    let inserted = item;
    if (captured.mode === 'copy') {
      while (Object.values(after).flat().some(item => item.id === `copy-${nextCopy}`)) nextCopy++;
      inserted = {...item,id:`copy-${nextCopy}`};
    } else after[captured.owner] = after[captured.owner].filter(item => item.id !== captured.id);
    const destination = after[target.dest];
    const index = target.position === 'end' ? destination.length : destination.findIndex(item => item.id === target.anchor) + (target.position === 'after' ? 1 : 0);
    destination.splice(index,0,inserted);
    if (isDeepStrictEqual(before,after)) { status = 'unchanged'; return; }
    if (!recorder.commit({kind:captured.mode,lists:after})) { status = 'failed'; return; }
    lists = after; revisions[captured.owner]++; if (target.dest !== captured.owner) revisions[target.dest]++;
    if (captured.mode === 'copy') nextCopy++;
    history.push({before,after:structuredClone(after)}); status = 'committed';
  }
  function dispatch(action) {
    if (!action || typeof action.type !== 'string') throw Error('Invalid fixture action');
    switch (action.type) {
      case 'begin': begin(action); break;
      case 'preview': aim(action); break;
      case 'drop': drop(); break;
      case 'cancel': drag = null; preview = null; status = 'cancelled'; break;
      case 'move': if (!drag) {begin(action); aim(action); drop();} break;
      case 'view':
        if (!owns(action.owner) || !Array.isArray(action.hidden) || typeof action.sorted !== 'boolean') throw Error('Invalid fixture view');
        views[action.owner] = {hidden:[...action.hidden],sorted:action.sorted}; break;
      case 'external': {
        if (!owns(action.owner)) throw Error('Invalid fixture owner');
        const list = lists[action.owner];
        if (action.remove && find(action.owner,action.remove)) lists[action.owner] = list.filter(item => item.id !== action.remove);
        else if (action.append && typeof action.append.id === 'string' && typeof action.append.label === 'string' && !Object.values(lists).flat().some(item => item.id === action.append.id)) list.push(structuredClone(action.append));
        else throw Error('Invalid fixture external edit');
        revisions[action.owner]++; break;
      }
      case 'undo': {
        if (drag) {status = 'undo-conflict'; break;}
        const entry = history.at(-1);
        if (!entry) { status = 'no-history'; break; }
        if (!isDeepStrictEqual(lists,entry.after)) { status = 'undo-conflict'; break; }
        if (!recorder.commit({kind:'undo',lists:entry.before})) { status = 'failed'; break; }
        lists = structuredClone(entry.before); history.pop();
        for (const owner of Object.keys(revisions)) revisions[owner]++;
        status = 'undone'; break;
      }
      default: throw Error('Unknown fixture action');
    }
    return snapshot();
  }
  if (!initial || Object.values(lists).some(list => !Array.isArray(list) || list.some(item => typeof item.id !== 'string' || typeof item.label !== 'string')) || new Set(Object.values(lists).flat().map(i => i.id)).size !== Object.values(lists).flat().length) throw Error('Invalid fixture boards');
  return {dispatch,snapshot};
}
