import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSession} from '../evals/session-permissions/candidate.mjs';
import {controlledService} from '../evals/session-permissions/double.mjs';
import {compare,frozen} from '../evals/session-permissions/check.mjs';
const oracle=frozen(),controls=oracle.cases.filter(row=>row.ordinary);
const source=fs.readFileSync(new URL('../evals/session-permissions/candidate.mjs',import.meta.url),'utf8');
test('23 proposed identity/session/grant sequences match 140 full literal states and separate effects',async()=>{
  const rows=await compare();assert.equal(rows.length,140);assert.deepEqual(rows.filter(row=>!row.passed),[]);
});
const faults=[
  {id:'display-retained',scenario:'account-switch',step:3,from:'state.data=null;state.cache=null;state.draft=null;',to:'state.cache=null;state.draft=null;'},
  {id:'cache-retained',scenario:'workspace-switch',step:3,from:'state.data=null;state.cache=null;state.draft=null;',to:'state.data=null;state.draft=null;'},
  {id:'draft-retained',scenario:'account-switch',step:3,from:'state.data=null;state.cache=null;state.draft=null;',to:'state.data=null;state.cache=null;'},
  {id:'draft-lost-on-edit',scenario:'same-owner-recovery',step:8,from:"owner(state.scope).draft=structuredClone(state.draft);state.notice='edited';",to:"state.notice='edited';"},
  {id:'owner-map-shared',scenario:'other-owner-no-restore',step:6,from:'const owner=scope=>{',to:"const owner=ignored=>{ const scope='shared';"},
  {id:'stale-success',scenario:'stale-read-success',step:3,from:'if (!applicable()) return;\n        state.data=value;',to:'state.data=value;'},
  {id:'stale-error',scenario:'stale-read-error',step:3,from:"if (!applicable()) return;\n      state.notice=kind",to:'state.notice=kind'},
  {id:'stale-cleanup',scenario:'stale-read-success',step:3,from:"if (applicable()) state[kind === 'read' ? 'loading' : 'saving']=false;",to:"state[kind === 'read' ? 'loading' : 'saving']=false;"},
  {id:'identity-without-lifetime',scenario:'same-scope-new-lifetime',step:4,from:'epoch === state.epoch && ',to:''},
  {id:'unknown-grants-allowed',scenario:'direct-read-denied',step:1,from:'state.read === true',to:'state.read !== false'},
  {id:'write-grant-ignored',scenario:'write-downgrade',step:7,from:'readable() && state.write === true',to:'readable()'},
  {id:'newer-edits-certified',scenario:'newer-edit-after-save',step:6,from:'state.draft?.revision !== captured.revision',to:'false'},
  {id:'unknown-write-replayed',scenario:'loss-blocks-retry',step:6,from:"['pending','unknown'].includes(row.status)",to:"row.status === 'pending'"},
  {id:'inflight-forgotten-on-expiry',scenario:'no-unresolved-replay-after-login',step:5,from:"if (row.status === 'pending') row.status='unknown';",to:"if (row.status === 'pending') row.status='denied';"},
  {id:'outcome-payload-leaks-after-expiry',scenario:'no-unresolved-replay-after-login',step:4,from:'outcomes:readable() ? owner(state.scope).outcomes : []',to:'outcomes:owner(state.scope).outcomes'},
  {id:'stale-write-notice',scenario:'client-revocation-not-rollback',step:6,from:'if (!applicable() || !writable()) return;',to:''}
];
for (const fault of faults) test(`ordinary controls pass before named state/effect mismatch: ${fault.id}`,async t=>{
  assert.equal(source.split(fault.from).length,2,'one intentional mutation');
  const parent=fs.realpathSync.native(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'rea-session-mutant-'));
  t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),parent);assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});});
  const file=path.join(dir,'mutant.mjs');fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const {createSession:factory}=await import(pathToFileURL(file));
  const ordinary=await compare(factory,controls);assert.equal(ordinary.length,15);assert.ok(ordinary.every(row=>row.passed),'ordinary controls');
  const scenario=oracle.cases.find(row=>row.id===fault.scenario);
  const rows=await compare(factory,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row=>row.passed),'earlier checkpoints');assert.equal(rows.at(-1).passed,false,'value mismatch, not exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:15,distinguishing:rows.at(-1)}));
});
async function loaded(text='remote') {
  const service=controlledService(),session=createSession(service);
  session.dispatch({type:'read'});service.finish(1,text);await session.settle(1);return {service,session};
}
test('workspace-scoped drafts and fresh-read conflict block cross-workspace restore and unsafe resend',async()=>{
  const {service,session}=await loaded();session.dispatch({type:'edit',text:'private-x'});
  session.dispatch({type:'context',scope:'a/y'});session.dispatch({type:'read'});service.finish(2,'workspace-y');await session.settle(2);
  session.dispatch({type:'restore'});assert.equal(session.snapshot().notice,'no-draft');assert.equal(session.snapshot().draft.text,'workspace-y');
  session.dispatch({type:'context'});session.dispatch({type:'read'});service.finish(3,'advanced');await session.settle(3);
  session.dispatch({type:'restore'});assert.equal(session.snapshot().draft.text,'private-x');
  session.dispatch({type:'save'});assert.equal(session.snapshot().notice,'conflict');assert.deepEqual(service.inspect().calls.map(row=>row.kind),['read','read','read']);
  session.dispatch({type:'edit',text:'newer'});session.dispatch({type:'restore'});assert.equal(session.snapshot().notice,'blocked');assert.equal(session.snapshot().draft.text,'newer');
});
test('read refresh cannot overwrite an editor and repeated send cannot duplicate an outstanding write',async()=>{
  const {service,session}=await loaded();session.dispatch({type:'read'});assert.equal(session.snapshot().notice,'blocked');
  session.dispatch({type:'edit',text:'edit'});session.dispatch({type:'save'});session.dispatch({type:'save'});
  assert.equal(session.snapshot().notice,'unresolved');assert.equal(service.inspect().calls.length,2);
});
test('unknown grants, inactive sessions and direct calls produce no reads or writes',()=>{
  for (const context of [{active:false},{read:false},{read:null},{write:false},{write:null}]) {
    const service=controlledService(),session=createSession(service);session.dispatch({type:'context',...context});
    session.dispatch({type:'edit',text:'secret'});session.dispatch({type:'save'});session.dispatch({type:'restore'});
    assert.deepEqual(service.inspect(),{calls:[],effects:[]});
    if (context.read !== undefined || context.active === false) {session.dispatch({type:'read'});assert.equal(service.inspect().calls.length,0);}
  }
});
test('all snapshot fields and independently recorded effects participate in comparison',async()=>{
  for (const field of Object.keys(oracle.cases[0].steps[0].expected)) {
    const rows=await compare(adapter=>{const session=createSession(adapter);return {...session,snapshot:()=>({...session.snapshot(),[field]:'wrong'})};},controls);
    assert.ok(rows.some(row=>!row.passed),field);
  }
  const rows=await compare(createSession,[oracle.cases[0]],()=>{const service=controlledService();return {...service,inspect:()=>({...service.inspect(),effects:[]})};});
  assert.deepEqual(rows[4].actual,rows[4].expected);assert.equal(rows[4].passed,false);
});
test('owned snapshots and malformed/harness failures remain visible rather than mutation detections',async()=>{
  const {service,session}=await loaded();const copy=session.snapshot();copy.draft.text='wrong';assert.equal(session.snapshot().draft.text,'remote');
  const inspected=service.inspect();inspected.calls[0].scope='wrong';assert.equal(service.inspect().calls[0].scope,'a/x');
  assert.throws(()=>session.dispatch({type:'bad'}),/Unknown fixture action/);assert.throws(()=>service.finish(99),/Unknown or completed/);
  assert.throws(()=>service.commit(99),/Unknown or completed/);await assert.rejects(session.settle(99),/Unknown fixture operation/);
  await assert.rejects(compare(()=>{throw Error('factory failed');}),/factory failed/);
  assert.throws(()=>createSession({read(){throw Error('adapter failed');}}).dispatch({type:'read'}),/adapter failed/);
  const bad=controlledService(),model=createSession(bad);model.dispatch({type:'read'});bad.finish(1,{});await assert.rejects(model.settle(1),/Invalid fixture read/);
});
