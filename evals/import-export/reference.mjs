// Synthetic source-exposed reference; frozen before candidate implementation.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
const reject = code => { const e = new Error(code); e.code = code; throw e; };
function parse(bytes) {
  if (bytes.length > 8192) reject('size');
  if (bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191]))) reject('encoding');
  let text, doc;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { reject('encoding'); }
  try { doc = JSON.parse(text); } catch { reject('syntax'); }
  function exact(value, names) {
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== names.sort().join(',')) reject('schema');
  }
  exact(doc, ['format', 'version', 'entries']);
  if (doc.format !== 'pocket-ledger' || typeof doc.version !== 'number') reject('schema');
  if (![1, 2].includes(doc.version)) reject('unsupported-version');
  if (!Array.isArray(doc.entries) || doc.entries.length > 16) reject('schema');
  const seen = new Set();
  return doc.entries.map(row => {
    exact(row, doc.version === 1 ? ['id', 'text'] : ['id', 'title', 'done']);
    const title = doc.version === 1 ? row.text : row.title;
    if (typeof row.id !== 'string' || !/^[a-z][a-z0-9-]{0,15}(?![\s\S])/.test(row.id) ||
        typeof title !== 'string' || [...title].length < 1 || [...title].length > 80 ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(title) ||
        (doc.version === 2 && typeof row.done !== 'boolean')) reject('schema');
    if (seen.has(row.id)) reject('duplicate-id');
    seen.add(row.id);
    return { id: row.id, title, done: doc.version === 1 ? false : row.done };
  });
}
function encode(rows, version) {
  if (![1, 2].includes(version)) reject('unsupported-version');
  if (version === 1 && rows.some(row => row.done)) reject('lossy-version');
  const entries = rows.map(row => version === 1 ? { id: row.id, text: row.title } : { ...row });
  const bytes = Buffer.from(JSON.stringify({ format: 'pocket-ledger', version, entries }) + '\n');
  if (bytes.length > 8192) reject('size');
  return bytes;
}
export function createStore({ file, beforeReplace = () => {} } = {}) {
  let rows = [];
  if (file) {
    try { rows = parse(fs.readFileSync(file)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return {
    state: () => structuredClone(rows),
    exportBytes: (version = 2) => encode(rows, version),
    importBytes(bytes) {
      const next = parse(bytes), canonical = encode(next, 2);
      if (file) {
        const temp = file + '.' + randomUUID() + '.tmp';
        try {
          fs.writeFileSync(temp, canonical, { flag: 'wx' });
          beforeReplace(temp, file);
          fs.renameSync(temp, file);
        } catch {
          try { fs.unlinkSync(temp); } catch { /* orphan cleanup is best effort */ }
          reject('persistence');
        }
      }
      rows = next;
      return this.state();
    }
  };
}
