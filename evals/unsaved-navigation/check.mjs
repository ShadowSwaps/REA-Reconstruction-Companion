import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createEditor} from './candidate.mjs';

export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json', import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json', import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256)
    throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export async function compare(factory = createEditor, cases = null) {
  const oracle = frozen(), rows = [];
  for (const scenario of cases ?? [...oracle.ordinary, ...oracle.boundaries]) {
    // Reset all editor state and controlled jobs between independent sequences.
    const editor = factory(structuredClone(oracle.initial));
    for (const [step, entry] of scenario.steps.entries()) {
      const actual = await editor.dispatch(structuredClone(entry.action));
      rows.push({id:scenario.id, step, expected:entry.expected, actual,
        passed:isDeepStrictEqual(actual, entry.expected)});
    }
  }
  return rows;
}
