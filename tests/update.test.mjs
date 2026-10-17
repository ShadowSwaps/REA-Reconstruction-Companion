import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planInstall, applyInstall, hash, NAME, BEGIN, END } from '../install.mjs';
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

for (const scenario of ['missing', 'disabled', 'not-due', 'clock-skew', 'warning', 'no-network']) {
  test(`read-only ${scenario}: zero writes, locks, mkdir or networking even with denied writes`, async t => {
    const f = fixture(t, 'on');
    if (scenario !== 'missing') await enable(f);
    if (scenario !== 'missing') {
      const s = JSON.parse(fs.readFileSync(f.location.file));
      if (scenario === 'disabled') s.enabled = false;
      if (scenario === 'not-due' || scenario === 'clock-skew') s.lastAttempt = now;
      fs.writeFileSync(f.location.file, JSON.stringify(s));
    }
    if (scenario === 'warning') fs.writeFileSync(f.reaSkill, baseRea);
    const before = scenario === 'missing' ? null : fs.readFileSync(f.location.file);
    const spies = [];
    for (const method of ['mkdirSync', 'writeFileSync', 'renameSync', 'unlinkSync', 'rmSync', 'mkdtempSync']) {
      spies.push(t.mock.method(fs, method, () => { assert.fail(`Unexpected ${method}`); }));
    }
    const open = fs.openSync;
    spies.push(t.mock.method(fs, 'openSync', (file, flags, ...args) => {
      assert.equal(typeof flags, 'number'); assert.equal(flags & (fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_RDWR), 0);
      return open(file, flags, ...args);
    }));
    let result;
    try {
      result = await runUpdate('check', { allowFreeNetwork: scenario !== 'no-network' }, { ...f.context, now: scenario === 'clock-skew' ? now - 1 : now, fetcher: () => assert.fail('Unexpected network') });
    } finally { for (const spy of spies) spy.mock.restore(); }
    assert.equal(result.status, { missing: 'disabled', disabled: 'disabled', 'not-due': 'not-due', 'clock-skew': 'clock-skew', warning: 'integration-needs-attention', 'no-network': 'network-not-authorized' }[scenario]);
    if (before) assert.deepEqual(fs.readFileSync(f.location.file), before);
    else assert.equal(fs.existsSync(f.location.directory), false);
  });
}

for (const change of ['disable', 'cooldown', 'offer', 'integration-off', 'integration-edit', 'companion-edit', 'corrupt', 'missing-state']) {
  test(`locked reread handles intervening ${change} without networking or overwriting decisions`, async t => {
    const f = fixture(t, 'on'); await enable(f); const n = transport(f);
    const original = fs.openSync; let changed = false, editedState;
    const spy = t.mock.method(fs, 'openSync', (file, ...args) => {
      if (file === path.join(f.location.directory, 'update.lock') && args[0] === 'wx') {
        changed = true;
        const s = JSON.parse(fs.readFileSync(f.location.file));
        if (change === 'disable') s.enabled = false;
        if (change === 'cooldown') s.lastAttempt = now;
        if (change === 'offer') s.pending = releaseCandidate(release());
        if (change === 'integration-off') s.options.integration = 'off';
        if (change === 'integration-edit') fs.writeFileSync(f.reaSkill, baseRea);
        if (change === 'companion-edit') fs.appendFileSync(path.join(f.installed.companion, 'SKILL.md'), '\nLocal change.');
        if (change === 'missing-state') fs.unlinkSync(f.location.file);
        else { editedState = change === 'corrupt' ? '{bad json' : JSON.stringify(s); fs.writeFileSync(f.location.file, editedState); }
      }
      return original(file, ...args);
    });
    let result;
    try {
      if (change === 'companion-edit') await assert.rejects(check(f, n.context), /Local companion files changed/);
      else if (change === 'corrupt') await assert.rejects(check(f, n.context), SyntaxError);
      else result = await check(f, n.context);
    } finally { spy.mock.restore(); }
    assert.equal(changed, true); assert.equal(n.calls.length, 0);
    if (result) assert.equal(result.status, { disable: 'disabled', cooldown: 'not-due', offer: 'local-check-unavailable', 'integration-off': 'local-check-unavailable', 'integration-edit': 'integration-needs-attention', 'missing-state': 'disabled' }[change]);
    if (editedState) assert.equal(fs.readFileSync(f.location.file, 'utf8'), editedState);
  });
}

for (const change of ['replace', 'grow', 'invalid-utf8', 'directory']) test(`state evidence rejects ${change} with zero writes/network`, async t => {
  const f = fixture(t); await enable(f); const n = transport(f);
  if (change === 'invalid-utf8') fs.writeFileSync(f.location.file, Buffer.from([0xff]));
  if (change === 'directory') { fs.unlinkSync(f.location.file); fs.mkdirSync(f.location.file); }
  let stateFd, armed = true;
  const originalOpen = fs.openSync, originalRead = fs.readSync;
  const open = t.mock.method(fs, 'openSync', (file, ...args) => {
    const fd = originalOpen(file, ...args); if (file === f.location.file) stateFd = fd; return fd;
  });
  const read = t.mock.method(fs, 'readSync', (fd, ...args) => {
    const count = originalRead(fd, ...args);
    if (armed && fd === stateFd && ['replace', 'grow'].includes(change)) {
      armed = false;
      if (change === 'replace') { const text = fs.readFileSync(f.location.file); fs.renameSync(f.location.file, f.location.file + '.before'); fs.writeFileSync(f.location.file, text); }
      else fs.appendFileSync(f.location.file, ' ');
    }
    return count;
  });
  try {
    if (['replace', 'grow'].includes(change)) assert.equal((await check(f, n.context)).reason, 'changing-evidence');
    else await assert.rejects(check(f, n.context), /UTF-8|regular/);
  } finally { open.mock.restore(); read.mock.restore(); }
  assert.equal(n.calls.length, 0); assert.equal(fs.existsSync(path.join(f.location.directory, 'update.lock')), false);
});

test('a lock appearing during local inspection returns busy without deleting it', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f);
  const original = fs.closeSync; let armed = true;
  const spy = t.mock.method(fs, 'closeSync', fd => {
    original(fd);
    if (armed) { armed = false; fs.writeFileSync(path.join(f.location.directory, 'update.lock'), 'concurrent'); }
  });
  try { assert.equal((await check(f, n.context)).status, 'busy'); } finally { spy.mock.restore(); }
  assert.equal(fs.readFileSync(path.join(f.location.directory, 'update.lock'), 'utf8'), 'concurrent'); assert.equal(n.calls.length, 0);
});

test('disabled state enabled during its read is changing evidence, never a trusted disabled result', async t => {
  const f = fixture(t); await enable(f); await runUpdate('disable', {}, f.context);
  const original = fs.closeSync; let armed = true;
  const spy = t.mock.method(fs, 'closeSync', fd => {
    original(fd);
    if (armed) { armed = false; const s = JSON.parse(fs.readFileSync(f.location.file)); s.enabled = true; fs.writeFileSync(f.location.file, JSON.stringify(s)); }
  });
  try { assert.equal((await runUpdate('check', {}, f.context)).reason, 'changing-evidence'); } finally { spy.mock.restore(); }
  assert.equal(JSON.parse(fs.readFileSync(f.location.file)).enabled, true);
  assert.equal(fs.existsSync(path.join(f.location.directory, 'update.lock')), false);
});

for (const change of ['removed-directory', 'replaced-directory', 'replaced-lock']) test(`lock boundary preserves ${change} evidence without networking`, async t => {
  const f = fixture(t); await enable(f); const n = transport(f), original = fs.openSync;
  const lock = path.join(f.location.directory, 'update.lock'); let changed = false;
  const spy = t.mock.method(fs, 'openSync', (file, ...args) => {
    if (file !== lock || args[0] !== 'wx') return original(file, ...args);
    changed = true;
    if (change !== 'replaced-lock') {
      fs.renameSync(f.location.directory, f.location.directory + '.before');
      if (change === 'replaced-directory') { fs.mkdirSync(f.location.directory); fs.copyFileSync(path.join(f.location.directory + '.before', 'state.json'), f.location.file); }
    }
    const fd = original(file, ...args);
    if (change === 'replaced-lock') { fs.renameSync(lock, lock + '.before'); fs.writeFileSync(lock, 'another process'); }
    return fd;
  });
  try {
    if (change === 'removed-directory') assert.equal((await check(f, n.context)).reason, 'changing-evidence');
    else await assert.rejects(check(f, n.context), { code: 'EUPDATESNAPSHOT' });
  } finally { spy.mock.restore(); }
  assert.equal(changed, true); assert.equal(n.calls.length, 0);
  if (change === 'removed-directory') assert.equal(fs.existsSync(f.location.directory), false);
  if (change === 'replaced-lock') assert.equal(fs.readFileSync(lock, 'utf8'), 'another process');
});

test('locked check samples the clock again after a backwards change', async t => {
  const f = fixture(t); await enable(f); const s = JSON.parse(fs.readFileSync(f.location.file)); s.lastAttempt = now - WEEK; fs.writeFileSync(f.location.file, JSON.stringify(s));
  const before = fs.readFileSync(f.location.file), original = fs.openSync; let clock = now;
  const date = t.mock.method(Date, 'now', () => clock);
  const open = t.mock.method(fs, 'openSync', (file, ...args) => { if (file === path.join(f.location.directory, 'update.lock')) clock = now - WEEK - 1; return original(file, ...args); });
  try { assert.equal((await runUpdate('check', { allowFreeNetwork: true }, { skillRoot: f.installed.companion, fetcher: () => assert.fail('Unexpected network') })).status, 'clock-skew'); }
  finally { open.mock.restore(); date.mock.restore(); }
  assert.deepEqual(fs.readFileSync(f.location.file), before);
});

test('an offer replaced during approved apply is preserved and cannot authorize an asset download', async t => {
  const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
  let calls = 0, changed;
  await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, { ...f.context, fetcher: async () => {
    assert.equal(++calls, 1);
    const s = JSON.parse(fs.readFileSync(f.location.file)); s.pending.approvalId = 'different-offer'; changed = JSON.stringify(s); fs.writeFileSync(f.location.file, changed);
    return new Response(JSON.stringify(release()));
  } }), { code: 'EUPDATESNAPSHOT' });
  assert.equal(calls, 1); assert.equal(fs.readFileSync(f.location.file, 'utf8'), changed);
});

test('a lock replaced during an online check prevents offer writes and is never deleted', async t => {
  const f = fixture(t); await enable(f); const lock = path.join(f.location.directory, 'update.lock'); let attempt;
  await assert.rejects(check(f, { ...f.context, fetcher: async () => {
    attempt = fs.readFileSync(f.location.file);
    fs.renameSync(lock, lock + '.before'); fs.writeFileSync(lock, 'replacement');
    return new Response(JSON.stringify(release()));
  } }), { code: 'EUPDATESNAPSHOT' });
  assert.deepEqual(fs.readFileSync(f.location.file), attempt); assert.equal(fs.readFileSync(lock, 'utf8'), 'replacement');
});

test('disabled by default: on-use check writes nothing and makes no request', async t => {
  const f = fixture(t); const n = transport(f);
  assert.equal((await check(f, n.context)).status, 'disabled'); assert.equal(n.calls.length, 0); assert.ok(!fs.existsSync(f.location.directory));
});

test('optional setup denial reports unknown availability and health without state, network or installation changes', async t => {
  for (const code of ['EPERM', 'EACCES']) for (const stage of ['resolve-state', 'inspect-state', 'read-state', 'acquire-lock']) {
    const f = fixture(t, 'on'); await enable(f); const n = transport(f);
    // Preserve an existing offer, skip decision and cooldown even when setup fails.
    const saved = JSON.parse(fs.readFileSync(f.location.file));
    saved.pending = releaseCandidate(release()); saved.skippedVersion = future; saved.lastAttempt = now - WEEK;
    fs.writeFileSync(f.location.file, JSON.stringify(saved));
    const before = fs.readFileSync(f.location.file), rea = fs.readFileSync(f.reaSkill);
    const payload = new Map(Object.keys(saved.files).map(p => [p, fs.readFileSync(path.join(f.installed.companion, p))]));
    const method = { 'resolve-state': 'lstatSync', 'inspect-state': 'lstatSync', 'read-state': 'openSync', 'acquire-lock': 'openSync' }[stage];
    const target = { 'resolve-state': f.installed.companion, 'inspect-state': f.location.file, 'read-state': f.location.file, 'acquire-lock': path.join(f.location.directory, 'update.lock') }[stage];
    const original = fs[method]; let attempts = 0;
    fs[method] = function(file, ...args) {
      if (file === target) { attempts++; throw Object.assign(new Error('Injected setup denial'), { code }); }
      if (stage !== 'acquire-lock') assert.notEqual(file, f.reaSkill, 'denied evidence cannot inspect integration');
      return original.call(fs, file, ...args);
    };
    let result;
    try { result = await check(f, n.context); } finally { fs[method] = original; }
    assert.equal(result.status, 'local-check-unavailable'); assert.equal(result.reason, 'permission-denied');
    assert.equal(result.code, code); assert.equal(result.stage, stage);
    assert.equal(result.updateAvailability, 'unknown'); assert.equal(result.integrationHealth, 'unknown');
    assert.equal(result.version, undefined); assert.equal(result.installed, undefined);
    assert.match(result.message, /Continue the main task/); assert.ok(!result.message.includes(f.dir));
    assert.equal(attempts, 1); assert.equal(n.calls.length, 0);
    assert.deepEqual(fs.readFileSync(f.location.file), before); assert.deepEqual(fs.readFileSync(f.reaSkill), rea);
    for (const [p, bytes] of payload) assert.deepEqual(fs.readFileSync(path.join(f.installed.companion, p)), bytes);
    assert.deepEqual(fs.readdirSync(f.location.directory), ['state.json']);
  }
});

test('setup errors stay explicit for other actions and non-permission failures', async t => {
  for (const code of ['EPERM', 'EACCES', 'EIO', 'ENOSPC']) {
    const f = fixture(t); await enable(f); const n = transport(f);
    const original = fs.openSync;
    fs.openSync = function(file, ...args) {
      if (file === path.join(f.location.directory, 'update.lock')) throw Object.assign(new Error('Injected lock failure'), { code });
      return original.call(fs, file, ...args);
    };
    try {
      for (const action of ['enable', 'disable', 'status', 'defer', 'skip', 'apply', ...(['EIO', 'ENOSPC'].includes(code) ? ['check'] : [])]) {
        await assert.rejects(runUpdate(action, { allowFreeNetwork: action === 'check' }, n.context), { code });
      }
    } finally { fs.openSync = original; }
    assert.equal(n.calls.length, 0);
  }
});

test('permission errors after locking and during lock cleanup are not setup-unavailable results', async t => {
  for (const code of ['EPERM', 'EACCES']) for (const phase of ['read-state', 'save-state', 'cleanup']) {
    const f = fixture(t); await enable(f); const n = transport(f);
    const method = { 'read-state': 'readSync', 'save-state': 'writeFileSync', cleanup: 'unlinkSync' }[phase];
    const original = fs[method];
    fs[method] = function(file, ...args) {
      if ((phase === 'read-state' && fs.existsSync(path.join(f.location.directory, 'update.lock'))) ||
          (phase === 'save-state' && path.dirname(file) === f.location.directory && path.basename(file).endsWith('.tmp')) ||
          (phase === 'cleanup' && file === path.join(f.location.directory, 'update.lock'))) {
        throw Object.assign(new Error('Injected post-lock failure'), { code });
      }
      return original.call(fs, file, ...args);
    };
    try { await assert.rejects(runUpdate('check', { allowFreeNetwork: true }, n.context), { code }); } finally { fs[method] = original; }
    assert.equal(n.calls.length, phase === 'cleanup' ? 1 : 0);
    assert.equal(fs.existsSync(path.join(f.location.directory, 'update.lock')), phase === 'cleanup');
  }
});

test('installed CLI setup denial exits zero with structured unknowns; explicit mutation still exits one', async t => {
  const f = fixture(t); await enable(f);
  const script = path.join(f.installed.companion, 'scripts/update.mjs');
  for (const code of ['EPERM', 'EACCES']) {
    const preload = path.join(f.dir, `denied-${code}.mjs`);
    fs.writeFileSync(preload, `import fs from 'node:fs';\nconst original = fs.openSync;\nfs.openSync = function(file, ...args) { if (file === ${JSON.stringify(path.join(f.location.directory, 'update.lock'))}) throw Object.assign(new Error('Injected lock denial'), { code: '${code}' }); return original.call(fs, file, ...args); };\nglobalThis.fetch = () => { throw new Error('Unexpected networking'); };\n`);
    const before = fs.readFileSync(f.location.file);
    let result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, 'check', '--allow-free-network'], { cwd: f.dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
    const output = JSON.parse(result.stdout); assert.equal(output.status, 'local-check-unavailable');
    assert.equal(output.code, code); assert.equal(output.updateAvailability, 'unknown'); assert.equal(output.integrationHealth, 'unknown');
    result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, 'disable'], { cwd: f.dir, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /Update needs attention: Injected lock denial/);
    assert.deepEqual(fs.readFileSync(f.location.file), before);
  }
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
  for (const client of ['codex', 'claude-code', 'claude_code', 'generic']) for (const integration of ['on', 'off']) {
    const f = fixture(t, integration, client); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const oldSkill = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
    fs.appendFileSync(f.reaSkill, '\nKeep later unrelated REA changes.\n');
    const beforeRea = fs.readFileSync(f.reaSkill);
    const result = await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context);
    assert.equal(result.status, 'updated'); assert.equal(result.verification, 'verified'); assert.equal(result.version, future);
    assert.deepEqual(fs.readFileSync(path.join(result.backupDirectory, 'companion-before', 'SKILL.md')), oldSkill);
    assert.match(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'), 'utf8'), /Updated fixture/);
    assert.deepEqual(fs.readFileSync(f.reaSkill), beforeRea);
    const state = JSON.parse(fs.readFileSync(f.location.file)); assert.equal(state.options.client, client === 'claude_code' ? 'claude-code' : client); assert.equal(state.options.integration, integration); assert.equal(state.enabled, true); assert.equal(state.pending, null);
    assert.equal((await check(f, n.context)).status, 'not-due'); assert.equal(n.calls.length, 3);
    assert.equal(fs.readdirSync(f.location.directory).some(x => x.startsWith('package-')), false);
  }
});

test('healthy recorded integration preserves cooldown, clock and no-charge decisions', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f);
  fs.appendFileSync(f.reaSkill, '\nUnrelated REA change outside the managed rule.\n');
  assert.equal((await runUpdate('check', {}, n.context)).status, 'network-not-authorized');
  assert.equal(n.calls.length, 0);
  assert.equal((await check(f, n.context)).status, 'update-available');
  assert.deepEqual(await check(f, { ...n.context, now: now + 1 }), { status: 'not-due' });
  assert.equal((await check(f, { ...n.context, now: now - 1 })).status, 'clock-skew');
  assert.equal(n.calls.length, 1);
});

test('local integration inspection accepts the 1 MiB boundary and rejects overflow', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f);
  const text = fs.readFileSync(f.reaSkill), limit = 1024 * 1024;
  fs.writeFileSync(f.reaSkill, Buffer.concat([text, Buffer.alloc(limit - text.length, 32)]));
  assert.equal((await runUpdate('check', {}, n.context)).status, 'network-not-authorized');
  fs.appendFileSync(f.reaSkill, 'x');
  assert.equal((await check(f, n.context)).integrationHealth, 'unreadable-or-unsafe');
  assert.equal(n.calls.length, 0);
});

test('an existing update lock prevents even local REA inspection', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), before = fs.readFileSync(f.location.file);
  const lock = path.join(f.location.directory, 'update.lock'); fs.writeFileSync(lock, 'other process');
  const original = fs.lstatSync;
  t.mock.method(fs, 'lstatSync', (file, ...args) => {
    assert.notEqual(file, f.reaSkill, 'busy checks must not inspect REA');
    return original(file, ...args);
  });
  assert.deepEqual(await check(f, n.context), { status: 'busy' });
  assert.equal(fs.readFileSync(lock, 'utf8'), 'other process');
  assert.deepEqual(fs.readFileSync(f.location.file), before); assert.equal(n.calls.length, 0);
});

const integrationFaults = [
  ['canonical replacement', 'missing-block', f => fs.writeFileSync(f.reaSkill, baseRea)],
  ['missing file', 'missing-file', f => fs.unlinkSync(f.reaSkill)],
  ['missing parent', 'missing-file', f => fs.renameSync(path.dirname(f.reaSkill), path.join(f.dir, 'moved-rea'))],
  ['changed block', 'changed-block', (f, text) => fs.writeFileSync(f.reaSkill, text.replace(BEGIN, BEGIN + '\nLocal edit.'))],
  ['missing end marker', 'malformed-block', (f, text) => fs.writeFileSync(f.reaSkill, text.replace(END, ''))],
  ['duplicate marker', 'malformed-block', (f, text) => fs.writeFileSync(f.reaSkill, text + END)],
  ['reversed markers', 'malformed-block', f => fs.writeFileSync(f.reaSkill, baseRea + END + BEGIN)],
  ['unmarked integration', 'malformed-block', (f, text) => fs.writeFileSync(f.reaSkill, text.replace(BEGIN, '').replace(END, ''))],
  ['directory', 'unreadable-or-unsafe', f => { fs.unlinkSync(f.reaSkill); fs.mkdirSync(f.reaSkill); }],
  ['oversized file', 'unreadable-or-unsafe', (f, text) => fs.writeFileSync(f.reaSkill, text + 'x'.repeat(1024 * 1024))],
  ['invalid UTF-8', 'unreadable-or-unsafe', (f, text) => fs.writeFileSync(f.reaSkill, Buffer.concat([Buffer.from(text), Buffer.from([0xff])]))]
];
for (const [name, health, change] of integrationFaults) test(`local integration warning: ${name}; no state change, repair or networking`, async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), offer = await check(f, n.context);
  const companionBefore = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
  change(f, fs.readFileSync(f.reaSkill, 'utf8'));
  const stateBefore = fs.readFileSync(f.location.file);
  // The same local warning wins before no-charge, cooldown and backwards-clock decisions.
  for (const time of [now + 1, now - 1, now + WEEK]) for (const allowFreeNetwork of [false, true]) {
    const result = await runUpdate('check', { allowFreeNetwork }, { ...n.context, now: time });
    assert.equal(result.status, 'integration-needs-attention'); assert.equal(result.integrationHealth, health);
    assert.match(result.message, /No repair or online check was attempted/);
    assert.deepEqual(fs.readFileSync(f.location.file), stateBefore);
  }
  // A pending exact approval still cannot bypass the separate apply-time guard.
  await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context), /Managed REA rule/);
  assert.equal(n.calls.length, 1);
  assert.deepEqual(fs.readFileSync(f.location.file), stateBefore);
  assert.deepEqual(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md')), companionBefore);
});

test('missing state, disabled checks and integration off do not inspect REA', async t => {
  for (const mode of ['missing-state', 'disabled', 'off']) {
    const f = fixture(t, mode === 'off' ? 'off' : 'on');
    if (mode !== 'missing-state') await enable(f);
    if (mode === 'disabled') await runUpdate('disable', {}, f.context);
    const original = fs.lstatSync;
    const spy = t.mock.method(fs, 'lstatSync', (file, ...args) => {
      assert.notEqual(file, f.reaSkill, 'unmanaged REA must not be inspected');
      return original(file, ...args);
    });
    try {
      const n = transport(f), result = await runUpdate('check', {}, n.context);
      assert.equal(result.status, mode === 'off' ? 'network-not-authorized' : 'disabled');
      assert.equal(n.calls.length, 0);
      if (mode === 'missing-state') assert.equal(fs.existsSync(f.location.directory), false);
    } finally { spy.mock.restore(); }
  }
});

test('unreadable recorded REA yields a local warning without exposing filesystem error text', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), before = fs.readFileSync(f.location.file);
  const original = fs.openSync;
  t.mock.method(fs, 'openSync', (file, ...args) => {
    if (file === f.reaSkill) throw Object.assign(new Error('Untrusted error text'), { code: 'EACCES' });
    return original(file, ...args);
  });
  const result = await runUpdate('check', {}, n.context);
  assert.equal(result.integrationHealth, 'unreadable-or-unsafe');
  assert.doesNotMatch(result.message, /Untrusted error text/);
  assert.equal(n.calls.length, 0); assert.deepEqual(fs.readFileSync(f.location.file), before);
});

test('linked recorded REA file or parent is warned about without reading its target', async t => {
  for (const choice of ['file', 'parent']) {
    const f = fixture(t, 'on'); await enable(f); const n = transport(f);
    const target = path.join(f.dir, 'other-rea'); fs.mkdirSync(target);
    const targetFile = path.join(target, 'SKILL.md'), text = fs.readFileSync(f.reaSkill);
    fs.writeFileSync(targetFile, text);
    const link = choice === 'file' ? f.reaSkill : path.dirname(f.reaSkill);
    fs.renameSync(link, path.join(f.dir, 'original-rea'));
    // A junction also exercises rejection on Windows without symlink privilege.
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    const original = fs.openSync;
    const spy = t.mock.method(fs, 'openSync', (file, ...args) => {
      assert.notEqual(file, f.reaSkill, 'a linked REA path must never be opened');
      return original(file, ...args);
    });
    try { assert.equal((await check(f, n.context)).integrationHealth, 'unreadable-or-unsafe'); }
    finally { spy.mock.restore(); }
    assert.equal(n.calls.length, 0); assert.deepEqual(fs.readFileSync(targetFile), text);
  }
});

for (const scenario of ['replacement-after-open', 'parent-link-before-open', 'same-size-edit-during-read', 'replacement-during-read']) for (const gate of ['local', 'cooldown', 'online']) {
  test(`integration inspection rejects ${scenario} before the ${gate} decision`, async t => {
    const f = fixture(t, 'on'); await enable(f); const n = transport(f);
    if (gate === 'cooldown') await check(f, n.context);
    const callsBefore = n.calls.length;
    const saved = fs.readFileSync(f.location.file), text = fs.readFileSync(f.reaSkill, 'utf8');
    const originalOpen = fs.openSync, originalRead = fs.readSync;
    let armed = true, targetFd, inspectedBytes = 0, changed = false;
    const replace = () => {
      fs.renameSync(f.reaSkill, path.join(f.dir, 'old-rea.md'));
      fs.writeFileSync(f.reaSkill, baseRea);
      changed = true;
    };
    const open = t.mock.method(fs, 'openSync', (file, ...args) => {
      if (file !== f.reaSkill || !armed) return originalOpen(file, ...args);
      armed = false;
      if (scenario === 'parent-link-before-open') {
        const target = path.join(f.dir, 'other-rea'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'SKILL.md'), text);
        fs.renameSync(path.dirname(f.reaSkill), path.join(f.dir, 'original-rea'));
        fs.symlinkSync(target, path.dirname(f.reaSkill), process.platform === 'win32' ? 'junction' : 'dir');
        changed = true;
      }
      targetFd = originalOpen(file, ...args);
      if (scenario === 'replacement-after-open') replace();
      return targetFd;
    });
    const read = t.mock.method(fs, 'readSync', (fd, ...args) => {
      const count = originalRead(fd, ...args);
      if (fd === targetFd) {
        inspectedBytes += count;
        if (count && !changed && scenario === 'same-size-edit-during-read') {
          fs.writeFileSync(f.reaSkill, text.replace('When using REA', 'When using XXX'));
          const changedAt = new Date(Date.now() + 1000); fs.utimesSync(f.reaSkill, changedAt, changedAt);
          changed = true;
        }
        if (count && !changed && scenario === 'replacement-during-read') replace();
      }
      return count;
    });
    let result;
    try { result = await runUpdate('check', { allowFreeNetwork: gate !== 'local' }, n.context); }
    finally { open.mock.restore(); read.mock.restore(); }
    assert.equal(changed, true, 'the concurrent change must actually occur');
    assert.equal(result.status, 'integration-needs-attention');
    assert.equal(result.integrationHealth, 'unreadable-or-unsafe');
    if (scenario === 'parent-link-before-open' || scenario === 'replacement-after-open') assert.equal(inspectedBytes, 0);
    assert.equal(n.calls.length, callsBefore); assert.deepEqual(fs.readFileSync(f.location.file), saved);
  });
}

for (const field of ['relative-path', 'non-normalized-path', 'invalid-hash']) test(`invalid recorded REA ${field} stops before local inspection`, async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f);
  const state = JSON.parse(fs.readFileSync(f.location.file));
  // Windows CI can put the checkout and fixtures on different drives; relative()
  // across those drives returns an absolute path, so anchor within the fixture.
  if (field === 'relative-path') {
    state.options.reaSkill = path.relative(path.dirname(f.reaSkill), f.reaSkill);
    assert.equal(path.isAbsolute(state.options.reaSkill), false);
  }
  else if (field === 'non-normalized-path') state.options.reaSkill = path.dirname(f.reaSkill) + path.sep + '.' + path.sep + 'SKILL.md';
  else state.reaBlockHash = 'not-a-sha256';
  fs.writeFileSync(f.location.file, JSON.stringify(state));
  const before = fs.readFileSync(f.location.file), original = fs.openSync; let reaReads = 0;
  const open = t.mock.method(fs, 'openSync', (file, ...args) => {
    if (typeof file === 'string' && (file === state.options.reaSkill || path.resolve(file) === f.reaSkill)) reaReads++;
    return original(file, ...args);
  });
  try { await assert.rejects(check(f, n.context), /Invalid saved REA settings/); }
  finally { open.mock.restore(); }
  assert.equal(reaReads, 0); assert.equal(n.calls.length, 0); assert.deepEqual(fs.readFileSync(f.location.file), before);
  if (field === 'relative-path' && process.platform === 'win32') {
    // isAbsolute alone accepts drive-dependent paths such as \folder\SKILL.md.
    state.options.reaSkill = path.sep + path.relative(path.parse(f.reaSkill).root, f.reaSkill);
    assert.equal(path.isAbsolute(state.options.reaSkill), true);
    fs.writeFileSync(f.location.file, JSON.stringify(state));
    const saved = fs.readFileSync(f.location.file);
    await assert.rejects(check(f, n.context), /Invalid saved REA settings/);
    assert.equal(n.calls.length, 0); assert.deepEqual(fs.readFileSync(f.location.file), saved);
  }
});

test('integration off never reads REA during authorized checks or approved updates', async t => {
  const f = fixture(t, 'off', 'claude_code'); await enable(f); const n = transport(f), before = fs.readFileSync(f.reaSkill);
  const original = fs.lstatSync;
  const spy = t.mock.method(fs, 'lstatSync', (file, ...args) => {
    assert.notEqual(file, f.reaSkill, 'integration off must not inspect REA even with network permission');
    return original(file, ...args);
  });
  try {
    const offer = await check(f, n.context);
    assert.equal(offer.status, 'update-available');
    assert.equal((await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context)).status, 'updated');
  } finally { spy.mock.restore(); }
  assert.deepEqual(fs.readFileSync(f.reaSkill), before); assert.equal(n.calls.length, 3);
});

for (const action of ['disable', 'defer', 'skip']) test(`integration warning does not prevent an explicit ${action} decision`, async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), offer = await check(f, n.context);
  fs.writeFileSync(f.reaSkill, baseRea);
  assert.equal((await check(f, n.context)).status, 'integration-needs-attention');
  const saved = JSON.parse(fs.readFileSync(f.location.file));
  const original = fs.lstatSync;
  const spy = t.mock.method(fs, 'lstatSync', (file, ...args) => {
    assert.notEqual(file, f.reaSkill, 'declining an update must not depend on reading REA');
    return original(file, ...args);
  });
  let result;
  try {
    if (action !== 'disable') await assert.rejects(runUpdate(action, { approvalId: 'wrong' }, n.context), /does not match/);
    result = await runUpdate(action, { approvalId: offer.approvalId }, { ...n.context, now: now + 1000 });
  } finally { spy.mock.restore(); }
  assert.equal(result.status, { disable: 'disabled', defer: 'deferred', skip: 'skipped' }[action]);
  const after = JSON.parse(fs.readFileSync(f.location.file));
  assert.deepEqual(after.options, saved.options); assert.deepEqual(after.files, saved.files); assert.equal(after.reaBlockHash, saved.reaBlockHash);
  assert.equal(after.pending, null); assert.equal(after.enabled, action !== 'disable');
  assert.equal(n.calls.length, 1); assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), baseRea);
});

test('recovering a missing rule does not grant update approval or network authorization', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), offer = await check(f, n.context);
  fs.writeFileSync(f.reaSkill, baseRea);
  assert.equal((await check(f, n.context)).status, 'integration-needs-attention');
  const saved = fs.readFileSync(f.location.file);
  applyInstall(planInstall(f.options, { packageRoot: root }));
  for (const approvalId of [undefined, 'wrong']) await assert.rejects(runUpdate('apply', { approvalId, allowFreeNetwork: true }, n.context), /approval must match/);
  for (const allowFreeNetwork of [undefined, false, 'true', 1]) await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork }, n.context), /No-charge/);
  assert.deepEqual(fs.readFileSync(f.location.file), saved); assert.equal(n.calls.length, 1);
  assert.equal((await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context)).status, 'updated');
  assert.equal(n.calls.length, 3);
});

test('verified recovery after an REA newline change needs explicit baseline re-enable', async t => {
  const f = fixture(t, 'on');
  fs.writeFileSync(f.reaSkill, fs.readFileSync(f.reaSkill, 'utf8').replace(/\n/g, '\r\n'));
  await enable(f); const n = transport(f), offer = await check(f, n.context);
  const before = fs.readFileSync(f.location.file), saved = JSON.parse(before);
  fs.writeFileSync(f.reaSkill, baseRea);
  assert.equal((await check(f, n.context)).integrationHealth, 'missing-block');
  applyInstall(planInstall(f.options, { packageRoot: root }));
  assert.equal(applyInstall(planInstall({ ...f.options, check: true }, { packageRoot: root })).status, 'verified');
  assert.equal((await check(f, n.context)).integrationHealth, 'changed-block');
  assert.deepEqual(fs.readFileSync(f.location.file), before);
  await assert.rejects(runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context), /Managed REA rule changed/);
  await enable(f); // Explicit, separately authorized baseline change in this fixture.
  const after = JSON.parse(fs.readFileSync(f.location.file));
  assert.notEqual(after.reaBlockHash, saved.reaBlockHash);
  assert.equal(after.lastAttempt, saved.lastAttempt); assert.equal(after.lastSuccess, saved.lastSuccess);
  assert.equal(after.pending, null); assert.equal(after.enabled, true);
  assert.equal((await check(f, n.context)).status, 'not-due'); assert.equal(n.calls.length, 1);
});

test('saved claude_code alias carries an exact offer through apply with canonical receipts', async t => {
  const f = fixture(t, 'on', 'claude_code'); await enable(f); const n = transport(f), offer = await check(f, n.context);
  const state = JSON.parse(fs.readFileSync(f.location.file));
  state.options.client = 'claude_code'; fs.writeFileSync(f.location.file, JSON.stringify(state));
  const before = fs.readFileSync(f.location.file);
  assert.equal((await runUpdate('status', {}, n.context)).status, 'enabled');
  assert.deepEqual(fs.readFileSync(f.location.file), before);
  const result = await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, n.context);
  assert.equal(result.status, 'updated');
  assert.equal(JSON.parse(fs.readFileSync(f.location.file)).options.client, 'claude-code');
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.backupDirectory, 'receipt.json'))).client, 'claude-code');
  assert.equal(fs.existsSync(path.join(f.installed.companion, 'agents/openai.yaml')), false);
});

test('scoped repair after simulated REA refresh clears warning without resetting consent or cooldown', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f); await check(f, n.context);
  const before = fs.readFileSync(f.location.file), refreshed = baseRea + '\nNew upstream content to retain.\n';
  fs.writeFileSync(f.reaSkill, refreshed);
  assert.equal((await runUpdate('check', {}, n.context)).integrationHealth, 'missing-block');
  const plan = planInstall(f.options, { packageRoot: root });
  assert.equal(plan.skillChanged, false); assert.equal(plan.ruleChanged, true);
  const repaired = applyInstall(plan);
  assert.equal(fs.readFileSync(path.join(repaired.backupDirectory, 'rea-before.md'), 'utf8'), refreshed);
  assert.ok(fs.readFileSync(f.reaSkill, 'utf8').endsWith('New upstream content to retain.\n'));
  assert.equal(applyInstall(planInstall({ ...f.options, check: true }, { packageRoot: root })).status, 'verified');
  assert.equal((await check(f, n.context)).status, 'not-due');
  assert.deepEqual(fs.readFileSync(f.location.file), before); assert.equal(n.calls.length, 1);
});

test('saved claude_code alias is readable without rewriting state during local checks', async t => {
  const f = fixture(t, 'on', 'claude_code'); await enable(f);
  const state = JSON.parse(fs.readFileSync(f.location.file)); assert.equal(state.options.client, 'claude-code');
  state.options.client = 'claude_code'; fs.writeFileSync(f.location.file, JSON.stringify(state));
  const before = fs.readFileSync(f.location.file);
  assert.equal((await runUpdate('check', {}, f.context)).status, 'network-not-authorized');
  assert.deepEqual(fs.readFileSync(f.location.file), before);
  await enable(f); assert.equal(JSON.parse(fs.readFileSync(f.location.file)).options.client, 'claude-code');
});

test('installed CLI enables alias and reports a local integration warning with exit zero', async t => {
  const f = fixture(t, 'on', 'claude_code'), script = path.join(f.installed.companion, 'scripts/update.mjs');
  const args = [script, 'enable', '--package', root, '--client', 'claude_code', '--integration', 'on', '--rea-skill', f.reaSkill];
  let result = spawnSync(process.execPath, args, { cwd: f.dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).status, 'enabled');
  assert.equal(JSON.parse(fs.readFileSync(f.location.file)).options.client, 'claude-code');
  fs.writeFileSync(f.reaSkill, baseRea);
  const before = fs.readFileSync(f.location.file);
  result = spawnSync(process.execPath, [script, 'check'], { cwd: f.dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'integration-needs-attention');
  assert.equal(JSON.parse(result.stdout).integrationHealth, 'missing-block');
  assert.deepEqual(fs.readFileSync(f.location.file), before);
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

for (const action of ['defer', 'skip']) {
  test(`clock rollback during ${action} cannot shorten the weekly cooldown`, async t => {
    const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const before = fs.readFileSync(path.join(f.installed.companion, 'SKILL.md'));
    const result = await runUpdate(action, { approvalId: offer.approvalId }, { ...n.context, now: now - WEEK });
    assert.equal(result.status, action === 'defer' ? 'deferred' : 'skipped');
    assert.equal((await check(f, { ...n.context, now: now - 1 })).status, 'clock-skew');
    assert.equal((await check(f, { ...n.context, now: now + 1 })).status, 'not-due');
    assert.equal((await check(f, { ...n.context, now: now + WEEK - 1 })).status, 'not-due');
    assert.equal(n.calls.length, 1);
    const state = JSON.parse(fs.readFileSync(f.location.file));
    assert.equal(state.pending, null);
    assert.equal(state.skippedVersion, action === 'skip' ? future : null);
    assert.equal(state.lastAttempt, now);
    assert.equal(state.lastSuccess, now);
    assert.deepEqual(fs.readFileSync(path.join(f.installed.companion, 'SKILL.md')), before);
    assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, action === 'skip' ? 'skipped' : 'update-available');
    assert.equal(n.calls.length, 2);
  });
}

test('clock rollback during approved apply cannot shorten the weekly cooldown', async t => {
  const f = fixture(t, 'on'); await enable(f); const n = transport(f), offer = await check(f, n.context);
  const result = await runUpdate('apply', { approvalId: offer.approvalId, allowFreeNetwork: true }, { ...n.context, now: now - WEEK });
  assert.equal(result.status, 'updated'); assert.equal(result.verification, 'verified');
  assert.equal(n.calls.length, 3);
  assert.equal((await check(f, { ...n.context, now: now - 1 })).status, 'clock-skew');
  assert.equal((await check(f, { ...n.context, now: now + 1 })).status, 'not-due');
  assert.equal((await check(f, { ...n.context, now: now + WEEK - 1 })).status, 'not-due');
  assert.equal(n.calls.length, 3);
  const state = JSON.parse(fs.readFileSync(f.location.file));
  assert.equal(state.lastAttempt, now); assert.equal(state.lastSuccess, now);
  assert.equal(state.pending, null); assert.equal(state.version, future);
  assert.ok(fs.existsSync(result.backupDirectory));
  assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, 'up-to-date');
  assert.equal(n.calls.length, 4);
});

test('forward-time decisions and approved apply start a fresh weekly cooldown', async t => {
  for (const action of ['defer', 'skip', 'apply']) {
    const f = fixture(t); await enable(f); const n = transport(f), offer = await check(f, n.context);
    const decidedAt = now + 1000;
    const result = await runUpdate(action, { approvalId: offer.approvalId, allowFreeNetwork: true }, { ...n.context, now: decidedAt });
    assert.equal(result.status, action === 'apply' ? 'updated' : action === 'skip' ? 'skipped' : 'deferred');
    const state = JSON.parse(fs.readFileSync(f.location.file));
    assert.equal(state.lastAttempt, decidedAt);
    assert.equal(state.lastSuccess, action === 'apply' ? decidedAt : now);
    assert.equal((await check(f, { ...n.context, now: now + WEEK })).status, 'not-due');
    assert.equal(n.calls.length, action === 'apply' ? 3 : 1);
    assert.equal((await check(f, { ...n.context, now: decidedAt + WEEK })).status, action === 'apply' ? 'up-to-date' : action === 'skip' ? 'skipped' : 'update-available');
    assert.equal(n.calls.length, action === 'apply' ? 4 : 2);
  }
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
