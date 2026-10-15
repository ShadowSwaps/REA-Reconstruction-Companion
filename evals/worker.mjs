// Only run reviewed local candidates. Process separation is not a sandbox.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Capture data once. JSON.stringify on the candidate's original object would
// invoke toJSON/getters and could compare a transformed value instead.
function snapshotJson(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || ancestors.has(value)) throw new TypeError('Non-JSON result');
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) throw new TypeError('Non-JSON result');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  const output = array ? [] : Object.create(null);
  if (array && keys.length !== descriptors.length.value + 1) throw new TypeError('Non-JSON array');
  ancestors.add(value);
  try {
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = descriptors[key];
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Non-JSON property');
      if (array && (!Number.isInteger(Number(key)) || Number(key) < 0 || Number(key) >= descriptors.length.value || String(Number(key)) !== key)) throw new TypeError('Non-JSON index');
      Object.defineProperty(output, key, { value: snapshotJson(descriptor.value, ancestors), enumerable: true, writable: true, configurable: true });
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

try {
  const inputs = JSON.parse(fs.readFileSync(0, 'utf8'));
  const candidate = await import(pathToFileURL(process.argv[2]).href);
  if (typeof candidate.evaluate !== 'function') throw new Error('Missing evaluate export');
  const results = [];
  for (const input of inputs) {
    let value;
    try {
      value = await candidate.evaluate(input);
    } catch {
      results.push({ ok: false, reason: 'candidate-threw' });
      continue;
    }
    try {
      results.push({ ok: true, value: snapshotJson(value) });
    } catch {
      results.push({ ok: false, reason: 'non-json-result' });
    }
  }
  process.stdout.write(JSON.stringify(results));
} catch {
  // Do not dump candidate errors or environment details into an evaluation report.
  process.stderr.write('Candidate could not be loaded or evaluated.\n');
  process.exitCode = 1;
}
