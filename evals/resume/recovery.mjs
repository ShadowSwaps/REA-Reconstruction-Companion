// MIT. Bounded, maintainer-authored evidence recovery; no agent/REA invocation.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evidence, walkthrough } from './walkthrough.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const dependencies = {
  'checkpoint.json': ['recorded-findings', 'recorded-requirement-status'],
  'input-report.json': ['R-input.prior-verification'],
  'target.mjs': ['F-input', 'F-cap', 'R-input.prior-verification', 'target-comparisons'],
  'candidate-before.mjs': ['R-input.implementation-identity', 'R-input.prior-verification', 'candidate-comparisons'],
  'prepared.json': ['preparation-provenance'],
};
function snapshot(directory, expected) {
  const dir = path.resolve(directory), stat = fs.lstatSync(dir);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Invalid workspace');
  assert(fs.readdirSync(dir).every(name => Object.hasOwn(expected, name)), 'Unexpected workspace entry');
  return Object.fromEntries(Object.entries(expected).map(([name, bytes]) => {
    const file = path.join(dir, name), expectedSha256 = hash(bytes);
    let stat;
    try { stat = fs.lstatSync(file); } catch (error) {
      if (error.code === 'ENOENT') return [name, { state: 'missing', expectedSha256, actualSha256: null }];
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) {
      return [name, { state: 'unverified', expectedSha256, actualSha256: null }];
    }
    const actual = fs.readFileSync(file);
    assert(actual.length <= 65536, 'Oversized evidence');
    const actualSha256 = hash(actual);
    return [name, { state: actual.equals(bytes) ? 'matching' : 'modified', expectedSha256, actualSha256 }];
  }));
}

export function inspect(caseId, directory) {
  const files = snapshot(directory, evidence(caseId));
  const affected = [...new Set(Object.entries(files).filter(([, v]) => v.state !== 'matching')
    .flatMap(([name]) => dependencies[name]))];
  return { schema: 1, case: caseId, files, affected,
    // These are decisions of this fixed demonstration, not assertions read from a record.
    retained: ['scope:score-function', 'goal:original-parity', 'R-cap:not-started/unrun'],
    applicability: affected.length ? 'dependent-reuse-blocked' : 'use-normal-continuation',
    nextAction: affected.length ? 'obtain-trusted-original-or-separately-authorized-new-evidence' : 'continue',
    overallParity: 'unverified', humanReview: 'pending', reaTrial: 'not-run' };
}

export function recover(mode, caseId, directory, destination) {
  assert(['restore', 'supersede'].includes(mode), 'Unknown recovery mode');
  assert(typeof destination === 'string' && destination.length > 0, 'Missing destination');
  const original = evidence(caseId), assessment = inspect(caseId, directory);
  // Do not follow unsafe entries or turn an unknown identity into a trusted one.
  assert(Object.values(assessment.files).every(v => v.state !== 'unverified'), 'Unverified evidence; dependent work blocked');
  if (mode === 'restore') assert(assessment.affected.length > 0, 'Use ordinary continuation');
  else assert(caseId === 'resume', 'Only the fixed build-1 to build-2 transition is supported');
  const dir = path.resolve(destination), source = path.resolve(directory);
  const relative = path.relative(source, dir);
  assert(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'Destination must be outside source');
  // mkdir refuses an existing directory; no evidence or output is overwritten.
  fs.mkdirSync(dir);
  const put = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const selected = mode === 'restore' ? caseId : 'changed-target';
  put('recovery.json', { ...assessment, mode, selectedCase: selected,
    authority: 'explicit-local-fixture-invocation',
    evidenceSource: 'hash-verified-trusted-package-fixtures',
    history: 'source-left-in-place; missing-bytes-not-claimed-preserved',
    priorReportReuse: 'not-used-to-certify-new-execution',
    targetDisposition: mode === 'supersede' ? 'legitimately-superseded-by-explicit-selection' : 'trusted-original-restored-separately',
    workingDirectory: 'working' });
  const working = path.join(dir, 'working');
  walkthrough('prepare', selected, working);
  const result = walkthrough('continue', selected, working);
  assert(JSON.stringify(snapshot(source, original)) === JSON.stringify(assessment.files), 'Source changed during recovery');
  // The immutable package, not the damaged record, supplies identities/provenance.
  assert(JSON.stringify(evidence(caseId)) === JSON.stringify(original), 'Package changed during recovery');
  const completed = { schema: 1, mode, case: caseId, selectedCase: selected, status: result.status,
    sourcePreservation: 'verified-existing-file-hashes-and-missing-set', sourceFiles: assessment.files,
    freshResult: 'working/result.json', beforeFailures: result.beforeFailures, afterFailures: result.afterFailures,
    humanReview: 'pending', overallParity: 'unverified', actualAgentActions: 'unverified', reaTrial: 'not-run' };
  put('result.json', completed);
  return completed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, caseId, directory, destination] = process.argv.slice(2);
    assert(directory && process.argv.length === (mode === 'inspect' ? 5 : 6), 'Invalid invocation');
    const result = mode === 'inspect' ? inspect(caseId, directory) : recover(mode, caseId, directory, destination);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'comparison-failed' ? 1 : 0;
  } catch {
    process.stderr.write('Recovery error: check invocation, trusted fixtures, evidence safety and new destination. Dependent work remains blocked.\n');
    process.exitCode = 2;
  }
}
