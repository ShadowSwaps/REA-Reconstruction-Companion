// Fixed example record comparison. No vision, prose classification or execution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readRecord } from '../resume/check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const files = ['panel.html', 'INPUTS.md', 'ACCEPTANCE.json', 'frame-01.png', 'frame-03.png', 'frame-03-crop.png'];
const scenarios = ['static', 'partial', 'conflicting'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function checkVisualEvidence(id, record) {
  if (!scenarios.includes(id)) throw new Error('Unknown fixed visual scenario');
  const identity = readRecord(path.join(here, 'identity.json'));
  for (const name of files) {
    const file = path.join(here, name), stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024
      || sha(fs.readFileSync(file)) !== identity.files?.[name]) throw new Error('Frozen fixture identity mismatch');
  }
  const expected = readRecord(path.join(here, 'ACCEPTANCE.json'))[id];
  const shape = record !== null && typeof record === 'object' && !Array.isArray(record)
    && isDeepStrictEqual(Object.keys(record).sort(), Object.keys(expected).sort());
  const results = [{ field: 'shape', passed: shape }, ...Object.keys(expected).map(field =>
    ({ field, passed: isDeepStrictEqual(record?.[field], expected[field]) }))];
  const failed = results.filter(r => !r.passed).length;
  return { scenario: id, status: failed ? 'comparison-failed' : 'comparisons-passed', failed, results,
    fixtureIdentitySha256: sha(fs.readFileSync(path.join(here, 'identity.json'))),
    recordSha256: sha(JSON.stringify(record) ?? 'undefined'),
    humanReview: 'pending', actualAgentActions: 'unverified', visionLanguageEvaluation: 'not-run' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [id, file, ...extra] = process.argv.slice(2);
    if (!file || extra.length) throw new Error('Invalid invocation');
    const result = checkVisualEvidence(id, readRecord(file));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.failed ? 1 : 0;
  } catch {
    console.error('Usage: node evals/visual-evidence/check.mjs static|partial|conflicting RECORD.json. Reads fixed example cells only.');
    process.exitCode = 2;
  }
}
