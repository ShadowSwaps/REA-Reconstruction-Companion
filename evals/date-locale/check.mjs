import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {operations, formatOptions} from './candidate.mjs';
const root = new URL('./', import.meta.url);
export function frozen() {
  const identity = JSON.parse(fs.readFileSync(new URL('identity.json', root)));
  for (const [name, hash] of Object.entries(identity.files))
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name, root))).digest('hex'), hash, name);
  return JSON.parse(fs.readFileSync(new URL('oracle.json', root)));
}
export function compare(api = operations, cases = [...frozen().ordinary, ...frozen().boundaries]) {
  return cases.map(row => {
    let actual;
    try { actual = api[row.op](...row.args); }
    catch (error) {
      if (!(error instanceof RangeError) || !['date','instant','wall','wall-offset','locale','zone','record'].includes(error.message)) throw error;
      actual = {error: error.message};
    }
    let passed = true;
    try { assert.deepEqual(actual, row.expected); } catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; passed = false; }
    return {id: row.id, actual, expected: row.expected, passed};
  });
}
export function environment() {
  return {node: process.version, v8: process.versions.v8, icu: process.versions.icu ?? null,
    cldr: process.versions.cldr ?? null, tz: process.versions.tz ?? null,
    clock: 'literal inputs; no current-time reads',
    projection: ['Europe/Oslo','America/Los_Angeles','UTC'].map(zone => new Intl.DateTimeFormat('en-GB', formatOptions(zone)).resolvedOptions()),
    dateDisplay: 'Explicit en-GB D/M/Y and en-US M/D/Y numeric profile; no locale-string parser'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = compare();
  console.log(JSON.stringify({profile: frozen().profile, environment: environment(), results, humanReview: 'pending'}, null, 2));
  if (results.some(r => !r.passed)) process.exitCode = 1;
}
