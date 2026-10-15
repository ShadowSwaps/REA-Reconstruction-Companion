// MIT. A separately written Pocket Tasks reconstruction; Node standard library only.
// Maintainer-informed teaching example: prior source and reviewer exposure is disclosed.
import fs from 'node:fs';
import path from 'node:path';

const clone = value => structuredClone(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value, keys) => record(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const title = value => typeof value === 'string' && value.length <= 80 && value.trim() !== '';

function validateDocument(document) {
  if (!fields(document, ['schema', 'items', 'nextId']) || document.schema !== 1
    || !Number.isSafeInteger(document.nextId) || document.nextId < 1 || document.nextId > 1000000
    || !Array.isArray(document.items) || document.items.length > 32) throw new Error('Invalid task store.');
  const used = new Set();
  for (const row of document.items) {
    if (!fields(row, ['title', 'done', 'id']) || !title(row.title) || typeof row.done !== 'boolean'
      || typeof row.id !== 'string' || !/^t[1-9][0-9]*$/.test(row.id)
      || Number(row.id.substring(1)) >= document.nextId || used.has(row.id)) throw new Error('Invalid task row.');
    used.add(row.id);
  }
  return document;
}

class DiskStore {
  constructor(file) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('Use an absolute store path.');
    this.file = path.resolve(file);
    this.checkPath();
  }

  checkPath() {
    let cursor = this.file;
    while (true) {
      try {
        if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Linked store paths are unsupported.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    if (!fs.statSync(path.dirname(this.file)).isDirectory()) throw new Error('Missing store parent.');
  }

  read() {
    let metadata;
    try { metadata = fs.lstatSync(this.file); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { schema: 1, nextId: 4, items: [
        ['Alpha', false], ['Beta', false], ['Gamma', true],
      ].map(([text, done], index) => ({ id: `t${index + 1}`, title: text, done })) };
    }
    if (!metadata.isFile() || metadata.size > 65536) throw new Error('Unsupported store file.');
    return validateDocument(JSON.parse(fs.readFileSync(this.file, 'utf8')));
  }

  write(document) {
    const pending = this.file + '.pending';
    let owned = false;
    try {
      this.checkPath();
      const descriptor = fs.openSync(pending, 'wx', 0o600);
      owned = true;
      try { fs.writeFileSync(descriptor, JSON.stringify(document) + '\n'); }
      finally { fs.closeSync(descriptor); }
      fs.renameSync(pending, this.file);
      owned = false;
    } finally {
      // A failed exclusive open never gives us ownership of someone else's file.
      if (owned) fs.unlinkSync(pending);
    }
  }
}

class TaskSession {
  constructor(store) {
    this.store = store;
    this.saved = store.read();
    this.draft = clone(this.saved);
    this.filter = 'all';
    this.row = null;
    this.actions = new Map([
      ['view', () => null],
      ['filter', command => {
        if (!['all', 'open', 'done'].includes(command.value)) return 'invalid-filter';
        this.filter = command.value;
      }],
      ['select', command => {
        if (!Number.isInteger(command.index) || command.index < 0 || command.index >= this.visible().length) return 'invalid-selection';
        this.row = command.index;
      }],
      ['add', command => {
        if (!title(command.title)) return 'invalid-title';
        if (this.draft.items.length >= 32 || this.draft.nextId >= 1000000) return 'capacity';
        const id = `t${this.draft.nextId}`;
        this.draft.nextId += 1;
        this.draft.items.push({ id, title: command.title, done: false });
      }],
      ['rename', command => {
        if (!title(command.title)) return 'invalid-title';
        const selected = this.selected();
        if (!selected) return 'no-selection';
        selected.title = command.title;
      }],
      ['toggle', () => {
        const selected = this.selected();
        if (!selected) return 'no-selection';
        selected.done = !selected.done;
      }],
      ['remove', () => {
        const selected = this.selected();
        if (!selected) return 'no-selection';
        this.draft.items.splice(this.draft.items.indexOf(selected), 1);
      }],
      ['cancel', () => { this.draft = clone(this.saved); }],
      ['save', () => {
        try { this.store.write(this.draft); }
        catch { return 'save-failed'; }
        this.saved = clone(this.draft);
      }],
    ]);
  }

  visible() {
    return this.draft.items.filter(row => this.filter === 'all'
      || (this.filter === 'done' ? row.done : !row.done));
  }

  selected() {
    // Compatibility choice: retain a visible row position, even across filtering.
    return this.row === null ? undefined : this.visible()[this.row];
  }

  execute(command) {
    let error;
    if (!record(command) || typeof command.op !== 'string') error = 'invalid-command';
    else {
      const action = this.actions.get(command.op);
      error = action ? action(command) : 'unknown-op';
    }
    const view = {
      items: clone(this.visible()), selected: this.selected()?.id ?? null, filter: this.filter,
      dirty: JSON.stringify(this.saved) !== JSON.stringify(this.draft),
    };
    return error ? { ok: false, error, view } : { ok: true, view };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--version') {
    console.log('Pocket Tasks reconstruction example (schema 1)'); return;
  }
  if (args.length === 1 && args[0] === '--help') {
    console.log('node candidate.mjs --store ABSOLUTE_DISPOSABLE_FILE\nSend one JSON command array to stdin, then EOF. Saving is explicit.'); return;
  }
  if (args.length !== 2 || args[0] !== '--store') throw new Error('Expected --store ABSOLUTE_FILE.');
  const store = new DiskStore(args[1]);
  const input = [];
  let length = 0;
  for await (const bytes of process.stdin) {
    length += bytes.length;
    if (length > 65536) throw new Error('Input too large.');
    input.push(bytes);
  }
  const commands = JSON.parse(Buffer.concat(input).toString('utf8'));
  if (!Array.isArray(commands) || commands.length > 64) throw new Error('Expected at most 64 commands.');
  const session = new TaskSession(store);
  console.log(JSON.stringify(commands.map(command => session.execute(command))));
}

main().catch(() => {
  console.error('Pocket Tasks reconstruction could not complete the request. See --help.');
  process.exitCode = 2;
});
