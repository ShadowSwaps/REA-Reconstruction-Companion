import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {compare, frozen} from '../evals/numeric-contracts/check.mjs';
import * as candidate from '../evals/numeric-contracts/candidate.mjs';
const oracle = frozen();
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-numeric-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-numeric-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, {recursive: true, force: true});
  });
  return dir;
}
test('frozen literals match exact numeric values and declared display/error contracts', () => {
  const bytes = fs.readFileSync(new URL('../evals/numeric-contracts/expectations.json', import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('../evals/numeric-contracts/identity.json', import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), identity.expectationsSha256);
  const rows = compare();
  assert.equal(rows.length, 24);
  assert.equal(new Set(rows.map(r => r.id)).size, 24);
  assert.deepEqual(rows.filter(r => !r.passed), []);
});
const mutations = [
  {id:'guess-separator', target:'comma-decimal', from:"const separator = grammar(profile);\n  if (!['m', 'cm'].includes(unit))", to:"const separator = grammar(profile); if (typeof text === 'string' && profile === 'comma') text = String(parseFloat(text));\n  if (!['m', 'cm'].includes(unit))"},
  {id:'binary-rounding', target:'binary-tie', from:'Math.floor((Math.abs(value) + 50) / 100)', to:'Math.round((Math.abs(value) / 10000) * 100)'},
  {id:'negative-tie', target:'negative-tie', from:'Math.floor((Math.abs(value) + 50) / 100)', to:'Math.abs(Math.round(value / 100))'},
  {id:'half-even', target:'even-tie', from:'Math.floor((Math.abs(value) + 50) / 100)', to:'(Math.abs(value) % 100 === 50 && Math.floor(Math.abs(value) / 100) % 2 === 0 ? Math.floor(Math.abs(value) / 100) : Math.floor((Math.abs(value) + 50) / 100))'},
  {id:'round-source-unit', target:'after-conversion', from:'const magnitude = thousandths * factor;', to:"const magnitude = (unit === 'm' ? Math.round(thousandths / 10) * 10 : thousandths) * factor;"},
  {id:'fraction-wrong-unit', target:'binary-tie', from:'const magnitude = thousandths * factor;', to:"const magnitude = Number(match[1]) * 1000 * factor + Number((match[2] ?? '').padEnd(3, '0')) * 1000;"}
];
for (const mutation of mutations) test('ordinary cases pass before value mismatch rejects ' + mutation.id, async t => {
  const source = fs.readFileSync(new URL('../evals/numeric-contracts/candidate.mjs', import.meta.url), 'utf8');
  // guess-separator changes only the parse occurrence, not the display grammar.
  assert.equal(source.split(mutation.from).length, 2);
  const file = path.join(temporary(t), 'candidate.mjs');
  fs.writeFileSync(file, source.replace(mutation.from, mutation.to));
  const api = await import(pathToFileURL(file));
  assert.ok(compare(api, oracle.ordinary).every(r => r.passed));
  const row = compare(api, oracle.boundaries).find(r => r.id === mutation.target);
  assert.equal(row.passed, false);
  assert.equal(Object.hasOwn(row.actual, 'error'), false);
  t.diagnostic(JSON.stringify({mutation: mutation.id, ordinaryPassed: 4, distinguishing: row}));
});
test('actual literal export/import and reopen change display without changing canonical bytes', t => {
  const file = path.join(temporary(t), 'quantity.json'), p = oracle.persistence;
  assert.equal(candidate.encode(p.record), p.export);
  candidate.save(file, p.record);
  assert.equal(fs.readFileSync(file, 'utf8'), p.export);
  assert.deepEqual(candidate.reopen(file, 'dot'), {record: p.record, display: p.dot});
  assert.deepEqual(candidate.reopen(file, 'comma'), {record: p.record, display: p.comma});
  const imported = path.join(path.dirname(file), 'import.json');
  candidate.importFile(imported, p.export);
  assert.equal(fs.readFileSync(imported, 'utf8'), p.export);
  assert.equal(fs.readFileSync(file, 'utf8'), p.export);
});
test('rounded-storage variant passes ordinary save before actual reopen rejects lost precision', async t => {
  const source = fs.readFileSync(new URL('../evals/numeric-contracts/candidate.mjs', import.meta.url), 'utf8');
  const from = 'const bytes = encode(value);';
  assert.equal(source.split(from).length, 2);
  const dir = temporary(t), module = path.join(dir, 'candidate.mjs'), file = path.join(dir, 'quantity.json');
  fs.writeFileSync(module, source.replace(from, 'const bytes = encode({...value, value: Math.round(value.value / 100) * 100});'));
  const api = await import(pathToFileURL(module));
  for (const row of oracle.ordinary) {
    api.save(file, {schema:1, unit:'um', value:row.expected.um});
    assert.equal(api.reopen(file, row.args[1]).record.value, row.expected.um);
  }
  api.save(file, oracle.persistence.record);
  const actual = api.reopen(file, 'dot');
  assert.equal(actual.record.value, 10100);
  assert.notEqual(actual.record.value, oracle.persistence.record.value);
  assert.notEqual(fs.readFileSync(file, 'utf8'), oracle.persistence.export);
  assert.equal(actual.display, oracle.persistence.dot, 'same display conceals lost canonical precision');
});
test('semantic import/save rejection leaves prior actual bytes and reopened value intact', t => {
  const file = path.join(temporary(t), 'quantity.json'), p = oracle.persistence;
  candidate.save(file, p.record);
  for (const value of [null, {}, {...p.record,unit:'cm'}, {...p.record,schema:2}, {...p.record,display:p.dot},
    ...[NaN,Infinity,-Infinity,0.1,1000000001,-1000000001,9007199254740992,null,'10050'].map(value => ({...p.record,value}))]) {
    assert.throws(() => candidate.save(file, value), RangeError);
    assert.equal(fs.readFileSync(file, 'utf8'), p.export);
  }
  for (const bytes of ['{', p.export.trim(), p.export.replace('10050','10050.0'), p.export.replace('10050','1.005e4'),
    p.export.replace('"unit":"um"','"unit":"cm"'), p.export.replace('"schema":1','"schema":1,"schema":1'),
    p.export.replace('10050','null'), p.export.replace('10050','10050.1'), p.export.replace('10050','-0')]) {
    assert.throws(() => candidate.importFile(file, bytes));
    assert.equal(fs.readFileSync(file, 'utf8'), p.export);
    assert.deepEqual(candidate.reopen(file, 'comma').record, p.record);
  }
});
test('invalid grammar, nonfinite/absent and precision/range inputs cannot coerce to zero', () => {
  for (const text of [undefined,NaN,Infinity,-Infinity,2,'',' ','+1','01','.5','1.','1e2','0x10','1 234','1\u00a0234','Ã¢Ë†â€™1','Ã¯Â¼â€˜Ã¯Â¼â€™','1_000','1\n','1\r\n','1,000.00','-1000.001'])
    assert.throws(() => candidate.parse(text,'dot','m'), RangeError);
  assert.equal(Object.is(candidate.parse('-0.000','dot','m'), -0), false);
  assert.equal(candidate.parse('1.0','dot','cm'), candidate.parse('1.000','dot','cm'));
  assert.equal(candidate.display(10060,'dot'), '1.01 cm');
  assert.equal(candidate.display(-10060,'dot'), '-1.01 cm');
  assert.equal(candidate.display(10040,'dot'), candidate.display(10000,'dot'));
  assert.notEqual(candidate.encode({schema:1,unit:'um',value:10040}), candidate.encode({schema:1,unit:'um',value:10000}));
});
test('comparison propagates infrastructure errors and rejects a one-unit canonical mismatch', () => {
  assert.throws(() => compare({quantity:() => { throw Error('unavailable'); }}), /unavailable/);
  const rows = compare({quantity:(...args) => {const result = candidate.quantity(...args);return {...result,um:result.um+1};}});
  assert.equal(rows.find(r => r.id === 'whole-m').passed, false);
});
