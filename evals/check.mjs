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
  const started = performance.now();
  const child = spawnSync(process.execPath, ['--max-old-space-size=128', worker, candidate], {
    input: JSON.stringify(cases.map(c => c.input)), encoding: 'utf8', cwd: path.dirname(candidate),
    env: environment, timeout, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  // Never include candidate output, paths, environment values or error messages.
  const execution = {
    timeoutMs: timeout, elapsedMs: Math.round(performance.now() - started),
    exitCode: child.status, signal: child.signal,
    errorCode: ['ETIMEDOUT', 'ENOBUFS', 'ENOENT', 'EACCES', 'ENOMEM', 'EAGAIN'].includes(child.error?.code)
      ? child.error.code : child.error ? 'OTHER' : null,
    stdoutBytes: Buffer.byteLength(child.stdout ?? ''), stderrBytes: Buffer.byteLength(child.stderr ?? ''),
  };
  const report = { schemaVersion: 1, case: id, total: cases.length, passed: 0, failed: 0, compared: 0, errored: 0, notEvaluated: cases.length, status: 'harness-error', humanReview: 'pending', execution };
  if (child.error || child.status !== 0) {
    const reason = child.error?.code === 'ETIMEDOUT' ? 'timeout'
      : child.error?.code === 'ENOBUFS' ? 'output-limit' : 'candidate-process-failed';
    return { ...report, reason };
  }
  let results;
  try { results = JSON.parse(child.stdout); } catch { return { ...report, reason: 'invalid-worker-output' }; }
  if (!Array.isArray(results) || results.length !== cases.length) return { ...report, reason: 'incomplete-worker-output' };
  // Validate the whole envelope before attributing failures to candidate behavior.
  if (!results.every(r => r !== null && typeof r === 'object' && !Array.isArray(r) && (
    (r.ok === true && Object.hasOwn(r, 'value') && Object.keys(r).length === 2)
    || (r.ok === false && ['candidate-threw', 'non-json-result'].includes(r.reason) && Object.keys(r).length === 2)
  ))) return { ...report, reason: 'invalid-worker-result' };
  const failures = [];
  const failureDetails = [];
  report.notEvaluated = 0;
  cases.forEach((c, i) => {
    const result = results[i];
    if (result.ok) report.compared++;
    else report.errored++;
    if (result.ok && isDeepStrictEqual(result.value, c.expected)) report.passed++;
    else {
      report.failed++;
      failures.push(c.label);
      failureDetails.push({ index: i, label: c.label, reason: result.ok ? 'value-mismatch' : result.reason });
    }
  });
  const status = report.errored ? 'candidate-error' : report.failed ? 'comparison-failed' : 'comparisons-passed';
  return { ...report, status, failures, failureDetails };
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
