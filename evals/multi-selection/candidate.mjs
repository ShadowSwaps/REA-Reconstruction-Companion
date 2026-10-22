// One finite proposed local contract, not a production batch/transaction API.
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const validRow = row => Array.isArray(row) && row.length === 4 &&
  typeof row[0] === 'string' && /^[a-z]{1,8}$/.test(row[0]) && ['x','y'].includes(row[1]) &&
  Number.isSafeInteger(row[2]) && row[2] >= 0 && row[2] < 100 && Number.isSafeInteger(row[3]) && row[3] > 0;
export function createBatch(initial, service) {
  if (!Array.isArray(initial) || !initial.every(validRow) || new Set(initial.map(row => row[0])).size !== initial.length) throw Error('Invalid fixture');
  let rows = structuredClone(initial), selection = [], view = {filter:null,page:0,order:'asc'};
  const usedIds = new Set(rows.map(row => row[0]));
  let preview = null, report = [], retry = null, history = [], status = 'ok';
  const find = id => rows.find(row => row[0] === id);
  function filtered() {
    const ids = rows.filter(row => view.filter === null || row[1] === view.filter).map(row => row[0]).sort();
    return view.order === 'desc' ? ids.reverse() : ids;
  }
  const visible = () => filtered().slice(view.page*2,view.page*2+2);
  function scopeIds(scope) {
    const ids = scope === 'selected' ? selection : scope === 'page' ? visible() : scope === 'filtered' ? filtered() : null;
    return ids && [...ids].sort();
  }
  function snapshot() {
    return structuredClone({rows,selection,view:{...view,visible:visible()},preview,report,history:history.length,status});
  }
  function run(plan, isRetry) {
    const results = plan.targets.map(([id,value,revision]) => {
      const row = find(id);
      return [id,!row ? 'missing' : row[3] !== revision || row[2] !== value || row[2] >= 99 || row[3] >= Number.MAX_SAFE_INTEGER-1 ? 'stale' : 'ready'];
    });
    const eligible = results.filter(row => row[1] === 'ready');
    // Atomic local prevalidation refuses dispatch when any target is inapplicable.
    if (plan.mode === 'atomic' && eligible.length !== results.length) {
      for (const result of results) if (result[1] === 'ready') result[1] = 'skipped';
    } else if (eligible.length) {
      const outcomes = service.attempt(eligible.map(row => row[0]),plan.mode);
      if (!Array.isArray(outcomes) || outcomes.length !== eligible.length || outcomes.some(value => !['success','retryable','refused','unknown'].includes(value))) throw Error('Invalid service result');
      eligible.forEach((row,i) => { row[1] = outcomes[i]; });
    }
    const commit = plan.mode !== 'atomic' || results.every(row => row[1] === 'success');
    if (!commit) for (const result of results) if (result[1] === 'success') result[1] = 'rolled-back';
    const entries = [];
    for (const [id,outcome] of results) if (outcome === 'success') {
      const row = find(id), before = [...row];
      row[2] += 1; row[3] += 1;
      entries.push({before,after:[...row]});
    }
    if (entries.length) {
      if (plan.undo === 'grouped') history.push(entries);
      else history.push(...entries.map(entry => [entry]));
    }
    report = isRetry ? report.map(prior => results.find(row => row[0] === prior[0]) ?? prior) : results;
    retry = plan.mode === 'best-effort' ? {...plan,targets:plan.targets.filter(([id]) => results.some(row => row[0] === id && row[1] === 'retryable'))} : null;
    status = report.every(row => row[1] === 'success') ? 'complete' : report.some(row => row[1] === 'success') ? 'partial' : 'retained';
  }
  function dispatch(action) {
    status = 'ok';
    switch (action.type) {
      case 'view':
        if (![null,'x','y'].includes(action.filter) || !Number.isSafeInteger(action.page) || action.page < 0 || !['asc','desc'].includes(action.order)) { status = 'rejected'; break; }
        view = {filter:action.filter,page:action.page,order:action.order}; break;
      case 'select': {
        const ids = action.scope === 'ids' ? action.ids : scopeIds(action.scope);
        if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !find(id))) { status = 'rejected'; break; }
        selection = [...ids].sort(); break;
      }
      case 'preview': {
        preview = null; retry = null;
        const ids = scopeIds(action.scope);
        if (!ids || !['atomic','best-effort'].includes(action.mode) || !['grouped','per-item'].includes(action.undo)) { status = 'rejected'; break; }
        report = [];
        if (!ids.length) { status = 'empty'; break; }
        preview = {scope:action.scope,mode:action.mode,undo:action.undo,targets:ids.map(id => { const row = find(id); return [id,row?.[2] ?? null,row?.[3] ?? null]; })};
        status = 'preview'; break;
      }
      case 'cancel': preview = null; retry = null; status = 'cancelled'; break;
      case 'confirm': {
        if (!preview) { status = 'no-preview'; break; }
        const plan = preview; preview = null; run(plan,false); break;
      }
      case 'retry': {
        if (!retry?.targets.length) { status = 'no-retry'; break; }
        const plan = retry; retry = null; run(plan,true); break;
      }
      case 'edit': {
        const row = find(action.id);
        if (!row || !Number.isSafeInteger(action.value) || action.value < 0 || action.value >= 100 || row[3] >= Number.MAX_SAFE_INTEGER-1) { status = 'rejected'; break; }
        row[2] = action.value; row[3] += 1; break;
      }
      case 'add':
        if (!validRow(action.row) || usedIds.has(action.row[0])) { status = 'rejected'; break; }
        rows.push(structuredClone(action.row)); usedIds.add(action.row[0]); break;
      case 'remove':
        if (!find(action.id)) { status = 'rejected'; break; }
        rows = rows.filter(row => row[0] !== action.id); break;
      case 'undo': {
        const entry = history.at(-1);
        if (!entry) { status = 'empty-history'; break; }
        if (entry.some(item => !equal(find(item.after[0]),item.after) || item.after[3] >= Number.MAX_SAFE_INTEGER-1)) { status = 'undo-conflict'; break; }
        for (const item of entry) {
          const row = find(item.after[0]);
          row[2] = item.before[2]; row[3] += 1;
        }
        history.pop(); status = 'undone'; break;
      }
      default: throw Error('Unsupported fixture action');
    }
    return snapshot();
  }
  return {snapshot,dispatch};
}
