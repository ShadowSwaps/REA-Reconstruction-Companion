import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createEditor} from './candidate.mjs';
import {recordingService} from './double.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createEditor,cases = frozen().cases,serviceFactory = recordingService) {
  const rows = [], initial = frozen().initial;
  for (const scenario of cases) {
    const service = serviceFactory(initial), editor = factory(structuredClone(initial),service);
    for (const [step,entry] of scenario.steps.entries()) {
      const action = structuredClone(entry.action);
      let actual;
      if (action.type === 'external') { service.external(action.value); actual = editor.snapshot(); }
      else if (['finish','repeat-reply'].includes(action.type)) {
        const reply = action.type === 'finish' ? service.finish(action.ticket,action.mode) : service.repeat(action.ticket);
        actual = editor.dispatch({type:'result',reply});
      } else actual = editor.dispatch(action);
      const observed = service.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,observed,expectedObserved:entry.observed,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(observed,entry.observed)});
    }
  }
  return rows;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = compare(); console.log(JSON.stringify({kind:'synthetic-proposed-policy',checkpoints:rows.length,failed:rows.filter(row => !row.passed)},null,2));
  if (rows.some(row => !row.passed)) process.exitCode = 1;
}
