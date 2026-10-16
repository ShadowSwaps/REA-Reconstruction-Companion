// MIT. Fixed maintainer fixture, not a general dependency/workflow engine.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const names = ['score-v1.mjs', 'score-v2.mjs', 'candidate-v1.mjs', 'candidate-v2.mjs',
  'format.mjs', 'pipeline.mjs', 'interface.json', 'corpus.json', 'format-corpus.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const ensure = (value, message) => { if (!value) throw new Error(message); };
const runtime = () => ({ node: process.version, platform: process.platform, arch: process.arch });
function read(file) {
  const stat = fs.lstatSync(file);
  ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 65536, 'Invalid file');
  const bytes = fs.readFileSync(file);
  ensure(bytes.length <= 65536, 'Oversized file');
  return bytes;
}
function fixtures() {
  const identity = JSON.parse(read(path.join(here, 'fixtures/identity.json')));
  return Object.fromEntries(names.map(name => {
    const bytes = read(path.join(here, 'fixtures', name));
    ensure(hash(bytes) === identity.files[name], 'Fixture drift');
    return [name, bytes];
  }));
}
const write = (dir, name, bytes) => fs.writeFileSync(path.join(dir, name), bytes, { flag: 'wx' });
const put = (dir, name, value) => write(dir, name, json(value));

// This small dependency vocabulary belongs only to this fixture. Expected edges
// are independent of a submitted record, so an omitted edge is not proof of reuse.
export const dependencies = {
  'F-score': ['targetA', 'interface'],
  'F-format': ['targetB', 'interface'],
  'V-score': ['F-score', 'candidateA', 'corpus', 'environment', 'harness'],
  'V-format': ['F-format', 'candidateB', 'formatCorpus', 'environment', 'harness'],
  'R-score': ['V-score'],
  'R-format': ['V-format'],
  'V-interface': ['F-score', 'F-format', 'candidateA', 'candidateB', 'corpus', 'formatCorpus', 'environment', 'harness'],
  'V-integration': ['V-score', 'V-format', 'V-interface', 'pipeline'],
};
function closure(id, graph, active = new Set()) {
  ensure(!active.has(id), 'Cyclic dependencies');
  if (!Object.hasOwn(dependencies, id)) return [id];
  ensure(equal(graph[id]?.dependencies, dependencies[id]), 'Missing or ambiguous dependencies');
  const next = new Set(active).add(id);
  return [...new Set(dependencies[id].flatMap(child => closure(child, graph, next)))].sort();
}
function graphFor(bindings, cap = 100) {
  const graph = Object.fromEntries(Object.entries(dependencies).map(([id, deps]) => [id, { dependencies: deps }]));
  graph['F-score'].claim = `Integers 0..1000 accepted and capped at ${cap}; other listed JSON inputs return null.`;
  graph['F-score'].source = cap === 100 ? 'score-v1.mjs:2-4' : 'score-v2.mjs:2-4';
  graph['F-format'].claim = 'Null formats as invalid; accepted integers format as score:<integer>.';
  graph['F-format'].source = 'format.mjs:2-4';
  graph['R-score'].implementation = cap === 100 ? 'candidate-v1.mjs' : 'candidate-v2.mjs';
  graph['R-format'].implementation = 'format.mjs';
  for (const id of Object.keys(graph)) graph[id].bindings = Object.fromEntries(closure(id, graph).map(key => [key, bindings[key]]));
  return graph;
}
export function assess(graph, current) {
  return Object.fromEntries(Object.keys(dependencies).map(id => {
    try {
      const leaves = closure(id, graph), prior = graph[id].bindings;
      ensure(equal(Object.keys(prior).sort(), leaves), 'Incomplete identity evidence');
      ensure(leaves.every(key => /^[a-f0-9]{64}$/.test(prior[key]) && /^[a-f0-9]{64}$/.test(current[key])), 'Unknown identity');
      return [id, { applicability: leaves.some(key => prior[key] !== current[key]) ? 'stale' : 'current', dependencies: leaves }];
    } catch { return [id, { applicability: 'unknown', dependencies: null }]; }
  }));
}
// Reviewer comparison for this fixture's decisions; behavior and preservation
// still require the separate executable checks below.
export function checkSelection(graph, current, selection) {
  const expected = assess(graph, current);
  const failures = Object.entries(expected).flatMap(([id, row]) => {
    const actual = selection?.[id];
    if (actual === row.applicability) return [];
    const reason = row.applicability === 'current' && actual === 'stale' ? 'unnecessary-invalidation'
      : actual === 'current' ? 'unsupported-reuse' : 'applicability-mismatch';
    return [{ id, reason }];
  });
  if (!selection || !equal(Object.keys(selection).sort(), Object.keys(expected).sort())) failures.push({ id: 'selection', reason: 'record-shape' });
  return { status: failures.length ? 'comparison-failed' : 'comparisons-passed', failures };
}
function bindings(files, environment, changed = false, repaired = false) {
  return {
    targetA: hash(files[changed ? 'score-v2.mjs' : 'score-v1.mjs']),
    candidateA: hash(files[repaired ? 'candidate-v2.mjs' : 'candidate-v1.mjs']),
    targetB: hash(files['format.mjs']), candidateB: hash(files['format.mjs']),
    interface: hash(files['interface.json']), pipeline: hash(files['pipeline.mjs']),
    corpus: hash(files['corpus.json']), formatCorpus: hash(files['format-corpus.json']), environment: hash(json(environment)),
    harness: hash(read(fileURLToPath(import.meta.url))),
  };
}
const oracleScore = (value, cap) => Number.isInteger(value) && value >= 0 && value <= 1000 ? Math.min(value, cap) : null;
const oracleFormat = value => value === null ? 'invalid' : 'score:' + value;
function compare(actual, expected) {
  ensure(Array.isArray(actual) && actual.length === expected.length, 'Invalid observations');
  const failures = actual.flatMap((value, index) => equal(value, expected[index]) ? [] : [{ index, expected: expected[index], actual: value }]);
  return { total: expected.length, passed: expected.length - failures.length, failed: failures.length, failures, actual };
}
function expectations(corpus, cap, formatInputs) {
  const scores = corpus.map(value => oracleScore(value, cap));
  return { score: scores, format: formatInputs.map(oracleFormat), integration: scores.map(oracleFormat),
    interface: scores.map(() => true).concat(formatInputs.map(() => true)) };
}
function execute(dir, candidate, target, mode, corpus) {
  // Only fixed trusted module names chosen by this runner are executed. Nothing
  // in graph/report data becomes a command, module path, or environment variable.
  const program = `
    import fs from 'node:fs';
    const [a,b,p,mode] = process.argv.slice(1);
    // Standalone format verification must not import A or the composition.
    const score = mode === 'format' ? null : (await import(a)).score;
    const format = mode === 'score' ? null : (await import(b)).format;
    const {corpus, inputs} = JSON.parse(fs.readFileSync(0,'utf8'));
    const valid = v => v === null || (Number.isInteger(v) && v >= 0 && v <= 200);
    const checked = v => { if (!valid(v)) throw new Error('Invalid score output'); return v; };
    let result;
    if (mode === 'score') result = corpus.map(v => checked(score(v)));
    else if (mode === 'format') result = inputs.map(format);
    else if (mode === 'interface') result = corpus.map(v => valid(score(v))).concat(inputs.map(v => typeof format(v) === 'string'));
    else {
      const {pipeline} = await import(p);
      result = corpus.map(v => pipeline(x => checked(score(x)), format, v));
    }
    if (!result.every(v => v === null || ['number','string','boolean'].includes(typeof v))) throw new Error('Invalid output');
    process.stdout.write(JSON.stringify(result));
  `;
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program,
    ...[target ?? candidate, 'format.mjs', 'pipeline.mjs'].map(name => pathToFileURL(path.join(dir, name)).href), mode], {
    input: JSON.stringify({ corpus, inputs: JSON.parse(read(path.join(dir, 'format-corpus.json'))) }), encoding: 'utf8', shell: false, windowsHide: true,
    timeout: 5000, maxBuffer: 1024 * 1024, env, cwd: dir,
  });
  ensure(!result.error && result.status === 0 && !result.signal && result.stderr === '', 'Execution error');
  return JSON.parse(result.stdout);
}
function report(id, graph, actual, expected) {
  return { id, bindings: graph[id].bindings, comparisons: compare(actual, expected), coverage: 'listed synthetic corpus only' };
}
const originals = [...names, 'environment.json', 'graph.json', 'baseline.json', 'prepared.json'];
function verify(dir, files) {
  ensure(fs.lstatSync(dir).isDirectory() && !fs.lstatSync(dir).isSymbolicLink(), 'Invalid workspace');
  for (const [name, bytes] of Object.entries(files)) ensure(read(path.join(dir, name)).equals(bytes), 'Evidence changed');
}

export function run(phase, directory) {
  ensure(['prepare', 'continue'].includes(phase) && typeof directory === 'string' && directory.length > 0, 'Invalid invocation');
  const fixed = fixtures(), dir = path.resolve(directory), corpus = JSON.parse(fixed['corpus.json']), formatCorpus = JSON.parse(fixed['format-corpus.json']);
  if (phase === 'prepare') {
    fs.mkdirSync(dir); // Fresh destination only; never overwrite evidence.
    for (const [name, bytes] of Object.entries(fixed)) write(dir, name, bytes);
    const environment = runtime(), graph = graphFor(bindings(fixed, environment));
    put(dir, 'environment.json', environment); put(dir, 'graph.json', graph);
    const expected = expectations(corpus, 100, formatCorpus), baseline = {};
    for (const mode of ['score', 'format', 'interface', 'integration']) {
      const id = 'V-' + mode;
      const actual = execute(dir, 'candidate-v1.mjs', null, mode, corpus);
      baseline[id] = report(id, graph, actual, expected[mode]);
      ensure(baseline[id].comparisons.failed === 0, 'Baseline failed');
    }
    // Also establish target behavior against independent expectations.
    ensure(compare(execute(dir, null, 'score-v1.mjs', 'score', corpus), expected.score).failed === 0, 'Target failed');
    put(dir, 'baseline.json', baseline);
    const files = Object.fromEntries(originals.filter(name => name !== 'prepared.json').map(name => [name, hash(read(path.join(dir, name)))]));
    put(dir, 'prepared.json', { schema: 1, files });
    verify(dir, fixed);
    return { status: 'prepared', comparisons: Object.values(baseline).reduce((n, r) => n + r.comparisons.total, 0) };
  }
  verify(dir, fixed);
  ensure(equal(fs.readdirSync(dir).sort(), [...originals].sort()), 'Unexpected or already used workspace');
  const before = Object.fromEntries(originals.map(name => [name, read(path.join(dir, name))]));
  const prepared = JSON.parse(before['prepared.json']);
  ensure(before['prepared.json'].equals(json(prepared)), 'Receipt bytes changed');
  ensure(equal(prepared, { schema: 1, files: Object.fromEntries(originals.filter(name => name !== 'prepared.json').map(name => [name, hash(before[name])])) }), 'Prepared evidence changed');
  const environment = JSON.parse(before['environment.json']);
  ensure(equal(Object.keys(environment).sort(), ['arch', 'node', 'platform']) && Object.values(environment).every(v => typeof v === 'string'), 'Invalid environment');
  const graph = JSON.parse(before['graph.json']), oldGraph = graphFor(bindings(fixed, environment));
  ensure(equal(graph, oldGraph), 'Dependency evidence changed');
  const baseline = JSON.parse(before['baseline.json']), oldExpected = expectations(corpus, 100, formatCorpus);
  const wanted = Object.fromEntries(['score', 'format', 'interface', 'integration'].map(mode =>
    ['V-' + mode, report('V-' + mode, oldGraph, oldExpected[mode], oldExpected[mode])]));
  ensure(equal(baseline, wanted), 'Historical report changed');
  const current = bindings(fixed, runtime(), true), triage = assess(graph, current);
  put(dir, 'triage.json', { selected: current, evidence: triage,
    requirements: { score: { implementation: 'retained-needs-adaptation', verification: triage['R-score'].applicability },
      format: { implementation: 'retained', verification: triage['R-format'].applicability } }, overallParity: 'unverified' });
  const expected = expectations(corpus, 200, formatCorpus);
  const target = compare(execute(dir, null, 'score-v2.mjs', 'score', corpus), expected.score);
  put(dir, 'reassessment.json', { targetA: current.targetA, comparisons: target, expectationSource: 'independent-domain-and-cap-oracle' });
  ensure(target.failed === 0, 'Changed target disagrees with expectations');
  const failed = {};
  for (const mode of ['score', 'integration']) failed[mode] = compare(execute(dir, 'candidate-v1.mjs', null, mode, corpus), expected[mode]);
  put(dir, 'before-report.json', { bindings: current, comparisons: failed });
  ensure(failed.score.failed > 0 && failed.integration.failed > 0, 'Expected old candidate failures absent');
  // The new candidate is already a reviewed fixed fixture; retain the old file.
  const freshGraph = graphFor(bindings(fixed, runtime(), true, true), 200), fresh = {}, executed = [];
  for (const mode of ['score', 'format', 'interface', 'integration']) {
    const id = 'V-' + mode;
    if (mode === 'format' && triage[id].applicability === 'current') continue;
    fresh[id] = report(id, freshGraph, execute(dir, 'candidate-v2.mjs', null, mode, corpus), expected[mode]);
    executed.push(id);
  }
  put(dir, 'fresh-report.json', fresh);
  put(dir, 'current-graph.json', freshGraph);
  verify(dir, before);
  const again = fixtures();
  for (const name of names) ensure(again[name].equals(fixed[name]), 'Package evidence changed');
  const afterFailures = Object.values(fresh).reduce((n, row) => n + row.comparisons.failed, 0);
  const result = { status: afterFailures ? 'comparison-failed' : 'selective-passed',
    reused: executed.includes('V-format') ? [] : [{ id: 'V-format', reportSha256: hash(json(baseline['V-format'])), source: 'baseline.json' }],
    executed, afterFailures, beforeFailures: { score: failed.score.failed, integration: failed.integration.failed },
    requirements: { score: { implementation: 'candidate-v2.mjs', verification: fresh['V-score'].comparisons.failed ? 'failed' : 'verified-listed-corpus-only' },
      format: { implementation: 'retained', verification: (fresh['V-format'] ?? baseline['V-format']).comparisons.failed ? 'failed' : 'verified-listed-corpus-only' } },
    preservation: Object.fromEntries(Object.entries(before).map(([name, bytes]) => [name, hash(bytes)])),
    overallParity: 'unverified', humanReview: 'pending', actualAgentActions: 'unverified', reaTrial: 'not-run', crossHostContinuation: 'unverified' };
  put(dir, 'result.json', result);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.length === 4, 'Invalid invocation');
    const result = run(...process.argv.slice(2));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'comparison-failed' ? 1 : 0;
  } catch {
    process.stderr.write('Selective demo error: check phase, trusted fixtures and fresh workspace.\n');
    process.exitCode = 2;
  }
}
