// Finite proposed composition. Context/grants are synthetic, never trusted auth.
export function createWorkflow(adapter) {
  const state={scope:'a/x',session:1,active:true,read:true,write:true,lifetime:1,
    entries:[{key:1,url:'/items/a'}],index:0,data:null,draft:null,
    loading:null,saving:null,departure:null,notice:'ready'};
  const retained=new Map(),ledgers=new Map(),operations=new Map();
  let nextOperation=1,nextDeparture=1,nextKey=2;
  const url=()=>state.entries[state.index].url;
  const ownerKey=(scope=state.scope,resource=url())=>JSON.stringify([scope,resource]);
  const ledger=(key=ownerKey())=>{if (!ledgers.has(key)) ledgers.set(key,[]);return ledgers.get(key);};
  const readable=()=>state.active && state.read === true;
  const writable=()=>readable() && state.write === true;
  const dirty=()=>state.draft !== null && state.draft.revision !== state.draft.savedRevision;
  const unresolved=()=>ledger().some(row=>['pending','unknown'].includes(row.status));
  const blocked=()=>{state.notice='blocked';};
  function capture() {return {op:nextOperation++,scope:state.scope,session:state.session,lifetime:state.lifetime,url:url()};}
  function applicable(c) {return readable() && c.scope === state.scope && c.session === state.session && c.lifetime === state.lifetime && c.url === url();}
  function startRead() {
    const c=capture();state.loading=c.op;state.notice='loading';
    const chain=adapter.read(c).then(value=>{
      if (value !== null && (typeof value?.text !== 'string' || !Number.isSafeInteger(value.version) || value.version < 1)) throw Error('Invalid fixture read');
      if (!applicable(c)) return;
      state.data=structuredClone(value);
      state.draft=value === null ? null : {text:value.text,revision:0,savedRevision:0,base:value.version};
      state.notice=value === null ? 'missing' : 'loaded';
    },()=>{if (applicable(c)) state.notice='read-error';}).finally(()=>{
      if (applicable(c) && state.loading === c.op) state.loading=null;
    });operations.set(c.op,chain);
  }
  function commitNavigation(intent) {
    // Called only after the proposal's revision/lifetime and decision are checked.
    if (intent.kind === 'traverse') state.index=state.entries.findIndex(row=>row.key === intent.key);
    else if (intent.kind === 'replace') state.entries[state.index]={key:state.entries[state.index].key,url:intent.url};
    else {state.entries.splice(state.index+1);state.entries.push({key:nextKey++,url:intent.url});state.index++;}
    state.lifetime++;state.data=null;state.draft=null;state.loading=null;state.saving=null;state.departure=null;
    const entry=state.entries[state.index];
    adapter.history({navigation:intent.kind,key:entry.key,url:entry.url,index:state.index,scope:state.scope,session:state.session});
    startRead();state.notice='navigated';
  }
  function startWrite(departure=null) {
    if (!writable() || !state.draft) {blocked();return;}
    if (unresolved()) {state.notice='unresolved';return;}
    if (state.data?.version !== state.draft.base || ledger().some(row=>row.status === 'saved' && row.version > state.draft.base)) {state.notice='conflict';return;}
    if (!dirty()) {if (departure) commitNavigation(departure);return;}
    const c={...capture(),text:state.draft.text,revision:state.draft.revision,base:state.draft.base,departure:departure?.id ?? null};
    const record={op:c.op,url:c.url,text:c.text,revision:c.revision,base:c.base,status:'pending',version:null};
    ledger().push(record);state.saving=c.op;state.notice='saving';
    const chain=adapter.write(c).then(value=>{
      if (!['saved','denied','conflict'].includes(value?.status) ||
          (value.status !== 'denied' && (!Number.isSafeInteger(value.version) || value.version < 1)) ||
          (value.status === 'denied' && value.version !== null)) throw Error('Invalid fixture receipt');
      record.status=value.status;record.version=value.version;
      if (!applicable(c) || !writable()) return;
      if (value.status !== 'saved') {state.notice=value.status;return;}
      state.data={text:c.text,version:value.version};
      state.draft.savedRevision=c.revision;state.draft.base=value.version;
      retained.set(ownerKey(),structuredClone(state.draft));
      state.notice=dirty() ? 'older-save' : 'saved';
      const intent=state.departure;
      if (!dirty() && intent?.id === c.departure && intent.sourceLifetime === state.lifetime && intent.sourceRevision === state.draft.revision) commitNavigation(intent);
    },()=>{
      record.status='unknown';record.version=null;
      if (applicable(c)) state.notice='unknown';
    }).finally(()=>{
      if (applicable(c) && state.saving === c.op) state.saving=null;
    });operations.set(c.op,chain);
  }
  function request(intent) {
    if (!readable()) {blocked();return;}
    if (intent.kind !== 'traverse' && intent.url === url()) {state.notice='unchanged';return;}
    if (dirty() || state.saving !== null || unresolved()) {
      state.departure={id:nextDeparture++,...intent,sourceLifetime:state.lifetime,sourceRevision:state.draft?.revision ?? null};
      state.notice='review';return;
    }
    commitNavigation(intent);
  }
  return {
    dispatch(action) {
      switch(action.type) {
        case 'context':
          if (typeof action.scope !== 'string' || typeof action.active !== 'boolean') throw Error('Invalid fixture context');
          // Invalidation never cancels work at the service, including writes.
          for (const rows of ledgers.values()) for (const row of rows) if (row.status === 'pending') row.status='unknown';
          state.scope=action.scope;state.session++;state.lifetime++;
          state.active=action.active;state.read=action.read;state.write=action.write;
          state.entries=[{key:1,url:'/items/a'}];state.index=0;nextKey=2;
          state.data=null;state.draft=null;state.loading=null;state.saving=null;state.departure=null;state.notice='context-changed';break;
        case 'read':
          if (!readable() || state.loading !== null || state.saving !== null || state.draft !== null) {blocked();break;}
          startRead();break;
        case 'edit':
          if (!writable() || !state.draft) {blocked();break;}
          if (typeof action.text !== 'string') throw Error('Invalid fixture edit');
          if (action.text === state.draft.text) break;
          state.draft.text=action.text;state.draft.revision++;
          retained.set(ownerKey(),structuredClone(state.draft));state.notice='edited';break;
        case 'save':startWrite();break;
        case 'restore': {
          if (!readable() || !state.draft || dirty() || state.loading !== null || state.saving !== null) {blocked();break;}
          const draft=retained.get(ownerKey());
          if (!draft) {state.notice='no-draft';break;}
          state.draft=structuredClone(draft);state.notice='restored';break;
        }
        case 'navigate':
          if (!['push','replace'].includes(action.kind)) throw Error('Invalid fixture navigation kind');
          if (!/^\/items\/[abc]$/.test(action.url)) {state.notice='invalid';break;}
          request({kind:action.kind,url:action.url,key:null});break;
        case 'traverse': {
          if (!Number.isSafeInteger(action.delta)) throw Error('Invalid fixture delta');
          const index=state.index+action.delta,entry=state.entries[index];
          if (!entry || index === state.index) {state.notice='boundary';break;}
          request({kind:'traverse',url:entry.url,key:entry.key});break;
        }
        case 'choose': {
          if (!['save','discard','cancel'].includes(action.choice)) throw Error('Invalid fixture choice');
          const intent=state.departure;
          if (!intent || intent.id !== action.id) {state.notice='stale-choice';break;}
          if (action.choice === 'cancel') {state.departure=null;state.notice='cancelled';break;}
          if (intent.sourceLifetime !== state.lifetime || intent.sourceRevision !== state.draft?.revision) {state.departure=null;state.notice='stale-departure';break;}
          if (!readable()) {blocked();break;}
          if (unresolved()) {state.notice='unresolved';break;}
          if (action.choice === 'save') startWrite(intent);
          else {retained.delete(ownerKey());commitNavigation(intent);}
          break;
        }
        default:throw Error('Unknown fixture action');
      }
    },
    snapshot() {return structuredClone({...state,dirty:dirty(),outcomes:readable() ? ledger() : []});},
    async settle(op) {if (!operations.has(op)) throw Error('Unknown fixture operation');await operations.get(op);}
  };
}
