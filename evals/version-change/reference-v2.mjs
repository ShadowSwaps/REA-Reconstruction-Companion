// MIT. Synthetic product release 2: both schemas, explicit saved-data migration.
import { createStore as ledger } from '../import-export/reference.mjs';
export function createStore(options) {
  const store = ledger(options);
  return Object.assign(store, { migrate() { return store.importBytes(store.exportBytes(2)); } });
}
