import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {auditReport,layoutFailures,verifyFrozen,inspect} from '../evals/responsive-layouts/check.mjs';
import {fixturePage} from '../evals/responsive-layouts/server.mjs';
const root=new URL('../evals/responsive-layouts/',import.meta.url);
const report=()=>JSON.parse(fs.readFileSync(new URL('observed.json',root)));
test('retained browser observations satisfy frozen layout and interaction expectations',()=>{assert.equal(auditReport(report()),true);});
test('frozen expectations and unchanged historical application are bound to evidence',()=>{
  verifyFrozen();const identity=JSON.parse(fs.readFileSync(new URL('identity.json',root)));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../interface-accessibility/app.js',root))).digest('hex'),identity.referenceAppSha256);
  for(const [name,hash]of Object.entries(JSON.parse(fs.readFileSync(new URL('observed-identity.json',root))).files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex'),hash,name);
});
for(const [name,change] of [
  ['missing capture',r=>r.captures.splice(2,1)],
  ['duplicate capture',r=>r.captures.push(r.captures[0])],
  ['browser action failure',r=>r.errors.push('Native input unavailable')],
  ['unfinished run',r=>r.completed=false],
  ['stale saved content',r=>r.captures.at(-1).actual.rows[19].text='Task 20 Å — Open'],
  ['lost focus',r=>r.captures[7].actual.active='BODY'],
  ['empty entry action missing',r=>r.emptyEditor.hidden=true],
  ['obscured action',r=>r.controls[2].hit=false],
  ['caller-approved wrong geometry',r=>{r.captures[1].actual.scrollWidth=900;r.captures[1].failures=[];}],
  ['defect failed ordinary view',r=>r.defects[0].ordinary.scrollWidth=1200],
  ['defect never distinguished',r=>{r.defects[1].extreme=r.captures[3].actual;}]
])test('actual report audit rejects '+name,()=>{const r=report();change(r);assert.throws(()=>auditReport(r),e=>e.code==='ERR_ASSERTION');});
test('measurement comparison does not promote invalid case, clipping or overflow to success',()=>{
  const a=report().captures[0].actual;assert.throws(()=>layoutFailures(a,'unknown'));
  for(const [property,value,failure]of [['font',32,'font'],['columns',1,'columns'],['scrollWidth',1200,'horizontal-overflow'],['clipped',['task-1'],'ancestor-clipping']])assert.ok(layoutFailures({...a,[property]:value},'ordinary').includes(failure));
});
test('measurement adapter propagates browser failures instead of inventing geometry',async()=>{
  await assert.rejects(inspect({playwright:{evaluate:async()=>{throw Error('Unavailable browser');}}}),/Unavailable browser/);
});
test('fixture rejects unknown inputs and keep mode does not overwrite existing storage',()=>{
  assert.throws(()=>fixturePage('unknown'));assert.throws(()=>fixturePage('ordinary','unknown'));
  assert.equal(fixturePage('volume','candidate',true).includes('localStorage.setItem'),false);
});
