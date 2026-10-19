import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {app,source,environment,tick} from '../evals/interface-accessibility/model-harness.mjs';
import {auditCaptures,checkpoints,runBrowserChecks} from '../evals/interface-accessibility/browser-check.mjs';
import {profile} from '../evals/interface-accessibility/profile.mjs';
const active=a=>a.document.activeElement.id;
const cancelCase=code=>{const a=app(code);a.open(0);a.click('abandon');assert.equal(a.ui.form.hidden,true);assert.equal(active(a),'task-1');};
const errorCase=async code=>{const a=app(code);a.click('add');const before=a.env.store.raw;await a.save();assert.equal(a.env.store.raw,before);assert.equal(a.ui.name.attrs['aria-invalid'],'true');assert.equal(a.ui.invalid.textContent,'Title is required.');assert.equal(active(a),'name');a.input('  Corrected  ');assert.equal(a.ui.name.attrs['aria-invalid'],'false');assert.equal(a.ui.invalid.textContent,'');await a.save();assert.equal(JSON.parse(a.env.store.raw).items.at(-1).title,'Corrected');};
const failureCase=async code=>{const a=app(code);a.open(0);a.input('First');await a.save('submit');assert.equal(active(a),'submit');const before=a.env.store.raw;a.input('Keep draft');a.env.store.reject=true;await a.save('submit');assert.equal(a.env.store.raw,before);assert.equal(a.ui.name.value,'Keep draft');assert.equal(a.ui.notice.textContent,'Save failed');assert.equal(active(a),'submit');await a.save('submit');assert.equal(a.ui.notice.textContent,'Saved');assert.equal(a.ui.problem.textContent,'');assert.equal(JSON.parse(a.env.store.raw).items[0].title,'Keep draft');};
test('deterministic double: cancel follows stable row identity after rerender',()=>cancelCase(source));
test('deterministic double: new/filtered-away opener falls back to New task',async()=>{
  const a=app();a.click('add');a.click('abandon');assert.equal(active(a),'add');
  a.filter('open');a.open(0);a.ui.complete.checked=true;await a.save();a.click('abandon');assert.equal(active(a),'add');assert.equal(a.ui.rows.children[0].textContent,'No tasks.');
});
test('deterministic double: validation preserves store and correction clears obsolete invalid state',()=>errorCase(source));
test('deterministic double: success/rejection/retry restores invoking control and truthful feedback',()=>failureCase(source));
test('deterministic double: pending save does not steal focus moved elsewhere',async()=>{
  const env=environment(),a=app(source,env);a.open(0);a.input('Held');env.locks.hold();await a.save('submit');assert.equal(active(a),'BODY');a.ui.elsewhere.focus();env.locks.release();await tick();assert.equal(active(a),'elsewhere');assert.equal(a.ui.notice.textContent,'Saved');
});
test('deterministic double: conflict recovery keeps data and restores Title after disappearing copy',async()=>{
  const a=app();a.open(0);a.input('Draft');a.env.store.raw=JSON.stringify({version:1,items:[{id:1,title:'Other',done:false}]});await a.save();assert.equal(a.ui.recovery.hidden,false);a.click('copy');await tick();assert.equal(active(a),'name');assert.deepEqual(JSON.parse(a.env.store.raw).items.map(n=>n.title),['Other','Draft']);
});
for(const [name,from,to,scenario] of [
  ['lost Cancel focus','(document.getElementById(`task-${openerId}`) ?? ui.add).focus();','',cancelCase],
  ['missing invalid state',"ui.name.setAttribute('aria-invalid','true');",'',errorCase],
  ['obsolete error after correction',"if(ui.name.value.trim())clearInvalid();",'',errorCase],
  ['stale success after rejected save',"catch {ui.notice.textContent='Save failed';","catch {ui.notice.textContent='Saved';",failureCase],
  ['lost async focus','target.focus();','void 0;',failureCase]
])test('targeted application mutant rejected by behavioral assertion: '+name,async()=>{
  assert.equal(source.split(from).length,2,'Mutation must identify exactly one source location');
  await assert.rejects(async()=>scenario(source.replace(from,to)),e=>e.code==='ERR_ASSERTION');
});
test('historical improved fixture stays byte-identical',()=>{
  const expected={'index.html':'3be22d8ee7ecd60f0cb7d423e4ceb0ec6bbf1aa4e53af0ad69f75be4718af162','app.js':'61d03ba652ed09760a7ca3f032056cd87b6083660e806a8e948e11bcc438ff06'};
  for(const [name,hash]of Object.entries(expected))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../evals/browser-improvement/improved/'+name,import.meta.url))).digest('hex'),hash);
});
test('capture audit rejects omissions, duplicates, self-approved wrong focus and errors',()=>{
  const good={errors:[],captures:checkpoints.map(label=>({label,actual:structuredClone(profile[label])}))};
  assert.equal(auditCaptures(good),true);
  const wrong=structuredClone(good);wrong.captures[11].actual.active='BODY';wrong.captures[11].expected=wrong.captures[11].actual;
  for(const bad of [wrong,{...good,captures:good.captures.slice(1)},{...good,captures:[...good.captures,good.captures[0]]},{...good,errors:['Action failed']}])assert.throws(()=>auditCaptures(bad),e=>e.code==='ERR_ASSERTION');
});
test('browser replay persists actual adapter failure and never reports completion',async()=>{
  let report;await assert.rejects(runBrowserChecks(async()=>{throw Error('Unavailable action');},async r=>{report=r;}),/Unavailable action/);
  assert.equal(report.captures.length,0);assert.equal(report.errors.length,1);assert.throws(()=>auditCaptures(report));
});
