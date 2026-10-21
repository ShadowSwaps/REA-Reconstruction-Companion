// Proposed local policy; transport and provider are supplied controlled doubles.
export function createReader(transport) {
  let owner = 'owner-1', active = null;
  let view = [owner, true, '', null, null, 'idle', false];
  const operations = new Map();
  const current = op => active === op && owner === op.owner && view[1];
  const accepts = op => current(op) && !op.controller.signal.aborted;
  return {
    start(id, input) {
      if (operations.has(id)) throw Error('duplicate operation');
      const op = {id, input, owner, state:'pending', controller:new AbortController()};
      operations.set(id, op); active = op;
      view = [owner, true, input, null, null, 'pending', true];
      // No sleep, global timer, network request or auto-abort on replacement.
      op.done = transport.request(id, input, op.controller.signal).then(value => {
        op.state = 'completed';
        if (accepts(op)) { view[3] = value; view[5] = 'completed'; }
      }, error => {
        op.state = error.kind === 'cancelled' ? 'cancelled' : 'failed';
        if (op.state === 'cancelled' && current(op)) view[5] = 'cancelled';
        else if (accepts(op)) { view[4] = error.message; view[5] = 'failed'; }
      }).finally(() => {
        if (accepts(op)) view[6] = false;
      });
    },
    dismiss() { active = null; view[1] = false; view[5] = 'dismissed'; view[6] = false; },
    owner(value) { owner = value; active = null; view = [owner, true, '', null, null, 'idle', false]; },
    abort() {
      if (!active || active.state !== 'pending') throw Error('no pending operation');
      active.controller.abort(); view[5] = 'abort-requested'; view[6] = false;
    },
    done(id) { return operations.get(id).done; },
    snapshot() {
      return {view:[...view], operations:[...operations.values()].map(op =>
        `${op.id}:${op.owner}:${op.input}:${op.state}:${op.controller.signal.aborted}`)};
    }
  };
}

export function createWriter(provider) {
  let key = null, value = null, state = 'idle', receipt = null, done;
  function send() {
    state = 'pending';
    done = provider.send(key, value).then(result => {
      state = result.state; receipt = result.receipt ?? null;
    }, () => { state = 'unknown'; });
  }
  return {
    start(id, payload) {
      // One logical effect per writer, no replacement of an unresolved intent.
      if (key !== null) throw Error('intent already exists');
      key = id; value = payload; send();
    },
    retry() { if (state === 'not-applied') send(); },
    async reconcile() {
      if (state !== 'unknown') return;
      // Double lookup is serialized after settlement; a real empty lookup can race.
      const result = await provider.lookup(key, value);
      state = result.state; receipt = result.receipt ?? null;
    },
    done() { return done; },
    snapshot() { return [key, value, state, receipt]; }
  };
}
