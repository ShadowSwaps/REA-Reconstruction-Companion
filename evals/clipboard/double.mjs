// Disposable in-memory clipboard double. No OS/browser clipboard API or I/O.
export function recordingClipboard({value = null, failRead = false, failWrite = false} = {}) {
  let payload = structuredClone(value);
  const events = [];
  const reject = () => { const error = new Error('Injected clipboard rejection'); error.code = 'CLIPBOARD_REJECTED'; throw error; };
  return {
    read() { events.push(failRead ? 'read:rejected' : 'read:ok'); if (failRead) reject(); return structuredClone(payload); },
    write(value) { events.push(failWrite ? 'write:rejected' : 'write:ok'); if (failWrite) reject(); payload = structuredClone(value); },
    inspect() { return structuredClone({value:payload, events}); },
  };
}
