#!/usr/bin/env node
// Opt-in, on-use checks. No scheduler, model calls, credentials or npm dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NAME, BEGIN, END, normalizeClient, noLinks, readTree, hash, planInstall, applyInstall } from './installer.mjs';
import { MAX_ARCHIVE, releaseFiles } from './release-archive.mjs';

export const WEEK = 7 * 24 * 60 * 60 * 1000;
export const REPO = 'ShadowSwaps/REA-Reconstruction-Companion';
const API = `https://api.github.com/repos/${REPO}/releases`;
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = value => JSON.stringify(value, null, 2) + '\n';
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const hashes = tree => Object.fromEntries([...tree].map(([p, data]) => [p, hash(data)]));

export function versionParts(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/.test(value)) throw new Error('Expected a stable x.y.z version.');
  return value.split('.').map(Number);
}
export function newer(a, b) {
  const x = versionParts(a), y = versionParts(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

export function stateLocation(skillRoot = DEFAULT_ROOT) {
  noLinks(skillRoot);
  const root = fs.realpathSync.native(skillRoot);
  const parent = path.join(path.dirname(path.dirname(root)), '.rea-reconstruction-companion-installer', 'updates');
  const directory = path.join(parent, hash(root).slice(0, 32));
  noLinks(directory);
  return { root, directory, file: path.join(directory, 'state.json') };
}

function loadState(location) {
  noLinks(location.file);
  if (!exists(location.file)) return null;
  if (fs.statSync(location.file).size > 1024 * 1024) throw new Error('Update state is too large; review it manually.');
  const s = JSON.parse(fs.readFileSync(location.file, 'utf8'));
  if (s.schema !== 1 || s.companion !== location.root || typeof s.enabled !== 'boolean' || !s.options || !s.files || typeof s.files !== 'object' || Array.isArray(s.files)) throw new Error('Invalid update state; review it manually before re-enabling from a verified package.');
  versionParts(s.version);
  s.options.client = normalizeClient(s.options.client);
  if (typeof s.options.skillsDir !== 'string' || path.join(s.options.skillsDir, NAME) !== location.root || !['codex', 'claude-code', 'generic'].includes(s.options.client) || !['on', 'off'].includes(s.options.integration)) throw new Error('Invalid saved installation settings.');
  if (s.options.integration === 'on' && (typeof s.options.reaSkill !== 'string' || typeof s.reaBlockHash !== 'string')) throw new Error('Missing saved REA settings.');
  for (const timestamp of [s.lastAttempt, s.lastSuccess]) if (timestamp !== null && (!Number.isSafeInteger(timestamp) || timestamp < 0)) throw new Error('Invalid update timestamp.');
  if (Object.values(s.files).some(v => typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v))) throw new Error('Invalid installation baseline.');
  return s;
}

function saveState(location, state) {
  noLinks(location.file);
  const temporary = path.join(location.directory, `state-${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, json(state), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, location.file);
  } finally { if (exists(temporary)) fs.unlinkSync(temporary); }
}

// Inspect only the recorded file, without following links or reading unbounded content.
// NONBLOCK avoids waiting on a FIFO if the path changes between lstat and open.
function inspectReaBlock(reaSkill) {
  let fd;
  try {
    noLinks(reaSkill);
    if (!fs.lstatSync(reaSkill).isFile()) return { status: 'unreadable-or-unsafe' };
    fd = fs.openSync(reaSkill, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    const stat = fs.fstatSync(fd), limit = 1024 * 1024;
    if (!stat.isFile() || stat.size > limit) return { status: 'unreadable-or-unsafe' };
    const buffer = Buffer.alloc(limit + 1); let size = 0;
    while (size < buffer.length) {
      const count = fs.readSync(fd, buffer, size, buffer.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size > limit) return { status: 'unreadable-or-unsafe' };
    const bytes = buffer.subarray(0, size), text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) return { status: 'unreadable-or-unsafe' };
    const begins = text.split(BEGIN).length - 1, ends = text.split(END).length - 1;
    if (!begins && !ends && !text.includes(NAME)) return { status: 'missing-block' };
    if (begins !== 1 || ends !== 1 || text.indexOf(END) < text.indexOf(BEGIN)) return { status: 'malformed-block' };
    return { status: 'present', hash: hash(text.slice(text.indexOf(BEGIN), text.indexOf(END) + END.length)) };
  } catch (e) {
    return { status: e.code === 'ENOENT' ? 'missing-file' : 'unreadable-or-unsafe' };
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

function blockHash(reaSkill) {
  if (!reaSkill) return null;
  const block = inspectReaBlock(reaSkill);
  if (block.status !== 'present') throw new Error(`Managed REA rule is missing, changed or unreadable/unsafe (${block.status}).`);
  return block.hash;
}

function integrationWarning(state) {
  if (state.options.integration !== 'on') return null;
  const block = inspectReaBlock(state.options.reaSkill);
  if (block.status === 'present' && block.hash === state.reaBlockHash) return null;
  const integrationHealth = block.status === 'present' ? 'changed-block' : block.status;
  const messages = {
    'missing-file': 'The recorded REA skill file is missing.',
    'missing-block': 'The recorded REA skill no longer contains the companion rule; REA setup or a skill refresh may have removed it.',
    'changed-block': 'The recorded companion rule differs from the verified baseline.',
    'malformed-block': 'The recorded REA skill contains malformed, duplicate or unmarked companion integration.',
    'unreadable-or-unsafe': 'The recorded REA skill could not be safely read as a regular UTF-8 file of at most 1 MiB.'
  };
  return { status: 'integration-needs-attention', integrationHealth, message: `${messages[integrationHealth]} Review the selected installation and recovery instructions. No repair or online check was attempted; explicit companion use remains available.` };
}

function unchanged(state) {
  const actual = hashes(readTree(state.companion)), expected = state.files;
  if (Object.keys(actual).length !== Object.keys(expected).length || Object.entries(expected).some(([p, sha]) => actual[p] !== sha)) throw new Error('Local companion files changed. Review customizations and update manually; nothing was replaced.');
  if (state.options.integration === 'on' && blockHash(state.options.reaSkill) !== state.reaBlockHash) throw new Error('Managed REA rule changed. Review it and re-enable checks from a verified package.');
}

// Fixed GitHub endpoints; never forward tokens, cookies, local paths or arbitrary URLs.
export async function download(url, limit, { fetcher = globalThis.fetch, timeoutMs = 15000, asset = false } = {}) {
  let current = new URL(url);
  const signal = AbortSignal.timeout(timeoutMs);
  for (let hop = 0; hop <= 3; hop++) {
    const api = current.origin === 'https://api.github.com' && current.pathname.startsWith(`/repos/${REPO}/releases/`);
    const originAsset = current.origin === 'https://github.com' && current.pathname.startsWith(`/${REPO}/releases/download/`);
    const cdn = current.origin === 'https://release-assets.githubusercontent.com';
    if (current.username || current.password || current.hash || (asset ? !(originAsset || cdn) : !api)) throw new Error('Untrusted update URL or redirect.');
    const response = await fetcher(current.href, { redirect: 'manual', signal, credentials: 'omit', headers: { 'User-Agent': 'REA-Reconstruction-Companion-update', Accept: asset ? 'application/octet-stream' : 'application/vnd.github+json' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const target = response.headers.get('location');
      if (!asset || !target || hop === 3) throw new Error('Update redirect refused.');
      current = new URL(target, current); continue;
    }
    if (response.status !== 200) { await response.body?.cancel(); throw new Error(`GitHub returned HTTP ${response.status}; no retry until the next weekly check.`); }
    const advertised = response.headers.get('content-length');
    if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > limit)) { await response.body?.cancel(); throw new Error('Update response exceeds size limit.'); }
    if (!response.body) throw new Error('Empty update response.');
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.length;
        if (size > limit) throw new Error('Update response exceeds size limit.');
        chunks.push(Buffer.from(next.value));
      }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks);
  }
  throw new Error('Update redirect limit.');
}

export function releaseCandidate(release) {
  if (!release || release.draft !== false || release.prerelease !== false || !Number.isSafeInteger(release.id) || release.id <= 0 || typeof release.tag_name !== 'string' || !release.tag_name.startsWith('v') || !release.published_at) throw new Error('Not a published stable release.');
  const version = release.tag_name.slice(1); versionParts(version);
  const link = `https://github.com/${REPO}/releases/tag/v${version}`;
  if (release.html_url !== link || !Array.isArray(release.assets)) throw new Error('Unexpected release origin.');
  const name = `REA-Reconstruction-Companion-${version}.zip`;
  const assets = release.assets.filter(a => a.name === name);
  if (assets.length !== 1) throw new Error('Expected one official release ZIP.');
  const a = assets[0], url = `https://github.com/${REPO}/releases/download/v${version}/${name}`;
  if (!Number.isSafeInteger(a.id) || a.id <= 0 || a.state !== 'uploaded' || a.browser_download_url !== url || !Number.isSafeInteger(a.size) || a.size < 22 || a.size > MAX_ARCHIVE || typeof a.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(a.digest)) throw new Error('Release asset is incomplete or lacks a SHA-256 digest.');
  const candidate = { version, releaseId: release.id, assetId: a.id, url, link, size: a.size, sha256: a.digest.slice(7), publishedAt: release.published_at, assetUpdatedAt: a.updated_at ?? null, notesHash: hash(typeof release.body === 'string' ? release.body : '') };
  return { ...candidate, approvalId: hash(JSON.stringify(candidate)), notes: typeof release.body === 'string' ? release.body.slice(0, 2000) : '' };
}

export async function runUpdate(action, options = {}, context = {}) {
  const location = stateLocation(context.skillRoot || DEFAULT_ROOT);
  const now = context.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid clock.');
  if (!['enable', 'disable', 'status', 'check', 'defer', 'skip', 'apply'].includes(action)) throw new Error('Unknown update action.');
  if (action !== 'enable' && !exists(location.file)) return { status: 'disabled' };
  noLinks(location.directory); fs.mkdirSync(location.directory, { recursive: true, mode: 0o700 });
  const lock = path.join(location.directory, 'update.lock'); let fd;
  try { fd = fs.openSync(lock, 'wx', 0o600); } catch (e) { if (e.code === 'EEXIST') return { status: 'busy' }; throw e; }
  try {
    let state = loadState(location);
    if (action === 'enable') {
      if (!options.packageRoot) throw new Error('Enable requires --package pointing to the verified release folder.');
      const plan = planInstall({ client: options.client, skillsDir: options.skillsDir || path.dirname(location.root), integration: options.integration, reaSkill: options.reaSkill, check: true }, { packageRoot: options.packageRoot });
      if (fs.realpathSync.native(plan.destination) !== location.root || applyInstall(plan).status !== 'verified') throw new Error('Install and verify this package at the selected location before enabling checks.');
      versionParts(plan.version);
      // Explicit enable/re-enable binds to the user's selected, verified installation.
      state = { schema: 1, companion: location.root, enabled: true, version: plan.version, options: { client: plan.options.client, skillsDir: path.dirname(location.root), integration: plan.options.integration, reaSkill: plan.reaSkill }, files: hashes(plan.desired), reaBlockHash: blockHash(plan.reaSkill), lastAttempt: state?.lastAttempt ?? null, lastSuccess: state?.lastSuccess ?? null, skippedVersion: null, pending: null };
      saveState(location, state); return { status: 'enabled', version: state.version, intervalDays: 7, stateFile: location.file };
    }
    if (action === 'status') return { status: state.enabled ? 'enabled' : 'disabled', version: state.version, lastAttempt: state.lastAttempt, lastSuccess: state.lastSuccess, skippedVersion: state.skippedVersion, stateFile: location.file };
    if (action === 'disable') { state.enabled = false; state.pending = null; saveState(location, state); return { status: 'disabled' }; }
    if (!state.enabled) return { status: 'disabled' };
    if (action === 'defer' || action === 'skip') {
      if (!state.pending || options.approvalId !== state.pending.approvalId) throw new Error('Decision does not match the offered release.');
      if (action === 'skip') state.skippedVersion = state.pending.version;
      // A clock rollback must not shorten the cooldown recorded by the offer.
      state.pending = null; state.lastAttempt = Math.max(state.lastAttempt ?? 0, now);
      saveState(location, state); return { status: action === 'skip' ? 'skipped' : 'deferred' };
    }
    if (action === 'check') {
      const warning = integrationWarning(state);
      if (warning) return warning;
      if (state.lastAttempt !== null && now < state.lastAttempt) return { status: 'clock-skew', message: 'Clock moved backwards; automatic checks deferred.' };
      if (state.lastAttempt !== null && now - state.lastAttempt < WEEK) return { status: 'not-due' };
      if (options.allowFreeNetwork !== true) return { status: 'network-not-authorized', message: 'Establish that network and tool use cannot add a charge before checking.' };
      unchanged(state);
      // Persist the attempt before I/O: failures, crashes and concurrent sessions cannot hammer GitHub.
      state.lastAttempt = now; state.pending = null; saveState(location, state);
      try {
        const release = JSON.parse((await download(`${API}/latest`, 256 * 1024, context)).toString('utf8'));
        const candidate = releaseCandidate(release);
        state.lastSuccess = now;
        if (!newer(candidate.version, state.version) || candidate.version === state.skippedVersion) {
          saveState(location, state); return { status: candidate.version === state.skippedVersion ? 'skipped' : 'up-to-date', installed: state.version };
        }
        state.pending = candidate; saveState(location, state);
        return { status: 'update-available', installed: state.version, ...candidate, notesAreUntrusted: true, choices: ['update', 'defer', 'skip', 'disable'] };
      } catch (e) { return { status: 'unavailable', message: e.message }; }
    }
    // Apply is a separate, explicit human-approved operation, never a side effect of check.
    const pending = state.pending;
    if (!pending || options.approvalId !== pending.approvalId) throw new Error('Explicit approval must match the offered release.');
    if (options.allowFreeNetwork !== true) throw new Error('No-charge network authorization is required.');
    if (!newer(pending.version, state.version)) throw new Error('Downgrades and same-version replacement are not automatic updates.');
    unchanged(state);
    const fresh = releaseCandidate(JSON.parse((await download(`${API}/${pending.releaseId}`, 256 * 1024, context)).toString('utf8')));
    if (fresh.approvalId !== pending.approvalId) {
      state.pending = null; saveState(location, state);
      throw new Error('The offered release changed. Nothing was installed; a fresh offer and approval are required.');
    }
    const archive = await download(fresh.url, MAX_ARCHIVE, { ...context, asset: true });
    if (archive.length !== fresh.size) throw new Error('Release asset size changed.');
    const files = releaseFiles(archive, fresh.version, fresh.sha256);
    const stage = fs.mkdtempSync(path.join(location.directory, 'package-'));
    try {
      for (const [relative, bytes] of files) {
        const target = path.join(stage, ...relative.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, bytes, { flag: 'wx' });
      }
      unchanged(state);
      // Use the already installed installer code. Never import/execute downloaded installer code.
      const plan = planInstall({ ...state.options, replace: true }, { packageRoot: stage });
      const result = applyInstall(plan);
      const check = applyInstall(planInstall({ ...state.options, check: true }, { packageRoot: stage }));
      if (check.status !== 'verified') throw new Error('Updated installation needs manual verification.');
      state.version = fresh.version; state.files = hashes(plan.desired); state.reaBlockHash = blockHash(state.options.reaSkill);
      // Keep recorded timestamps monotonic even if approval follows a clock rollback.
      state.pending = null; state.lastAttempt = Math.max(state.lastAttempt ?? 0, now);
      state.lastSuccess = Math.max(state.lastSuccess ?? 0, now);
      saveState(location, state);
      return { status: 'updated', version: state.version, backupDirectory: result.backupDirectory, verification: check.status, message: 'Refresh the host skill or start a fresh session if needed.' };
    } finally {
      // Only this freshly created child of the verified state directory is disposable.
      if (path.dirname(stage) !== location.directory || !path.basename(stage).startsWith('package-')) throw new Error('Unexpected staging path.');
      noLinks(stage); fs.rmSync(stage, { recursive: true, force: true });
    }
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

function args(argv) {
  const [action, ...rest] = argv, options = {};
  const names = new Map([['--package', 'packageRoot'], ['--client', 'client'], ['--skills-dir', 'skillsDir'], ['--integration', 'integration'], ['--rea-skill', 'reaSkill'], ['--approve', 'approvalId']]);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--allow-free-network') options.allowFreeNetwork = true;
    else if (names.has(rest[i]) && rest[i + 1] && !rest[i + 1].startsWith('--')) options[names.get(rest[i])] = rest[++i];
    else throw new Error(`Unknown option or missing value: ${rest[i]}`);
  }
  return { action, options };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20+ is required.');
    if (process.argv.includes('--help')) console.log('update.mjs enable --package PATH --client CLIENT --integration on|off [--skills-dir PATH] [--rea-skill PATH]\nCLIENT: codex, claude-code (alias claude_code), or generic.\nupdate.mjs status|disable|check [--allow-free-network]\nupdate.mjs apply|defer|skip --approve OFFER_ID [--allow-free-network]\nOff by default. On use, inspect recorded integration locally; online checks at most once per seven days. Apply only after human approval of the offer. --allow-free-network asserts that this network/tool use cannot add charges. No scheduler, tokens or model calls.');
    else { const { action, options } = args(process.argv.slice(2)); console.log(json(await runUpdate(action, options))); }
  } catch (e) { console.error(`Update needs attention: ${e.message}`); process.exitCode = 1; }
}
