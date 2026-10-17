import { fixtureLink } from '../scripts/test-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../evals/resume/', import.meta.url));
const runner = path.join(root, 'walkthrough.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-resume-walkthrough-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('rea-resume-walkthrough-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function cli(args, script = runner) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024,
  });
}
function prepare(t, caseId = 'resume') {
  const dir = path.join(temporary(t), 'case with spaces ø');
  const result = cli(['prepare', caseId, dir]);
  assert.equal(result.status, 0, result.stderr);
  return dir;
}
for (const caseId of ['resume', 'changed-target']) {
  test(`${caseId}: fresh process resumes actual files, preserves history and executes repaired behavior`, t => {
    const packageBefore = Object.fromEntries(fs.readdirSync(path.join(root, 'fixtures')).map(name =>
      [name, fs.readFileSync(path.join(root, 'fixtures', name))]));
    const dir = prepare(t, caseId);
    const originalNames = fs.readdirSync(dir);
    const before = Object.fromEntries(originalNames.map(name => [name, fs.readFileSync(path.join(dir, name))]));
    assert.deepEqual(before['checkpoint.json'], packageBefore['checkpoint.json']);
    assert.deepEqual(before['input-report.json'], packageBefore['input-report.json']);
    assert.deepEqual(before['candidate-before.mjs'], packageBefore['partial-candidate.mjs']);
    assert.deepEqual(before['target.mjs'], packageBefore[caseId === 'resume' ? 'target-v1.mjs' : 'target-v2.mjs']);
    const run = cli(['continue', caseId, dir]);
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout), triage = read(dir, 'triage.json');
    assert.equal(result.status, 'walkthrough-passed');
    assert.equal(result.preservation.status, 'verified-local-bytes');
    for (const name of originalNames) {
      assert.deepEqual(fs.readFileSync(path.join(dir, name)), before[name]);
      assert.equal(result.preservation.files[name], hash(before[name]));
    }
    for (const [name, bytes] of Object.entries(packageBefore)) assert.deepEqual(fs.readFileSync(path.join(root, 'fixtures', name)), bytes);
    assert.equal(triage.scope, 'score-function'); assert.equal(triage.behaviorGoal, 'original-parity');
    assert.deepEqual(triage.requirements['R-cap'], { implementation: 'not-started', verification: 'unrun' });
    assert.equal(triage.requirements['R-input'].implementation, 'implemented');
    assert.equal(triage.overallParity, 'unverified');
    const changed = caseId === 'changed-target';
    assert.equal(triage.findings['F-input'], changed ? 'stale' : 'current');
    assert.equal(triage.findings['F-cap'], changed ? 'stale' : 'current');
    assert.equal(triage.requirements['R-input'].verification, changed ? 'stale' : 'verified-input-cases');
    assert.equal(triage.priorReportApplicability, changed ? 'historical-other-target' : 'current-input-cases-only');
    assert.equal(fs.existsSync(path.join(dir, 'reassessment.json')), changed);
    if (changed) {
      const reassessed = read(dir, 'reassessment.json');
      assert.equal(reassessed.targetSha256, hash(before['target.mjs']));
      assert.equal(reassessed.evidence.targetComparisons.failed, 0);
      assert.deepEqual(reassessed.evidence.probes.map(p => p.actual), [100, 101, 199, 200, 200, 200]);
      assert.match(reassessed.findings['F-cap'], /200/);
    }
    const failed = read(dir, 'before-report.json'), passed = read(dir, 'after-report.json');
    assert.equal(failed.comparisons.failed, changed ? 800 : 900);
    assert.equal(failed.candidateSha256, hash(before['candidate-before.mjs']));
    assert.equal(passed.candidateSha256, hash(fs.readFileSync(path.join(dir, 'candidate-after.mjs'))));
    assert.notEqual(failed.candidateSha256, passed.candidateSha256);
    assert.equal(passed.targetSha256, hash(before['target.mjs']));
    assert.equal(passed.comparisons.total, 1014); assert.equal(passed.comparisons.failed, 0);
    assert.equal(passed.comparisons.passed, 1014); assert.equal(passed.targetComparisons.passed, 1014);
    assert.equal(passed.corpusSha256, hash(JSON.stringify(passed.corpus)));
    for (const input of [0, 99, 100, 101, 199, 200, 201, 1000, -1, 1001]) assert.ok(passed.corpus.includes(input));
    assert.equal(passed.verification, 'verified-listed-corpus-only');
    assert.equal(passed.overallParity, 'unverified'); assert.equal(passed.runtime.node, process.version);
    assert.equal(result.humanReview, 'pending'); assert.equal(result.actualAgentActions, 'unverified');
    assert.equal(result.reaTrial, 'not-run'); assert.equal(result.crossHostContinuation, 'unverified');
    const outputs = Object.fromEntries(fs.readdirSync(dir).map(name => [name, fs.readFileSync(path.join(dir, name))]));
    assert.equal(cli(['continue', caseId, dir]).status, 2);
    for (const [name, bytes] of Object.entries(outputs)) assert.deepEqual(fs.readFileSync(path.join(dir, name)), bytes);
  });
}

for (const name of ['checkpoint.json', 'input-report.json', 'target.mjs', 'candidate-before.mjs', 'prepared.json']) {
  for (const change of ['missing', 'tampered']) {
    test(`continuation rejects ${change} ${name} before executing or repairing`, t => {
      const dir = prepare(t, 'changed-target'), file = path.join(dir, name);
      if (change === 'missing') fs.unlinkSync(file);
      else fs.appendFileSync(file, '\n ');
      const before = fs.readdirSync(dir);
      const result = cli(['continue', 'changed-target', dir]);
      assert.equal(result.status, 2); assert.equal(result.stdout, '');
      assert.equal(result.stderr.includes(dir), false);
      assert.deepEqual(fs.readdirSync(dir), before);
    });
  }
}
test('rejects stale report relabeling and code/path instructions in records without execution', t => {
  const dir = prepare(t, 'changed-target'), marker = path.join(dir, 'must-not-run');
  const report = read(dir, 'input-report.json');
  report.targetSha256 = hash(fs.readFileSync(path.join(dir, 'target.mjs')));
  report.command = [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)},'ran')`];
  fs.writeFileSync(path.join(dir, 'input-report.json'), JSON.stringify(report));
  assert.equal(cli(['continue', 'changed-target', dir]).status, 2);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.existsSync(path.join(dir, 'candidate-after.mjs')), false);
});
test('rejects case switches, unknown invocations, existing destinations and unexpected output', t => {
  const dir = prepare(t), preserved = fs.readFileSync(path.join(dir, 'prepared.json'));
  for (const args of [[], ['prepare', 'unknown', dir], ['continue', 'changed-target', dir],
    ['prepare', 'resume', dir], ['continue', 'resume', dir, 'extra']]) assert.equal(cli(args).status, 2);
  fs.writeFileSync(path.join(dir, 'after-report.json'), 'do not overwrite');
  assert.equal(cli(['continue', 'resume', dir]).status, 2);
  assert.equal(fs.readFileSync(path.join(dir, 'after-report.json'), 'utf8'), 'do not overwrite');
  assert.deepEqual(fs.readFileSync(path.join(dir, 'prepared.json')), preserved);
});
test('rejects mismatched target version/bytes and changed candidate even when case labels agree', t => {
  for (const [name, source] of [['target.mjs', 'target-v1.mjs'], ['candidate-before.mjs', 'target-v2.mjs']]) {
    const dir = prepare(t, 'changed-target');
    fs.copyFileSync(path.join(root, 'fixtures', source), path.join(dir, name));
    assert.equal(cli(['continue', 'changed-target', dir]).status, 2);
    assert.equal(fs.existsSync(path.join(dir, 'triage.json')), false);
  }
});
test('package fixture drift prevents preparation, including drift in the unselected target', t => {
  const dir = temporary(t), copy = path.join(dir, 'resume');
  fs.cpSync(root, copy, { recursive: true });
  fs.appendFileSync(path.join(copy, 'fixtures', 'target-v2.mjs'), '\n// drift');
  const destination = path.join(dir, 'case');
  assert.equal(cli(['prepare', 'resume', destination], path.join(copy, 'walkthrough.mjs')).status, 2);
  assert.equal(fs.existsSync(destination), false);
});
test('a wrong completion retains fresh failures and exits 1 rather than claiming success', t => {
  const dir = temporary(t), copy = path.join(dir, 'resume');
  fs.cpSync(root, copy, { recursive: true });
  const script = path.join(copy, 'walkthrough.mjs');
  const source = fs.readFileSync(script, 'utf8');
  const wrong = source.replace('return Math.min(value, ${cap});', 'return Math.min(value, ${cap - 1});');
  assert.notEqual(wrong, source);
  fs.writeFileSync(script, wrong);
  const workspace = path.join(dir, 'case');
  assert.equal(cli(['prepare', 'changed-target', workspace], script).status, 0);
  const result = cli(['continue', 'changed-target', workspace], script);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'comparison-failed');
  assert.equal(read(workspace, 'before-report.json').comparisons.failed, 800);
  assert.equal(read(workspace, 'after-report.json').comparisons.failed, 801);
  assert.equal(read(workspace, 'after-report.json').verification, 'failed');
  assert.equal(read(workspace, 'result.json').preservation.status, 'verified-local-bytes');
});
for (const invalid of ['undefined', 'NaN', 'Infinity', '-Infinity', '({ toJSON() { return null; } })']) {
  test(`serialization cannot turn ${invalid} into a successful null rejection`, t => {
    const dir = temporary(t), copy = path.join(dir, 'resume');
    fs.cpSync(root, copy, { recursive: true });
    const script = path.join(copy, 'walkthrough.mjs');
    const source = fs.readFileSync(script, 'utf8');
    // Simulate a completion regression in the generated working copy only.
    // The trusted target, historical evidence and partial candidate stay intact.
    const changed = source.replace(".replace('return value;',",
      `.replace('return null;', 'return ${invalid};').replace('return value;',`);
    assert.notEqual(changed, source);
    fs.writeFileSync(script, changed);
    const workspace = path.join(dir, 'case');
    assert.equal(cli(['prepare', 'resume', workspace], script).status, 0);
    const before = fs.readFileSync(path.join(workspace, 'input-report.json'));
    const result = cli(['continue', 'resume', workspace], script);
    assert.equal(result.status, 2, 'Invalid execution output must be an execution error, not a score');
    assert.equal(result.stdout, ''); assert.equal(result.stderr.includes(dir), false);
    assert.equal(read(workspace, 'before-report.json').comparisons.failed, 900);
    assert.equal(fs.existsSync(path.join(workspace, 'after-report.json')), false);
    assert.equal(fs.existsSync(path.join(workspace, 'result.json')), false);
    assert.deepEqual(fs.readFileSync(path.join(workspace, 'input-report.json')), before);
  });
}
test('a directly linked workspace directory is rejected', t => {
  const dir = prepare(t), alias = path.join(path.dirname(dir), 'alias');
  fixtureLink(dir, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(cli(['continue', 'resume', alias]).status, 2);
  assert.equal(fs.existsSync(path.join(dir, 'triage.json')), false);
  fs.unlinkSync(alias);
});
