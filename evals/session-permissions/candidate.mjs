// Synthetic local policy only. All identity/grant fields are fixture input.
export function createSession(adapter) {
  const state={scope:'a/x',epoch:1,active:true,read:true,write:true,data:null,cache:null,
    draft:null,loading:false,saving:false,notice:'ready'};
  const owners=new Map(), operations=new Map(); let next=1;
  const owner=scope=>{
    if (!owners.has(scope)) owners.set(scope,{draft:null,outcomes:[]});
    return owners.get(scope);
  };
  const readable=()=>state.active && state.read === true;
  const writable=()=>readable() && state.write === true;
  const blocked=()=>{state.notice='blocked';};
  function start(kind) {
    const op=next++, scope=state.scope, epoch=state.epoch;
    const captured=structuredClone(state.draft);
    const applicable=()=>scope === state.scope && epoch === state.epoch && readable();
    const record=kind === 'write' ? {op,text:captured.text,revision:captured.revision,status:'pending'} : null;
    if (record) owner(scope).outcomes.push(record);
    state[kind === 'read' ? 'loading' : 'saving']=true;
    state.notice=kind === 'read' ? 'loading' : 'saving';
    const promise=adapter[kind]({op,scope,epoch,...(kind === 'write' ? {text:captured.text} : {})});
    // Failure handler covers adapter rejection only; malformed success must propagate.
    const chain=promise.then(value=>{
      if (kind === 'read') {
        if (typeof value !== 'string') throw Error('Invalid fixture read');
        if (!applicable()) return;
        state.data=value;state.cache=value;
        state.draft={text:value,revision:0,saved:value};state.notice='loaded';
      } else {
        if (!['saved','denied'].includes(value)) throw Error('Invalid fixture receipt');
        record.status=value;
        if (!applicable() || !writable()) return;
        if (value === 'denied') {state.notice='denied';return;}
        if (state.draft?.revision !== captured.revision) {state.notice='older-save';return;}
        state.data=captured.text;state.cache=captured.text;
        state.draft.saved=captured.text;owner(scope).draft=structuredClone(state.draft);
        state.notice='saved';
      }
    },()=>{
      if (record) record.status='unknown';
      if (!applicable()) return;
      state.notice=kind === 'read' ? 'read-error' : 'unknown';
    }).finally(()=>{
      if (applicable()) state[kind === 'read' ? 'loading' : 'saving']=false;
    });
    operations.set(op,chain);
  }
  return {
    dispatch(action) {
      switch(action.type) {
        case 'context': {
          // Retained payloads stay scoped; invalidation says nothing about service cancellation.
          for (const row of owner(state.scope).outcomes) if (row.status === 'pending') row.status='unknown';
          state.scope=action.scope ?? 'a/x';state.active=action.active ?? true;
          state.read=Object.hasOwn(action,'read') ? action.read : true;
          state.write=Object.hasOwn(action,'write') ? action.write : true;
          state.epoch++;
          state.data=null;state.cache=null;state.draft=null;
          state.loading=false;state.saving=false;state.notice='context-changed';
          break;
        }
        case 'read':
          if (!readable() || state.loading || state.saving || state.draft !== null) {blocked();break;}
          start('read');break;
        case 'edit':
          if (!writable() || !state.draft) {blocked();break;}
          if (typeof action.text !== 'string') throw Error('Invalid fixture edit');
          state.draft.text=action.text;state.draft.revision++;
          owner(state.scope).draft=structuredClone(state.draft);state.notice='edited';break;
        case 'restore': {
          if (!readable() || state.data === null || state.loading || state.saving || state.draft?.text !== state.draft?.saved) {blocked();break;}
          const retained=owner(state.scope).draft;
          if (!retained) {state.notice='no-draft';break;}
          state.draft=structuredClone(retained);state.notice='restored';break;
        }
        case 'save':
          if (!writable() || !state.draft) {blocked();break;}
          if (owner(state.scope).outcomes.some(row=>['pending','unknown'].includes(row.status))) {state.notice='unresolved';break;}
          if (state.data !== state.draft.saved) {state.notice='conflict';break;}
          start('write');break;
        default: throw Error('Unknown fixture action');
      }
    },
    snapshot() {return structuredClone({...state,outcomes:readable() ? owner(state.scope).outcomes : []});},
    async settle(op) {
      if (!operations.has(op)) throw Error('Unknown fixture operation');
      await operations.get(op);
    }
  };
}
