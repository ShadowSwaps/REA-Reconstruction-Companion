import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const reference = fileURLToPath(new URL('../evals/reference/', import.meta.url));
const target = path.join(reference, 'target', 'pocket-tasks.mjs');
const trace = JSON.parse(fs.readFileSync(path.join(reference, 'walkthrough', 'runtime-observations.json'), 'utf8'));
const excerpt = JSON.parse(fs.readFileSync(path.join(reference, 'walkthrough', 'rea-excerpt.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Replay only the repository-owned target. Never take executable/path arguments from the trace.
const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

test('walkthrough observations and REA excerpt refer to the frozen artifact', () => {
  assert.equal(trace.targetSha256, hash(fs.readFileSync(target)));
  assert.equal(excerpt.artifact.sha256, trace.targetSha256);
  assert.equal(excerpt.artifact.bytes, fs.statSync(target).size);
  assert.equal(excerpt.canonicalEvidence, false);
  assert.equal(trace.kind, 'maintainer-observation');
});

for (const scenario of trace.scenarios) {
  test(`walkthrough ${scenario.id}: ${scenario.question}`, t => {
    const parent = fs.realpathSync.native(os.tmpdir());
    const dir = fs.mkdtempSync(path.join(parent, 'rea-walkthrough-test-'));
    t.after(() => {
      assert.equal(path.dirname(path.resolve(dir)), parent);
      assert.ok(path.basename(dir).startsWith('rea-walkthrough-test-'));
      assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const store = path.join(dir, 'tasks.json'), pending = `${store}.pending`;
    if (scenario.initialStore !== null) fs.writeFileSync(store, scenario.initialStore);
    if (scenario.initialPending !== null) fs.writeFileSync(pending, scenario.initialPending);
    for (const [index, session] of scenario.sessions.entries()) {
      const result = spawnSync(process.execPath, [target, '--store', store], {
        input: session.input, encoding: 'utf8', cwd: dir, env, shell: false,
        timeout: 5000, maxBuffer: 1024 * 1024, windowsHide: true,
      });
      const label = `${scenario.id} session ${index + 1}`;
      assert.equal(result.error, undefined, `${label}: process failure`);
      assert.equal(result.signal, null, `${label}: signal`);
      assert.equal(result.status, session.exitCode, `${label}: exit status`);
      assert.equal(result.stdout, session.stdout, `${label}: stdout`);
      assert.equal(result.stderr, session.stderr, `${label}: stderr`);
      assert.equal(read(store), session.storeAfter, `${label}: stored bytes`);
      assert.equal(read(pending), session.pendingAfter, `${label}: pending bytes`);
    }
  });
}
