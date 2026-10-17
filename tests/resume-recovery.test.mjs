import { fixtureLink } from '../scripts/fixture-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspect, recover } from '../evals/resume/recovery.mjs';
import { walkthrough } from '../evals/resume/walkthrough.mjs';

const root = fileURLToPath(new URL('../evals/resume/', import.meta.url));
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).map(name => [name, fs.readFileSync(path.join(dir, name))]));
function fixture(t, caseId = 'resume') {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-evidence-recovery-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('rea-evidence-recovery-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const source = path.join(dir, 'old case ø'), destination = path.join(dir, 'recovered case ø');
  walkthrough('prepare', caseId, source);
  return { dir, source, destination };
}
function cli(args, runner = path.join(root, 'recovery.mjs')) {
  return spawnSync(process.execPath, [runner, ...args], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 20000 });
}

for (const caseId of ['resume', 'changed-target']) {
  for (const name of ['checkpoint.json', 'input-report.json', 'target.mjs', 'candidate-before.mjs', 'prepared.json']) {
    for (const state of ['missing', 'modified']) {
      test(`${caseId}: ${state} ${name} recovers original separately and preserves remaining bytes`, t => {
        const { source, destination } = fixture(t, caseId), file = path.join(source, name);
        if (state === 'missing') fs.unlinkSync(file);
        else fs.appendFileSync(file, '\n // untrusted modification');
        const before = snapshot(source);
        const assessment = inspect(caseId, source);
        assert.equal(assessment.files[name].state, state);
        assert.equal(assessment.applicability, 'dependent-reuse-blocked');
        assert.deepEqual(snapshot(source), before, 'inspection is read-only');
        assert.throws(() => walkthrough('continue', caseId, source), 'strict continuation still rejects drift');
        const run = cli(['restore', caseId, source, destination]);
        assert.equal(run.status, 0, run.stderr);
        const result = JSON.parse(run.stdout), working = path.join(destination, 'working');
        assert.equal(result.status, 'walkthrough-passed');
        assert.equal(result.afterFailures, 0);
        assert.equal(result.beforeFailures, caseId === 'resume' ? 900 : 800);
        assert.deepEqual(snapshot(source), before);
        const provenance = read(destination, 'recovery.json');
        assert.equal(provenance.files[name].state, state);
        assert.equal(provenance.priorReportReuse, 'not-used-to-certify-new-execution');
        assert.equal(provenance.evidenceSource, 'hash-verified-trusted-package-fixtures');
        const after = read(working, 'after-report.json');
        assert.equal(after.comparisons.passed, 1014);
        assert.equal(after.overallParity, 'unverified');
        assert.equal(read(working, 'result.json').preservation.status, 'verified-local-bytes');
        assert.deepEqual(fs.readFileSync(path.join(working, 'input-report.json')), fs.readFileSync(path.join(root, 'fixtures/input-report.json')));
        assert.equal(cli(['restore', caseId, source, destination]).status, 2, 'no overwrite');
        assert.deepEqual(snapshot(source), before);
      });
    }
  }
}

test('missing report blocks its verification only, retaining matching contract and candidate identities', t => {
  const { source } = fixture(t);
  fs.unlinkSync(path.join(source, 'input-report.json'));
  const result = inspect('resume', source);
  assert.deepEqual(result.affected, ['R-input.prior-verification']);
  for (const name of ['checkpoint.json', 'target.mjs', 'candidate-before.mjs', 'prepared.json']) assert.equal(result.files[name].state, 'matching');
  assert.deepEqual(result.retained, ['scope:score-function', 'goal:original-parity', 'R-cap:not-started/unrun']);
});

for (const operation of ['lstatSync', 'readFileSync']) {
  test(`an evidence ${operation} failure stays unverified without hiding unrelated files`, t => {
    const { source, destination } = fixture(t);
    const before = snapshot(source), file = path.join(source, 'input-report.json');
    const original = fs[operation];
    t.mock.method(fs, operation, function (selected, ...args) {
      if (selected === file) throw Object.assign(new Error('private details must not escape'), { code: 'EACCES' });
      return original.call(this, selected, ...args);
    });
    const result = inspect('resume', source);
    assert.equal(result.files['input-report.json'].state, 'unverified');
    assert.equal(result.files['input-report.json'].reason, 'unreadable');
    assert.equal(result.files['input-report.json'].actualSha256, null);
    assert.deepEqual(result.affected, ['R-input.prior-verification']);
    for (const name of ['target.mjs', 'candidate-before.mjs', 'checkpoint.json', 'prepared.json']) {
      assert.equal(result.files[name].state, 'matching');
      assert.equal(result.files[name].actualSha256, result.files[name].expectedSha256);
    }
    assert.equal(JSON.stringify(result).includes('private details'), false);
    assert.throws(() => recover('restore', 'resume', source, destination), /Unverified/);
    assert.equal(fs.existsSync(destination), false);
    t.mock.restoreAll();
    assert.deepEqual(snapshot(source), before);
  });
}

test('explicit supersession captures build 2 separately and reassesses before fresh testing', t => {
  const { source, destination } = fixture(t);
  // Even a replacement that happens to be the legitimate new target must not
  // be silently rebaselined by restore or by a record's embedded permission.
  fs.copyFileSync(path.join(root, 'fixtures/target-v2.mjs'), path.join(source, 'target.mjs'));
  const before = snapshot(source);
  const result = recover('supersede', 'resume', source, destination);
  assert.equal(result.selectedCase, 'changed-target');
  assert.equal(result.beforeFailures, 800);
  assert.deepEqual(snapshot(source), before);
  const working = path.join(destination, 'working');
  assert.equal(read(working, 'triage.json').priorReportApplicability, 'historical-other-target');
  assert.equal(read(working, 'triage.json').findings['F-cap'], 'stale');
  assert.equal(read(working, 'reassessment.json').evidence.targetComparisons.failed, 0);
  assert.equal(read(working, 'after-report.json').comparisons.failed, 0);
  assert.equal(read(destination, 'recovery.json').targetDisposition, 'legitimately-superseded-by-explicit-selection');
  const restored = path.join(path.dirname(destination), 'restore-not-rebaseline');
  recover('restore', 'resume', source, restored);
  assert.deepEqual(fs.readFileSync(path.join(restored, 'working/target.mjs')), fs.readFileSync(path.join(root, 'fixtures/target-v1.mjs')));
});

test('modified record cannot authorize commands or bless stale verification by editing hashes', t => {
  const { source, destination, dir } = fixture(t);
  const marker = path.join(dir, 'must-not-run');
  fs.writeFileSync(path.join(source, 'input-report.json'), JSON.stringify({ status: 'current',
    targetSha256: 'rebaseline-me', command: [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)},'ran')`] }));
  fs.writeFileSync(path.join(source, 'candidate-before.mjs'), `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'ran');`);
  recover('restore', 'resume', source, destination);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(read(destination, 'result.json').beforeFailures, 900);
  assert.ok(inspect('resume', source).affected.includes('candidate-comparisons'));
});

test('unsafe evidence is unverified, blocks recovery and leaves unrelated work inspectable', t => {
  const { source, destination, dir } = fixture(t);
  const report = path.join(source, 'input-report.json');
  fs.unlinkSync(report);
  const outside = path.join(dir, 'outside'); fs.mkdirSync(outside);
  fixtureLink(outside, report, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(inspect('resume', source).files['input-report.json'].state, 'unverified');
  assert.throws(() => recover('restore', 'resume', source, destination), /Unverified/);
  assert.equal(fs.existsSync(destination), false);
  assert.deepEqual(fs.readdirSync(outside), []);
  fs.unlinkSync(report);
});

test('unavailable trusted originals never cause fallback to altered evidence', t => {
  const { source, destination, dir } = fixture(t);
  const copy = path.join(dir, 'runner'); fs.cpSync(root, copy, { recursive: true });
  fs.appendFileSync(path.join(copy, 'fixtures/partial-candidate.mjs'), '\n// drift');
  fs.unlinkSync(path.join(source, 'target.mjs'));
  const before = snapshot(source);
  const result = cli(['restore', 'resume', source, destination], path.join(copy, 'recovery.mjs'));
  assert.equal(result.status, 2);
  assert.equal(result.stdout, ''); assert.equal(result.stderr.includes(dir), false);
  assert.equal(fs.existsSync(destination), false);
  assert.deepEqual(snapshot(source), before);
});

test('invocation, destination, unsafe size and unexpected entries fail without overwriting', t => {
  const { source, destination } = fixture(t);
  assert.equal(inspect('resume', source).applicability, 'use-normal-continuation');
  assert.throws(() => recover('restore', 'resume', source, destination), /ordinary/);
  fs.unlinkSync(path.join(source, 'input-report.json'));
  for (const args of [[], ['bless', 'resume', source, destination], ['inspect', 'unknown', source],
    ['inspect', 'resume', source, destination], ['restore', 'resume', source, source],
    ['restore', 'resume', source, path.join(source, 'nested')]]) assert.equal(cli(args).status, 2);
  fs.writeFileSync(path.join(source, 'checkpoint.json'), 'x'.repeat(65537));
  assert.equal(inspect('resume', source).files['checkpoint.json'].state, 'unverified');
  assert.throws(() => recover('restore', 'resume', source, destination), /Unverified/);
  fs.writeFileSync(path.join(source, 'after-report.json'), 'retained interruption');
  assert.throws(() => inspect('resume', source), /Unexpected/);
  assert.equal(fs.existsSync(destination), false);
});

test('a broken recovery completion retains fresh failing comparisons and exits 1', t => {
  const { source, destination, dir } = fixture(t);
  const copy = path.join(dir, 'runner'); fs.cpSync(root, copy, { recursive: true });
  const runner = path.join(copy, 'walkthrough.mjs');
  const original = fs.readFileSync(runner, 'utf8');
  const wrong = original.replace('return Math.min(value, ${cap});', 'return Math.min(value, ${cap - 1});');
  assert.notEqual(wrong, original); fs.writeFileSync(runner, wrong);
  fs.unlinkSync(path.join(source, 'input-report.json'));
  const before = snapshot(source);
  const result = cli(['restore', 'resume', source, destination], path.join(copy, 'recovery.mjs'));
  assert.equal(result.status, 1, result.stderr);
  assert.equal(read(destination, 'result.json').status, 'comparison-failed');
  assert.equal(read(destination, 'working/after-report.json').comparisons.failed, 901);
  assert.equal(read(destination, 'working/after-report.json').verification, 'failed');
  assert.deepEqual(snapshot(source), before);
});

test('a recovery regression that changes source history cannot produce a completion record', t => {
  const { source, destination, dir } = fixture(t);
  const copy = path.join(dir, 'runner'); fs.cpSync(root, copy, { recursive: true });
  const runner = path.join(copy, 'recovery.mjs');
  const original = fs.readFileSync(runner, 'utf8');
  const wrong = original.replace("  const result = walkthrough('continue', selected, working);",
    "  const result = walkthrough('continue', selected, working);\n  fs.appendFileSync(path.join(source, 'checkpoint.json'), 'changed');");
  assert.notEqual(wrong, original); fs.writeFileSync(runner, wrong);
  fs.unlinkSync(path.join(source, 'input-report.json'));
  const result = cli(['restore', 'resume', source, destination], runner);
  assert.equal(result.status, 2);
  assert.equal(fs.existsSync(path.join(destination, 'result.json')), false);
  assert.equal(read(destination, 'working/after-report.json').comparisons.failed, 0);
  assert.equal(fs.existsSync(path.join(source, 'input-report.json')), false);
});
