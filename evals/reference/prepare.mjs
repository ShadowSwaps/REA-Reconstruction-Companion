// Export only candidate-visible evidence. Does not execute the target or any agent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const inside = (parent, child) => { const rel = path.relative(parent, child); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };
const evidenceFiles = ['TASK.md', 'target/pocket-tasks.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function reference() {
  const files = new Map();
  for (const relative of evidenceFiles) {
    const source = path.join(here, relative);
    if (!fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw new Error('Unexpected reference source.');
    files.set(relative, fs.readFileSync(source));
  }
  const identity = { schema: 1, target: 'Pocket Tasks', version: '1.0.0', files: Object.fromEntries(
    [...files].map(([name, bytes]) => [name, hash(bytes)])) };
  return { files, identity };
}

// Validate only fixed evidence paths. Never use paths supplied by identity.json,
// execute the target, traverse candidate output, or repair a modified packet.
export function verifyPacket(directory) {
  if (typeof directory !== 'string' || !directory) throw new Error('Supply a trial directory.');
  try {
    const wanted = path.resolve(directory);
    if (fs.lstatSync(wanted).isSymbolicLink() || !fs.lstatSync(wanted).isDirectory()) throw new Error();
    const packet = fs.realpathSync.native(wanted);
    const read = (relative, limit) => {
      const parts = relative.split('/');
      let current = packet;
      for (const [index, part] of parts.entries()) {
        current = path.join(current, part);
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.size > limit)) throw new Error();
      }
      // Bounded read, including if a file grows after the size check.
      const fd = fs.openSync(current, 'r');
      try {
        const buffer = Buffer.alloc(limit + 1);
        let size = 0, count;
        do { count = fs.readSync(fd, buffer, size, buffer.length - size, null); size += count; }
        while (count && size < buffer.length);
        if (size > limit) throw new Error();
        return buffer.subarray(0, size);
      } finally { fs.closeSync(fd); }
    };
    const { files, identity } = reference();
    const supplied = JSON.parse(read('identity.json', 16384).toString('utf8'));
    if (!isDeepStrictEqual(supplied, identity)) throw new Error();
    for (const [name, bytes] of files) if (hash(read(name, bytes.length)) !== identity.files[name]) throw new Error();
    return { ...identity, status: 'verified', scope: 'reference-evidence-only', humanReview: 'pending', reaTrial: 'unverified' };
  } catch {
    // Do not print untrusted identity text, private paths, or filesystem errors.
    throw new Error('Reference evidence is missing, linked, invalid, or differs from this trusted package. No files were changed.');
  }
}

export function prepare(destination) {
  if (typeof destination !== 'string' || !destination) throw new Error('Supply a new trial directory.');
  const wanted = path.resolve(destination);
  // Parent must exist; resolve its actual identity before the overlap check.
  const target = path.join(fs.realpathSync.native(path.dirname(wanted)), path.basename(wanted));
  const sourceRoot = fs.realpathSync.native(root);
  if (inside(sourceRoot, target) || inside(target, sourceRoot)) throw new Error('Trial must be outside the source checkout/package.');
  const { files, identity } = reference();
  fs.mkdirSync(target); // Exclusive: an existing directory, file or link is never reused.
  fs.mkdirSync(path.join(target, 'target'));
  for (const [name, bytes] of files) fs.writeFileSync(path.join(target, name), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(target, 'identity.json'), JSON.stringify(identity, null, 2) + '\n', { flag: 'wx' });
  return identity;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--verify') console.log(JSON.stringify(verifyPacket(args[1]), null, 2));
    else if (args.length === 1 && !args[0].startsWith('--')) console.log(JSON.stringify(prepare(args[0]), null, 2));
    else throw new Error('Usage: node evals/reference/prepare.mjs NEW_TRIAL_DIRECTORY | --verify TRIAL_DIRECTORY');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
