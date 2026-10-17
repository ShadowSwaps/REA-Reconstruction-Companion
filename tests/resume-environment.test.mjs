import { fixtureLink } from '../scripts/test-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assess, decodeRuntime, observeRuntime } from '../evals/resume/environment/run.mjs';
const root = fileURLToPath(new URL('../evals/resume/environment/', import.meta.url));
const runner = path.join(root, 'run.mjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).map(n => [n, fs.readFileSync(path.join(dir, n))]));
function mutateFixture(copy, name, transform) {
  const file = path.join(copy, 'fixtures', name), source = fs.readFileSync(file, 'utf8'), changed = transform(source);
  assert.notEqual(changed, source); fs.writeFileSync(file, changed);
  const identity = read(path.join(copy, 'fixtures'), 'identity.json'); identity.files[name] = hash(fs.readFileSync(file));
  fs.writeFileSync(path.join(copy, 'fixtures/identity.json'), JSON.stringify(identity));
}
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir()), dir = fs.mkdtempSync(path.join(parent, 'rea-environment-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent); assert.ok(path.basename(dir).startsWith('rea-environment-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false); fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
const cli = (args, script = runner) => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', shell: false, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024,
});
function prepare(t, script = runner) {
  const dir = path.join(temporary(t), 'case with spaces ø');
  const result = cli(['prepare', dir], script); assert.equal(result.status, 0, result.stderr); return dir;
}
test('fixed local probe measures only the runtime allowlist', () => {
  assert.deepEqual(observeRuntime(), { kind: 'measured-local', status: 'known', value: {
    node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
  } });
});
for (const scenario of ['same', 'drift']) {
  test(`separate process ${scenario}: actual configuration execution, selective reuse and unchanged history`, t => {
    const dir = prepare(t), before = snapshot(dir), fixturesBefore = snapshot(path.join(root, 'fixtures'));
    const result = cli(['continue', dir, scenario]); assert.equal(result.status, 0, result.stderr);
    const value = JSON.parse(result.stdout), triage = read(dir, 'triage.json'), fresh = read(dir, 'fresh-report.json');
    assert.equal(value.status, 'environment-demo-passed'); assert.equal(value.failed, 0);
    assert.deepEqual(triage.checks, scenario === 'same' ? { score: 'current', format: 'current', integration: 'current' }
      : { score: 'stale', format: 'current', integration: 'stale' });
    assert.deepEqual(value.executed, scenario === 'same' ? [] : ['score', 'integration']);
    assert.equal(Object.hasOwn(fresh.checks, 'format'), false);
    const baseline = read(dir, 'baseline.json');
    for (const reused of value.reused) assert.deepEqual(reused, { id: reused.id, source: 'baseline.json', sha256: hash(JSON.stringify(baseline.checks[reused.id], null, 2) + '\n') });
    assert.deepEqual(fresh.target.comparisons.actual, scenario === 'same' ? [0,99,100,100,100,100,100,100,...Array(8).fill(null)] : [0,99,100,101,199,200,200,200,...Array(8).fill(null)]);
    if (scenario === 'drift') {
      assert.deepEqual(fresh.checks.score.comparisons.actual, [0,99,100,101,199,200,200,200,...Array(8).fill(null)]);
      assert.deepEqual(fresh.checks.integration.comparisons.actual, ['score:0','score:99','score:100','score:101','score:199','score:200','score:200','score:200',...Array(8).fill('invalid')]);
      assert.notDeepEqual(baseline.checks.integration.comparisons.actual, fresh.checks.integration.comparisons.actual, 'Old integration results cannot validate the drift');
    }
    for (const [n, bytes] of Object.entries(before)) {
      assert.deepEqual(fs.readFileSync(path.join(dir, n)), bytes); assert.equal(value.preservation[n], hash(bytes));
    }
    assert.deepEqual(snapshot(path.join(root, 'fixtures')), fixturesBefore);
    assert.equal(triage.implementation, 'retained-identical-bytes');
    assert.equal(fresh.target.bindings.target, triage.selected.target);
    assert.equal(triage.selected.target, baseline.target.bindings.target);
    assert.equal(triage.selected.candidate, baseline.checks.score.bindings.candidate);
    for (const report of Object.values(fresh.checks)) for (const [k,v] of Object.entries(report.bindings)) assert.equal(v, triage.selected[k]);
    assert.equal(value.overallParity, 'unverified'); assert.equal(value.crossVersionDrift, 'not-tested'); assert.equal(value.crossHostCompatibility, 'unverified');
    const after = snapshot(dir); assert.equal(cli(['continue', dir]).status, 2); assert.deepEqual(snapshot(dir), after);
  });
}
test('unknown or malformed probe evidence never becomes a reusable runtime identity', t => {
  const dir = prepare(t), prior = read(dir, 'baseline.json').checks, current = { ...prior.integration.bindings };
  for (const evidence of [null, {}, { status: 1 }, { status: 0, stderr: '', stdout: 'not JSON' },
    { status: 0, stderr: 'private diagnostic', stdout: '{}' }, { status: 0, stderr: '', stdout: ' '.repeat(1025) },
    { status: 0, stderr: '', stdout: JSON.stringify({node:[process.version],v8:process.versions.v8,platform:process.platform,arch:process.arch}) },
    { status: 0, stderr: '', stdout: JSON.stringify({node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,command:'must not run'}) },
  ]) {
    const result = decodeRuntime(evidence);
    assert.deepEqual(result, { kind: 'measured-local', status: 'unknown', affected: ['score','format','integration'], reason: 'runtime-probe-unavailable-or-malformed' });
    assert.deepEqual(assess(prior, { ...current, runtime: null }), { score: 'unknown', format: 'unknown', integration: 'unknown' });
    assert.equal(JSON.stringify(result).includes('private diagnostic'), false);
  }
  for (const invalid of [null, [], 'unknown', {}, true]) {
    assert.deepEqual(assess(prior, { ...current, cap: invalid }), { score: 'unknown', format: 'current', integration: 'unknown' });
  }
});
test('irrelevant changes preserve reports; relevant runtime drift only marks applicability, not regression', t => {
  const dir = prepare(t), prior = read(dir, 'baseline.json').checks, current = prior.integration.bindings;
  assert.deepEqual(assess(prior, { ...current, unrelatedDisplaySetting: 'changed' }), { score:'current', format:'current', integration:'current' });
  assert.deepEqual(assess(prior, { ...current, runtime: 'a'.repeat(64) }), { score:'stale', format:'stale', integration:'stale' });
  const altered = structuredClone(prior); delete altered.integration.bindings.cap;
  assert.equal(assess(altered, current).integration, 'unknown');
  const changed = assess(prior, { ...current, cap: 'b'.repeat(64) });
  assert.equal(changed.integration, 'stale'); assert.notEqual(changed.integration, 'current');
  assert.deepEqual(assess(prior, null),{score:'unknown',format:'unknown',integration:'unknown'});
});
for (const name of ['target.mjs', 'candidate.mjs', 'baseline.json', 'environment.json', 'prepared.json']) {
  test(`damaged ${name} rejected without executing or overwriting evidence`, t => {
    const dir = prepare(t); fs.appendFileSync(path.join(dir, name), '\n ');
    // JSON whitespace is still valid; the receipt protects the exact old bytes.
    const before = snapshot(dir), result = cli(['continue', dir]); assert.equal(result.status, 2);
    assert.deepEqual(snapshot(dir), before); assert.equal(result.stdout, ''); assert.equal(result.stderr.includes(dir), false);
  });
}
test('rebaselined commands or claims cannot authorize execution', t => {
  const dir = prepare(t), marker = path.join(path.dirname(dir), 'must-not-run');
  fs.writeFileSync(path.join(dir,'candidate.mjs'), `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'ran');`);
  const receipt = read(dir,'prepared.json'); receipt.files['candidate.mjs'] = hash(fs.readFileSync(path.join(dir,'candidate.mjs')));
  fs.writeFileSync(path.join(dir,'prepared.json'), JSON.stringify(receipt));
  assert.equal(cli(['continue',dir]).status,2); assert.equal(fs.existsSync(marker),false);
  assert.equal(fs.existsSync(path.join(dir,'triage.json')),false);
  const other = prepare(t), environment = read(other,'environment.json');
  environment.command = [process.execPath,'--eval',`require('fs').writeFileSync(${JSON.stringify(marker)},'ran')`];
  fs.writeFileSync(path.join(other,'environment.json'),JSON.stringify(environment));
  const rebased = read(other,'prepared.json'); rebased.files['environment.json'] = hash(fs.readFileSync(path.join(other,'environment.json')));
  fs.writeFileSync(path.join(other,'prepared.json'),JSON.stringify(rebased,null,2)+'\n');
  const before = snapshot(other); assert.equal(cli(['continue',other]).status,2);
  assert.equal(fs.existsSync(marker),false); assert.deepEqual(snapshot(other),before);
});
test('missing, oversized, linked, extra evidence and invalid invocation are rejected', t => {
  for (const mode of ['missing','oversized','linked','extra']) {
    const dir = prepare(t), file = path.join(dir,'baseline.json');
    if (mode === 'missing') fs.unlinkSync(file);
    if (mode === 'oversized') fs.writeFileSync(file, ' '.repeat(65537));
    if (mode === 'extra') fs.writeFileSync(path.join(dir,'unexpected.json'),'{}');
    if (mode === 'linked') {
      const outside = path.join(path.dirname(dir),'outside'); fs.mkdirSync(outside); fs.unlinkSync(file);
      fixtureLink(outside,file,process.platform === 'win32' ? 'junction' : 'dir');
    }
    assert.equal(cli(['continue',dir]).status,2); assert.equal(fs.existsSync(path.join(dir,'triage.json')),false);
    if (mode === 'linked') fs.unlinkSync(file);
  }
  const dir = prepare(t);
  for (const args of [[],['bless',dir],['continue',dir,'untrusted-command'],['continue',dir,'same','extra'],['prepare',dir]]) assert.equal(cli(args).status,2);
});
test('independent oracle retains wrong candidate failures instead of relabeling old success', t => {
  const copy = path.join(temporary(t),'runner'); fs.cpSync(root,copy,{recursive:true});
  const file = path.join(copy,'fixtures/candidate.mjs'); fs.writeFileSync(file, fs.readFileSync(file,'utf8').replace('value > cap ? cap : value','value > 100 ? 100 : value'));
  // Reviewer mutation of trusted package, not a checkpoint author blessing itself.
  const identity = read(path.join(copy,'fixtures'),'identity.json'); identity.files['candidate.mjs'] = hash(fs.readFileSync(file));
  fs.writeFileSync(path.join(copy,'fixtures/identity.json'),JSON.stringify(identity));
  const script = path.join(copy,'run.mjs'), dir = prepare(t,script), result = cli(['continue',dir],script);
  assert.equal(result.status,1,result.stderr); assert.equal(JSON.parse(result.stdout).failed,10);
  assert.equal(read(dir,'fresh-report.json').checks.integration.comparisons.failed,5);
  assert.equal(read(dir,'fresh-report.json').target.comparisons.failed,0);
  assert.equal(read(dir,'result.json').requirements.integration.verification,'failed');
});
test('simulated unavailable local probe preserves unknown through a complete continuation', t => {
  const copy = path.join(temporary(t),'runner'); fs.cpSync(root,copy,{recursive:true});
  const script = path.join(copy,'run.mjs'), source = fs.readFileSync(script,'utf8');
  const simulated = source.replace('decodeRuntime(child(runtimeProgram))','decodeRuntime({ status: 1 })');
  assert.notEqual(simulated,source); fs.writeFileSync(script,simulated);
  const dir = prepare(t,script), result = cli(['continue',dir],script); assert.equal(result.status,0,result.stderr);
  const value = JSON.parse(result.stdout);
  assert.deepEqual(value.reused,[]); assert.deepEqual(value.executed,['score','format','integration']);
  assert.deepEqual(read(dir,'triage.json').checks,{score:'unknown',format:'unknown',integration:'unknown'});
  for (const row of Object.values(value.requirements)) assert.equal(row.verification,'unknown-environment');
  for (const row of Object.values(read(dir,'fresh-report.json').checks)) assert.equal(row.bindings.runtime,null);
});
test('observed mismatches remain failed even with an unknown simulated runtime', t => {
  const copy = path.join(temporary(t), 'runner'); fs.cpSync(root, copy, { recursive: true });
  mutateFixture(copy, 'candidate.mjs', source => source.replace('value > cap ? cap : value', 'value > 100 ? 100 : value'));
  const script = path.join(copy, 'run.mjs');
  fs.writeFileSync(script, fs.readFileSync(script, 'utf8').replace('decodeRuntime(child(runtimeProgram))', 'decodeRuntime({ status: 1 })'));
  const dir = prepare(t, script), result = cli(['continue', dir], script), value = JSON.parse(result.stdout);
  assert.equal(result.status, 1); assert.equal(value.failed, 10);
  assert.equal(value.requirements.score.verification, 'failed');
  assert.equal(value.requirements.integration.verification, 'failed');
  assert.equal(value.requirements.format.verification, 'unknown-environment');
});
for (const output of ['undefined', 'NaN', 'Infinity']) {
  test(`invalid target ${output} output cannot become an expected null through JSON serialization`, t => {
    const copy = path.join(temporary(t), 'runner'); fs.cpSync(root, copy, { recursive: true });
    mutateFixture(copy, 'target.mjs', source => source.replace(': null;', `: (cap === 100 ? null : ${output});`));
    const script = path.join(copy, 'run.mjs'), dir = prepare(t, script), result = cli(['continue', dir], script);
    assert.equal(result.status, 1, result.stderr);
    const value = JSON.parse(result.stdout), fresh = read(dir, 'fresh-report.json');
    assert.equal(fresh.target.comparisons.failed, 8); assert.equal(value.failed, 8);
    assert.equal(value.requirements.score.verification, 'blocked-target-mismatch');
    assert.equal(value.requirements.integration.verification, 'blocked-target-mismatch');
    assert.equal(value.requirements.format.verification, 'verified-listed-corpus-only');
  });
}
for (const output of ['undefined', 'NaN', '1n', "({secret:'must-not-appear'})"]) {
  test(`invalid candidate ${output.split(':')[0]} output remains a comparison failure`, t => {
    const copy = path.join(temporary(t), 'runner'); fs.cpSync(root, copy, { recursive: true });
    mutateFixture(copy, 'candidate.mjs', source => source.replace('return null;', `return cap === 100 ? null : ${output};`));
    const script = path.join(copy, 'run.mjs'), dir = prepare(t, script), result = cli(['continue', dir], script);
    assert.equal(result.status, 1, result.stderr);
    const value = JSON.parse(result.stdout), fresh = read(dir, 'fresh-report.json');
    assert.equal(fresh.checks.score.comparisons.failed, 8); assert.equal(fresh.checks.integration.comparisons.failed, 8);
    assert.equal(value.failed, 16); assert.equal(value.requirements.score.verification, 'failed');
    assert.equal(JSON.stringify(fresh).includes('must-not-appear'), false);
  });
}
test('target reassessment failures block dependent verification while retaining independent format reuse', t => {
  const copy = path.join(temporary(t), 'runner'); fs.cpSync(root, copy, { recursive: true });
  mutateFixture(copy, 'target.mjs', source => source.replace('Math.min(value, cap)', 'Math.min(value, 100)'));
  const script = path.join(copy, 'run.mjs'), dir = prepare(t, script), result = cli(['continue', dir], script);
  assert.equal(result.status, 1, result.stderr);
  const value = JSON.parse(result.stdout), fresh = read(dir, 'fresh-report.json');
  assert.equal(fresh.target.comparisons.failed, 5); assert.equal(fresh.checks.score.comparisons.failed, 0);
  assert.equal(value.requirements.score.verification, 'blocked-target-mismatch');
  assert.equal(value.requirements.integration.verification, 'blocked-target-mismatch');
  assert.equal(value.requirements.format.verification, 'verified-listed-corpus-only');
  assert.deepEqual(value.reused.map(row => row.id), ['format']);
});
test('fresh measured execution resolves unknown historical runtime without reusing its reports', t => {
  const copy = path.join(temporary(t), 'runner'); fs.cpSync(root, copy, { recursive: true });
  const script = path.join(copy, 'run.mjs'), source = fs.readFileSync(script, 'utf8');
  const simulated = source.replace('decodeRuntime(child(runtimeProgram))', "decodeRuntime(process.argv[2] === 'prepare' ? { status: 1 } : child(runtimeProgram))");
  assert.notEqual(simulated, source); fs.writeFileSync(script, simulated);
  const dir = prepare(t, script), before = snapshot(dir), result = cli(['continue', dir, 'same'], script);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout); assert.deepEqual(value.reused, []);
  assert.deepEqual(value.executed, ['score', 'format', 'integration']);
  for (const row of Object.values(value.requirements)) assert.equal(row.verification, 'verified-listed-corpus-only');
  assert.equal(read(dir, 'environment.json').runtime.status, 'unknown');
  assert.equal(read(dir, 'current-environment.json').runtime.status, 'known');
  for (const [name, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(dir, name)), bytes);
});
test('committed worked result is bound to the current fixtures, harness and recorded runtime', () => {
  const worked = read(root, 'worked-result.json'), report = worked.driftReport;
  const digest = value => hash(JSON.stringify(value, null, 2) + '\n');
  const runtime = decodeRuntime({ status: 0, stderr: '', stdout: JSON.stringify(worked.runtime.value) });
  assert.deepEqual(runtime, worked.runtime); assert.equal(runtime.status, 'known');
  const current = { target: hash(fs.readFileSync(path.join(root, 'fixtures/target.mjs'))),
    candidate: hash(fs.readFileSync(path.join(root, 'fixtures/candidate.mjs'))),
    formatter: hash(fs.readFileSync(path.join(root, 'fixtures/format.mjs'))),
    corpus: hash(fs.readFileSync(path.join(root, 'fixtures/corpus.json'))),
    formatCorpus: digest([null,0,100,200]), runtime: digest(runtime.value), cap: digest({cap:200}),
    harness: hash(fs.readFileSync(runner)) };
  for (const row of [report.target, ...Object.values(report.checks)]) {
    for (const [key, value] of Object.entries(row.bindings)) assert.equal(value, current[key], key);
    assert.equal(row.comparisons.failed, 0);
  }
  assert.deepEqual(worked.same.executed, []); assert.deepEqual(worked.drift.executed, ['score','integration']);
  assert.deepEqual(worked.drift.reused.map(row => row.id), ['format']);
  assert.deepEqual(report.checks.score.comparisons.actual, [0,99,100,101,199,200,200,200,...Array(8).fill(null)]);
});
