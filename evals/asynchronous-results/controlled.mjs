// Test infrastructure, not a real backend or scheduler implementation.
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {resolve = a; reject = b;});
  return {promise, resolve, reject};
}
export function controlledReads() {
  const requests = new Map();
  return {
    request(id, input, signal) {
      if (requests.has(id)) throw Error('duplicate transport id');
      const item = {...deferred(), input, signal, settled:false};
      requests.set(id, item); return item.promise;
    },
    settle(kind, id, value) {
      const item = requests.get(id);
      if (!item || item.settled) throw Error('unknown or settled transport id');
      item.settled = true;
      if (kind === 'resolve') item.resolve(value);
      else if (kind === 'cancelled') {
        if (!item.signal.aborted) throw Error('no abort requested');
        item.reject({kind:'cancelled', message:'worker confirmed cancellation'});
      } else if (kind === 'reject') item.reject({kind:'failure', message:value});
      else throw Error('unknown completion');
    }
  };
}

// One process, one instance, serialized delivery. Entries retained until disposal.
// No eviction, crash recovery, cross-instance or concurrent duplicate guarantee.
export function controlledEffects() {
  const records = new Map(), effects = [];
  let pending = null, attempts = 0, unavailable = false;
  function commit(key, value) {
    const prior = records.get(key);
    if (prior && prior.value !== value) throw Error('key payload mismatch');
    if (prior) return prior.receipt;
    const receipt = `receipt-${effects.length + 1}`;
    effects.push(value); records.set(key, {value, receipt}); return receipt;
  }
  return {
    send(key, value) {
      if (pending) throw Error('double supports one in-flight attempt');
      pending = {...deferred(), key, value}; attempts++; return pending.promise;
    },
    deliver(mode) {
      if (!pending) throw Error('no in-flight attempt');
      const item = pending; pending = null;
      if (mode === 'ok' || mode === 'commit-lost') {
        let receipt;
        try { receipt = commit(item.key,item.value); }
        catch (error) { item.reject(error); return; }
        if (mode === 'ok') item.resolve({state:'completed',receipt});
        else item.reject(Error('response lost'));
      } else if (mode === 'not-applied') item.resolve({state:'not-applied'});
      else if (mode === 'lost') item.reject(Error('disconnected before apply'));
      else throw Error('unknown delivery mode');
    },
    async lookup(key, value) {
      if (unavailable || pending) return {state:'unknown'};
      const prior = records.get(key);
      if (prior && prior.value !== value) throw Error('key payload mismatch');
      return prior ? {state:'completed',receipt:prior.receipt} : {state:'not-applied'};
    },
    unavailable() { unavailable = true; },
    snapshot() { return {effects:[...effects], attempts}; }
  };
}
