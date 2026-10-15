// Reviewer tool: executes only an explicitly supplied, previously reviewed command.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { scenarios } from './reviewer/scenarios.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const referenceCommand = [process.execPath, path.join(here, 'target/pocket-tasks.mjs')];

function validate(command) {
  if (!Array.isArray(command) || !command.length || command.length > 32
      || command.some(x => typeof x !== 'string' || !x.length || x.length > 4096 || x.includes('\0'))
      || !path.isAbsolute(command[0]) || command.includes('--store')) throw new Error('Expected a command array with an absolute executable and no --store argument.');
}
function disk(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw new Error('Unsafe or oversized store.');
    return fs.readFileSync(file, 'utf8');
  } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

export function check(command, { timeout = 5000 } = {}) {
  validate(command);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 10000) throw new Error('Invalid timeout.');
  const results = [];
  // Use canonical temp paths so macOS /var and other OS-managed links are resolved.
  const parent = fs.realpathSync.native(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'rea-reference-'));
  try {
    for (const [index, scenario] of scenarios.entries()) {
      const cwd = path.join(root, String(index)); fs.mkdirSync(cwd);
      const file = path.join(cwd, 'tasks.json');
      if (scenario.initialStore !== undefined) fs.writeFileSync(file, scenario.initialStore, { flag: 'wx' });
      let failed = false;
      for (const [i, step] of scenario.steps.entries()) {
        const label = `${scenario.name}: session ${i + 1}`;
        if (failed) { results.push({ label, status: 'not-run', reason: 'Earlier session failed.' }); continue; }
        let reason = null;
        try {
          const before = disk(file);
          // Avoid forwarding token/credential environment variables. This is NOT a sandbox.
          const env = {};
          for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) if (process.env[key]) env[key] = process.env[key];
          const run = spawnSync(command[0], [...command.slice(1), '--store', file], {
            cwd, env, input: step.input, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, shell: false, windowsHide: true,
          });
          if (run.error || run.signal) reason = 'Process failed, timed out, or exceeded output limit.';
          else if (run.status !== (step.exit ?? 0)) reason = 'Exit status mismatch.';
          else if (step.exit) {
            if (run.stdout.trim() || !run.stderr.trim()) reason = 'Invalid-input response mismatch.';
          } else {
            let actual;
            try { actual = JSON.parse(run.stdout); } catch { reason = 'Output is not one JSON value.'; }
            if (!reason && !isDeepStrictEqual(actual, step.expected)) reason = 'Response mismatch.';
          }
          const after = disk(file);
          if (!reason && step.unchanged && after !== before) reason = 'Store changed unexpectedly.';
          if (!reason && !step.unchanged) {
            if (step.store === null) { if (after !== null) reason = 'Unexpected store write.'; }
            else if (after === null || !isDeepStrictEqual(JSON.parse(after), step.store)) reason = 'Persisted store mismatch.';
          }
        } catch { reason = 'Could not safely inspect process results or store.'; }
        failed = reason !== null;
        results.push({ label, status: failed ? 'failed' : 'passed', ...(reason ? { reason } : {}) });
      }
    }
  } finally {
    // Root is a newly created child of the resolved temporary directory, never user input.
    const rel = path.relative(parent, root);
    if (rel.startsWith('rea-reference-') && !rel.includes(path.sep) && !fs.lstatSync(root).isSymbolicLink()) fs.rmSync(root, { recursive: true, force: true });
  }
  const count = status => results.filter(row => row.status === status).length;
  return { schema: 1, target: 'Pocket Tasks', targetVersion: '1.0.0',
    kind: isDeepStrictEqual(command, referenceCommand) ? 'reference-self-check' : 'candidate-comparison',
    status: count('failed') ? 'comparison-failed' : 'comparisons-passed',
    corpusSha256: digest(scenarios), commandSha256: digest(command),
    sessions: results.length, passed: count('passed'), failed: count('failed'), notRun: count('not-run'),
    humanReview: 'pending', reaTrial: 'unverified', results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let command;
    if (args.length === 1 && args[0] === '--reference') command = referenceCommand;
    else if (args.length === 2 && args[0] === '--command') {
      if (fs.statSync(args[1]).size > 65536) throw new Error('Command file is too large.');
      command = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    } else throw new Error('Usage: node evals/reference/check.mjs --reference | --command COMMAND.json');
    const report = check(command); console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.failed ? 1 : 0;
  } catch (e) { console.error(e.message); process.exitCode = 2; }
}
