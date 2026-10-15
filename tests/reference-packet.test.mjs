import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prepare, verifyPacket } from '../evals/reference/prepare.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'evals/reference/prepare.mjs');
function fixture(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-packet-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-packet-test-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const packet = path.join(dir, 'packet Ω with spaces');
  const identity = prepare(packet);
  return { dir, packet, identity };
}
function contents(directory) {
  return fs.readdirSync(directory).sort().flatMap(name => {
    const file = path.join(directory, name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return [[name, 'link', fs.readlinkSync(file)]];
    return stat.isDirectory() ? contents(file).map(row => [`${name}/${row[0]}`, ...row.slice(1)]) : [[name, 'file', fs.readFileSync(file).toString('hex')]];
  });
}
function refusesWithoutChanges(packet) {
  const before = contents(packet);
  assert.throws(() => verifyPacket(packet), /Reference evidence is missing, linked, invalid, or differs/);
  assert.deepEqual(contents(packet), before);
}

test('packet verification is read-only, repeatable and scoped to evidence', t => {
  const { packet, identity } = fixture(t);
  fs.mkdirSync(path.join(packet, 'candidate'));
  fs.writeFileSync(path.join(packet, 'candidate', 'do-not-execute.mjs'), "throw new Error('Not evidence');");
  fs.writeFileSync(path.join(packet, 'tasks.json'), '{draft output}');
  const before = contents(packet);
  const expected = { ...identity, status: 'verified', scope: 'reference-evidence-only', humanReview: 'pending', reaTrial: 'unverified' };
  assert.deepEqual(verifyPacket(packet), expected); assert.deepEqual(verifyPacket(packet), expected);
  assert.deepEqual(contents(packet), before);
  assert.equal(JSON.stringify(expected).includes(packet), false);
});
for (const relative of ['TASK.md', 'target/pocket-tasks.mjs']) {
  test(`packet verifier detects modified ${relative}, even with rewritten packet hashes`, t => {
    const { packet, identity } = fixture(t), file = path.join(packet, relative);
    // Same-size modification exercises content comparison, not just file size.
    const bytes = fs.readFileSync(file); bytes[0] ^= 1; fs.writeFileSync(file, bytes);
    refusesWithoutChanges(packet);
    identity.files[relative] = createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(path.join(packet, 'identity.json'), JSON.stringify(identity));
    refusesWithoutChanges(packet);
  });
}
test('missing evidence, missing identity and truncated/oversized evidence fail without repair', t => {
  for (const relative of ['TASK.md', 'target/pocket-tasks.mjs', 'identity.json']) {
    const { packet } = fixture(t); fs.unlinkSync(path.join(packet, relative)); refusesWithoutChanges(packet);
  }
  for (const mode of ['short', 'long']) {
    const { packet } = fixture(t), file = path.join(packet, 'TASK.md');
    if (mode === 'short') fs.writeFileSync(file, 'short'); else fs.appendFileSync(file, 'extra');
    refusesWithoutChanges(packet);
  }
});
test('untrusted identity metadata and paths are rejected, not followed or printed', t => {
  const { packet, identity, dir } = fixture(t);
  const outside = path.join(dir, 'outside.txt'); fs.writeFileSync(outside, 'private sentinel');
  const variants = [null, [], {}, { ...identity, schema: 2 }, { ...identity, target: 'Other' }, { ...identity, version: '9.0.0' },
    { ...identity, extra: 'untrusted sentinel' }, { ...identity, files: { ...identity.files, '../outside.txt': '0'.repeat(64) } },
    { ...identity, files: { [outside]: '0'.repeat(64) } }, { ...identity, files: {} }];
  for (const value of variants) {
    fs.writeFileSync(path.join(packet, 'identity.json'), JSON.stringify(value)); refusesWithoutChanges(packet);
  }
  assert.equal(fs.readFileSync(outside, 'utf8'), 'private sentinel');
});
test('malformed and oversized identity files fail; formatting alone is irrelevant', t => {
  const { packet, identity } = fixture(t), file = path.join(packet, 'identity.json');
  for (const value of ['{broken', ' '.repeat(16385)]) { fs.writeFileSync(file, value); refusesWithoutChanges(packet); }
  fs.writeFileSync(file, JSON.stringify({ files: identity.files, version: identity.version, target: identity.target, schema: 1 }));
  assert.equal(verifyPacket(packet).status, 'verified');
});
test('packet root and evidence-directory links are refused without touching their targets', t => {
  const { dir, packet } = fixture(t);
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  const link = path.join(dir, 'packet-link'); fs.symlinkSync(packet, link, type);
  const before = contents(packet); assert.throws(() => verifyPacket(link)); assert.deepEqual(contents(packet), before);
  const movedTarget = path.join(dir, 'original-target');
  // Both resolved move endpoints are inside this fresh test fixture.
  assert.equal(path.dirname(path.resolve(movedTarget)), dir);
  assert.equal(path.dirname(path.resolve(packet)), dir);
  fs.renameSync(path.join(packet, 'target'), movedTarget);
  fs.symlinkSync(movedTarget, path.join(packet, 'target'), type);
  refusesWithoutChanges(packet);
  assert.deepEqual(fs.readdirSync(movedTarget), ['pocket-tasks.mjs']);
});
test('non-file evidence and invalid directory inputs are rejected', t => {
  const { dir, packet } = fixture(t);
  const file = path.join(packet, 'identity.json'); fs.unlinkSync(file); fs.mkdirSync(file);
  refusesWithoutChanges(packet);
  for (const value of ['', null, {}, path.join(dir, 'missing'), path.join(packet, 'TASK.md')]) assert.throws(() => verifyPacket(value));
});
test('verification never executes evidence, even when its hash is self-consistent', t => {
  const { dir, packet, identity } = fixture(t), marker = path.join(dir, 'executed');
  const program = `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'bad');`;
  fs.writeFileSync(path.join(packet, 'target/pocket-tasks.mjs'), program);
  identity.files['target/pocket-tasks.mjs'] = createHash('sha256').update(program).digest('hex');
  fs.writeFileSync(path.join(packet, 'identity.json'), JSON.stringify(identity));
  refusesWithoutChanges(packet); assert.equal(fs.existsSync(marker), false);
});
test('verification CLI produces a scoped report and nonzero, redacted failure', t => {
  const { packet } = fixture(t);
  const invoke = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  const success = invoke(['--verify', packet]); assert.equal(success.status, 0);
  assert.equal(JSON.parse(success.stdout).scope, 'reference-evidence-only');
  fs.writeFileSync(path.join(packet, 'identity.json'), '{sensitive sentinel');
  const failure = invoke(['--verify', packet]); assert.equal(failure.status, 1); assert.equal(failure.stdout, '');
  assert.equal(failure.stderr.includes('sensitive sentinel'), false); assert.equal(failure.stderr.includes(packet), false);
  assert.equal(invoke(['--verify']).status, 1); assert.equal(invoke(['--verify', packet, 'extra']).status, 1);
  assert.equal(invoke(['--unknown']).status, 1);
});
