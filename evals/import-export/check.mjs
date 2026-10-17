import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createStore as reference } from './reference.mjs';
import { createStore as candidate } from './candidate.mjs';
import { inputBytes, verifyFreeze } from './freeze.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(fs.readFileSync(path.join(root, 'corpus.json')));
const doc = (entries, version = 2) => Buffer.from(JSON.stringify({ format: 'pocket-ledger', version, entries }));
const seed = [{ id: 'prior', title: 'Keep me 雪', done: true }];
function errorCode(action) { try { action(); return null; } catch (e) { return e.code ?? 'unknown'; } }
export function compareCases(expected, actual) {
  assert.equal(actual.length, expected.length, 'complete observation set');
  assert.equal(new Set(actual.map(c => c.id)).size, expected.length, 'unique observations');
  assert.deepEqual(actual.map(c => c.id).sort(), expected.map(c => c.id).sort(), 'exact case identities');
  for (const c of expected) {
    const observed = actual.find(r => r.id === c.id);
    if (c.error) assert.equal(observed.error, c.error, c.id);
    else { assert.equal(observed.error, undefined, c.id); assert.deepEqual(observed.rows, c.rows, c.id); }
  }
}
function boundaries() {
  const row = { id: 'a', title: '😀'.repeat(80), done: false };
  const empty = doc([]);
  const full = Array.from({ length: 16 }, (_, i) => ({ id: 'r' + i, title: 'Row ' + i, done: false }));
  // v1 fits, but canonical v2 expansion exceeds the limit. Literal limit arithmetic.
  const expansion = Array.from({ length: 16 }, (_, i) => ({ id: 'row' + String(i).padStart(13, '0'), text: '\u0000'.repeat(77) }));
  assert.ok(doc(expansion, 1).length <= 8192);
  return [
    { id: 'byte-limit', bytes: Buffer.concat([empty, Buffer.alloc(8192 - empty.length, 32)]), rows: [] },
    { id: 'byte-over', bytes: Buffer.concat([empty, Buffer.alloc(8193 - empty.length, 32)]), error: 'size' },
    { id: 'scalar-limit', bytes: doc([row]), rows: [row] },
    { id: 'scalar-over', bytes: doc([{ ...row, title: row.title + 'x' }]), error: 'schema' },
    { id: 'record-limit', bytes: doc(full), rows: full },
    { id: 'record-over', bytes: doc([...full, { id: 'extra', title: 'x', done: false }]), error: 'schema' },
    { id: 'expanded-v1-over', bytes: doc(expansion, 1), error: 'size' },
    { id: 'id-newline', bytes: doc([{ ...row, id: 'a\n' }]), error: 'schema' },
    { id: 'version-bool', bytes: Buffer.from('{"format":"pocket-ledger","version":true,"entries":[]}'), error: 'schema' },
    { id: 'version-fraction', bytes: Buffer.from('{"format":"pocket-ledger","version":2.1,"entries":[]}'), error: 'unsupported-version' },
    { id: 'version-spelling', bytes: Buffer.from('{"format":"pocket-ledger","version":2e0,"entries":[]}'), rows: [] },
    { id: 'invalid-utf8-tail', bytes: Buffer.concat([doc([]), Buffer.from([0xc0, 0xaf])]), error: 'encoding' }
  ];
}
function outputCheck(bytes, rows, version) {
  assert.ok(Buffer.isBuffer(bytes)); assert.ok(bytes.length <= 8192);
  assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf');
  assert.equal(bytes.at(-1), 10); assert.notEqual(bytes.at(-2), 10);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert.deepEqual(JSON.parse(text), { format: 'pocket-ledger', version,
    entries: rows.map(r => version === 1 ? { id: r.id, text: r.title } : { ...r }) });
}
export function runTrial({ candidateFactory = candidate } = {}) {
  verifyFreeze();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rea-import-export-'));
  const cases = [...corpus.map(c => ({ ...c, bytes: inputBytes(c) })), ...boundaries()];
  const results = [], faults = [];
  for (const [name, factory] of [['reference', reference], ['candidate', candidateFactory]]) {
    const file = path.join(temp, name + '.json'), store = factory({ file });
    const observations = [];
    for (const c of cases) {
      store.importBytes(doc(seed));
      const previous = fs.readFileSync(file);
      let rows;
      const error = errorCode(() => { rows = store.importBytes(c.bytes); });
      observations.push(error ? { id: c.id, error } : { id: c.id, rows });
      if (c.error) {
        assert.deepEqual(store.state(), seed, name + '/' + c.id + ' memory preserved');
        assert.deepEqual(fs.readFileSync(file), previous, name + '/' + c.id + ' file preserved');
        assert.deepEqual(factory({ file }).state(), seed, 'restart after rejection');
      } else {
        assert.deepEqual(store.state(), c.rows); assert.deepEqual(factory({ file }).state(), c.rows);
        const saved = fs.readFileSync(file);
        for (const version of [1, 2]) {
          if (version === 1 && c.rows.some(r => r.done)) {
            assert.equal(errorCode(() => store.exportBytes(1)), 'lossy-version');
          } else {
            const bytes = store.exportBytes(version); outputCheck(bytes, c.rows, version);
            const other = (name === 'reference' ? candidateFactory : reference)();
            assert.deepEqual(other.importBytes(bytes), c.rows, name + ' cross-reader v' + version);
            assert.deepEqual(factory().importBytes(bytes), c.rows, name + ' self-roundtrip');
          }
        }
        assert.equal(errorCode(() => store.exportBytes(99)), 'unsupported-version');
        assert.deepEqual(store.state(), c.rows); assert.deepEqual(fs.readFileSync(file), saved);
      }
    }
    compareCases(cases, observations);
    results.push({ target: name, cases: observations });
    store.importBytes(doc(seed));
    const previous = fs.readFileSync(file);
    let inject = true;
    const failing = factory({ file, beforeReplace() { if (inject) throw new Error('controlled pre-rename fault'); } });
    assert.equal(errorCode(() => failing.importBytes(doc([]))), 'persistence');
    assert.deepEqual(failing.state(), seed); assert.deepEqual(fs.readFileSync(file), previous);
    inject = false; assert.deepEqual(failing.importBytes(doc([])), []);
    assert.deepEqual(factory({ file }).state(), []);
    store.importBytes(doc(seed));
    const directory = path.join(temp, name + '-nonempty'); fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'keep'), 'controlled destination conflict');
    let osError;
    const osFailing = factory({ file, beforeReplace(staging) {
      try { fs.renameSync(staging, directory); } catch (e) { osError = e.code; throw e; }
      throw new Error('Host unexpectedly allowed file-to-nonempty-directory rename');
    } });
    assert.equal(errorCode(() => osFailing.importBytes(doc([]))), 'persistence');
    assert.ok(osError, 'actual OS rejection observed');
    assert.deepEqual(osFailing.state(), seed); assert.deepEqual(fs.readFileSync(file), previous);
    assert.deepEqual(factory({ file }).state(), seed);
    assert.ok(fs.readFileSync(path.join(directory, 'keep')).length);
    const malformed = path.join(temp, name + '-malformed'); fs.writeFileSync(malformed, '{broken');
    assert.equal(errorCode(() => factory({ file: malformed })), 'syntax');
    assert.equal(fs.readFileSync(malformed, 'utf8'), '{broken');
    // Controlled real staging-write failure: legal existing basename, but its
    // UUID temporary suffix exceeds this host filesystem's component limit.
    const longFile = path.join(temp, 'l'.repeat(230) + '.json');
    fs.writeFileSync(longFile, doc(seed));
    let stagingError, reachedRename = false;
    try { fs.writeFileSync(longFile + '.00000000-0000-0000-0000-000000000000.tmp', 'probe', { flag: 'wx' }); }
    catch (e) { stagingError = e.code; }
    assert.ok(stagingError, 'actual long-name staging write rejection observed');
    const writeFailing = factory({ file: longFile, beforeReplace() { reachedRename = true; } });
    const priorLongBytes = fs.readFileSync(longFile);
    assert.equal(errorCode(() => writeFailing.importBytes(doc([]))), 'persistence');
    assert.equal(reachedRename, false, 'failure before rename hook');
    assert.deepEqual(writeFailing.state(), seed);
    assert.deepEqual(fs.readFileSync(longFile), priorLongBytes);
    // Startup accepts an externally supplied valid v1 file, like the reference;
    // canonical-v2 expansion is checked at import/export, not silently migrated.
    const legacy = path.join(temp, name + '-legacy-v1.json');
    const legacyCase = cases.find(c => c.id === 'expanded-v1-over');
    fs.writeFileSync(legacy, legacyCase.bytes);
    const loadedLegacy = factory({ file: legacy });
    assert.equal(loadedLegacy.state().length, 16);
    assert.equal(errorCode(() => loadedLegacy.exportBytes()), 'size');
    assert.deepEqual(fs.readFileSync(legacy), legacyCase.bytes);
    faults.push({ target: name, preRenameInjection: 'preserved; retry/restart passed',
      controlledOsRename: osError, controlledOsStagingWrite: stagingError,
      priorMemoryAndBytesPreserved: true, startupMalformed: 'failed closed', legacyV1Startup: 'loaded without migration; oversized v2 export rejected' });
  }
  // Real executable transport plus separate-process restart, outside API-only checks.
  for (const name of ['reference', 'candidate']) {
    const file = path.join(temp, name + '-cli.json');
    const invoke = requests => {
      const result = spawnSync(process.execPath, [path.join(root, 'cli.mjs'), name, file], {
        input: requests.map(r => JSON.stringify(r)).join('\n') + '\n', encoding: 'utf8', timeout: 5000, windowsHide: true
      });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim().split('\n').map(line => JSON.parse(line));
    };
    const responses = invoke([{ op: 'import', hex: inputBytes(corpus[0]).toString('hex') },
      { op: 'import', hex: '7b' }, { op: 'state' }, { op: 'export', version: 1 }]);
    assert.deepEqual(responses, [{ ok: true, rows: corpus[0].rows }, { ok: false, error: 'syntax' },
      { ok: true, rows: corpus[0].rows }, { ok: false, error: 'lossy-version' }]);
    assert.deepEqual(invoke([{ op: 'state' }]), [{ ok: true, rows: corpus[0].rows }]);
    const exported = invoke([{ op: 'export', version: 2 }]);
    assert.equal(exported[0].ok, true);
    outputCheck(Buffer.from(exported[0].hex, 'hex'), corpus[0].rows, 2);
    const migrated = invoke([{ op: 'import', hex: inputBytes(corpus[1]).toString('hex') }, { op: 'export', version: 1 }]);
    assert.deepEqual(migrated[0], { ok: true, rows: corpus[1].rows });
    assert.equal(migrated[1].ok, true);
    outputCheck(Buffer.from(migrated[1].hex, 'hex'), corpus[1].rows, 1);
  }
  // Leave disposable artifacts available for inspection; caller owns eventual cleanup.
  return { trial: 'IE-20261017', exposure: 'same-agent, source-exposed, synthetic',
    status: 'passed', casesPerTarget: cases.length, results, faults, cliRestart: 'passed both',
    limits: 'Controlled faults; no power-loss durability, concurrency, hostile paths or global parity claim', artifacts: temp };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(runTrial(), null, 2));
}
