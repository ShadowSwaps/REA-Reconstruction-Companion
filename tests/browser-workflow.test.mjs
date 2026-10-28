import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createBrowserWorkflow} from '../evals/browser-workflow/controller.mjs';
import {createServer} from '../evals/browser-workflow/server.mjs';

test('HTTP handler double exposes only loopback GET fixture routes, no private files',()=>{
  const server=createServer();
  for (const [url,method,host,status] of [['/items/a','GET','127.0.0.1:12345',200],['/evals/browser-workflow/app.mjs','GET','127.0.0.1:12345',200],['/package.json','GET','127.0.0.1:12345',404],['/items/a?secret=1','GET','127.0.0.1:12345',404],['/items/a','POST','127.0.0.1:12345',403],['/items/a','GET','example.org',403]]) {
    let observed,headers,body;server.emit('request',{url,method,headers:{host}},{writeHead:(s,h)=>{observed=s;headers=h;},end:b=>{body=b;}});
    assert.equal(observed,status);assert.ok(body);if (status === 200) {assert.match(headers['Content-Security-Policy'],/connect-src 'none'/);assert.equal(headers['Cache-Control'],'no-store');}
  }
});

// Explicit asynchronous transport DOUBLE: none of these tests is browser proof.
function historyDouble() {
  const entries=[{url:'/items/a',state:null}],queue=[],effects=[];
  let index=0,listener;
  const read=()=>structuredClone(entries[index]);
  const port={read,onPop:fn=>{listener=fn;},
    replace:(state,url)=>{entries[index]=structuredClone({state,url});effects.push({kind:'replace',...read()});},
    push:(state,url)=>{entries.splice(index+1);entries.push(structuredClone({state,url}));index++;effects.push({kind:'push',...read()});},
    go:delta=>{queue.push(delta);effects.push({kind:'go',delta});}
  };
  return {port,entries,effects,
    flush(change=()=>{}) {while (queue.length) {const next=index+queue.shift();if (!entries[next]) continue;index=next;change(entries[index]);listener(read());}},
    back() {port.go(-1);this.flush();},forward() {port.go(1);this.flush();},
    foreign(state) {entries[index].state=state;listener(read());}
  };
}
function setup(factory=createBrowserWorkflow) {const h=historyDouble(),w=factory(h.port,()=>{},'test-run');return {h,w};}
const nav=(w,url,kind='push')=>w.act({type:'navigate',kind,url:'/items/'+url});
const edit=(w,text)=>w.act({type:'edit',text});
const choice=(w,choice)=>w.act({type:'choose',id:w.snapshot().model.departure.id,choice});
const context=(w,scope='b/x',active=true)=>w.act({type:'context',scope,active,read:active,write:active});
const m=w=>w.snapshot().model;
async function ordinary(factory) {
  const {h,w}=setup(factory);await w.finish(1);assert.equal(m(w).draft.text,'A0');
  edit(w,'A1');w.act({type:'save'});w.commit(2);await w.finish(2);
  assert.equal(m(w).dirty,false);assert.equal(w.snapshot().native.url,'/items/a');
  nav(w,'b');await w.finish(3);h.back();await w.finish(4);
  assert.equal(w.snapshot().native.url,'/items/a');assert.equal(m(w).entries[m(w).index].key,1);
  assert.equal(m(w).draft.text,'A1');assert.equal(w.snapshot().stopped,false);
}
test('ordinary manual save and clean traversal with a transport double',()=>ordinary(createBrowserWorkflow));
test('dirty native movement is recorded before restoration, approval and final traversal',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');
  h.back();assert.equal(w.snapshot().native.url,'/items/a');assert.equal(m(w).entries[m(w).index].url,'/items/b');
  assert.equal(w.snapshot().reconciliation.kind,'restore');assert.equal(m(w).departure.key,1);
  assert.equal(w.act({type:'edit',text:'wrong'}),false);w.resume();h.flush();
  assert.equal(w.snapshot().native.url,'/items/b');assert.equal(m(w).departure.key,1);choice(w,'cancel');
  assert.equal(m(w).draft.text,'B1');h.back();w.resume();h.flush();choice(w,'discard');
  assert.equal(w.snapshot().native.url,'/items/b');assert.equal(w.snapshot().reconciliation.kind,'commit');
  w.resume();h.flush();await w.finish(3);h.forward();await w.finish(4);
  assert.equal(w.snapshot().native.state.key,2);assert.equal(m(w).draft.text,'B0');
  assert.equal(w.snapshot().service.effects.length,0);
});
test('same URL entries remain distinct, replace keeps key, branch drops forward entries',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);nav(w,'a');await w.finish(3);
  assert.deepEqual(h.entries.map(e=>e.state.key),[1,2,3]);h.back();nav(w,'c','replace');await w.finish(5);
  assert.equal(h.port.read().state.key,2);nav(w,'a');assert.deepEqual(h.entries.map(e=>e.state.key),[1,2,4]);
  h.forward();assert.equal(h.port.read().state.key,4);
});
test('changed destination needs fresh approval; cancellation and new edits survive old acknowledgement',async()=>{
  const {w}=setup();await w.finish(1);edit(w,'A1');nav(w,'b');choice(w,'save');nav(w,'c','replace');
  w.act({type:'choose',id:1,choice:'cancel'});assert.equal(m(w).departure.id,2);w.commit(2);await w.finish(2);
  assert.equal(w.snapshot().native.url,'/items/a');choice(w,'save');assert.equal(w.snapshot().native.url,'/items/c');
  await w.finish(3);edit(w,'C1');nav(w,'b');choice(w,'save');choice(w,'cancel');edit(w,'C2');
  w.commit(4);await w.finish(4);assert.equal(m(w).draft.text,'C2');assert.equal(m(w).dirty,true);
  assert.equal(w.snapshot().native.url,'/items/c');
});
test('obsolete epoch traversal restores new owner entry without a read or approval',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);context(w);await w.finish(3);
  const before=m(w);h.back();assert.equal(w.snapshot().reconciliation.proposal,null);w.resume();h.flush();
  assert.deepEqual(m(w),before);assert.equal(w.snapshot().native.state.epoch,2);assert.equal(w.snapshot().service.calls.length,3);
});
test('expiry restore stops unknown replay and a late newer receipt does not certify restored base',async()=>{
  const {w}=setup();await w.finish(1);edit(w,'A1');nav(w,'b');choice(w,'save');context(w,'a/x',false);
  assert.equal(m(w).draft,null);assert.deepEqual(m(w).outcomes,[]);context(w,'a/x');await w.finish(3);
  w.act({type:'restore'});w.act({type:'save'});assert.equal(m(w).notice,'unresolved');w.commit(2);await w.finish(2);
  assert.equal(m(w).dirty,true);w.act({type:'save'});assert.equal(m(w).notice,'conflict');assert.equal(w.snapshot().service.calls.length,3);
});
test('old read success/error and write error/finalizers preserve the new owner operations',async()=>{
  const {w}=setup();nav(w,'b');nav(w,'c');await w.finish(3);edit(w,'C1');w.act({type:'save'});context(w);
  const pending=m(w);await w.finish(1);await w.finish(2,true);assert.deepEqual(m(w),pending);
  await w.finish(5);edit(w,'Q1');w.act({type:'save'});const saving=m(w);await w.finish(4,true);
  assert.deepEqual(m(w),saving);w.commit(4);assert.deepEqual(m(w),saving);w.commit(6);await w.finish(6);
  assert.equal(m(w).dirty,false);assert.deepEqual(w.snapshot().service.effects.map(e=>[e.scope,e.text]),[['a/x','C1'],['b/x','Q1']]);
});
test('foreign, unexpected and corrupt entries stop without inventing an accepted destination',async()=>{
  const {h,w}=setup();h.foreign(null);assert.equal(w.snapshot().stopped,true);assert.equal(w.act({type:'save'}),false);
  const next=setup();await next.w.finish(1);nav(next.w,'b');await next.w.finish(2);edit(next.w,'B1');next.h.back();
  next.w.resume();next.h.flush(row=>{row.state.key=999;});assert.equal(next.w.snapshot().stopped,true);
});

async function acknowledgedDuringRestoration(factory,{kind='push',moment='before-resume'}={}) {
  const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');
  if (kind === 'traverse') w.act({type:'traverse',delta:-1});else nav(w,'c',kind);
  choice(w,'save');h.back();
  if (moment !== 'before-resume') w.resume();
  if (moment === 'after-restored-pop') h.flush();
  const beforeEntries=structuredClone(h.entries);w.commit(3);await w.finish(3);
  // The acknowledgement saves the captured revision but cannot carry the older
  // departure across a newer native request, even while its dialog is hidden.
  assert.deepEqual(h.entries,beforeEntries,'ack does not mutate native entries');
  assert.deepEqual(m(w).entries,[{key:1,url:'/items/a'},{key:2,url:'/items/b'}]);
  assert.equal(m(w).index,1);assert.equal(m(w).draft.text,'B1');assert.equal(m(w).dirty,false);
  assert.equal(m(w).departure.id,2);assert.equal(m(w).departure.key,1);assert.equal(m(w).departure.url,'/items/a');
  assert.equal(w.snapshot().service.calls.length,3);assert.equal(w.snapshot().stopped,false);
  if (moment === 'before-resume') w.resume();
  h.flush();assert.equal(w.snapshot().native.url,'/items/b');assert.equal(w.snapshot().native.state.key,2);
  assert.equal(w.snapshot().reconciliation,null);assert.equal(m(w).departure.id,2);
  w.act({type:'choose',id:1,choice:'cancel'});assert.equal(m(w).departure.id,2);
  choice(w,'save');assert.equal(w.snapshot().reconciliation.kind,'commit');w.resume();h.flush();await w.finish(4);
  assert.equal(w.snapshot().native.url,'/items/a');assert.equal(w.snapshot().native.state.key,1);
  assert.equal(m(w).index,0);assert.equal(m(w).draft.text,'A0');assert.equal(w.snapshot().stopped,false);
  assert.deepEqual(h.entries.map(e=>[e.url,e.state.key]),[['/items/a',1],['/items/b',2]]);
  assert.deepEqual(w.snapshot().service.effects,[{kind:'write',op:3,scope:'a/x',url:'/items/b',text:'B1',version:2}]);
}
for (const kind of ['push','replace','traverse']) for (const moment of ['before-resume','after-issued-before-pop','after-restored-pop']) {
  test(`native Back supersedes ${kind} save approval; acknowledgement ${moment}`,()=>acknowledgedDuringRestoration(createBrowserWorkflow,{kind,moment}));
}
test('newer revision before native Back stays dirty and needs its own exact save choice',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');nav(w,'c');choice(w,'save');
  edit(w,'B2');h.back();w.commit(3);await w.finish(3);
  assert.equal(m(w).draft.text,'B2');assert.equal(m(w).draft.savedRevision,1);assert.equal(m(w).departure.sourceRevision,2);
  assert.equal(m(w).dirty,true);w.resume();h.flush();choice(w,'save');w.commit(4);await w.finish(4);
  w.resume();h.flush();await w.finish(5);assert.equal(w.snapshot().native.url,'/items/a');
  assert.deepEqual(w.snapshot().service.effects.map(e=>[e.text,e.version]),[['B1',2],['B2',3]]);
});
test('unknown acknowledgement during restoration neither navigates nor enables replay',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');nav(w,'c');choice(w,'save');h.back();
  await w.finish(3,true);w.resume();h.flush();choice(w,'save');assert.equal(m(w).notice,'unresolved');
  assert.equal(w.snapshot().native.url,'/items/b');assert.equal(m(w).departure.key,1);assert.equal(w.snapshot().service.calls.length,3);
  w.commit(3);assert.equal(w.snapshot().service.effects.length,1);assert.equal(m(w).outcomes[0].status,'unknown');
});
test('a new session after source restoration supersedes intent and scopes late acknowledgement',async()=>{
  const {h,w}=setup();await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');nav(w,'c');choice(w,'save');h.back();
  w.resume();h.flush();context(w);const before=m(w);w.commit(3);await w.finish(3);assert.deepEqual(m(w),before);
  assert.equal(m(w).loading,4);assert.equal(m(w).departure,null);await w.finish(4);
  assert.equal(m(w).draft.text,'Q0');assert.equal(w.snapshot().native.state.epoch,2);assert.equal(w.snapshot().stopped,false);
});
const source=fs.readFileSync(new URL('../evals/browser-workflow/controller.mjs',import.meta.url),'utf8');
const faults=[
  {id:'ack-navigation-before-source-restoration',from:'if (reconciliation.proposal) model.dispatch(reconciliation.proposal);',to:'// Missing early native proposal registration.',
    async distinguish(factory) {
      const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');nav(w,'c');choice(w,'save');h.back();
      w.commit(3);await w.finish(3);
      return h.entries.length === 2 && w.snapshot().native.url === '/items/a' && m(w).index === 1 && m(w).departure?.key === 1;
    }},
  {id:'wrong-restoration-direction',from:'const delta=reconciliation.target.pos-port.read().state.pos;',to:'const delta=port.read().state.pos-reconciliation.target.pos;',
    async distinguish(factory) {const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');h.back();w.resume();h.flush();return m(w).departure?.key === 1 && w.snapshot().native.url === '/items/b' && w.snapshot().reconciliation === null;}},
  {id:'edit-during-url-mismatch',from:'if (stopped || reconciliation) return false;',to:'if (stopped) return false;',
    async distinguish(factory) {const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');h.back();return w.act({type:'edit',text:'B2'}) === false && m(w).draft.text === 'B1';}},
  {id:'obsolete-entry-recreates-proposal',from:'proposal:obsolete ? null : proposal',to:'proposal:proposal',
    async distinguish(factory) {const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);context(w);await w.finish(3);const before=m(w);h.back();w.resume();h.flush();return JSON.stringify(m(w)) === JSON.stringify(before);}},
  {id:'restoration-key-not-checked',from:'native.state.key !== pending.target.key || ',to:'',
    async distinguish(factory) {const {h,w}=setup(factory);await w.finish(1);nav(w,'b');await w.finish(2);edit(w,'B1');h.back();w.resume();h.flush(row=>{row.state.key=999;});return w.snapshot().stopped;}}
];
for (const fault of faults) test(`ordinary controls pass before history distinction rejects ${fault.id}`,async t=>{
  assert.equal(source.split(fault.from).length,2);const parent=fs.realpathSync.native(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'rea-browser-mutant-'));
  t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),parent);assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});});
  const file=path.join(dir,'controller.mjs');let mutated=source.replace(fault.from,fault.to);
  for (const name of ['candidate','double']) mutated=mutated.replace(`'../combined-navigation/${name}.mjs'`,JSON.stringify(new URL(`../evals/combined-navigation/${name}.mjs`,import.meta.url).href));
  fs.writeFileSync(file,mutated);const {createBrowserWorkflow:factory}=await import(pathToFileURL(file));
  await ordinary(factory);assert.equal(await fault.distinguish(createBrowserWorkflow),true);assert.equal(await fault.distinguish(factory),false,'named state/effect mismatch, not an exception');
});
