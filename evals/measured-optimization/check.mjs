import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './candidate.mjs';
import { createStore as baseline } from '../import-export/candidate.mjs';
import { runTrial } from '../import-export/check.mjs';
import { encode, workloads } from './workloads.mjs';

const attempt = (store, bytes) => {
  try { return { rows: store.importBytes(bytes) }; }
  catch (error) { return { error: error.code }; }
};
export function check(factory = createStore) {
  // Actual historical checker, literal corpus and contract-derived boundaries;
  // injected/new factory is used by its in-process parity and persistence checks.
  // Its CLI restart checks still exercise the historical CLI, not a new CLI.
  const historical = runTrial({ candidateFactory: factory });
  for (const w of workloads()) {
    const store = factory();
    assert.deepEqual(store.importBytes(w.bytes), w.expected);
    assert.deepEqual(store.state(), w.expected);
    const detached = store.state(); detached[0].title = 'Changed externally';
    assert.deepEqual(store.state(), w.expected);
    assert.deepEqual(JSON.parse(store.exportBytes()).entries, w.expected);
  }
  // Literal Unicode boundary oracle, including valid surrogate pairs versus
  // isolated high/low surrogates and their positions around the scalar limit.
  const cases = [
    ['', false], ['a'.repeat(80), true], ['a'.repeat(81), false],
    ['😀'.repeat(80), true], ['😀'.repeat(81), false], ['\ud800', false],
    ['\udfff', false], ['a'.repeat(79) + '\ud800', false],
    ['😀'.repeat(79) + '雪', true], ['\ud800\udc00', true],
    ['a\udc00z', false], ['\u0000\n<&', true],
  ];
  let generated = 0;
  const a = baseline(), b = factory();
  const prior = [{ id: 'prior', title: 'Keep 雪', done: true }];
  for (const [title, valid] of cases) {
    b.importBytes(encode(prior));
    const expected = [{ id: 'a', title, done: false }];
    const bytes = encode(expected), unchanged = Buffer.from(bytes);
    const result = attempt(b, bytes);
    assert.deepEqual(result, valid ? { rows: expected } : { error: 'schema' });
    assert.deepEqual(b.state(), valid ? expected : prior);
    assert.deepEqual(bytes, unchanged);
  }
  // 256 deterministic bounded sequences; inputs/expected values derived from
  // contract arithmetic, never either implementation's results. No RNG service.
  const alphabet = ['a', '雪', '😀', '\n', '\u0000', '\ud800', '\udfff', ' '];
  for (let seed = 0; seed < 256; seed++) {
    const length = seed % 83;
    const scalar = alphabet[Math.floor(seed / 32)];
    const title = scalar.repeat(length);
    const valid = length >= 1 && length <= 80 && scalar !== '\ud800' && scalar !== '\udfff';
    const row = { id: 'a', title, done: seed % 2 === 0 };
    const version = seed % 2 + 1;
    const bytes = encode([version === 1 ? { id: 'a', text: title } : row], version);
    a.importBytes(encode(prior)); b.importBytes(encode(prior));
    const expected = valid ? { rows: [{ ...row, done: version === 2 ? row.done : false }] } : { error: 'schema' };
    assert.deepEqual(attempt(a, bytes), expected);
    assert.deepEqual(attempt(b, bytes), expected);
    assert.deepEqual(b.state(), valid ? expected.rows : prior);
    assert.deepEqual(b.exportBytes(), a.exportBytes());
    generated++;
  }
  return { status: 'passed', frozenCasesPerTarget: historical.casesPerTarget,
    unicodeBoundaries: cases.length, generatedSequences: generated,
    persistenceFaultTargets: historical.faults.length,
    limits: 'Same-agent source-exposed finite tests; historical CLI unchanged; no exhaustive equivalence proof.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(check(), null, 2));
}
