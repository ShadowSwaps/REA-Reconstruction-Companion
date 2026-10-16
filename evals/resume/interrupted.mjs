// MIT. Recovery for this fixed walkthrough only; never resumes arbitrary tools.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evidence, walkthrough } from './walkthrough.mjs';

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const outputs = ['triage.json', 'reassessment.json', 'before-report.json', 'candidate-after.mjs',
  'after-report.json', 'result.json', 'execution-recovery.json'];
function capture(directory, originals) {
  const dir = path.resolve(directory), stat = fs.lstatSync(dir);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Unsafe source');
  const files = {};
  for (const name of fs.readdirSync(dir).sort()) {
    assert(Object.hasOwn(originals, name) || outputs.includes(name), 'Unexpected source entry');
    const file = path.join(dir, name), stat = fs.lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 262144, 'Unsafe evidence');
    const bytes = fs.readFileSync(file);
    assert(bytes.length <= 262144, 'Oversized evidence');
    files[name] = bytes;
  }
  for (const [name, bytes] of Object.entries(originals)) {
    assert(files[name]?.equals(bytes), 'Prepared evidence changed; use evidence recovery');
  }
  return files;
}
const identities = files => Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, hash(bytes)]));

export function recoverInterrupted(caseId, directory, destination, selectedCase = caseId) {
  const originals = evidence(caseId);
  evidence(selectedCase); // Validate the explicit selection before creating anything.
  const source = path.resolve(directory), dir = path.resolve(destination);
  const relative = path.relative(source, dir);
  assert(relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'Destination must be outside source');
  const prior = capture(source, originals), before = identities(prior);
  fs.mkdirSync(dir); // Existing destinations are never modified.
  const put = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  put('recovery.json', { schema: 1, case: caseId, selectedCase, sourceFiles: before,
    authority: 'explicit-local-fixture-invocation', history: 'source-retained-in-place',
    outputs: 'untrusted-until-independently-validated', humanReview: 'pending' });
  const working = path.join(dir, 'working');
  walkthrough('prepare', selectedCase, working);
  let priorBefore;
  try { priorBefore = JSON.parse(prior['before-report.json']?.toString('utf8')); } catch { /* Missing/truncated is unproven. */ }
  const result = walkthrough('continue', selectedCase, working, { priorBefore, recordRecovery: true });
  assert(JSON.stringify(identities(capture(source, originals))) === JSON.stringify(before), 'Source history changed');
  assert(JSON.stringify(identities(evidence(caseId))) === JSON.stringify(identities(originals)), 'Package changed');
  const completed = { schema: 1, status: result.status, sourcePreservation: 'verified-existing-file-hashes-and-set',
    sourceFiles: before, execution: JSON.parse(fs.readFileSync(path.join(working, 'execution-recovery.json'), 'utf8')),
    beforeFailures: result.beforeFailures, afterFailures: result.afterFailures,
    freshResult: 'working/result.json', overallParity: 'unverified', humanReview: 'pending', reaTrial: 'not-run' };
  put('result.json', completed);
  return completed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert([5, 6].includes(process.argv.length), 'Invalid invocation');
    const result = recoverInterrupted(...process.argv.slice(2));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.status === 'comparison-failed' ? 1 : 0;
  } catch {
    process.stderr.write('Interrupted recovery error: verify trusted inputs, bounded source files and a fresh destination.\n');
    process.exitCode = 2;
  }
}
