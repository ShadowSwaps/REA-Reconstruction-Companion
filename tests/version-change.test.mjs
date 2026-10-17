import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assess, checkSelection } from '../evals/resume/selective/run.mjs';
import { prepare, continueTrial, map, graphFor, checkFrozenSelection } from '../evals/version-change/run.mjs';
import { createStore } from '../evals/version-change/candidate-v2.mjs';
import { hash, bytes, literal, verifyFreeze } from '../evals/version-change/freeze.mjs';
const directory = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rea-version-')), 'case');
function setup() { const dir = directory(); prepare(dir); return dir; }
const load = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name)));
const statuses = result => Object.fromEntries(Object.entries(result).map(([id, row]) => [id, row.applicability]));
function fixture() {
  const dir = setup(), checkpoint = load(dir, 'checkpoint.json');
  const current = { ...checkpoint.current, targetCodec: 'a'.repeat(64), interface: 'b'.repeat(64) };
  return { dir, graph: checkpoint.graph, current };
}
test('two-process continuation reuses scoped titles and verifies migration/recovery/restart', () => {
  const dir = directory(), script = fileURLToPath(new URL('../evals/version-change/run.mjs', import.meta.url));
  const cli = phase => spawnSync(process.execPath, [script, phase, dir], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000 });
  assert.equal(cli('prepare').status, 0);
  const original = fs.readFileSync(path.join(dir, 'checkpoint.json'));
  const continued = cli('continue'); assert.equal(continued.status, 0, continued.stderr);
  const r = JSON.parse(continued.stdout);
  assert.deepEqual(r.executed, ['V-codec','V-interface','V-integration','V-migration']);
  assert.deepEqual(r.reused.map(row => row.id), ['V-titles']);
  assert.deepEqual(r.rowsAfterRestart, [{ id: 'a', title: 'Café 🧾', done: true }, { id: 'b', title: 'Second', done: false }]);
  assert.deepEqual(r.migrated.entries, [{ id: 'a', title: 'Café 🧾', done: false }, { id: 'b', title: 'Second', done: false }]);
  assert.equal(r.recoveries.length, 5);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'checkpoint.json')), original);
  assert.equal(hash(bytes(load(dir, 'baseline.json')['V-titles'])), r.reused[0].reportSha256);
  assert.notEqual(cli('continue').status, 0, 'A completed attempt is never overwritten');
  verifyFreeze();
});
test('frozen literal affected sets reject stale integration reuse and blanket invalidation', () => {
  const { graph, current } = fixture(), selected = statuses(assess(graph, current, map));
  checkFrozenSelection(selected);
  for (const id of ['V-integration','V-migration','R-codec']) {
    const wrong = { ...selected, [id]: 'current' };
    assert.throws(() => checkFrozenSelection(wrong));
    assert.ok(checkSelection(graph, current, wrong, map).failures.some(f => f.id === id && f.reason === 'unsupported-reuse'));
  }
  assert.throws(() => checkFrozenSelection(Object.fromEntries(Object.keys(selected).map(id => [id, 'stale']))));
});
test('missed dependencies, cycles and inconsistent child identities propagate unknown', () => {
  const { graph, current } = fixture();
  for (const mutate of [
    g => { g['V-interface'].dependencies = ['V-titles']; },
    g => { delete g['V-codec'].bindings.environment; },
    g => { g['F-codec'].bindings.targetCodec = 'c'.repeat(64); },
    g => { g['V-codec'].dependencies.push('V-migration'); }
  ]) {
    const damaged = structuredClone(graph); mutate(damaged);
    const result = assess(damaged, current, map);
    assert.equal(result['V-integration'].applicability, 'unknown');
    assert.equal(result['V-titles'].applicability, 'current');
  }
});
test('runtime and corpus drift cannot reuse byte-identical environment-dependent results', () => {
  const { graph, current } = fixture();
  const environment = statuses(assess(graph, { ...current, environment: 'd'.repeat(64) }, map));
  assert.equal(environment['V-titles'], 'stale'); assert.equal(environment['F-titles'], 'current');
  const corpus = statuses(assess(graph, { ...current, corpus: 'e'.repeat(64) }, map));
  assert.equal(corpus['V-codec'], 'stale'); assert.equal(corpus['V-titles'], 'current');
  assert.equal(assess(graph, { ...current, environment: undefined }, map)['V-titles'].applicability, 'unknown');
  const candidate = assess(graph, { ...current, candidateTitles: 'f'.repeat(64) }, map);
  assert.equal(candidate['V-titles'].applicability, 'stale'); assert.equal(candidate['F-titles'].applicability, 'current');
});
test('changed metadata artifact alone does not claim a behavior change', () => {
  const { graph } = fixture(), current = { ...graph['V-integration'].bindings, ...graph['V-migration'].bindings };
  assert.ok(Object.values(assess(graph, { ...current, releaseNote: 'f'.repeat(64) }, map)).every(row => row.applicability === 'current'));
  assert.deepEqual(graphFor(current), graph);
});

test('mixed stale and unavailable evidence expires dependent reuse while retaining scoped history', () => {
  const { graph, current } = fixture();
  // Target codec changed; title candidate identity is no longer available.
  // Static title findings remain applicable, but neither title runtime results
  // nor integration can be promoted merely because archived outputs still match.
  const now = { ...current, candidateTitles: undefined };
  const selected = statuses(assess(graph, now, map));
  assert.equal(selected['F-titles'], 'current');
  assert.equal(selected['V-titles'], 'unknown');
  assert.equal(selected['V-codec'], 'stale');
  assert.equal(selected['V-integration'], 'unknown');
  assert.equal(checkSelection(graph, now, selected, map).status, 'comparisons-passed');
  for (const id of ['V-titles', 'V-codec', 'V-integration']) {
    assert.ok(checkSelection(graph, now, { ...selected, [id]: 'current' }, map).failures
      .some(row => row.id === id && row.reason === 'unsupported-reuse'));
  }
  assert.equal(checkSelection(graph, now, { ...selected, 'F-titles': 'stale' }, map).failures[0].reason, 'unnecessary-invalidation');
});
test('missing, oversized and unexpected receipt paths fail before continuation writes', async () => {
  for (const mode of ['missing','oversized','path','unexpected']) {
    const dir = setup();
    if (mode === 'missing') fs.renameSync(path.join(dir, 'baseline.json'), path.join(dir, 'retained-baseline.json'));
    if (mode === 'oversized') fs.writeFileSync(path.join(dir, 'baseline.json'), ' '.repeat(65537));
    if (mode === 'unexpected') fs.writeFileSync(path.join(dir, 'untrusted-command.txt'), 'do not execute');
    if (mode === 'path') {
      const receipt = load(dir, 'prepared.json'); receipt.files['../outside.json'] = 'a'.repeat(64);
      fs.writeFileSync(path.join(dir, 'prepared.json'), bytes(receipt));
    }
    await assert.rejects(continueTrial(dir));
    assert.equal(fs.existsSync(path.join(dir, 'triage.json')), false);
  }
});
for (const name of ['baseline.json','v1-data.json','checkpoint.json']) test('altered ' + name + ' is rejected with or without self-rebased receipt', async () => {
  const dir = setup(), value = load(dir, name);
  if (name === 'baseline.json') value['V-titles'].actual = ['wrong'];
  else if (name === 'v1-data.json') value.entries[0].text = 'wrong';
  else value.graph['V-interface'].dependencies = ['V-titles'];
  fs.writeFileSync(path.join(dir, name), bytes(value));
  await assert.rejects(continueTrial(dir));
  const receipt = load(dir, 'prepared.json'); receipt.files[name] = hash(bytes(value));
  fs.writeFileSync(path.join(dir, 'prepared.json'), bytes(receipt));
  await assert.rejects(continueTrial(dir));
});
for (const [name, mutation] of [
  ['old reconstruction', () => { throw Object.assign(new Error('unsupported-version'), { code: 'unsupported-version' }); }],
  ['completion dropped', store => ({ ...store, importBytes(input) { return store.importBytes(input).map(row => ({ ...row, done: false })); } })],
  ['Unicode damaged', store => ({ ...store, importBytes(input) { return store.importBytes(input).map(row => ({ ...row, title: row.title.replace('é', 'e') })); } })],
  ['migration no-op', store => ({ ...store, migrate() { return store.state(); } })],
  ['destructive rejection', store => ({ ...store, importBytes(input) { try { return store.importBytes(input); } catch (error) { store.importBytes(bytes({ format: 'pocket-ledger', version: 2, entries: [] })); throw error; } } })],
  ['lossy downgrade', store => ({ ...store, exportBytes(version) { return version === 1 ? bytes(literal().v1) : store.exportBytes(version); } })]
]) test('actual trial rejects faulty candidate: ' + name, async () => {
  await assert.rejects(continueTrial(setup(), options => mutation(createStore(options))));
});
