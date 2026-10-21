import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createCatalog} from './candidate.mjs';

export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json', import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json', import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createCatalog, cases = null) {
  const oracle = frozen();
  return (cases ?? [...oracle.ordinary, ...oracle.boundaries]).flatMap(row => {
    const catalog = factory(oracle.datasets[row.dataset], oracle.pageSize);
    return row.steps.map((step, index) => {
      // Infrastructure/load/action errors propagate; they are not useful mutation kills.
      const actual = catalog.dispatch(structuredClone(step.action));
      return {id:row.id, step:index, expected:step.expected, actual, passed:isDeepStrictEqual(actual, step.expected)};
    });
  });
}
