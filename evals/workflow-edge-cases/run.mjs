// MIT. Finite literal sequence comparator, not a general state/model evaluator.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createWorkflow } from './variant.mjs';
import { verifyFreeze as historical } from '../import-export/freeze.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(here, name));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifyFreeze() {
  historical();
  const identity = JSON.parse(read('identity.json'));
  assert.deepEqual(Object.keys(identity.files).sort(), ['CONTRACT.md', 'expectations.json']);
  for (const [name, digest] of Object.entries(identity.files)) assert.equal(hash(read(name)), digest, `Frozen drift: ${name}`);
  return identity;
}

export function runSequences(directory, factory = createWorkflow, group = 'all') {
  verifyFreeze();
  assert.ok(['all', 'ordinary', 'transitions'].includes(group), 'known sequence group');
  const e = JSON.parse(read('expectations.json'));
  fs.mkdirSync(directory); // Exclusive owned destination; retain prior attempts.
  const results = [];
  for (const scenario of e.sequences.filter(s => group === 'all' || s.group === group)) {
    const folder = path.join(directory, scenario.id); fs.mkdirSync(folder);
    const file = path.join(folder, 'ledger.json');
    const initial = e.disk[scenario.initial];
    if (initial !== null) fs.writeFileSync(file, initial, { flag: 'wx' });
    let fail = false;
    const open = () => factory({ file, beforeReplace() { if (fail) throw new Error('injected pre-rename failure'); } });
    let workflow = open();
    const tokens = new Map(), trace = [];
    const check = (state, disk, step) => {
      assert.deepEqual(workflow.snapshot(), e.states[state], `${scenario.id}/${step}: state`);
      const expected = e.disk[disk];
      if (expected === null) assert.equal(fs.existsSync(file), false, `${scenario.id}/${step}: absent file`);
      else assert.deepEqual(fs.readFileSync(file), Buffer.from(expected), `${scenario.id}/${step}: exact disk`);
      assert.deepEqual(fs.readdirSync(folder).sort(), expected === null ? [] : ['ledger.json'], `${scenario.id}/${step}: no staging residue`);
    };
    check(scenario.state, scenario.initial, 'initial');
    for (const [index, step] of scenario.steps.entries()) {
      fail = step.fail === true;
      let result;
      if (step.op === 'reopen') { workflow = open(); result = { ok: true }; }
      else if (step.op === 'select') {
        const bytes = Buffer.from(e.inputs[step.input]);
        result = workflow.select(bytes);
        bytes.fill(0); // Caller mutation must not change the selected input.
        if (step.token) {
          assert.equal(typeof result.token, 'string', 'opaque selection token');
          assert.ok(result.token.length > 0 && ![...tokens.values()].includes(result.token), 'fresh selection token');
          tokens.set(step.token, result.token);
          result = { ...result }; delete result.token;
        }
      } else {
        assert.ok(['confirm', 'cancel'].includes(step.op), 'known action');
        assert.ok(tokens.has(step.token), 'previously captured token');
        result = workflow[step.op](tokens.get(step.token));
      }
      assert.deepEqual(result, step.result, `${scenario.id}/${index}: result`);
      check(step.state, step.disk, index);
      trace.push({ action: step.op, result, state: workflow.snapshot(), disk: step.disk, injectedFailure: fail });
    }
    results.push({ id: scenario.id, group: scenario.group, trace });
  }
  const report = { status: 'bounded-sequences-passed', group, node: process.version,
    identitySha256: hash(read('identity.json')), implementationSha256: hash(read('variant.mjs')),
    results, originalTargetParity: 'not tested', liveModelUnderstanding: 'not tested',
    limits: 'Authored source-exposed fixture; synchronous injected pre-rename failure; same-process reopen; no crash, concurrency or live permission testing.' };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [directory, ...extra] = process.argv.slice(2);
    assert.ok(directory && !extra.length, 'Usage: node evals/workflow-edge-cases/run.mjs NEW_DIRECTORY');
    console.log(JSON.stringify(runSequences(path.resolve(directory)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
