// Reconstruction from the frozen synthetic contract; no reference/oracle imports.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
function fail(code) { throw Object.assign(new Error(code), { code }); }
function fields(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('schema');
  if (Object.keys(value).length !== allowed.length || allowed.some(key => !Object.hasOwn(value, key))) fail('schema');
}
function decode(bytes) {
  if (bytes.byteLength > 8192) fail('size');
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('encoding');
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('encoding'); }
  let data;
  try { data = JSON.parse(source); } catch { fail('syntax'); }
  fields(data, ['format', 'version', 'entries']);
  if (data.format !== 'pocket-ledger' || typeof data.version !== 'number') fail('schema');
  if (data.version !== 1 && data.version !== 2) fail('unsupported-version');
  if (!Array.isArray(data.entries) || data.entries.length > 16) fail('schema');
  const result = [], ids = new Set();
  for (const record of data.entries) {
    fields(record, data.version === 2 ? ['id', 'title', 'done'] : ['id', 'text']);
    const id = record.id, title = data.version === 2 ? record.title : record.text;
    if (typeof id !== 'string' || id.length < 1 || id.length > 16 || id[0] < 'a' || id[0] > 'z' ||
        [...id].some(ch => !'abcdefghijklmnopqrstuvwxyz0123456789-'.includes(ch))) fail('schema');
    if (typeof title !== 'string') fail('schema');
    const characters = Array.from(title);
    if (characters.length < 1 || characters.length > 80 || characters.some(ch => {
      const point = ch.codePointAt(0); return point >= 0xd800 && point <= 0xdfff;
    })) fail('schema');
    if (data.version === 2 && typeof record.done !== 'boolean') fail('schema');
    if (ids.has(id)) fail('duplicate-id');
    ids.add(id);
    result.push({ id, title, done: data.version === 2 ? record.done : false });
  }
  return result;
}
function serialize(records, version) {
  if (version !== 1 && version !== 2) fail('unsupported-version');
  const entries = [];
  for (const record of records) {
    if (version === 1 && record.done) fail('lossy-version');
    entries.push(version === 1 ? { id: record.id, text: record.title }
      : { id: record.id, title: record.title, done: record.done });
  }
  const output = Buffer.from(JSON.stringify({ format: 'pocket-ledger', version, entries }) + '\n', 'utf8');
  if (output.length > 8192) fail('size');
  return output;
}
function readBounded(file) {
  const descriptor = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(8193);
    let used = 0, count;
    while (used < buffer.length && (count = fs.readSync(descriptor, buffer, used, buffer.length - used, null))) used += count;
    if (used > 8192) fail('size');
    return buffer.subarray(0, used);
  } finally { fs.closeSync(descriptor); }
}
export function createStore({ file, beforeReplace = () => {} } = {}) {
  let committed = [];
  if (file) {
    try { committed = decode(readBounded(file)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const api = {
    state() { return committed.map(row => ({ ...row })); },
    exportBytes(version = 2) { return serialize(committed, version); },
    importBytes(bytes) {
      const staged = decode(bytes), encoded = serialize(staged, 2);
      if (file) {
        const sibling = `${file}.${randomUUID()}.tmp`;
        try {
          fs.writeFileSync(sibling, encoded, { flag: 'wx' });
          beforeReplace(sibling, file);
          fs.renameSync(sibling, file);
        } catch {
          try { fs.unlinkSync(sibling); } catch { /* best-effort temporary cleanup */ }
          fail('persistence');
        }
      }
      committed = staged;
      return api.state();
    }
  };
  return api;
}
