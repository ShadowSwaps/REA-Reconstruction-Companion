import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStore } from '../evals/measured-optimization/candidate.mjs';
import { check } from '../evals/measured-optimization/check.mjs';
import { measure } from '../evals/measured-optimization/bench.mjs';
import { workloads } from '../evals/measured-optimization/workloads.mjs';
import { validate, summarize, median } from '../evals/measured-optimization/summary.mjs';
const read = name => JSON.parse(fs.readFileSync(new URL(`../evals/measured-optimization/${name}.json`, import.meta.url)));

test('optimized variant passes actual frozen import/export/persistence oracle and Unicode boundaries', () => {
  assert.equal(check().generatedSequences, 256);
});
test('oracle detects corrupt returned title and destructive rejected state', () => {
  for (const mutation of ['title', 'rejection']) assert.throws(() => check(options => {
    const store = createStore(options), original = store.importBytes, state = store.state;
    let rejected = false;
    store.importBytes = bytes => {
      try {
        const result = original(bytes);
        if (mutation === 'title' && result.length) result[0].title = '?';
        return result;
      } catch (error) { rejected = true; throw error; }
    };
    if (mutation === 'rejection') store.state = () => rejected ? [] : state();
    return store;
  }));
});
test('batch measures imports and consumption, with setup and postconditions outside clocks', () => {
  const w = { ...workloads()[0], iterations: 3 }, events = [];
  const factory = () => {
    events.push('setup');
    const store = createStore();
    return { importBytes(bytes) { events.push('import'); return store.importBytes(bytes); },
      state() { events.push('state'); return store.state(); } };
  };
  let tick = 0;
  const result = measure(factory, w, () => { events.push('clock'); return ++tick * 10; });
  assert.equal(result.elapsedMs, 10);
  assert.deepEqual(events, ['setup', 'clock', 'import', 'import', 'import', 'clock', 'state']);
  assert.throws(() => measure(() => ({ importBytes: () => [], state: () => [] }), w, () => ++tick), /consumption/);
  assert.throws(() => measure(createStore, w, () => 1), /positive elapsed/);
});
test('retained exploratory and final evidence match actual sources, workloads, balanced order and all samples', () => {
  for (const phase of ['baseline', 'final-1', 'final-2']) {
    const record = read(phase); validate(record, phase);
    assert.equal(summarize(record).length, 4);
    assert.deepEqual(read('summary')[phase], summarize(record), 'saved summaries recomputed from raw samples');
  }
  assert.deepEqual(read('final-1').runtime, read('final-2').runtime);
  assert.equal(median([100, 2, 1, 3]), 2.5); assert.equal(median([3, 1, 2]), 2);
  assert.throws(() => median([]));
});
test('actual evidence checker rejects missing/duplicate/order/identity/workload/timing/consumption faults', () => {
  const changes = [
    r => r.samples.pop(), r => { r.samples[1] = r.samples[0]; },
    r => r.samples.reverse(), r => { r.samples[0].elapsedMs = 0; },
    r => { r.samples[0].elapsedMs = NaN; }, r => { r.samples[0].elapsedMs = -1; },
    r => { r.samples[0].checksum++; }, r => { r.samples[0].pair++; },
    r => { r.identities['candidate.mjs'] = '0'.repeat(64); },
    r => { r.workloads[0].iterations++; }, r => { r.workloads[3].sha256 = '0'.repeat(64); },
    r => { r.phase = 'baseline'; }, r => { r.pairs = 1; },
    r => { r.runtime.nodeOptions = '--jitless'; }, r => { r.samples[0].peakRSS = 100; },
  ];
  for (const change of changes) {
    const record = read('final-1'); change(record);
    assert.throws(() => validate(record, 'final-1'));
  }
});
