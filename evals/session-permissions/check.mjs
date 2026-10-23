import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createSession} from './candidate.mjs';
import {controlledService} from './double.mjs';
export function frozen() {
  const bytes=fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity=JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export async function compare(factory=createSession,cases=frozen().cases,serviceFactory=controlledService) {
  const rows=[];
  for (const scenario of cases) {
    const service=serviceFactory(),session=factory(service);
    for (const [step,entry] of scenario.steps.entries()) {
      const action=structuredClone(entry.action);
      if (['complete','fail','ack'].includes(action.type)) {
        service.finish(action.op,action.value,action.type === 'fail');await session.settle(action.op);
      } else if (action.type === 'commit') service.commit(action.op);
      else if (action.type === 'service') service.service(action.scope,action.allowed);
      else session.dispatch(action);
      const actual=session.snapshot(), effects=service.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,effects,expectedEffects:{calls:entry.calls,effects:entry.effects},
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(effects,{calls:entry.calls,effects:entry.effects})});
    }
  }
  return rows;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows=await compare();
  console.log(JSON.stringify({kind:'synthetic-proposed-policy',checkpoints:rows.length,failed:rows.filter(row=>!row.passed)},null,2));
  if (rows.some(row=>!row.passed)) process.exitCode=1;
}
