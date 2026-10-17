import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preflight, summarize, fixtureLink } from '../scripts/fixture-environment.mjs';
import { runTests } from '../scripts/suite-process.mjs';

const denied = Object.assign(new Error('Injected private /host/path'), { code: 'EPERM', errno: -1, syscall: 'symlink' });
// Controlled in-memory filesystem; these are injected outcomes, not host evidence.
function controlled({ failure, cleanupFailure, replaceOwner = false } = {}) {
  const parent = path.resolve('controlled-parent'), owned = path.join(parent, 'rea-test-preflight-owned');
  const entries = new Map([[owned, 'directory']]);
  const calls = [];
  const io = {
    realpathSync: () => parent, mkdtempSync: () => owned,
    mkdirSync: name => entries.set(name, 'directory'),
    symlinkSync: (target, link, kind) => {
      calls.push(['create-link', kind]);
      if (replaceOwner) entries.set(owned, 'link');
      if (failure) throw failure;
      entries.set(link, 'link');
    },
    lstatSync: name => {
      const kind = entries.get(name);
      if (!kind) throw Object.assign(new Error('Absent'), { code: 'ENOENT' });
      return { isSymbolicLink: () => kind === 'link', isDirectory: () => kind === 'directory' };
    },
    unlinkSync: name => { calls.push(['unlink', path.basename(name)]); entries.delete(name); },
    rmdirSync: name => {
      calls.push(['rmdir', path.basename(name)]);
      if (cleanupFailure) throw cleanupFailure;
      if ([...entries.keys()].some(key => key !== name && path.dirname(key) === name)) throw Object.assign(new Error('Not empty'), { code: 'ENOTEMPTY' });
      entries.delete(name);
    }
  };
  return { io, temporary: parent, entries, calls };
}

test('controlled supported probe removes link before target and owned directory', () => {
  for (const platform of ['win32', 'linux']) {
    const f = controlled();
    const result = preflight({ ...f, platform });
    assert.equal(result.complete, true);
    assert.equal(f.entries.size, 0);
    assert.deepEqual(f.calls.slice(0, 3), [['create-link', platform === 'win32' ? 'junction' : 'dir'], ['unlink', 'link'], ['rmdir', 'target']]);
  }
});

test('controlled denied and unexpected probes retain stage and cleanup, exclude private messages', () => {
  for (const error of [denied, Object.assign(new Error('Injected'), { code: 'EIO' })]) {
    const f = controlled({ failure: error });
    const result = preflight(f);
    assert.equal(result.complete, false);
    assert.equal(result.records[0].stage, 'create-link');
    assert.equal(result.records[0].result, error === denied ? 'denied' : 'unknown');
    assert.equal(result.records[0].error.code, error.code);
    assert.equal(f.entries.size, 0);
    assert.ok(!JSON.stringify(result).includes('/host/path'));
  }
});

test('controlled cleanup failure preserves prior probe denial and prevents success', () => {
  const result = preflight(controlled({ failure: denied, cleanupFailure: Object.assign(new Error('Injected cleanup'), { code: 'EIO' }) }));
  assert.equal(result.records[0].error.code, 'EPERM');
  assert.equal(result.records[1].stage, 'cleanup-target');
  assert.equal(result.records[1].error.code, 'EIO');
  assert.equal(result.complete, false);
});

test('controlled replaced owner cannot cause traversal or recursive cleanup', () => {
  const f = controlled({ failure: denied, replaceOwner: true });
  const result = preflight(f);
  assert.equal(result.complete, false);
  assert.ok(result.records.some(record => record.stage === 'cleanup-link'));
  assert.deepEqual(f.calls, [['create-link', process.platform === 'win32' ? 'junction' : 'dir']]);
});

const counts = { tests: 1, pass: 1, fail: 0, cancelled: 0, skipped: 0, todo: 0 };
test('injected missing/partial diagnostics or process results never pass validation', () => {
  const ok = { complete: true }, child = { code: 0, signal: null };
  assert.equal(summarize(ok, child, counts).exit, 0);
  for (const result of [summarize(null, child, counts), summarize(ok, null, null), summarize(ok, child, null),
    summarize(ok, { ...child, error: denied }, counts), summarize(ok, { ...child, signal: 'SIGTERM' }, counts),
    summarize(ok, child, { ...counts, todo: 1 }), summarize(ok, child, { ...counts, cancelled: 1 })]) {
    assert.equal(result.exit, 2); assert.notEqual(result.gate, 'passed');
  }
  assert.equal(summarize({ complete: false }, { code: 7 }, { ...counts, pass: 0, fail: 1 }).exit, 7);
});

test('actual controlled Node child preserves product failure beside injected denied probe', async t => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-diagnostics-test-'));
  const file = path.join(dir, 'controlled.mjs');
  t.after(() => { fs.unlinkSync(file); fs.rmdirSync(dir); });
  fs.writeFileSync(file, "import test from 'node:test'; import assert from 'node:assert/strict'; test('controlled product failure', () => assert.equal(1, 2));");
  const probe = preflight(controlled({ failure: denied }));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // This controlled child owns its own test runner.
  let output = '';
  const result = await runTests(probe, { env, args: ['--test', '--test-reporter=tap', file], output: chunk => { output += chunk; } });
  assert.equal(result.exit, 1); assert.equal(result.gate, 'failed');
  assert.equal(result.counts.tests, 1); assert.equal(result.counts.fail, 1);
  assert.match(output, /controlled product failure/); assert.match(output, /ERR_ASSERTION/);
  fs.writeFileSync(file, "import test from 'node:test'; test('controlled pass', () => {});");
  const supported = preflight(controlled());
  assert.equal((await runTests(supported, { env, args: ['--test', '--test-reporter=tap', file], output: () => {} })).exit, 0);
  assert.equal((await runTests(probe, { env, args: ['--test', '--test-reporter=tap', file], output: () => {} })).exit, 2);
  const missing = await runTests(supported, { command: path.join(dir, 'absent-executable'), output: () => {} });
  assert.equal(missing.execution, 'unavailable'); assert.equal(missing.exit, 2); assert.equal(missing.counts, null);
});

test('fixture diagnostic rethrows exact original error and emits no private path', t => {
  assert.equal(preflight(controlled()).complete, true, 'earlier support cannot guarantee this later fixture');
  t.mock.method(fs, 'symlinkSync', () => { throw denied; });
  let output = '';
  t.mock.method(process.stderr, 'write', chunk => { output += chunk; return true; });
  assert.throws(() => fixtureLink('private-target', 'private-link', 'junction'), error => error === denied);
  const result = JSON.parse(output);
  assert.equal(result.event, 'fixture-setup'); assert.equal(result.stage, 'create-link'); assert.equal(result.error.code, 'EPERM');
  assert.ok(!output.includes('private'));
  t.mock.method(process.stderr, 'write', () => { throw new Error('Injected reporting failure'); });
  assert.throws(() => fixtureLink('private-target', 'private-link', 'junction'), error => error === denied);
});

test('help and invalid arguments perform no preflight', () => {
  for (const [args, code] of [[['--help'], 0], [['--invalid'], 2], [['--help', '--run-tests'], 2]]) {
    const result = spawnSync(process.execPath, ['scripts/run-checks.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, code);
    assert.ok(!result.stderr.includes('"event":"preflight"'));
  }
});

test('default Node discovery executes controlled tests without discovering repository tooling', async t => {
  const parent = fs.realpathSync(os.tmpdir()), dir = fs.mkdtempSync(path.join(parent, 'rea-discovery-test-'));
  const scripts = ['run-checks.mjs', 'fixture-environment.mjs', 'suite-process.mjs'];
  fs.mkdirSync(path.join(dir, 'scripts')); fs.mkdirSync(path.join(dir, 'tests'));
  const file = path.join(dir, 'tests/controlled.test.mjs');
  t.after(() => {
    fs.unlinkSync(file);
    for (const name of scripts) fs.unlinkSync(path.join(dir, 'scripts', name));
    fs.rmdirSync(path.join(dir, 'scripts')); fs.rmdirSync(path.join(dir, 'tests')); fs.rmdirSync(dir);
  });
  for (const name of scripts) fs.copyFileSync(fileURLToPath(new URL('../scripts/' + name, import.meta.url)), path.join(dir, 'scripts', name));
  fs.writeFileSync(file, "import test from 'node:test'; test('controlled discovery case', () => {});");
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  let output = '';
  const result = await runTests(preflight(controlled()), { cwd: dir, env, output: chunk => { output += chunk; } });
  assert.equal(result.exit, 0); assert.equal(result.counts.tests, 1); assert.equal(result.counts.pass, 1);
  assert.ok(!output.includes('Subtest: scripts/')); assert.ok(!output.includes('"event":"preflight"'));
});
