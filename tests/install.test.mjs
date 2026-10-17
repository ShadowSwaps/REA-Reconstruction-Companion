import { fixtureLink } from '../scripts/test-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NAME, BEGIN, END, locations, patchRea, planInstall, applyInstall } from '../install.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rule = fs.readFileSync(path.join(root, 'integration/rea-companion.md'), 'utf8');
const legacy = fs.readFileSync(path.join(root, 'integration/legacy-rea-companion.md'), 'utf8');
const base = '---\nname: reverse-engineer-anything\ndescription: Test fixture\n---\n\n# REA\n\nKeep this introduction.\n\n## Existing workflow\n\nKeep this workflow.\n';
function fixture(t, includeRea = true) {
  // macOS exposes its temporary directory through /var, which is a symlink.
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 'rea-companion-test-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), temporaryRoot);
    assert.ok(path.basename(resolved).startsWith('rea-companion-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const skillsDir = path.join(directory, 'skills with spaces ø');
  const reaSkill = path.join(skillsDir, 'reverse-engineer-anything', 'SKILL.md');
  if (includeRea) { fs.mkdirSync(path.dirname(reaSkill), { recursive: true }); fs.writeFileSync(reaSkill, base); }
  return { directory, skillsDir, reaSkill, options: { client: 'generic', integration: 'on', skillsDir }, context: { packageRoot: root } };
}
const plan = f => planInstall(f.options, f.context);

test('fresh integrated install, backup and repeated install are correct', t => {
  const f = fixture(t);
  const result = applyInstall(plan(f));
  assert.equal(result.status, 'installed');
  assert.equal(fs.readFileSync(path.join(result.backupDirectory, 'rea-before.md'), 'utf8'), base);
  assert.ok(fs.readFileSync(f.reaSkill, 'utf8').includes(BEGIN));
  assert.ok(fs.existsSync(path.join(result.companion, 'references', 'performance.md')));
  // Installed skills omit repository-only evals. Relative guide links must
  // resolve in the actual installation, not merely in the source checkout.
  const guide = path.join(result.companion, 'references', 'checkpoints.md');
  for (const [, target] of fs.readFileSync(guide, 'utf8').matchAll(/\]\(([^\s)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(guide), target.split('#')[0])), `Broken installed checkpoint link: ${target}`);
  }
  assert.ok(!fs.existsSync(path.join(result.companion, 'agents')));
  assert.equal(applyInstall(plan(f)).status, 'already-installed');
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8').split(BEGIN).length, 2);
  assert.equal(applyInstall(planInstall({ ...f.options, check: true }, f.context)).status, 'verified');
});

test('integration off installs without REA or modifying an existing REA', t => {
  for (const includeRea of [false, true]) {
    const f = fixture(t, includeRea);
    f.options.integration = 'off';
    const result = applyInstall(plan(f));
    assert.equal(result.reaSkill, null);
    assert.equal(fs.existsSync(f.reaSkill), includeRea);
    if (includeRea) assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
    assert.ok(!fs.existsSync(path.join(result.backupDirectory, 'rea-before.md')));
  }
});

test('off leaves a previously enabled rule untouched and says so', t => {
  const f = fixture(t);
  applyInstall(plan(f));
  const before = fs.readFileSync(f.reaSkill);
  f.options.integration = 'off';
  const result = applyInstall(plan(f));
  assert.match(result.integration, /left untouched/);
  assert.deepEqual(fs.readFileSync(f.reaSkill), before);
});

test('dry run and check write nothing', t => {
  const f = fixture(t);
  assert.equal(applyInstall(planInstall({ ...f.options, dryRun: true }, f.context)).writes, 0);
  assert.equal(applyInstall(planInstall({ ...f.options, check: true }, f.context)).status, 'needs-install-or-repair');
  assert.deepEqual(fs.readdirSync(f.directory), [path.basename(f.skillsDir)]);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
});

test('missing REA and missing integration choice fail before installation', t => {
  const f = fixture(t, false);
  assert.throws(() => plan(f), /REA skill not found/);
  assert.throws(() => planInstall({ ...f.options, integration: undefined }, f.context), /Choose --integration/);
  assert.deepEqual(fs.readdirSync(f.directory), []);
});

test('a different companion needs --replace; its original files are backed up', t => {
  const f = fixture(t);
  const first = applyInstall(plan(f));
  fs.writeFileSync(path.join(first.companion, 'personal-note.txt'), 'Keep my customization.');
  assert.throws(() => applyInstall(plan(f)), /--replace/);
  f.options.replace = true;
  const upgraded = applyInstall(plan(f));
  assert.equal(fs.readFileSync(path.join(upgraded.backupDirectory, 'companion-before', 'personal-note.txt'), 'utf8'), 'Keep my customization.');
  assert.ok(!fs.existsSync(path.join(first.companion, 'personal-note.txt')));
});

test('failure after REA write rolls back both the skill and REA', t => {
  const f = fixture(t);
  const p = plan(f);
  assert.throws(() => applyInstall(p, (file, data) => { fs.writeFileSync(file, data); throw new Error('simulated write failure'); }), /simulated write failure/);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
  assert.ok(!fs.existsSync(p.destination));
});

test('failed replacement restores the previous companion', t => {
  const f = fixture(t);
  const destination = path.join(f.skillsDir, NAME);
  fs.mkdirSync(destination);
  fs.writeFileSync(path.join(destination, 'keep.txt'), 'original');
  f.options.replace = true;
  assert.throws(() => applyInstall(plan(f), () => { throw new Error('simulated permission error'); }), /simulated permission error/);
  assert.deepEqual(fs.readdirSync(destination), ['keep.txt']);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
});

test('companion rollback still runs when the REA file disappears', t => {
  const f = fixture(t);
  const destination = path.join(f.skillsDir, NAME);
  fs.mkdirSync(destination);
  fs.writeFileSync(path.join(destination, 'keep.txt'), 'original');
  f.options.replace = true;
  assert.throws(() => applyInstall(plan(f), () => {
    fs.unlinkSync(f.reaSkill);
    throw new Error('REA disappeared during commit');
  }), /REA disappeared during commit.*Recovery needs review/);
  assert.deepEqual(fs.readdirSync(destination), ['keep.txt']);
  assert.equal(fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8'), 'original');
  assert.ok(!fs.existsSync(f.reaSkill));
});

test('installation cannot replace source files inside the package', t => {
  const f = fixture(t, false);
  const copied = path.join(f.directory, 'package');
  fs.cpSync(root, copied, { recursive: true, filter: source => !['.git', 'dist', 'node_modules'].includes(path.basename(source)) });
  const sourceSkill = path.join(copied, 'skills', NAME, 'SKILL.md');
  const original = fs.readFileSync(sourceSkill);
  assert.throws(() => planInstall({ client: 'codex', integration: 'off', skillsDir: path.join(copied, 'skills'), replace: true }, { packageRoot: copied }), /package source/);
  assert.deepEqual(fs.readFileSync(sourceSkill), original);
  assert.ok(!fs.existsSync(path.join(copied, '.rea-reconstruction-companion-installer')));
});

test('case aliases cannot replace the package directory', t => {
  const f = fixture(t, false);
  const copied = path.join(f.directory, NAME.toUpperCase());
  fs.cpSync(root, copied, { recursive: true, filter: source => !['.git', 'dist', 'node_modules'].includes(path.basename(source)) });
  const alias = path.join(f.directory, NAME);
  if (!fs.existsSync(alias)) { t.skip('Filesystem distinguishes casing'); return; }
  assert.throws(() => planInstall({ client: 'generic', integration: 'off', skillsDir: f.directory, replace: true }, { packageRoot: copied }), /package source/);
  assert.ok(fs.existsSync(path.join(copied, 'install.mjs')));
});

test('REA cannot be inside the destination under another casing', t => {
  const f = fixture(t, false);
  const directory = path.join(f.skillsDir, NAME.toUpperCase());
  fs.mkdirSync(directory, { recursive: true });
  const reaSkill = path.join(directory, 'SKILL.md');
  fs.writeFileSync(reaSkill, base);
  if (!fs.existsSync(path.join(f.skillsDir, NAME))) { t.skip('Filesystem distinguishes casing'); return; }
  assert.throws(() => planInstall({ ...f.options, reaSkill, replace: true }, f.context), /REA must be separate/);
  assert.equal(fs.readFileSync(reaSkill, 'utf8'), base);
});

test('stale plans do not overwrite a concurrent edit', t => {
  const f = fixture(t);
  const p = plan(f);
  fs.appendFileSync(f.reaSkill, '\nNew work.\n');
  assert.throws(() => applyInstall(p), /changed after planning/);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base + '\nNew work.\n');
  assert.ok(!fs.existsSync(p.destination));
});

test('base identity, duplicate markers and custom unmarked rules are rejected', () => {
  assert.throws(() => patchRea(base.replace('name: reverse-engineer-anything', 'name: another-skill'), rule, legacy), /not the reverse-engineer/);
  assert.throws(() => patchRea(base + BEGIN, rule, legacy), /Malformed/);
  assert.throws(() => patchRea(base + rule + rule, rule, legacy), /Malformed/);
  assert.throws(() => patchRea(base + `\nCustom ${NAME} integration\n`, rule, legacy), /customized/);
});

test('line endings, BOM, managed updates and exact legacy migration preserve other text', () => {
  const original = '\uFEFF' + base.replace(/\n/g, '\r\n');
  const patched = patchRea(original, rule, legacy);
  assert.ok(patched.startsWith('\uFEFF'));
  assert.ok(!patched.replace(/\r\n/g, '').includes('\n'));
  assert.equal(patchRea(patched, rule, legacy), patched);
  const changedRule = rule.replace('question checklist', 'prioritized question checklist');
  assert.ok(patchRea(patched, changedRule, legacy).includes('prioritized question checklist'));
  const migrated = patchRea(base + '\n' + legacy, rule, legacy);
  assert.ok(migrated.startsWith(base));
  assert.equal(migrated.split(BEGIN).length, 2);
  assert.ok(!migrated.includes('## Reconstruction companion\n'));
});

test('client paths are explicit and duplicate REA candidates require selection', t => {
  const f = fixture(t, false);
  const context = { home: f.directory, env: {} };
  assert.equal(locations({ client: 'claude-code', integration: 'off' }, context).skillsDir, path.join(f.directory, '.claude', 'skills'));
  assert.equal(locations({ client: 'codex', integration: 'off' }, context).skillsDir, path.join(f.directory, '.agents', 'skills'));
  assert.equal(locations({ client: 'codex', integration: 'off' }, { ...context, env: { CODEX_HOME: path.join(f.directory, 'custom') } }).skillsDir, path.join(f.directory, 'custom', 'skills'));
  for (const directory of ['.agents', '.codex']) {
    const rea = path.join(f.directory, directory, 'skills', 'reverse-engineer-anything', 'SKILL.md');
    fs.mkdirSync(path.dirname(rea), { recursive: true }); fs.writeFileSync(rea, base);
  }
  assert.throws(() => locations({ client: 'codex', integration: 'on' }, context), /Multiple REA/);
});

test('claude_code alias uses the same profile, plan and receipt as claude-code', t => {
  const f = fixture(t), profile = path.join(f.directory, 'claude profile');
  const context = { ...f.context, home: f.directory, env: { CLAUDE_CONFIG_DIR: profile } };
  assert.deepEqual(locations({ client: 'claude_code', integration: 'off' }, context), locations({ client: 'claude-code', integration: 'off' }, context));
  assert.equal(locations({ client: 'claude_code', integration: 'off' }, context).skillsDir, path.join(profile, 'skills'));
  assert.equal(locations({ client: 'claude_code', integration: 'off' }, { ...context, env: {} }).skillsDir, path.join(f.directory, '.claude', 'skills'));
  const options = { ...f.options, client: 'claude_code' };
  const planned = planInstall(options, context);
  assert.equal(planned.options.client, 'claude-code');
  assert.equal(options.client, 'claude_code', 'caller options are not mutated');
  assert.deepEqual(planned.desired, planInstall({ ...options, client: 'claude-code' }, context).desired);
  assert.equal(planned.desired.has('agents/openai.yaml'), false);
  const installed = applyInstall(planned);
  assert.equal(installed.client, 'claude-code');
  assert.equal(JSON.parse(fs.readFileSync(path.join(installed.backupDirectory, 'receipt.json'))).client, 'claude-code');
  assert.equal(applyInstall(planInstall({ ...options, check: true }, context)).status, 'verified');
});

test('Codex adapter is added only for Codex', t => {
  const f = fixture(t);
  f.options.client = 'codex';
  const result = applyInstall(plan(f));
  assert.ok(fs.existsSync(path.join(result.companion, 'agents', 'openai.yaml')));
});

for (const client of ['claude-code', 'claude_code']) test(`${client} uses its configured profile and explicit skills directories take precedence`, t => {
  const f = fixture(t, false);
  const configDir = path.join(f.directory, 'claude profile ø');
  const skillsDir = path.join(configDir, 'skills');
  const reaSkill = path.join(skillsDir, 'reverse-engineer-anything', 'SKILL.md');
  fs.mkdirSync(path.dirname(reaSkill), { recursive: true });
  fs.writeFileSync(reaSkill, base);
  const context = { ...f.context, home: f.directory, env: { CLAUDE_CONFIG_DIR: configDir } };
  const options = { client, integration: 'on' };
  const result = applyInstall(planInstall(options, context));
  assert.equal(result.companion, path.join(skillsDir, NAME));
  // Windows may expose the temporary directory through an 8.3 path alias.
  assert.equal(fs.realpathSync.native(result.reaSkill), fs.realpathSync.native(reaSkill));
  assert.equal(applyInstall(planInstall({ ...options, check: true }, context)).status, 'verified');
  assert.ok(!fs.existsSync(path.join(f.directory, '.claude')));
  assert.equal(locations({ ...options, integration: 'off', skillsDir: f.skillsDir }, context).skillsDir, f.skillsDir);
});

for (const client of ['claude-code', 'claude_code']) test(`a custom ${client} profile never silently falls back to another profile for REA`, t => {
  const f = fixture(t, false);
  const defaultRea = path.join(f.directory, '.claude', 'skills', 'reverse-engineer-anything', 'SKILL.md');
  fs.mkdirSync(path.dirname(defaultRea), { recursive: true });
  fs.writeFileSync(defaultRea, base);
  const custom = path.join(f.directory, 'other-profile');
  assert.throws(() => planInstall({ client, integration: 'on' }, {
    ...f.context, home: f.directory, env: { CLAUDE_CONFIG_DIR: custom },
  }), /REA skill not found/);
  assert.equal(fs.readFileSync(defaultRea, 'utf8'), base);
  assert.ok(!fs.existsSync(custom));
});

test('casing aliases of one Codex REA file are not mistaken for separate installations', t => {
  const f = fixture(t, false);
  const configDir = path.join(f.directory, '.agents');
  const reaSkill = path.join(configDir, 'skills', 'reverse-engineer-anything', 'SKILL.md');
  fs.mkdirSync(path.dirname(reaSkill), { recursive: true });
  fs.writeFileSync(reaSkill, base);
  const alias = path.join(f.directory, '.AGENTS');
  if (!fs.existsSync(alias)) { t.skip('Filesystem distinguishes casing'); return; }
  const result = locations({ client: 'codex', integration: 'on' }, {
    home: f.directory, env: { CODEX_HOME: alias },
  });
  assert.equal(fs.realpathSync.native(result.reaSkill), fs.realpathSync.native(reaSkill));
});

test('dry run lists added, modified and removed companion files without replacing them', t => {
  const f = fixture(t, false);
  f.options.integration = 'off';
  const initial = applyInstall(plan(f));
  const skill = path.join(initial.companion, 'SKILL.md');
  fs.appendFileSync(skill, '\nLocal customization.\n');
  fs.unlinkSync(path.join(initial.companion, 'LICENSE'));
  fs.writeFileSync(path.join(initial.companion, 'personal-note.txt'), 'Keep this in the backup.');
  const before = fs.readFileSync(skill);
  const preview = applyInstall(planInstall({ ...f.options, dryRun: true }, f.context));
  assert.deepEqual(preview.companionChanges, {
    added: ['LICENSE'], modified: ['SKILL.md'], removed: ['personal-note.txt'],
  });
  assert.equal(preview.replacementFlagNeeded, true);
  assert.equal(preview.writes, 0);
  assert.deepEqual(fs.readFileSync(skill), before);
  assert.ok(!fs.existsSync(path.join(initial.companion, 'LICENSE')));
  assert.equal(fs.readFileSync(path.join(initial.companion, 'personal-note.txt'), 'utf8'), 'Keep this in the backup.');
});

test('an upstream REA update can be detected and the integration restored', t => {
  const f = fixture(t);
  applyInstall(plan(f));
  const updated = base + '\nNew upstream instructions.\n';
  fs.writeFileSync(f.reaSkill, updated);
  const check = applyInstall(planInstall({ ...f.options, check: true }, f.context));
  assert.equal(check.status, 'needs-install-or-repair');
  assert.equal(check.skillChangeNeeded, false);
  applyInstall(plan(f));
  assert.ok(fs.readFileSync(f.reaSkill, 'utf8').endsWith('New upstream instructions.\n'));
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8').split(BEGIN).length, 2);
});

test('symlinked REA paths are rejected rather than modifying their target', t => {
  const f = fixture(t);
  const alias = path.join(f.directory, 'linked-rea');
  fixtureLink(path.dirname(f.reaSkill), alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => planInstall({ ...f.options, reaSkill: path.join(alias, 'SKILL.md') }, f.context), /symbolic link or junction/);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
});

test('an existing REA installer lock prevents a second installation', t => {
  const f = fixture(t);
  const lock = path.join(path.dirname(f.reaSkill), '.rea-companion-install.lock');
  fs.writeFileSync(lock, 'another installer');
  assert.throws(() => applyInstall(plan(f)), /EEXIST/);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'another installer');
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
  assert.ok(!fs.existsSync(path.join(f.skillsDir, NAME)));
});

test('corrupt package and manifest traversal are rejected without installing', t => {
  const f = fixture(t);
  const copied = path.join(f.directory, 'package');
  fs.cpSync(root, copied, { recursive: true, filter: source => !['.git', 'dist', 'node_modules'].includes(path.basename(source)) });
  fs.appendFileSync(path.join(copied, 'skills', NAME, 'SKILL.md'), '\ncorruption');
  assert.throws(() => planInstall(f.options, { packageRoot: copied }), /checksum mismatch/);
  const manifest = JSON.parse(fs.readFileSync(path.join(copied, 'manifest.json'), 'utf8'));
  manifest.files = { '../outside': '0'.repeat(64), ...manifest.files };
  fs.writeFileSync(path.join(copied, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => planInstall(f.options, { packageRoot: copied }), /Unsafe package path/);
  assert.equal(fs.readFileSync(f.reaSkill, 'utf8'), base);
});

test('CLI install works from another working directory without npm or PyYAML', t => {
  const f = fixture(t);
  const args = [path.join(root, 'install.mjs'), '--client', 'claude-code', '--integration', 'on', '--skills-dir', f.skillsDir];
  const result = spawnSync(process.execPath, args, { cwd: f.directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'installed');
  const check = spawnSync(process.execPath, [...args, '--check'], { cwd: f.directory, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).status, 'verified');
});

test('CLI accepts claude_code for dry-run, install and check in both integration modes', t => {
  for (const integration of ['on', 'off']) {
    const f = fixture(t, integration === 'on');
    const args = [path.join(root, 'install.mjs'), '--client', 'claude_code', '--integration', integration, '--skills-dir', f.skillsDir];
    for (const [extra, expected] of [[['--dry-run'], 'dry-run'], [[], 'installed'], [['--check'], 'verified']]) {
      const result = spawnSync(process.execPath, [...args, ...extra], { cwd: f.directory, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.status, expected); assert.equal(report.client, 'claude-code');
      if (expected === 'dry-run') assert.equal(fs.existsSync(path.join(f.skillsDir, NAME)), false);
    }
  }
});
