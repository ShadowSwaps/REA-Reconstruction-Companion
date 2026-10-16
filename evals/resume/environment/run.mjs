// MIT. Bounded trusted-fixture demonstration; no discovery or compatibility engine.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const ensure = value => { if (!value) throw new Error('Invalid evidence'); };
const names = ['target.mjs', 'candidate.mjs', 'format.mjs', 'corpus.json'];
function read(file) {
  const stat = fs.lstatSync(file);
  ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 65536);
  const bytes = fs.readFileSync(file); ensure(bytes.length <= 65536); return bytes;
}
const put = (dir, name, value) => fs.writeFileSync(path.join(dir, name), json(value), { flag: 'wx' });
function fixtures() {
  const identity = JSON.parse(read(path.join(here, 'fixtures/identity.json')));
  return Object.fromEntries(names.map(name => {
    const bytes = read(path.join(here, 'fixtures', name)); ensure(hash(bytes) === identity.files[name]); return [name, bytes];
  }));
}
// Fixed source, executable and flags only. Probe text from evidence is never run.
const runtimeProgram = 'process.stdout.write(JSON.stringify({node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch}))';
const childEnv = () => Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
const child = (program, input) => spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
  input, encoding: 'utf8', shell: false, windowsHide: true, timeout: 5000, maxBuffer: 65536, env: childEnv(),
});
// Exported decoder allows failed/malformed observations to be tested without
// claiming to have installed another runtime or disabled the actual local one.
export function decodeRuntime(result) {
  try {
    ensure(!result.error && result.status === 0 && !result.signal && result.stderr === '' && result.stdout.length <= 1024);
    const value = JSON.parse(result.stdout);
    ensure(equal(Object.keys(value).sort(), ['arch', 'node', 'platform', 'v8']));
    ensure(Object.values(value).every(v => typeof v === 'string'));
    ensure(/^v\d+\.\d+\.\d+$/.test(value.node) && /^\d+(\.\d+){2,4}(-node\.\d+)?$/.test(value.v8));
    ensure(['aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32', 'android'].includes(value.platform));
    ensure(['arm', 'arm64', 'ia32', 'loong64', 'mips', 'mipsel', 'ppc', 'ppc64', 'riscv64', 's390', 's390x', 'x64'].includes(value.arch));
    return { kind: 'measured-local', status: 'known', value };
  } catch { return { kind: 'measured-local', status: 'unknown', affected: ['score', 'format', 'integration'], reason: 'runtime-probe-unavailable-or-malformed' }; }
}
export const observeRuntime = () => decodeRuntime(child(runtimeProgram));
const validRuntime = row => row?.kind === 'measured-local' && row.status === 'known'
  && equal(decodeRuntime({ status: 0, stderr: '', stdout: JSON.stringify(row.value) }), row);
const knownHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

// This explicit dependency list is only for these three checks. Integration
// includes both components and their behavior-affecting setting transitively.
const dependencies = {
  score: ['target', 'candidate', 'corpus', 'runtime', 'cap', 'harness'],
  format: ['formatter', 'formatCorpus', 'runtime', 'harness'],
  integration: ['target', 'candidate', 'corpus', 'runtime', 'cap', 'harness', 'formatter', 'formatCorpus'],
};
export function assess(prior, current) {
  return Object.fromEntries(Object.entries(dependencies).map(([id, keys]) => {
    const old = prior?.[id]?.bindings;
    const complete = old && equal(Object.keys(old).sort(), [...keys].sort()) && keys.every(k => knownHash(old[k]) && knownHash(current?.[k]));
    return [id, !complete ? 'unknown' : keys.some(k => old[k] !== current[k]) ? 'stale' : 'current'];
  }));
}
function bindings(files, runtime, cap) {
  return { target: hash(files['target.mjs']), candidate: hash(files['candidate.mjs']), formatter: hash(files['format.mjs']),
    corpus: hash(files['corpus.json']), formatCorpus: hash(json([null, 0, 100, 200])),
    runtime: validRuntime(runtime) ? hash(json(runtime.value)) : null,
    cap: [100, 200].includes(cap) ? hash(json({ cap })) : null, harness: hash(read(fileURLToPath(import.meta.url))) };
}
function execute(files, cap, executed) {
  // Import only hash-checked, repository-owned bytes as data URLs. No path or
  // command from a checkpoint is used. Cap is validated and supplied via stdin.
  ensure([100, 200].includes(cap));
  const moduleURL = name => 'data:text/javascript;base64,' + files[name].toString('base64');
  const program = `import fs from 'node:fs';
    const {cap,corpus,executed} = JSON.parse(fs.readFileSync(0,'utf8'));
    const target = await import(${JSON.stringify(moduleURL('target.mjs'))});
    const candidate = await import(${JSON.stringify(moduleURL('candidate.mjs'))});
    const {format} = await import(${JSON.stringify(moduleURL('format.mjs'))});
    const score = executed.some(id => id === 'score' || id === 'integration') ? corpus.map(v => candidate.score(v,cap)) : [];
    process.stdout.write(JSON.stringify({target:corpus.map(v=>target.score(v,cap)),score,
      format:executed.includes('format') ? [null,0,100,200].map(format) : [],
      integration:executed.includes('integration') ? score.map(format) : []}));`;
  const result = child(program, JSON.stringify({ cap, corpus: JSON.parse(files['corpus.json']), executed }));
  ensure(!result.error && result.status === 0 && !result.signal && result.stderr === '');
  return JSON.parse(result.stdout);
}
function reports(files, runtime, cap, executed, reconstruct = false) {
  const corpus = JSON.parse(files['corpus.json']);
  // Independently authored expectations; never use target output as an oracle.
  const scores = corpus.map(v => Number.isInteger(v) && v >= 0 && v <= 1000 ? (v <= cap ? v : cap) : null);
  const expected = { score: scores, format: ['invalid', 'score:0', 'score:100', 'score:200'],
    integration: scores.map(v => v === null ? 'invalid' : 'score:' + v) };
  const observed = reconstruct ? { ...expected, target: scores } : execute(files, cap, executed);
  const selected = bindings(files, runtime, cap);
  const compare = (actual, wanted) => ({ actual, total: wanted.length,
    failed: wanted.reduce((n, v, i) => n + (equal(v, actual[i]) ? 0 : 1), 0) });
  return { target: { bindings: Object.fromEntries(['target', 'corpus', 'runtime', 'cap', 'harness'].map(k => [k, selected[k]])),
    comparisons: compare(observed.target, scores), scope: 'listed-synthetic-corpus-only', expectationSource: 'independent-domain-and-cap-oracle' },
  checks: Object.fromEntries(executed.map(id => [id, { bindings: Object.fromEntries(dependencies[id].map(k => [k, selected[k]])),
    comparisons: compare(observed[id], expected[id]), scope: 'listed-synthetic-corpus-only' }])) };
}
const originalNames = [...names, 'environment.json', 'baseline.json', 'prepared.json'];
export function run(phase, directory, scenario = 'drift') {
  ensure(['prepare', 'continue'].includes(phase) && ['same', 'drift'].includes(scenario) && directory);
  const files = fixtures(), dir = path.resolve(directory);
  if (phase === 'prepare') {
    fs.mkdirSync(dir);
    for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), bytes, { flag: 'wx' });
    const runtime = observeRuntime(), baseline = reports(files, runtime, 100, Object.keys(dependencies));
    ensure(baseline.target.comparisons.failed === 0 && Object.values(baseline.checks).every(r => r.comparisons.failed === 0));
    put(dir, 'environment.json', { runtime, setting: { kind: 'controlled-test-setting', cap: 100 },
      declarations: { kind: 'user-declaration', status: 'none-supplied' }, unsupported: { kind: 'unsupported-probe', name: 'cross-host-compatibility', status: 'unknown' } });
    put(dir, 'baseline.json', baseline);
    put(dir, 'prepared.json', { files: Object.fromEntries(originalNames.filter(n => n !== 'prepared.json').map(n => [n, hash(read(path.join(dir, n)))])) });
    return { status: 'prepared', runtime: runtime.status };
  }
  ensure(fs.lstatSync(dir).isDirectory() && !fs.lstatSync(dir).isSymbolicLink());
  ensure(equal(fs.readdirSync(dir).sort(), [...originalNames].sort()));
  const before = Object.fromEntries(originalNames.map(n => [n, read(path.join(dir, n))]));
  for (const n of names) ensure(before[n].equals(files[n]));
  const receipt = JSON.parse(before['prepared.json']);
  ensure(before['prepared.json'].equals(json(receipt)));
  ensure(equal(receipt, { files: Object.fromEntries(originalNames.filter(n => n !== 'prepared.json').map(n => [n, hash(before[n])])) }));
  const environment = JSON.parse(before['environment.json']), baseline = JSON.parse(before['baseline.json']);
  // A receipt can detect damage but cannot authorize a new contract or command.
  // Reconstruct the fixed baseline and validate the narrow historical runtime.
  ensure(validRuntime(environment.runtime) || equal(environment.runtime, decodeRuntime({ status: 1 })));
  ensure(equal(environment, { runtime: environment.runtime, setting: { kind: 'controlled-test-setting', cap: 100 },
    declarations: { kind: 'user-declaration', status: 'none-supplied' }, unsupported: { kind: 'unsupported-probe', name: 'cross-host-compatibility', status: 'unknown' } }));
  // Reconstruct expected historical data without executing under old conditions.
  const historical = reports(files, environment.runtime, 100, Object.keys(dependencies), true);
  ensure(equal(baseline, historical));
  const runtime = observeRuntime(), cap = scenario === 'drift' ? 200 : 100;
  const selected = bindings(files, runtime, cap), triage = assess(baseline.checks, selected);
  const executed = Object.keys(dependencies).filter(id => triage[id] !== 'current');
  const fresh = reports(files, runtime, cap, executed);
  const failed = fresh.target.comparisons.failed + Object.values(fresh.checks).reduce((n, r) => n + r.comparisons.failed, 0);
  put(dir, 'current-environment.json', { runtime, setting: { kind: 'controlled-test-setting', cap }, scenario });
  put(dir, 'triage.json', { selected, checks: triage, implementation: 'retained-identical-bytes', overallParity: 'unverified' });
  put(dir, 'fresh-report.json', fresh);
  for (const [n, bytes] of Object.entries(before)) ensure(read(path.join(dir, n)).equals(bytes));
  const result = { status: failed ? 'comparison-failed' : !validRuntime(runtime) ? 'environment-unknown' : 'environment-demo-passed', scenario, executed,
    reused: Object.keys(dependencies).filter(id => triage[id] === 'current').map(id => ({ id, source: 'baseline.json', sha256: hash(json(baseline.checks[id])) })),
    failed, requirements: Object.fromEntries(Object.keys(dependencies).map(id => [id, {
      implementation: 'retained-identical-bytes', verification: !validRuntime(runtime) ? 'unknown-environment'
        : (fresh.checks[id] ?? baseline.checks[id]).comparisons.failed ? 'failed' : 'verified-listed-corpus-only',
    }])),
    preservation: Object.fromEntries(Object.entries(before).map(([n, bytes]) => [n, hash(bytes)])),
    overallParity: 'unverified', crossVersionDrift: 'not-tested', crossHostCompatibility: 'unverified', humanReview: 'pending' };
  put(dir, 'result.json', result); return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.length >= 4 && process.argv.length <= 5);
    const result = run(...process.argv.slice(2)); process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'comparison-failed' ? 1 : 0;
  } catch { process.stderr.write('Environment demo error: check invocation, trusted fixtures and fresh workspace.\n'); process.exitCode = 2; }
}
