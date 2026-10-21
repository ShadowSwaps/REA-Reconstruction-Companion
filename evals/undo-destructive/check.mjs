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
export function compare(factory = createEditor, cases = null) {
  const oracle = frozen();
  return (cases ?? [...oracle.ordinary, ...oracle.boundaries]).flatMap(row => {
    const editor = factory(structuredClone(oracle.initial));
    return row.steps.map((step, index) => {
      // Exceptions/load/harness failures propagate, never count as useful kills.
      const actual = editor.dispatch(structuredClone(step.action));
      return {id:row.id, step:index, expected:step.expected, actual,
        passed:isDeepStrictEqual(actual, step.expected)};
    });
  });
}
