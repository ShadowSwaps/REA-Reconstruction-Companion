import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {app,environment,seed,tick} from '../evals/browser-improvement/model-harness.mjs';
import {runBrowserChecks} from '../evals/browser-improvement/browser-check.mjs';
import {profile,auditCaptures} from '../evals/browser-improvement/profile.mjs';
const titles=env=>JSON.parse(env.store.raw).items.map(x=>x.title);
const hashes={
  'reference/index.html':'686e977381dd33880dc9be478062053418077761107a7e364d04193161c999a3',
  'reference/app.js':'ed392ef1d7c581bf40af3dbfb12bc157902580992c6aad052931aeb0369c7335',
  'parity/index.html':'ec021e4220a49919245de8c314422bbc4223bbbeed9e5940e020866f682fe8df',
  'parity/app.js':'9022fd0a2145d6c47f1386bfac969f989bf84be0dcc71b89e7ca4e5dc3d34e2a'
};
test('historical reference/parity bytes remain frozen',()=>{
  for(const [file,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../evals/browser-improvement/'+file,import.meta.url))).digest('hex'),hash,file);
});
for(const target of ['reference','parity','improved']) {
  test(`${target}: unaffected create/edit/trim/validation/filter/cancel/reload`,async()=>{
    const a=app(target);assert.deepEqual(a.snapshot().rows,['Alpha — Open','Beta — Done']);
    a.open(1);a.input('  Béta <tag>  ',true);await a.save();
    assert.deepEqual(titles(a.env),['Alpha','Béta <tag>']);assert.equal(a.snapshot().status,'Saved');
    a.input('   ');const before=a.env.store.raw;await a.save();assert.equal(a.snapshot().invalid,'Title is required.');assert.equal(a.env.store.raw,before);
    a.click('abandon');assert.equal(a.snapshot().hidden,true);
    a.filter('open');assert.deepEqual(a.snapshot().rows,['Alpha — Open']);
    a.click('add');a.input('Γάμμα',false);await a.save();assert.deepEqual(titles(a.env),['Alpha','Béta <tag>','Γάμμα']);
    a.input('unsaved');const fresh=app(target,a.env);assert.deepEqual(fresh.snapshot().rows,['Alpha — Open','Béta <tag> — Done','Γάμμα — Open']);assert.equal(fresh.snapshot().hidden,true);assert.equal(fresh.snapshot().status,'Ready');
  });
  test(`${target}: failed save after prior success distinguishes improvement from parity`,async()=>{
    const a=app(target);a.open(0);a.input('First');await a.save();const bytes=a.env.store.raw,rows=a.snapshot().rows;
    a.input('  Kept draft  ',true);a.env.store.reject=true;await a.save();
    assert.equal(a.snapshot().stored,bytes);assert.deepEqual(a.snapshot().rows,rows);assert.equal(a.snapshot().title,'  Kept draft  ');assert.equal(a.snapshot().done,true);assert.match(a.snapshot().error,/Save failed/);
    // Deliberate baseline failures of I1 are asserted, never counted as improvement passes.
    assert.equal(a.snapshot().status,target==='improved'?'Save failed':'Saved');
    await a.save();assert.equal(a.snapshot().status,'Saved');assert.equal(a.snapshot().error,'');assert.deepEqual(titles(a.env),['Kept draft','Beta']);
  });
  test(`${target}: failed new task retains draft/store and retry allocates once`,async()=>{
    const a=app(target);a.click('add');a.input('  New  ',true);a.env.store.reject=true;const before=a.env.store.raw;await a.save();
    assert.equal(a.env.store.raw,before);assert.equal(a.snapshot().title,'  New  ');assert.equal(a.snapshot().done,true);
    await a.save();assert.deepEqual(JSON.parse(a.env.store.raw).items.at(-1),{id:3,title:'New',done:true});
  });
  for(const newTask of [false,true]) test(`${target}: stale ${newTask?'new-ID collision':'different-record edit'} discriminates I2`,async()=>{
    const env=environment(),a=app(target,env),b=app(target,env);
    if(newTask){a.click('add');b.click('add');}else{a.open(0);b.open(1);}
    a.input('A');b.input('B');await a.save();const bytes=env.store.raw;await b.save();
    if(target==='improved') {assert.equal(env.store.raw,bytes);assert.equal(b.snapshot().status,'Conflict — draft kept');assert.equal(b.snapshot().title,'B');assert.equal(b.snapshot().recovery,true);}
    else assert.deepEqual(titles(env),newTask?['Alpha','Beta','B']:['Alpha','B']);
  });
}
for(const initial of ['[]','null','{"version":2,"items":[]}','bad'])test('improved: unchanged malformed startup can be explicitly repaired: '+initial,async()=>{
  const a=app('improved',environment(initial));assert.equal(a.snapshot().error,'Storage could not be read.');a.open(0);assert.equal(a.snapshot().error,'Storage could not be read.');a.input('Repair');await a.save();assert.deepEqual(titles(a.env),['Repair','Beta']);assert.equal(a.snapshot().error,'');
});
test('improved: feedback clears on input and invalid submission',async()=>{
  const a=app('improved');a.open(0);await a.save();a.input('');assert.equal(a.snapshot().status,'Unsaved changes');await a.save();assert.equal(a.snapshot().status,'Not saved');
});
for(const capability of ['missing','insecure','refused','read'])test('improved: fail closed on '+capability,async()=>{
  const env=environment(),a=app('improved',env,{capability:capability!=='missing',secure:capability!=='insecure'});
  a.open(0);a.input('Keep');if(capability==='refused')env.locks.deny=true;if(capability==='read')env.store.unreadable=true;
  const before=env.store.raw;await a.save();assert.equal(env.store.raw,before);assert.equal(env.store.writes,0);assert.equal(a.snapshot().title,'Keep');assert.equal(a.snapshot().status,'Save failed');
});
test('improved: startup read failure never overwrites unknown store',async()=>{
  const env=environment();env.store.unreadable=true;const a=app('improved',env);env.store.unreadable=false;
  a.open(0);a.input('Keep');await a.save();assert.equal(env.store.writes,0);assert.equal(a.snapshot().status,'Conflict — draft kept');
});
for(const newTask of [false,true])for(const reverse of [false,true])test(`improved: overlapping ${newTask?'new':'existing'} writes, ${reverse?'B':'A'} first`,async()=>{
  const env=environment(),a=app('improved',env),b=app('improved',env);
  if(newTask){a.click('add');b.click('add');}else{a.open(0);b.open(0);}
  a.input('A');b.input('B');const first=reverse?b:a,second=reverse?a:b;
  env.locks.hold();await first.save();assert.equal(env.locks.entered,1);assert.equal(env.store.writes,0);assert.equal(first.ui.name.disabled,true);
  await second.save();assert.equal(env.locks.requests,2);assert.equal(env.locks.entered,1);assert.equal(second.snapshot().status,'Saving…');
  env.locks.release();await tick();assert.equal(first.snapshot().status,'Saved');assert.equal(second.snapshot().status,'Conflict — draft kept');assert.equal(env.store.writes,1);
  const before=env.store.raw,draft=second.snapshot().title;second.click('latest');assert.equal(env.store.raw,before);assert.equal(second.snapshot().title,draft);assert.equal(second.snapshot().status,'Latest loaded — draft kept');
  await second.save();assert.equal(env.store.raw,before);second.click('copy');await tick();
  assert.deepEqual(titles(env),newTask?['Alpha','Beta',reverse?'B':'A',draft]:[reverse?'B':'A','Beta',draft]);assert.equal(new Set(JSON.parse(env.store.raw).items.map(x=>x.id)).size,JSON.parse(env.store.raw).items.length);
});
test('improved: two overlapping recovery copies allocate distinct IDs',async()=>{
  const env=environment(),a=app('improved',env),b=app('improved',env),writer=app('improved',env);
  a.open(0);b.open(1);a.input('Copy A');b.input('Copy B');writer.open(0);writer.input('Winner');await writer.save();await a.save();await b.save();
  env.locks.hold();a.click('copy');await tick();b.click('copy');await tick();assert.equal(env.store.writes,1);env.locks.release();await tick();
  assert.deepEqual(JSON.parse(env.store.raw).items,[{id:1,title:'Winner',done:false},{id:2,title:'Beta',done:true},{id:3,title:'Copy A',done:false},{id:4,title:'Copy B',done:true}]);
});
test('improved: malformed recovery and copy refuse writes; cancel recovers latest',async()=>{
  const env=environment(),a=app('improved',env);a.open(0);a.input('Keep');env.store.raw='bad';await a.save();a.click('latest');assert.equal(a.snapshot().title,'Keep');assert.equal(a.snapshot().status,'Read failed — draft kept');
  a.click('copy');await tick();assert.equal(env.store.raw,'bad');assert.equal(env.store.writes,0);assert.equal(a.snapshot().status,'Save failed');
  env.store.raw=JSON.stringify({version:1,items:[{id:9,title:'Latest',done:true}]});a.click('abandon');assert.equal(a.snapshot().hidden,true);assert.deepEqual(a.snapshot().rows,['Latest — Done']);a.open(0);a.input('Intentional');await a.save();assert.deepEqual(titles(env),['Intentional']);
});
test('improved: conflict draft cannot be discarded by row/new clicks',async()=>{
  const a=app('improved');a.open(0);a.input('Keep');a.env.store.raw=JSON.stringify({version:1,items:[]});await a.save();a.click('add');a.open(1);assert.equal(a.snapshot().title,'Keep');assert.equal(a.snapshot().recovery,true);
});
test('improved: empty/sparse stores and ID exhaustion',async()=>{
  for(const [items,id] of [[[],1],[[{id:47,title:'Sparse',done:false}],48]]) {const a=app('improved',environment(JSON.stringify({version:1,items})));a.click('add');a.input('New');await a.save();assert.equal(JSON.parse(a.env.store.raw).items.at(-1).id,id);}
  const env=environment(JSON.stringify({version:1,items:[{id:Number.MAX_SAFE_INTEGER,title:'Limit',done:false}]})),a=app('improved',env);a.click('add');a.input('Keep');await a.save();assert.equal(env.store.writes,0);assert.equal(a.snapshot().status,'Save failed');assert.equal(a.snapshot().title,'Keep');
});
test('actual browser replay path records and rejects action failures',async()=>{
  let evidence;
  await assert.rejects(runBrowserChecks(async()=>{throw Error('Actual action failure');},async data=>{evidence=data;}),/Actual action failure/);
  assert.equal(evidence.captures.length,0);assert.equal(evidence.errors.length,1);
});
test('actual browser comparison path rejects matching wrong or absent states',async()=>{
  for(const actual of [{rows:[],status:'Ready',hidden:true},{}]) {
    let evidence;
    const tab={playwright:{getByRole:()=>({click:async()=>{}}),domSnapshot:async()=>'Wrong matching UI',evaluate:async()=>actual,locator:()=>({textContent:async()=>JSON.stringify(seed)})}};
    await assert.rejects(runBrowserChecks(async()=>tab,async data=>{evidence=data;},{targets:['reference']}));
    assert.equal(evidence.captures.length,1);assert.ok(evidence.errors.length>0);
  }
});
test('capture auditor rejects forged flags/expectations, duplicates, omissions and errors',()=>{
  // Synthetic oracle records exercise the auditor only; they are not browser evidence.
  const base={errors:[],captures:['reference','parity','improved'].flatMap(target=>Object.entries(profile(target)).map(([label,oracle])=>({target,label,ax:'Synthetic auditor challenge',stored:oracle.stored,actual:{rows:[],selected:[],title:'',done:false,status:'',error:label==='failed-after-success'||label==='new-failure'?'Save failed.':'',invalid:'',hidden:false,scope:'all',busy:false,recovery:false,probe:JSON.stringify({secure:true,locks:true,held:label.endsWith('-held'),requests:1,entered:0,writes:0}),...oracle.fields}})))};
  assert.equal(auditCaptures(base).checkpoints,75);
  for(const mutate of [r=>{r.captures[0].actual.rows=['Wrong'];r.captures[0].expected={rows:['Wrong']};r.captures[0].pass=true;},r=>r.captures.push(r.captures[0]),r=>r.captures.pop(),r=>{delete r.captures[0].actual.hidden;},r=>r.errors.push({message:'Timeout'}),r=>{r.captures[0].stored='wrong';}]) {
    const changed=structuredClone(base);mutate(changed);assert.throws(()=>auditCaptures(changed));
  }
});
test('published browser records recompute against acceptance and bind executed source bytes',()=>{
  const report=JSON.parse(fs.readFileSync(new URL('../evals/browser-improvement/observed.json',import.meta.url)));
  assert.equal(auditCaptures(report.main).checkpoints,75);
  for(const [file,hash]of Object.entries(report.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../evals/browser-improvement/'+file,import.meta.url))).digest('hex'),hash,file);
  const captures=report.supplemental.captures;
  assert.deepEqual(captures.map(x=>x.label),['seed-a','seed-b','conflict-a','conflict-b','copy-held','copy-queued','copy-a-saved','copy-b-saved','malformed-recovery','cancel-latest','startup-warning-retained']);
  const copies={version:1,items:[{id:1,title:'Winner',done:false},seed.items[1],{id:3,title:'Copy A',done:false},{id:4,title:'Copy B',done:true}]};
  for(const label of ['copy-a-saved','copy-b-saved']){const c=captures.find(x=>x.label===label);assert.equal(c.actual.status,'Saved');assert.deepEqual(JSON.parse(c.stored),copies);}
  assert.deepEqual(captures.find(x=>x.label==='malformed-recovery'),{label:'malformed-recovery',draft:'Keep malformed',status:'Save failed',stored:'malformed'});
  const cancel=captures.find(x=>x.label==='cancel-latest');assert.equal(cancel.actual.hidden,true);assert.equal(cancel.stored,JSON.stringify(seed));
  const warning=captures.at(-1);assert.equal(warning.before,'Storage could not be read.');assert.equal(warning.duringEdit,warning.before);assert.equal(warning.after,'');assert.deepEqual(JSON.parse(warning.stored).items,[{id:1,title:'Repaired',done:false},seed.items[1]]);
});
