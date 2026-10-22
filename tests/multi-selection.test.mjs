import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createBatch} from '../evals/multi-selection/candidate.mjs';
import {recordingBatch} from '../evals/multi-selection/double.mjs';
import {frozen,compare} from '../evals/multi-selection/check.mjs';
const oracle = frozen(), source = fs.readFileSync(new URL('../evals/multi-selection/candidate.mjs',import.meta.url),'utf8');

test('three finite bulk-action families match 70 literal intermediate states and attempts', () => {
  assert.equal(new Set([...oracle.ordinary,...oracle.boundaries].map(row => row.family)).size,3);
  const rows = compare(); assert.equal(rows.length,70);
  for (const row of rows) assert.equal(row.passed,true,JSON.stringify(row));
});
const faults = [
  {id:'clear-hidden-selection',target:'hidden-stable-selection',step:1,
    from:'view = {filter:action.filter,page:action.page,order:action.order};',to:'selection = []; view = {filter:action.filter,page:action.page,order:action.order};'},
  {id:'page-means-all-filtered',target:'page-not-filtered',step:1,
    from:"scope === 'page' ? visible()",to:"scope === 'page' ? filtered()"},
  {id:'filtered-means-page',target:'filtered-not-page',step:1,
    from:"scope === 'filtered' ? filtered()",to:"scope === 'filtered' ? visible()"},
  {id:'selection-binds-row-positions',target:'hidden-stable-selection',step:2,
    from:"scope === 'selected' ? selection",to:"scope === 'selected' ? visible().slice(0,selection.length)"},
  {id:'confirmation-reads-live-selection',target:'preview-freezes-intent',step:5,
    from:'const plan = preview; preview = null;',to:"const plan = {...preview,targets:selection.map(id => {const row=find(id); return [id,row[2],row[3]];})}; preview = null;"},
  {id:'confirmation-expands-filtered-membership',target:'filtered-membership-frozen',step:3,
    from:'const plan = preview; preview = null;',to:"const plan = preview.scope === 'filtered' ? {...preview,targets:filtered().sort().map(id => {const row=find(id); return [id,row[2],row[3]];})} : preview; preview = null;"},
  {id:'stale-values-overwritten',target:'stale-and-removed',step:4,
    from:'row[3] !== revision || row[2] !== value || ',to:''},
  {id:'atomic-commits-partial-success',target:'partial-atomic',step:2,
    from:"const commit = plan.mode !== 'atomic' || results.every(row => row[1] === 'success');",to:'const commit = true;'},
  {id:'retry-repeats-success',target:'retry-only-eligible',step:3,
    from:'const plan = retry; retry = null; run(plan,true);',to:"const plan = {...retry,targets:report.filter(row => ['success','retryable'].includes(row[1])).map(([id]) => {const row=find(id); return [id,row[2],row[3]];})}; retry = null; run(plan,true);"},
  {id:'retry-replays-unknown',target:'retry-only-eligible',step:3,
    from:"row[0] === id && row[1] === 'retryable'",to:"row[0] === id && ['retryable','unknown'].includes(row[1])"},
  {id:'retry-rebinds-stale-target',target:'stale-retry',step:4,
    from:'row[3] !== revision || row[2] !== value || ',to:'(!isRetry && (row[3] !== revision || row[2] !== value)) || '},
  {id:'retry-hides-earlier-outcomes',target:'retry-only-eligible',step:3,
    from:'report = isRetry ? report.map(prior => results.find(row => row[0] === prior[0]) ?? prior) : results;',to:'report = results;'},
  {id:'per-item-history-grouped',target:'undo-per-item',step:2,
    from:"if (plan.undo === 'grouped') history.push(entries);",to:'if (true) history.push(entries);'},
  {id:'undo-recreates-identity',target:'undo-grouped',step:3,
    from:'row[2] = item.before[2]; row[3] += 1;',to:"row[0] = 'new-'+row[0]; row[2] = item.before[2]; row[3] += 1;"},
  {id:'undo-overwrites-later-edit',target:'undo-conflict',step:4,
    from:'!equal(find(item.after[0]),item.after)',to:'!find(item.after[0])'},
  {id:'refusal-applies-local-effect',target:'retry-only-eligible',step:2,
    from:"for (const [id,outcome] of results) if (outcome === 'success')",to:"for (const [id,outcome] of results) if (['success','refused'].includes(outcome))"},
  {id:'cancel-commits-effect',target:'cancel-empty-invalid',step:5,
    from:"case 'cancel': preview = null;",to:"case 'cancel': if (preview) find(preview.targets[0][0])[2] += 1; preview = null;"},
];
for (const fault of faults) test('ordinary controls pass before state/effect rejection: '+fault.id,async t => {
  assert.equal(source.split(fault.from).length,2,'one mutation site');
  const parent = fs.realpathSync.native(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent,'rea-multi-selection-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)),parent);
    assert.ok(path.basename(directory).startsWith('rea-multi-selection-'));
    assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);
    fs.rmSync(directory,{recursive:true,force:true});
  });
  const file = path.join(directory,'mutant.mjs'); fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const mutant = await import(pathToFileURL(file)), controls = compare(mutant.createBatch,oracle.ordinary);
  assert.equal(controls.length,6); assert.ok(controls.every(row => row.passed),'ordinary selected and atomic controls');
  const scenario = oracle.boundaries.find(row => row.id === fault.target);
  const rows = compare(mutant.createBatch,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'earlier checkpoints match');
  assert.equal(rows.at(-1).step,fault.step); assert.equal(rows.at(-1).passed,false,'actual assertion; exceptions are not detections');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:6,distinguishing:rows.at(-1)}));
});
function setup(responses = [], mode = 'best-effort', ids = ['a','c']) {
  const service = recordingBatch(responses), batch = createBatch(oracle.initial,service);
  batch.dispatch({type:'select',scope:'ids',ids});
  batch.dispatch({type:'preview',scope:'selected',mode,undo:'grouped'});
  return {batch,service};
}
test('atomic prevalidation skips valid members; atomic outcomes never create automatic retry', () => {
  const {batch,service} = setup([],'atomic');
  batch.dispatch({type:'edit',id:'c',value:8});
  const actual = batch.dispatch({type:'confirm'});
  assert.deepEqual(actual.rows,[['a','x',0,1],['b','y',0,1],['c','x',8,2],['d','x',0,1]]);
  assert.deepEqual(actual.report,[['a','skipped'],['c','stale']]);
  assert.equal(actual.history,0); assert.equal(actual.status,'retained'); assert.deepEqual(service.inspect(),[]);
  const second = setup([{'c':'retryable'}],'atomic'); second.batch.dispatch({type:'confirm'});
  assert.equal(second.batch.dispatch({type:'retry'}).status,'no-retry');
  assert.deepEqual(second.service.inspect(),[{ids:['a','c'],mode:'atomic',outcomes:['success','retryable']}]);
});
test('partial undo restores successes only; changed group rejects without partially restoring earlier members', () => {
  const {batch} = setup([{'c':'refused'}]); batch.dispatch({type:'confirm'});
  assert.deepEqual(batch.dispatch({type:'undo'}).rows,[['a','x',0,3],['b','y',0,1],['c','x',0,1],['d','x',0,1]]);
  const second = setup(); second.batch.dispatch({type:'confirm'}); second.batch.dispatch({type:'edit',id:'c',value:8});
  const before = second.batch.snapshot();
  assert.deepEqual(second.batch.dispatch({type:'undo'}),{...before,status:'undo-conflict'});
});
test('per-item undo remains independent and old revisions do not become applicable after value restoration', () => {
  const {batch,service} = setup([], 'best-effort');
  batch.dispatch({type:'edit',id:'a',value:8}); batch.dispatch({type:'edit',id:'a',value:0});
  assert.deepEqual(batch.dispatch({type:'confirm'}).report,[['a','stale'],['c','success']]);
  assert.deepEqual(service.inspect(),[{ids:['c'],mode:'best-effort',outcomes:['success']}]);
  const other = createBatch(oracle.initial,recordingBatch());
  other.dispatch({type:'select',scope:'ids',ids:['a','c']});
  other.dispatch({type:'preview',scope:'selected',mode:'best-effort',undo:'per-item'});
  other.dispatch({type:'confirm'}); other.dispatch({type:'undo'});
  assert.deepEqual(other.dispatch({type:'undo'}).rows,[['a','x',0,3],['b','y',0,1],['c','x',0,3],['d','x',0,1]]);
});
test('removed retry member is reported missing; new preview replaces retry intent', () => {
  const {batch,service} = setup([{'c':'retryable'}]); batch.dispatch({type:'confirm'});
  batch.dispatch({type:'remove',id:'c'});
  assert.deepEqual(batch.dispatch({type:'retry'}).report,[['a','success'],['c','missing']]);
  assert.equal(service.inspect().length,1);
  const other = setup([{'c':'retryable'}]); other.batch.dispatch({type:'confirm'});
  other.batch.dispatch({type:'preview',scope:'page',mode:'best-effort',undo:'grouped'});
  assert.equal(other.batch.dispatch({type:'retry'}).status,'no-retry');
});
test('removed identity cannot be reused by an equal-looking replacement', () => {
  const {batch,service} = setup(); batch.dispatch({type:'remove',id:'c'});
  const before = batch.snapshot();
  assert.deepEqual(batch.dispatch({type:'add',row:['c','x',0,1]}),{...before,status:'rejected'});
  assert.deepEqual(batch.dispatch({type:'confirm'}).report,[['a','success'],['c','missing']]);
  assert.deepEqual(service.inspect(),[{ids:['a'],mode:'best-effort',outcomes:['success']}]);
});
test('fixture limits, detached snapshots and adapter errors remain explicit', () => {
  const service = recordingBatch([{'a':'refused'}]), batch = createBatch(oracle.initial,service);
  const snap = batch.snapshot(); snap.rows[0][2] = 90; snap.selection.push('a');
  assert.deepEqual(batch.snapshot().rows,oracle.initial); assert.deepEqual(batch.snapshot().selection,[]);
  for (const action of [
    {type:'select',scope:'ids',ids:['missing']},{type:'select',scope:'ids',ids:['a','a']},
    {type:'view',filter:'z',page:0,order:'asc'},{type:'view',filter:null,page:-1,order:'asc'},
    {type:'edit',id:'a',value:100},{type:'add',row:['a','x',0,1]},
  ]) { const before = batch.snapshot(); assert.deepEqual(batch.dispatch(action),{...before,status:'rejected'}); }
  assert.deepEqual(service.inspect(),[]);
  assert.throws(() => createBatch([...oracle.initial,oracle.initial[0]],service),/Invalid fixture/);
  const broken = createBatch(oracle.initial,{attempt(){throw Error('adapter broken');}});
  broken.dispatch({type:'select',scope:'ids',ids:['a']}); broken.dispatch({type:'preview',scope:'selected',mode:'best-effort',undo:'grouped'});
  assert.throws(() => broken.dispatch({type:'confirm'}),/adapter broken/);
  assert.equal(broken.snapshot().preview,null); assert.deepEqual(broken.snapshot().rows,oracle.initial);
  assert.throws(() => compare(() => {throw Error('load broken');}),/load broken/);
});
test('comparator checks every state field and observes attempts independently', () => {
  for (const field of ['rows','selection','view','preview','report','history','status']) {
    const rows = compare((initial,service) => {
      const batch = createBatch(initial,service);
      return {dispatch:action => ({...batch.dispatch(action),[field]:'incorrect'})};
    });
    assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare((initial,service) => {
    const batch = createBatch(initial,service);
    return {dispatch(action){const actual = batch.dispatch(action); service.attempt(['d'],'best-effort'); return actual;}};
  },[{...oracle.ordinary[0],steps:oracle.ordinary[0].steps.slice(0,1)}]);
  assert.deepEqual(rows[0].actual,rows[0].expected); assert.equal(rows[0].passed,false);
});
