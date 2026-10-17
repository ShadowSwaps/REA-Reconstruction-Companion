import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore } from '../evals/import-export/candidate.mjs';
import { runTrial, compareCases } from '../evals/import-export/check.mjs';
import { verifyFreeze } from '../evals/import-export/freeze.mjs';

test('frozen synthetic reference identity and full import/export/recovery trial', () => {
  assert.equal(verifyFreeze().id, 'IE-20261017');
  const result = runTrial();
  assert.equal(result.status, 'passed');
  assert.equal(result.casesPerTarget, 33);
  assert.equal(result.faults.length, 2);
});

test('comparison rejects empty, duplicate, missing and wrong expected observations', () => {
  const expected = [{ id: 'one', rows: [{ id: 'a', title: '雪', done: true }] }, { id: 'two', error: 'syntax' }];
  compareCases(expected, structuredClone(expected));
  for (const bad of [[], [expected[0], expected[0]], [expected[0]],
    [{ id: 'one', rows: [{ id: 'a', title: '?', done: true }] }, expected[1]],
    [expected[0], { id: 'two', error: 'schema' }]]) assert.throws(() => compareCases(expected, bad));
});

// These wrappers mutate the actual candidate/checker path. No reference or frozen
// evidence is edited, and no dynamic source evaluation or model call is used.
for (const mutation of ['drop-unicode', 'drop-done', 'reverse-order', 'lie-on-import',
  'clear-memory-on-rejection', 'destroy-file-on-rejection', 'always-reject']) {
  test('trial detects candidate mutation: ' + mutation, () => {
    const factory = options => {
      const store = createStore(options);
      if (['drop-unicode', 'drop-done', 'reverse-order'].includes(mutation)) {
        const original = store.exportBytes;
        store.exportBytes = version => {
          const doc = JSON.parse(original(version));
          if (mutation === 'drop-unicode') for (const row of doc.entries) {
            const key = doc.version === 1 ? 'text' : 'title'; row[key] = row[key].replace(/[^\x00-\x7f]/g, '?');
          }
          if (mutation === 'drop-done' && doc.version === 2) for (const row of doc.entries) row.done = false;
          if (mutation === 'reverse-order') doc.entries.reverse();
          return Buffer.from(JSON.stringify(doc) + '\n');
        };
      } else {
        const original = store.importBytes;
        let rejected = false;
        const state = store.state;
        if (mutation === 'clear-memory-on-rejection') store.state = () => rejected ? [] : state();
        store.importBytes = bytes => {
          if (mutation === 'always-reject') throw Object.assign(new Error(), { code: 'schema' });
          let result;
          try { result = original(bytes); } catch (error) {
            rejected = true;
            if (mutation === 'destroy-file-on-rejection' && options?.file) fs.writeFileSync(options.file, '[]');
            throw error;
          }
          return mutation === 'lie-on-import' ? [] : result;
        };
      }
      return store;
    };
    assert.throws(() => runTrial({ candidateFactory: factory }));
  });
}
