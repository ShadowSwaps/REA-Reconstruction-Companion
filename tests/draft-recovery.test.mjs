import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Editor,KEY,TTL,decode,seed} from '../evals/draft-recovery/policy.mjs';
const A={account:'A',document:'X',lifetime:1};
function fixture(Type=Editor) {
  let raw=JSON.stringify(seed()),time=100000000,serial=0,chain=Promise.resolve(),denyRead=false,denyWrite=false;
  const storage={getItem:()=>{if(denyRead)throw new Error('Injected read denial');return raw;},setItem:(key,value)=>{assert.equal(key,KEY);if(denyWrite)throw new Error('Injected write denial');raw=value;}};
  const lock=(name,fn)=>{const job=chain.then(fn);chain=job.catch(()=>{});return job;};
  const make=()=>{const e=new Type({storage,lock,now:()=>time,token:()=>`t-${++serial}`});e.open(A);return e;};
  return {make,storage,lock,db:()=>JSON.parse(raw),raw:()=>raw,set:v=>{raw=v;},time:v=>{time=v;},denyRead:()=>{denyRead=true;},denyWrite:()=>{denyWrite=true;}};
}
async function ordinary(Type=Editor) {
  const f=fixture(Type),e=f.make();assert.equal(e.state.text,'AX saved');
  await e.edit('Confirmed');assert.equal(f.db().records['A/X'].text,'AX saved');
  await e.save();assert.equal(e.state.status,'Saved');assert.equal(f.db().records['A/X'].revision,2);
  const reopened=f.make();assert.equal(reopened.state.text,'Confirmed');assert.equal(reopened.state.dirty,false);assert.equal(reopened.offered,null);
}
test('ordinary edit checkpoints separately, explicit save and fresh instance read',()=>ordinary());
test('fresh instance offers exact unsaved text without restoring or saving it',async()=>{
  const f=fixture(),e=f.make();await e.edit('  Draft Ω <tag>  ');const r=f.make();
  assert.equal(r.state.text,'AX saved');assert.equal(r.state.status,'Recovery available');r.restore();
  assert.equal(r.state.text,'  Draft Ω <tag>  ');assert.equal(r.state.dirty,true);assert.equal(r.state.status,'Draft restored; not saved');assert.equal(f.db().records['A/X'].revision,1);
});
test('known pre-native rejection leaves last record and recoverable draft',async()=>{
  const f=fixture(),e=f.make();await e.edit('First');await e.save();await e.edit('Retry');const before=f.raw();
  await e.save({reject:true});assert.equal(f.raw(),before);assert.match(e.state.status,/Injected pre-write rejection/);await e.save();assert.equal(f.db().records['A/X'].text,'Retry');
});
test('held undispatched save has no effect; abandoned page draft can be recovered',async()=>{
  const f=fixture(),e=f.make();await e.edit('Interrupted');let release;const saving=e.save({beforeDispatch:()=>new Promise(r=>{release=r;})});await new Promise(setImmediate);
  assert.equal(f.db().records['A/X'].text,'AX saved');const r=f.make();assert.equal(r.offered.text,'Interrupted');e.open(null);release();await saving;assert.equal(f.db().records['A/X'].text,'AX saved');
});
test('new edit while held blocks old effect and retains newer checkpoint',async()=>{
  const f=fixture(),e=f.make();await e.edit('Old');let release;const saving=e.save({beforeDispatch:()=>new Promise(r=>{release=r;})});await new Promise(setImmediate);
  await e.edit('New');release();await saving;assert.equal(f.db().records['A/X'].revision,1);assert.equal(f.db().drafts['A/X/1'].text,'New');assert.equal(e.state.dirty,true);assert.match(e.state.status,/Superseded save/);
});
function heldSaveReceipt(Type=Editor) {
  const f=fixture(Type);let armed=false,release,arrived;
  const reached=new Promise(resolve=>{arrived=resolve;});
  const lock=(name,fn)=>f.lock(name,fn).then(async result=>{
    if(armed && f.db().records['A/X'].revision===2){armed=false;await new Promise(resolve=>{release=resolve;arrived();});}
    return result;
  });
  let token=0;const e=new Type({storage:f.storage,lock,now:()=>100000000,token:()=>`receipt-${++token}`});e.open(A);
  return {f,e,arm:()=>{armed=true;},reached,release:()=>release()};
}
test('DR-NAR-001: newer input after native commit stays dirty and checkpointed after old receipt',async()=>{
  const h=heldSaveReceipt(),{f,e}=h;await e.edit('Captured save');h.arm();const saving=e.save();await h.reached;
  assert.deepEqual(f.db().records['A/X'],{revision:2,text:'Captured save'});
  await e.edit('Newer unsaved edit');assert.equal(e.state.dirty,true);assert.match(e.state.status,/Checkpoint failed; memory only/);
  h.release();await saving;
  assert.equal(e.state.text,'Newer unsaved edit');assert.equal(e.state.saved,'Captured save');assert.equal(e.state.base,2);assert.equal(e.state.dirty,true);assert.equal(e.state.status,'Draft checkpointed; not saved');
  assert.equal(f.db().drafts['A/X/1'].text,'Newer unsaved edit');assert.equal(f.db().drafts['A/X/1'].base,2);
  await e.save();assert.equal(e.state.status,'Saved');assert.deepEqual(f.db().records['A/X'],{revision:3,text:'Newer unsaved edit'});
});
test('post-commit receipt cannot alter another owner editor or its checkpoint',async()=>{
  const h=heldSaveReceipt(),{f,e}=h;await e.edit('A captured');h.arm();const saving=e.save();await h.reached;
  e.open({...A,account:'B'});await e.edit('B newer');const before={...e.state},slot=JSON.stringify(f.db().drafts['B/X/1']);
  h.release();await saving;assert.deepEqual(e.state,before);assert.equal(JSON.stringify(f.db().drafts['B/X/1']),slot);await e.save();assert.equal(f.db().records['B/X'].text,'B newer');assert.equal(f.db().records['A/X'].text,'A captured');
});
test('receipt reconciliation preserves another writer slot and reports newer memory-only failure',async()=>{
  const h=heldSaveReceipt(),{f,e}=h;await e.edit('Captured save');h.arm();const saving=e.save();await h.reached;
  await e.edit('My newer memory');const peer=f.make();await peer.edit('Peer checkpoint');const before=JSON.stringify(f.db().drafts['A/X/1']);
  h.release();await saving;assert.equal(e.state.text,'My newer memory');assert.equal(e.state.dirty,true);assert.match(e.state.status,/Checkpoint failed; memory only/);assert.equal(JSON.stringify(f.db().drafts['A/X/1']),before);assert.equal(f.db().records['A/X'].text,'Captured save');
});
test('controlled after-commit acknowledgement gate holds receipt while native bytes are observable',async()=>{
  const f=fixture(),e=f.make();await e.edit('Native accepted');let release,arrived;const reached=new Promise(resolve=>{arrived=resolve;});
  const saving=e.save({afterCommit:()=>new Promise(resolve=>{release=resolve;arrived();})});await reached;
  assert.equal(e.state.status,'Saving');assert.equal(f.db().records['A/X'].text,'Native accepted');await e.edit('Later');release();await saving;assert.equal(e.state.dirty,true);assert.equal(f.db().drafts['A/X/1'].text,'Later');assert.equal(f.db().drafts['A/X/1'].base,2);
});
test('newer saved revision blocks stale recovered draft, preserving both',async()=>{
  const f=fixture(),old=f.make(),newer=f.make();await old.edit('Old draft');
  // Setup represents another cooperative revision after a different writer resolved its slot.
  const db=f.db();db.records['A/X']={revision:2,text:'Newer record'};f.set(JSON.stringify(db));
  newer.open(A);newer.restore();const before=f.raw();await newer.save();assert.equal(f.raw(),before);assert.match(newer.state.status,/Newer saved revision/);assert.equal(newer.state.text,'Old draft');
});
for(const scope of [{...A,account:'B'},{...A,document:'Y'},{...A,lifetime:2}])test('scope isolation '+JSON.stringify(scope),async()=>{
  const f=fixture(),e=f.make();await e.edit('Only A X 1');e.open(scope);assert.equal(e.offered,null);assert.notEqual(e.state.text,'Only A X 1');e.restore();assert.match(e.state.status,/Restore blocked/);
});
test('expired context hides editor and old held save cannot commit to another owner',async()=>{
  const f=fixture(),e=f.make();await e.edit('A draft');let release;const saving=e.save({beforeDispatch:()=>new Promise(r=>{release=r;})});await new Promise(setImmediate);
  e.open(null);assert.equal(e.state.text,'');e.open({...A,account:'B'});await e.edit('B draft');release();await saving;assert.equal(e.state.text,'B draft');assert.equal(e.state.status,'Draft checkpointed; not saved');assert.equal(f.db().records['A/X'].revision,1);await e.save();assert.equal(f.db().records['B/X'].text,'B draft');
});
test('acknowledgement loss blocks retry; readback reconciles committed bytes',async()=>{
  const f=fixture(),e=f.make();await e.edit('Accepted native write');await e.save({loseAck:true});assert.equal(e.state.uncertain,true);assert.equal(e.state.dirty,true);const before=f.raw();await e.save();assert.equal(f.raw(),before);
  e.open(A);assert.equal(e.state.text,'Accepted native write');assert.equal(e.state.base,2);assert.equal(e.offered,null);assert.equal(e.state.status,'Ready');
});
test('two tabs cannot silently replace a draft slot',async()=>{
  const f=fixture(),a=f.make(),b=f.make();await a.edit('A owns slot');const before=f.raw();await b.edit('B memory only');assert.equal(f.raw(),before);assert.match(b.state.status,/Checkpoint failed/);await b.save();assert.equal(f.raw(),before);
});
test('two restorers use slot snapshot comparison for checkpoint and discard',async()=>{
  const f=fixture(),a=f.make();await a.edit('Original');const b=f.make(),c=f.make();b.restore();c.restore();await b.edit('Newer draft');const before=f.raw();await c.discard();assert.equal(f.raw(),before);assert.match(c.state.status,/Draft changed/);await c.edit('Obsolete edit');assert.equal(f.raw(),before);
});
test('explicit discard leaves saved record and clears exact selected slot',async()=>{
  const f=fixture(),e=f.make();await e.edit('Discard me');await e.discard();assert.equal(f.db().drafts['A/X/1'],undefined);assert.equal(e.state.text,'AX saved');assert.equal(e.state.status,'Draft discarded');
});
test('edits supersede a discard waiting for checkpoint without losing memory',async()=>{
  const f=fixture(),e=f.make();const first=e.edit('First');const discard=e.discard();const second=e.edit('Second');await Promise.all([first,discard,second]);assert.equal(e.state.text,'Second');assert.equal(f.db().drafts['A/X/1'].text,'Second');
});
test('rapid input retains final checkpoint; changed context drops queued checkpoints',async()=>{
  const f=fixture(),e=f.make();await Promise.all([e.edit('1'),e.edit('2'),e.edit('3')]);assert.equal(f.db().drafts['A/X/1'].text,'3');const p=e.edit('Do not store');e.open({...A,account:'B'});await p;assert.equal(f.db().drafts['A/X/1'].text,'3');
});
for(const delta of [TTL+1,-1])test('stale or future draft remains quarantined '+delta,async()=>{
  const f=fixture(),e=f.make();await e.edit('Retained');f.time(100000000+delta);const before=f.raw();e.open(A);assert.match(e.state.status,/quarantined/);e.restore();assert.match(e.state.status,/Restore blocked/);assert.equal(f.raw(),before);
});
test('expiry after restore prevents save without erasing draft',async()=>{
  const f=fixture(),e=f.make();await e.edit('Retained');e.open(A);e.restore();f.time(100000000+TTL+1);const before=f.raw();await e.save();assert.equal(f.raw(),before);assert.match(e.state.status,/not checkpointed or changed/);
});
test('malformed and oversized native records cause no automatic repair',()=>{
  const f=fixture();for(const raw of ['{','null','{}',JSON.stringify({...seed(),schema:2}),'x'.repeat(65537)]){f.set(raw);const e=f.make();assert.equal(e.state.scope,null);assert.equal(f.raw(),raw);}
});
test('strict schema rejects invalid scope, keys, text, revision and bounds',()=>{
  for(const mutate of [d=>{d.records['A/X'].revision=0;},d=>{d.records['A/X'].text='x'.repeat(2049);},d=>{d.records.extra={revision:1,text:''};},d=>{d.drafts['A/X/1']={scope:A,base:1,text:'ok',token:'t',time:-1};},d=>{d.drafts['B/X/1']={scope:A,base:1,text:'ok',token:'t',time:1};}]){const d=seed();mutate(d);assert.throws(()=>decode(JSON.stringify(d)));}
});
test('read/write denial and missing/refused lock fail closed (injected ports)',async()=>{
  const f=fixture(),e=f.make();f.denyWrite();await e.edit('Memory');assert.match(e.state.status,/memory only/);assert.equal(f.db().drafts['A/X/1'],undefined);
  for(const lock of [null,()=>Promise.reject(new Error('Refused'))]){const r=new Editor({storage:f.storage,lock});r.open(A);await r.edit('Blocked');assert.match(r.state.status,/Checkpoint failed/);}
  f.denyRead();e.open(A);assert.equal(e.state.scope,null);
});
test('revision exhaustion cannot overwrite or remove retained draft',async()=>{
  const f=fixture(),db=f.db();db.records['A/X'].revision=1000000;f.set(JSON.stringify(db));const e=f.make();await e.edit('Limit');const before=f.raw();await e.save();assert.equal(f.raw(),before);assert.match(e.state.status,/Revision limit/);
});
test('disposable faults pass ordinary control then fail named boundary assertions',async()=>{
  const source=await fs.readFile(new URL('../evals/draft-recovery/policy.mjs',import.meta.url),'utf8');
  const faults=[
    {id:'missing-base',from:"if(db.records[recordKey(scope)].revision!==base)",to:'if(false)',probe:async Type=>{const f=fixture(Type),e=f.make();await e.edit('Stale');const d=f.db();d.records['A/X']={revision:2,text:'Newer'};f.set(JSON.stringify(d));e.open(A);e.restore();await e.save();assert.equal(f.db().records['A/X'].text,'Newer','newer-record-preserved');}},
    {id:'missing-scope',from:'export const slotKey = c => recordKey(c) + \'/\' + c.lifetime;',to:"export const slotKey = c => 'A/X/1';",probe:async Type=>{const f=fixture(Type),e=f.make();await e.edit('Private synthetic A');e.open({...A,account:'B'});assert.equal(e.offered,null,'other-owner-no-offer');}},
    {id:'restore-certifies',from:"dirty:true,status:'Draft restored; not saved'",to:"dirty:false,status:'Saved'",probe:async Type=>{const f=fixture(Type),e=f.make();await e.edit('Unsaved');e.open(A);e.restore();assert.equal(e.state.dirty,true,'restore-remains-unsaved');}},
    {id:'old-receipt-certifies-newer',from:'if(sequence!==this.sequence) {',to:'if(false) {',probe:async Type=>{const h=heldSaveReceipt(Type);await h.e.edit('Captured');h.arm();const saving=h.e.save();await h.reached;await h.e.edit('Newer');h.release();await saving;assert.equal(h.e.state.dirty,true,'older-receipt-preserves-newer-draft');}}
  ];
  for(const fault of faults){assert.ok(source.includes(fault.from),fault.id);const {Editor:Type}=await import('data:text/javascript;base64,'+Buffer.from(source.replace(fault.from,fault.to)).toString('base64'));await ordinary(Type);await assert.rejects(fault.probe(Type),e=>e.code==='ERR_ASSERTION' && /newer-record-preserved|other-owner-no-offer|restore-remains-unsaved|older-receipt-preserves-newer-draft/.test(e.message),fault.id);}
});
