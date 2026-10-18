// Frozen reviewer literals; proposed synthetic behavior, no candidate imports.
const observation = (mode, overrides = {}) => ({ mode, draft: '', saved: null,
  items: null, status: 'idle', error: null, synchronization: 'not-requested',
  remoteVerified: false, adapterCalls: 0, storeBytes: null, ...overrides });
const saved = { draft: 'B', saved: 'B', synchronization: 'pending', storeBytes: '{"text":"B"}' };
const request = { operation: 'list', collection: 'notes' };
const list = { type: 'list', collection: 'notes' };
const edit = { type: 'edit', text: 'B' };
const save = { type: 'save' };
const reopen = { type: 'reopen' };
const record = response => ({ request, response });

export function backendCases() {
  return [
    { label: 'local-save-reopen', input: { mode: 'local', actions: [edit, save, reopen] },
      expected: observation('local', { ...saved, status: 'reopened' }) },
    { label: 'local-empty-success', input: { mode: 'local', actions: [list] },
      expected: observation('local', { items: [], status: 'ready', adapterCalls: 1 }) },
    { label: 'local-save-list', input: { mode: 'local', actions: [edit, save, list] },
      expected: observation('local', { ...saved, items: ['B'], status: 'ready', adapterCalls: 1 }) },
    { label: 'empty-note-is-data', input: { mode: 'local', actions: [save, reopen, list] },
      expected: observation('local', { saved: '', items: [''], status: 'ready', synchronization: 'pending', storeBytes: '{"text":""}', adapterCalls: 1 }) },
    { label: 'exact-text', input: { mode: 'local', actions: [{ type: 'edit', text: ' ø\n ' }, save, reopen] },
      expected: observation('local', { draft: ' ø\n ', saved: ' ø\n ', synchronization: 'pending', status: 'reopened', storeBytes: '{"text":" ø\\n "}' }) },
    { label: 'failed-save-keeps-draft-bytes', input: { mode: 'local', initialBytes: '{ "text": "A" }', actions: [edit, { type: 'save', reject: true }] },
      expected: observation('local', { draft: 'B', saved: 'A', status: 'error', error: 'local-write-failed', synchronization: 'pending', storeBytes: '{ "text": "A" }' }) },
    { label: 'unsaved-reopen', input: { mode: 'local', initialBytes: '{"text":"A"}', actions: [edit, reopen] },
      expected: observation('local', { draft: 'A', saved: 'A', status: 'reopened', synchronization: 'pending', storeBytes: '{"text":"A"}' }) },
    { label: 'malformed-store-preserved', input: { mode: 'local', initialBytes: '{broken', actions: [edit, save] },
      expected: observation('local', { status: 'error', error: 'malformed-store', storeBytes: '{broken' }) },
    { label: 'deferred-is-unavailable', input: { mode: 'deferred', actions: [list] },
      expected: observation('deferred', { status: 'error', error: 'unavailable', adapterCalls: 1 }) },
    { label: 'deferred-local-still-pending', input: { mode: 'deferred', actions: [edit, save, reopen, list] },
      expected: observation('deferred', { ...saved, status: 'error', error: 'unavailable', adapterCalls: 1 }) },
    { label: 'replay-empty-success', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: [] })], actions: [list] },
      expected: observation('replay', { items: [], status: 'ready', adapterCalls: 1 }) },
    { label: 'replay-does-not-synchronize', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: ['recorded'] })], actions: [edit, save, list] },
      expected: observation('replay', { ...saved, items: ['recorded'], status: 'ready', adapterCalls: 1 }) },
    { label: 'timeout-no-retry', input: { mode: 'replay', recordings: [record({ kind: 'timeout' }), record({ kind: 'ok', items: ['unused'] })], actions: [list] },
      expected: observation('replay', { status: 'error', error: 'timeout', adapterCalls: 1 }) },
    { label: 'unavailable-not-empty', input: { mode: 'replay', recordings: [record({ kind: 'unavailable' })], actions: [list] },
      expected: observation('replay', { status: 'error', error: 'unavailable', adapterCalls: 1 }) },
    { label: 'malformed-response', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: null })], actions: [list] },
      expected: observation('replay', { status: 'error', error: 'malformed-response', adapterCalls: 1 }) },
    { label: 'extra-response-field', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: [], synchronized: true })], actions: [list] },
      expected: observation('replay', { status: 'error', error: 'malformed-response', adapterCalls: 1 }) },
    { label: 'request-mismatch', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: [] })], actions: [{ type: 'list', collection: 'other' }] },
      expected: observation('replay', { status: 'error', error: 'replay-mismatch', adapterCalls: 1 }) },
    { label: 'replay-exhausted-keeps-stale-items', input: { mode: 'replay', recordings: [record({ kind: 'ok', items: ['recorded'] })], actions: [list, list] },
      expected: observation('replay', { items: ['recorded'], status: 'error', error: 'replay-mismatch', adapterCalls: 2 }) },
    { label: 'local-unknown-collection', input: { mode: 'local', actions: [{ type: 'list', collection: 'other' }] },
      expected: observation('local', { status: 'error', error: 'unavailable', adapterCalls: 1 }) },
    ...[
      ['invalid-mode', { mode: 'remote', actions: [] }],
      ['too-many-actions', { mode: 'local', actions: Array(17).fill(list) }],
      ['oversized-text', { mode: 'local', actions: [{ type: 'edit', text: 'x'.repeat(257) }] }],
      ['unknown-action', { mode: 'local', actions: [{ type: 'upload' }] }],
    ].map(([label, input]) => ({ label, input, expected: null })),
  ];
}
