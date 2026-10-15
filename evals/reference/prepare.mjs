// Export only candidate-visible evidence. Does not execute the target or any agent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const inside = (parent, child) => { const rel = path.relative(parent, child); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };

export function prepare(destination) {
  if (typeof destination !== 'string' || !destination) throw new Error('Supply a new trial directory.');
  const wanted = path.resolve(destination);
  // Parent must exist; resolve its actual identity before the overlap check.
  const target = path.join(fs.realpathSync.native(path.dirname(wanted)), path.basename(wanted));
  const sourceRoot = fs.realpathSync.native(root);
  if (inside(sourceRoot, target) || inside(target, sourceRoot)) throw new Error('Trial must be outside the source checkout/package.');
  const files = new Map();
  for (const relative of ['TASK.md', 'target/pocket-tasks.mjs']) {
    const source = path.join(here, relative);
    if (!fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw new Error('Unexpected reference source.');
    files.set(relative, fs.readFileSync(source));
  }
  const identity = { schema: 1, target: 'Pocket Tasks', version: '1.0.0', files: Object.fromEntries(
    [...files].map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])) };
  fs.mkdirSync(target); // Exclusive: an existing directory, file or link is never reused.
  fs.mkdirSync(path.join(target, 'target'));
  for (const [name, bytes] of files) fs.writeFileSync(path.join(target, name), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(target, 'identity.json'), JSON.stringify(identity, null, 2) + '\n', { flag: 'wx' });
  return identity;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node evals/reference/prepare.mjs NEW_TRIAL_DIRECTORY');
    console.log(JSON.stringify(prepare(process.argv[2]), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
