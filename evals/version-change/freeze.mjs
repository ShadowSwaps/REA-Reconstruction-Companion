// MIT. Create once before adaptation; verify never rewrites expected identities.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore as v1 } from './reference-v1.mjs';
import { createStore as v2 } from './reference-v2.mjs';
import { titles } from './summary.mjs';
const here = new URL('./', import.meta.url);
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const read = name => fs.readFileSync(new URL(name, here));
export const literal = () => JSON.parse(read('expectations.json'));
export const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
export function verifyFreeze() {
  const identity = JSON.parse(read('identity.json'));
  for (const [name, digest] of Object.entries(identity.files)) assert.equal(hash(read(name)), digest, 'Frozen drift: ' + name);
  return identity;
}
if (process.argv[2] === '--create' && process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.ok(!fs.existsSync(new URL('identity.json', here)) && !fs.existsSync(new URL('candidate-v2.mjs', here)), 'Freeze must precede adaptation');
  const e = literal(), observations = {};
  for (const [name, factory] of [['v1', v1], ['v2', v2]]) {
    const store = factory();
    assert.deepEqual(store.importBytes(bytes(e.v1)), e.rowsV1);
    assert.deepEqual(titles(store.state()), e.titles);
    observations[name] = { v1Rows: store.state(), titles: titles(store.state()) };
    if (name === 'v1') assert.throws(() => store.importBytes(bytes(e.v2)), { code: e.errors.oldReader });
    else {
      assert.deepEqual(store.importBytes(bytes(e.v2)), e.rowsV2);
      assert.throws(() => store.exportBytes(1), { code: e.errors.downgrade });
      observations[name].v2Rows = store.state();
    }
    observations[name].schema2 = name === 'v1' ? 'unsupported-version' : 'accepted';
  }
  fs.writeFileSync(new URL('observed.json', here), bytes(observations), { flag: 'wx' });
  const names = ['CONTRACT.md','expectations.json','dependencies.json','reference-v1.mjs','reference-v2.mjs',
    'candidate-v1.mjs','summary.mjs','release-v1.txt','release-v2.txt','observed.json','freeze.mjs',
    '../import-export/reference.mjs','../import-export/candidate.mjs','../import-export/identity.json'];
  fs.writeFileSync(new URL('identity.json', here), bytes({ id: 'VC-20261017', license: 'MIT',
    exposure: 'synthetic source-exposed same-agent; literal oracle independent of outputs, not independent authorship',
    files: Object.fromEntries(names.map(name => [name, hash(read(name))])) }), { flag: 'wx' });
  console.log(JSON.stringify(verifyFreeze()));
}
