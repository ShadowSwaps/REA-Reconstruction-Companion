// Pocket Tasks 1.0.0 -- MIT-licensed local reference application.
// No network, dependencies, clock, randomness or automatic background work.
import fs from 'node:fs';
import path from 'node:path';

const seed = () => ({ schema: 1, nextId: 4, items: [
  { id: 't1', title: 'Alpha', done: false },
  { id: 't2', title: 'Beta', done: false },
  { id: 't3', title: 'Gamma', done: true },
] });
const copy = value => JSON.parse(JSON.stringify(value));
const titleValid = value => typeof value === 'string' && value.length <= 80 && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, names) => object(value) && Object.keys(value).sort().join(',') === names.sort().join(',');

function validStore(value) {
  if (!exact(value, ['schema', 'nextId', 'items']) || value.schema !== 1 || !Number.isSafeInteger(value.nextId)
      || value.nextId < 1 || value.nextId > 1000000 || !Array.isArray(value.items) || value.items.length > 32) return false;
  const ids = new Set();
  for (const item of value.items) {
    if (!exact(item, ['id', 'title', 'done']) || typeof item.id !== 'string' || !/^t[1-9][0-9]*$/.test(item.id)
        || Number(item.id.slice(1)) >= value.nextId || !titleValid(item.title) || typeof item.done !== 'boolean' || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}

function storePath(file) {
  if (!file || !path.isAbsolute(file)) throw new Error('Store path must be absolute.');
  const absolute = path.resolve(file);
  for (let current = absolute; ; current = path.dirname(current)) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked store paths are unsupported.');
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (path.dirname(current) === current) break;
  }
  if (!fs.statSync(path.dirname(absolute)).isDirectory()) throw new Error('Store parent must exist.');
  return absolute;
}

function load(file) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return seed(); throw e; }
  if (!stat.isFile() || stat.size > 65536) throw new Error('Invalid store.');
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('Invalid store.'); }
  if (!validStore(value)) throw new Error('Invalid store.');
  return value;
}

function session(commands, file) {
  let saved = load(file), draft = copy(saved), filter = 'all', selectedIndex = null;
  const visible = () => draft.items.filter(item => filter === 'all' || item.done === (filter === 'done'));
  const selected = () => visible()[selectedIndex] ?? null;
  const snapshot = () => ({ items: copy(visible()), selected: selected()?.id ?? null, filter,
    dirty: JSON.stringify(draft) !== JSON.stringify(saved) });
  const output = [];
  for (const command of commands) {
    let error = null;
    if (!object(command) || typeof command.op !== 'string') error = 'invalid-command';
    else switch (command.op) {
      case 'view': break;
      case 'filter':
        if (!['all', 'open', 'done'].includes(command.value)) error = 'invalid-filter';
        else filter = command.value;
        break;
      case 'select':
        if (!Number.isInteger(command.index) || command.index < 0 || command.index >= visible().length) error = 'invalid-selection';
        else selectedIndex = command.index;
        break;
      case 'add':
        if (!titleValid(command.title)) error = 'invalid-title';
        else if (draft.items.length === 32 || draft.nextId === 1000000) error = 'capacity';
        else draft.items.push({ id: `t${draft.nextId++}`, title: command.title, done: false });
        break;
      case 'rename':
        if (!titleValid(command.title)) error = 'invalid-title';
        else if (!selected()) error = 'no-selection';
        else selected().title = command.title;
        break;
      case 'toggle':
        if (!selected()) error = 'no-selection';
        else selected().done = !selected().done;
        break;
      case 'remove': {
        const item = selected();
        if (!item) error = 'no-selection';
        else draft.items = draft.items.filter(row => row.id !== item.id);
        break;
      }
      case 'cancel': draft = copy(saved); break;
      case 'save': {
        // One explicitly chosen disposable store. No autosave or concurrent writers.
        const temporary = `${file}.pending`;
        let owned = false;
        try {
          storePath(file);
          const fd = fs.openSync(temporary, 'wx', 0o600); owned = true;
          try { fs.writeFileSync(fd, JSON.stringify(draft) + '\n'); } finally { fs.closeSync(fd); }
          fs.renameSync(temporary, file);
          owned = false; saved = copy(draft);
        } catch { error = 'save-failed'; }
        finally { if (owned) fs.unlinkSync(temporary); }
        break;
      }
      default: error = 'unknown-op';
    }
    output.push(error ? { ok: false, error, view: snapshot() } : { ok: true, view: snapshot() });
  }
  return output;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--version') { console.log('Pocket Tasks 1.0.0'); return; }
  if (args.length === 1 && args[0] === '--help') {
    console.log('node pocket-tasks.mjs --store ABSOLUTE_DISPOSABLE_FILE\nInput: one JSON array of commands on stdin, followed by EOF. Output: one JSON array.\nCommands: view, add(title), select(index), rename(title), toggle, remove, filter(value), save, cancel.\nFilters: all, open, done. No automatic save. Store parent must exist.'); return;
  }
  if (args.length !== 2 || args[0] !== '--store') throw new Error('Usage: pocket-tasks.mjs --store ABSOLUTE_DISPOSABLE_FILE');
  const file = storePath(args[1]);
  const chunks = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 65536) throw new Error('Input exceeds 65536 bytes.');
    chunks.push(chunk);
  }
  let commands;
  try { commands = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Invalid input JSON.'); }
  if (!Array.isArray(commands) || commands.length > 64) throw new Error('Expected an array of at most 64 commands.');
  console.log(JSON.stringify(session(commands, file)));
}

main().catch(() => { console.error('Pocket Tasks could not complete this request. See --help.'); process.exitCode = 2; });
