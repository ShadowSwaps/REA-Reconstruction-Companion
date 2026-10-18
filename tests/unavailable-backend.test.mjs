import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runCheck } from '../evals/check.mjs';
import { backendCases } from '../evals/backend-oracles.mjs';
import { casesFor } from '../evals/oracles.mjs';
import { evaluate } from '../evals/unavailable-backend/candidate.mjs';

const candidate = fileURLToPath(new URL('../evals/unavailable-backend/candidate.mjs', import.meta.url));
test('proposed backend-local contract passes through existing process checker', () => {
  const report = runCheck('backend-local', candidate);
  assert.equal(report.status, 'comparisons-passed', JSON.stringify(report));
  assert.equal(report.passed, backendCases().length);
  assert.equal(report.humanReview, 'pending');
});

for (const [name, mutation, label] of [
  ['remote verification from local save', 'r.remoteVerified = true;', 'local-save-reopen'],
  ['false synchronized status', "r.synchronization = 'synchronized';", 'deferred-local-still-pending'],
  ['false remote completion', "r.status = 'remote-complete';", 'replay-does-not-synchronize'],
  ['mismatching replay observation', "if(r.mode === 'replay' && r.items) r.items = ['wrong'];", 'replay-does-not-synchronize'],
  ['unavailable treated as empty', "if(r.error === 'unavailable') { r.items = []; r.status = 'ready'; r.error = null; }", 'unavailable-not-empty'],
  ['lost draft on rejected save', "if(r.error === 'local-write-failed') r.draft = r.saved;", 'failed-save-keeps-draft-bytes'],
]) test(`actual checker rejects ${name}`, t => {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-backend-mutation-'));
  t.after(() => {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith('rea-backend-mutation-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const target = path.join(dir, 'candidate.mjs');
  fs.writeFileSync(target, `import {evaluate as original} from ${JSON.stringify(pathToFileURL(candidate).href)};
export function evaluate(input) { const r = original(input); if(r) { ${mutation} } return r; }`);
  const report = runCheck('backend-local', target);
  assert.equal(report.status, 'comparison-failed', JSON.stringify(report));
  assert.equal(report.errored, 0, JSON.stringify(report));
  assert.ok(report.failureDetails.some(f => f.label === label && f.reason === 'value-mismatch'), JSON.stringify(report));
});

test('reviewed candidate static imports contain only standard-library modules', () => {
  const source = fs.readFileSync(candidate, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual(imports, ['node:fs', 'node:os', 'node:path', 'node:util']);
});

test('editing nested backend fixtures cannot contaminate later checker runs', () => {
  const original = casesFor('backend-local');
  const changed = casesFor('backend-local');
  changed[0].input.actions[0].text = 'changed';
  changed.find(c => c.label === 'replay-does-not-synchronize').input.recordings[0].response.items[0] = 'changed';
  changed.find(c => c.label === 'replay-does-not-synchronize').expected.items[0] = 'changed';
  assert.deepEqual(casesFor('backend-local'), original);
});

test('replay matches complete requests structurally, without key order dependency', () => {
  const r = evaluate({ mode: 'replay', actions: [{ type: 'list', collection: 'notes' }],
    recordings: [{ request: { collection: 'notes', operation: 'list' }, response: { kind: 'ok', items: ['x'] } }] });
  assert.deepEqual(r.items, ['x']);
  assert.equal(r.remoteVerified, false);
});

test('reject malformed action and store partitions without creating a remote mode', () => {
  for (const input of [null, {}, { mode: 'local', actions: [{ type: 'save', reject: false }] },
    { mode: 'local', actions: [], initialBytes: null }, { mode: 'local', actions: [], extra: 'x' },
    { mode: 'replay', actions: [], recordings: Array(17).fill({}) }]) assert.equal(evaluate(input), null);
  for (const initialBytes of ['', 'null', '{"text":null}', '{"text":"A","extra":1}']) {
    const r = evaluate({ mode: 'local', actions: [{ type: 'save' }], initialBytes });
    assert.equal(r.error, 'malformed-store');
    assert.equal(r.storeBytes, initialBytes);
    assert.equal(r.saved, null);
  }
});
