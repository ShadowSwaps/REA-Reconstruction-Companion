import {isDeepStrictEqual} from 'node:util';
// One declared Ctrl-only teaching profile, not a platform shortcut resolver.
export function createRouter(initial, effects) {
  let context = structuredClone(initial), pending = null, decision = {command:null,consumed:false,reason:'unmapped'};
  const held = new Set(), seen = new Set();
  const applicable = command => {
    if (command === 'save') return !context.dialog && context.saveEnabled && context.focus !== 'none';
    if (command === 'request-delete' || command === 'next') return !context.dialog && context.focus === 'list' && context.selection.length > 0;
    if (command === 'confirm-delete') return context.dialog && context.focus === 'confirm' && context.selection.length > 0;
    if (command === 'cancel') return context.dialog;
    return false;
  };
  const snapshot = () => structuredClone({context,pending,held:[...held],seen:[...seen],decision});
  const reject = reason => { decision = {command:null,consumed:false,reason}; };
  function route(command, repeat = false) {
    if (pending) { reject('pending'); return; }
    if (!applicable(command)) { reject('inapplicable'); return; }
    if (repeat && command !== 'next') { reject('repeat'); return; }
    pending = {command,context:structuredClone(context)};
    decision = {command,consumed:true,reason:'routed'};
  }
  return {snapshot,dispatch(action) {
    if (action.type === 'key') {
      if (seen.has(action.id)) { reject('duplicate'); return snapshot(); }
      seen.add(action.id);
      const repeat = action.repeat || held.has(action.code); held.add(action.code);
      if (action.composing) reject('composition');
      else if (action.defaultPrevented) reject('already-consumed');
      else {
        let command = null;
        if (!action.meta && !action.alt && !action.altGraph && !action.shift) {
          if (action.ctrl && action.key.toLowerCase() === 's') command = 'save';
          else if (!action.ctrl) {
            if (action.key === 'Delete') command = 'request-delete';
            if (action.key === 'ArrowDown') command = 'next';
            if (action.key === 'Enter' && context.dialog) command = 'confirm-delete';
            if (action.key === 'Escape' && context.dialog) command = 'cancel';
          }
        }
        if (command) route(command,repeat); else reject('unmapped');
      }
    } else if (action.type === 'command') route(action.command);
    else if (action.type === 'release') held.delete(action.code);
    else if (action.type === 'context') context = {...context,...structuredClone(action.patch)};
    else if (action.type === 'cancel-pending') { pending = null; reject('cancelled'); }
    else if (action.type === 'blur') { pending = null; held.clear(); context.focus = 'none'; reject('blur'); }
    else if (action.type === 'commit') {
      if (pending) {
        const captured = pending; pending = null;
        if (!isDeepStrictEqual(captured.context,context) || !applicable(captured.command)) {
          decision = {command:captured.command,consumed:false,reason:'stale'};
        } else {
          // No await/callback between this recheck and the synchronous synthetic sink.
          const command = captured.command;
          effects.apply(command,structuredClone(context));
          if (command === 'request-delete') context = {...context,dialog:true,focus:'confirm'};
          if (command === 'cancel') context = {...context,dialog:false,focus:'list'};
          if (command === 'confirm-delete') context = {...context,dialog:false,focus:'list',selection:[],revision:context.revision+1};
          if (command === 'next') context.selection = [{a:'b',b:'c',c:'c'}[context.selection[0]]];
          decision = {command,consumed:true,reason:'applied'};
        }
      }
    } else throw Error('Unknown fixture action');
    return snapshot();
  }};
}
