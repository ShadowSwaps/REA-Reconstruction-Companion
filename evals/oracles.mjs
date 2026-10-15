// Reviewer-side expected results. Never import a candidate to generate them.
import fs from 'node:fs';
import { selectionCases } from './selection-oracles.mjs';

export const executableCases = ['function', 'format', 'workflow', 'crypto', 'quirk-parity', 'quirk-improvement'];

// Public synthetic test data: RFC 8439, section 2.8.2 (Nir and Langley).
// Factual byte transcription, not a copied cipher implementation. See README.
export const vector = Object.freeze(JSON.parse(fs.readFileSync(new URL('./fixtures/rfc8439.json', import.meta.url), 'utf8')));

export function casesFor(id) {
  if (id === 'quirk-parity' || id === 'quirk-improvement') return selectionCases(id);
  const cases = [];
  const add = (label, input, expected) => cases.push({ label, input, expected });
  if (id === 'function') {
    const points = [0, 1, 127, 128, 254, 255];
    for (const a of points) for (const b of points) add(`${a}+${b}`, { a, b }, Math.min(255, a + b));
    for (const [name, bad] of Object.entries({ negative: -1, overflow: 256, fractional: 0.5, string: '1', null: null, boolean: false, array: [], object: {} })) {
      add(`invalid-left-${name}`, { a: bad, b: 1 }, null);
      add(`invalid-right-${name}`, { a: 1, b: bad }, null);
    }
    add('missing-left', { b: 1 }, null);
    add('missing-right', { a: 1 }, null);
    add('missing-both', {}, null);
    // Fixed 32-bit LCG seed and budget: deterministic corpus, not coverage-guided.
    let seed = 0x524541;
    const byte = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed >>> 24; };
    for (let n = 0; n < 64; n++) {
      const a = byte(), b = byte();
      add(`generated-${n}`, { a, b }, Math.min(255, a + b));
    }
  } else if (id === 'format') {
    // Construct from independent payloads; do not parse candidate output for expectations.
    for (const size of [0, 1, 2, 15, 16, 127, 255]) {
      const payload = Array.from({ length: size }, (_, i) => (i * 73 + 255) % 256);
      const checksum = payload.reduce((sum, x) => sum + x, 0) % 256;
      const frame = Buffer.from([0x52, 1, size, ...payload, checksum]).toString('hex');
      add(`valid-${size}`, frame, payload);
      add(`uppercase-${size}`, frame.toUpperCase(), payload);
      add(`truncated-${size}`, frame.slice(0, -2), null);
      add(`trailing-${size}`, frame + '00', null);
      add(`checksum-${size}`, frame.slice(0, -2) + ((checksum + 1) % 256).toString(16).padStart(2, '0'), null);
      add(`version-${size}`, '5202' + frame.slice(4), null);
      add(`magic-${size}`, '53' + frame.slice(2), null);
      add(`length-${size}`, frame.slice(0, 4) + ((size + 1) % 256).toString(16).padStart(2, '0') + frame.slice(6), null);
      for (const [name, suffix] of Object.entries({ lf: '\n', cr: '\r', crlf: '\r\n', space: ' ', nul: '\0', nonhex: 'zz' })) {
        add(`suffix-${name}-${size}`, frame + suffix, null);
      }
    }
    for (const [name, bad] of Object.entries({ empty: '', short: '00', odd: '5201000', nonhex: '5201000z', separators: '52 01 00 00', prefix: '0x52010000', whitespace: ' 52010000', null: null, number: 52010000, array: [], object: {}, boolean: true })) add(`invalid-frame-${name}`, bad, null);
  } else if (id === 'workflow') {
    // Explicit independent traces, not another implementation of the state machine.
    add('empty', [], []);
    add('unsaved-restart', [{ type: 'edit', value: 'B' }, { type: 'restart' }], [{ stored: 'A', draft: 'B' }, { stored: 'A', draft: 'A' }]);
    add('save-restart', [{ type: 'edit', value: 'B' }, { type: 'save' }, { type: 'restart' }], [{ stored: 'A', draft: 'B' }, { stored: 'B', draft: 'B' }, { stored: 'B', draft: 'B' }]);
    add('save-edit-cancel', [{ type: 'edit', value: 'B' }, { type: 'save' }, { type: 'edit', value: 'C' }, { type: 'cancel' }], [{ stored: 'A', draft: 'B' }, { stored: 'B', draft: 'B' }, { stored: 'B', draft: 'C' }, { stored: 'B', draft: 'B' }]);
    add('empty-text', [{ type: 'edit', value: '' }, { type: 'save' }, { type: 'restart' }], [{ stored: 'A', draft: '' }, { stored: '', draft: '' }, { stored: '', draft: '' }]);
    add('repeated-controls', [{ type: 'save' }, { type: 'cancel' }, { type: 'restart' }, { type: 'restart' }], [{ stored: 'A', draft: 'A' }, { stored: 'A', draft: 'A' }, { stored: 'A', draft: 'A' }, { stored: 'A', draft: 'A' }]);
    add('last-edit-wins', [{ type: 'edit', value: 'B' }, { type: 'edit', value: 'C' }, { type: 'save' }, { type: 'restart' }], [{ stored: 'A', draft: 'B' }, { stored: 'A', draft: 'C' }, { stored: 'C', draft: 'C' }, { stored: 'C', draft: 'C' }]);
    add('cancel-then-save', [{ type: 'edit', value: 'B' }, { type: 'cancel' }, { type: 'save' }, { type: 'restart' }], [{ stored: 'A', draft: 'B' }, { stored: 'A', draft: 'A' }, { stored: 'A', draft: 'A' }, { stored: 'A', draft: 'A' }]);
    add('preserve-text', [{ type: 'edit', value: ' café\n雪 ' }, { type: 'save' }, { type: 'edit', value: 'discard' }, { type: 'restart' }], [{ stored: 'A', draft: ' café\n雪 ' }, { stored: ' café\n雪 ', draft: ' café\n雪 ' }, { stored: ' café\n雪 ', draft: 'discard' }, { stored: ' café\n雪 ', draft: ' café\n雪 ' }]);
    add('reset-between-invocations', [{ type: 'restart' }], [{ stored: 'A', draft: 'A' }]);
  } else if (id === 'crypto') {
    const { key, nonce, aad, plaintext, ciphertext, tag } = vector;
    const encrypt = { operation: 'encrypt', key, nonce, aad, plaintext };
    const decrypt = { operation: 'decrypt', key, nonce, aad, ciphertext, tag };
    add('published-encrypt', encrypt, { ciphertext, tag });
    add('published-decrypt', decrypt, plaintext);
    for (const field of ['key', 'nonce', 'aad', 'ciphertext', 'tag']) {
      const changed = Buffer.from(decrypt[field], 'hex'); changed[0] ^= 1;
      add(`wrong-${field}`, { ...decrypt, [field]: changed.toString('hex') }, null);
    }
    for (const field of ['key', 'nonce', 'tag', 'ciphertext']) {
      add(`truncated-${field}`, { ...decrypt, [field]: decrypt[field].slice(0, -2) }, null);
      const missing = { ...decrypt }; delete missing[field];
      add(`missing-${field}`, missing, null);
    }
    add('missing-aad', { ...decrypt, aad: undefined }, null);
    add('invalid-hex', { ...decrypt, ciphertext: ciphertext + 'zz' }, null);
    add('odd-hex', { ...decrypt, ciphertext: ciphertext + '0' }, null);
    add('invalid-type', { ...decrypt, tag: [] }, null);
    add('invalid-operation', { ...decrypt, operation: 'unknown' }, null);
    add('invalid-encrypt-key', { ...encrypt, key: key.slice(2) }, null);
    // Exercise validation in both directions. Expectations are rejection, not
    // outputs generated by the same crypto library as a candidate.
    for (const input of [encrypt, decrypt]) {
      const op = input.operation;
      for (const field of Object.keys(input).filter(f => f !== 'operation')) {
        const missing = { ...input }; delete missing[field];
        add(`${op}-${field}-missing`, missing, null);
        for (const [name, bad] of Object.entries({ uppercase: 'AA' + input[field].slice(2), odd: input[field] + '0', nonhex: input[field] + 'zz', lf: input[field] + '\n', cr: input[field] + '\r', space: input[field] + ' ', number: 0, null: null, array: [] })) {
          add(`${op}-${field}-${name}`, { ...input, [field]: bad }, null);
        }
      }
      for (const field of ['key', 'nonce', ...(op === 'decrypt' ? ['tag'] : [])]) {
        for (const [name, bad] of Object.entries({ empty: '', short: input[field].slice(2), long: input[field] + '00' })) {
          add(`${op}-${field}-${name}`, { ...input, [field]: bad }, null);
        }
      }
    }
    for (const [name, input] of Object.entries({ null: null, array: [], number: 1, empty: {} })) add(`invalid-input-${name}`, input, null);
    // Repeat independent known answer after failures to catch leaked error/state handling.
    add('valid-after-rejections', decrypt, plaintext);
  } else {
    throw new Error(`No executable oracle for case: ${id}`);
  }
  return cases;
}
