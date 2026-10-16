// A fixed supplied-evidence evaluation, not a general checkpoint policy engine.
// Reads JSON only; never imports/executes code or follows paths from a submission.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const modes = ['resume', 'changed-target'];
const fixedFiles = ['target-v1.mjs', 'target-v2.mjs', 'partial-candidate.mjs', 'checkpoint.json', 'input-report.json'];

export function readRecord(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw new Error('Expected a bounded regular JSON file.');
  const fd = fs.openSync(file, 'r');
  try {
    const bytes = Buffer.alloc(65537);
    let length = 0, count;
    do { count = fs.readSync(fd, bytes, length, bytes.length - length, null); length += count; }
    while (count && length < bytes.length);
    if (length > 65536) throw new Error('JSON record too large.');
    return JSON.parse(bytes.subarray(0, length).toString('utf8'));
  } finally { fs.closeSync(fd); }
}

export function expectedRecord(id) {
  if (!modes.includes(id)) throw new Error('Choose resume or changed-target.');
  const identity = readRecord(path.join(here, 'fixtures/identity.json'));
  // Only these fixed repository-owned paths are inspected, never identity-supplied paths.
  for (const file of fixedFiles) {
    const absolute = path.join(here, 'fixtures', file), stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536
      || hash(fs.readFileSync(absolute)) !== identity.files?.[file]) throw new Error('Fixture identity mismatch.');
  }
  const changed = id === 'changed-target';
  return {
    schema: 1,
    target: { version: changed ? '2.0.0' : '1.0.0', sha256: identity.files[changed ? 'target-v2.mjs' : 'target-v1.mjs'] },
    mode: 'build-from-specification', scope: 'score-function', behaviorGoal: 'original-parity',
    candidateSha256: identity.files['partial-candidate.mjs'],
    history: { checkpointSha256: identity.files['checkpoint.json'], reportSha256: identity.files['input-report.json'], preserved: true },
    findings: { 'F-input': changed ? 'stale' : 'current', 'F-cap': changed ? 'stale' : 'current' },
    requirements: {
      'R-input': { implementation: 'implemented', verification: changed ? 'stale' : 'verified-input-cases' },
      'R-cap': { implementation: 'not-started', verification: 'unrun' },
    },
    validation: { reportApplicability: changed ? 'historical-other-target' : 'current-input-cases-only', overallParity: 'unverified' },
    nextAction: changed ? 'reassess-current-target' : 'implement-cap-and-test',
  };
}

export function checkResume(id, record) {
  const expected = expectedRecord(id);
  const keys = (value, names) => value !== null && typeof value === 'object' && !Array.isArray(value)
    && isDeepStrictEqual(Object.keys(value).sort(), [...names].sort());
  const shape = keys(record, Object.keys(expected))
    && keys(record.findings, ['F-input', 'F-cap']) && keys(record.requirements, ['R-input', 'R-cap'])
    && keys(record.validation, ['reportApplicability', 'overallParity']);
  const fields = [
    ['record-shape', true, shape],
    ['schema', expected.schema, record?.schema], ['target-identity', expected.target, record?.target],
    ['mode', expected.mode, record?.mode], ['scope', expected.scope, record?.scope],
    ['behavior-goal', expected.behaviorGoal, record?.behaviorGoal],
    ['candidate-identity', expected.candidateSha256, record?.candidateSha256],
    ['preserved-history', expected.history, record?.history],
    ['input-finding-applicability', expected.findings['F-input'], record?.findings?.['F-input']],
    ['cap-finding-applicability', expected.findings['F-cap'], record?.findings?.['F-cap']],
    ['input-implementation-and-verification', expected.requirements['R-input'], record?.requirements?.['R-input']],
    ['unfinished-cap', expected.requirements['R-cap'], record?.requirements?.['R-cap']],
    ['prior-report-applicability', expected.validation.reportApplicability, record?.validation?.reportApplicability],
    ['overall-parity-unverified', expected.validation.overallParity, record?.validation?.overallParity],
    ['next-action', expected.nextAction, record?.nextAction],
  ];
  const results = fields.map(([label, wanted, actual]) => ({ label,
    status: isDeepStrictEqual(actual, wanted) ? 'passed' : 'failed',
    ...(!isDeepStrictEqual(actual, wanted) ? { reason: 'value-mismatch' } : {}) }));
  const failed = results.filter(row => row.status === 'failed').length;
  return { schema: 1, case: id, kind: 'checkpoint-record-comparison',
    status: failed ? 'comparison-failed' : 'comparisons-passed', total: results.length,
    passed: results.length - failed, failed, results,
    submissionSha256: hash(JSON.stringify(record) ?? 'undefined'),
    fixtureIdentitySha256: hash(fs.readFileSync(path.join(here, 'fixtures/identity.json'))),
    humanReview: 'pending', preservationOnDisk: 'unverified', actualAgentActions: 'unverified', reaTrial: 'not-run' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [id, file, ...extra] = process.argv.slice(2);
    if (!modes.includes(id) || !file || extra.length) throw new Error('Invalid invocation.');
    const report = checkResume(id, readRecord(file));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.failed ? 1 : 0;
  } catch {
    console.error('Usage: node evals/resume/check.mjs resume|changed-target RECORD.json. Check record/fixture integrity; nothing was executed or repaired.');
    process.exitCode = 2;
  }
}
