import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { check, referenceCommand } from '../evals/reference/check.mjs';
import { prepare } from '../evals/reference/prepare.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(referenceCommand[1], 'utf8');
function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-reference-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-reference-test-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
function run(dir, input, store = path.join(dir, 'tasks.json')) {
  return spawnSync(referenceCommand[0], [...referenceCommand.slice(1), '--store', store], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 5000, windowsHide: true,
  });
}
function candidate(t, contents) {
  const dir = fixture(t), file = path.join(dir, 'candidate with spaces Ω.mjs');
  fs.writeFileSync(file, contents); return [process.execPath, file];
}
function mutate(t, from, to) {
  assert.equal(source.split(from).length, 2, 'Mutation must replace exactly one source segment.');
  return candidate(t, source.replace(from, to));
}

test('reference passes independent literal oracle; live REA and review remain unverified', () => {
  const report = check(referenceCommand);
  assert.equal(report.kind, 'reference-self-check');
  assert.equal(report.status, 'comparisons-passed');
  assert.equal(report.passed, 16); assert.equal(report.failed, 0); assert.equal(report.notRun, 0);
  assert.equal(report.humanReview, 'pending'); assert.equal(report.reaTrial, 'unverified');
  assert.match(report.corpusSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(report).includes(repo), false);
});

for (const [name, from, to, label, reason] of [
  ['autosave', 'return output;', "fs.writeFileSync(file, JSON.stringify(draft)); return output;", 'startup and unsaved draft: session 1', 'Unexpected store write.'],
  ['save silently forgotten', 'fs.renameSync(temporary, file);', 'fs.unlinkSync(temporary);', 'save, cancel and restart: session 1', 'Persisted store mismatch.'],
  ['empty store reseeded', 'return value;', 'return value.items.length ? value : seed();', 'empty store stays empty: session 2', 'Response mismatch.'],
  ['title whitespace lost', 'title: command.title, done: false', 'title: command.title.trim(), done: false', 'startup and unsaved draft: session 2', 'Response mismatch.'],
  ['selection cleared on filtering', 'else filter = command.value;', 'else { filter = command.value; selectedIndex = null; }', 'filter changes row selection: session 1', 'Response mismatch.'],
  ['cancel loses selection', "case 'cancel': draft = copy(saved); break;", "case 'cancel': draft = copy(saved); selectedIndex = null; break;", 'removal shifts selection: session 1', 'Response mismatch.'],
  ['cancel forgets next identifier', "case 'cancel': draft = copy(saved); break;", "case 'cancel': { const next = draft.nextId; draft = copy(saved); draft.nextId = next; break; }", 'cancel restores identifier counter: session 1', 'Response mismatch.'],
]) {
  test(`oracle catches ${name} through the intended assertion`, t => {
    const report = check(mutate(t, from, to));
    assert.equal(report.kind, 'candidate-comparison');
    assert.equal(report.status, 'comparison-failed');
    assert.equal(report.results.find(row => row.label === label)?.reason, reason);
    assert.equal(report.passed + report.failed + report.notRun, report.sessions);
  });
}

test('process failures and malformed output are distinguished from value mismatches', t => {
  for (const [code, reason] of [
    ["console.log('not json')", 'Output is not one JSON value.'],
    ["console.error('synthetic failure'); process.exit(7)", 'Exit status mismatch.'],
    ["process.stdout.write('x'.repeat(2*1024*1024))", 'Process failed, timed out, or exceeded output limit.'],
  ]) {
    const report = check(candidate(t, code));
    assert.equal(report.results[0].reason, reason);
    assert.equal(report.results[1].status, 'not-run');
    assert.equal(report.humanReview, 'pending');
  }
});
test('timeout is bounded and is not scored as a value comparison', t => {
  const report = check(candidate(t, 'setInterval(() => {}, 1000)'), { timeout: 150 });
  assert.equal(report.results[0].reason, 'Process failed, timed out, or exceeded output limit.');
  assert.equal(report.failed, 12); assert.equal(report.notRun, 4);
});
test('invalid commands are rejected before executing a candidate', t => {
  const dir = fixture(t), marker = path.join(dir, 'ran');
  const command = candidate(t, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'ran');`);
  for (const invalid of [null, [], ['node'], [123], [process.execPath, 'x\0y'], [...command, '--store']]) assert.throws(() => check(invalid));
  assert.throws(() => check(command, { timeout: 0 }));
  assert.equal(fs.existsSync(marker), false);
});

test('candidate packet contains only selected evidence, with reproducible hashes', t => {
  const dir = fixture(t), a = path.join(dir, 'packet A'), b = path.join(dir, 'packet B');
  const identity = prepare(a); assert.deepEqual(prepare(b), identity);
  assert.deepEqual(fs.readdirSync(a).sort(), ['TASK.md', 'identity.json', 'target']);
  assert.deepEqual(fs.readdirSync(path.join(a, 'target')), ['pocket-tasks.mjs']);
  for (const [file, hash] of Object.entries(identity.files)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(a, file))).digest('hex'), hash);
  assert.equal(JSON.stringify(identity).includes(dir), false);
  assert.throws(() => prepare(a));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(a, 'identity.json'), 'utf8')), identity);
  assert.throws(() => prepare(path.join(repo, 'must-not-create-trial')));
  assert.equal(fs.existsSync(path.join(repo, 'must-not-create-trial')), false);
});
test('packet rejects an existing file and a linked parent into the source checkout', t => {
  const dir = fixture(t), file = path.join(dir, 'existing'); fs.writeFileSync(file, 'keep');
  assert.throws(() => prepare(file)); assert.equal(fs.readFileSync(file, 'utf8'), 'keep');
  const linked = path.join(dir, 'source-link'); fs.symlinkSync(repo, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => prepare(path.join(linked, 'must-not-create-trial')));
  assert.equal(fs.existsSync(path.join(repo, 'must-not-create-trial')), false);
});

test('invalid or oversized input cannot save or overwrite a store', t => {
  const dir = fixture(t), file = path.join(dir, 'tasks.json');
  const original = '{"schema":1,"nextId":1,"items":[]}\n'; fs.writeFileSync(file, original);
  for (const input of ['{broken', '{}', JSON.stringify(Array(65).fill({ op: 'save' })), ' '.repeat(65537)]) {
    const result = run(dir, input); assert.equal(result.status, 2); assert.equal(result.stdout, ''); assert.ok(result.stderr.trim());
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
});
test('invalid schema, duplicate IDs and oversized stores are preserved', t => {
  const dir = fixture(t), file = path.join(dir, 'tasks.json');
  const row = { id: 't1', title: 'A', done: false };
  for (const value of [null, { schema: 2, nextId: 2, items: [row] }, { schema: 1, nextId: 2, items: [row, row] },
    { schema: 1, nextId: 1, items: [row] }, { schema: 1, nextId: 2, items: [{ ...row, done: 1 }] },
    { schema: 1, nextId: 2, items: [{ ...row, title: ' ' }] }, { schema: 1, nextId: 2, items: [row], extra: true }]) {
    const original = JSON.stringify(value); fs.writeFileSync(file, original);
    assert.equal(run(dir, [{ op: 'save' }]).status, 2); assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
  fs.writeFileSync(file, ' '.repeat(65537)); assert.equal(run(dir, []).status, 2); assert.equal(fs.statSync(file).size, 65537);
});
test('capacity and UTF-16 title boundaries are explicit', t => {
  const dir = fixture(t);
  const commands = [...Array.from({ length: 29 }, (_, n) => ({ op: 'add', title: `New ${n}` })), { op: 'add', title: 'Overflow' }];
  let result = JSON.parse(run(dir, commands).stdout);
  assert.equal(result[28].view.items.length, 32); assert.equal(result[29].error, 'capacity');
  result = JSON.parse(run(dir, [{ op: 'add', title: '😀'.repeat(40) }, { op: 'add', title: '😀'.repeat(41) }]).stdout);
  assert.equal(result[0].ok, true); assert.equal(result[1].error, 'invalid-title');
  fs.writeFileSync(path.join(dir, 'tasks.json'), JSON.stringify({ schema: 1, nextId: 1000000, items: [] }));
  result = JSON.parse(run(dir, [{ op: 'add', title: 'No identifiers left' }]).stdout);
  assert.equal(result[0].error, 'capacity');
});
test('save collision preserves existing data and a foreign pending file', t => {
  const dir = fixture(t), file = path.join(dir, 'tasks.json');
  const saved = '{"schema":1,"nextId":1,"items":[]}'; fs.writeFileSync(file, saved); fs.writeFileSync(file + '.pending', 'foreign');
  const result = JSON.parse(run(dir, [{ op: 'add', title: 'Draft' }, { op: 'save' }]).stdout);
  assert.equal(result[1].error, 'save-failed'); assert.equal(result[1].view.dirty, true);
  assert.equal(fs.readFileSync(file, 'utf8'), saved); assert.equal(fs.readFileSync(file + '.pending', 'utf8'), 'foreign');
});
test('store parent links and relative paths are rejected before writing', t => {
  const dir = fixture(t), outside = path.join(dir, 'outside'); fs.mkdirSync(outside);
  const link = path.join(dir, 'linked'); fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(run(dir, [{ op: 'save' }], path.join(link, 'tasks.json')).status, 2);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(run(dir, [{ op: 'save' }], 'tasks.json').status, 2);
});
test('CLI reports usage, reference comparisons and input errors with appropriate exits', t => {
  const cli = path.join(repo, 'evals/reference/check.mjs');
  const invoke = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 15000, windowsHide: true });
  assert.equal(invoke([]).status, 2);
  assert.equal(invoke(['--reference', 'extra']).status, 2);
  const dir = fixture(t), config = path.join(dir, 'command.json');
  fs.writeFileSync(config, JSON.stringify(referenceCommand));
  const success = invoke(['--command', config]); assert.equal(success.status, 0); assert.equal(JSON.parse(success.stdout).passed, 16);
  fs.writeFileSync(config, JSON.stringify(candidate(t, 'console.log("[]")')));
  assert.equal(invoke(['--command', config]).status, 1);
  for (const flag of ['--version', '--help']) assert.equal(spawnSync(process.execPath, [referenceCommand[1], flag]).status, 0);
});
