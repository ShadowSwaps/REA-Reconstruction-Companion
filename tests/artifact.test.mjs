import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { check, checkSaved } from '../evals/artifact/check.mjs';
import { verifyFreeze, root, read } from '../evals/artifact/freeze.mjs';

test('artifact candidate and compiled reference match the frozen literal corpus', () => {
  const report = check();
  assert.equal(report.status, 'pass-within-corpus');
  assert.equal(report.total, 30);
  assert.deepEqual([...new Set(report.rows.map(r => r.behavior))], ['key','fee','check']);
  assert.equal(report.rows.filter(r => r.expected.exit === 2).length, 18);
  assert.equal(report.referenceMode.startsWith('fresh'), process.platform === 'win32');
});
test('actual CLI checker rejects materially wrong owned candidates, including error streams and exit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rea-artifact-mutants-'));
  const candidate = pathToFileURL(path.join(root, 'candidate.mjs')).href;
  const changes = [
    "if(a[0]==='key' && !r.exit)r.out='KEY=wrong\\n'",
    "if(a[0]==='fee' && !r.exit)r.out='FEE=99\\n'",
    "if(a[0]==='check' && a[1]==='ff01')r.out='SUM=100\\n'",
    "if(r.exit){r.out=r.err;r.err=''}",
    "if(r.exit)r.exit=0",
    "if(a[0]==='fee' && a[1]==='1\\n')r={out:'FEE=5\\n',err:'',exit:0}"
  ];
  for (const [i, change] of changes.entries()) {
    const file = path.join(dir, `mutant-${i}.mjs`);
    fs.writeFileSync(file, `import {evaluate} from ${JSON.stringify(candidate)}; const a=process.argv.slice(2);let r=evaluate(a);${change};process.stdout.write(r.out);process.stderr.write(r.err);process.exitCode=r.exit;`);
    const report = check({ candidate: file, freshReference: false });
    assert.equal(report.status, 'fail', `mutant ${i}`);
    assert.ok(report.rows.some(r => !r.candidateMatches));
  }
});
test('saved capture checking rejects omissions, duplicates, input drift and false success flags', () => {
  const cases = verifyFreeze(), original = JSON.parse(read('observed-reference.json'));
  for (const change of [r => r.rows.pop(), r => r.rows[1] = r.rows[0], r => r.rows[0].args[1] = 'changed', r => {r.rows[0].raw.out='wrong';r.rows[0].expected=r.rows[0].raw;r.rows[0].pass=true;}, r => r.artifactSha256='0'.repeat(64)]) {
    const saved = structuredClone(original); change(saved);
    assert.throws(() => checkSaved(cases, saved));
  }
});
test('freeze refuses changed reference, literal oracle and identity before execution', () => {
  for (const name of ['reference/Parcel.exe','corpus.json','identity.json']) {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rea-artifact-freeze-'));
    fs.cpSync(root, dir, { recursive: true });
    if (name === 'identity.json') {const j=JSON.parse(fs.readFileSync(path.join(dir,name)));j.artifact.sha256='0'.repeat(64);fs.writeFileSync(path.join(dir,name),JSON.stringify(j));}
    else fs.appendFileSync(path.join(dir,name),'changed');
    assert.throws(() => verifyFreeze(dir));
  }
});
test('unsupported REA behavioral claim retains real rejection and static/runtime limits', () => {
  const failure=JSON.parse(read('verification-rejection.json'));
  assert.equal(failure.actual.isError,true);
  assert.equal(failure.actual.issues[0].message,'Comparison Evidence identity or authority disagrees');
  const excerpts=JSON.parse(read('rea-excerpts.json'));
  assert.equal(excerpts.failed_runtime_tool.produced_capture,false);
  assert.equal(excerpts.kind,'Sanitized selected excerpts; not canonical REA Evidence');
  assert.ok(excerpts.records.every(r=>r.authority==='shipped-artifact'));
});
