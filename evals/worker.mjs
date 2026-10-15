// Only run reviewed local candidates. Process separation is not a sandbox.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function isJson(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
  ancestors.add(value);
  const valid = (Array.isArray(value) ? Array.from(value) : Object.values(value)).every(x => isJson(x, ancestors));
  ancestors.delete(value);
  return valid;
}

try {
  const inputs = JSON.parse(fs.readFileSync(0, 'utf8'));
  const candidate = await import(pathToFileURL(process.argv[2]).href);
  if (typeof candidate.evaluate !== 'function') throw new Error('Missing evaluate export');
  const results = [];
  for (const input of inputs) {
    try {
      const value = await candidate.evaluate(input);
      results.push(isJson(value) ? { ok: true, value: JSON.parse(JSON.stringify(value)) } : { ok: false });
    } catch {
      results.push({ ok: false });
    }
  }
  process.stdout.write(JSON.stringify(results));
} catch {
  // Do not dump candidate errors or environment details into an evaluation report.
  process.stderr.write('Candidate could not be loaded or evaluated.\n');
  process.exitCode = 1;
}
