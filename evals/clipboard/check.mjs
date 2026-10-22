import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {recordingClipboard} from './double.mjs';
import {createEditor} from './candidate.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createEditor, cases = null) {
  const oracle = frozen(), rows = [];
  for (const scenario of cases ?? [...oracle.ordinary,...oracle.boundaries]) {
    const clipboard = recordingClipboard({value:scenario.clipboard,failRead:scenario.failRead,failWrite:scenario.failWrite});
    const editor = factory(structuredClone(scenario.initial),clipboard);
    for (const [step,entry] of scenario.steps.entries()) {
      const actual = editor.dispatch(structuredClone(entry.action));
      // Observe the double independently; a candidate snapshot cannot conceal effects.
      const effects = clipboard.inspect();
      rows.push({id:scenario.id,step,expected:entry.expected,actual,effects,expectedEffects:entry.clipboard,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(effects,entry.clipboard)});
    }
  }
  return rows;
}
