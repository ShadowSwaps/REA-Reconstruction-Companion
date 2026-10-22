// Proposed single-document, single-slot policy. All accepted state is volatile.
export function createEditor(initial, service) {
  let owner = 'alice', online = false, draft = {value:initial.value,edit:0};
  let confirmed = structuredClone(initial), pending = null, remote = null;
  let nextId = 1, nextTicket = 1;
  const snapshot = () => structuredClone({owner,online,draft,confirmed,pending,remote});
  const inScope = () => owner === 'alice';
  function receive(reply) {
    if (!pending || !inScope() || pending.state !== 'in-flight' || reply.id !== pending.id || reply.ticket !== pending.ticket) return;
    if (reply.outcome === 'ok') { confirmed = structuredClone(reply.record); pending = null; remote = null; }
    else if (reply.outcome === 'conflict') { pending.state = 'conflicted'; pending.ticket = null; remote = structuredClone(reply.record); }
    else { pending.state = reply.outcome === 'no-effect' ? 'queued' : 'unknown'; pending.ticket = null; }
  }
  function dispatch(action) {
    switch (action.type) {
      case 'edit': if (inScope()) draft = {value:action.value,edit:draft.edit+1}; break;
      case 'online': online = action.value; break;
      case 'owner':
        owner = action.value;
        if (!inScope() && pending?.state === 'in-flight') pending.state = 'unknown';
        break;
      case 'accept':
        if (inScope() && !pending) pending = {id:'o'+nextId++,owner:'alice',document:'note',value:draft.value,edit:draft.edit,base:confirmed.revision,state:'queued',ticket:null};
        break;
      case 'send':
        if (!inScope() || !online || pending?.state !== 'queued') break;
        pending.state = 'in-flight'; pending.ticket = nextTicket++;
        service.start({ticket:pending.ticket,id:pending.id,owner:pending.owner,document:pending.document,value:pending.value,edit:pending.edit,base:pending.base});
        break;
      case 'result': receive(action.reply); break;
      case 'reconcile': {
        if (!inScope() || !online || pending?.state !== 'unknown') break;
        const {state,ticket,...binding} = pending;
        const receipt = service.lookup(binding);
        if (receipt.outcome === 'ok') { confirmed = structuredClone(receipt.record); pending = null; remote = null; }
        // An absent receipt alone never authorizes replay in this policy.
        break;
      }
      case 'rebase':
        if (inScope() && pending?.state === 'conflicted') {
          pending = {...pending,id:'o'+nextId++,base:remote.revision,state:'queued',ticket:null};
          remote = null;
        }
        break;
      case 'discard':
        if (inScope() && pending && ['queued','conflicted'].includes(pending.state)) {
          if (remote) confirmed = structuredClone(remote);
          pending = null; remote = null;
        }
        break;
      default: throw Error('Unknown fixture action');
    }
    return snapshot();
  }
  return {snapshot,dispatch};
}
