// Repository test tooling only. Never imported by installed skill commands.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function errorDetails(error) {
  // Error messages/stacks can contain private absolute fixture paths.
  return Object.fromEntries(['code', 'errno', 'syscall'].filter(k =>
    typeof error?.[k] === 'string' || typeof error?.[k] === 'number').map(k => [k, error[k]]));
}
export function observation(error, stage, kind) {
  return { stage, kind, result: error ? (['EACCES', 'EPERM'].includes(error.code) ? 'denied' : 'unknown') : 'supported',
    ...(error ? { error: errorDetails(error) } : {}) };
}
export const emit = record => process.stderr.write(JSON.stringify({ schema: 1, ...record }) + '\n');

export function fixtureLink(target, link, kind) {
  try { return fs.symlinkSync(target, link, kind); }
  catch (error) {
    try { emit({ event: 'fixture-setup', ...observation(error, 'create-link', kind) }); }
    finally { throw error; } // Diagnostics cannot replace the original failure.
  }
}

export function preflight({ io = fs, temporary = os.tmpdir(), platform = process.platform } = {}) {
  const kind = platform === 'win32' ? 'junction' : 'dir';
  const records = [];
  let parent, owned, stage = 'resolve-parent';
  try {
    parent = io.realpathSync(temporary);
    stage = 'create-owned-directory';
    owned = io.mkdtempSync(path.join(parent, 'rea-test-preflight-'));
    if (path.dirname(owned) !== parent || !path.basename(owned).startsWith('rea-test-preflight-')) throw new Error('Invalid owned path');
    stage = 'create-target';
    io.mkdirSync(path.join(owned, 'target'));
    stage = 'create-link';
    io.symlinkSync(path.join(owned, 'target'), path.join(owned, 'link'), kind);
    stage = 'inspect-link';
    if (!io.lstatSync(path.join(owned, 'link')).isSymbolicLink()) throw new Error('Expected link');
    records.push(observation(null, stage, kind));
  } catch (error) { records.push(observation(error, stage, kind)); }
  if (owned && parent && path.dirname(owned) === parent && path.basename(owned).startsWith('rea-test-preflight-')) {
    // Only fixed, directly owned entries. Never recurse through a link or delete
    // unexpected contents. Preserve cleanup errors separately from probe errors.
    for (const [name, directory] of [['link', false], ['target', true], ['', true]]) {
      const entry = name ? path.join(owned, name) : owned;
      try {
        const owner = io.lstatSync(owned);
        if (owner.isSymbolicLink() || !owner.isDirectory()) throw new Error('Owned directory changed');
        const stat = io.lstatSync(entry);
        if (stat.isSymbolicLink()) io.unlinkSync(entry);
        else if (directory && stat.isDirectory()) io.rmdirSync(entry);
        else throw new Error('Unexpected owned entry type');
      } catch (error) {
        if (error.code !== 'ENOENT') records.push(observation(error, `cleanup-${name || 'owned-directory'}`, kind));
      }
    }
  }
  return { event: 'preflight', fixtureParent: 'resolved-os-tmpdir', records,
    complete: records.length === 1 && records[0].result === 'supported' };
}

export function summarize(probe, child, counts) {
  const executed = child !== null;
  const known = counts && ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].every(k => Number.isSafeInteger(counts[k]) && counts[k] >= 0);
  const complete = executed && !child.error && !child.signal && child.code === 0 && known && counts.tests > 0
    && counts.fail === 0 && counts.cancelled === 0 && counts.todo === 0 && counts.pass + counts.skipped === counts.tests;
  const passed = probe?.complete === true && complete;
  // Never replace a child's original failing exit with a diagnostics status.
  const failed = !child?.error && !child?.signal && Number.isInteger(child?.code) && child.code > 0;
  const exit = failed ? child.code : passed ? 0 : 2;
  return { event: 'validation', execution: !executed ? 'unrun' : child.error ? 'unavailable' : child.signal || !known ? 'unknown' : 'completed',
    child: child && { code: child.code, signal: child.signal, ...(child.error ? { error: errorDetails(child.error) } : {}) },
    counts: known ? counts : null, gate: passed ? 'passed' : failed ? 'failed' : 'incomplete', exit };
}
