import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runTrial, verifyFreeze } from '../evals/safe-changes/run.mjs';
import { createStore } from '../evals/safe-changes/variant.mjs';
const directory = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rea-change-')), 'case');
test('selected change and retained data/workflow/recovery obligations execute', () => {
  const result = runTrial(directory());
  assert.equal(result.status, 'selected-change-passed');
  verifyFreeze();
});
const faults = [
  ['ignored completion', store => ({ ...store, setDone(id, done) { if (id === 'a' && done === true) return store.state(); return store.setDone(id, done); } }), /Missing expected exception.*caught save failure/s],
  ['lost Unicode', store => ({ ...store, setDone(id, done) { const rows = store.setDone(id, done); return done === true ? rows.map(r => ({ ...r, title: r.title.replace('Café 🧾', 'Cafe') })) : rows; } }), /single-row completion/],
  ['lost custom listing', store => ({ ...store, listTitles: () => [] }), /custom title listing/],
  ['removed lossy guard', store => ({ ...store, exportBytes: () => Buffer.from('{}') }), /completion must retain lossy export guard/],
  ['swallowed save error', store => ({ ...store, setDone(id, done) { try { return store.setDone(id, done); } catch (e) { if (e.code === 'persistence') return store.state(); throw e; } } }), /Missing expected exception.*caught save failure/s],
  ['no-op writes', store => ({ ...store, setDone(id, done) { const rows = store.setDone(id, done); if (id === 'a' && done === false) store.importBytes(store.exportBytes(2)); return rows; } }), /no-op must not persist/],
];
for (const [name, mutate, expected] of faults) test('actual trial rejects faulty variant: ' + name, () => {
  assert.throws(() => runTrial(directory(), options => mutate(createStore(options))), error => {
    assert.equal(error.code, 'ERR_ASSERTION'); assert.match(error.message, expected); return true;
  });
});
