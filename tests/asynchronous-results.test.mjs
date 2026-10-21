import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compare, frozen} from '../evals/asynchronous-results/check.mjs';
import {createReader,createWriter} from '../evals/asynchronous-results/candidate.mjs';
import {controlledEffects,controlledReads} from '../evals/asynchronous-results/controlled.mjs';

test('literal intermediate states match actual controlled promise and effect paths', async () => {
  const rows = await compare();
  assert.equal(rows.length, 55);
  assert.deepEqual(rows.filter(r=>!r.passed), []);
  assert.equal(new Set(rows.map(r=>`${r.id}/${r.step}`)).size,rows.length);
  assert.equal(frozen().reads.length,10); assert.equal(frozen().writes.length,5);
});

const mutations = [
  ['accept-stale-success', 'if (accepts(op)) { view[3]', 'if (true) { view[3]', 'newer-before-older',3],
  ['accept-stale-error', 'else if (accepts(op)) { view[4]', 'else if (true) { view[4]', 'stale-error-pending',2],
  ['unguarded-finalizer', 'if (accepts(op)) view[6]', 'if (true) view[6]', 'stale-success-finalizer',2],
  ['input-only-identity', 'active === op && owner === op.owner && view[1]', 'view[2] === op.input && view[1]', 'same-input-new-owner',4],
  ['abort-means-cancelled', "view[5] = 'abort-requested';", "view[5] = 'cancelled';", 'abort-then-success',1],
  ['unknown-means-not-applied', "() => { state = 'unknown'; }", "() => { state = 'not-applied'; }", 'lost-response-after-commit',1],
  ['retry-unknown-write', "if (state === 'not-applied') send();", "if (state === 'not-applied' || state === 'unknown') send();", 'lost-response-after-commit',2]
];
for (const [id,from,to,scenario,step] of mutations) test('ordinary cases pass before boundary rejects '+id,async t=>{
  const source=fs.readFileSync(new URL('../evals/asynchronous-results/candidate.mjs',import.meta.url),'utf8');
  assert.equal(source.split(from).length,2);
  const parent=fs.realpathSync.native(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'rea-async-'));
  t.after(()=>{
    assert.equal(path.dirname(path.resolve(dir)),parent);
    assert.ok(path.basename(dir).startsWith('rea-async-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const file=path.join(dir,'candidate.mjs');fs.writeFileSync(file,source.replace(from,to));
  const candidate=await import(pathToFileURL(file));
  const ordinary=await compare({reader:candidate.createReader,writer:candidate.createWriter,group:'ordinary'});
  assert.ok(ordinary.every(r=>r.passed));assert.equal(ordinary.length,10);
  const rows=await compare({reader:candidate.createReader,writer:candidate.createWriter,group:'boundary'});
  const result=rows.find(r=>r.id===scenario && r.step===step);
  assert.equal(result.passed,false);
  t.diagnostic(JSON.stringify({mutation:id,ordinaryPassed:ordinary.length,distinguishing:result}));
});

test('dismissal leaves work alive; snapshot edits cannot change the owner or operation',async()=>{
  const transport=controlledReads(),app=createReader(transport);
  app.start('a','A');app.dismiss();
  const copy=app.snapshot();copy.view[0]='intruder';copy.operations.length=0;
  assert.deepEqual(app.snapshot(),{view:['owner-1',false,'A',null,null,'dismissed',false],operations:['a:owner-1:A:pending:false']});
  transport.settle('reject','a','late-error');await app.done('a');
  assert.equal(app.snapshot().view[4],null);assert.equal(app.snapshot().operations[0],'a:owner-1:A:failed:false');
});

test('synthetic provider binds retained key to payload; fresh key permits a duplicate effect',async()=>{
  const provider=controlledEffects();
  const first=provider.send('k','Note');provider.deliver('ok');
  assert.deepEqual(await first,{state:'completed',receipt:'receipt-1'});
  const repeated=provider.send('k','Note');provider.deliver('ok');
  assert.deepEqual(await repeated,{state:'completed',receipt:'receipt-1'});
  assert.deepEqual(provider.snapshot(),{effects:['Note'],attempts:2});
  await assert.rejects(provider.lookup('k','Different'),/key payload mismatch/);
  const conflict=provider.send('k','Different');provider.deliver('ok');
  await assert.rejects(conflict,/key payload mismatch/);
  assert.deepEqual(provider.snapshot(),{effects:['Note'],attempts:3});
  const conflictLost=provider.send('k','Different');provider.deliver('commit-lost');
  await assert.rejects(conflictLost,/key payload mismatch/);
  const newKey=provider.send('new-key','Note');provider.deliver('ok');await newKey;
  assert.deepEqual(provider.snapshot(),{effects:['Note','Note'],attempts:5});
  const fresh=controlledEffects();assert.deepEqual(await fresh.lookup('k','Note'),{state:'not-applied'});
});

test('pending provider lookup stays unknown and replacement cannot discard unresolved intent',async()=>{
  const provider=controlledEffects(),app=createWriter(provider);
  app.start('k','Note');assert.throws(()=>app.start('new','Replacement'),/intent already exists/);
  assert.deepEqual(await provider.lookup('k','Note'),{state:'unknown'});
  app.retry();assert.equal(provider.snapshot().attempts,1);
  provider.deliver('commit-lost');await app.done();await app.reconcile();
  assert.deepEqual(app.snapshot(),['k','Note','completed','receipt-1']);
});

test('infrastructure errors propagate instead of being scored as semantic rejection',async()=>{
  await assert.rejects(compare({reader:()=>{throw Error('broken runner');}}),/broken runner/);
  await assert.rejects(compare({group:'invented'}),/unknown group/);
});

test('late error after newer success cannot replace completed feedback',async()=>{
  const transport=controlledReads(),app=createReader(transport);
  app.start('a','A');app.start('b','B');
  transport.settle('resolve','b','Beta');await app.done('b');
  transport.settle('reject','a','old-error');await app.done('a');
  assert.deepEqual(app.snapshot(),{view:['owner-1',true,'B','Beta',null,'completed',false],
    operations:['a:owner-1:A:failed:false','b:owner-1:B:completed:false']});
});
