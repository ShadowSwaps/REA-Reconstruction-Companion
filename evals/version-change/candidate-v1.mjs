// MIT. Saved reconstruction: historical independent codec, schema-1 API boundary.
import { createStore as ledger } from '../import-export/candidate.mjs';
export function createStore(options) {
  const store = ledger(options);
  return {
    state: store.state,
    exportBytes(version = 1) {
      if (version !== 1) throw Object.assign(new Error('unsupported-version'), { code: 'unsupported-version' });
      return store.exportBytes(1);
    },
    importBytes(bytes) {
      let doc;
      try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return store.importBytes(bytes); }
      if (doc?.format === 'pocket-ledger' && doc.version !== 1)
        throw Object.assign(new Error('unsupported-version'), { code: 'unsupported-version' });
      return store.importBytes(bytes);
    }
  };
}
