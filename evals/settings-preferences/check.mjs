import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createPreferences} from './candidate.mjs';
export function frozen() {
  const bytes = fs.readFileSync(new URL('./expectations.json',import.meta.url));
  const identity = JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  if (createHash('sha256').update(bytes).digest('hex') !== identity.expectationsSha256) throw Error('Changed frozen oracle');
  return JSON.parse(bytes);
}
// Caller owns an empty disposable directory. Real reads/writes, fresh instances
// on reopen, single process. No crash, concurrency or hostile-path guarantees.
export function compare(directory, factory = createPreferences, cases = null) {
  const oracle = frozen(), rows = [];
  for (const scenario of cases ?? [...oracle.ordinary,...oracle.boundaries]) {
    const file = path.join(directory,scenario.id+'.json');
    fs.writeFileSync(file,scenario.initial,'utf8');
    let preferences = factory(file);
    for (const [step,entry] of scenario.steps.entries()) {
      // Reconstruct through a fresh instance reading actual persisted bytes.
      if (entry.action.type === 'reopen') preferences = factory(file);
      const actual = entry.action.type === 'reopen' ? preferences.snapshot() : preferences.dispatch(structuredClone(entry.action));
      // Independently read disk: candidate-reported bytes cannot conceal effects.
      const disk = fs.readFileSync(file,'utf8');
      rows.push({id:scenario.id,step,expected:entry.expected,actual,disk,
        passed:isDeepStrictEqual(actual,entry.expected) && disk === entry.expected.bytes});
    }
  }
  return rows;
}
