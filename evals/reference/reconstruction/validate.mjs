// Reviewer/teaching tool. Executes only the fixed repository-owned candidate.
// Review candidate.mjs before use. Process limits are not a sandbox.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { check } from '../check.mjs';
import { prepare, verifyPacket } from '../prepare.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const candidate = path.join(here, 'candidate.mjs');
const observations = path.join(here, '../walkthrough/runtime-observations.json');
const target = path.join(here, '../target/pocket-tasks.mjs');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

function matchesJson(actual, expected) {
  if (actual === null || expected === null) return actual === expected;
  try { return isDeepStrictEqual(JSON.parse(actual), JSON.parse(expected)); }
  catch { return false; }
}

export function validateReconstruction() {
  const trace = JSON.parse(fs.readFileSync(observations, 'utf8'));
  if (sha256(target) !== trace.targetSha256) throw new Error('Observation target identity changed.');
  const parent = fs.realpathSync.native(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'rea-reconstruction-'));
  const packet = path.join(root, 'packet');
  let comparison, before, after;
  const results = [];
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']
    .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  try {
    prepare(packet);
    before = verifyPacket(packet);
    comparison = check([process.execPath, candidate]);
    // Absolute invocation paths vary by machine. Publish source identities, not paths.
    delete comparison.commandSha256;
    for (const [number, scenario] of trace.scenarios.entries()) {
      const dir = path.join(root, String(number)); fs.mkdirSync(dir);
      const store = path.join(dir, 'tasks.json'), pending = store + '.pending';
      if (scenario.initialStore !== null) fs.writeFileSync(store, scenario.initialStore);
      if (scenario.initialPending !== null) fs.writeFileSync(pending, scenario.initialPending);
      let blocked = false;
      for (const [index, session] of scenario.sessions.entries()) {
        const label = `${scenario.id}: session ${index + 1}`;
        if (blocked) { results.push({ label, status: 'not-run', reason: 'Earlier session failed.' }); continue; }
        const run = spawnSync(process.execPath, [candidate, '--store', store], {
          input: session.input, encoding: 'utf8', env, cwd: dir, shell: false,
          timeout: 5000, maxBuffer: 1024 * 1024, windowsHide: true,
        });
        let reason;
        if (run.error || run.signal) reason = 'Process failure.';
        else if (run.status !== session.exitCode) reason = 'Exit status mismatch.';
        else if (session.exitCode !== 0) {
          if (run.stdout !== '' || !run.stderr.trim()) reason = 'Error response mismatch.';
        } else if (run.stderr !== '' || !matchesJson(run.stdout, session.stdout)) reason = 'Response mismatch.';
        const stored = read(store);
        const sameStore = session.exitCode === 0 && scenario.initialPending === null
          ? matchesJson(stored, session.storeAfter) : stored === session.storeAfter;
        if (!reason && !sameStore) reason = 'Store mismatch.';
        if (!reason && read(pending) !== session.pendingAfter) reason = 'Pending-file mismatch.';
        blocked = Boolean(reason);
        results.push({ label, status: blocked ? 'failed' : 'passed', ...(reason ? { reason } : {}) });
      }
    }
    after = verifyPacket(packet);
  } finally {
    if (path.dirname(root) !== parent || !path.basename(root).startsWith('rea-reconstruction-')
      || fs.lstatSync(root).isSymbolicLink()) throw new Error('Unsafe temporary cleanup path.');
    fs.rmSync(root, { recursive: true, force: true });
  }
  const count = status => results.filter(row => row.status === status).length;
  return {
    schema: 1, kind: 'maintainer-informed-reconstruction-example',
    status: comparison.failed || count('failed') || count('not-run') ? 'validation-failed' : 'checks-passed',
    identities: { targetSha256: sha256(target), candidateSha256: sha256(candidate),
      observationsSha256: sha256(observations), validatorSha256: sha256(fileURLToPath(import.meta.url)),
      checkerSha256: sha256(path.join(here, '../check.mjs')),
      packetToolSha256: sha256(path.join(here, '../prepare.mjs')) },
    evidencePacket: { before, after, scope: 'fresh copy integrity; not candidate access isolation' },
    comparison,
    observationReplay: { scenarios: trace.scenarios.length, sessions: results.length,
      passed: count('passed'), failed: count('failed'), notRun: count('not-run'), results },
    humanReview: 'pending', newLiveReaAnalysis: 'not-run; reuses the disclosed historical investigation',
    independentEvaluation: false,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node evals/reference/reconstruction/validate.mjs');
    const report = validateReconstruction();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === 'checks-passed' ? 0 : 1;
  } catch {
    console.error('Reconstruction validation could not complete. Inspect the trusted example files.');
    process.exitCode = 2;
  }
}
