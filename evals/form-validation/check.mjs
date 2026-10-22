import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createForm} from './candidate.mjs';
import {recordingSubmission} from './double.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createForm,cases = null) {
  const oracle = frozen(), rows = [];
  for (const scenario of cases ?? [...oracle.ordinary,...oracle.boundaries]) {
    const service = recordingSubmission(), form = factory(structuredClone(oracle.initial),service);
    for (const [step,entry] of scenario.steps.entries()) {
      const action = structuredClone(entry.action);
      const actual = action.type === 'settle' ? (service.complete(action.result),form.snapshot()) : form.dispatch(action);
      const observed = service.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,...observed,
        expectedAttempts:entry.attempts,expectedEffects:entry.effects,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(observed,{attempts:entry.attempts,effects:entry.effects})});
    }
  }
  return rows;
}
