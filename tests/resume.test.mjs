import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { checkResume, readRecord } from '../evals/resume/check.mjs';
import { evaluate as original } from '../evals/resume/fixtures/target-v1.mjs';
import { evaluate as changed } from '../evals/resume/fixtures/target-v2.mjs';
import { evaluate as partial } from '../evals/resume/fixtures/partial-candidate.mjs';

const root = fileURLToPath(new URL('../evals/resume/', import.meta.url));
const sample = id => readRecord(path.join(root, 'examples', id + '.json'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir()), dir = fs.mkdtempSync(path.join(parent, 'rea-resume-test-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent); assert.ok(path.basename(dir).startsWith('rea-resume-test-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false); fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function cli(args, script = path.join(root, 'check.mjs')) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', shell: false, timeout: 5000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
}

for (const id of ['resume', 'changed-target']) {
  test(`${id} record passes only the fixed data comparisons; human judgments remain pending`, () => {
    const report = checkResume(id, sample(id));
    assert.equal(report.status, 'comparisons-passed'); assert.equal(report.passed, 15); assert.equal(report.failed, 0);
    assert.equal(report.humanReview, 'pending'); assert.equal(report.actualAgentActions, 'unverified');
    assert.equal(report.preservationOnDisk, 'unverified'); assert.equal(report.reaTrial, 'not-run');
    assert.equal(sample(id).validation.overallParity, 'unverified');
  });
}

test('the earlier input report is real but cannot establish either cap implementation', () => {
  const report = readRecord(path.join(root, 'fixtures/input-report.json'));
  for (const { input, expected } of report.corpus) assert.deepEqual(partial(input), expected);
  assert.equal(report.passed, 6); assert.equal(report.failed, 0);
  assert.equal(report.corpusSha256, digest(JSON.stringify(report.corpus)));
  assert.equal(original(150), 100); assert.equal(changed(150), 150); assert.equal(changed(250), 200);
  assert.equal(partial(150), 150); assert.equal(partial(250), 250);
  assert.equal(report.overallParity, 'unverified');
});

for (const [name, id, mutate, label] of [
  ['old hash under the new version', 'changed-target', r => { r.target.sha256 = sample('resume').target.sha256; }, 'target-identity'],
  ['old input finding relabeled current', 'changed-target', r => { r.findings['F-input'] = 'current'; }, 'input-finding-applicability'],
  ['old cap finding relabeled current', 'changed-target', r => { r.findings['F-cap'] = 'current'; }, 'cap-finding-applicability'],
  ['old passing report reused against new target', 'changed-target', r => { r.validation.reportApplicability = 'current-input-cases-only'; }, 'prior-report-applicability'],
  ['implementation confused with current verification', 'changed-target', r => { r.requirements['R-input'].verification = 'verified-input-cases'; }, 'input-implementation-and-verification'],
  ['partial success inflated to full parity', 'resume', r => { r.validation.overallParity = 'verified'; }, 'overall-parity-unverified'],
  ['unfinished cap declared completed', 'resume', r => { r.requirements['R-cap'] = { implementation: 'implemented', verification: 'verified' }; }, 'unfinished-cap'],
  ['original history discarded', 'changed-target', r => { r.history.preserved = false; }, 'preserved-history'],
  ['candidate bytes silently changed', 'resume', r => { r.candidateSha256 = '0'.repeat(64); }, 'candidate-identity'],
  ['unnecessary rediscovery for unchanged target', 'resume', r => { r.nextAction = 'reassess-current-target'; }, 'next-action'],
  ['changed target treated as ready to build', 'changed-target', r => { r.nextAction = 'implement-cap-and-test'; }, 'next-action'],
  ['new improvement authorization invented', 'resume', r => { r.behaviorGoal = 'improvement'; }, 'behavior-goal'],
  ['scope expanded into an application', 'resume', r => { r.scope = 'whole-app'; }, 'scope'],
  ['extra ungraded requirement inserted', 'resume', r => { r.requirements['R-extra'] = { verification: 'verified' }; }, 'record-shape'],
]) {
  test(`resume evaluator rejects ${name} at its intended comparison`, () => {
    const record = sample(id); mutate(record);
    const report = checkResume(id, record);
    assert.equal(report.status, 'comparison-failed');
    assert.equal(report.results.find(row => row.label === label)?.reason, 'value-mismatch');
    assert.equal(report.passed + report.failed, report.total);
  });
}

test('comparisons preserve original checkpoint and report bytes', () => {
  const files = ['checkpoint.json', 'input-report.json'].map(name => path.join(root, 'fixtures', name));
  const before = files.map(file => fs.readFileSync(file));
  for (const id of ['resume', 'changed-target']) checkResume(id, sample(id));
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index]));
});

test('captured worked results still identify current checker, fixtures and submissions', () => {
  const saved = readRecord(path.join(root, 'examples/worked-results.json'));
  assert.equal(saved.checkerSha256, digest(fs.readFileSync(path.join(root, 'check.mjs'))));
  assert.equal(saved.independentAgentEvaluation, false); assert.equal(saved.humanReview, 'pending');
  assert.deepEqual(saved.reports, ['resume', 'changed-target'].map(id => checkResume(id, sample(id))));
});

test('CLI distinguishes passed, mismatched and invalid records without executing code', t => {
  assert.equal(cli(['resume', path.join(root, 'examples/resume.json')]).status, 0);
  assert.equal(cli(['changed-target', path.join(root, 'examples/resume.json')]).status, 1);
  const dir = fixture(t), file = path.join(dir, 'not-code.mjs'), marker = path.join(dir, 'must-not-run');
  fs.writeFileSync(file, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'ran');`);
  for (const args of [[], ['unknown', file], ['resume', file], ['resume', file, 'extra']]) {
    const result = cli(args); assert.equal(result.status, 2); assert.equal(result.stdout, '');
    assert.ok(result.stderr.trim()); assert.equal(result.stderr.includes(dir), false);
  }
  assert.equal(fs.existsSync(marker), false);
});

test('JSON reads are bounded and malformed records cannot become passing comparisons', t => {
  const dir = fixture(t), file = path.join(dir, 'record.json');
  fs.writeFileSync(file, '{}' + ' '.repeat(65534)); assert.deepEqual(readRecord(file), {});
  fs.writeFileSync(file, '{}' + ' '.repeat(65535)); assert.throws(() => readRecord(file));
  assert.throws(() => readRecord(dir));
  for (const record of [null, [], false, {}, { schema: 1 }]) assert.equal(checkResume('resume', record).status, 'comparison-failed');
});

test('fixture drift is an integrity error, not a candidate score', t => {
  const dir = fixture(t), copy = path.join(dir, 'resume'); fs.cpSync(root, copy, { recursive: true });
  const checker = path.join(copy, 'check.mjs'), record = path.join(copy, 'examples/resume.json');
  assert.equal(cli(['resume', record], checker).status, 0);
  fs.appendFileSync(path.join(copy, 'fixtures/target-v2.mjs'), '\n// deliberate drift\n');
  const result = cli(['resume', record], checker);
  assert.equal(result.status, 2); assert.equal(result.stdout, ''); assert.ok(result.stderr.trim());
  assert.equal(result.stderr.includes(dir), false);
});
