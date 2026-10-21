import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compare, frozen, environment} from '../evals/date-locale/check.mjs';
import * as candidate from '../evals/date-locale/candidate.mjs';
const oracle = frozen();
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-date-locale-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-date-locale-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, {recursive: true, force: true});
  });
  return dir;
}
test('separately frozen literal date/zone expectations pass actual conversion paths', () => {
  const results = compare();
  assert.equal(results.length, 25);
  assert.deepEqual(results.filter(row => !row.passed), []);
  assert.equal(new Set(results.map(row => row.id)).size, results.length);
});
test('selected runtime records explicit Intl options and data versions without host mutation', t => {
  const before = process.env.TZ, context = environment();
  for (const options of context.projection) {
    assert.equal(options.calendar, 'gregory'); assert.equal(options.numberingSystem, 'latn');
    assert.equal(options.hourCycle, 'h23'); assert.equal(options.locale, 'en-GB');
  }
  assert.equal(process.env.TZ, before);
  t.diagnostic(JSON.stringify(context));
});
const mutations = [
  {id:'date-through-instant', target:'date-west-viewer', from:"const [y, m, d] = value.split('-');", to:"value = project(value + 'T00:00:00Z', viewerZone).date; const [y, m, d] = value.split('-');"},
  {id:'fixed-winter-offset', target:'spring-at', from:'const ms = instant(value);',
    to:"const ms = instant(value); const fixed = new Date(ms + 3600000).toISOString().slice(0, 19); return {date: fixed.slice(0, 10), wall: fixed, offsetMinutes: 60};"},
  {id:'display-string-sort', target:'sort-month-crossing', from:'return values.map(calendar).sort();',
    to:"return values.map(calendar).sort((a, b) => date(a, 'en-GB', 'UTC').display.localeCompare(date(b, 'en-GB', 'UTC').display));"},
  {id:'unchecked-wall-offset', target:'gap-standard-offset', from:"if (projected.wall !== local || projected.offsetMinutes !== offset) fail('wall-offset');", to:"if (false) fail('wall-offset');"}
];
for (const mutation of mutations) test('ordinary cases pass before boundary rejects ' + mutation.id, async t => {
  const source = fs.readFileSync(new URL('../evals/date-locale/candidate.mjs', import.meta.url), 'utf8');
  assert.equal(source.split(mutation.from).length, 2);
  const file = path.join(temporary(t), 'candidate.mjs');
  fs.writeFileSync(file, source.replace(mutation.from, mutation.to));
  const api = (await import(pathToFileURL(file))).operations;
  const ordinary = compare(api, oracle.ordinary);
  assert.ok(ordinary.every(row => row.passed));
  const row = compare(api, oracle.boundaries).find(row => row.id === mutation.target);
  assert.equal(row.passed, false);
  // An intended value mismatch, never a load/timeout or unrelated exception.
  if (mutation.id !== 'unchecked-wall-offset') assert.equal(Object.hasOwn(row.actual, 'error'), false);
  else assert.match(row.actual.instant, /Z$/);
  t.diagnostic(JSON.stringify({mutation:mutation.id, ordinaryPassed:ordinary.length, distinguishing:row}));
});
test('literal export, actual save/reopen and changed locale/zone preserve domain data', t => {
  const file = path.join(temporary(t), 'record.json'), p = oracle.persistence;
  assert.equal(candidate.encode(p.record), p.export);
  assert.deepEqual(candidate.decode(p.export), p.record);
  candidate.save(file, p.record);
  assert.equal(fs.readFileSync(file, 'utf8'), p.export);
  const gb = candidate.reopen(file, 'en-GB', 'Europe/Oslo');
  assert.equal(gb.calendar.display, p.gbDate);
  const us = candidate.reopen(file, 'en-US', 'UTC');
  assert.equal(us.calendar.display, p.usDate);
  assert.deepEqual(us.record, p.record); assert.deepEqual(us.event, p.utcEvent);
  assert.equal(fs.readFileSync(file, 'utf8'), p.export);
});
test('late inconsistent, invalid and unsupported records reject before changing stored bytes', t => {
  const file = path.join(temporary(t), 'record.json'), p = oracle.persistence;
  candidate.save(file, p.record);
  for (const record of [p.rejectedRecord, {...p.record, instant:'2026-10-25T00:30:00Z'},
    {...p.record, calendarDate:p.gbDate}, {...p.record, schema:2}, {...p.record, display:p.gbDate},
    {...p.record, sourceWall:'2026-03-29T02:30:00+01:00'}]) {
    assert.throws(() => candidate.save(file, record), RangeError);
    assert.equal(fs.readFileSync(file, 'utf8'), p.export);
    assert.deepEqual(candidate.reopen(file, 'en-US', 'UTC').record, p.record);
  }
});
test('comparison does not swallow infrastructure exceptions or accept a changed actual value', () => {
  assert.throws(() => compare({...candidate.operations, project:() => {throw Error('unavailable');}}), /unavailable/);
  const actual = compare({...candidate.operations, date:() => ({value:'2026-03-03',display:'03/03/2026'})});
  assert.equal(actual.find(row => row.id === 'date-ordinary').passed, false);
});
test('bounded profile rejects invalid days, clocks, precision, offsets and missing input', () => {
  for (const value of [null, 20260304, '', '2026-00-10', '2026-04-31', '1900-01-01', '2100-01-01', '2026-3-4', '2026-03-04Z'])
    assert.throws(() => candidate.calendar(value), RangeError);
  for (const value of ['2026-01-15T24:00:00Z','2026-01-15T12:60:00Z','2026-01-15T12:00:60Z','2026-01-15T12:00:00.000Z'])
    assert.throws(() => candidate.instant(value), RangeError);
  for (const value of ['2026-01-15T12:00:00+14:01','2026-01-15T12:00:00+01:60','2026-01-15T12:00:00-00:00'])
    assert.throws(() => candidate.wall(value, 'Europe/Oslo'), RangeError);
  assert.throws(() => candidate.decode('{'), SyntaxError);
});
