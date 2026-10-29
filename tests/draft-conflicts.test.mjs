import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Editor,KEY,TTL,decode,seed} from '../evals/draft-recovery/policy.mjs';
const A={account:'A',document:'X',lifetime:1};
function fixture(Type=Editor) {
  let raw=JSON.stringify(seed()),time=100000000,serial=0,chain=Promise.resolve(),denyRead=false,denyWrite=false;
  const storage={getItem:()=>{if(denyRead)throw new Error('Injected read denial');return raw;},setItem:(k,v)=>{assert.equal(k,KEY);if(denyWrite)throw new Error('Injected write denial');raw=v;}};
  const lock=(name,fn)=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;};
  const make=()=>{const e=new Type({storage,lock,now:()=>time,token:()=>`decision-${++serial}`});e.open(A);return e;};
  return {make,db:()=>JSON.parse(raw),raw:()=>raw,set:v=>{raw=typeof v==='string'?v:JSON.stringify(v);},time:v=>{time=v;},denyRead:()=>{denyRead=true;},denyWrite:()=>{denyWrite=true;}};
}
function gate() {let release,arrive;return {reached:new Promise(r=>{arrive=r;}),hold:()=>new Promise(r=>{release=r;arrive();}),release:()=>release()};}

test('comparison reads exact retained/latest snapshots and never replaces memory or bytes',async()=>{
  const f=fixture(),a=f.make();await a.edit('  Retained Ω <tag>  ');const b=f.make();
  const db=f.db();db.records['A/X']={revision:2,text:'Latest record'};f.set(db);
  const before=f.raw(),state=structuredClone(b.state),c=b.compare('retained');
  assert.equal(c.text,'  Retained Ω <tag>  ');assert.equal(c.base,1);assert.deepEqual(c.latest,{revision:2,text:'Latest record'});assert.equal(c.retention,'Retained checkpoint');
  assert.equal(f.raw(),before);for(const k of ['text','saved','base','dirty'])assert.deepEqual(b.state[k],state[k]);
});
test('explicit keep both preserves newer original and every draft; exact copy survives fresh instance',async()=>{
  const f=fixture(),a=f.make();await a.edit('  retained Ω <tag>  ');const b=f.make();
  const db=f.db();db.records['A/X']={revision:2,text:'Newer original'};f.set(db);const before=f.db();
  b.compare('retained');await b.keepBoth();const after=f.db();
  assert.deepEqual(after.records,before.records);assert.deepEqual(after.drafts,before.drafts);assert.equal(after.copies['1'].text,'  retained Ω <tag>  ');assert.equal(after.copies['1'].latest,2);
  assert.equal(b.state.text,'AX saved');assert.equal(b.state.dirty,false);assert.match(b.state.status,/editor not saved/);
  const reopened=f.make();assert.equal(reopened.state.text,'Newer original');assert.equal(reopened.copies[0].text,'  retained Ω <tag>  ');assert.equal(reopened.copies[0].eligible,true);
});
test('memory-only copy preserves peer checkpoint and remains unsaved',async()=>{
  const f=fixture(),a=f.make(),b=f.make();await a.edit('Peer checkpoint');await b.edit('My memory');assert.match(b.state.status,/memory only/);
  assert.match(b.compare().retention,/Memory only/);const before=f.db();await b.keepBoth();
  assert.deepEqual(f.db().records,before.records);assert.deepEqual(f.db().drafts,before.drafts);assert.equal(f.db().copies['1'].text,'My memory');assert.equal(b.state.dirty,true);assert.equal(b.state.text,'My memory');
});
for(const change of ['record','slot'])test('effect revalidation rejects changed '+change+' without browser event',async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');e.compare();const g=gate(),copy=e.keepBoth({beforeDispatch:g.hold});await g.reached;
  const db=f.db();if(change==='record')db.records['A/X']={revision:2,text:'Peer saved'};else db.drafts['A/X/1'].text='Peer draft';f.set(db);const before=f.raw();g.release();await copy;
  assert.equal(f.raw(),before);assert.match(e.state.status,/changed; compare again/);assert.equal(e.choice,null);
});
for(const action of ['input','restore','account','document','lifetime','expire','event'])test('held choice invalidated by '+action,async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');e.compare();const g=gate(),copy=e.keepBoth({beforeDispatch:g.hold});await g.reached;
  if(action==='input')await e.edit('Newer input');
  else if(action==='restore')e.restore();
  else if(action==='expire')e.open(null);
  else if(action==='event')e.invalidateChoice();
  else e.open({...A,[action]:action==='account'?'B':action==='document'?'Y':2});
  const before=f.raw(),state=structuredClone(e.state);g.release();await copy;assert.equal(f.raw(),before);assert.equal(f.db().copies,undefined);assert.equal(e.state.text,state.text);
});
for(const delta of [TTL+1,-1])test('decision clock boundary fails closed '+delta,async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');e.compare();f.time(100000000+delta);const before=f.raw();await e.keepBoth();assert.equal(f.raw(),before);assert.match(e.state.status,/expired/);
});
test('retained source expires even while decision itself remains recent',async()=>{
  const f=fixture(),e=f.make();await e.edit('Retained');f.time(100000000+TTL-1);e.compare('retained');f.time(100000000+TTL+1);const before=f.raw();await e.keepBoth();assert.equal(f.raw(),before);assert.match(e.state.status,/changed; compare again/);
});
test('concurrent explicit copies allocate unique IDs under the shared lock',async()=>{
  const f=fixture(),a=f.make(),b=f.make();await a.edit('A retained');await b.edit('B memory');a.compare('retained');b.compare();
  await Promise.all([a.keepBoth(),b.keepBoth()]);assert.deepEqual(Object.keys(f.db().copies),['1','2']);assert.deepEqual(Object.values(f.db().copies).map(c=>c.text),['A retained','B memory']);
});
test('repeat confirmation and unknown acknowledgement cannot replay the decision',async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');e.compare();const g=gate(),copy=e.keepBoth({afterCommit:g.hold,loseAck:true});await g.reached;
  await e.keepBoth();assert.equal(Object.keys(f.db().copies).length,1);g.release();await copy;assert.equal(e.state.uncertain,true);e.compare();await e.keepBoth();assert.equal(Object.keys(f.db().copies).length,1);
  e.open(A);assert.equal(e.copies.length,1);assert.equal(e.copies[0].text,'Selected');assert.equal(e.state.uncertain,false);assert.equal(e.choice,null);
});
test('exception after native commit requires reconciliation and preserves newer text',async()=>{
  const f=fixture(),e=f.make();await e.edit('Captured');e.compare();const g=gate(),copy=e.keepBoth({afterCommit:async()=>{await g.hold();throw new Error('Receipt lost');}});await g.reached;
  await e.edit('Newer');g.release();await copy;assert.equal(e.state.text,'Newer');assert.equal(e.state.dirty,true);assert.equal(e.state.uncertain,true);assert.equal(f.db().copies['1'].text,'Captured');assert.equal(f.db().drafts['A/X/1'].text,'Newer');
});
test('copy receipt cannot certify newer input or alter another context',async()=>{
  for(const switchOwner of [false,true]) {
    const f=fixture(),e=f.make();await e.edit('Captured');e.compare();const g=gate(),copy=e.keepBoth({afterCommit:g.hold});await g.reached;
    if(switchOwner)e.open({...A,account:'B'});await e.edit('Newer');const state=structuredClone(e.state);g.release();await copy;assert.deepEqual(e.state,state);assert.equal(f.db().copies['1'].text,'Captured');
  }
});
test('copy capacity blocks without eviction; expired copies are scoped and quarantined',async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');for(let i=0;i<8;i++){e.compare();await e.keepBoth();}const before=f.raw();e.compare();await e.keepBoth();assert.equal(f.raw(),before);assert.match(e.state.status,/capacity/);
  f.time(100000000+TTL+1);e.open(A);assert.equal(e.copies.length,8);assert.ok(e.copies.every(c=>!c.eligible));e.open({...A,account:'B'});assert.equal(e.copies.length,0);e.open({...A,document:'Y'});assert.equal(e.copies.length,0);e.open({...A,lifetime:2});assert.equal(e.copies.length,0);
});
test('comparison and copy fail closed on unavailable/malformed/oversized storage or locks',async()=>{
  for(const mode of ['read','write','malformed','full-bytes','lock','reject']) {
    const f=fixture(),e=f.make();await e.edit('Selected');e.compare();
    if(mode==='read')f.denyRead();if(mode==='write')f.denyWrite();if(mode==='malformed')f.set('{');if(mode==='full-bytes')f.set('x'.repeat(65537));if(mode==='lock')e.lock=null;
    const before=f.raw();await e.keepBoth({reject:mode==='reject'});assert.equal(f.raw(),before);assert.equal(e.state.text,'Selected');assert.equal(e.state.dirty,true);assert.match(e.state.status,/Copy not confirmed/);assert.equal(e.choice,null);
  }
});
test('strict copy schema and total UTF8 envelope bounds are validated',async()=>{
  const f=fixture(),e=f.make();await e.edit('Selected');e.compare();await e.keepBoth();
  for(const mutate of [d=>{d.copies=null;},d=>{d.copies['9']=d.copies['1'];delete d.copies['1'];},d=>{d.copies['2']={...d.copies['1']};},d=>{d.copies['1'].scope.account='C';},d=>{d.copies['1'].source='unknown';},d=>{d.copies['1'].text='x'.repeat(2049);},d=>{d.copies['1'].latest=0;},d=>{d.copies['1'].time=-1;}]){const db=f.db();mutate(db);assert.throws(()=>decode(JSON.stringify(db)));}
  const db=f.db();for(const a of ['A','B'])for(const d of ['X','Y']) {db.records[a+'/'+d].text='Ω'.repeat(2048);for(const l of [1,2])db.drafts[a+'/'+d+'/'+l]={scope:{account:a,document:d,lifetime:l},base:1,text:'Ω'.repeat(2048),token:'t',time:1};}
  for(let i=1;i<=8;i++)db.copies[i]={...db.copies['1'],decision:'d-'+i,text:'Ω'.repeat(2048)};assert.throws(()=>decode(JSON.stringify(db)),/oversized/);
});
test('copy token collisions cannot overwrite or duplicate an existing decision',async()=>{
  const f=fixture(),e=f.make();e.token=()=> 'fixed';await e.edit('Selected');e.compare();await e.keepBoth();const before=f.raw();e.compare();await e.keepBoth();assert.equal(f.raw(),before);assert.match(e.state.status,/already recorded/);
});
test('failed copy keeps memory-only recovery feedback explicit',async()=>{
  const f=fixture(),a=f.make(),b=f.make();await a.edit('Peer slot');await b.edit('Memory only');b.compare();f.denyWrite();await b.keepBoth();assert.match(b.state.status,/Copy not confirmed; Memory only; reload can lose this text/);
});
test('selected copy faults pass ordinary save/copy controls before named assertion mismatches',async()=>{
  const source=await fs.readFile(new URL('../evals/draft-recovery/policy.mjs',import.meta.url),'utf8');
  for(const fault of [
    {id:'missing-latest',from:'bytes(db.records[recordKey(selected.scope)])!==bytes(selected.latest)',to:'false',probe:async Type=>{const f=fixture(Type),e=f.make();await e.edit('Selected');e.compare();const db=f.db();db.records['A/X']={revision:2,text:'Peer'};f.set(db);await e.keepBoth();assert.equal(f.db().copies,undefined,'stale-copy-choice-rejected');}},
    {id:'missing-slot',from:'bytes(slot)!==selected.slot',to:'false',probe:async Type=>{const f=fixture(Type),e=f.make();await e.edit('Selected');e.compare();const db=f.db();db.drafts['A/X/1'].text='Peer slot';f.set(db);await e.keepBoth();assert.equal(f.db().copies,undefined,'changed-slot-choice-rejected');}},
    {id:'missing-sequence',from:'selected.sequence!==this.sequence ||',to:'',probe:async Type=>{const f=fixture(Type),a=f.make(),e=f.make();await a.edit('Peer slot');await e.edit('Captured memory');e.compare();const g=gate(),p=e.keepBoth({beforeDispatch:g.hold});await g.reached;await e.edit('Newer memory');g.release();await p;assert.equal(f.db().copies,undefined,'new-input-choice-rejected');}}
  ]) {
    assert.ok(source.includes(fault.from),fault.id);const {Editor:Type}=await import('data:text/javascript;base64,'+Buffer.from(source.replace(fault.from,fault.to)).toString('base64'));
    const f=fixture(Type),e=f.make();await e.edit('Ordinary');await e.save();assert.equal(f.db().records['A/X'].text,'Ordinary');await e.edit('Copy');e.compare();await e.keepBoth();assert.equal(f.db().copies['1'].text,'Copy');
    await assert.rejects(fault.probe(Type),e=>e.code==='ERR_ASSERTION' && /stale-copy-choice-rejected|changed-slot-choice-rejected|new-input-choice-rejected/.test(e.message),fault.id);
  }
});
