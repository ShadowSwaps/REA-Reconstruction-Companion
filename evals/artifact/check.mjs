import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { root, verifyFreeze, read, locked, hash } from './freeze.mjs';
import { capture, comparable } from './process.mjs';
export function checkSaved(cases, saved) {
  // This entrypoint accepts the existing Windows subprocess capture format only.
  // Metadata checks preserve its declared authority; they cannot prove capture truth.
  if (saved?.schema !== 1 || saved.method !== 'Ordinary local Node spawnSync of owned compiled reference; not REA process capture'
    || saved.normalization !== 'CRLF to LF only; raw streams retained' || saved.environment?.platform !== 'win32'
    || !['x64', 'ia32', 'arm64'].includes(saved.environment.arch) || typeof saved.environment.node !== 'string'
    || !/^v\d+\.\d+\.\d+$/.test(saved.environment.node)) throw new Error('Unsupported observation provenance');
  if (saved.artifactSha256 !== locked['reference/Parcel.exe'] || saved.corpusSha256 !== locked['corpus.json'] || !Array.isArray(saved.rows) || saved.rows.length !== cases.length) throw new Error('Observation identity/coverage mismatch');
  for (const [index, c] of cases.entries()) {
    const row = saved.rows[index];
    // This capture format contains completed streams and exit only. Reject
    // contradictory failure/partial fields instead of projecting them away.
    if (!row?.raw || !isDeepStrictEqual(Object.keys(row.raw).sort(), ['err', 'exit', 'out'])
      || row.id !== c.id || row.behavior !== c.behavior || !isDeepStrictEqual(row.args, c.args)
      || !isDeepStrictEqual(comparable(row.raw), { out: c.out, err: c.err, exit: c.exit })) throw new Error('Observation mismatch: ' + c.id);
  }
}
export function check({ candidate = path.join(root, 'candidate.mjs'), freshReference = process.platform === 'win32' } = {}) {
  const cases = verifyFreeze(), saved = JSON.parse(read('observed-reference.json'));
  checkSaved(cases, saved); // Never trust archived expected/pass fields.
  const rows = cases.map(c => {
    const expected = { out: c.out, err: c.err, exit: c.exit };
    const actual = capture(process.execPath, [path.resolve(candidate)], c.args);
    const reference = freshReference ? capture(path.join(root, 'reference/Parcel.exe'), [], c.args) : null;
    return { id: c.id, behavior: c.behavior, expected, candidate: actual, reference,
      candidateMatches: isDeepStrictEqual(comparable(actual), expected),
      referenceMatches: reference ? isDeepStrictEqual(comparable(reference), expected) : null };
  });
  const passed = rows.every(r => r.candidateMatches && (!freshReference || r.referenceMatches));
  return { schema: 1, status: passed ? 'pass-within-corpus' : 'fail', total: rows.length,
    selectedBehaviors: ['key','fee','check'], artifactSha256: locked['reference/Parcel.exe'],
    corpusSha256: locked['corpus.json'], candidateSha256: hash(readPath(candidate)),
    environment: { platform: process.platform, arch: process.arch, node: process.version },
    referenceMode: freshReference ? 'fresh compiled reference execution' : 'historical frozen observations only; no fresh reference execution',
    oracle: 'Frozen literals, checked separately against reference and candidate; not self-comparison',
    limitations: 'Source-exposed same-agent fixture; finite corpus; ordinary child process capture, not REA PTY or hostile-code isolation; only CRLF normalized', rows };
}
import fs from 'node:fs';
const readPath = p => fs.readFileSync(p);
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node evals/artifact/check.mjs [owned-candidate.mjs]');
    const report = check(process.argv[2] ? { candidate: process.argv[2] } : {});
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.status === 'pass-within-corpus' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
