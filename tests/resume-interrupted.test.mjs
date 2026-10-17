import { fixtureLink } from '../scripts/fixture-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { walkthrough } from '../evals/resume/walkthrough.mjs';
import { recoverInterrupted } from '../evals/resume/interrupted.mjs';
import { inspect } from '../evals/resume/recovery.mjs';

const runner = fileURLToPath(new URL('../evals/resume/walkthrough.mjs', import.meta.url));
const cliRunner = fileURLToPath(new URL('../evals/resume/interrupted.mjs', import.meta.url));
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).sort().map(n => [n, fs.readFileSync(path.join(dir, n))]));
const read = (dir, n) => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
function fixture(t, caseId = 'resume') {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-interrupted-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('rea-interrupted-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const source = path.join(dir, 'failed attempt ø'), destination = path.join(dir, 'fresh attempt ø');
  walkthrough('prepare', caseId, source);
  return { dir, source, destination };
}
function interrupt(source, boundary, partial = false, caseId = 'resume') {
  // Actual child-process exit at a deterministic I/O boundary. No timer race,
  // signals, OS crash or power-loss durability is simulated or claimed.
  const program = `import fs from 'node:fs'; import path from 'node:path';
    const original = fs.writeFileSync;
    fs.writeFileSync = function(file, bytes, options) {
      if (path.basename(file) === ${JSON.stringify(boundary)}) {
        original.call(this, file, ${partial ? "'{\\\"partial\\\":'" : 'bytes'}, options);
        process.exit(73);
      }
      return original.call(this, file, bytes, options);
    };
    const { walkthrough } = await import(${JSON.stringify(pathToFileURL(runner).href)});
    walkthrough('continue', ${JSON.stringify(caseId)}, ${JSON.stringify(source)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program],
    { encoding: 'utf8', shell: false, windowsHide: true, timeout: 20000 });
  assert.equal(result.status, 73, result.stderr);
}

for (const caseId of ['resume', 'changed-target']) {
  for (const boundary of ['triage.json', 'before-report.json', 'candidate-after.mjs', 'after-report.json', 'result.json']) {
    test(`${caseId}: real process exit after ${boundary} preserves history and completes fresh destination`, t => {
      const { source, destination } = fixture(t, caseId);
      interrupt(source, boundary, false, caseId);
      const original = snapshot(source);
      assert.throws(() => walkthrough('continue', caseId, source), /already used/);
      assert.throws(() => inspect(caseId, source), /Unexpected/);
      const result = recoverInterrupted(caseId, source, destination);
      assert.equal(result.status, 'walkthrough-passed');
      assert.equal(result.afterFailures, 0);
      assert.equal(result.beforeFailures, caseId === 'resume' ? 900 : 800);
      assert.equal(result.execution.before, boundary === 'triage.json' ? 'fresh-execution' : 'reused-validated-completed-report');
      assert.equal(result.execution.target, 'fresh-execution');
      assert.equal(read(path.join(destination, 'working'), 'after-report.json').comparisons.passed, 1014);
      assert.deepEqual(snapshot(source), original);
      assert.throws(() => recoverInterrupted(caseId, source, destination), /EEXIST/);
      assert.deepEqual(snapshot(source), original);
    });
  }
}

for (const boundary of ['before-report.json', 'candidate-after.mjs', 'after-report.json']) {
  test(`actual process exit during ${boundary} never treats partial output as completed`, t => {
    const { source, destination } = fixture(t);
    interrupt(source, boundary, true);
    const original = snapshot(source);
    const result = recoverInterrupted('resume', source, destination);
    assert.equal(result.afterFailures, 0);
    assert.equal(result.execution.before, boundary === 'before-report.json' ? 'fresh-execution' : 'reused-validated-completed-report');
    assert.deepEqual(snapshot(source), original);
  });
}

for (const field of ['runtime', 'harnessSha256', 'corpusSha256', 'candidateSha256', 'targetSha256', 'comparisons']) {
  test(`injected ${field} drift or forged completion cannot establish reuse`, t => {
    const { source, destination } = fixture(t);
    interrupt(source, 'before-report.json');
    const report = read(source, 'before-report.json');
    report[field] = field === 'comparisons' ? { total: 1014, passed: 1014, failed: 0, failures: [] } : 'forged';
    fs.writeFileSync(path.join(source, 'before-report.json'), JSON.stringify(report));
    fs.writeFileSync(path.join(source, 'result.json'), JSON.stringify({ status: 'walkthrough-passed' }));
    const original = snapshot(source);
    const result = recoverInterrupted('resume', source, destination);
    assert.equal(result.execution.before, 'fresh-execution');
    assert.ok(result.execution.missingProof);
    assert.equal(result.beforeFailures, 900);
    assert.deepEqual(snapshot(source), original);
  });
}

test('explicit target change invalidates completed dependent report without losing original evidence', t => {
  const { source, destination } = fixture(t);
  interrupt(source, 'before-report.json');
  const original = snapshot(source);
  const result = recoverInterrupted('resume', source, destination, 'changed-target');
  assert.equal(result.execution.before, 'fresh-execution');
  assert.equal(result.beforeFailures, 800);
  assert.equal(read(path.join(destination, 'working'), 'triage.json').findings['F-cap'], 'stale');
  assert.deepEqual(snapshot(source), original);
});

test('unproven reports never execute embedded commands; prepared identity drift still blocks', t => {
  const { source, destination, dir } = fixture(t);
  const marker = path.join(dir, 'must-not-run');
  fs.writeFileSync(path.join(source, 'before-report.json'), JSON.stringify({ status: 'complete', command: `write ${marker}` }));
  recoverInterrupted('resume', source, destination);
  assert.equal(fs.existsSync(marker), false);
  fs.appendFileSync(path.join(source, 'target.mjs'), '\n// changed');
  assert.throws(() => recoverInterrupted('resume', source, path.join(dir, 'blocked')), /Prepared evidence changed/);
  assert.equal(fs.existsSync(path.join(dir, 'blocked')), false);
});

test('unknown, unsafe, oversized and nested entries fail before destination creation', t => {
  const { source, destination, dir } = fixture(t);
  for (const name of ['unknown.json', 'before-report.json']) {
    fs.mkdirSync(path.join(source, name));
    assert.throws(() => recoverInterrupted('resume', source, destination));
    fs.rmdirSync(path.join(source, name));
    assert.equal(fs.existsSync(destination), false);
  }
  fs.writeFileSync(path.join(source, 'before-report.json'), 'x'.repeat(262145));
  assert.throws(() => recoverInterrupted('resume', source, destination), /Unsafe/);
  fs.unlinkSync(path.join(source, 'before-report.json'));
  const outside = path.join(dir, 'outside'); fs.mkdirSync(outside);
  fixtureLink(outside, path.join(source, 'before-report.json'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => recoverInterrupted('resume', source, destination), /Unsafe/);
  fs.unlinkSync(path.join(source, 'before-report.json'));
  assert.throws(() => recoverInterrupted('resume', source, path.join(source, 'nested')), /outside/);
  assert.equal(fs.existsSync(destination), false);
});

test('CLI errors hide private paths and keep incomplete attempts; recovery can itself be retried from working', t => {
  const { source, destination, dir } = fixture(t);
  const result = spawnSync(process.execPath, [cliRunner, 'resume', source, source], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 2);
  assert.equal(result.stderr.includes(dir), false);
  assert.equal(result.stdout, '');
  recoverInterrupted('resume', source, destination);
  const working = path.join(destination, 'working'), original = snapshot(working);
  const second = recoverInterrupted('resume', working, path.join(dir, 'second recovery'));
  assert.equal(second.execution.before, 'reused-validated-completed-report');
  assert.deepEqual(snapshot(working), original);
});

test('an actual interrupted recovery retains its wrapper and working history for another destination', t => {
  const { source, destination, dir } = fixture(t);
  const program = `import fs from 'node:fs'; import path from 'node:path';
    const original = fs.writeFileSync;
    fs.writeFileSync = function(file, bytes, options) {
      original.call(this, file, bytes, options);
      if (path.basename(file) === 'execution-recovery.json') process.exit(74);
    };
    const { recoverInterrupted } = await import(${JSON.stringify(pathToFileURL(cliRunner).href)});
    recoverInterrupted('resume', ${JSON.stringify(source)}, ${JSON.stringify(destination)});`;
  const exit = spawnSync(process.execPath, ['--input-type=module', '--eval', program],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(exit.status, 74, exit.stderr);
  assert.equal(fs.existsSync(path.join(destination, 'result.json')), false);
  const wrapper = fs.readFileSync(path.join(destination, 'recovery.json'));
  const working = path.join(destination, 'working'), original = snapshot(working);
  const result = recoverInterrupted('resume', working, path.join(dir, 'retry'));
  assert.equal(result.status, 'walkthrough-passed');
  assert.equal(result.execution.before, 'reused-validated-completed-report');
  assert.deepEqual(snapshot(working), original);
  assert.deepEqual(fs.readFileSync(path.join(destination, 'recovery.json')), wrapper);
});

test('source-history mutation during recovery prevents a completion record', t => {
  const { source, destination } = fixture(t);
  const original = fs.writeFileSync;
  t.mock.method(fs, 'writeFileSync', function (file, bytes, options) {
    const result = original.call(this, file, bytes, options);
    if (file === path.join(destination, 'working', 'after-report.json')) {
      original.call(this, path.join(source, 'result.json'), 'unverified concurrent output');
    }
    return result;
  });
  assert.throws(() => recoverInterrupted('resume', source, destination), /history changed/);
  assert.equal(fs.existsSync(path.join(destination, 'result.json')), false);
  assert.equal(read(path.join(destination, 'working'), 'after-report.json').comparisons.failed, 0);
});

test('a deliberately broken fresh completion exits 1 and preserves failed comparisons', t => {
  const { source, destination, dir } = fixture(t);
  const copy = path.join(dir, 'runner');
  fs.cpSync(path.dirname(runner), copy, { recursive: true });
  const copied = path.join(copy, 'walkthrough.mjs'), original = fs.readFileSync(copied, 'utf8');
  const wrong = original.replace('return Math.min(value, ${cap});', 'return Math.min(value, ${cap - 1});');
  assert.notEqual(wrong, original);
  fs.writeFileSync(copied, wrong);
  const prior = snapshot(source);
  const result = spawnSync(process.execPath, [path.join(copy, 'interrupted.mjs'), 'resume', source, destination],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(read(destination, 'result.json').status, 'comparison-failed');
  assert.equal(read(destination, 'result.json').execution.after, 'fresh-execution');
  assert.equal(read(path.join(destination, 'working'), 'after-report.json').comparisons.failed, 901);
  assert.equal(read(path.join(destination, 'working'), 'after-report.json').verification, 'failed');
  assert.deepEqual(snapshot(source), prior);
});

test('validated reuse actually skips only partial-candidate execution; unknown evidence reruns it', t => {
  const { source, destination, dir } = fixture(t);
  interrupt(source, 'before-report.json');
  const original = childProcess.spawnSync, executions = [];
  t.mock.method(childProcess, 'spawnSync', function (command, args, options) {
    executions.push(path.basename(fileURLToPath(args.at(-1))));
    return original.call(this, command, args, options);
  });
  syncBuiltinESMExports();
  try {
    recoverInterrupted('resume', source, destination);
    assert.deepEqual(executions, ['target.mjs', 'candidate-after.mjs']);
    executions.length = 0;
    fs.writeFileSync(path.join(source, 'before-report.json'), '{');
    recoverInterrupted('resume', source, path.join(dir, 'unknown-report'));
    assert.deepEqual(executions, ['target.mjs', 'candidate-before.mjs', 'candidate-after.mjs']);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

test('deeply nested valid JSON is unproven evidence and reruns instead of aborting recovery', t => {
  const { source, destination } = fixture(t);
  // Well below the input byte bound; JSON.parse accepts it, but serialization
  // can exceed the JavaScript stack. It is not a completed fixture report.
  const nested = '['.repeat(20000) + '0' + ']'.repeat(20000);
  assert.doesNotThrow(() => JSON.parse(nested));
  fs.writeFileSync(path.join(source, 'before-report.json'), nested);
  const original = snapshot(source);
  const result = recoverInterrupted('resume', source, destination);
  assert.equal(result.status, 'walkthrough-passed');
  assert.equal(result.execution.before, 'fresh-execution');
  assert.ok(result.execution.missingProof);
  assert.deepEqual(snapshot(source), original);
});

test('completed recovery distinguishes performed final execution from the retained pending plan', t => {
  const { source, destination } = fixture(t);
  const result = recoverInterrupted('resume', source, destination);
  assert.equal(result.execution.after, 'fresh-execution');
  assert.equal(read(destination, 'result.json').execution.after, 'fresh-execution');
  assert.equal(read(path.join(destination, 'working'), 'execution-recovery.json').after, 'fresh-execution-required');
});

for (const name of ['checkpoint.json', 'input-report.json', 'target.mjs', 'candidate-before.mjs', 'prepared.json']) {
  for (const damage of ['missing', 'modified']) {
    test(`${damage} prepared ${name} with retained outputs blocks without creating a destination`, t => {
      const { source, destination } = fixture(t);
      fs.writeFileSync(path.join(source, 'triage.json'), '{');
      if (damage === 'missing') fs.unlinkSync(path.join(source, name));
      else fs.appendFileSync(path.join(source, name), '\nchanged');
      const original = snapshot(source);
      assert.throws(() => recoverInterrupted('resume', source, destination), /Prepared evidence changed/);
      assert.throws(() => inspect('resume', source), /Unexpected/);
      assert.equal(fs.existsSync(destination), false);
      assert.deepEqual(snapshot(source), original);
    });
  }
}

for (const operation of ['lstatSync', 'readFileSync']) {
  test(`unreadable retained output (${operation}) blocks recovery before creating files`, t => {
    const { source, destination } = fixture(t);
    fs.writeFileSync(path.join(source, 'before-report.json'), '{}');
    const original = snapshot(source), file = path.join(source, 'before-report.json');
    const method = fs[operation];
    t.mock.method(fs, operation, function (selected, ...args) {
      if (selected === file) throw Object.assign(new Error('private access details'), { code: 'EACCES' });
      return method.call(this, selected, ...args);
    });
    assert.throws(() => recoverInterrupted('resume', source, destination), { code: 'EACCES' });
    assert.equal(fs.existsSync(destination), false);
    t.mock.restoreAll();
    assert.deepEqual(snapshot(source), original);
  });
}

test('actual harness changes invalidate the old report, while unavailable trusted fixtures block', t => {
  const { source, destination, dir } = fixture(t);
  interrupt(source, 'before-report.json');
  const original = snapshot(source), copy = path.join(dir, 'changed harness');
  fs.cpSync(path.dirname(runner), copy, { recursive: true });
  fs.appendFileSync(path.join(copy, 'walkthrough.mjs'), '\n// harmless actual harness change\n');
  const result = spawnSync(process.execPath, [path.join(copy, 'interrupted.mjs'), 'resume', source, destination],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(destination, 'result.json').execution.before, 'fresh-execution');
  fs.appendFileSync(path.join(copy, 'fixtures/partial-candidate.mjs'), '\n// corrupt trusted fixture');
  const blocked = path.join(dir, 'blocked');
  const failure = spawnSync(process.execPath, [path.join(copy, 'interrupted.mjs'), 'resume', source, blocked],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(failure.status, 2);
  assert.equal(failure.stdout, '');
  assert.equal(failure.stderr.includes(dir), false);
  assert.equal(fs.existsSync(blocked), false);
  assert.deepEqual(snapshot(source), original);
});

test('retained candidate output is history and cannot execute or certify the regenerated candidate', t => {
  const { source, destination, dir } = fixture(t);
  const marker = path.join(dir, 'must-not-execute');
  fs.writeFileSync(path.join(source, 'candidate-after.mjs'),
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'ran'); export const evaluate = () => null;`);
  fs.writeFileSync(path.join(source, 'after-report.json'), JSON.stringify({ verification: 'verified-listed-corpus-only', comparisons: { failed: 0 } }));
  const original = snapshot(source);
  const result = recoverInterrupted('resume', source, destination);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(result.afterFailures, 0);
  assert.equal(read(path.join(destination, 'working'), 'after-report.json').comparisons.passed, 1014);
  assert.notDeepEqual(fs.readFileSync(path.join(destination, 'working/candidate-after.mjs')), original['candidate-after.mjs']);
  assert.deepEqual(snapshot(source), original);
});

for (const fault of ['timeout', 'unavailable', 'denied', 'no-exit', 'signal', 'stderr', 'truncated']) {
  test(`injected ${fault} cannot pass on plausible output or discard completed applicable work`, t => {
    const { source, destination, dir } = fixture(t);
    interrupt(source, 'before-report.json');
    const prior = snapshot(source), original = childProcess.spawnSync;
    const calls = [];
    t.mock.method(childProcess, 'spawnSync', function (command, args, options) {
      const name = path.basename(fileURLToPath(args.at(-1)));
      calls.push(name);
      if (name !== 'candidate-after.mjs') return original.call(this, command, args, options);
      // Controlled transport/process outcomes, not REA/provider observations.
      // Even a zero exit and plausible stdout cannot override an execution error.
      const result = { status: 0, signal: null, stdout: '[100]', stderr: '' };
      const code = { timeout: 'ETIMEDOUT', unavailable: 'ENOENT', denied: 'EACCES' }[fault];
      if (code) result.error = Object.assign(new Error('Injected execution failure'), { code });
      if (fault === 'no-exit') result.status = null;
      if (fault === 'signal') result.signal = 'SIGTERM';
      if (fault === 'stderr') result.stderr = 'Injected diagnostic';
      if (fault === 'truncated') result.stdout = '[100,';
      return result;
    });
    syncBuiltinESMExports();
    try {
      assert.throws(() => recoverInterrupted('resume', source, destination));
    } finally {
      t.mock.restoreAll(); syncBuiltinESMExports();
    }
    assert.deepEqual(calls, ['target.mjs', 'candidate-after.mjs'], 'no unchanged retry or repeated completed candidate check');
    const working = path.join(destination, 'working');
    assert.equal(fs.existsSync(path.join(destination, 'result.json')), false);
    assert.equal(fs.existsSync(path.join(working, 'result.json')), false);
    assert.equal(fs.existsSync(path.join(working, 'after-report.json')), false);
    assert.equal(read(working, 'before-report.json').comparisons.failed, 900);
    assert.equal(read(working, 'execution-recovery.json').before, 'reused-validated-completed-report');
    assert.equal(read(working, 'execution-recovery.json').after, 'fresh-execution-required');
    assert.deepEqual(snapshot(source), prior);
    const failedAttempt = snapshot(working);
    // The injected blocker has now been removed; use a separate destination.
    const completed = recoverInterrupted('resume', working, path.join(dir, 'resolved attempt'));
    assert.equal(completed.afterFailures, 0);
    assert.equal(completed.execution.before, 'reused-validated-completed-report');
    assert.deepEqual(snapshot(working), failedAttempt);
    assert.deepEqual(snapshot(source), prior);
  });
}

test('fresh execution error stays distinct from a comparison failure and cannot produce completion', t => {
  const { source, destination, dir } = fixture(t);
  const copy = path.join(dir, 'execution error');
  fs.cpSync(path.dirname(runner), copy, { recursive: true });
  const copied = path.join(copy, 'walkthrough.mjs'), original = fs.readFileSync(copied, 'utf8');
  const wrong = original.replace('return Math.min(value, ${cap});', 'return undefined;');
  assert.notEqual(wrong, original);
  fs.writeFileSync(copied, wrong);
  const prior = snapshot(source);
  const result = spawnSync(process.execPath, [path.join(copy, 'interrupted.mjs'), 'resume', source, destination],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.includes(dir), false);
  assert.equal(fs.existsSync(path.join(destination, 'result.json')), false);
  assert.equal(fs.existsSync(path.join(destination, 'working/result.json')), false);
  assert.equal(fs.existsSync(path.join(destination, 'working/after-report.json')), false);
  assert.equal(read(path.join(destination, 'working'), 'before-report.json').comparisons.failed, 900);
  assert.equal(read(path.join(destination, 'working'), 'execution-recovery.json').after, 'fresh-execution-required');
  assert.deepEqual(snapshot(source), prior);
});
