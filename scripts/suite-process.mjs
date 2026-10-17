import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { summarize } from './fixture-environment.mjs';

export function runTests(probe, { cwd, command = process.execPath, args = ['--test', '--test-reporter=tap'],
  output = chunk => process.stdout.write(chunk), errors = 'inherit', env = process.env } = {}) {
  return new Promise(resolve => {
    const counts = {};
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', errors] });
    let error;
    child.on('error', value => { error = value; });
    child.stdout.on('data', output);
    const lines = createInterface({ input: child.stdout });
    lines.on('line', line => {
      const match = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(line);
      if (match) counts[match[1]] = Number(match[2]);
    });
    child.on('close', (code, signal) => resolve(summarize(probe, { code, signal, error }, counts)));
  });
}
