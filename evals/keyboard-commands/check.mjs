import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createRouter} from './candidate.mjs';
import {recordingEffects} from './double.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
export function compare(factory = createRouter,cases = frozen().cases,sinkFactory = recordingEffects) {
  const rows = [];
  for (const scenario of cases) {
    const sink = sinkFactory(), router = factory(structuredClone(scenario.initial),sink);
    for (const [step,entry] of scenario.steps.entries()) {
      const actual = router.dispatch(structuredClone(entry.action)), effects = sink.inspect();
      rows.push({id:scenario.id,step,actual,expected:entry.expected,effects,expectedEffects:entry.effects,
        passed:isDeepStrictEqual(actual,entry.expected) && isDeepStrictEqual(effects,entry.effects)});
    }
  }
  return rows;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = compare();console.log(JSON.stringify({kind:'synthetic-proposed-policy',checkpoints:rows.length,failed:rows.filter(row => !row.passed)},null,2));
  if (rows.some(row => !row.passed)) process.exitCode = 1;
}
