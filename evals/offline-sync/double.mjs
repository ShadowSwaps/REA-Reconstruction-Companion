import {isDeepStrictEqual} from 'node:util';
// Controlled synthetic service: no socket, timer, disk, credentials or real auth.
export function recordingService(initial) {
  let server = structuredClone(initial);
  const attempts = [], effects = [], lookups = [], replies = new Map(), receipts = new Map();
  const clone = value => structuredClone(value);
  const binding = ({ticket,...operation}) => operation;
  const key = op => JSON.stringify([op.owner,op.document,op.id]);
  function start(request) {
    if (attempts.some(item => item.ticket === request.ticket)) throw Error('Duplicate fixture ticket');
    attempts.push(clone(request));
  }
  function finish(ticket,mode) {
    const request = attempts.find(item => item.ticket === ticket);
    if (!request || replies.has(ticket) || !['ok','no-effect','lost-ack','unknown-before'].includes(mode)) throw Error('Invalid fixture completion');
    const reply = {id:request.id,ticket,outcome:'unknown'};
    if (mode === 'no-effect') reply.outcome = 'no-effect';
    else if (mode !== 'unknown-before') {
      if (request.owner !== 'alice' || request.document !== 'note') throw Error('Invalid simulated scope');
      const saved = receipts.get(key(request));
      if (saved && !isDeepStrictEqual(saved.binding,binding(request))) throw Error('Changed key/payload binding');
      if (saved) { reply.outcome = 'ok'; reply.record = clone(saved.record); }
      else if (request.base !== server.revision) { reply.outcome = 'conflict'; reply.record = clone(server); }
      else {
        server = {value:request.value,revision:server.revision+1};
        effects.push({id:request.id,owner:request.owner,document:request.document,...clone(server)});
        receipts.set(key(request),{binding:binding(request),record:clone(server)});
        reply.outcome = 'ok'; reply.record = clone(server);
      }
      if (mode === 'lost-ack') { reply.outcome = 'unknown'; delete reply.record; }
    }
    replies.set(ticket,clone(reply)); return reply;
  }
  function lookup(operation) {
    lookups.push(clone(operation));
    const saved = receipts.get(key(operation));
    if (saved && !isDeepStrictEqual(saved.binding,operation)) throw Error('Changed reconciliation binding');
    return saved ? {outcome:'ok',record:clone(saved.record)} : {outcome:'unknown'};
  }
  return {start,finish,lookup,
    repeat(ticket) { if (!replies.has(ticket)) throw Error('Missing fixture reply'); return clone(replies.get(ticket)); },
    external(value) { server = {value,revision:server.revision+1}; },
    inspect:() => clone({attempts,effects,server,lookups})};
}
