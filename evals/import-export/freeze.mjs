// Run once before writing the candidate. Verification never rewrites the freeze.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createStore } from './reference.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function inputBytes(c) {
  return c.hex !== undefined ? Buffer.from(c.hex, 'hex') : Buffer.from(c.text ?? JSON.stringify(c.json));
}
export function verifyFreeze() {
  const identity = JSON.parse(fs.readFileSync(path.join(root, 'identity.json')));
  for (const [name, digest] of Object.entries(identity.files)) {
    assert.equal(hash(fs.readFileSync(path.join(root, name))), digest, 'Frozen evidence changed: ' + name);
  }
  return identity;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv[2], '--create');
  assert.equal(fs.existsSync(path.join(root, 'candidate.mjs')), false, 'Freeze must precede reconstruction');
  assert.equal(fs.existsSync(path.join(root, 'identity.json')), false, 'Never overwrite frozen evidence');
  const cases = JSON.parse(fs.readFileSync(path.join(root, 'corpus.json')));
  const observed = cases.map(c => {
    const store = createStore();
    try {
      const rows = store.importBytes(inputBytes(c));
      assert.ok(!c.error, c.id);
      assert.deepEqual(rows, c.rows, c.id);
      return { id: c.id, rows, exportHex: store.exportBytes().toString('hex') };
    } catch (e) {
      assert.ok(c.error, c.id + ': ' + e.message);
      assert.equal(e.code, c.error, c.id);
      return { id: c.id, error: e.code };
    }
  });
  fs.writeFileSync(path.join(root, 'observed.json'), JSON.stringify(observed, null, 2) + '\n');
  const files = Object.fromEntries(['CONTRACT.md', 'corpus.json', 'reference.mjs', 'observed.json', 'freeze.mjs']
    .map(name => [name, hash(fs.readFileSync(path.join(root, name)))]));
  fs.writeFileSync(path.join(root, 'identity.json'), JSON.stringify({
    id: 'IE-20261017', reference: 'synthetic Pocket Ledger 1', license: 'MIT',
    exposure: 'same-agent source-exposed; no blind or independent claim',
    phase: 'contract/corpus/reference observations frozen before candidate', files
  }, null, 2) + '\n');
  console.log(JSON.stringify({ cases: observed.length, identity: verifyFreeze() }));
}
