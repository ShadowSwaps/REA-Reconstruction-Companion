import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {recordingBatch} from './double.mjs';
import {createBatch} from './candidate.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createBatch, cases = null) {
  const oracle = frozen(), results = [];
  for (const scenario of cases ?? [...oracle.ordinary,...oracle.boundaries]) {
    const service = recordingBatch(scenario.responses), batch = factory(structuredClone(oracle.initial),service);
    for (const [step,entry] of scenario.steps.entries()) {
      const actual = batch.dispatch(structuredClone(entry.action)), attempts = service.inspect();
      results.push({id:scenario.id,step,actual,expected:entry.expected,attempts,expectedAttempts:entry.attempts,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(attempts,entry.attempts)});
    }
  }
  return results;
}
