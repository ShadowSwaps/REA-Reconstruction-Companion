import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createNavigator,parseRoute} from '../evals/navigation-history/candidate.mjs';
import {controlledAdapter} from '../evals/navigation-history/double.mjs';
import {compare,frozen} from '../evals/navigation-history/check.mjs';
const oracle=frozen(), controls=oracle.cases.filter(row=>row.ordinary);
const source=fs.readFileSync(new URL('../evals/navigation-history/candidate.mjs',import.meta.url),'utf8');
const double=fs.readFileSync(new URL('../evals/navigation-history/double.mjs',import.meta.url),'utf8');
test('33 route, history and lifecycle scenarios match 94 literal full states and adapter effects',async()=>{
  assert.equal(new Set(oracle.cases.map(row=>row.family)).size,3);
  const rows=await compare(); assert.equal(rows.length,94); assert.deepEqual(rows.filter(row=>!row.passed),[]);
});
const faults=[
  {id:'filter-dropped',scenario:'filter-and-selection',step:0,from:"const filter = query.find(([key]) => key === 'filter')?.[1] ?? 'all';",to:"const filter = 'all';"},
  {id:'unknown-query-accepted',scenario:'unknown-query',step:1,from:"if (query.some(([key]) => key !== 'filter')) return null;",to:''},
  {id:'duplicate-query-accepted',scenario:'duplicate-query',step:1,from:'query.length !== 1',to:'query.length < 1'},
  {id:'unknown-filter-accepted',scenario:'unknown-filter',step:1,from:"if (!['all','open','closed'].includes(filter)) return null;",to:''},
  {id:'same-url-pushed',scenario:'same-url-noop',step:1,from:"intent.kind !== 'traverse' && intent.url === state.entries[state.index].url",to:'false'},
  {id:'replace-pushes',scenario:'replace-entry',step:1,from:"else if (intent.kind === 'replace')",to:'else if (false)'},
  {id:'traversal-loses-scroll',scenario:'back-forward-scroll',step:4,from:"if (intent.kind === 'traverse') state.index = intent.index;",to:"if (intent.kind === 'traverse') { state.index = intent.index; state.entries[state.index].scroll = 0; }"},
  {id:'forward-branch-retained',scenario:'branch-truncates-forward',step:2,from:'state.entries.splice(state.index + 1);',to:''},
  {id:'url-used-as-entry-identity',scenario:'same-url-distinct-entry',step:1,from:'key:nextKey++',to:'key:state.entries.find(entry => entry.url === intent.url)?.key ?? nextKey++'},
  {id:'stale-success-applied',scenario:'stale-success',step:1,from:"if (!applicable()) return;\n      if (value",to:'if (value'},
  {id:'stale-error-applied',scenario:'stale-error',step:1,from:"if (!applicable()) return;\n      state.status = 'error';",to:"state.status = 'error';"},
  {id:'stale-finalizer-clears-loading',scenario:'stale-success',step:1,from:'if (applicable()) state.loading = false;',to:'state.loading = false;'},
  {id:'route-equality-misses-new-lifetime',scenario:'return-same-route-new-epoch',step:2,from:'const applicable = () => epoch === state.epoch;',to:'const applicable = () => route.item === state.route.item && route.filter === state.route.filter;'},
  {id:'dirty-guard-bypassed',scenario:'dirty-cancel-push',step:2,from:'if (state.draft?.dirty)',to:'if (false)'},
  {id:'pending-destination-replaced',scenario:'dirty-discard-once',step:3,from:"if (state.pending) { state.notice = 'pending'; return; }",to:''},
  {id:'cancel-retains-destination',scenario:'dirty-cancel-push',step:3,from:"case 'cancel': state.pending = null;",to:"case 'cancel':"},
  {id:'newer-edit-discarded',scenario:'edit-invalidates-leave',step:4,from:' || intent.sourceRevision !== state.draft?.revision',to:''},
  {id:'duplicate-history-effect',sink:true,scenario:'back-forward-scroll',step:4,from:'history(kind,key,url,index) { records.push({kind,key,url,index}); }',to:"history(kind,key,url,index) { records.push({kind,key,url,index}); if (kind === 'traverse') records.push({kind,key,url,index}); }"}
];
for (const fault of faults) test(`ordinary controls pass before named mismatch: ${fault.id}`,async t=>{
  let code=fault.sink ? double : source;
  assert.equal(code.split(fault.from).length,2,'unique intentional mutation');
  code=code.replace(fault.from,fault.to);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-navigation-mutant-'));
  t.after(()=>{assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});});
  const file=path.join(dir,'mutant.mjs'); fs.writeFileSync(file,code);
  const mutant=await import(pathToFileURL(file));
  const factory=fault.sink ? createNavigator : mutant.createNavigator;
  const adapter=fault.sink ? mutant.controlledAdapter : controlledAdapter;
  const ordinary=await compare(factory,controls,adapter);
  assert.equal(ordinary.length,5);assert.ok(ordinary.every(row=>row.passed),'ordinary controls');
  const scenario=oracle.cases.find(row=>row.id===fault.scenario);
  const rows=await compare(factory,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}],adapter);
  assert.ok(rows.slice(0,-1).every(row=>row.passed),'earlier checkpoints match');
  assert.equal(rows.at(-1).passed,false,'actual mismatch, not harness failure');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:5,distinguishing:rows.at(-1)}));
});
test('each state field and independently recorded effects participate in comparison',async()=>{
  for (const field of Object.keys(oracle.cases[0].steps[0].expected)) {
    const rows=await compare((url,adapter)=>{
      const nav=createNavigator(url,adapter);return {...nav,snapshot:()=>({...nav.snapshot(),[field]:'wrong'})};
    },controls);
    assert.ok(rows.some(row=>!row.passed),field);
  }
  const scenario=oracle.cases.find(row=>row.id==='back-forward-scroll');
  const rows=await compare(createNavigator,[scenario],()=>{
    const adapter=controlledAdapter();return {...adapter,inspect:()=>adapter.inspect().filter(row=>row.kind!=='traverse')};
  });
  assert.deepEqual(rows[4].actual,rows[4].expected);assert.equal(rows[4].passed,false);
});
test('owned snapshots, adapter failures and invalid fixture operations stay visible',async()=>{
  const adapter=controlledAdapter(),nav=createNavigator('/items/a',adapter);
  const snapshot=nav.snapshot();snapshot.entries[0].url='/items/b';snapshot.route.item='b';
  assert.equal(nav.snapshot().route.item,'a'); assert.equal(nav.snapshot().entries[0].url,'/items/a');
  const effects=adapter.inspect();effects[0].url='changed';assert.equal(adapter.inspect()[0].url,'/items/a');
  assert.throws(()=>nav.dispatch({type:'unknown'}),/Unknown fixture action/);
  assert.throws(()=>adapter.finish(99,''),/Unknown or completed/);
  await assert.rejects(nav.settle(99),/Unknown fixture operation/);
  adapter.finish(1,{invalid:true});await assert.rejects(nav.settle(1),/Invalid fixture payload/);
  await assert.rejects(compare(()=>{throw Error('factory failure');}),/factory failure/);
  assert.throws(()=>createNavigator('/items/a',{read(){throw Error('adapter failed');}}),/adapter failed/);
});
test('invalid initial links fail explicitly, and route canonicalization preserves selected identity',()=>{
  for (const url of ['/items\n',' /items','/items/%GG','/items/..','/items/a%2Fb','/items?filter=open&filter=closed','/items?draft=x','//host/items/a','/items/a?','/items/a#part']) {
    assert.equal(parseRoute(url),null,url);assert.throws(()=>createNavigator(url,controlledAdapter()),/Invalid initial route/);
  }
  assert.deepEqual(parseRoute('/items/%61?filter=all'),{url:'/items/a',route:{item:'a',filter:'all'}});
  assert.deepEqual(parseRoute('/items/b?filter=closed'),{url:'/items/b?filter=closed',route:{item:'b',filter:'closed'}});
});
