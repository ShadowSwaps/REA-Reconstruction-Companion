import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBoundary, renderText } from './boundary.mjs';
import { createStore } from '../safe-changes/baseline.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
export function verifyFreeze() {
  for (const [name, digest] of Object.entries(read('identity.json').files))
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(here, name))).digest('hex'), digest, 'frozen source: ' + name);
}
export function runTrial(directory, factory = createBoundary, render = renderText) {
  verifyFreeze();
  fs.mkdirSync(directory); // Exclusive fresh directory; never reset an old run.
  const expected = read('expectations.json'), file = path.join(directory, 'active.json');
  const [token, contact] = expected.syntheticMarkers;
  const sessions = new Map([
    ['write', { role: 'writer', ledger: 'demo', token, contact }],
    ['read', { role: 'reader', ledger: 'demo', token, contact }],
    ['other', { role: 'writer', ledger: 'other', token, contact }],
    ['unknown-role', { role: 'admin', ledger: 'demo', token, contact }]
  ]);
  const options = { file, resolveSession: handle => sessions.get(handle) };
  const boundary = factory(options), input = Buffer.from(JSON.stringify(expected.input));
  assert.deepEqual(boundary.dispatch('write', 'import', input), { ok: true, rows: expected.rows }, 'allowed import');
  assert.deepEqual(boundary.dispatch('read', 'export'), { ok: true, text: expected.exportText }, 'literal export');
  const original = fs.readFileSync(file);
  function rejected(handle, operation, bytes, code, label) {
    assert.deepEqual(boundary.dispatch(handle, operation, bytes), { ok: false, code }, label);
    assert.deepEqual(fs.readFileSync(file), original, label + ': exact prior bytes');
    assert.deepEqual(boundary.dispatch('read', 'export'), { ok: true, text: expected.exportText }, label + ': prior state');
  }
  for (const handle of [undefined, 'other', 'unknown-role']) for (const op of ['import', 'export', 'display'])
    rejected(handle, op, input, 'denied', 'direct unauthorized ' + op + ' ' + String(handle));
  rejected('read', 'import', input, 'denied', 'reader cannot import');
  rejected({ role: 'writer', ledger: 'demo' }, 'import', input, 'denied', 'spoofed principal is not a session');
  rejected('write', 'delete-all', input, 'denied', 'unknown operation');
  const malformed = [
    [Buffer.from('x'.repeat(expected.limits.bytes + 1)), 'size', 'byte budget'],
    [Buffer.from('['.repeat(expected.limits.depth + 1) + ']'.repeat(expected.limits.depth + 1)), 'depth', 'depth budget'],
    [Buffer.from([0xc3, 0x28]), 'encoding', 'invalid UTF-8'],
    [Buffer.from('{'), 'syntax', 'malformed JSON'],
    [Buffer.from(JSON.stringify({ ...expected.input, token, contact })), 'schema', 'sensitive unknown fields'],
    [Buffer.from('{"format":"pocket-ledger","version":2,"entries":[],"__proto__":{"role":"writer"}}'), 'schema', 'prototype-like field'],
    [Buffer.from(JSON.stringify({ ...expected.input, entries: [...expected.rows, { id: 'c', title: 'late', done: 'true' }] })), 'schema', 'late invalid row'],
    ['caller string', 'schema', 'byte type']
  ];
  for (const [bytes, code, label] of malformed) rejected('write', 'import', bytes, code, label);
  assert.equal(Object.prototype.role, undefined, 'no prototype modification');
  const display = boundary.dispatch('read', 'display');
  assert.deepEqual(display, { ok: true, text: expected.displayText }, 'literal display');
  let textValue;
  render({ set textContent(value) { textValue = value; }, set innerHTML(_) { assert.fail('HTML sink used'); } }, display.text);
  assert.equal(textValue, expected.displayText, 'text sink');
  assert.deepEqual(createStore({ file }).state(), expected.rows, 'reopen data');
  const events = boundary.diagnostics();
  for (const event of events) {
    assert.deepEqual(Object.keys(event), ['code'], 'diagnostic projection');
    assert.ok(['ok', 'denied', 'size', 'depth', 'encoding', 'syntax', 'schema'].includes(event.code), 'fixed diagnostic code');
  }
  const report = { status: 'selected-boundary-passed', authentication: 'simulated',
    malformedCases: malformed.length, unauthorizedCases: 12, events: events.length,
    limitations: 'finite source-exposed same-agent local checks; no real auth, browser, provider, penetration or model evaluation' };
  // Check all selected observable surfaces, including the report being saved.
  const surfaces = [original.toString('utf8'), expected.exportText, JSON.stringify(display),
    JSON.stringify(events), JSON.stringify(report)];
  for (const marker of expected.syntheticMarkers) for (const surface of surfaces)
    assert.equal(surface.includes(marker), false, 'synthetic marker leakage');
  // Retain the old schema, and strings containing container/escape characters.
  const legacy = boundary.dispatch('write', 'import', Buffer.from(expected.legacyInput));
  assert.deepEqual(legacy, { ok: true, rows: expected.legacyRows }, 'legacy import');
  assert.equal(createStore({ file }).exportBytes(1).toString('utf8'), expected.legacyExport, 'legacy export');
  const quoted = { format: 'pocket-ledger', version: 2, entries: [{ id: 'q', title: '[{\\"}]', done: false }] };
  assert.deepEqual(boundary.dispatch('write', 'import', Buffer.from(JSON.stringify(quoted))), { ok: true, rows: quoted.entries }, 'quoted containers');
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    assert.equal(process.argv.length, 3, 'Usage: node evals/reconstruction-security/run.mjs NEW_DIRECTORY');
    console.log(JSON.stringify(runTrial(path.resolve(process.argv[2]))));
  } catch (error) { console.error(error.code || error.name, error.message); process.exitCode = 2; }
}
