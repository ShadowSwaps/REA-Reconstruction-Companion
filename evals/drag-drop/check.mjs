import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createBoard} from './candidate.mjs';
import {recordingEffects} from './double.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createBoard,cases = null) {
  const oracle = frozen(), rows = [];
  for (const scenario of cases ?? [...oracle.ordinary,...oracle.boundaries]) {
    const recorder = recordingEffects(), board = factory(structuredClone(oracle.initial),recorder);
    for (const [step,entry] of scenario.steps.entries()) {
      const action = structuredClone(entry.action);
      const actual = action.type === 'fail-next' ? (recorder.failNext(),board.snapshot()) : board.dispatch(action);
      const observed = recorder.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,...observed,
        expectedAttempts:entry.attempts,expectedEffects:entry.effects,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(observed,{attempts:entry.attempts,effects:entry.effects})});
    }
  }
  return rows;
}
