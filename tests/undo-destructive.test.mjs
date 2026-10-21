import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {frozen, compare} from '../evals/undo-destructive/check.mjs';
import {createEditor} from '../evals/undo-destructive/candidate.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/undo-destructive/candidate.mjs', import.meta.url), 'utf8');
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-history-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-history-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, {recursive:true, force:true});
  });
  return dir;
}
test('literal intermediate states cover the declared history and deletion profile', () => {
  const cases = [...oracle.ordinary, ...oracle.boundaries];
  assert.equal(cases.length, 14);
  assert.equal(new Set(cases.map(row => row.id)).size, 14);
  const rows = compare();
  assert.equal(rows.length, 58);
  assert.deepEqual(rows.filter(row => !row.passed), []);
});
const mutations = [
  {id:'retain-redo-after-new-edit', target:'branch-invalidates-redo', step:3,
    from:'redo = [];\n  }', to:'// incorrectly retain redo\n  }'},
  {id:'split-batch-history', target:'group-one-history-entry', step:1,
    from:"commit(next, 'edit'); outcome = 'applied'; break;",
    to:"if (action.type === 'batch') { for (const edit of action.edits) commit(edited([edit]), 'edit'); } else commit(next, 'edit'); outcome = 'applied'; break;"},
  {id:'append-restored-row', target:'delete-restores-middle-identity-view', step:2,
    from:'document = structuredClone(entry.before);',
    to:"document = structuredClone(entry.before); if (entry.kind === 'delete') { const retained = new Set(entry.after.rows.map(row => row.id)); document.rows.sort((a,b) => Number(!retained.has(a.id)) - Number(!retained.has(b.id))); }"},
  {id:'retain-post-delete-selection', target:'delete-restores-middle-identity-view', step:2,
    from:'document = structuredClone(entry.before);',
    to:"{ const selected = document.selected; document = structuredClone(entry.before); document.selected = selected; }"},
  {id:'noop-clears-redo', target:'noop-preserves-redo', step:3,
    from:'if (JSON.stringify(next.rows) === JSON.stringify(document.rows)) break;',
    to:'if (JSON.stringify(next.rows) === JSON.stringify(document.rows)) { redo = []; break; }'},
  {id:'failure-clears-redo', target:'failed-edit-preserves-redo', step:3,
    from:"if (action.fail) { outcome = 'failed'; break; }",
    to:"if (action.fail) { redo = []; outcome = 'failed'; break; }"},
  {id:'cancel-commits-delete', target:'cancel-preserves-data-history', step:2,
    from:"if (pending) { pending = null; outcome = 'cancelled'; }",
    to:"if (pending) { commit(removed(pending.id), 'delete'); pending = null; outcome = 'cancelled'; }"},
  {id:'confirm-current-selection', target:'confirm-bound-to-requested-id', step:2,
    from:'const next = removed(request.id);', to:'const next = removed(document.selected);'},
  {id:'purge-enters-undo-history', target:'permanent-barrier-and-repeat', step:5,
    from:'document = next; undo = []; redo = [];', to:"commit(next, 'delete');"},
  {id:'repeat-permanent-effect', target:'permanent-barrier-and-repeat', step:7,
    from:'if (!pending) break;', to:'if (!pending) { if (effects.length) effects.push(effects.at(-1)); break; }'}
];
for (const mutation of mutations) test('ordinary checks pass before state rejects ' + mutation.id, async t => {
  assert.equal(source.split(mutation.from).length, 2, 'exactly one mutation site');
  const file = path.join(temporary(t), 'candidate.mjs');
  fs.writeFileSync(file, source.replace(mutation.from, mutation.to));
  const api = await import(pathToFileURL(file));
  // Common ordinary controls: edit/undo/redo, single-edit group, and confirming
  // deletion of the still-selected ID. Retain the full oracle unchanged.
  const matchingDelete = oracle.boundaries.find(row => row.id === 'delete-restores-middle-identity-view');
  const ordinaryCases = [...oracle.ordinary.filter(row => row.id !== 'ordinary-end-delete'),
    {...matchingDelete, steps:matchingDelete.steps.slice(0, 2)}];
  const ordinary = compare(api.createEditor, ordinaryCases);
  assert.equal(ordinary.length, 6);
  assert.ok(ordinary.every(row => row.passed), 'all ordinary checks must pass');
  // Stop at the intended assertion: later actions may be outside the valid
  // profile after the deliberate state corruption. Never count that exception.
  const scenario = oracle.boundaries.find(row => row.id === mutation.target);
  const rows = compare(api.createEditor, [{...scenario, steps:scenario.steps.slice(0, mutation.step + 1)}]);
  const target = rows.find(row => row.id === mutation.target && row.step === mutation.step);
  assert.ok(target, 'target assertion exists');
  assert.equal(target.passed, false, 'intended value/state mismatch, not an exception');
  t.diagnostic(JSON.stringify({mutation:mutation.id, ordinaryPassed:ordinary.length, distinguishing:target}));
});
test('caller data and returned snapshots cannot rewrite saved identity or history', () => {
  const initial = structuredClone(oracle.initial);
  const editor = createEditor(initial);
  initial.rows[1].id = 'replaced';
  editor.dispatch({type:'request',kind:'delete',id:'b'});
  const result = editor.dispatch({type:'confirm'});
  result.state.rows[0].text = 'corrupt';
  editor.dispatch({type:'undo'});
  assert.deepEqual(editor.snapshot(), {...oracle.initial,redo:1});
});
test('checker rejects value, identity, order, view, pending and effect differences; exceptions propagate', () => {
  assert.throws(() => compare(() => {throw Error('load failed');}), /load failed/);
  const changes = [s => {s.rows[0].text = 'wrong';}, s => {s.rows[0].id = 'wrong';},
    s => s.rows.reverse(), s => {s.selected = 'wrong';}, s => {s.anchor = 'wrong';},
    s => {s.pending = {id:'wrong',kind:'purge'};}, s => s.effects.push('wrong')];
  for (const change of changes) {
    const rows = compare((...args) => {
      const editor = createEditor(...args);
      return {dispatch(action) { const result = editor.dispatch(action); change(result.state); return result; }};
    });
    assert.ok(rows.some(row => !row.passed));
  }
});
