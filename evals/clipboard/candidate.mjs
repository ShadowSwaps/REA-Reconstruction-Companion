import {isDeepStrictEqual as equal} from 'node:util';

// Finite proposed teaching policy, not an original editor or platform adapter.
export function createEditor(initial, clipboard) {
  let docs = structuredClone(initial), status = 'ready', nextId = 1, nextToken = 1;
  const undo = [], redo = [], pending = new Map(), consumed = new Set();
  const snapshot = () => structuredClone({docs, history:[undo.length,redo.length], status});
  const validText = text => typeof text === 'string' && text.length <= 64;
  const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && equal(Object.keys(value).sort(),expected.sort());
  function decode(value) {
    if (keys(value,['format','text']) && value.format === 'text' && validText(value.text)) return {items:[[null,value.text]]};
    if (!value || !keys(value,value.move === undefined ? ['format','version','items'] : ['format','version','items','move']) ||
        value.format !== 'items' || value.version !== 1 || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 3) return null;
    if (!value.items.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && item[0].length > 0 && item[0].length <= 64 && validText(item[1]))) return null;
    if (new Set(value.items.map(item => item[0])).size !== value.items.length) return null;
    if (value.move !== undefined && (!keys(value.move,['token','source']) || !Number.isSafeInteger(value.move.token) || typeof value.move.source !== 'string')) return null;
    return value;
  }
  function commit(before) { undo.push({before,after:structuredClone(docs)}); redo.length = 0; }
  function dispatch(action) {
    switch (action.type) {
      case 'copy': case 'cut': {
        const source = docs[action.owner];
        if (!source || !Array.isArray(action.ids) || action.ids.length < 1 || new Set(action.ids).size !== action.ids.length || action.ids.some(id => !source.some(item => item[0] === id))) { status = 'rejected'; break; }
        // Source document order wins over selection enumeration order.
        const items = source.filter(item => action.ids.includes(item[0]));
        const value = {format:'items',version:1,items:structuredClone(items)};
        if (action.type === 'cut') value.move = {token:nextToken++,source:action.owner};
        if (!decode(value)) { status = 'rejected'; break; }
        try { clipboard.write(value); }
        catch (error) { if (error.code !== 'CLIPBOARD_REJECTED') throw error; status = 'clipboard-rejected'; break; }
        if (action.type === 'cut') pending.set(value.move.token,{value:structuredClone(value),source:structuredClone(source)});
        status = action.type === 'cut' ? 'cut-pending' : 'copied';
        break;
      }
      case 'paste': {
        let value;
        try { value = clipboard.read(); }
        catch (error) { if (error.code !== 'CLIPBOARD_REJECTED') throw error; status = 'clipboard-rejected'; break; }
        const fragment = decode(value), destination = docs[action.owner];
        if (!fragment || !destination || !Number.isInteger(action.at) || action.at < 0 || action.at > destination.length || !Array.isArray(action.replace) ||
            !equal(destination.slice(action.at,action.at + action.replace.length).map(item => item[0]),action.replace)) { status = 'rejected'; break; }
        const move = fragment.move, ticket = move && pending.get(move.token);
        // An untrusted clipboard cannot mint local deletion authority.
        if (move && (!ticket || consumed.has(move.token) || !equal(ticket.value,fragment) || !equal(ticket.source,docs[move.source]) || move.source === action.owner)) { status = 'rejected'; break; }
        const before = structuredClone(docs);
        const inserted = move ? structuredClone(fragment.items) : fragment.items.map(item => ['n'+nextId++,item[1]]);
        if (move) docs[move.source] = docs[move.source].filter(item => !fragment.items.some(selected => selected[0] === item[0]));
        destination.splice(action.at,action.replace.length,...inserted);
        if (move) consumed.add(move.token);
        commit(before); status = move ? 'moved' : 'pasted';
        break;
      }
      case 'edit': {
        const item = docs[action.owner]?.find(item => item[0] === action.id);
        if (!item || !validText(action.text)) { status = 'rejected'; break; }
        if (item[1] === action.text) { status = 'unchanged'; break; }
        const before = structuredClone(docs); item[1] = action.text; commit(before); status = 'edited'; break;
      }
      case 'undo': {
        const entry = undo.pop();
        if (!entry) { status = 'unchanged'; break; }
        docs = structuredClone(entry.before); redo.push(entry); status = 'undone'; break;
      }
      case 'redo': {
        const entry = redo.pop();
        if (!entry) { status = 'unchanged'; break; }
        docs = structuredClone(entry.after); undo.push(entry); status = 'redone'; break;
      }
      default: throw Error('Unsupported finite action');
    }
    return snapshot();
  }
  return {snapshot,dispatch};
}
