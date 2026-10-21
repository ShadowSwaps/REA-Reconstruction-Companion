import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createReader, createWriter} from './candidate.mjs';
import {controlledReads, controlledEffects} from './controlled.mjs';

export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json', import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json', import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256)
    throw Error('changed frozen expectations');
  return JSON.parse(bytes);
}
export async function compare({reader = createReader, writer = createWriter, group = 'all'} = {}) {
  if (!['all','ordinary','boundary'].includes(group)) throw Error('unknown group');
  const oracle = frozen(), rows = [];
  function record(id, index, actual, expected) {
    rows.push({id, step:index, passed:isDeepStrictEqual(actual,expected), actual, expected});
  }
  for (const scenario of oracle.reads.filter(s => group === 'all' || s.group === group)) {
    const transport = controlledReads(), app = reader(transport);
    for (const [i, [action, view, operations]] of scenario.steps.entries()) {
      const [command, ...args] = action;
      if (['resolve','reject','cancelled'].includes(command)) {
        transport.settle(command,...args); await app.done(args[0]);
      } else app[command](...args);
      record(scenario.id,i,app.snapshot(),{view,operations});
    }
  }
  for (const scenario of oracle.writes.filter(s => group === 'all' || s.group === group)) {
    const provider = controlledEffects(), app = writer(provider);
    for (const [i, [action, intent, effects, attempts]] of scenario.steps.entries()) {
      const [command, ...args] = action;
      if (command === 'deliver') { provider.deliver(...args); await app.done(); }
      else if (command === 'reconcile-unavailable') { provider.unavailable(); await app.reconcile(); }
      else await app[command](...args);
      record(scenario.id,i,{intent:app.snapshot(),...provider.snapshot()},{intent,effects,attempts});
    }
  }
  return rows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = await compare();
  console.log(JSON.stringify({kind:'controlled-local-example',runtime:process.version,
    comparisons:rows.length,passed:rows.filter(r=>r.passed).length,rows,
    originalParity:'unverified',realNetworkConcurrency:'unverified',nonAuthorReview:'pending'},null,2));
  if (rows.some(r=>!r.passed)) process.exitCode = 1;
}
