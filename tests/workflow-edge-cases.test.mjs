import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWorkflow } from '../evals/workflow-edge-cases/variant.mjs';
import { runSequences, verifyFreeze } from '../evals/workflow-edge-cases/run.mjs';
const fresh = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rea-workflow-')), 'attempt');
const bytes = entries => Buffer.from(JSON.stringify({format:'pocket-ledger',version:2,entries})+'\n');

test('frozen ordinary and selected sequences compare actual effects after each action', () => {
  verifyFreeze();
  const report = runSequences(fresh());
  assert.equal(report.results.length, 8);
  assert.equal(report.results.filter(s=>s.group==='ordinary').length, 2);
  assert.equal(report.originalTargetParity, 'not tested');
  assert.equal(report.liveModelUnderstanding, 'not tested');
});

// Deliberate test doubles only; none is a candidate for shipping.
const faulty = [
  ['failure discards retryable selection', store => ({ ...store, confirm(token) {
    const result=store.confirm(token);
    if (result.error==='persistence') store.cancel(token);
    return result;
  }}), /failure-retry\/1: state/],
  ['failure is mislabeled as success', store => ({ ...store, confirm(token) {
    const result=store.confirm(token);
    return result.error==='persistence' ? {ok:true} : result;
  }}), /failure-retry\/1: result/],
  ['cancel leaves pending work', store => ({ ...store, cancel() { return {ok:true}; } }), /failure-cancel\/2: state/],
  ['replacement leaves old selection active', store => {
    let first;
    return { ...store, select(input) {
      if (first) return {ok:true,token:'different-looking-token'};
      const result=store.select(input); if(result.ok) first=result.token; return result;
    }};
  }, /replacement-stale\/1: state/],
];
for (const [name, wrap, message] of faulty) test(`ordinary workflows pass but transition checks reject: ${name}`, () => {
  const factory=options=>wrap(createWorkflow(options));
  assert.equal(runSequences(fresh(),factory,'ordinary').status,'bounded-sequences-passed');
  assert.throws(()=>runSequences(fresh(),factory,'transitions'), message);
});

test('caller input and returned snapshots cannot mutate pending or committed data', () => {
  const w=createWorkflow(), rows=[{id:'a',title:'Ångström 🐈',done:true}];
  const input=bytes(rows), {token}=w.select(input); input.fill(0);
  const preview=w.snapshot(); preview.preview[0].title='changed'; preview.committed.push(rows[0]);
  assert.equal(w.confirm(token).ok,true); assert.deepEqual(w.snapshot().committed,rows);
  const committed=w.snapshot(); committed.committed[0].done=false;
  assert.deepEqual(w.snapshot().committed,rows);
});

test('session wrapper retains v1 migration and valid empty replacement', () => {
  const w=createWorkflow();
  const v1=Buffer.from('{"format":"pocket-ledger","version":1,"entries":[{"id":"a","text":"Old"}]}\n');
  assert.equal(w.confirm(w.select(v1).token).ok,true);
  assert.deepEqual(w.snapshot().committed,[{id:'a',title:'Old',done:false}]);
  assert.equal(w.confirm(w.select(bytes([])).token).ok,true);
  assert.deepEqual(w.snapshot(),{screen:'saved',committed:[],preview:null});
});

test('unknown group and an existing result destination are rejected without overwriting evidence', () => {
  const dir=fresh(); runSequences(dir);
  const before=fs.readFileSync(path.join(dir,'result.json'));
  assert.throws(()=>runSequences(dir),{code:'EEXIST'});
  assert.deepEqual(fs.readFileSync(path.join(dir,'result.json')),before);
  assert.throws(()=>runSequences(fresh(),createWorkflow,'invented'),/known sequence group/);
});
