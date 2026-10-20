// MIT. Proposed local import-confirmation workflow over the historical codec.
import { randomUUID } from 'node:crypto';
import { createStore } from '../import-export/candidate.mjs';

export function createWorkflow(options) {
  const store = createStore(options);
  let pending = null, screen = 'idle';
  const stale = () => ({ ok: false, error: 'stale-selection' });
  return {
    snapshot() {
      return { screen, committed: store.state(), preview: pending ? structuredClone(pending.rows) : null };
    },
    select(bytes) {
      // Validate before replacing an existing preview; copy caller-owned bytes.
      const copy = Buffer.from(bytes);
      let rows;
      try { rows = createStore().importBytes(copy); }
      catch (error) { return { ok: false, error: error.code }; }
      const token = randomUUID();
      pending = { token, bytes: copy, rows }; screen = 'preview';
      return { ok: true, token };
    },
    confirm(token) {
      if (!pending || token !== pending.token) return stale();
      try { store.importBytes(pending.bytes); }
      catch (error) {
        screen = 'error'; // Retain pending input so this exact selection can retry.
        return { ok: false, error: error.code };
      }
      pending = null; screen = 'saved';
      return { ok: true };
    },
    cancel(token) {
      if (!pending || token !== pending.token) return stale();
      pending = null; screen = 'idle';
      return { ok: true };
    }
  };
}
