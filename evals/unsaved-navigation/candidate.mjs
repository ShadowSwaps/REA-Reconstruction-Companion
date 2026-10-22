// Finite teaching profile. Promise completion and canonical storage are doubles.
export function createEditor(initial) {
  const saved = structuredClone(initial.saved);
  let doc = initial.doc, owner = initial.owner, draft = initial.draft;
  let revision = initial.revision, feedback = initial.feedback;
  let pending = null, intent = null, sequence = 0;
  const jobs = new Map();
  const dirty = () => doc !== null && revision !== saved[doc].revision;
  const snapshot = () => structuredClone({doc, owner, draft, revision,
    dirty:dirty(), feedback, pending, intent, saved});
  function open(target) {
    owner++;
    doc = target === 'closed' ? null : target;
    draft = doc === null ? null : saved[doc].text;
    revision = doc === null ? null : saved[doc].revision;
    feedback = doc === null ? 'closed' : 'saved';
    pending = null; intent = null;
  }
  function startSave() {
    if (pending || !dirty()) return;
    const capture = {op:++sequence, doc, owner, text:draft, revision};
    pending = capture; feedback = 'saving';
    let release;
    const completion = new Promise(resolve => { release = resolve; }).then(ok => {
      // In this double the same guard also owns the in-memory commit. It
      // cannot cancel or roll back a real external storage operation.
      if (capture.owner !== owner || capture.doc !== doc || pending?.op !== capture.op) return;
      pending = null;
      if (!ok) { feedback = 'failed'; return; }
      saved[capture.doc] = {text:capture.text, revision:capture.revision};
      feedback = dirty() ? 'edited' : 'saved';
      if (!dirty() && intent !== null) open(intent);
    });
    jobs.set(capture.op, {release, completion});
  }
  function target(value) {
    if (value !== 'closed' && !Object.hasOwn(saved, value)) throw Error('Unknown target');
    return value;
  }
  async function dispatch(action) {
    switch (action.type) {
      case 'inspect': break;
      case 'edit':
        if (doc === null || typeof action.text !== 'string') throw Error('Invalid edit');
        if (draft !== action.text) {
          draft = action.text; revision++;
          feedback = pending ? 'saving' : 'edited';
        }
        break;
      case 'save':
        if (doc === null) throw Error('No open document');
        startSave(); break;
      case 'leave': {
        if (doc === null) throw Error('No open document');
        const next = target(action.target);
        if (next === doc) break;
        if (dirty() || pending) intent = next;
        else open(next);
        break;
      }
      case 'choose': {
        if (!['save','discard','cancel'].includes(action.choice)) throw Error('Unknown choice');
        if (intent === null) break;
        if (action.choice === 'cancel') { intent = null; break; }
        if (action.choice === 'discard') {
          if (pending) throw Error('Outside profile: resolve in-flight save before discard');
          open(intent);
        } else startSave();
        break;
      }
      case 'complete': {
        const job = jobs.get(action.op);
        if (!job || typeof action.ok !== 'boolean') throw Error('Unknown/invalid controlled completion');
        jobs.delete(action.op);
        job.release(action.ok);
        await job.completion; // Exceptions propagate; never become useful mismatches.
        break;
      }
      case 'replaceOwner':
        // Synthetic lifecycle invalidation; deliberately not a UI escape hatch.
        open(target(action.target)); break;
      default: throw Error('Unknown action');
    }
    return snapshot();
  }
  return {dispatch, snapshot};
}
