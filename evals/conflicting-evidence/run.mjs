// One fixed worked case, not a general evidence resolver or model evaluator.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { sortRows } from './sorter.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifyFreeze() {
  const identity = read('identity.json');
  assert.deepEqual(Object.keys(identity.files).sort(), ['decision.json','expectations.json','sorter.mjs','sources.json']);
  for (const [name, digest] of Object.entries(identity.files)) {
    const file = path.join(here, name), stat = fs.lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Frozen regular file required');
    assert.equal(sha(fs.readFileSync(file)), digest, `Frozen identity mismatch: ${name}`);
  }
  return identity;
}
export const workedDecision = () => read('decision.json');

// Compares only authored structured cells. Human assessment must examine meaning
// and source applicability; equivalent free-form answers are not classified here.
export function checkDecision(record) {
  verifyFreeze();
  const expected = workedDecision();
  assert.ok(record && typeof record === 'object' && !Array.isArray(record), 'record shape');
  assert.deepEqual(Object.keys(record).sort(), Object.keys(expected).sort(), 'record fields');
  for (const field of Object.keys(expected)) assert.deepEqual(record[field], expected[field], `decision field: ${field}`);
  return 'fixed-cells-passed';
}

export function runCase(destination, sorter = sortRows, record = workedDecision()) {
  verifyFreeze(); checkDecision(record);
  const input = read('sources.json').selectedTarget.data, expected = read('expectations.json');
  for (const row of input) {
    assert.deepEqual(Object.keys(row).sort(), ['id','rank','title'], 'T-schema selected row fields');
    assert.equal(typeof row.id, 'string'); assert.equal(typeof row.rank, 'number'); assert.equal(typeof row.title, 'string');
  }
  const outputs = {};
  for (const setting of ['insertion', 'title']) {
    outputs[setting] = sorter(input, setting);
    assert.deepEqual(outputs[setting], expected[setting], `local ${setting} outcome`);
    assert.deepEqual(input, expected.inputAfter, 'input retained after each run');
  }
  assert.deepEqual(sorter([{id:'z',rank:2,title:'Zulu'},{id:'a',rank:1,title:'Alpha'}], 'insertion'), expected.differentRanks, 'rank still primary');
  assert.deepEqual(sorter([], 'title'), expected.empty, 'empty input');
  assert.throws(() => sorter(input, 'unknown'), /Unknown tie-break setting/, 'unsupported setting must not silently default');
  const result = { status:'bounded-case-passed', outputs, node:process.version,
    fixtureIdentitySha256:sha(fs.readFileSync(path.join(here, 'identity.json'))),
    sorterSha256:sha(fs.readFileSync(path.join(here, 'sorter.mjs'))),
    conclusion:record.conclusion, revision:record.revision,
    contextualAssessment:'manual; author supplied the worked decision',
    originalApplicationParity:'not tested', liveModelUnderstanding:'not tested' };
  if (destination) {
    fs.mkdirSync(destination); // exclusive destination; never overwrite prior evidence
    fs.writeFileSync(path.join(destination, 'result.json'), JSON.stringify(result, null, 2)+'\n', {flag:'wx'});
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [destination, ...extra] = process.argv.slice(2);
    assert.ok(destination && !extra.length, 'Usage: node evals/conflicting-evidence/run.mjs NEW_DIRECTORY');
    console.log(JSON.stringify(runCase(path.resolve(destination)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
