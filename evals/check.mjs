import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { casesFor } from './oracles.mjs';

const worker = fileURLToPath(new URL('./worker.mjs', import.meta.url));

export function runCheck(id, candidatePath, { timeout = 10000 } = {}) {
  const cases = casesFor(id); // Validate before executing any candidate code.
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 10000) throw new Error('Timeout must be 1..10000 ms');
  const candidate = path.resolve(candidatePath);
  if (!fs.statSync(candidate).isFile()) throw new Error('Candidate must be a local file');
  const environment = {};
  for (const name of ['SystemRoot', 'TEMP', 'TMP']) if (process.env[name]) environment[name] = process.env[name];
  const child = spawnSync(process.execPath, ['--max-old-space-size=128', worker, candidate], {
    input: JSON.stringify(cases.map(c => c.input)), encoding: 'utf8', cwd: path.dirname(candidate),
    env: environment, timeout, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  const report = { case: id, total: cases.length, passed: 0, failed: 0, status: 'harness-error', humanReview: 'pending' };
  if (child.error || child.status !== 0) return { ...report, reason: child.error?.code === 'ETIMEDOUT' ? 'timeout' : 'candidate-process-failed' };
  let results;
  try { results = JSON.parse(child.stdout); } catch { return { ...report, reason: 'invalid-worker-output' }; }
  if (!Array.isArray(results) || results.length !== cases.length) return { ...report, reason: 'incomplete-worker-output' };
  const failures = [];
  cases.forEach((c, i) => {
    if (results[i]?.ok === true && isDeepStrictEqual(results[i].value, c.expected)) report.passed++;
    else { report.failed++; failures.push(c.label); }
  });
  return { ...report, status: report.failed ? 'comparison-failed' : 'comparisons-passed', failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node evals/check.mjs <case-id> <reviewed-candidate.mjs>');
    const result = runCheck(process.argv[2], process.argv[3]);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'comparisons-passed' ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
