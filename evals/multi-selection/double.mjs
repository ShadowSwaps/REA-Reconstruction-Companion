// Synthetic synchronous outcomes only; no real service or external effects.
export function recordingBatch(responses = []) {
  const queue = structuredClone(responses), attempts = [];
  return {
    attempt(ids, mode) {
      const response = queue.shift() ?? {};
      const outcomes = ids.map(id => response[id] ?? 'success');
      if (outcomes.some(value => !['success','retryable','refused','unknown'].includes(value))) throw Error('Invalid double outcome');
      attempts.push({ids:[...ids],mode,outcomes:[...outcomes]});
      return outcomes;
    },
    inspect() { return structuredClone(attempts); },
  };
}
