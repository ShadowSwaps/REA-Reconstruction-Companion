import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWorkflow} from '../evals/combined-navigation/candidate.mjs';
import {controlledAdapter} from '../evals/combined-navigation/double.mjs';
import {compare,frozen} from '../evals/combined-navigation/check.mjs';
const oracle=frozen(),controls=oracle.cases.filter(c=>c.ordinary);
const source=fs.readFileSync(new URL('../evals/combined-navigation/candidate.mjs',import.meta.url),'utf8');
test('20 shared-lifecycle sequences match 189 complete literal states and separate effects',async()=>{
  const rows=await compare();assert.equal(rows.length,189);assert.deepEqual(rows.filter(r=>!r.passed),[]);
});
const faults=[
  {id:'old-ack-releases-new-destination',scenario:'changed-destination-needs-fresh-choice',step:8,from:'intent?.id === c.departure',to:'intent !== null'},
  {id:'stale-choice-releases-new-intent',scenario:'changed-destination-needs-fresh-choice',step:6,from:'intent.id !== action.id',to:'false'},
  {id:'cancel-retains-navigation',scenario:'cancel-navigation-does-not-cancel-write',step:5,from:"state.departure=null;state.notice='cancelled';",to:"state.notice='cancelled';"},
  {id:'old-save-certifies-new-edit',scenario:'newer-edit-requires-new-approval',step:7,from:'state.draft.savedRevision=c.revision;',to:'state.draft.savedRevision=state.draft.revision;'},
  {id:'ack-uses-live-text',scenario:'newer-edit-requires-new-approval',step:7,from:'state.data={text:c.text,version:value.version};',to:'state.data={text:state.draft.text,version:value.version};'},
  {id:'stale-revision-discard',scenario:'newer-edit-requires-new-approval',step:8,from:'intent.sourceRevision !== state.draft?.revision',to:'false'},
  {id:'unknown-write-replayed',scenario:'expiry-recovery-and-late-commit',step:11,from:"['pending','unknown'].includes(row.status)",to:"row.status === 'pending'"},
  {id:'newer-receipt-ignored',scenario:'expiry-recovery-and-late-commit',step:14,from:" || ledger().some(row=>row.status === 'saved' && row.version > state.draft.base)",to:''},
  {id:'remote-version-ignored',scenario:'recovery-remote-version-conflict',step:9,from:'state.data?.version !== state.draft.base',to:'false'},
  {id:'outcome-payload-disclosed-on-expiry',scenario:'expiry-recovery-and-late-commit',step:5,from:'outcomes:readable() ? ledger() : []',to:'outcomes:ledger()'},
  {id:'old-draft-disclosed-on-switch',scenario:'account-switch-old-write-and-read',step:5,from:"state.data=null;state.draft=null;state.loading=null;state.saving=null;state.departure=null;state.notice='context-changed';",to:"state.data=null;state.loading=null;state.saving=null;state.departure=null;state.notice='context-changed';"},
  {id:'owner-resource-key-ignores-owner',scenario:'account-switch-old-write-and-read',step:5,from:'JSON.stringify([scope,resource])',to:'JSON.stringify([resource])'},
  {id:'old-read-value-accepted',scenario:'stale-read-value-and-cleanup',step:3,from:'if (!applicable(c)) return;',to:''},
  {id:'old-read-error-accepted',scenario:'stale-read-error-and-cleanup',step:3,from:"if (applicable(c)) state.notice='read-error';",to:"state.notice='read-error';"},
  {id:'old-read-clears-new-loading',scenario:'stale-read-value-and-cleanup',step:3,from:'if (applicable(c) && state.loading === c.op) state.loading=null;',to:'state.loading=null;'},
  {id:'identity-equality-without-lifetime',scenario:'same-owner-new-session-old-read',step:3,from:'c.session === state.session && c.lifetime === state.lifetime && ',to:''},
  {id:'old-write-clears-new-saving',scenario:'old-write-error-does-not-clear-new-owner-save',step:10,from:'if (applicable(c) && state.saving === c.op) state.saving=null;',to:'state.saving=null;'},
  {id:'expiry-converts-unknown-to-denial',scenario:'expiry-recovery-and-late-commit',step:7,from:"if (row.status === 'pending') row.status='unknown';",to:"if (row.status === 'pending') row.status='denied';"},
  {id:'discard-allowed-during-write',scenario:'discard-blocked-during-save',step:5,from:"if (unresolved()) {state.notice='unresolved';break;}",to:''},
  {id:'discard-retains-recoverable-edit',scenario:'discard-does-not-save',step:7,from:'retained.delete(ownerKey());',to:''},
  {id:'replacement-pushes-entry',scenario:'changed-destination-needs-fresh-choice',step:9,from:'state.entries[state.index]={key:state.entries[state.index].key,url:intent.url};',to:'{state.entries.push({key:nextKey++,url:intent.url});state.index++;}'},
  {id:'traversal-effect-recorded-as-push',scenario:'dirty-traversal-precommit-entry-contract',step:8,from:'navigation:intent.kind,',to:"navigation:intent.kind === 'traverse' ? 'push' : intent.kind,"}
];
for (const fault of faults) test(`ordinary controls precede named state/effect mismatch: ${fault.id}`,async t=>{
  assert.equal(source.split(fault.from).length,2,'one intentional mutation');
  const parent=fs.realpathSync.native(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'rea-combined-mutant-'));
  t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),parent);assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});});
  const file=path.join(dir,'candidate.mjs');fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const {createWorkflow:factory}=await import(pathToFileURL(file));
  const ordinary=await compare(factory,controls);assert.equal(ordinary.length,15);assert.ok(ordinary.every(r=>r.passed),'ordinary controls');
  const scenario=oracle.cases.find(c=>c.id === fault.scenario);
  assert.ok(scenario.steps[fault.step],'named checkpoint exists');
  const rows=await compare(factory,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(r=>r.passed),'earlier checkpoints');assert.equal(rows.at(-1).passed,false,'state/effect mismatch, never exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:15,distinguishing:rows.at(-1)}));
});
async function loaded() {
  const adapter=controlledAdapter(),model=createWorkflow(adapter);model.dispatch({type:'read'});
  adapter.finish(1,{text:'A0',version:1});await model.settle(1);return {adapter,model};
}
test('unknown grants and inactive direct calls produce no read/write/history effects',()=>{
  for (const grants of [{active:false,read:true,write:true},{active:true,read:null,write:true},{active:true,read:false,write:true}]) {
    const adapter=controlledAdapter(),model=createWorkflow(adapter);
    model.dispatch({type:'context',scope:'a/x',...grants});
    for (const action of [{type:'read'},{type:'edit',text:'private'},{type:'save'},{type:'restore'},{type:'navigate',kind:'push',url:'/items/b'}]) model.dispatch(action);
    assert.deepEqual(adapter.inspect(),{calls:[],effects:[]});assert.equal(model.snapshot().draft,null);
  }
});
test('write denial, no-op edit, duplicate read/save and malformed routes preserve useful work',async()=>{
  const {adapter,model}=await loaded();model.dispatch({type:'edit',text:'A0'});assert.equal(model.snapshot().draft.revision,0);
  model.dispatch({type:'edit',text:'A1'});model.dispatch({type:'read'});assert.equal(model.snapshot().draft.text,'A1');
  model.dispatch({type:'navigate',kind:'push',url:'/items/a?token=private'});assert.equal(model.snapshot().notice,'invalid');
  model.dispatch({type:'save'});model.dispatch({type:'save'});assert.equal(model.snapshot().notice,'unresolved');assert.equal(adapter.inspect().calls.length,2);
  for (const write of [false,null]) {
    model.dispatch({type:'context',scope:'a/x',active:true,read:true,write});model.dispatch({type:'read'});
    const op=adapter.inspect().calls.at(-1).op;adapter.finish(op,{text:'A0',version:1});await model.settle(op);
    model.dispatch({type:'restore'});model.dispatch({type:'edit',text:'wrong'});model.dispatch({type:'save'});
    assert.equal(model.snapshot().draft.text,'A1');assert.equal(adapter.inspect().calls.filter(r=>r.kind === 'write').length,1);
  }
});
test('same URL under another route lifetime ignores old result; branching drops forward entries',async()=>{
  const adapter=controlledAdapter(),model=createWorkflow(adapter);model.dispatch({type:'read'});
  model.dispatch({type:'navigate',kind:'push',url:'/items/b'});model.dispatch({type:'navigate',kind:'push',url:'/items/a'});
  adapter.finish(1,{text:'OLD',version:1});await model.settle(1);assert.equal(model.snapshot().loading,3);assert.equal(model.snapshot().data,null);
  adapter.finish(3,{text:'A0',version:1});await model.settle(3);
  model.dispatch({type:'traverse',delta:-2});model.dispatch({type:'navigate',kind:'push',url:'/items/c'});
  assert.deepEqual(model.snapshot().entries,[{key:1,url:'/items/a'},{key:4,url:'/items/c'}]);
  assert.equal(model.snapshot().index,1);assert.equal(adapter.inspect().effects.at(-1).navigation,'push');
});
test('response loss before commit does not stop later service work or permit replay',async()=>{
  const {adapter,model}=await loaded();model.dispatch({type:'edit',text:'A1'});model.dispatch({type:'save'});
  adapter.finish(2,null,true);await model.settle(2);model.dispatch({type:'save'});assert.equal(model.snapshot().notice,'unresolved');
  adapter.commit(2);assert.deepEqual(adapter.inspect().effects,[{kind:'write',op:2,scope:'a/x',url:'/items/a',text:'A1',version:2}]);
  assert.equal(model.snapshot().outcomes[0].status,'unknown');
});
test('service conditional revision conflict is a known non-effect, distinct from lost response',async()=>{
  const {adapter,model}=await loaded();
  const external=adapter.write({op:99,scope:'a/x',url:'/items/a',text:'other',base:1});adapter.commit(99);adapter.finish(99);await external;
  model.dispatch({type:'edit',text:'A1'});model.dispatch({type:'save'});adapter.commit(2);adapter.finish(2);await model.settle(2);
  assert.equal(model.snapshot().notice,'conflict');assert.equal(model.snapshot().dirty,true);
  assert.equal(model.snapshot().outcomes[0].status,'conflict');assert.equal(adapter.inspect().effects.length,1);
});
test('old account success cannot clear or certify a new account save',async()=>{
  const {adapter,model}=await loaded();model.dispatch({type:'edit',text:'A1'});model.dispatch({type:'save'});
  model.dispatch({type:'context',scope:'b/x',active:true,read:true,write:true});model.dispatch({type:'read'});
  adapter.finish(3,{text:'Q0',version:1});await model.settle(3);model.dispatch({type:'edit',text:'Q1'});model.dispatch({type:'save'});
  const before=model.snapshot();adapter.commit(2);adapter.finish(2);await model.settle(2);assert.deepEqual(model.snapshot(),before);
  adapter.commit(4);adapter.finish(4);await model.settle(4);assert.equal(model.snapshot().dirty,false);
  assert.deepEqual(adapter.inspect().effects.map(row=>[row.scope,row.text]),[['a/x','A1'],['b/x','Q1']]);
});
test('workspace and resource scopes do not restore or replay another draft',async()=>{
  const {adapter,model}=await loaded();model.dispatch({type:'edit',text:'private-a-x'});
  model.dispatch({type:'context',scope:'a/y',active:true,read:true,write:true});model.dispatch({type:'read'});
  adapter.finish(2,{text:'Y0',version:1});await model.settle(2);model.dispatch({type:'restore'});assert.equal(model.snapshot().notice,'no-draft');
  model.dispatch({type:'context',scope:'a/x',active:true,read:true,write:true});model.dispatch({type:'navigate',kind:'push',url:'/items/b'});
  adapter.finish(3,{text:'B0',version:1});await model.settle(3);model.dispatch({type:'restore'});assert.equal(model.snapshot().notice,'no-draft');
  model.dispatch({type:'traverse',delta:-1});adapter.finish(4,{text:'A0',version:1});await model.settle(4);
  assert.equal(model.snapshot().draft.text,'A0');model.dispatch({type:'restore'});assert.equal(model.snapshot().draft.text,'private-a-x');
  assert.equal(adapter.inspect().calls.some(row=>row.kind === 'write'),false);
});
test('a manual save cannot silently approve an unrelated departure; repeated proposals require their current token',async()=>{
  const {adapter,model}=await loaded();model.dispatch({type:'edit',text:'A1'});model.dispatch({type:'save'});
  model.dispatch({type:'navigate',kind:'push',url:'/items/b'});model.dispatch({type:'navigate',kind:'push',url:'/items/b'});
  assert.equal(model.snapshot().departure.id,2);model.dispatch({type:'choose',id:1,choice:'cancel'});assert.equal(model.snapshot().departure.id,2);
  adapter.commit(2);adapter.finish(2);await model.settle(2);assert.equal(model.snapshot().index,0);assert.equal(model.snapshot().departure.id,2);
  model.dispatch({type:'choose',id:2,choice:'save'});assert.equal(model.snapshot().index,1);
  assert.equal(adapter.inspect().calls.filter(row=>row.kind === 'write').length,1);
});
test('current read failure permits explicit retry; missing data gives no editor',async()=>{
  const adapter=controlledAdapter(),model=createWorkflow(adapter);model.dispatch({type:'read'});
  adapter.finish(1,null,true);await model.settle(1);assert.equal(model.snapshot().notice,'read-error');assert.equal(model.snapshot().loading,null);
  model.dispatch({type:'read'});adapter.finish(2,null);await model.settle(2);assert.equal(model.snapshot().notice,'missing');assert.equal(model.snapshot().draft,null);
  model.dispatch({type:'edit',text:'wrong'});model.dispatch({type:'save'});assert.equal(adapter.inspect().calls.length,2);
});
test('snapshot fields and independent calls/effects are compared, including effect-only corruption',async()=>{
  for (const field of Object.keys(oracle.cases[0].steps[0].expected)) {
    const rows=await compare(adapter=>{const model=createWorkflow(adapter);return {...model,snapshot:()=>({...model.snapshot(),[field]:'wrong'})};},controls);
    assert.ok(rows.some(r=>!r.passed),field);
  }
  const rows=await compare(createWorkflow,controls,()=>{const adapter=controlledAdapter();return {...adapter,inspect:()=>({...adapter.inspect(),effects:[]})};});
  assert.deepEqual(rows[4].actual,rows[4].expected);assert.equal(rows[4].passed,false);
});
test('owned copies and malformed/harness/adapter errors propagate as failures',async()=>{
  const {adapter,model}=await loaded();const copy=model.snapshot();copy.draft.text='wrong';assert.equal(model.snapshot().draft.text,'A0');
  const records=adapter.inspect();records.calls[0].scope='wrong';assert.equal(adapter.inspect().calls[0].scope,'a/x');
  assert.throws(()=>model.dispatch({type:'unknown'}),/Unknown fixture action/);
  assert.throws(()=>adapter.finish(99),/Unknown fixture operation/);assert.throws(()=>adapter.finish(1),/Already completed/);
  assert.throws(()=>adapter.commit(1),/Invalid fixture commit/);await assert.rejects(model.settle(99),/Unknown fixture operation/);
  await assert.rejects(compare(()=>{throw Error('factory failed');}),/factory failed/);
  assert.throws(()=>createWorkflow({read(){throw Error('adapter failed');}}).dispatch({type:'read'}),/adapter failed/);
  const bad=controlledAdapter(),other=createWorkflow(bad);other.dispatch({type:'read'});bad.finish(1,{text:'bad',version:0});await assert.rejects(other.settle(1),/Invalid fixture read/);
});
