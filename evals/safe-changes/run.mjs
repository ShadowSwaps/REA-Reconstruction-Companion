// MIT. Fixed local scenario; no model calls or automatic dependency discovery.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStore as baseline } from './baseline.mjs';
import { createStore } from './variant.mjs';
import { createStore as reference } from '../version-change/reference-v2.mjs';
import { createStore as oldReader } from '../version-change/reference-v1.mjs';
import { verifyFreeze as historical } from '../version-change/freeze.mjs';
import { verifyFreeze as historicalCodec } from '../import-export/freeze.mjs';
const read = name => fs.readFileSync(new URL(name, import.meta.url));
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifyFreeze() {
  const identity = JSON.parse(read('identity.json'));
  for (const [name, digest] of Object.entries(identity.files)) assert.equal(hash(read(name)), digest, 'Frozen drift: ' + name);
  historical(); historicalCodec();
  return identity;
}
const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
function reopen(file) {
  const result = spawnSync(process.execPath, ['--input-type=module','--eval',
    'const {createStore}=await import(process.argv[1]); console.log(JSON.stringify(createStore({file:process.argv[2]}).state()));',
    new URL('variant.mjs', import.meta.url).href, file],
  { encoding: 'utf8', shell: false, windowsHide: true, timeout: 5000, maxBuffer: 65536 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}
export function runTrial(directory, factory = createStore) {
  verifyFreeze();
  fs.mkdirSync(directory); // New owned destination; retain prior attempts.
  const e = JSON.parse(read('expectations.json')), file = path.join(directory, 'active.json');
  const prior = bytes(e.inputV1);
  fs.writeFileSync(file, prior, { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'prior-data.json'), prior, { flag: 'wx' });
  const old = baseline({ file });
  assert.equal(old.setDone, undefined, 'baseline has no new action');
  assert.deepEqual(old.listTitles(), e.titles);
  let failSave = false, writes = 0;
  const store = factory({ file, beforeReplace() { writes++; if (failSave) throw new Error('injected pre-rename failure'); } });
  assert.deepEqual(store.state(), e.before);
  assert.deepEqual(fs.readFileSync(file), prior, 'opening does not migrate');
  const retained = [], changed = [];
  const unchanged = () => { assert.deepEqual(store.state(), e.before); assert.deepEqual(fs.readFileSync(file), prior); };
  assert.deepEqual(store.setDone('a', false), e.before);
  const noOpWrites = writes;
  assert.equal(noOpWrites, 0, 'no-op must not persist'); unchanged();
  for (const [id, done, code] of [['missing', true, e.errors.missing], [null, true, e.errors.invalid], ['a', 1, e.errors.invalid]]) {
    assert.throws(() => store.setDone(id, done), { code }); unchanged();
  }
  assert.equal(writes, 0, 'invalid edit must not persist');
  changed.push('no-op and invalid edits preserve exact old data');
  failSave = true;
  assert.throws(() => store.setDone('a', true), { code: e.errors.save }, 'caught save failure must surface');
  unchanged();
  failSave = false;
  assert.deepEqual(store.setDone('a', true), e.after, 'single-row completion preserves Unicode/order/other rows');
  assert.deepEqual(store.listTitles(), e.titles, 'custom title listing retained');
  const saved = fs.readFileSync(file);
  const attemptsBeforeNoop = writes;
  failSave = true;
  assert.deepEqual(store.setDone('a', true), e.after);
  assert.equal(writes, attemptsBeforeNoop, 'already complete must not persist');
  failSave = false;
  assert.deepEqual(JSON.parse(saved), { format: 'pocket-ledger', version: 2, entries: e.after });
  assert.throws(() => store.exportBytes(1), { code: e.errors.lossy }, 'completion must retain lossy export guard');
  assert.deepEqual(fs.readFileSync(file), saved);
  assert.deepEqual(reference().importBytes(store.exportBytes(2)), e.after);
  assert.deepEqual(reopen(file), e.after);
  changed.push('completion, schema1 rejection, schema2 reader and fresh-process reopen');
  const reverted = baseline({ file });
  assert.deepEqual(reverted.state(), e.after, 'code rollback reads new data');
  assert.deepEqual(reverted.listTitles(), e.titles);
  assert.deepEqual(fs.readFileSync(file), saved, 'code rollback does not restore old data');
  retained.push('previous implementation reads new data without rewriting');
  assert.deepEqual(store.setDone('a', false), e.before, 'completion can be cleared');
  assert.deepEqual(oldReader().importBytes(store.exportBytes(1)), e.before);
  assert.deepEqual(store.setDone('a', true), e.after);
  const invalid = { ...e.inputV2, entries: [e.before[0], { id: 'b', title: 'Second', done: 'wrong' }] };
  assert.throws(() => store.importBytes(bytes(invalid)), { code: 'schema' });
  assert.deepEqual(store.state(), e.after); assert.deepEqual(fs.readFileSync(file), saved);
  assert.deepEqual(store.importBytes(bytes(e.inputV1)), e.before);
  assert.deepEqual(oldReader().importBytes(store.exportBytes(1)), e.before);
  assert.deepEqual(JSON.parse(store.exportBytes(1)), e.inputV1);
  assert.deepEqual(store.importBytes(bytes(e.inputV2)), e.before);
  assert.deepEqual(store.migrate(), e.before);
  assert.deepEqual(store.listTitles(), e.titles);
  retained.push('v1/v2 imports, v1 cross-reader/export, explicit migrate, late invalid import');
  const empty = factory();
  assert.throws(() => empty.setDone('a', true), { code: 'not-found' });
  assert.deepEqual(empty.state(), []);
  // Explicit restoration only on a separate disposable copy. A product backup
  // manager and automatic rollback are not claimed.
  const recovery = path.join(directory, 'restored.json');
  fs.writeFileSync(recovery, fs.readFileSync(path.join(directory, 'prior-data.json')), { flag: 'wx' });
  assert.deepEqual(baseline({ file: recovery }).state(), e.before);
  assert.deepEqual(fs.readFileSync(path.join(directory, 'prior-data.json')), prior);
  assert.deepEqual(fs.readdirSync(directory).sort(), ['active.json','prior-data.json','restored.json']);
  verifyFreeze();
  return { status: 'selected-change-passed', changed, retained, affected: e.affected, retainedEvidence: e.retained,
    noOpWrites, observedSaveAttempts: writes, recovery: 'injected pre-rename failure; retry; explicit disposable data restore',
    limits: 'same-agent source-exposed Node fixture; manual impact map; no model comprehension, real disk denial, crash, concurrency or global compatibility claim' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { assert.equal(process.argv.length, 3, 'Use node evals/safe-changes/run.mjs NEW_DIRECTORY'); console.log(JSON.stringify(runTrial(path.resolve(process.argv[2])), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
