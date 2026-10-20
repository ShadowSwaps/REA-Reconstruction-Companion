import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runTrial, verifyFreeze } from '../evals/reconstruction-security/run.mjs';
import { createBoundary } from '../evals/reconstruction-security/boundary.mjs';
const directory = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rea-security-')), 'case');
test('selected boundary executes literal positive, negative and retained cases', () => {
  assert.equal(runTrial(directory()).status, 'selected-boundary-passed'); verifyFreeze();
});
const faults = [
  ['UI-only authorization', options => { const b = createBoundary(options); return { ...b, dispatch: (_, op, bytes) => b.dispatch('write', op, bytes) }; }, /direct unauthorized import undefined/],
  ['accept request principal', options => { const b = createBoundary(options); return { ...b, dispatch: (h, op, bytes) => b.dispatch(typeof h === 'object' && h?.role === 'writer' ? 'write' : h, op, bytes) }; }, /spoofed principal/],
  ['discard size rejection', options => { const b = createBoundary(options); return { ...b, dispatch(h, op, bytes) { const r = b.dispatch(h, op, bytes); return r.code === 'size' ? { ok: true, rows: [] } : r; } }; }, /byte budget/],
  ['discard depth rejection', options => { const b = createBoundary(options); return { ...b, dispatch(h, op, bytes) { const r = b.dispatch(h, op, bytes); return r.code === 'depth' ? { ok: true, rows: [] } : r; } }; }, /depth budget/],
  ['leak session metadata in diagnostics', options => { const b = createBoundary(options); return { ...b, diagnostics: () => [...b.diagnostics(), { code: 'ok', token: options.resolveSession('write').token }] }; }, /diagnostic projection/],
  ['leak token into export', options => { const b = createBoundary(options); return { ...b, dispatch(h, op, bytes) { const r = b.dispatch(h, op, bytes); return r.ok && op === 'export' ? { ...r, text: r.text + options.resolveSession('write').token } : r; } }; }, /literal export/],
  ['commit despite late rejection', options => { const b = createBoundary(options); return { ...b, dispatch(h, op, bytes) { const r = b.dispatch(h, op, bytes); if (op === 'import' && r.code === 'schema' && bytes instanceof Uint8Array && Buffer.from(bytes).includes(Buffer.from('late'))) fs.writeFileSync(options.file, '{}'); return r; } }; }, /late invalid row: exact prior bytes/]
];
for (const [name, factory, pattern] of faults) test('actual trial rejects faulty boundary: ' + name, () => {
  assert.throws(() => runTrial(directory(), factory), error => {
    assert.equal(error.code, 'ERR_ASSERTION'); assert.match(error.message, pattern); return true;
  });
});
test('actual projection rejects HTML sink mutation', () => {
  assert.throws(() => runTrial(directory(), createBoundary, (element, text) => { element.innerHTML = text; }), /HTML sink used/);
});
test('run refuses an existing destination without overwriting evidence', () => {
  const dir = directory(); runTrial(dir);
  const saved = fs.readFileSync(path.join(dir, 'result.json'));
  assert.throws(() => runTrial(dir), { code: 'EEXIST' });
  assert.deepEqual(fs.readFileSync(path.join(dir, 'result.json')), saved);
});
