// MIT. Fixed trusted local evaluation, reusing the resume applicability checker.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assess, checkSelection } from '../resume/selective/run.mjs';
import { createStore as oldCandidate } from './candidate-v1.mjs';
import { createStore as oldReference } from './reference-v1.mjs';
import { createStore as newReference } from './reference-v2.mjs';
import { titles } from './summary.mjs';
import { verifyFreeze, literal, bytes, hash, read } from './freeze.mjs';
import { verifyFreeze as verifyHistorical } from '../import-export/freeze.mjs';

export const map = JSON.parse(read('dependencies.json'));
const here = new URL('./', import.meta.url);
const environment = () => hash(bytes({ node: process.version, platform: process.platform, arch: process.arch }));
const put = (dir, name, data) => fs.writeFileSync(path.join(dir, name), bytes(data), { flag: 'wx' });
function record(dir, name) {
  const file = path.join(dir, name), stat = fs.lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 65536, 'Invalid saved record');
  const content = fs.readFileSync(file);
  assert.ok(content.length <= 65536, 'Oversized saved record');
  return content;
}
const get = (dir, name) => JSON.parse(record(dir, name));
const bindings = (version, adapted = false) => ({
  targetCodec: hash(Buffer.concat([read(`reference-v${version}.mjs`), read('../import-export/reference.mjs')])),
  candidateCodec: hash(Buffer.concat([read(`candidate-v${adapted ? 2 : 1}.mjs`), read('../import-export/candidate.mjs')])),
  targetTitles: hash(read('summary.mjs')), candidateTitles: hash(read('summary.mjs')),
  interface: hash(bytes(version === 1 ? ['schema1'] : ['schema1','schema2','migrate'])),
  titleInterface: hash(bytes(['id','title','done'])), corpus: hash(read('expectations.json')),
  titlesCorpus: hash(bytes({ rows: literal().rowsV1, expected: literal().titles })),
  migrationCorpus: hash(read('expectations.json')), persistence: hash(read('../import-export/candidate.mjs')),
  composition: hash(bytes('codec.state -> titles')), environment: environment(), harness: hash(read('run.mjs'))
});
export function graphFor(current) {
  const leaves = id => Object.hasOwn(map, id) ? [...new Set(map[id].flatMap(leaves))].sort() : [id];
  return Object.fromEntries(Object.entries(map).map(([id, dependencies]) => [id,
    { dependencies, bindings: Object.fromEntries(leaves(id).map(key => [key, current[key]])) }]));
}
const selection = result => Object.fromEntries(Object.entries(result).map(([id, row]) => [id, row.applicability]));
export function checkFrozenSelection(actual) {
  const e = literal();
  assert.deepEqual(Object.keys(actual).sort(), [...e.affected, ...e.retained].sort());
  for (const id of e.affected) assert.equal(actual[id], 'stale', id);
  for (const id of e.retained) assert.equal(actual[id], 'current', id);
}
function restart(file) {
  const program = `const {createStore}=await import(process.argv[1]);console.log(JSON.stringify(createStore({file:process.argv[2]}).state()));`;
  const result = spawnSync(process.execPath, ['--input-type=module','--eval',program,
    new URL('candidate-v2.mjs', here).href, file], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 5000, maxBuffer: 65536 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
}
export function prepare(dir) {
  verifyFreeze(); verifyHistorical();
  fs.mkdirSync(dir); // Require a new destination, never overwrite history.
  const e = literal(), baseline = oldCandidate(), reference = oldReference();
  assert.deepEqual(baseline.importBytes(bytes(e.v1)), e.rowsV1);
  assert.deepEqual(reference.importBytes(bytes(e.v1)), e.rowsV1);
  assert.deepEqual(titles(baseline.state()), e.titles);
  assert.throws(() => baseline.importBytes(bytes(e.v2)), { code: e.errors.oldReader });
  const current = bindings(1), graph = graphFor(current);
  put(dir, 'v1-data.json', JSON.parse(baseline.exportBytes(1)));
  put(dir, 'baseline.json', { 'V-titles': { actual: titles(baseline.state()), expected: e.titles, bindings: graph['V-titles'].bindings },
    'V-codec': { actual: baseline.state(), expected: e.rowsV1, bindings: graph['V-codec'].bindings } });
  put(dir, 'checkpoint.json', { mode: 'investigate-and-build', scope: 'schema transition, title listing, migration',
    version: 1, current, graph, requirementImplementation: 'candidate-v1.mjs',
    coverage: 'V-codec and V-titles executed; v2 migration unrun', reports: ['baseline.json'] });
  const names = ['v1-data.json','baseline.json','checkpoint.json'];
  put(dir, 'prepared.json', { files: Object.fromEntries(names.map(name => [name, hash(fs.readFileSync(path.join(dir, name)))])),
    frozen: hash(read('identity.json')) });
  return { status: 'prepared', historical: names };
}
export async function continueTrial(dir, factory) {
  verifyFreeze(); verifyHistorical();
  assert.ok(fs.lstatSync(dir).isDirectory() && !fs.lstatSync(dir).isSymbolicLink(), 'Invalid continuation directory');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['baseline.json','checkpoint.json','prepared.json','v1-data.json']);
  const e = literal(), receipt = get(dir, 'prepared.json');
  assert.deepEqual(Object.keys(receipt).sort(), ['files','frozen']);
  assert.deepEqual(Object.keys(receipt.files).sort(), ['baseline.json','checkpoint.json','v1-data.json']);
  assert.equal(receipt.frozen, hash(read('identity.json')));
  for (const [name, digest] of Object.entries(receipt.files)) assert.equal(hash(record(dir, name)), digest, 'Historical drift: ' + name);
  // Reconstruct trusted expected checkpoint, rather than trusting self-rebased hashes.
  const checkpoint = get(dir, 'checkpoint.json'), current = bindings(2);
  const original = bindings(1); original.environment = checkpoint.current.environment;
  assert.deepEqual(checkpoint.current, original, 'Checkpoint identities differ from trusted fixtures');
  assert.deepEqual(checkpoint.graph, graphFor(original), 'Checkpoint dependencies differ');
  assert.deepEqual(get(dir, 'v1-data.json'), e.v1);
  const baseline = get(dir, 'baseline.json');
  assert.deepEqual(baseline, { 'V-titles': { actual: e.titles, expected: e.titles, bindings: checkpoint.graph['V-titles'].bindings },
    'V-codec': { actual: e.rowsV1, expected: e.rowsV1, bindings: checkpoint.graph['V-codec'].bindings } });
  const applicability = assess(checkpoint.graph, current, map), selected = selection(applicability);
  // Environment drift is evaluated, never silently relabeled as an exact match.
  if (original.environment === current.environment) checkFrozenSelection(selected);
  else for (const id of ['V-titles','V-codec','V-integration']) assert.equal(selected[id], 'stale');
  assert.equal(checkSelection(checkpoint.graph, current, selected, map).status, 'comparisons-passed');
  put(dir, 'triage.json', { applicability, requirements: { codec: { implementation: 'retained-needs-adaptation', verification: selected['R-codec'] },
    titles: { implementation: 'retained', verification: selected['R-titles'] } }, overallParity: 'unverified' });
  const old = oldCandidate();
  assert.throws(() => old.importBytes(bytes(e.v2)), { code: 'unsupported-version' });
  const ref = newReference();
  assert.deepEqual(ref.importBytes(bytes(e.v2)), e.rowsV2);
  assert.deepEqual(titles(ref.state()), e.titles);
  const refMigration = newReference();
  refMigration.importBytes(bytes(e.v1));
  assert.deepEqual(refMigration.migrate(), e.rowsV1);
  assert.deepEqual(JSON.parse(refMigration.exportBytes(2)), e.migrated);
  put(dir, 'change-observed.json', { oldCandidateSchema2: 'unsupported-version', referenceV2: ref.state(),
    oldReference: JSON.parse(read('observed.json')).v1, unchangedTitles: titles(ref.state()),
    artifactControl: { old: hash(read('release-v1.txt')), current: hash(read('release-v2.txt')), behaviorDependency: false } });
  const candidate = factory ?? (await import('./candidate-v2.mjs')).createStore;
  const fresh = candidate();
  assert.deepEqual(fresh.importBytes(bytes(e.v2)), e.rowsV2);
  assert.deepEqual(titles(fresh.state()), e.titles); // Shared interface + integration re-executed.
  assert.throws(() => fresh.exportBytes(1), { code: e.errors.downgrade });
  assert.deepEqual(newReference().importBytes(fresh.exportBytes(2)), e.rowsV2);
  assert.deepEqual(candidate().importBytes(ref.exportBytes(2)), e.rowsV2);
  const file = path.join(dir, 'active.json'), prior = fs.readFileSync(path.join(dir, 'v1-data.json'));
  fs.writeFileSync(file, prior, { flag: 'wx' });
  const migration = candidate({ file });
  assert.deepEqual(migration.state(), e.rowsV1);
  assert.deepEqual(fs.readFileSync(file), prior, 'Opening must not migrate implicitly');
  const recoveries = [];
  for (const [name, code] of [['unsupported', e.errors.unsupported], ['lateInvalid', e.errors.lateInvalid], ['duplicate', e.errors.duplicate]]) {
    assert.throws(() => migration.importBytes(bytes(e[name])), { code });
    assert.deepEqual(migration.state(), e.rowsV1); assert.deepEqual(fs.readFileSync(file), prior);
    recoveries.push({ name, kind: 'actual validation rejection', preserved: true });
  }
  let inject = true;
  const failing = candidate({ file, beforeReplace() { if (inject) throw new Error('injected pre-rename failure'); } });
  assert.throws(() => failing.migrate(), { code: e.errors.persistence });
  assert.deepEqual(failing.state(), e.rowsV1); assert.deepEqual(fs.readFileSync(file), prior);
  // Retry after controlled injection in this same instance.
  inject = false; assert.deepEqual(failing.migrate(), e.rowsV1);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), e.migrated);
  const migrationObserved = JSON.parse(fs.readFileSync(file));
  recoveries.push({ name: 'pre-rename', kind: 'injected exception; retry observed', preserved: true });
  // Controlled actual OS failure: replace the destination at the callback boundary
  // with a nonempty directory, retaining the original bytes in a separate file.
  const osFile = path.join(dir, 'os-failure.json'), saved = path.join(dir, 'os-original.json');
  fs.writeFileSync(osFile, prior, { flag: 'wx' });
  const osStore = candidate({ file: osFile, beforeReplace() {
    fs.renameSync(osFile, saved); fs.mkdirSync(osFile); fs.writeFileSync(path.join(osFile, 'block'), 'occupied');
  } });
  assert.throws(() => osStore.migrate(), { code: e.errors.persistence });
  assert.deepEqual(osStore.state(), e.rowsV1); assert.deepEqual(fs.readFileSync(saved), prior);
  // Restore the controlled destination via reversible renames; retain fault artifacts.
  fs.renameSync(osFile, path.join(dir, 'retained-blocking-directory')); fs.renameSync(saved, osFile);
  assert.deepEqual(candidate({ file: osFile }).state(), e.rowsV1);
  recoveries.push({ name: 'rename-to-nonempty-directory', kind: 'controlled real OS I/O failure, not spontaneous', preserved: true });
  assert.deepEqual(restart(file), e.rowsV1);
  const migrated = candidate({ file });
  assert.deepEqual(oldReference().importBytes(migrated.exportBytes(1)), e.rowsV1);
  assert.deepEqual(newReference().importBytes(fs.readFileSync(file)), e.rowsV1);
  assert.deepEqual(JSON.parse(migrated.exportBytes(1)), e.v1);
  assert.deepEqual(migrated.importBytes(bytes(e.v2)), e.rowsV2);
  assert.throws(() => migrated.exportBytes(1), { code: 'lossy-version' });
  assert.deepEqual(restart(file), e.rowsV2);
  for (const [name, digest] of Object.entries(receipt.files)) assert.equal(hash(fs.readFileSync(path.join(dir, name))), digest);
  verifyFreeze(); verifyHistorical();
  const reused = selected['V-titles'] === 'current' ? [{ id: 'V-titles', source: 'baseline.json',
    reportSha256: hash(bytes(baseline['V-titles'])), bindings: baseline['V-titles'].bindings }] : [];
  // Standalone title behavior is rerun only when its relevant identity drifted.
  if (!reused.length) assert.deepEqual(titles(e.rowsV1), e.titles);
  const result = { status: 'version-change-passed', environment: { node: process.version, platform: process.platform, arch: process.arch },
    reused, executed: ['V-codec','V-interface','V-integration','V-migration', ...(!reused.length ? ['V-titles'] : [])],
    freshBindings: bindings(2, true), oldCandidateMismatch: 'schema2 rejected', migrated: migrationObserved,
    requirements: { codec: { implementation: 'candidate-v2.mjs', verification: 'fresh-listed-cases-passed' },
      titles: { implementation: 'summary.mjs-retained', verification: reused.length ? 'original-scoped-report-reused' : 'fresh-listed-cases-passed' },
      migration: { implementation: 'candidate-v2.mjs:migrate', verification: 'fresh-listed-transitions-and-faults-passed', priorVerification: 'unrun' } },
    overallParity: 'bounded selected workflows only; arbitrary inputs and external applications unverified',
    rowsAfterRestart: restart(file), recoveries, preservation: receipt.files,
    limitation: 'synthetic same-agent source exposure; bounded caught failures; no crash/concurrency guarantees' };
  put(dir, 'result.json', result);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [phase, directory] = process.argv.slice(2);
    assert.ok(directory && ['prepare','continue'].includes(phase), 'Use prepare|continue NEW_DIRECTORY');
    const dir = path.resolve(directory);
    console.log(JSON.stringify(phase === 'prepare' ? prepare(dir) : await continueTrial(dir)));
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
