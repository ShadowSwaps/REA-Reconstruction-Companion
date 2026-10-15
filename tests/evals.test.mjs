import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runCheck } from '../evals/check.mjs';
import { casesFor, executableCases, vector } from '../evals/oracles.mjs';

const good = {
  function: `export function evaluate({a,b}) {
    if (![a,b].every(x => Number.isInteger(x) && x >= 0 && x <= 255)) return null;
    return Math.min(255, a + b);
  }`,
  format: `export function evaluate(hex) {
    if (typeof hex !== 'string' || !/^(?:[a-fA-F0-9]{2})*$/.test(hex)) return null;
    const b = Buffer.from(hex, 'hex');
    if (b.length < 4 || b[0] !== 0x52 || b[1] !== 1 || b.length !== b[2] + 4) return null;
    const payload = [...b.subarray(3, -1)];
    if (payload.reduce((a, x) => a + x, 0) % 256 !== b[b.length-1]) return null;
    return payload;
  }`,
  workflow: `export function evaluate(actions) {
    let stored = 'A', draft = 'A';
    return actions.map(action => {
      if (action.type === 'edit') draft = action.value;
      else if (action.type === 'save') stored = draft;
      else draft = stored;
      return {stored, draft};
    });
  }`,
  crypto: `import {createCipheriv, createDecipheriv} from 'node:crypto';
  export function evaluate(input) {
    try {
      const encrypt = input.operation === 'encrypt';
      if (!encrypt && input.operation !== 'decrypt') return null;
      const fields = ['key', 'nonce', 'aad', ...(encrypt ? ['plaintext'] : ['ciphertext','tag'])];
      if (!fields.every(f => typeof input[f] === 'string' && /^(?:[0-9a-f]{2})*$/.test(input[f]))) return null;
      const bytes = Object.fromEntries(fields.map(f => [f, Buffer.from(input[f], 'hex')]));
      if (bytes.key.length !== 32 || bytes.nonce.length !== 12 || (!encrypt && bytes.tag.length !== 16)) return null;
      const c = (encrypt ? createCipheriv : createDecipheriv)('chacha20-poly1305', bytes.key, bytes.nonce, {authTagLength:16});
      c.setAAD(bytes.aad);
      if (!encrypt) c.setAuthTag(bytes.tag);
      const partial = c.update(encrypt ? bytes.plaintext : bytes.ciphertext);
      const output = Buffer.concat([partial, c.final()]).toString('hex');
      return encrypt ? {ciphertext: output, tag: c.getAuthTag().toString('hex')} : output;
    } catch { return null; }
  }`,
};

function fixture(t, source) {
  const parent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'rea-eval-test-'));
  t.after(() => {
    const absolute = path.resolve(directory);
    assert.equal(path.dirname(absolute), parent);
    assert.ok(path.basename(absolute).startsWith('rea-eval-test-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  const candidate = path.join(directory, 'candidate with spaces ø.mjs');
  fs.writeFileSync(candidate, source);
  return candidate;
}

for (const id of executableCases) {
  test(`independent ${id} oracle accepts correct fixture but keeps human review pending`, t => {
    const report = runCheck(id, fixture(t, good[id]));
    assert.equal(report.status, 'comparisons-passed');
    assert.equal(report.passed, casesFor(id).length);
    assert.equal(report.failed, 0);
    assert.equal(report.humanReview, 'pending');
  });
}

const mutants = [
  ['function', 'saturation removed', good.function.replace('Math.min(255, a + b)', 'a + b'), '255+1'],
  ['function', 'zero rejected', good.function.replace('x >= 0', 'x > 0'), '0+0'],
  ['function', 'invalid types coerced', 'export function evaluate({a,b}) { return Math.min(255, Number(a) + Number(b)); }', 'invalid-left'],
  ['format', 'checksum ignored', good.format.replace('return null;\n    return payload;', 'return payload;\n    return payload;'), 'checksum-0'],
  ['format', 'version ignored', good.format.replace('b[1] !== 1 || ', ''), 'version-1'],
  ['workflow', 'save omitted', good.workflow.replace('stored = draft;', 'stored = stored;'), 'save-restart'],
  ['workflow', 'cancel discards saved state', good.workflow.replace('else draft = stored;', "else draft = 'A';"), 'save-edit-cancel'],
  ['crypto', 'plaintext returned before authentication', good.crypto.replace('Buffer.concat([partial, c.final()])', 'Buffer.concat([partial, encrypt ? c.final() : Buffer.alloc(0)])'), 'wrong-tag'],
];
for (const [id, title, source, label] of mutants) {
  test(`oracle catches deliberate defect: ${title}`, t => {
    const report = runCheck(id, fixture(t, source));
    assert.equal(report.status, 'comparison-failed');
    assert.ok(report.failures.includes(label), JSON.stringify(report));
  });
}

test('generated fixtures are deterministic and fresh across calls', () => {
  for (const id of executableCases) {
    const first = casesFor(id), second = casesFor(id);
    assert.deepEqual(first, second);
    first[0].expected = 'changed';
    assert.notDeepEqual(first, casesFor(id));
  }
});

test('crypto fixture rejects every modified or malformed input and verifies both directions', () => {
  const cases = casesFor('crypto');
  assert.deepEqual(cases[0].expected, { ciphertext: vector.ciphertext, tag: vector.tag });
  assert.equal(cases[1].expected, vector.plaintext);
  assert.ok(cases.slice(2, -1).every(c => c.expected === null));
  for (const field of ['key', 'nonce', 'aad', 'ciphertext', 'tag']) assert.ok(cases.some(c => c.label === `wrong-${field}`));
});

test('throws and non-JSON returns cannot masquerade as successful rejection', t => {
  for (const body of ['throw new Error("failure")', 'return NaN', 'return undefined', 'return new Date(0)']) {
    const report = runCheck('function', fixture(t, `export function evaluate() { ${body}; }`));
    assert.equal(report.passed, 0);
    assert.equal(report.failed, report.total);
  }
});

test('mutating candidate inputs cannot alter the parent oracle', t => {
  const report = runCheck('workflow', fixture(t, `export function evaluate(actions) { actions.length = 0; return []; }`));
  assert.equal(report.status, 'comparison-failed');
  assert.ok(report.failures.includes('save-restart'));
});

test('missing export, invalid stdout and early exit are harness failures', t => {
  for (const source of ['export const answer = 1;', 'console.log("noise"); export function evaluate() {return null;}', 'process.exit(0);']) {
    const report = runCheck('function', fixture(t, source));
    assert.equal(report.status, 'harness-error');
    assert.equal(report.passed, 0);
    assert.equal(report.humanReview, 'pending');
  }
});

test('unknown/manual cases and invalid time budgets fail before candidate execution', t => {
  const candidate = fixture(t, good.function);
  for (const id of ['backend', '../function', 'unknown']) assert.throws(() => runCheck(id, candidate), /No executable oracle/);
  for (const timeout of [0, -1, 10001, Infinity, 1.5]) assert.throws(() => runCheck('function', candidate, { timeout }), /Timeout/);
});

test('an accidental hang is bounded and never counted as a useful mutation kill', t => {
  const report = runCheck('function', fixture(t, 'export function evaluate() { while (true) {} }'), { timeout: 300 });
  assert.equal(report.status, 'harness-error');
  assert.equal(report.reason, 'timeout');
  assert.equal(report.passed, 0);
  assert.equal(report.failed, 0);
});

test('CLI reports machine-readable results and correct exit status', t => {
  const script = fileURLToPath(new URL('../evals/check.mjs', import.meta.url));
  for (const [source, status] of [[good.function, 0], ['export function evaluate() {return null;}', 1]]) {
    const result = spawnSync(process.execPath, [script, 'function', fixture(t, source)], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    assert.equal(result.status, status, result.stderr);
    assert.equal(JSON.parse(result.stdout).humanReview, 'pending');
  }
  const missingArgs = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 15000, windowsHide: true });
  assert.equal(missingArgs.status, 1);
  assert.match(missingArgs.stderr, /Usage:/);
});
