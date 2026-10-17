import { fixtureLink } from '../scripts/test-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { candidate, validateReconstruction } from '../evals/reference/reconstruction/validate.mjs';

function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-reconstruction-test-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('rea-reconstruction-test-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function run(dir, input, store = path.join(dir, 'tasks.json'), script = candidate) {
  return spawnSync(process.execPath, [script, '--store', store], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    cwd: dir, timeout: 5000, maxBuffer: 1024 * 1024, shell: false, windowsHide: true,
  });
}
function response(result) {
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('worked reconstruction passes the frozen oracle and recorded observations', () => {
  const report = validateReconstruction();
  assert.equal(report.status, 'checks-passed');
  assert.equal(report.comparison.kind, 'candidate-comparison');
  assert.deepEqual([report.comparison.passed, report.comparison.failed, report.comparison.notRun], [16, 0, 0]);
  assert.deepEqual([report.observationReplay.scenarios, report.observationReplay.passed,
    report.observationReplay.failed, report.observationReplay.notRun], [7, 10, 0, 0]);
  assert.equal(report.humanReview, 'pending'); assert.equal(report.independentEvaluation, false);
  assert.equal(report.comparison.reaTrial, 'unverified');
  assert.equal(report.evidencePacket.before.status, 'verified');
  assert.deepEqual(report.evidencePacket.after, report.evidencePacket.before);
  assert.equal(JSON.stringify(report).includes(path.dirname(candidate)), false);
});

test('saved example report identifies the current executable and evidence bytes', () => {
  const root = new URL('../evals/reference/', import.meta.url);
  const report = JSON.parse(fs.readFileSync(new URL('reconstruction/validation-report.json', root), 'utf8'));
  for (const [key, relative] of Object.entries({ targetSha256: 'target/pocket-tasks.mjs',
    candidateSha256: 'reconstruction/candidate.mjs', observationsSha256: 'walkthrough/runtime-observations.json',
    validatorSha256: 'reconstruction/validate.mjs', checkerSha256: 'check.mjs', packetToolSha256: 'prepare.mjs' })) {
    assert.equal(report.identities[key], createHash('sha256').update(fs.readFileSync(new URL(relative, root))).digest('hex'), relative);
  }
  assert.equal(report.status, 'checks-passed');
  assert.equal(report.humanReview, 'pending');
  assert.equal(report.independentEvaluation, false);
});

test('candidate is standalone when only its own file is copied', t => {
  const dir = fixture(t), copy = path.join(dir, 'candidate Ω with spaces.mjs');
  fs.copyFileSync(candidate, copy);
  const result = response(run(dir, [{ op: 'add', title: 'Standalone' }, { op: 'save' }], path.join(dir, 'tasks.json'), copy));
  assert.equal(result[1].view.items.at(-1).title, 'Standalone'); assert.equal(result[1].view.dirty, false);
  assert.equal(fs.existsSync(path.join(dir, 'tasks.json.pending')), false);
});

test('batch and byte bounds reject input before any save', t => {
  const dir = fixture(t), store = path.join(dir, 'tasks.json'), original = '{"schema":1,"nextId":1,"items":[]}\n';
  fs.writeFileSync(store, original);
  for (const input of ['{broken', '{}', JSON.stringify(Array(65).fill({ op: 'save' })), ' '.repeat(65537)]) {
    const result = run(dir, input);
    assert.equal(result.status, 2); assert.equal(result.stdout, ''); assert.ok(result.stderr.trim());
    assert.equal(fs.readFileSync(store, 'utf8'), original);
  }
  assert.equal(response(run(dir, Array(64).fill({ op: 'view' }))).length, 64);
  const exact = '[]' + ' '.repeat(65534);
  assert.deepEqual(response(run(dir, exact)), []);
});

test('invalid stores are rejected without replacing their bytes', t => {
  const dir = fixture(t), store = path.join(dir, 'tasks.json');
  const row = { id: 't1', title: 'A', done: false };
  const values = [null, { schema: 2, nextId: 2, items: [row] }, { schema: 1, nextId: 2, items: [row, row] },
    { schema: 1, nextId: 1, items: [row] }, { schema: 1, nextId: 2, items: [{ ...row, done: 1 }] },
    { schema: 1, nextId: 2, items: [row], extra: 1 }, { schema: 1, nextId: 2, items: [{ ...row, id: 't01' }] },
    { schema: 1, nextId: 2, items: [{ ...row, title: ' ' }] }, { schema: 1, nextId: 1.5, items: [] },
    { schema: 1, nextId: 1000001, items: [] }, { schema: 1, nextId: 40, items: Array(33).fill(row) }];
  for (const original of [...values.map(value => JSON.stringify(value)), ' '.repeat(65537)]) {
    fs.writeFileSync(store, original);
    assert.equal(run(dir, [{ op: 'save' }]).status, 2);
    assert.equal(fs.readFileSync(store, 'utf8'), original);
  }
});

test('capacity, UTF-16 limits and invalid-title precedence match the scoped contract', t => {
  const dir = fixture(t);
  const result = response(run(dir, [...Array.from({ length: 29 }, (_, n) => ({ op: 'add', title: `Task ${n}` })),
    { op: 'add', title: 'Overflow' }, { op: 'add', title: ' ' }]));
  assert.equal(result[28].view.items.length, 32); assert.equal(result[29].error, 'capacity');
  assert.equal(result[30].error, 'invalid-title');
  const unicode = response(run(dir, [{ op: 'add', title: '😀'.repeat(40) }, { op: 'add', title: '😀'.repeat(41) }]));
  assert.equal(unicode[0].ok, true); assert.equal(unicode[1].error, 'invalid-title');
  fs.writeFileSync(path.join(dir, 'tasks.json'), '{"schema":1,"nextId":1000000,"items":[]}');
  assert.equal(response(run(dir, [{ op: 'add', title: 'Full ID range' }]))[0].error, 'capacity');
});

test('foreign pending files survive and save can be retried after their removal', t => {
  const dir = fixture(t), store = path.join(dir, 'tasks.json');
  const original = '{"schema":1,"nextId":1,"items":[]}';
  fs.writeFileSync(store, original); fs.writeFileSync(store + '.pending', 'foreign bytes');
  const failed = response(run(dir, [{ op: 'add', title: 'Draft' }, { op: 'save' }]));
  assert.equal(failed[1].error, 'save-failed'); assert.equal(failed[1].view.dirty, true);
  assert.equal(fs.readFileSync(store, 'utf8'), original);
  assert.equal(fs.readFileSync(store + '.pending', 'utf8'), 'foreign bytes');
  fs.unlinkSync(store + '.pending');
  const retried = response(run(dir, [{ op: 'add', title: 'Retried' }, { op: 'save' }]));
  assert.equal(retried[1].ok, true); assert.equal(retried[1].view.dirty, false);
  assert.equal(fs.existsSync(store + '.pending'), false);
});

test('linked parents and relative store paths fail without writing', t => {
  const dir = fixture(t), outside = path.join(dir, 'outside'); fs.mkdirSync(outside);
  const linked = path.join(dir, 'linked'); fixtureLink(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(run(dir, [{ op: 'save' }], path.join(linked, 'tasks.json')).status, 2);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(run(dir, [{ op: 'save' }], 'tasks.json').status, 2);
});

test('property-like operation names are rejected and supplied key order remains compatible', t => {
  const dir = fixture(t), store = path.join(dir, 'tasks.json');
  fs.writeFileSync(store, '{"items":[{"done":false,"title":"A","id":"t7"}],"nextId":8,"schema":1}');
  const result = response(run(dir, [{ op: 'constructor' }, { op: '__proto__' }, { op: 'select', index: 0 },
    { op: 'toggle' }, { op: 'toggle' }, { op: 'save' }]));
  assert.equal(result[0].error, 'unknown-op'); assert.equal(result[1].error, 'unknown-op');
  assert.equal(result[4].view.dirty, false); assert.equal(result[5].view.dirty, false);
  assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).items[0].id, 't7');
});

test('validator rejects arbitrary execution arguments', t => {
  const dir = fixture(t), cli = fileURLToPath(new URL('../evals/reference/reconstruction/validate.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, '--command', path.join(dir, 'untrusted.json')], {
    encoding: 'utf8', shell: false, timeout: 5000, windowsHide: true,
  });
  assert.equal(result.status, 2); assert.equal(result.stdout, ''); assert.ok(result.stderr.trim());
});
