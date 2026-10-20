import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCase, workedDecision, checkDecision, verifyFreeze } from '../evals/conflicting-evidence/run.mjs';
import { sortRows } from '../evals/conflicting-evidence/sorter.mjs';
const fresh = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rea-conflict-')), 'result');

test('frozen distinguishing experiment observes both local outcomes and retains uncertainty', () => {
  verifyFreeze();
  const result = runCase(fresh());
  assert.deepEqual(result.outputs, {insertion:['z','a'], title:['a','z']});
  assert.equal(result.conclusion.recordingCause, 'unresolved');
  assert.equal(result.originalApplicationParity, 'not tested');
  assert.equal(result.liveModelUnderstanding, 'not tested');
});
const misleading = [
  ['newest docs win', r => {r.conclusion.fixedInsertion='verified by E-D';}, 'conclusion'],
  ['runtime always wins', r => {r.applicability.recording='discarded because runtime is superior';}, 'applicability'],
  ['copy votes as corroboration', r => {r.sourceGroups=[['E-R'],['E-V'],['E-C1'],['E-C2'],['E-D'],['E-N']];}, 'sourceGroups'],
  ['new date identifies capture', r => {r.applicability.recording='2026-10-18 proves selected version';}, 'applicability'],
  ['hypothesis promoted to cause', r => {r.conclusion.recordingCause='H-setting proved';}, 'conclusion'],
  ['unseen server inferred', r => {r.conclusion.remoteBehavior='verified';}, 'conclusion'],
  ['alternative erased', r => {r.hypotheses.pop();}, 'hypotheses'],
  ['nondiscriminating repeated label', r => {r.experiment.predictions['H-fixed'].title=['a','z'];}, 'experiment'],
  ['stale validation silently reused', r => {r.revision.reassess=r.revision.reassess.filter(x=>x!=='T-order-acceptance');}, 'revision'],
  ['global supersession', r => {r.revision.historical=[];r.revision.retainScoped=[];}, 'revision'],
  ['unresolved dependency passed', r => {r.revision.unresolved=[];}, 'revision'],
  ['hard requirement dropped', r => {r.hardRequirements=['no-accounts'];}, 'hardRequirements'],
  ['desired policy invented', r => {r.desiredPolicy.status='title approved';r.desiredPolicy.question=null;}, 'desiredPolicy'],
  ['planning becomes building', r => {r.mode='build';}, 'mode'],
];
for (const [name, change, field] of misleading) test(`fixed decision checker rejects ${name}`, () => {
  const record=workedDecision(); change(record);
  assert.throws(()=>checkDecision(record), new RegExp(`decision field: ${field}`));
});
for (const [name, faulty, message] of [
  ['always insertion', (r,s)=>sortRows(r,s==='unknown'?s:'insertion'), /local title outcome/],
  ['always title', (r,s)=>sortRows(r,s==='unknown'?s:'title'), /local insertion outcome/],
  ['input mutation', (r,s)=>{const out=sortRows(r,s);r.reverse();return out;}, /input retained/],
  ['silent setting fallback', (r,s)=>sortRows(r,s==='unknown'?'insertion':s), /unsupported setting/],
]) test(`actual experiment rejects ${name}`, () => assert.throws(()=>runCase(null,faulty), message));

test('missing/extra record fields fail; existing output is preserved', () => {
  for (const value of [null,[],{}, {...workedDecision(), fabricated:true}]) assert.throws(()=>checkDecision(value));
  const dir=fresh(); runCase(dir); const before=fs.readFileSync(path.join(dir,'result.json'));
  assert.throws(()=>runCase(dir), {code:'EEXIST'});
  assert.deepEqual(fs.readFileSync(path.join(dir,'result.json')),before);
});

test('old insertion-only acceptance cannot validate the newly scoped two-setting conclusion', () => {
  const input=[{id:'z',rank:1,title:'Zulu'},{id:'a',rank:1,title:'Alpha'}];
  const fixedInsertion=(rows, setting)=>sortRows(rows,setting==='unknown'?setting:'insertion');
  assert.deepEqual(fixedInsertion(input,'insertion'), ['z','a'], 'historical scoped case still passes');
  assert.throws(()=>runCase(null,fixedInsertion), /local title outcome/);
});
