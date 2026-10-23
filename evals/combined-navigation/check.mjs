import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createWorkflow} from './candidate.mjs';
import {controlledAdapter} from './double.mjs';
export function frozen() {
  const bytes=fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity=JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export async function compare(factory=createWorkflow,cases=frozen().cases,adapterFactory=controlledAdapter) {
  const rows=[];
  for (const scenario of cases) {
    const adapter=adapterFactory(),model=factory(adapter);
    for (const [step,entry] of scenario.steps.entries()) {
      const action=structuredClone(entry.action);
      if (['complete','ack','fail'].includes(action.type)) {adapter.finish(action.op,action.value,action.type === 'fail');await model.settle(action.op);}
      else if (action.type === 'commit') adapter.commit(action.op);
      else if (action.type === 'service') adapter.service(action.scope,action.allowed);
      else model.dispatch(action);
      const actual=model.snapshot(),effects=adapter.inspect(),expectedEffects={calls:entry.calls,effects:entry.effects};
      rows.push({id:scenario.id,step,actual,expected:entry.expected,effects,expectedEffects,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(effects,expectedEffects)});
    }
  }
  return rows;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows=await compare();
  console.log(JSON.stringify({kind:'synthetic-proposed-composition',checkpoints:rows.length,failed:rows.filter(row=>!row.passed)},null,2));
  if (rows.some(row=>!row.passed)) process.exitCode=1;
}
