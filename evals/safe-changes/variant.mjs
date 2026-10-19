// MIT. Separate request-driven variant; preserve the frozen custom composition.
import { createStore as baseline } from './baseline.mjs';
export function createStore(options) {
  const store = baseline(options);
  return { ...store, setDone(id, done) {
    if (typeof id !== 'string' || typeof done !== 'boolean') {
      throw Object.assign(new Error('schema'), { code: 'schema' });
    }
    const rows = store.state(), row = rows.find(item => item.id === id);
    if (!row) throw Object.assign(new Error('not-found'), { code: 'not-found' });
    if (row.done === done) return rows;
    row.done = done;
    return store.importBytes(Buffer.from(JSON.stringify({ format: 'pocket-ledger', version: 2, entries: rows }) + '\n'));
  } };
}
