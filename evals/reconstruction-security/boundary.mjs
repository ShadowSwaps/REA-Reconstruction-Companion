// MIT. Proposed local boundary; simulated session resolver, not authentication.
// No oracle/reference imports. The historical codec/baseline stays unchanged.
import { createStore } from '../safe-changes/baseline.mjs';
function fail(code) { throw Object.assign(new Error(code), { code }); }
function bounded(bytes) {
  if (!(bytes instanceof Uint8Array)) fail('schema');
  if (bytes.byteLength > 2048) fail('size');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('encoding'); }
  // A resource-budget scan only. JSON syntax/schema remain the codec's job.
  let quoted = false, escaped = false, depth = 0;
  for (const ch of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === '{' || ch === '[') { if (++depth > 4) fail('depth'); }
    else if (ch === '}' || ch === ']') --depth;
  }
}
const codes = new Set(['schema', 'size', 'depth', 'encoding', 'syntax',
  'unsupported-version', 'duplicate-id', 'lossy-version', 'persistence', 'denied']);
export function createBoundary({ file, resolveSession }) {
  const store = createStore({ file }), events = [];
  return {
    dispatch(handle, operation, bytes) {
      let result;
      try {
        const principal = resolveSession(handle);
        if (!principal || principal.ledger !== 'demo' ||
            !['reader', 'writer'].includes(principal.role) ||
            !['import', 'export', 'display'].includes(operation) ||
            (operation === 'import' && principal.role !== 'writer')) fail('denied');
        if (operation === 'import') {
          bounded(bytes);
          result = { ok: true, rows: store.importBytes(bytes) };
        } else if (operation === 'export') result = { ok: true, text: store.exportBytes(2).toString('utf8') };
        else result = { ok: true, text: store.listTitles().join('\n') };
      } catch (error) {
        result = { ok: false, code: codes.has(error.code) ? error.code : 'internal' };
      }
      // Fixed projections; never record raw input, handles or exception text.
      events.push({ code: result.ok ? 'ok' : result.code });
      return result;
    },
    diagnostics() { return events.map(event => ({ ...event })); }
  };
}
export function renderText(element, text) { element.textContent = text; }
