// Proposed synthetic local design, not recovered backend implementation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.length <= 256;
const keys = (x, required, optional = []) => object(x)
  && required.every(k => Object.hasOwn(x, k))
  && Object.keys(x).every(k => [...required, ...optional].includes(k));

function validInput(input) {
  if (!keys(input, ['mode', 'actions'], ['recordings', 'initialBytes'])
    || !['local', 'replay', 'deferred'].includes(input.mode)
    || !Array.isArray(input.actions) || input.actions.length > 16
    || (Object.hasOwn(input, 'initialBytes') && (typeof input.initialBytes !== 'string' || Buffer.byteLength(input.initialBytes) > 2048))
    || (Object.hasOwn(input, 'recordings') && (!Array.isArray(input.recordings) || input.recordings.length > 16))) return false;
  return input.actions.every(a => {
    if (!object(a)) return false;
    if (a.type === 'edit') return keys(a, ['type', 'text']) && text(a.text);
    if (a.type === 'save') return keys(a, ['type'], ['reject']) && (!Object.hasOwn(a, 'reject') || a.reject === true);
    if (a.type === 'reopen') return keys(a, ['type']);
    return a.type === 'list' && keys(a, ['type', 'collection']) && text(a.collection);
  });
}

// Only reads the explicitly selected synthetic records; never tries a provider.
function adapterFor(mode, recordings, readSaved) {
  let index = 0;
  return request => {
    if (mode === 'deferred') return { kind: 'unavailable' };
    if (mode === 'local') {
      if (request.collection !== 'notes') return { kind: 'unavailable' };
      const saved = readSaved();
      return { kind: 'ok', items: saved === null ? [] : [saved] };
    }
    const record = recordings[index++];
    if (!keys(record, ['request', 'response']) || !isDeepStrictEqual(record.request, request)) return { kind: 'replay-mismatch' };
    const response = record.response;
    if (keys(response, ['kind', 'items']) && response.kind === 'ok'
      && Array.isArray(response.items) && response.items.length <= 16 && response.items.every(text)) return response;
    if (keys(response, ['kind']) && ['timeout', 'unavailable'].includes(response.kind)) return response;
    return { kind: 'malformed-response' };
  };
}

export function evaluate(input) {
  if (!validInput(input)) return null;
  const parent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'rea-backend-'));
  const store = path.join(directory, 'note.json');
  try {
    if (Object.hasOwn(input, 'initialBytes')) fs.writeFileSync(store, input.initialBytes, 'utf8');
    const state = { mode: input.mode, draft: '', saved: null, items: null, status: 'idle',
      error: null, synchronization: 'not-requested', remoteVerified: false, adapterCalls: 0 };
    const bytes = () => fs.existsSync(store) ? fs.readFileSync(store, 'utf8') : null;
    const fail = code => { state.status = 'error'; state.error = code; };
    const success = status => { state.status = status; state.error = null; };
    const load = () => {
      const raw = bytes();
      let saved = null;
      if (raw !== null) {
        try {
          const document = JSON.parse(raw);
          if (!keys(document, ['text']) || !text(document.text)) throw new Error('Invalid synthetic store');
          saved = document.text;
        } catch { fail('malformed-store'); return false; }
      }
      state.saved = saved; state.draft = saved ?? ''; state.items = null;
      state.synchronization = saved === null ? 'not-requested' : 'pending';
      return true;
    };
    const adapter = adapterFor(input.mode, input.recordings ?? [], () => state.saved);
    if (load()) for (const action of input.actions) {
      if (action.type === 'edit') {
        state.draft = action.text; success('edited');
      } else if (action.type === 'save') {
        // Controlled pre-write rejection, not a real permission/quota/crash test.
        if (action.reject) { fail('local-write-failed'); continue; }
        fs.writeFileSync(store, JSON.stringify({ text: state.draft }), 'utf8');
        state.saved = state.draft; state.synchronization = 'pending'; success('locally-saved');
      } else if (action.type === 'reopen') {
        if (load()) success('reopened');
      } else {
        state.adapterCalls++;
        const response = adapter({ operation: 'list', collection: action.collection });
        if (response.kind === 'ok') { state.items = [...response.items]; success('ready'); }
        else fail(response.kind);
      }
    }
    return { ...state, storeBytes: bytes() };
  } finally {
    // This path was created here; no supplied path participates in cleanup.
    if (path.dirname(directory) !== parent || !path.basename(directory).startsWith('rea-backend-')) throw new Error('Unexpected temporary path');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
