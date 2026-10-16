// MIT. Deterministic maintainer walkthrough, not an agent or REA evaluation.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function read(file) {
  const stat = fs.lstatSync(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 65536, 'Invalid evidence file');
  const bytes = fs.readFileSync(file);
  assert(bytes.length <= 65536, 'Oversized evidence file');
  return bytes;
}
export function evidence(caseId) {
  assert(['resume', 'changed-target'].includes(caseId), 'Unknown case');
  const identities = JSON.parse(read(path.join(fixtures, 'identity.json')));
  const fixed = {};
  for (const name of ['target-v1.mjs', 'target-v2.mjs', 'partial-candidate.mjs', 'checkpoint.json', 'input-report.json']) {
    fixed[name] = read(path.join(fixtures, name));
    assert(hash(fixed[name]) === identities.files[name], 'Fixture integrity failure');
  }
  const target = caseId === 'resume' ? 'target-v1.mjs' : 'target-v2.mjs';
  const files = {
    'checkpoint.json': fixed['checkpoint.json'],
    'input-report.json': fixed['input-report.json'],
    'target.mjs': fixed[target],
    'candidate-before.mjs': fixed['partial-candidate.mjs'],
  };
  files['prepared.json'] = json({ schema: 1, case: caseId, targetVersion: caseId === 'resume' ? '1.0.0' : '2.0.0',
    files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, hash(bytes)])) });
  return files;
}
function verify(dir, files) {
  assert(fs.lstatSync(dir).isDirectory() && !fs.lstatSync(dir).isSymbolicLink(), 'Invalid workspace');
  for (const [name, expected] of Object.entries(files)) {
    assert(read(path.join(dir, name)).equals(expected), 'Prepared evidence changed');
  }
}
const write = (dir, name, bytes) => fs.writeFileSync(path.join(dir, name), bytes, { flag: 'wx' });

// All integers in the declared domain, plus invalid representatives of every
// JSON type and numeric boundaries. Expectations do not come from target output.
const corpus = [...Array.from({ length: 1001 }, (_, i) => i), -1, 1001, 0.5, 999.5, null, false, true, '', '5', [], {}, [5], { value: 5 }];
const expected = (value, cap) => Number.isInteger(value) && value >= 0 && value <= 1000 ? Math.min(value, cap) : null;
function execute(file) {
  // Paths are fixed by this runner, never obtained from a checkpoint/report.
  // Validate primitives before JSON can normalize undefined/non-finite numbers
  // or invoke an object's toJSON hook and disguise a wrong return as null.
  const program = `
    import fs from 'node:fs';
    const { evaluate } = await import(process.argv[1]);
    const values = JSON.parse(fs.readFileSync(0, 'utf8'));
    const results = values.map(value => {
      const actual = evaluate(value);
      if (actual !== null && (typeof actual !== 'number' || !Number.isFinite(actual))) {
        throw new Error('Expected a finite number or null');
      }
      return actual;
    });
    process.stdout.write(JSON.stringify(results));
  `;
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program, pathToFileURL(file).href], {
    input: JSON.stringify(corpus), encoding: 'utf8', shell: false, windowsHide: true,
    timeout: 5000, maxBuffer: 1024 * 1024, env, cwd: path.dirname(file),
  });
  assert(!result.error && result.status === 0 && !result.signal && result.stderr === '', 'Fixture execution failed');
  const values = JSON.parse(result.stdout);
  assert(Array.isArray(values) && values.length === corpus.length, 'Invalid execution output');
  return values;
}
function comparison(values, oracle) {
  const failures = [];
  values.forEach((actual, index) => {
    if (actual !== oracle[index]) failures.push({ input: corpus[index], expected: oracle[index], actual });
  });
  return { total: corpus.length, passed: corpus.length - failures.length, failed: failures.length, failures };
}

export function walkthrough(phase, caseId, directory, options = {}) {
  assert(['prepare', 'continue'].includes(phase) && typeof directory === 'string' && directory.length > 0, 'Invalid invocation');
  const files = evidence(caseId), dir = path.resolve(directory);
  if (phase === 'prepare') {
    // mkdir is deliberately non-recursive and refuses an existing destination.
    fs.mkdirSync(dir);
    for (const [name, bytes] of Object.entries(files)) write(dir, name, bytes);
    verify(dir, files);
    return { schema: 1, phase, case: caseId, status: 'prepared' };
  }
  verify(dir, files);
  assert(JSON.stringify(fs.readdirSync(dir).sort()) === JSON.stringify(Object.keys(files).sort()), 'Workspace already used or contains unexpected files');
  const put = (name, value) => write(dir, name, json(value));
  const changed = caseId === 'changed-target', cap = changed ? 200 : 100;
  const targetSha256 = hash(files['target.mjs']), beforeSha256 = hash(files['candidate-before.mjs']);
  const triage = { schema: 1, case: caseId, scope: 'score-function', behaviorGoal: 'original-parity',
    targetSha256, candidateSha256: beforeSha256,
    findings: { 'F-input': changed ? 'stale' : 'current', 'F-cap': changed ? 'stale' : 'current' },
    requirements: { 'R-input': { implementation: 'implemented', verification: changed ? 'stale' : 'verified-input-cases' },
      'R-cap': { implementation: 'not-started', verification: 'unrun' } },
    priorReportApplicability: changed ? 'historical-other-target' : 'current-input-cases-only',
    overallParity: 'unverified', nextAction: changed ? 'reassess-current-target' : 'implement-cap-and-test' };
  put('triage.json', triage);
  const oracle = corpus.map(value => expected(value, cap));
  const targetValues = execute(path.join(dir, 'target.mjs'));
  const targetCheck = comparison(targetValues, oracle);
  assert(targetCheck.failed === 0, 'Selected target disagrees with independent expectations');
  if (changed) put('reassessment.json', { schema: 1, targetSha256,
    source: 'target-v2.mjs:3-4', historicalEvidence: 'checkpoint.json',
    findings: { 'F-input': 'Integer values 0..1000 accepted; other JSON values rejected with null.', 'F-cap': 'Accepted scores are capped at 200.' },
    evidence: { targetComparisons: targetCheck, corpusSha256: hash(JSON.stringify(corpus)),
      probes: [100, 101, 199, 200, 201, 1000].map(input => ({ input, actual: targetValues[input] })) },
    replacesApplicabilityOnly: true });
  const common = { schema: 1, kind: 'local-fixture-execution', targetSha256,
    corpusSha256: hash(JSON.stringify(corpus)), corpus, runtime: { node: process.version, platform: process.platform, arch: process.arch },
    harnessSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    expectationSource: 'independent-domain-and-cap-oracle', coverage: 'All integers 0..1000 and 13 invalid JSON representatives',
    targetComparisons: targetCheck, humanReview: 'pending', actualAgentActions: 'unverified', reaTrial: 'not-run' };
  // Only this fixed package candidate returns each accepted value unchanged.
  // Validate the entire supplied report against independent expected results,
  // fresh target behavior, and every execution dependency; labels cannot bless it.
  const expectedBefore = { ...common, candidateSha256: beforeSha256,
    comparisons: comparison(corpus.map(value => expected(value, 1000)), oracle), overallParity: 'unverified' };
  const expectedReport = JSON.stringify(expectedBefore);
  let reused = false;
  if (options.priorBefore !== undefined) {
    try { reused = JSON.stringify(options.priorBefore) === expectedReport; }
    catch { /* Unverifiable report structure is missing proof, not an execution error. */ }
  }
  const before = reused ? expectedBefore.comparisons : comparison(execute(path.join(dir, 'candidate-before.mjs')), oracle);
  put('before-report.json', { ...common, candidateSha256: beforeSha256, comparisons: before, overallParity: 'unverified' });
  if (options.recordRecovery) put('execution-recovery.json', {
    before: reused ? 'reused-validated-completed-report' : 'fresh-execution',
    target: 'fresh-execution', after: 'fresh-execution-required',
    missingProof: reused ? null : 'No complete report matching trusted fixture outcomes and current dependencies',
  });
  assert(before.failed > 0, 'Expected unfinished cap failures were absent');
  // A fixed, maintainer-authored repair of this fixture only. No source supplied
  // by the checkpoint is evaluated and no general patch/reconstruction engine exists.
  const source = files['candidate-before.mjs'].toString('utf8');
  assert(source.split('return value;').length === 2, 'Unexpected candidate source');
  const repaired = Buffer.from(source.replace('// MIT. Deliberately unfinished: input validation only; cap not implemented.',
    '// MIT. Maintainer-authored score-function completion for this walkthrough.')
    .replace('return value;', `return Math.min(value, ${cap});`));
  write(dir, 'candidate-after.mjs', repaired);
  assert(read(path.join(dir, 'candidate-after.mjs')).equals(repaired), 'Working candidate changed');
  const after = comparison(execute(path.join(dir, 'candidate-after.mjs')), oracle);
  put('after-report.json', { ...common, candidateSha256: hash(repaired), comparisons: after,
    overallParity: 'unverified', verification: after.failed === 0 ? 'verified-listed-corpus-only' : 'failed' });
  // Re-read originals and package evidence after execution, rather than trusting labels.
  verify(dir, files);
  const current = evidence(caseId);
  for (const name of Object.keys(files)) assert(current[name].equals(files[name]), 'Package evidence changed during execution');
  assert(read(path.join(dir, 'candidate-after.mjs')).equals(repaired), 'Working candidate changed during execution');
  const result = { schema: 1, case: caseId, status: after.failed === 0 ? 'walkthrough-passed' : 'comparison-failed',
    preservation: { status: 'verified-local-bytes', files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, hash(bytes)])) },
    beforeFailures: before.failed, afterFailures: after.failed, comparisons: after.total,
    humanReview: 'pending', actualAgentActions: 'unverified', crossHostContinuation: 'unverified', reaTrial: 'not-run' };
  put('result.json', result);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert(process.argv.length === 5, 'Invalid invocation');
    const result = walkthrough(...process.argv.slice(2));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'comparison-failed' ? 1 : 0;
  } catch {
    process.stderr.write('Walkthrough error: check phase, case, fixture integrity and fresh workspace.\n');
    process.exitCode = 2;
  }
}
