// Proposed finite teaching policy, not a browser/router or persistence adapter.
export function parseRoute(input) {
  if (typeof input !== 'string') return null;
  if (/[\u0000-\u0020\u007f]/.test(input)) return null;
  const match = /^\/items(?:\/([^/?#]+))?(?:\?([^#]*))?$/.exec(input);
  if (!match) return null;
  let item = null;
  if (match[1] !== undefined) {
    try { item = decodeURIComponent(match[1]); } catch { return null; }
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(item)) return null;
  }
  const query = [...new URLSearchParams(match[2] ?? '')];
  if (match[2] !== undefined && (!match[2] || query.length !== 1)) return null;
  if (query.some(([key]) => key !== 'filter')) return null;
  const filter = query.find(([key]) => key === 'filter')?.[1] ?? 'all';
  if (!['all','open','closed'].includes(filter)) return null;
  const url = `/items${item === null ? '' : `/${item}`}${filter === 'all' ? '' : `?filter=${filter}`}`;
  return {url,route:{item,filter}};
}

export function createNavigator(initialUrl, adapter) {
  const initial = parseRoute(initialUrl);
  if (!initial) throw Error('Invalid initial route');
  let nextKey = 2;
  const operations = new Map();
  const state = {entries:[{key:1,url:initial.url,scroll:0}],index:0,epoch:1,
    route:initial.route,status:'loading',loading:true,data:null,draft:null,pending:null,notice:'boot'};
  const snapshot = () => structuredClone(state);
  function load() {
    const epoch = state.epoch, route = structuredClone(state.route);
    const applicable = () => epoch === state.epoch;
    const operation = adapter.read(epoch,state.entries[state.index].url).then(value => {
      if (!applicable()) return;
      if (value !== null && typeof value !== 'string') throw Error('Invalid fixture payload');
      state.status = value === null ? 'not-found' : 'ready';
      state.data = value;
      state.draft = value !== null && route.item !== null
        ? {item:route.item,text:value,revision:0,dirty:false} : null;
    }, () => {
      if (!applicable()) return;
      state.status = 'error'; state.data = null; state.draft = null;
    }).finally(() => {
      if (applicable()) state.loading = false;
    });
    operations.set(epoch,operation);
  }
  function commit(intent) {
    if (intent.kind === 'traverse') state.index = intent.index;
    else if (intent.kind === 'replace') {
      state.entries[state.index] = {key:state.entries[state.index].key,url:intent.url,scroll:0};
    } else {
      state.entries.splice(state.index + 1);
      state.entries.push({key:nextKey++,url:intent.url,scroll:0});
      state.index++;
    }
    state.epoch++;
    state.route = parseRoute(intent.url).route;
    state.status = 'loading'; state.loading = true; state.data = null; state.draft = null;
    state.pending = null; state.notice = 'committed';
    const entry = state.entries[state.index];
    adapter.history(intent.kind,entry.key,entry.url,state.index);
    load();
  }
  function request(intent) {
    if (state.pending) { state.notice = 'pending'; return; }
    if (intent.kind !== 'traverse' && intent.url === state.entries[state.index].url) {
      state.notice = 'unchanged'; return;
    }
    if (state.draft?.dirty) {
      state.pending = {...intent,sourceEpoch:state.epoch,sourceRevision:state.draft.revision};
      state.notice = 'blocked'; return;
    }
    commit(intent);
  }
  function dispatch(action) {
    switch (action.type) {
      case 'navigate': {
        if (!['push','replace'].includes(action.kind)) throw Error('Unknown navigation kind');
        const target = parseRoute(action.url);
        if (!target) { state.notice = 'invalid'; break; }
        request({kind:action.kind,url:target.url,index:null}); break;
      }
      case 'traverse': {
        if (!Number.isSafeInteger(action.delta)) throw Error('Invalid fixture delta');
        const index = state.index + action.delta;
        if (index < 0 || index >= state.entries.length || index === state.index) { state.notice = 'boundary'; break; }
        request({kind:'traverse',url:state.entries[index].url,index}); break;
      }
      case 'scroll':
        if (!Number.isSafeInteger(action.value) || action.value < 0) throw Error('Invalid fixture scroll');
        state.entries[state.index].scroll = action.value; state.notice = 'scrolled'; break;
      case 'edit':
        if (typeof action.text !== 'string') throw Error('Invalid fixture text');
        if (!state.draft || state.status !== 'ready') { state.notice = 'unavailable'; break; }
        state.draft.text = action.text; state.draft.revision++;
        state.draft.dirty = action.text !== state.data; state.notice = 'edited'; break;
      case 'cancel': state.pending = null; state.notice = 'cancelled'; break;
      case 'discard': {
        const intent = state.pending;
        if (!intent) { state.notice = 'no-pending'; break; }
        state.pending = null;
        if (intent.sourceEpoch !== state.epoch || intent.sourceRevision !== state.draft?.revision) {
          state.notice = 'stale'; break;
        }
        commit(intent); break;
      }
      default: throw Error('Unknown fixture action');
    }
    return snapshot();
  }
  load();
  return {snapshot,dispatch,async settle(op) {
    if (!operations.has(op)) throw Error('Unknown fixture operation');
    await operations.get(op);
  }};
}
