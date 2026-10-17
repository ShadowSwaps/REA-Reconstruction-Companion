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

// Selection-profile candidates are exercised in selection-evals.test.mjs.
for (const id of Object.keys(good)) {
  test(`independent ${id} oracle accepts correct fixture but keeps human review pending`, t => {
    const report = runCheck(id, fixture(t, good[id]));
    assert.equal(report.status, 'comparisons-passed', JSON.stringify(report));
    assert.equal(report.passed, casesFor(id).length);
    assert.equal(report.failed, 0);
    assert.equal(report.humanReview, 'pending');
  });
}

const mutants = [
  ['function', 'saturation removed', good.function.replace('Math.min(255, a + b)', 'a + b'), '255+1'],
  ['function', 'zero rejected', good.function.replace('x >= 0', 'x > 0'), '0+0'],
  ['function', 'invalid types coerced', 'export function evaluate({a,b}) { const n = Math.min(255, Number(a) + Number(b)); return Number.isFinite(n) ? n : null; }', 'invalid-left-string'],
  ['function', 'missing operands default to zero', good.function.replace('{a,b}', '{a=0,b=0}'), 'missing-left'],
  ['format', 'checksum ignored', good.format.replace('return null;\n    return payload;', 'return payload;\n    return payload;'), 'checksum-0'],
  ['format', 'version ignored', good.format.replace('b[1] !== 1 || ', ''), 'version-1'],
  ['format', 'whitespace silently trimmed', good.format.replace('evaluate(hex) {', "evaluate(hex) { if (typeof hex === 'string') hex = hex.trim();"), 'suffix-space-0'],
  ['workflow', 'save omitted', good.workflow.replace('stored = draft;', 'stored = stored;'), 'save-restart'],
  ['workflow', 'cancel discards saved state', good.workflow.replace('else draft = stored;', "else draft = 'A';"), 'save-edit-cancel'],
  ['workflow', 'draft text silently trimmed', good.workflow.replace('draft = action.value;', 'draft = action.value.trim();'), 'preserve-text'],
  ['workflow', 'snapshots alias mutable state', `export function evaluate(actions) {
    const state = {stored:'A',draft:'A'};
    return actions.map(a => { if (a.type === 'edit') state.draft = a.value;
      else if (a.type === 'save') state.stored = state.draft; else state.draft = state.stored;
      return state; });
  }`, 'unsaved-restart'],
  ['crypto', 'plaintext returned before authentication', good.crypto.replace('Buffer.concat([partial, c.final()])', 'Buffer.concat([partial, encrypt ? c.final() : Buffer.alloc(0)])'), 'wrong-tag'],
  ['crypto', 'uppercase hex accepted', good.crypto.replace(')*$/.test', ')*$/i.test'), 'encrypt-key-uppercase'],
  ['crypto', 'missing AAD silently defaulted', good.crypto.replace('try {', "try { input = {...input, aad: input.aad ?? ''};"), 'encrypt-aad-missing'],
  ['crypto', 'empty plaintext rejected', good.crypto.replace('try {', "try { if(input?.operation === 'encrypt' && input.plaintext === '') return null;"), 'wycheproof-3-encrypt'],
  ['crypto', 'empty ciphertext rejected', good.crypto.replace('try {', "try { if(input?.operation === 'decrypt' && input.ciphertext === '') return null;"), 'wycheproof-3-decrypt'],
  ['crypto', 'empty AAD rejected', good.crypto.replace('try {', "try { if(input?.aad === '') return null;"), 'wycheproof-4-encrypt'],
  ['crypto', 'empty ciphertext bypasses authentication', good.crypto.replace('try {', "try { if(input?.operation === 'decrypt' && input.ciphertext === '') return '';"), 'wycheproof-2-wrong-tag-15'],
];
for (const [id, title, source, label] of mutants) {
  test(`oracle catches deliberate defect: ${title}`, t => {
    const report = runCheck(id, fixture(t, source));
    assert.equal(report.status, 'comparison-failed', JSON.stringify(report));
    assert.ok(report.failures.includes(label), JSON.stringify(report));
    assert.ok(report.failureDetails.some(f => f.label === label && f.reason === 'value-mismatch'));
    assert.equal(report.errored, 0);
  });
}

test('generated fixtures are deterministic and fresh across calls', () => {
  for (const id of executableCases) {
    const first = casesFor(id), second = casesFor(id);
    assert.deepEqual(first, second);
    assert.equal(new Set(first.map(c => c.label)).size, first.length, `${id} labels must identify one input`);
    first[0].expected = 'changed';
    assert.notDeepEqual(first, casesFor(id));
  }
});

test('crypto fixture rejects every modified or malformed input and verifies both directions', () => {
  const cases = casesFor('crypto').filter(c => !c.label.startsWith('wycheproof-'));
  assert.deepEqual(cases[0].expected, { ciphertext: vector.ciphertext, tag: vector.tag });
  assert.equal(cases[1].expected, vector.plaintext);
  assert.ok(cases.slice(2, -1).every(c => c.expected === null));
  for (const field of ['key', 'nonce', 'aad', 'ciphertext', 'tag']) assert.ok(cases.some(c => c.label === `wrong-${field}`));
});

test('empty-message vectors distinguish successful empty plaintext from authentication failure', t => {
  const candidate = fixture(t, good.crypto);
  const correct = runCheck('crypto', candidate);
  assert.equal(correct.status, 'comparisons-passed', JSON.stringify(correct));
  const source = good.crypto.replace('try {', "try { if(input?.operation === 'decrypt' && input.ciphertext === '') return ''; ");
  const bypass = runCheck('crypto', fixture(t, source));
  assert.equal(bypass.status, 'comparison-failed', JSON.stringify(bypass));
  assert.equal(bypass.errored, 0);
  for (const id of [2, 3]) {
    const cases = casesFor('crypto');
    assert.equal(cases.find(c => c.label === `wycheproof-${id}-decrypt`).expected, '');
    for (const suffix of ['wrong-tag-0', 'wrong-tag-15', 'wrong-key', 'wrong-nonce', 'wrong-aad']) {
      assert.ok(bypass.failureDetails.some(f => f.label === `wycheproof-${id}-${suffix}` && f.reason === 'value-mismatch'));
    }
    assert.ok(!bypass.failures.includes(`wycheproof-${id}-decrypt`));
  }
  assert.equal(bypass.humanReview, 'pending');
});

test('throws and non-JSON returns cannot masquerade as successful rejection', t => {
  for (const body of ['throw new Error("failure")', 'return NaN', 'return Infinity', 'return undefined', 'return new Date(0)', 'return 1n', 'return {nested:undefined}', 'const v = {}; v.self=v; return v']) {
    const report = runCheck('function', fixture(t, `export function evaluate() { ${body}; }`));
    assert.equal(report.status, 'candidate-error', JSON.stringify(report));
    assert.equal(report.passed, 0);
    assert.equal(report.failed, report.total);
    assert.equal(report.errored, report.total);
    assert.equal(report.compared, 0);
    assert.equal(report.notEvaluated, 0);
    assert.ok(report.failureDetails.every(f => f.reason === (body.startsWith('throw') ? 'candidate-threw' : 'non-json-result')));
  }
});

test('mutating candidate inputs cannot alter the parent oracle', t => {
  const report = runCheck('workflow', fixture(t, `export function evaluate(actions) { actions.length = 0; return []; }`));
  assert.equal(report.status, 'comparison-failed', JSON.stringify(report));
  assert.ok(report.failures.includes('save-restart'));
});

test('missing export, invalid stdout and early exit are harness failures', t => {
  for (const source of ['export const answer = 1;', 'console.log("noise"); export function evaluate() {return null;}', 'process.exit(0);']) {
    const report = runCheck('function', fixture(t, source));
    assert.equal(report.status, 'harness-error', JSON.stringify(report));
    assert.equal(report.passed, 0);
    assert.equal(report.humanReview, 'pending');
    assert.equal(report.notEvaluated, report.total);
  }
});

test('unknown/manual cases and invalid time budgets fail before candidate execution', t => {
  const candidate = fixture(t, good.function);
  for (const id of ['backend', '../function', 'unknown']) assert.throws(() => runCheck(id, candidate), /No executable oracle/);
  for (const timeout of [0, -1, 10001, Infinity, 1.5]) assert.throws(() => runCheck('function', candidate, { timeout }), /Timeout/);
});

test('an accidental hang is bounded and never counted as a useful mutation kill', t => {
  const report = runCheck('function', fixture(t, 'export function evaluate() { while (true) {} }'), { timeout: 300 });
  assert.equal(report.status, 'harness-error', JSON.stringify(report));
  assert.equal(report.reason, 'timeout');
  assert.equal(report.passed, 0);
  assert.equal(report.failed, 0);
  assert.equal(report.notEvaluated, report.total);
});

test('output overflow is a harness failure without candidate output disclosure', t => {
  const report = runCheck('function', fixture(t, 'process.stdout.write("private-example".repeat(100000)); export function evaluate() { return null; }'));
  assert.equal(report.status, 'harness-error', JSON.stringify(report));
  assert.equal(report.reason, 'output-limit');
  assert.equal(report.notEvaluated, report.total);
  assert.ok(!JSON.stringify(report).includes('private-example'));
});

test('malformed result envelopes are harness failures, not rejected inputs', t => {
  const total = casesFor('function').length;
  for (const envelope of [{ok:false}, {ok:true}, {ok:'yes',value:null}, {ok:false,reason:'unrecognized'}]) {
    const source = `process.stdout.write(${JSON.stringify(JSON.stringify(Array.from({length:total}, () => envelope)))}); process.exit(0);`;
    const report = runCheck('function', fixture(t, source));
    assert.equal(report.status, 'harness-error', JSON.stringify(report));
    assert.equal(report.reason, 'invalid-worker-result');
    assert.equal(report.notEvaluated, total);
  }
});

test('async results are awaited and shared results are snapshotted per invocation', t => {
  const source = good.workflow.replace('export function evaluate(actions)', 'async function calculate(actions)') + `
    const shared = [];
    export async function evaluate(actions) {
      shared.length = 0; shared.push(...await calculate(actions)); return shared;
    }`;
  const report = runCheck('workflow', fixture(t, source));
  assert.equal(report.status, 'comparisons-passed', JSON.stringify(report));
  assert.equal(report.compared, report.total);
  assert.equal(report.errored, 0);
  assert.equal(report.notEvaluated, 0);
});

test('hidden toJSON cannot turn a returned object into the required number or null', t => {
  const source = good.function.replace('export function evaluate', 'function calculate') + `
    export function evaluate(input) {
      return Object.defineProperty({}, 'toJSON', {value: () => calculate(input)});
    }`;
  const report = runCheck('function', fixture(t, source));
  assert.equal(report.status, 'candidate-error', JSON.stringify(report));
  assert.equal(report.passed, 0);
  assert.equal(report.errored, report.total);
  assert.ok(report.failureDetails.every(f => f.reason === 'non-json-result'));
});

test('array serialization hooks cannot supply an accepted parser result', t => {
  const source = good.format.replace('export function evaluate', 'function calculate') + `
    export function evaluate(input) {
      const result = calculate(input);
      return result === null ? null : Object.defineProperty(result, 'toJSON', {value: () => result});
    }`;
  const report = runCheck('format', fixture(t, source));
  assert.equal(report.status, 'candidate-error', JSON.stringify(report));
  assert.ok(report.failureDetails.some(f => f.label === 'valid-1' && f.reason === 'non-json-result'));
});

test('changing getters cannot change the value between validation and comparison', t => {
  const source = good.workflow.replace('export function evaluate', 'function calculate') + `
    export function evaluate(input) {
      return calculate(input).map(expected => {
        let storedReads = 0, draftReads = 0;
        return {get stored(){return ++storedReads === 1 ? 'wrong' : expected.stored;},
          get draft(){return ++draftReads === 1 ? 'wrong' : expected.draft;}};
      });
    }`;
  const report = runCheck('workflow', fixture(t, source));
  assert.equal(report.status, 'candidate-error', JSON.stringify(report));
  assert.equal(report.passed, 1); // The empty action list contains no accessors.
  assert.ok(report.failureDetails.every(f => f.reason === 'non-json-result'));
});

test('result capture rejects accessors without invoking their getters', t => {
  const source = `import fs from 'node:fs';
    export function evaluate() {
      return {get stored(){fs.writeFileSync(new URL('./getter-called',import.meta.url),'called'); throw new Error('getter called');}};
    }`;
  const candidate = fixture(t, source);
  const report = runCheck('workflow', candidate);
  assert.equal(report.errored, report.total);
  assert.ok(report.failureDetails.every(f => f.reason === 'non-json-result'));
  assert.equal(fs.existsSync(path.join(path.dirname(candidate), 'getter-called')), false);
});

test('hidden, symbolic and sparse result data cannot be silently discarded', t => {
  for (const value of [
    "Object.defineProperty({}, 'hidden', {value: 1})",
    "{[Symbol('hidden')]: 1}",
    'Array(1)',
    'Object.assign([1], {extra: 1})',
    'new (class extends Array {})(1,2)',
  ]) {
    const report = runCheck('function', fixture(t, `export function evaluate(){return ${value};}`));
    assert.equal(report.status, 'candidate-error', JSON.stringify(report));
    assert.equal(report.errored, report.total);
    assert.ok(report.failureDetails.every(f => f.reason === 'non-json-result'));
  }
});

test('frozen data and repeated references remain valid JSON results', t => {
  const source = good.workflow.replace('export function evaluate', 'function calculate') + `
    export function evaluate(input) {
      const seen = new Map();
      return Object.freeze(calculate(input).map(snapshot => {
        const key = JSON.stringify(snapshot);
        if (!seen.has(key)) seen.set(key, Object.freeze(snapshot));
        return seen.get(key);
      }));
    }`;
  const report = runCheck('workflow', fixture(t, source));
  assert.equal(report.status, 'comparisons-passed', JSON.stringify(report));
  assert.equal(report.compared, report.total);
});

test('special property names are preserved as data and produce real mismatches', t => {
  for (const key of ['__proto__', 'toJSON']) {
    const source = good.workflow.replace('export function evaluate', 'function calculate') + `
      export function evaluate(input) {
        return calculate(input).map(snapshot => Object.defineProperty(snapshot, ${JSON.stringify(key)}, {value:'extra',enumerable:true}));
      }`;
    const report = runCheck('workflow', fixture(t, source));
    assert.equal(report.status, 'comparison-failed', JSON.stringify(report));
    assert.equal(report.errored, 0);
    assert.equal(report.passed, 1);
    assert.ok(report.failureDetails.every(f => f.reason === 'value-mismatch'));
  }
});

test('reports distinguish numeric mismatches, exceptions and invalid return values', t => {
  const report = runCheck('function', fixture(t, `export function evaluate({a,b}) {
    if (a === 0) throw new Error('private-example');
    if (a === 1) return NaN;
    return null;
  }`));
  assert.equal(report.status, 'candidate-error', JSON.stringify(report));
  assert.ok(report.errored > 0);
  assert.ok(report.compared > 0);
  assert.equal(report.compared + report.errored + report.notEvaluated, report.total);
  assert.equal(report.passed + report.failed + report.notEvaluated, report.total);
  assert.deepEqual(new Set(report.failureDetails.map(f => f.reason)), new Set(['candidate-threw','non-json-result','value-mismatch']));
  assert.ok(!JSON.stringify(report).includes('private-example'));
});

test('process failures preserve unexecuted accounting and bounded diagnostics', t => {
  const scenarios = [
    ['export function evaluate() { while (true) {} }', 'timeout', {timeout: 300}, null],
    ['process.stderr.write("private-example"); process.exit(7);', 'candidate-process-failed', {}, 7],
    ['process.kill(process.pid, "SIGKILL");', 'candidate-process-failed', {}, process.platform === 'win32' ? 1 : null],
    ['process.stdout.write("private-example"); process.exit(0);', 'invalid-worker-output', {}, 0],
    ['process.stdout.write("[]"); process.exit(0);', 'incomplete-worker-output', {}, 0],
    // A valid record in a partial run must never count as a completed comparison.
    [`process.stdout.write('[{"ok":true,"value":0}]'); process.exit(0);`, 'incomplete-worker-output', {}, 0],
    ['export function evaluate() { process.exit(0); }', 'invalid-worker-output', {}, 0],
  ];
  for (const [source, reason, options, exitCode] of scenarios) {
    const report = runCheck('function', fixture(t, source), options);
    const detail = JSON.stringify(report);
    assert.equal(report.status, 'harness-error', detail);
    assert.equal(report.reason, reason, detail);
    for (const field of ['passed', 'failed', 'compared', 'errored']) assert.equal(report[field], 0, detail);
    assert.equal(report.notEvaluated, report.total, detail);
    assert.equal(report.humanReview, 'pending');
    const e = report.execution;
    assert.equal(e.timeoutMs, options.timeout ?? 10000);
    assert.ok(Number.isInteger(e.elapsedMs) && e.elapsedMs >= 0, detail);
    assert.equal(e.exitCode, exitCode, detail);
    if (reason === 'timeout') assert.equal(e.errorCode, 'ETIMEDOUT', detail);
    if (source.includes('SIGKILL')) assert.equal(e.signal, process.platform === 'win32' ? null : 'SIGKILL', detail);
    assert.ok(Number.isInteger(e.stdoutBytes) && e.stdoutBytes >= 0);
    assert.ok(Number.isInteger(e.stderrBytes) && e.stderrBytes >= 0);
    assert.ok(!detail.includes('private-example'));
    assert.ok(!detail.includes('rea-eval-test-'));
  }
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
