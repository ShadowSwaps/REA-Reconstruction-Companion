// Bounded teaching profile. No Date.parse of domain inputs or host-default zone.
import fs from 'node:fs';
const zones = ['Europe/Oslo', 'America/Los_Angeles', 'UTC'];
const fail = code => { throw new RangeError(code); };
const zoneCheck = zone => { if (!zones.includes(zone)) fail('zone'); };
export function calendar(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) fail('date');
  const [y, m, d] = value.split('-').map(Number);
  const days = [31, y % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) fail('date');
  return value;
}
function clock(value, code) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) fail(code);
  calendar(value.slice(0, 10));
  const [h, m, s] = value.slice(11).split(':').map(Number);
  if (h > 23 || m > 59 || s > 59) fail(code);
  return Date.UTC(...[...value.slice(0, 10).split('-').map(Number), h, m, s].map((n, i) => i === 1 ? n - 1 : n));
}
export function instant(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) fail('instant');
  return clock(value.slice(0, -1), 'instant');
}
export const formatOptions = zone => ({timeZone: zone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
export function project(value, zone) {
  zoneCheck(zone);
  const ms = instant(value);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', formatOptions(zone)).formatToParts(ms)
    .filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const wall = `${date}T${parts.hour}:${parts.minute}:${parts.second}`;
  return {date, wall, offsetMinutes: (clock(wall, 'wall') - ms) / 60000};
}
export function date(value, locale, viewerZone) {
  calendar(value); zoneCheck(viewerZone);
  if (!['en-GB', 'en-US'].includes(locale)) fail('locale');
  const [y, m, d] = value.split('-');
  return {value, display: locale === 'en-GB' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`};
}
export function wall(value, zone) {
  zoneCheck(zone);
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value)) fail('wall');
  const local = value.slice(0, 19), hours = Number(value.slice(20, 22)), minutes = Number(value.slice(23));
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0) || value.endsWith('-00:00')) fail('wall');
  const offset = (hours * 60 + minutes) * (value[19] === '+' ? 1 : -1);
  const result = new Date(clock(local, 'wall') - offset * 60000).toISOString().replace('.000Z', 'Z');
  const projected = project(result, zone);
  if (projected.wall !== local || projected.offsetMinutes !== offset) fail('wall-offset');
  return {instant: result, zone, sourceWall: value};
}
export function sort(values) {
  if (!Array.isArray(values)) fail('date');
  return values.map(calendar).sort();
}
export function encode(record) {
  if (!record || Array.isArray(record) || typeof record !== 'object' || record.schema !== 1 ||
      Object.keys(record).sort().join(',') !== 'calendarDate,instant,schema,sourceWall,zone') fail('record');
  calendar(record.calendarDate); instant(record.instant);
  if (wall(record.sourceWall, record.zone).instant !== record.instant) fail('record');
  return JSON.stringify({schema: 1, calendarDate: record.calendarDate, instant: record.instant,
    zone: record.zone, sourceWall: record.sourceWall}) + '\n';
}
export function decode(bytes) {
  const record = JSON.parse(bytes);
  encode(record);
  return record;
}
export function save(file, record) {
  const bytes = encode(record); // All semantic rejection precedes the write.
  fs.writeFileSync(file, bytes, 'utf8'); // No crash/concurrency/hostile-path guarantee.
}
export function reopen(file, locale, viewerZone) {
  const record = decode(fs.readFileSync(file, 'utf8'));
  return {record, calendar: date(record.calendarDate, locale, viewerZone), event: project(record.instant, viewerZone)};
}
export const operations = {date, project, wall, sort};
