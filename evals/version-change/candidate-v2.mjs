// MIT. Adapted reconstruction: retain verified codec; expose both schemas and
// explicit migration. No reference, expected-output or checkpoint imports.
import { createStore as ledger } from '../import-export/candidate.mjs';
export function createStore(options) {
  const store = ledger(options);
  return {
    state: store.state,
    importBytes: bytes => store.importBytes(bytes),
    exportBytes: (version = 2) => store.exportBytes(version),
    migrate() {
      // Import performs complete validation and staging before commit. Opening
      // alone never rewrites an older save. Caller retains any desired backup.
      return store.importBytes(store.exportBytes(2));
    }
  };
}
