import { spawnSync } from 'node:child_process';
// Deliberately owned fixtures only. A bounded child is not a hostile-code sandbox.
export function capture(executable, prefix, args) {
  const env = {};
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP']) if (process.env[key]) env[key] = process.env[key];
  const child = spawnSync(executable, [...prefix, ...args], {
    shell: false, windowsHide: true, timeout: 3000, maxBuffer: 16384, encoding: 'utf8', env
  });
  if (child.error || child.signal || child.status === null) throw new Error('Capture failed: ' + (child.error?.code ?? child.signal ?? 'no-exit'));
  return { out: child.stdout, err: child.stderr, exit: child.status };
}
export const comparable = row => ({ out: row.out.replace(/\r\n/g, '\n'), err: row.err.replace(/\r\n/g, '\n'), exit: row.exit });
