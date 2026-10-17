import { fixtureLink } from '../scripts/fixture-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assess, checkSelection } from '../evals/resume/selective/run.mjs';

const root = fileURLToPath(new URL('../evals/resume/selective/', import.meta.url));
const runner = path.join(root, 'run.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).map(name => [name, fs.readFileSync(path.join(dir, name))]));
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir()), dir = fs.mkdtempSync(path.join(parent, 'rea-selective-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent); assert.ok(path.basename(dir).startsWith('rea-selective-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
const cli = (args, script = runner) => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8', shell: false, windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024,
});
function prepare(t) {
  const dir = path.join(temporary(t), 'case with spaces ø');
  assert.equal(cli(['prepare', dir]).status, 0);
  return dir;
}
test('process boundary retains independent B evidence and implementation, repairs A and rechecks integration', t => {
  const packageBefore = snapshot(path.join(root, 'fixtures')), dir = prepare(t), before = snapshot(dir);
  const result = cli(['continue', dir]); assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout), triage = read(dir, 'triage.json'), fresh = read(dir, 'fresh-report.json');
  assert.equal(value.status, 'selective-passed');
  for (const [name, bytes] of Object.entries(before)) {
    assert.deepEqual(fs.readFileSync(path.join(dir, name)), bytes);
    assert.equal(value.preservation[name], hash(bytes));
  }
  assert.deepEqual(snapshot(path.join(root, 'fixtures')), packageBefore);
  assert.equal(triage.evidence['F-format'].applicability, 'current');
  assert.equal(triage.evidence['R-format'].applicability, 'current');
  for (const id of ['F-score', 'V-score', 'R-score', 'V-interface', 'V-integration']) assert.equal(triage.evidence[id].applicability, 'stale', id);
  assert.equal(triage.requirements.format.implementation, 'retained');
  assert.equal(triage.requirements.score.verification, 'stale');
  assert.deepEqual(value.executed, ['V-score', 'V-interface', 'V-integration']);
  assert.equal(Object.hasOwn(fresh, 'V-format'), false, 'No unnecessary standalone B recheck');
  const reused = read(dir, 'baseline.json')['V-format'];
  assert.deepEqual(value.reused, [{ id: 'V-format', reportSha256: hash(JSON.stringify(reused, null, 2) + '\n'), source: 'baseline.json' }]);
  assert.deepEqual(value.beforeFailures, { score: 5, integration: 5 });
  assert.equal(value.afterFailures, 0);
  const reassessment = read(dir, 'reassessment.json');
  assert.deepEqual(reassessment.bindings, Object.fromEntries(['targetA', 'interface', 'corpus', 'environment', 'harness'].map(key => [key, triage.selected[key]])));
  assert.equal(reassessment.bindings.corpus, hash(before['corpus.json']));
  assert.equal(reassessment.bindings.harness, hash(fs.readFileSync(runner)));
  assert.equal(reassessment.comparisons.failed, 0);
  assert.deepEqual(read(dir, 'before-report.json').comparisons.integration.failures.map(row => row.index), [3,4,5,6,7]);
  // Literal expectations are independent of the runner's oracle and dependency labels.
  assert.deepEqual(fresh['V-score'].comparisons.actual, [0,99,100,101,199,200,200,200,null,null,null,null,null,null,null,null]);
  assert.deepEqual(fresh['V-integration'].comparisons.actual, ['score:0','score:99','score:100','score:101','score:199','score:200','score:200','score:200', ...Array(8).fill('invalid')]);
  assert.equal(fresh['V-interface'].comparisons.total, 23);
  assert.equal(fresh['V-interface'].comparisons.failed, 0);
  assert.equal(read(dir, 'current-graph.json')['R-score'].implementation, 'candidate-v2.mjs');
  for (const id of Object.keys(fresh)) assert.equal(fresh[id].comparisons.failed, 0);
  assert.equal(value.overallParity, 'unverified'); assert.equal(value.humanReview, 'pending');
  assert.equal(value.actualAgentActions, 'unverified'); assert.equal(value.reaTrial, 'not-run');
  assert.equal(value.crossHostContinuation, 'unverified');
  const after = snapshot(dir); assert.equal(cli(['continue', dir]).status, 2); assert.deepEqual(snapshot(dir), after);
});

test('dependency selection rejects stale integration reuse and unnecessary full invalidation', t => {
  const dir = prepare(t), graph = read(dir, 'graph.json'), old = graph['V-integration'].bindings;
  const current = { ...old, targetA: 'a'.repeat(64) }, result = assess(graph, current);
  assert.equal(result['V-format'].applicability, 'current');
  assert.equal(result['V-integration'].applicability, 'stale');
  const decisions = Object.fromEntries(Object.entries(result).map(([id, row]) => [id, row.applicability]));
  assert.deepEqual(decisions, { 'F-score': 'stale', 'F-format': 'current', 'V-score': 'stale', 'V-format': 'current',
    'R-score': 'stale', 'R-format': 'current', 'V-interface': 'stale', 'V-integration': 'stale' });
  // Deliberately wrong policies must disagree at the intended evidence boundary.
  assert.equal(checkSelection(graph, current, decisions).status, 'comparisons-passed');
  assert.deepEqual(checkSelection(graph, current, { ...decisions, 'V-integration': 'current' }).failures,
    [{ id: 'V-integration', reason: 'unsupported-reuse' }]);
  assert.deepEqual(checkSelection(graph, current, Object.fromEntries(Object.keys(decisions).map(id => [id, 'stale']))).failures,
    ['F-format', 'V-format', 'R-format'].map(id => ({ id, reason: 'unnecessary-invalidation' })));
  assert.ok(result['V-integration'].dependencies.includes('targetA'));
  assert.ok(result['V-integration'].dependencies.includes('candidateB'));
});

test('missing transitive edge, unknown identity, extra binding and cycles remain unknown', t => {
  const dir = prepare(t), original = read(dir, 'graph.json'), current = original['V-integration'].bindings;
  for (const mutate of [
    graph => graph['F-score'].dependencies.pop(),
    graph => delete graph['V-interface'],
    graph => graph['V-score'].dependencies.push('V-integration'),
    graph => delete graph['V-integration'].bindings.targetA,
    graph => graph['V-integration'].bindings.invented = 'a'.repeat(64),
  ]) {
    const graph = structuredClone(original); mutate(graph);
    assert.equal(assess(graph, current)['V-integration'].applicability, 'unknown');
    assert.equal(assess(graph, current)['V-format'].applicability, 'current');
    const wrong = Object.fromEntries(Object.entries(assess(graph, current)).map(([id, row]) => [id, row.applicability]));
    wrong['V-integration'] = 'current';
    assert.ok(checkSelection(graph, current, wrong).failures.some(row => row.id === 'V-integration' && row.reason === 'unsupported-reuse'));
  }
  for (const missing of [undefined, null, 'unknown', '']) {
    const result = assess(original, { ...current, targetA: missing });
    assert.equal(result['V-integration'].applicability, 'unknown');
    assert.equal(result['F-format'].applicability, 'current');
  }
});

test('corpus, runtime, shared interface, candidate and pipeline drift affect only actual dependents', t => {
  const dir = prepare(t), graph = read(dir, 'graph.json'), current = graph['V-integration'].bindings;
  for (const key of ['corpus', 'formatCorpus', 'environment', 'interface', 'candidateA', 'pipeline']) {
    const changed = assess(graph, { ...current, [key]: 'b'.repeat(64) });
    assert.equal(changed['V-integration'].applicability, 'stale', key);
    assert.equal(changed['V-format'].applicability, ['formatCorpus','environment','interface'].includes(key) ? 'stale' : 'current', key);
    assert.equal(changed['F-score'].applicability, key === 'interface' ? 'stale' : 'current', key);
  }
});

test('unknown or contradictory child identities propagate through every dependent result', t => {
  const dir = prepare(t), original = read(dir, 'graph.json'), current = original['V-integration'].bindings;
  for (const mutate of [
    graph => delete graph['F-score'].bindings.targetA,
    graph => graph['F-score'].bindings.targetA = 'c'.repeat(64),
    graph => graph['F-score'].bindings.extra = 'c'.repeat(64),
    graph => graph['F-score'].bindings.targetA = [current.targetA],
  ]) {
    const graph = structuredClone(original); mutate(graph);
    const result = assess(graph, current);
    for (const id of ['V-score', 'R-score', 'V-interface', 'V-integration']) assert.equal(result[id].applicability, 'unknown', id);
    for (const id of ['F-format', 'V-format', 'R-format']) assert.equal(result[id].applicability, 'current', id);
  }
  for (const malformed of [[current.targetA], { hash: current.targetA }, true, 123]) {
    assert.equal(assess(original, { ...current, targetA: malformed })['V-integration'].applicability, 'unknown');
  }
});

for (const name of ['score-v2.mjs', 'candidate-v1.mjs', 'format.mjs', 'baseline.json', 'graph.json', 'environment.json', 'prepared.json']) {
  test(`changed ${name} is rejected before fresh execution without repairing history`, t => {
    const dir = prepare(t); fs.appendFileSync(path.join(dir, name), '\n ');
    const before = snapshot(dir), result = cli(['continue', dir]);
    assert.equal(result.status, 2); assert.equal(result.stdout, ''); assert.equal(result.stderr.includes(dir), false);
    assert.deepEqual(snapshot(dir), before);
  });
}
test('altered evidence cannot bless itself with a new receipt or execute embedded commands', t => {
  const dir = prepare(t), marker = path.join(path.dirname(dir), 'must-not-run');
  const graph = read(dir, 'graph.json'); graph['F-score'].dependencies = ['interface'];
  graph.command = [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)},'ran')`];
  fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify(graph));
  const receipt = read(dir, 'prepared.json'); receipt.files['graph.json'] = hash(fs.readFileSync(path.join(dir, 'graph.json')));
  fs.writeFileSync(path.join(dir, 'prepared.json'), JSON.stringify(receipt, null, 2) + '\n');
  assert.equal(cli(['continue', dir]).status, 2); assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.existsSync(path.join(dir, 'triage.json')), false);
});

test('missing, linked, oversized and unexpected evidence cannot trigger continuation', t => {
  for (const mode of ['missing', 'link', 'oversized', 'extra']) {
    const dir = prepare(t), file = path.join(dir, 'baseline.json');
    if (mode === 'missing') fs.unlinkSync(file);
    if (mode === 'oversized') fs.writeFileSync(file, ' '.repeat(65537));
    if (mode === 'extra') fs.writeFileSync(path.join(dir, 'fresh-report.json'), 'keep');
    if (mode === 'link') {
      const outside = path.join(path.dirname(dir), 'outside'); fs.mkdirSync(outside);
      fs.unlinkSync(file); fixtureLink(outside, file, process.platform === 'win32' ? 'junction' : 'dir');
    }
    assert.equal(cli(['continue', dir]).status, 2); assert.equal(fs.existsSync(path.join(dir, 'triage.json')), false);
    if (mode === 'link') fs.unlinkSync(file);
  }
  const dir = prepare(t), alias = path.join(path.dirname(dir), 'alias');
  fixtureLink(dir, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(cli(['continue', alias]).status, 2); fs.unlinkSync(alias);
  for (const args of [[], ['prepare', dir], ['bless', dir], ['continue', dir, 'extra']]) assert.equal(cli(args).status, 2);
});

test('fixture drift prevents preparation without silently rebaselining trusted bytes', t => {
  const dir = temporary(t), copy = path.join(dir, 'runner'); fs.cpSync(root, copy, { recursive: true });
  fs.appendFileSync(path.join(copy, 'fixtures/format.mjs'), '\n// drift');
  assert.equal(cli(['prepare', path.join(dir, 'case')], path.join(copy, 'run.mjs')).status, 2);
  assert.equal(fs.existsSync(path.join(dir, 'case')), false);
});

test('rebased receipt cannot authorize execution of a modified module', t => {
  const dir = prepare(t), marker = path.join(path.dirname(dir), 'must-not-run');
  const candidate = path.join(dir, 'candidate-v1.mjs');
  fs.writeFileSync(candidate, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'ran');`);
  const receipt = read(dir, 'prepared.json'); receipt.files['candidate-v1.mjs'] = hash(fs.readFileSync(candidate));
  fs.writeFileSync(path.join(dir, 'prepared.json'), JSON.stringify(receipt, null, 2) + '\n');
  const before = snapshot(dir);
  assert.equal(cli(['continue', dir]).status, 2);
  assert.equal(fs.existsSync(marker), false); assert.deepEqual(snapshot(dir), before);
});

test('wrong repaired behavior retains actual failures and cannot claim integration success', t => {
  const dir = temporary(t), copy = path.join(dir, 'runner'); fs.cpSync(root, copy, { recursive: true });
  // Mutate the runner's choice only; trusted package and candidate fixtures stay intact.
  const script = path.join(copy, 'run.mjs'), source = fs.readFileSync(script, 'utf8');
  const wrong = source.replace("execute(dir, 'candidate-v2.mjs', null, mode, corpus)", "execute(dir, 'candidate-v1.mjs', null, mode, corpus)");
  assert.notEqual(wrong, source); fs.writeFileSync(script, wrong);
  const workspace = path.join(dir, 'case'); assert.equal(cli(['prepare', workspace], script).status, 0);
  const result = cli(['continue', workspace], script); assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).afterFailures, 10);
  assert.equal(read(workspace, 'fresh-report.json')['V-integration'].comparisons.failed, 5);
  assert.equal(read(workspace, 'result.json').requirements.score.verification, 'failed');
});
