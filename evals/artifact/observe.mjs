import path from 'node:path';
import { root, verifyFreeze, locked } from './freeze.mjs';
import { capture, comparable } from './process.mjs';
import { isDeepStrictEqual } from 'node:util';
export function observe() {
  if (process.platform !== 'win32') throw new Error('Reference requires the existing Windows .NET Framework runtime; no acquisition fallback');
  const rows = verifyFreeze().map(c => {
    const raw = capture(path.join(root, 'reference/Parcel.exe'), [], c.args);
    const expected = { out: c.out, err: c.err, exit: c.exit };
    if (!isDeepStrictEqual(comparable(raw), expected)) throw new Error('Reference disagrees with frozen literal: ' + c.id);
    return { id: c.id, behavior: c.behavior, args: c.args, raw, expected };
  });
  return { schema: 1, method: 'Ordinary local Node spawnSync of owned compiled reference; not REA process capture', artifactSha256: locked['reference/Parcel.exe'], corpusSha256: locked['corpus.json'], environment: { platform: process.platform, arch: process.arch, node: process.version }, normalization: 'CRLF to LF only; raw streams retained', rows };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, 'observe.mjs')) console.log(JSON.stringify(observe(), null, 2));
