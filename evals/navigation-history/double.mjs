// In-memory read completions and separately recorded history effects only.
export function controlledAdapter() {
  const pending = new Map(), records = [];
  return {
    read(op,url) {
      if (pending.has(op)) throw Error('Duplicate fixture operation');
      records.push({kind:'read',op,url});
      return new Promise((resolve,reject) => pending.set(op,{resolve,reject}));
    },
    history(kind,key,url,index) { records.push({kind,key,url,index}); },
    finish(op,value,failed=false) {
      const current = pending.get(op);
      if (!current) throw Error('Unknown or completed fixture operation');
      pending.delete(op);
      if (failed) current.reject(Error('Synthetic read failure'));
      else current.resolve(value);
    },
    inspect() { return structuredClone(records); }
  };
}
