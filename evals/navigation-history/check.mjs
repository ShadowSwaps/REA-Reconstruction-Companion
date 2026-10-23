import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createNavigator} from './candidate.mjs';
import {controlledAdapter} from './double.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export async function compare(factory=createNavigator,cases=frozen().cases,adapterFactory=controlledAdapter) {
  const rows=[];
  for (const scenario of cases) {
    let adapter=adapterFactory(), navigator=factory(scenario.initial,adapter);
    for (const [step,entry] of scenario.steps.entries()) {
      const action=structuredClone(entry.action);
      if (action.type === 'complete' || action.type === 'fail') {
        adapter.finish(action.op,action.value,action.type === 'fail');
        await navigator.settle(action.op);
      } else if (action.type === 'recreate') {
        const current=navigator.snapshot(), url=current.entries[current.index].url;
        adapter=adapterFactory(); navigator=factory(url,adapter);
      } else navigator.dispatch(action);
      const actual=navigator.snapshot(), effects=adapter.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,effects,expectedEffects:entry.effects,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(effects,entry.effects)});
    }
  }
  return rows;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows=await compare();
  console.log(JSON.stringify({kind:'synthetic-proposed-policy',checkpoints:rows.length,failed:rows.filter(row=>!row.passed)},null,2));
  if (rows.some(row=>!row.passed)) process.exitCode=1;
}
