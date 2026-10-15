#!/usr/bin/env node
// MIT licensed. No npm packages, network calls, or model SDKs are needed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const NAME = 'rea-reconstruction-companion';
export const BEGIN = `<!-- ${NAME}:begin -->`;
export const END = `<!-- ${NAME}:end -->`;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const normalize = text => text.replace(/\r\n/g, '\n');

function noLinks(p) {
  for (let current = path.resolve(p); ; current = path.dirname(current)) {
    if (exists(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing a symbolic link or junction: ${current}. Use its explicit real path.`);
    }
    if (path.dirname(current) === current) break;
  }
}

function containsPath(parent, child) {
  const root = path.resolve(parent);
  const identity = exists(root) ? fs.statSync(root, { bigint: true }) : null;
  for (let current = path.resolve(child); ; current = path.dirname(current)) {
    if (current === root) return true;
    // Filesystem identity also catches casing aliases on Windows and macOS.
    if (identity && identity.ino !== 0n && exists(current)) {
      const candidate = fs.statSync(current, { bigint: true });
      if (identity.dev === candidate.dev && identity.ino === candidate.ino) return true;
    }
    if (path.dirname(current) === current) return false;
  }
}

function utf8(data) {
  const text = data.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(data)) throw new Error('Expected a UTF-8 text file.');
  return text;
}

function frontmatter(text) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('Expected SKILL.md YAML frontmatter.');
  return match;
}

function skillName(text) {
  const match = /^name:\s*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s#]+))\s*(?:#.*)?$/m.exec(frontmatter(text)[1]);
  if (!match) throw new Error('Expected a simple name field in SKILL.md.');
  return match[1] || match[2] || match[3];
}

function packageFiles(root) {
  noLinks(root);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.name !== NAME || typeof manifest.version !== 'string' || !manifest.files || Array.isArray(manifest.files)) {
    throw new Error('Invalid package manifest.');
  }
  const files = new Map();
  for (const [relative, digest] of Object.entries(manifest.files)) {
    if (!relative || relative.includes('\\') || relative.includes(':') || relative.split('/').some(x => !x || x === '.' || x === '..')) {
      throw new Error(`Unsafe package path: ${relative}`);
    }
    const absolute = path.join(root, ...relative.split('/'));
    noLinks(absolute);
    const data = fs.readFileSync(absolute);
    if (!/^[a-f0-9]{64}$/.test(digest) || hash(data) !== digest) throw new Error(`Package checksum mismatch: ${relative}`);
    files.set(relative, data);
  }
  for (const required of [`skills/${NAME}/SKILL.md`, 'integration/rea-companion.md', 'integration/legacy-rea-companion.md', 'adapters/codex/openai.yaml']) {
    if (!files.has(required)) throw new Error(`Missing package file: ${required}`);
  }
  if (skillName(utf8(files.get(`skills/${NAME}/SKILL.md`))) !== NAME) throw new Error('Companion skill identity mismatch.');
  return { manifest, files };
}

export function locations(options, context = {}) {
  const home = context.home || os.homedir();
  const env = context.env || process.env;
  if (!['codex', 'claude-code', 'generic'].includes(options.client)) throw new Error('Choose --client codex, claude-code, or generic.');
  if (!['on', 'off'].includes(options.integration)) throw new Error('Choose --integration on (automatic co-use) or off (companion only).');
  if (options.client === 'generic' && !options.skillsDir) throw new Error('Generic clients require --skills-dir.');
  const codexRoot = env.CODEX_HOME ? path.join(env.CODEX_HOME, 'skills') : path.join(home, '.agents', 'skills');
  const claudeRoot = path.join(env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), 'skills');
  const skillsDir = path.resolve(options.skillsDir || (options.client === 'claude-code' ? claudeRoot : codexRoot));
  const destination = path.join(skillsDir, NAME);
  noLinks(skillsDir);
  noLinks(destination);
  if (options.integration === 'off') return { skillsDir, destination, reaSkill: null };
  const candidates = [path.join(skillsDir, 'reverse-engineer-anything', 'SKILL.md')];
  if (!options.skillsDir && options.client === 'codex') {
    candidates.push(path.join(home, '.agents', 'skills', 'reverse-engineer-anything', 'SKILL.md'));
    candidates.push(path.join(home, '.codex', 'skills', 'reverse-engineer-anything', 'SKILL.md'));
  }
  let reaSkill;
  if (options.reaSkill) {
    reaSkill = path.resolve(options.reaSkill);
    noLinks(reaSkill);
    if (exists(reaSkill) && fs.statSync(reaSkill).isDirectory()) reaSkill = path.join(reaSkill, 'SKILL.md');
  } else {
    const matches = [...new Set(candidates.filter(exists).map(file => {
      noLinks(file);
      // One file can have differently cased paths on Windows and macOS.
      return fs.realpathSync.native(file);
    }))];
    if (matches.length !== 1) throw new Error(matches.length
      ? `Multiple REA skills found. Select the one loaded by your client with --rea-skill:\n${matches.join('\n')}`
      : 'REA skill not found. Install REA for this client first, or pass --rea-skill /path/to/reverse-engineer-anything/SKILL.md.');
    [reaSkill] = matches;
  }
  noLinks(skillsDir);
  noLinks(reaSkill);
  if (containsPath(destination, reaSkill)) throw new Error('REA must be separate from the companion destination.');
  return { skillsDir, destination, reaSkill };
}

export function patchRea(original, rule, legacy) {
  if (skillName(original) !== 'reverse-engineer-anything') throw new Error('The selected file is not the reverse-engineer-anything skill.');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const block = normalize(rule).trimEnd().replace(/\n/g, newline);
  if (!block.startsWith(BEGIN) || !block.endsWith(END)) throw new Error('Invalid packaged integration rule.');
  const begins = original.split(BEGIN).length - 1;
  const ends = original.split(END).length - 1;
  if (begins || ends) {
    if (begins !== 1 || ends !== 1 || original.indexOf(BEGIN) > original.indexOf(END)) throw new Error('Malformed or duplicate REA integration markers. Review the existing file first.');
    const start = original.indexOf(BEGIN);
    const end = original.indexOf(END) + END.length;
    return original.slice(0, start) + block + original.slice(end);
  }
  // Migrate only the exact pre-release integration text; preserve custom edits.
  const old = normalize(legacy).trimEnd().replace(/\n/g, newline);
  if (original.split(old).length === 2) return original.replace(old, block);
  if (original.includes(NAME)) throw new Error('An unmarked or customized companion integration already exists. Review it before adding a second rule.');
  const headerEnd = frontmatter(original)[0].length;
  const offset = original.slice(headerEnd).search(/^## /m);
  const insertion = offset < 0 ? original.length : headerEnd + offset;
  const prefix = original.slice(0, insertion);
  const gap = prefix.endsWith(newline + newline) ? '' : prefix.endsWith(newline) ? newline : newline + newline;
  return prefix + gap + block + newline + newline + original.slice(insertion);
}

function readTree(root) {
  const result = new Map();
  if (!exists(root)) return result;
  noLinks(root);
  if (!fs.statSync(root).isDirectory()) throw new Error(`Expected a directory: ${root}`);
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const p = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Refusing a linked file: ${p}`);
      if (entry.isDirectory()) visit(p);
      else if (entry.isFile()) result.set(path.relative(root, p).split(path.sep).join('/'), fs.readFileSync(p));
      else throw new Error(`Unsupported filesystem entry: ${p}`);
    }
  }
  visit(root);
  return result;
}

const sameTree = (a, b) => a.size === b.size && [...a].every(([p, data]) => b.has(p) && data.equals(b.get(p)));

export function planInstall(options, context = {}) {
  const root = path.resolve(context.packageRoot || ROOT);
  const { manifest, files } = packageFiles(root);
  const selected = locations(options, context);
  if (containsPath(selected.destination, root) || containsPath(root, selected.destination)) throw new Error('Installation destination must not overlap the package source directory.');
  const original = selected.reaSkill ? fs.readFileSync(selected.reaSkill) : null;
  const replacement = original ? Buffer.from(patchRea(utf8(original), utf8(files.get('integration/rea-companion.md')), utf8(files.get('integration/legacy-rea-companion.md')))) : null;
  const desired = new Map();
  const prefix = `skills/${NAME}/`;
  for (const [p, data] of files) if (p.startsWith(prefix)) desired.set(p.slice(prefix.length), data);
  if (options.client === 'codex') desired.set('agents/openai.yaml', files.get('adapters/codex/openai.yaml'));
  const before = readTree(selected.destination);
  const destinationExisted = exists(selected.destination);
  return { ...selected, options, version: manifest.version, original, replacement, desired, before, destinationExisted,
    skillChanged: !destinationExisted || !sameTree(before, desired), ruleChanged: original !== null && !original.equals(replacement) };
}

function atomicReplace(file, bytes) {
  const temporary = path.join(path.dirname(file), `.rea-companion-${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: fs.statSync(file).mode });
    fs.renameSync(temporary, file);
  } finally {
    if (exists(temporary)) fs.unlinkSync(temporary);
  }
}

function summary(plan) {
  const companionChanges = { added: [], modified: [], removed: [] };
  for (const [file, data] of plan.desired) {
    if (!plan.before.has(file)) companionChanges.added.push(file);
    else if (!data.equals(plan.before.get(file))) companionChanges.modified.push(file);
  }
  for (const file of plan.before.keys()) if (!plan.desired.has(file)) companionChanges.removed.push(file);
  for (const files of Object.values(companionChanges)) files.sort();
  return { client: plan.options.client, version: plan.version, companion: plan.destination, reaSkill: plan.reaSkill,
    integration: plan.options.integration === 'on' ? 'enabled' : 'not-managed; existing REA left untouched',
    skillChangeNeeded: plan.skillChanged, integrationChangeNeeded: plan.ruleChanged,
    companionChanges,
    replacementFlagNeeded: plan.skillChanged && plan.destinationExisted && !plan.options.replace };
}

// writeRea is injectable solely to exercise rollback without modifying a real host.
export function applyInstall(plan, writeRea = atomicReplace) {
  if (plan.options.dryRun) return { ...summary(plan), status: 'dry-run', writes: 0 };
  if (plan.options.check) return { ...summary(plan), status: plan.skillChanged || plan.ruleChanged ? 'needs-install-or-repair' : 'verified' };
  if (plan.skillChanged && plan.destinationExisted && !plan.options.replace) throw new Error('Companion files differ. Use --dry-run to review, then --replace to back up and replace this skill only.');
  if (!plan.skillChanged && !plan.ruleChanged) return { ...summary(plan), status: 'already-installed', writes: 0 };
  const stateRoot = path.join(path.dirname(plan.skillsDir), '.rea-reconstruction-companion-installer');
  noLinks(stateRoot);
  fs.mkdirSync(stateRoot, { recursive: true });
  const locks = [];
  let transaction, oldMoved = false, newMoved = false;
  try {
    const lockPaths = [path.join(stateRoot, 'install.lock')];
    if (plan.reaSkill) lockPaths.push(path.join(path.dirname(plan.reaSkill), '.rea-companion-install.lock'));
    for (const file of lockPaths.sort()) {
      const fd = fs.openSync(file, 'wx');
      fs.closeSync(fd);
      locks.push(file);
    }
    if (plan.reaSkill) noLinks(plan.reaSkill);
    noLinks(plan.destination);
    if ((plan.reaSkill && !fs.readFileSync(plan.reaSkill).equals(plan.original)) || exists(plan.destination) !== plan.destinationExisted || !sameTree(readTree(plan.destination), plan.before)) {
      throw new Error('Selected files changed after planning. Retry from a fresh plan.');
    }
    transaction = path.join(stateRoot, `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`);
    fs.mkdirSync(transaction);
    if (plan.original) fs.writeFileSync(path.join(transaction, 'rea-before.md'), plan.original, { flag: 'wx' });
    if (plan.skillChanged) {
      const staged = path.join(transaction, 'staged-companion');
      fs.mkdirSync(staged);
      for (const [relative, data] of plan.desired) {
        const target = path.join(staged, ...relative.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data, { flag: 'wx' });
      }
      if (!sameTree(readTree(staged), plan.desired)) throw new Error('Staged companion verification failed.');
      fs.mkdirSync(plan.skillsDir, { recursive: true });
      if (plan.destinationExisted) { fs.renameSync(plan.destination, path.join(transaction, 'companion-before')); oldMoved = true; }
      fs.renameSync(staged, plan.destination);
      newMoved = true;
    }
    if (plan.ruleChanged) writeRea(plan.reaSkill, plan.replacement);
    if ((plan.reaSkill && !fs.readFileSync(plan.reaSkill).equals(plan.replacement)) || !sameTree(readTree(plan.destination), plan.desired)) throw new Error('Installation verification failed.');
    const receipt = { ...summary(plan), status: 'installed', backupDirectory: transaction,
      reaBeforeSHA256: plan.original ? hash(plan.original) : null, reaAfterSHA256: plan.replacement ? hash(plan.replacement) : null,
      files: Object.fromEntries([...plan.desired].map(([p, data]) => [p, hash(data)])) };
    fs.writeFileSync(path.join(transaction, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    return receipt;
  } catch (error) {
    const recovery = [];
    if (transaction) {
      try {
        if (plan.reaSkill) {
          const now = fs.readFileSync(plan.reaSkill);
          if (now.equals(plan.replacement) && !now.equals(plan.original)) atomicReplace(plan.reaSkill, plan.original);
          else if (!now.equals(plan.original)) recovery.push('REA was changed by another writer; retained it.');
        }
      } catch (rollbackError) { recovery.push(`REA recovery: ${rollbackError.message}`); }
      // A missing or unreadable REA file must not prevent companion recovery.
      try {
        if (newMoved) {
          if (!sameTree(readTree(plan.destination), plan.desired)) throw new Error('Companion changed during rollback; retained it.');
          fs.renameSync(plan.destination, path.join(transaction, 'failed-companion'));
        }
        if (oldMoved) fs.renameSync(path.join(transaction, 'companion-before'), plan.destination);
      } catch (rollbackError) { recovery.push(`Companion recovery: ${rollbackError.message}`); }
    }
    throw new Error(`${error.message}${transaction ? ` Backups: ${transaction}.` : ''}${recovery.length ? ` Recovery needs review: ${recovery.join(' ')}` : ''}`);
  } finally {
    for (const file of locks.reverse()) fs.unlinkSync(file);
  }
}

function parseArgs(argv) {
  const options = {};
  const values = { '--client': 'client', '--skills-dir': 'skillsDir', '--rea-skill': 'reaSkill', '--integration': 'integration' };
  const flags = { '--dry-run': 'dryRun', '--check': 'check', '--replace': 'replace' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg in flags) options[flags[arg]] = true;
    else if (arg in values && argv[i + 1] && !argv[i + 1].startsWith('--')) options[values[arg]] = argv[++i];
    else throw new Error(`Unknown option or missing value: ${arg}`);
  }
  if (options.check && options.dryRun) throw new Error('Choose --check or --dry-run, not both.');
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('The installer requires Node.js 20 or newer.');
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(`REA-Reconstruction-Companion installer\n\nnode install.mjs --client codex|claude-code|generic --integration on|off [options]\n\n--integration on   Add/update the automatic REA co-use rule (REA required)\n--integration off  Install companion only; leave existing REA untouched\n--skills-dir PATH  Client's skills directory (required for generic)\n--rea-skill PATH   Existing REA SKILL.md or its directory\n--dry-run          Show a plan without writing files\n--check            Verify selected installation mode without writing files\n--replace          Back up and replace a differing companion installation\n\nNo network requests or npm packages. Integration is an explicit choice.\nOff does not remove a rule added earlier; see README.md to disable it.\nSee README.md for client paths, backups, and update instructions.`);
    } else {
      const result = applyInstall(planInstall(options));
      console.log(JSON.stringify(result, null, 2));
      if (result.status === 'needs-install-or-repair') process.exitCode = 1;
    }
  } catch (error) { console.error(`Installation failed: ${error.message}`); process.exitCode = 1; }
}
