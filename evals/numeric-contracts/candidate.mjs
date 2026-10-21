// Proposed, source-exposed fixed length profile, not a general decimal/locale engine.
import fs from 'node:fs';
const fail = code => { throw new RangeError(code); };
function grammar(profile) {
  if (!['dot', 'comma'].includes(profile)) fail('grammar');
  return profile === 'dot' ? '.' : ',';
}
export function canonical(value) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 1000000000) fail('range');
  return value === 0 ? 0 : value;
}
export function parse(text, profile, unit) {
  const separator = grammar(profile);
  if (!['m', 'cm'].includes(unit)) fail('unit');
  if (typeof text !== 'string' || text.length > 16) fail('input');
  const pattern = separator === '.' ? /^-?(0|[1-9]\d*)(?:\.(\d{1,3}))?$/ : /^-?(0|[1-9]\d*)(?:,(\d{1,3}))?$/;
  const match = pattern.exec(text);
  if (!match) fail('input');
  // Every intermediate is an exact integer in this bounded profile.
  const thousandths = Number(match[1]) * 1000 + Number((match[2] ?? '').padEnd(3, '0'));
  const factor = unit === 'm' ? 1000 : 10;
  const magnitude = thousandths * factor;
  return canonical(text.startsWith('-') ? -magnitude : magnitude);
}
export function display(value, profile) {
  value = canonical(value);
  const separator = grammar(profile);
  // 0.01 cm = 100 um. Quantize magnitude once, after exact unit conversion.
  const hundredths = Math.floor((Math.abs(value) + 50) / 100);
  const sign = value < 0 && hundredths !== 0 ? '-' : '';
  return sign + Math.floor(hundredths / 100) + separator + String(hundredths % 100).padStart(2, '0') + ' cm';
}
export function quantity(text, profile, unit) {
  const um = parse(text, profile, unit);
  return {um, display: display(um, profile)};
}
function record(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'schema,unit,value' || value.schema !== 1 || value.unit !== 'um') fail('record');
  return {schema: 1, unit: 'um', value: canonical(value.value)};
}
export function encode(value) { return JSON.stringify(record(value)) + '\n'; }
export function decode(bytes) {
  // This profile accepts its exact canonical wire encoding only, including LF.
  if (typeof bytes !== 'string' || bytes.length > 100) fail('record');
  const value = record(JSON.parse(bytes));
  if (encode(value) !== bytes) fail('encoding');
  return value;
}
export function save(file, value) {
  const bytes = encode(value); // Semantic rejection occurs before opening the file.
  fs.writeFileSync(file, bytes);
}
export function importFile(file, bytes) {
  const value = decode(bytes);
  save(file, value);
}
export function reopen(file, profile) {
  const value = decode(fs.readFileSync(file, 'utf8'));
  return {record: value, display: display(value.value, profile)};
}
