// Independent volatile service and pre-commit history records; no real I/O/auth.
export function controlledAdapter() {
  const jobs=new Map(),calls=[],effects=[],versions=new Map(),grants=new Map([['a/x',true],['b/x',true]]);
  const key=row=>JSON.stringify([row.scope,row.url]);
  function get(op) {const job=jobs.get(op);if (!job) throw Error('Unknown fixture operation');return job;}
  function request(kind,row) {
    if (jobs.has(row.op)) throw Error('Duplicate fixture operation');
    calls.push({kind,...structuredClone(row)});
    return new Promise((resolve,reject)=>jobs.set(row.op,{kind,...structuredClone(row),resolve,reject,committed:false,responded:false}));
  }
  return {
    read:request.bind(null,'read'),write:request.bind(null,'write'),
    history(row) {effects.push({kind:'history',...structuredClone(row)});},
    service(scope,allowed) {grants.set(scope,allowed);},
    commit(op) {
      const row=get(op);if (row.kind !== 'write' || row.committed) throw Error('Invalid fixture commit');
      const version=versions.get(key(row)) ?? 1;row.committed=true;
      row.receipt=grants.get(row.scope) !== true ? {status:'denied',version:null}
        : row.base !== version ? {status:'conflict',version} : {status:'saved',version:version+1};
      if (row.receipt.status === 'saved') {
        versions.set(key(row),row.receipt.version);
        effects.push({kind:'write',op,scope:row.scope,url:row.url,text:row.text,version:row.receipt.version});
      }
    },
    finish(op,value,failed=false) {
      const row=get(op);if (row.responded) throw Error('Already completed fixture operation');
      if (!failed && row.kind === 'write' && !row.committed) throw Error('Uncommitted fixture acknowledgement');
      row.responded=true;
      if (failed) row.reject(Error('Synthetic response loss or read error'));
      else row.resolve(row.kind === 'read' ? structuredClone(value) : structuredClone(row.receipt));
    },
    inspect() {return structuredClone({calls,effects});}
  };
}
