// Controlled completion and independently recorded calls/effects. No service exists.
export function recordingSubmission() {
  const attempts = [], effects = [];
  const queued = [];
  return {
    start(id,payload,callback) {
      attempts.push(structuredClone({id,payload}));
      queued.push({payload:structuredClone(payload),callback});
    },
    complete(result) {
      if (!queued.length || !['accept','reject','address-reject'].includes(result)) throw Error('Invalid completion');
      const job = queued.shift();
      if (result === 'accept') effects.push(structuredClone(job.payload));
      job.callback(result);
    },
    inspect:() => structuredClone({attempts,effects}),
  };
}
