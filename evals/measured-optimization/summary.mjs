import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { identities } from './bench.mjs';
import { workloads, consume } from './workloads.mjs';

export const median = values => {
  assert.ok(values.length > 0);
  const a = [...values].sort((x, y) => x - y), mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function validate(record, phase) {
  assert.ok(['baseline', 'final-1', 'final-2'].includes(phase));
  assert.deepEqual(Object.keys(record).sort(), ['experiment', 'identities', 'pairs', 'phase', 'runtime', 'samples', 'warmupBatches', 'workloads']);
  assert.equal(record.experiment, 'MO-20261018'); assert.equal(record.phase, phase);
  assert.deepEqual(record.identities, identities(phase !== 'baseline'), 'source identity');
  assert.equal(record.warmupBatches, 2); assert.equal(record.pairs, 12);
  assert.deepEqual(Object.keys(record.runtime).sort(), ['arch', 'flags', 'node', 'nodeOptions', 'platform', 'v8']);
  for (const key of ['node', 'v8', 'platform', 'arch']) assert.equal(typeof record.runtime[key], 'string');
  assert.deepEqual(record.runtime.flags, []); assert.equal(record.runtime.nodeOptions, '');
  const inputs = workloads();
  assert.deepEqual(record.workloads, inputs.map(w => ({ id: w.id, iterations: w.iterations,
    bytes: w.bytes.length, sha256: hash(w.bytes), scalarsPerTitle: Array.from(w.expected[0].title).length })));
  const variants = phase === 'baseline' ? ['baseline'] : ['baseline', 'candidate'];
  assert.equal(record.samples.length, 12 * inputs.length * variants.length, 'complete samples');
  let index = 0;
  for (let pair = 0; pair < 12; pair++) for (let offset = 0; offset < inputs.length; offset++) {
    const w = inputs[(pair + offset) % inputs.length], order = [...variants];
    if ((pair + Number(phase === 'final-2')) % 2) order.reverse();
    for (const variant of order) {
      const sample = record.samples[index++];
      assert.deepEqual(Object.keys(sample).sort(), ['checksum', 'elapsedMs', 'pair', 'variant', 'workload']);
      assert.equal(sample.pair, pair); assert.equal(sample.workload, w.id); assert.equal(sample.variant, variant);
      assert.ok(Number.isFinite(sample.elapsedMs) && sample.elapsedMs > 0, 'finite positive elapsed time');
      assert.equal(sample.checksum, consume(w.expected) * w.iterations, 'complete output consumption');
    }
  }
  return record;
}
export function summarize(record) {
  validate(record, record.phase);
  const result = [];
  for (const w of record.workloads) {
    const variants = record.phase === 'baseline' ? ['baseline'] : ['baseline', 'candidate'];
    const statistics = {};
    for (const variant of variants) {
      const samples = record.samples.filter(s => s.workload === w.id && s.variant === variant);
      const us = samples.map(s => s.elapsedMs * 1000 / w.iterations);
      statistics[variant] = { count: us.length, minUs: Math.min(...us), medianUs: median(us), maxUs: Math.max(...us),
        minBatchMs: Math.min(...samples.map(s => s.elapsedMs)) };
    }
    const ratios = variants.length === 2 ? Array.from({ length: 12 }, (_, pair) => {
      const samples = record.samples.filter(s => s.workload === w.id && s.pair === pair);
      return samples.find(s => s.variant === 'candidate').elapsedMs / samples.find(s => s.variant === 'baseline').elapsedMs;
    }) : null;
    result.push({ workload: w.id, ...statistics, pairedRatioMedian: ratios && median(ratios),
      candidateFasterPairs: ratios && ratios.filter(r => r < 1).length });
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  console.log(JSON.stringify(Object.fromEntries(['baseline', 'final-1', 'final-2'].map(phase =>
    [phase, summarize(JSON.parse(fs.readFileSync(path.join(root, `${phase}.json`))))])), null, 2));
}
