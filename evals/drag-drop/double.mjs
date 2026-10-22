// Independent recording at the effect boundary; accepts repeats so faults
// appear as extra effects, not infrastructure exceptions. Not real storage.
export function recordingEffects() {
  const attempts = [], effects = []; let fail = false;
  return {
    failNext() { fail = true; },
    commit(operation) {
      attempts.push(structuredClone(operation));
      if (fail) { fail = false; return false; }
      effects.push(structuredClone(operation)); return true;
    },
    inspect() { return structuredClone({attempts,effects}); }
  };
}
