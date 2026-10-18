// One exploratory baseline profile; summary deliberately omits paths/host names.
import inspector from 'node:inspector';
import { createStore } from '../import-export/candidate.mjs';
import { workloads, consume } from './workloads.mjs';
const session = new inspector.Session();
session.connect();
const post = (method, params = {}) => new Promise((resolve, reject) => {
  session.post(method, params, (error, result) => error ? reject(error) : resolve(result));
});
try {
  await post('Profiler.enable');
  await post('Profiler.start');
  const store = createStore(), input = workloads().find(w => w.id === 'stress-unicode');
  let checksum = 0;
  for (let i = 0; i < 50000; i++) checksum += consume(store.importBytes(input.bytes));
  const { profile } = await post('Profiler.stop');
  const counts = new Map();
  for (const node of profile.nodes) {
    const fn = node.callFrame.functionName || '(anonymous)';
    // Only named functions from the known fixture, native frames and GC buckets.
    const bucket = node.callFrame.url.endsWith('/import-export/candidate.mjs') ? `baseline:${fn}`
      : fn === '(garbage collector)' ? fn : 'other/runtime/consumer';
    counts.set(bucket, (counts.get(bucket) ?? 0) + (node.hitCount ?? 0));
  }
  console.log(JSON.stringify({ phase: 'exploratory-profile', iterations: 50000, checksum,
    sampledHits: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
    limitation: 'Sampled CPU attribution, not elapsed comparison, allocation volume or proof of causality.' }, null, 2));
} finally { session.disconnect(); }
