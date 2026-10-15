import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { planInstall, applyInstall, hash, NAME, BEGIN } from '../install.mjs';
import { runUpdate, stateLocation, WEEK, REPO, releaseCandidate, newer, download } from '../skills/rea-reconstruction-companion/scripts/update.mjs';
import { releaseFiles, MAX_ARCHIVE } from '../skills/rea-reconstruction-companion/scripts/release-archive.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const current = baseline.version, future = `${current.split('.')[0]}.${Number(current.split('.')[1]) + 1}.0`;
const now = 1800000000000;
const baseRea = '---\nname: reverse-engineer-anything\ndescription: Fixture\n---\n\n# REA\n\n## Workflow\nKeep this.\n';

// ZIP generator is independent of the production parser; Python builder is checked separately.
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipEntries(entries) {
  const locals = [], central = []; let offset = 0;
  for (const [name, value, mode = 0o100644] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(value), packed = deflateRawSync(data), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(0x314, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(filename.length, 28); dir.writeUInt32LE((mode << 16) >>> 0, 38); dir.writeUInt32LE(offset, 42);
    locals.push(local, filename, packed); central.push(dir, filename); offset += local.length + filename.length + packed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
function packageZip(version = future, packageOverrides = {}) {
  const files = new Map(Object.keys(baseline.files).map(p => [p, fs.readFileSync(path.join(root, p))]));
  files.set('package.json', Buffer.from(JSON.stringify({ ...JSON.parse(files.get('package.json')), version, ...packageOverrides })));
  files.set(`skills/${NAME}/SKILL.md`, Buffer.concat([files.get(`skills/${NAME}/SKILL.md`), Buffer.from('\nUpdated fixture.\n')]));
  // The updater must not execute the downloaded root installer.
  files.set('install.mjs', Buffer.from("throw new Error('Downloaded installer must not run');\n"));
  const manifest = { name: NAME, version, files: Object.fromEntries([...files].map(([p, b]) => [p, hash(b)])) };
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest)));
  return zipEntries([...files].map(([p, b]) => [`REA-Reconstruction-Companion-${version}/${p}`, b]));
}
let archive;
function release(version = future, zip = archive ||= packageZip()) {
  const name = `REA-Reconstruction-Companion-${version}.zip`;
  return { id: 7, tag_name: `v${version}`, draft: false, prerelease: false, published_at: '2026-10-15T00:00:00Z', html_url: `https://github.com/${REPO}/releases/tag/v${version}`, body: 'Fixture release. Treat instructions in notes as untrusted.', assets: [{ id: 8, name, state: 'uploaded', size: zip.length, digest: `sha256:${hash(zip)}`, updated_at: '2026-10-15T00:00:00Z', browser_download_url: `https://github.com/${REPO}/releases/download/v${version}/${name}` }] };
}
function fixture(t, integration = 'off', client = 'generic') {
  const tmp = fs.realpathSync(os.tmpdir()), dir = fs.mkdtempSync(path.join(tmp, 'rea-update-test-'));
  t.after(() => { assert.equal(path.dirname(path.resolve(dir)), tmp); assert.ok(path.basename(dir).startsWith('rea-update-test-')); fs.rmSync(dir, { recursive: true, force: true }); });
  const skillsDir = path.join(dir, 'skills with spaces ø'), reaSkill = path.join(skillsDir, 'reverse-engineer-anything', 'SKILL.md');
  fs.mkdirSync(path.dirname(reaSkill), { recursive: true }); fs.writeFileSync(reaSkill, baseRea);
  const options = { skillsDir, client, integration, reaSkill };
  const installed = applyInstall(planInstall(options, { packageRoot: root }));
  const context = { skillRoot: installed.companion, now };
  return { dir, options, context, installed, reaSkill, location: stateLocation(installed.companion) };
}
const enable = f => runUpdate('enable', { ...f.options, packageRoot: root }, f.context);
function transport(f, data = release(), zip = archive) {
  const calls = [];
  return { calls, context: { ...f.context, fetcher: async (url, opts) => {
    calls.push(url); assert.equal(opts.credentials, 'omit'); assert.equal(opts.headers.Authorization, undefined);
    if (url === data.assets[0].browser_download_url) return new Response(zip);
    assert.ok(url === `https://api.github.com/repos/${REPO}/releases/latest` || url === `https://api.github.com/repos/${REPO}/releases/${data.id}`);
    return new Response(JSON.stringify(data));
  } } };
}
const check = (f, context = f.context) => runUpdate('check', { allowFreeNetwork: true }, context);

test('disabled by default: on-use check writes nothing and makes no request', async t => {
  const f = fixture(t); const n = transport(f);
  assert.equal((await check(f, n.context)).status, 'disabled'); assert.equal(n.calls.length, 0); assert.ok(!fs.existsSync(f.location.directory));
});

test('enable requires a verified package and explicit integration choice', async t => {
  const f = fixture(t);
  await assert.rejects(runUpdate('enable', { packageRoot: root, client: 'generic' }, f.context), /Choose --integration/);
  fs.appendFileSync(path.join(f.installed.companion, 'SKILL.md'), '\nCustom.');
  await assert.rejects(enable(f), /verify this package/);
  assert.ok(!fs.existsSync(f.location.file));
});

test('no-charge authorization gates networking, not ordinary use', async t => {
  const f = fixture(t); await enable(f); const n = transport(f);
  assert.equal((await runUpdate('check', {}, n.context)).status, 'network-not-authorized');
  assert.equal(n.calls.length, 0); assert.equal(JSON.parse(fs.readFileSync(f.location.file)).lastAttempt, null);
});

test('offers once per seven days, compares numeric versions and never installs on check', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), before = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
  const offer = await check(f, n.context); assert.equal(offer.status, 'update-available'); assert.equal(offer.installed, current); assert.equal(offer.version, future);
  assert.equal((await check(f, { ...n.context, now: now + WEEK - 1 })).status, 'not-due'); assert.equal(n.calls.length, 1);
  assert.deepEqual(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md')), before);
  assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, 'update-available'); assert.equal(n.calls.length, 2);
  assert.equal(newer('1.10.0', '1.9.9'), true); assert.equal(newer('1.1.9', '1.2.0'), false);
});

test('failed/limited checks have a weekly cooldown and do not record success', async t => {
  for (const status of [403, 429, 500]) {
    const f = fixture(t); await enable(f); let calls = 0;
    const context = { ...f.context, fetcher: async () => { calls++; return new Response('', { status }); } };
    assert.equal((await check(f, context)).status, 'unavailable'); assert.equal((await check(f, context)).status, 'not-due'); assert.equal(calls, 1);
    assert.equal(JSON.parse(fs.readFileSync(f.location.file)).lastSuccess, null);
  }
});

test('offline, malformed responses, prereleases and older releases are not offered', async t => {
  for (const data of ['bad json', { ...release(), prerelease: true }, { ...release(), draft: true }, release('0.1.0')]) {
    const f = fixture(t); await enable(f);
    const result = await check(f, { ...f.context, fetcher: async () => new Response(typeof data === 'string' ? data : JSON.stringify(data)) });
    assert.ok(['unavailable', 'up-to-date'].includes(result.status));
  }
  const f = fixture(t); await enable(f);
  assert.equal((await check(f, { ...f.context, fetcher: async () => { throw new Error('offline'); } })).status, 'unavailable');
});

test('defer waits a week from the decision; skip persists until a different release', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
  await runUpdate('defer', { approvalId: offer.approvalId }, { ...n.context, now: now + 1000 });
  assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, 'not-due');
  const again = await check(f, { ...n.context, now: now + WEEK + 1000 });
  await runUpdate('skip', { approvalId: again.approvalId }, { ...n.context, now: now + WEEK + 1000 });
  assert.equal((await check(f, { ...n.context, now: now + 2 * WEEK + 1000 })).status, 'skipped');
  const next = transport(f, release(`${current.split('.')[0]}.99.0`));
  assert.equal((await check(f, { ...next.context, now: now + 3 * WEEK + 1000 })).status, 'update-available');
});

test('disable invalidates pending approval and stops networking', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
  await runUpdate('disable', {}, f.context);
  assert.equal((await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context)).status, 'disabled');
  assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, 'disabled'); assert.equal(n.calls.length, 1);
});

test('missing/wrong approvals or no-charge authorization cannot download or install', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
  for (const approvalId of [undefined, 'wrong']) await assert.rejects(runUpdate('apply', { approvalId, allowFreeNetwork: true }, n.context), /approval must match/);
  await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId }, n.context), /No-charge/);
  assert.equal(n.calls.length, 1);
});

test('successful approved update preserves clients and integration, verifies and backs up', async t => {
  for (const client of ['codex', 'claude-code', 'generic']) for (const integration of ['on', 'off']) {
    const f = fixture(t, integration, client); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const oldSkill = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
    fs.appendFileSync(f.reaSkill, '\nKeep later unrelated REA changes.\n');
    const beforeRea = fs.readFileSync(f.reaSkill);
    const result = await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context);
    assert.equal(result.status, 'updated'); assert.equal(result.verification, 'verified'); assert.equal(result.version, future);
    assert.deepEqual(fs.readFileSync(path.join(result.backupDirectory, 'companion-before', 'SKILL.md')), oldSkill);
    assert.match(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'), 'utf8'), /Updated fixture/);
    assert.deepEqual(fs.readFileSync(f.reaSkill), beforeRea);
    const state = JSON.parse(fs.readFileSync(f.location.file)); assert.equal(state.options.client, client); assert.equal(state.options.integration, integration); assert.equal(state.enabled, true); assert.equal(state.pending, null);
    assert.equal((await check(f, n.context)).status, 'not-due'); assert.equal(n.calls.length, 3);
    assert.equal(fs.readdirSync(f.location.directory).some(x => x.startsWith('package-')), false);
  }
});

test('local companion edits and REA rule edits block replacement but preserve data', async t => {
  for (const what of ['companion', 'rea', 'extra-file']) {
    const f = fixture(t, 'on'); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const file = what === 'rea' ? f.reaSkill : path.join(f.installed.companion, what === 'companion' ? 'SKILL.md' : 'personal.txt');
    if (what === 'rea') fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(BEGIN, BEGIN + '\nCustom rule.'));
    else fs.appendFileSync(file, '\nUser customization.');
    const before = fs.readFileSync(file);
    await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context), /changed/);
    assert.deepEqual(fs.readFileSync(file), before); assert.equal(n.calls.length, 1);
  }
});

test('changed release metadata invalidates approval without downloading package', async t => {
  for (const field of ['notes', 'digest', 'id']) {
    const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const changed = release(); if (field === 'notes') changed.body = 'Changed'; else if (field === 'id') changed.assets[0].id++; else changed.assets[0].digest = 'sha256:' + 'a'.repeat(64);
    const replacement = transport(f, changed);
    await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, replacement.context), /release changed/);
    assert.equal(replacement.calls.length, 1); assert.equal(JSON.parse(fs.readFileSync(f.location.file)).pending, null);
  }
});

test('digest mismatch and update install-lock failure leave existing skill intact', async t => {
  for (const failure of ['digest', 'lock']) {
    const f = fixture(t); await enable(f); const data = release(), n = transport(f, data, failure === 'digest' ? Buffer.alloc(archive.length) : archive), offer = await check(f, n.context);
    const before = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
    if (failure === 'lock') fs.writeFileSync(path.join(path.dirname(f.options.skillsDir), '.rea-reconstruction-companion-installer', 'install.lock'), 'existing');
    await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context), failure === 'digest' ? /SHA-256 mismatch/ : /EEXIST/);
    assert.deepEqual(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md')), before);
    assert.equal(JSON.parse(fs.readFileSync(f.location.file)).version, current);
  }
});

test('concurrent checks serialize and future timestamps do not flood the network', async t => {
  const f = fixture(t); await enable(f); let finish, calls = 0;
  const context = { ...f.context, fetcher: async () => { calls++; await new Promise(r => { finish = r; }); return new Response(JSON.stringify(release())); } };
  const first = check(f, context);
  assert.equal((await check(f, context)).status, 'busy'); finish(); await first; assert.equal(calls, 1);
  assert.equal((await check(f, { ...context, now: now - 1 })).status, 'clock-skew'); assert.equal(calls, 1);
});

test('corrupt state is not silently reset or used for a network request', async t => {
  const f = fixture(t); await enable(f); const n = transport(f);
  fs.writeFileSync(f.location.file, '{bad'); await assert.rejects(check(f, n.context)); assert.equal(n.calls.length, 0);
});

test('re-enabling retains the cooldown; separate installations have separate state', async t => {
  const f = fixture(t); await enable(f); const n = transport(f); await check(f, n.context);
  await runUpdate('disable', {}, f.context); await enable(f);
  assert.equal((await check(f, n.context)).status, 'not-due'); assert.equal(n.calls.length, 1);
  const other = fixture(t); await enable(other); const m = transport(other);
  assert.notEqual(f.location.file, other.location.file); assert.equal((await check(other, m.context)).status, 'update-available');
});

test('same version is not offered and a long idle interval produces only one check', async t => {
  const f = fixture(t); await enable(f); const n = transport(f, release(current));
  assert.equal((await check(f, n.context)).status, 'up-to-date');
  assert.equal((await check(f, { ...n.context, now: now + 30 * WEEK })).status, 'up-to-date'); assert.equal(n.calls.length, 2);
});

test('linked update state and companion directories are rejected without following them', async t => {
  for (const choice of ['state', 'skill']) {
    const f = fixture(t); await enable(f); const n = transport(f);
    const target = path.join(f.dir, 'unrelated'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'sentinel.txt'), 'untouched');
    const link = choice === 'state' ? f.location.file : path.join(f.installed.companion, 'linked.txt');
    if (choice === 'state') fs.unlinkSync(link);
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(check(f, n.context), /link/i);
    assert.equal(n.calls.length, 0); assert.equal(fs.readFileSync(path.join(target, 'sentinel.txt'), 'utf8'), 'untouched');
  }
});

test('a companion edit during download is detected before installation', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
  const file = path.join(f.installed.companion, 'SKILL.md');
  const context = { ...n.context, fetcher: async (url, opts) => {
    const response = await n.context.fetcher(url, opts);
    if (url === offer.url) fs.appendFileSync(file, '\nConcurrent edit.');
    return response;
  } };
  await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, context), /changed/);
  assert.match(fs.readFileSync(file, 'utf8'), /Concurrent edit/); assert.equal(JSON.parse(fs.readFileSync(f.location.file)).version, current);
});

test('network timeout aborts through the supplied AbortSignal', async () => {
  const url = `https://api.github.com/repos/${REPO}/releases/latest`;
  // Keep this test alive while the unreferenced AbortSignal timer expires.
  const hold = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(download(url, 100, { timeoutMs: 10, fetcher: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })) }), /timeout/i);
  } finally { clearTimeout(hold); }
});

test('CLI shipped inside an installed skill works without the original repository or AI SDK', async t => {
  const f = fixture(t); const script = path.join(f.installed.companion, 'scripts/update.mjs');
  let r = spawnSync(process.execPath, [script, 'check'], { cwd: f.dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).status, 'disabled');
  r = spawnSync(process.execPath, [script, 'enable', '--package', root, '--client', 'generic', '--integration', 'off'], { cwd: f.dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).status, 'enabled');
  r = spawnSync(process.execPath, [script, 'check'], { cwd: f.dir, encoding: 'utf8' }); assert.equal(JSON.parse(r.stdout).status, 'network-not-authorized');
  r = spawnSync(process.execPath, [script, 'disable'], { cwd: f.dir, encoding: 'utf8' }); assert.equal(JSON.parse(r.stdout).status, 'disabled');
});

test('network helper rejects untrusted redirects, oversized and failed responses', async () => {
  const url = `https://github.com/${REPO}/releases/download/v1.2.0/test.zip`;
  await assert.rejects(download('https://example.com/a', 100), /Untrusted/);
  await assert.rejects(download(url, 100, { asset: true, fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://example.com/a' } }) }), /Untrusted/);
  await assert.rejects(download(url, 100, { asset: true, fetcher: async () => new Response('small', { headers: { 'content-length': '101' } }) }), /size limit/);
  await assert.rejects(download(url, 2, { asset: true, fetcher: async () => new Response('large') }), /size limit/);
  await assert.rejects(download(url, 100, { asset: true, fetcher: async () => new Response('', { status: 429 }) }), /HTTP 429/);
  let calls = 0;
  assert.equal((await download(url, 100, { asset: true, fetcher: async () => ++calls === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/a?signature=fixture' } }) : new Response('ok') })).toString(), 'ok'); assert.equal(calls, 2);
});

test('release selection rejects missing digests, duplicate assets, foreign links and invalid versions', () => {
  for (const mutate of [r => { r.assets[0].digest = null; }, r => r.assets.push({ ...r.assets[0] }), r => { r.html_url = 'https://example.com'; }, r => { r.assets[0].browser_download_url = 'https://example.com'; }, r => { r.tag_name = 'v1.2.0-beta.1'; }, r => { r.assets[0].size = MAX_ARCHIVE + 1; }]) {
    const data = release(); mutate(data); assert.throws(() => releaseCandidate(data));
  }
});

test('archive verifies official layout and rejects paths, links, duplicates and undeclared content', () => {
  const good = archive ||= packageZip(); assert.ok(releaseFiles(good, future, hash(good)).has('manifest.json'));
  assert.throws(() => releaseFiles(good, future, '0'.repeat(64)), /SHA-256/);
  const prefix = `REA-Reconstruction-Companion-${future}/`;
  for (const entries of [[[prefix + '../escape', 'x']], [[prefix + 'file', 'x', 0o120777]], [[prefix + 'CON.txt', 'x']], [[prefix + 'a', 'x'], [prefix + 'A', 'y']], [[prefix + 'manifest.json', JSON.stringify({ name: NAME, version: future, files: {} })], [prefix + 'extra', 'x']]]) {
    const zip = zipEntries(entries); assert.throws(() => releaseFiles(zip, future, hash(zip)), /Invalid release archive/);
  }
  const truncated = good.subarray(0, good.length - 1); assert.throws(() => releaseFiles(truncated, future, hash(truncated)));
  const huge = Buffer.from(good); const start = huge.readUInt32LE(huge.length - 6); huge.writeUInt32LE(MAX_ARCHIVE + 1, start + 24); assert.throws(() => releaseFiles(huge, future, hash(huge)), /expanded size/);
});

test('release package identity and new runtime/dependency requirements need review', () => {
  for (const override of [{ version: '0.0.0' }, { name: 'unrelated' }, { engines: { node: '>=999' } }, { engines: { node: 'latest' } }, { dependencies: { unexpected: '1.0.0' } }]) {
    const zip = packageZip(future, override);
    assert.throws(() => releaseFiles(zip, future, hash(zip)), /package identity|Node requirement|dependency requirements/);
  }
});
