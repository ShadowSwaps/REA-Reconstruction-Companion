// Branch-only diagnostic. No installed command imports this driver.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BASELINE = '48004fbcfd4566d5f89e7cb2b6d9f5ce04302221';
export const TREE = '6ed66a41bd868ce7ec1e3be8b2353edb103dbb28';
export const REF = 'refs/heads/diagnostics/crypto-timeout-macos20-20261028';
const TARGET = 'oracle catches deliberate defect: empty plaintext rejected';
const LIMIT = 16 * 1024 * 1024;
const OVERALL_MS = 37 * 60 * 1000;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const emit = record => console.log(JSON.stringify({ schema: 1, ...record }));
export const PLAN = Object.freeze([
  ...[1, 2, 3].map(n => ({ name: `isolated-${n}`, args: ['--test', '--test-reporter=tap', `--test-name-pattern=^${TARGET}$`, 'tests/evals.test.mjs'], pass: 1 })),
  { name: 'evaluator', args: ['--test', '--test-reporter=tap', 'tests/evals.test.mjs'], pass: 43 },
  { name: 'full-default', args: ['--test', '--test-reporter=tap'], pass: 911 },
  { name: 'full-concurrency-1', args: ['--test', '--test-reporter=tap', '--test-concurrency=1'], pass: 911 },
  { name: 'full-concurrency-2', args: ['--test', '--test-reporter=tap', '--test-concurrency=2'], pass: 911 },
].map(p => Object.freeze({ ...p, args: Object.freeze(p.args) })));

export function validateContext(env, event, runtime) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== 'ShadowSwaps/REA-Reconstruction-Companion' ||
    env.GITHUB_REPOSITORY_ID !== '1420261569' || env.GITHUB_EVENT_NAME !== 'push' || env.GITHUB_REF !== REF ||
    env.GITHUB_RUN_ATTEMPT !== '1' || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || event.ref !== REF || event.after !== env.GITHUB_SHA ||
    event.before !== '0'.repeat(40) || event.created !== true || event.deleted !== false || event.forced !== false ||
    event.repository?.id !== 1420261569 || event.repository?.full_name !== env.GITHUB_REPOSITORY ||
    event.repository?.visibility !== 'public' || event.repository?.private !== false || event.repository?.archived !== false)
    throw new Error('Rejected repository/event/one-shot identity');
  if (env.RUNNER_ENVIRONMENT !== 'github-hosted' || env.RUNNER_OS !== 'macOS' || env.RUNNER_ARCH !== 'ARM64' ||
    env.CRYPTO_RUNNER_LABEL !== 'macos-26' || runtime.platform !== 'darwin' || runtime.arch !== 'arm64' ||
    runtime.node !== 'v20.20.2' || !/^26\./.test(runtime.productVersion) ||
    !/^macos-?26(?:-arm64)?$/.test(env.ImageOS ?? '') || !/^[\d.]{1,40}$/.test(env.ImageVersion ?? ''))
    throw new Error('Rejected runner/platform/runtime identity');
}

export function summarizeTap(tap, plan) {
  const counts = {};
  for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const matches = [...tap.matchAll(new RegExp(`^# ${key} (\\d+)\\r?$`, 'gm'))];
    if (matches.length !== 1) return { accepted: false, reason: 'missing-or-duplicate-counts' };
    counts[key] = Number(matches[0][1]);
  }
  const escaped = TARGET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const target = [...tap.matchAll(new RegExp(`^(not )?ok (\\d+) - ${escaped}\\r?\\n\\s+---\\r?\\n\\s+duration_ms: ([\\d.]+)`, 'gm'))];
  // Node20 prints nonselected tests as skips; Node24 may omit them entirely.
  const selection = plan.pass === 1 && ((counts.tests === 43 && counts.skipped === 42) || (counts.tests === 1 && counts.skipped === 0));
  const accepted = counts.pass === plan.pass && counts.fail === 0 && counts.cancelled === 0 && counts.todo === 0 &&
    (selection || (plan.pass !== 1 && counts.tests === plan.pass && counts.skipped === 0)) &&
    target.length === 1 && !target[0][1] && Number.isFinite(Number(target[0][3]));
  return { accepted, counts, target: target.length === 1 ? { number: Number(target[0][2]), passed: !target[0][1], durationMs: Number(target[0][3]) } : null };
}

// Each mode owns a process group on Unix. Outer failure stops the group rather
// than leaving a test-runner child behind; evaluator containment is unchanged.
export function runProcess(command, args, { cwd, timeout, name, output = emit } = {}) {
  return new Promise(resolve => {
    const startedUtc = new Date().toISOString(), started = performance.now();
    const buffers = { stdout: [], stderr: [] }, bytes = { stdout: 0, stderr: 0 };
    let child, timer, errorCode = null, reason = null, captured = 0;
    const stop = why => {
      reason ??= why;
      if (!child?.pid) return;
      try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); }
      catch (e) { if (e.code !== 'ESRCH') errorCode ??= 'KILL_FAILED'; }
    };
    try { child = spawn(command, args, { cwd, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }); }
    catch { resolve({ exitCode: null, signal: null, errorCode: 'SPAWN_FAILED', reason: 'spawn-failed', stdout: '', stderr: '', elapsedMs: 0 }); return; }
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => {
      bytes[stream] += chunk.length;
      const kept = chunk.subarray(0, Math.max(0, LIMIT - captured));
      buffers[stream].push(kept); captured += kept.length;
      for (let offset = 0; offset < kept.length; offset += 12288)
        output({ event: 'raw', name, stream, encoding: 'base64', data: kept.subarray(offset, offset + 12288).toString('base64') });
      if (kept.length !== chunk.length) stop('outer-output-limit');
    });
    child.on('error', () => { errorCode = 'SPAWN_FAILED'; stop('spawn-failed'); });
    timer = setTimeout(() => stop('outer-timeout'), timeout);
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(buffers.stdout), stderr = Buffer.concat(buffers.stderr);
      resolve({ startedUtc, completedUtc: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started),
        exitCode, signal, errorCode, reason, observedBytes: bytes, capturedBytes: { stdout: stdout.length, stderr: stderr.length },
        truncated: bytes.stdout + bytes.stderr !== captured, stdoutSha256: hash(stdout), stderrSha256: hash(stderr),
        stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
    });
  });
}

export async function compare({ run, verify, output = emit, now = () => performance.now() }) {
  const deadline = now() + OVERALL_MS, completed = [];
  for (const plan of PLAN) {
    const remaining = deadline - now();
    if (remaining <= 0) return { completed, unrun: PLAN.slice(completed.length).map(p => p.name), reason: 'overall-timeout' };
    try { await verify(); } catch { return { completed, unrun: PLAN.slice(completed.length).map(p => p.name), reason: 'checkout-identity-failed' }; }
    output({ event: 'mode-start', name: plan.name, command: ['node', ...plan.args], outerTimeoutMs: Math.min(300000, remaining) });
    const result = await run(plan, Math.min(300000, remaining));
    const summary = summarizeTap(result.stdout, plan);
    const { stdout, stderr, ...execution } = result;
    let unchanged = true;
    try { await verify(); } catch { unchanged = false; }
    const accepted = result.exitCode === 0 && !result.signal && !result.errorCode && !result.reason && !result.truncated && summary.accepted && unchanged;
    const record = { name: plan.name, command: ['node', ...plan.args], execution, summary, unchanged, accepted };
    completed.push(record); output({ event: 'mode-end', ...record });
    if (!accepted) return { completed, unrun: PLAN.slice(completed.length).map(p => p.name), reason: 'comparison-failed' };
  }
  return { completed, unrun: [], reason: null };
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
  if (r.error || r.status !== 0) throw new Error('Git identity inspection failed');
  return r.stdout.trim();
}

async function main() {
  let result = { completed: [], unrun: PLAN.map(p => p.name), reason: 'environment-preflight-failed' };
  try {
    if (process.argv.length !== 2) throw new Error('No diagnostic arguments accepted');
    const env = process.env;
    const version = process.platform === 'darwin' ? spawnSync('/usr/bin/sw_vers', ['-productVersion'], { encoding: 'utf8', timeout: 10000 }) : null;
    const runtime = { platform: process.platform, arch: process.arch, node: process.version, productVersion: version?.status === 0 ? version.stdout.trim() : '' };
    const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    validateContext(env, event, runtime);
    const diagnostic = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
    const workspace = fs.realpathSync(env.GITHUB_WORKSPACE);
    const baseline = fs.realpathSync(path.join(workspace, 'baseline'));
    if (diagnostic !== path.join(workspace, 'diagnostic') || baseline !== path.join(workspace, 'baseline')) throw new Error('Checkout path identity failed');
    const diagnosticHead = git(diagnostic, ['rev-parse', 'HEAD']);
    const diagnosticTree = git(diagnostic, ['rev-parse', 'HEAD^{tree}']);
    const verify = () => {
      if (git(baseline, ['rev-parse', 'HEAD']) !== BASELINE || git(baseline, ['rev-parse', 'HEAD^{tree}']) !== TREE ||
        git(baseline, ['status', '--porcelain=v1', '--untracked-files=all']) || diagnosticHead !== env.GITHUB_SHA ||
        git(diagnostic, ['rev-parse', 'HEAD']) !== diagnosticHead || git(diagnostic, ['rev-parse', 'HEAD^{tree}']) !== diagnosticTree ||
        git(diagnostic, ['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('Checkout identity failed');
    };
    verify();
    emit({ event: 'identity', baselineHead: BASELINE, baselineTree: TREE, diagnosticHead, diagnosticTree,
      driverSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
      workflowSha256: hash(fs.readFileSync(path.join(diagnostic, '.github/workflows/crypto-timeout-once.yml'))),
      runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, job: env.GITHUB_JOB,
      repository: env.GITHUB_REPOSITORY, ref: env.GITHUB_REF, runnerLabel: env.CRYPTO_RUNNER_LABEL,
      imageOS: env.ImageOS, imageVersion: env.ImageVersion, ...runtime, openssl: process.versions.openssl,
      osRelease: os.release(), availableParallelism: os.availableParallelism(), logicalCpus: os.cpus().length,
      observedUtc: new Date().toISOString(), overallLimitMs: OVERALL_MS,
      limitation: 'Current hosted image; not a pin of historical image 20261013.0424.1. Job numeric ID requires API association with run/attempt and job name.' });
    const { preflight } = await import(pathToFileURL(path.join(baseline, 'scripts/fixture-environment.mjs')).href);
    const probe = preflight(); emit({ event: 'preflight', probe });
    if (!probe.complete) throw new Error('Fixture preflight failed');
    result = await compare({ verify, run: (plan, timeout) => runProcess(process.execPath, plan.args, { cwd: baseline, timeout, name: plan.name }) });
  } catch {
    // Never print event payloads, environment values, paths, credentials or errors.
    emit({ event: 'preflight-error', reason: 'environment-or-identity-or-fixture-preflight-failed' });
  }
  emit({ event: 'comparison-end', ...result });
  process.exitCode = result.reason === null ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
