// A manually controlled service double, never an authentication implementation.
export function controlledService() {
  const pending=new Map(), calls=[], effects=[], grants=new Map();
  function request(kind,request) {
    if (pending.has(request.op)) throw Error('Duplicate fixture operation');
    calls.push({kind,...structuredClone(request)});
    return new Promise((resolve,reject)=>pending.set(request.op,{kind,...structuredClone(request),resolve,reject,committed:false}));
  }
  function get(op) {
    const row=pending.get(op);if (!row) throw Error('Unknown or completed fixture operation');return row;
  }
  return {
    read:request.bind(null,'read'),write:request.bind(null,'write'),
    service(scope,allowed) {grants.set(scope,allowed);},
    commit(op) {
      const row=get(op);
      if (row.kind !== 'write' || row.committed) throw Error('Invalid fixture commit');
      row.committed=true;row.receipt=grants.get(row.scope) === false ? 'denied' : 'saved';
      if (row.receipt === 'saved') effects.push({op,scope:row.scope,text:row.text});
    },
    finish(op,value,failed=false) {
      const row=get(op);
      if (!failed && row.kind === 'write' && !row.committed) throw Error('Uncommitted fixture acknowledgement');
      pending.delete(op);
      if (failed) row.reject(Error('Synthetic response loss or read failure'));
      else row.resolve(row.kind === 'write' ? row.receipt : value);
    },
    inspect() {return structuredClone({calls,effects});}
  };
}
