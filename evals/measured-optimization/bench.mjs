import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createStore as baseline } from '../import-export/candidate.mjs';
import { workloads, consume } from './workloads.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function identities(candidate = false) {
  const names = ['PROTOCOL.md', 'workloads.mjs', 'bench.mjs', '../import-export/candidate.mjs',
    '../import-export/reference.mjs', '../import-export/corpus.json', '../import-export/identity.json'];
  if (candidate) names.push('candidate.mjs');
  return Object.fromEntries(names.map(name => [name, hash(fs.readFileSync(path.join(here, name)))]));
}
export function measure(factory, workload, clock = () => performance.now()) {
  const store = factory();
  const original = Buffer.from(workload.bytes);
  let checksum = 0;
  const start = clock();
  for (let i = 0; i < workload.iterations; i++) checksum += consume(store.importBytes(workload.bytes));
  const elapsedMs = clock() - start;
  assert.ok(Number.isFinite(elapsedMs) && elapsedMs > 0, 'positive elapsed time');
  assert.equal(checksum, consume(workload.expected) * workload.iterations, 'output consumption');
  assert.deepEqual(store.state(), workload.expected, 'committed state');
  assert.deepEqual(workload.bytes, original, 'input unchanged');
  return { elapsedMs, checksum };
}
export async function run(mode) {
  assert.ok(['baseline', 'final-1', 'final-2'].includes(mode), 'explicit measurement phase');
  assert.equal(process.env.NODE_OPTIONS ?? '', '', 'unset NODE_OPTIONS for this protocol');
  assert.deepEqual(process.execArgv, [], 'use the default runtime without flags');
  const factories = { baseline };
  if (mode !== 'baseline') factories.candidate = (await import('./candidate.mjs')).createStore;
  const inputs = workloads();
  const evidence = { experiment: 'MO-20261018', phase: mode,
    runtime: { node: process.version, v8: process.versions.v8, platform: process.platform,
      arch: process.arch, flags: [], nodeOptions: '' },
    identities: identities(mode !== 'baseline'),
    workloads: inputs.map(w => ({ id: w.id, iterations: w.iterations, bytes: w.bytes.length,
      sha256: hash(w.bytes), scalarsPerTitle: Array.from(w.expected[0].title).length })),
    warmupBatches: 2, pairs: 12, samples: [] };
  for (const w of inputs) for (const factory of Object.values(factories)) {
    for (let i = 0; i < 2; i++) measure(factory, w);
  }
  for (let pair = 0; pair < 12; pair++) {
    for (let offset = 0; offset < inputs.length; offset++) {
      const w = inputs[(pair + offset) % inputs.length];
      const order = Object.keys(factories);
      if ((pair + Number(mode === 'final-2')) % 2) order.reverse();
      for (const variant of order) evidence.samples.push({ pair, workload: w.id, variant,
        ...measure(factories[variant], w) });
    }
  }
  return evidence;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: node bench.mjs baseline|final-1|final-2');
  console.log(JSON.stringify(await run(process.argv[2]), null, 2));
}
