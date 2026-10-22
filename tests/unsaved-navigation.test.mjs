import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {frozen, compare} from '../evals/unsaved-navigation/check.mjs';
import {createEditor} from '../evals/unsaved-navigation/candidate.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/unsaved-navigation/candidate.mjs', import.meta.url), 'utf8');

function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'rea-unsaved-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), parent);
    assert.ok(path.basename(dir).startsWith('rea-unsaved-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    fs.rmSync(dir, {recursive:true, force:true});
  });
  return dir;
}
test('literal draft, canonical, owner, revision, feedback and intent states match', async () => {
  const scenarios = [...oracle.ordinary, ...oracle.boundaries];
  assert.equal(scenarios.length, 16);
  assert.equal(new Set(scenarios.map(row => row.id)).size, 16);
  const rows = await compare();
  assert.equal(rows.length, 72);
  assert.deepEqual(rows.filter(row => !row.passed), []);
});
const mutations = [
  {id:'certify-newer-revision', target:'edit-during-save', step:3,
    from:'revision:capture.revision};', to:'revision};'},
  {id:'save-live-draft', target:'edit-during-save', step:3,
    from:'text:capture.text, revision:capture.revision', to:'text:draft, revision'},
  {id:'ignore-old-owner-success', target:'stale-owner-success', step:3,
    from:'if (capture.owner !== owner || capture.doc !== doc || pending?.op !== capture.op) return;',
    to:'// incorrectly accept stale completion'},
  {id:'old-error-clears-new-save', target:'same-document-new-owner-old-error', step:5,
    from:'if (capture.owner !== owner || capture.doc !== doc || pending?.op !== capture.op) return;',
    to:'if (capture.doc !== doc) return;'},
  {id:'failed-save-loses-draft', target:'failure-retains-retry', step:6,
    from:"if (!ok) { feedback = 'failed'; return; }",
    to:"if (!ok) { draft = saved[doc].text; revision = saved[doc].revision; feedback = 'failed'; return; }"},
  {id:'failed-save-navigates', target:'failure-retains-retry', step:6,
    from:"if (!ok) { feedback = 'failed'; return; }",
    to:"if (!ok) { if (intent !== null) open(intent); feedback = 'failed'; return; }"},
  {id:'save-uses-old-destination', target:'replace-repeat-intent', step:5,
    from:'let release;', to:'const departure = intent; let release;',
    second:['open(intent);\n    });', 'open(departure);\n    });']},
  {id:'cancel-leaves-navigation-pending', target:'cancel-pending-navigation', step:3,
    from:"if (action.choice === 'cancel') { intent = null; break; }",
    to:"if (action.choice === 'cancel') { if (!pending) intent = null; break; }"},
  {id:'discard-commits-draft', target:'discard-navigation', step:2,
    from:'open(intent);\n        } else', to:'saved[doc] = {text:draft, revision}; open(intent);\n        } else'},
  {id:'repeat-starts-second-save', target:'repeat-save-and-choice', step:3,
    from:'if (pending || !dirty()) return;', to:'if (!dirty()) return;'},
  {id:'save-navigates-with-newer-edits', target:'new-edit-blocks-navigation', step:4,
    from:'if (!dirty() && intent !== null) open(intent);', to:'if (intent !== null) open(intent);'},
  {id:'close-opens-wrong-document', target:'close-save', step:3,
    from:"doc = target === 'closed' ? null : target;", to:"doc = target === 'closed' ? 'b' : target;"},
];
for (const mutation of mutations) test('ordinary controls precede state rejection: ' + mutation.id, async t => {
  let changed = source;
  for (const [from, to] of [[mutation.from, mutation.to], ...(mutation.second ? [mutation.second] : [])]) {
    assert.equal(changed.split(from).length, 2, 'exactly one mutation site');
    changed = changed.replace(from, to);
  }
  const file = path.join(temporary(t), 'candidate.mjs');
  fs.writeFileSync(file, changed);
  const api = await import(pathToFileURL(file));
  // All faults pass the same four ordinary checkpoints: edit/save and clean switch.
  const controls = await compare(api.createEditor, oracle.ordinary.slice(0, 2));
  assert.equal(controls.length, 4);
  assert.ok(controls.every(row => row.passed), 'all ordinary controls pass');
  const scenario = oracle.boundaries.find(row => row.id === mutation.target);
  const rows = await compare(api.createEditor, [{...scenario, steps:scenario.steps.slice(0, mutation.step + 1)}]);
  assert.ok(rows.slice(0, -1).every(row => row.passed), 'earlier states still match');
  const target = rows.at(-1);
  assert.equal(target.step, mutation.step);
  assert.equal(target.passed, false, 'specific actual-state mismatch, never an exception');
  t.diagnostic(JSON.stringify({mutation:mutation.id,ordinaryPassed:controls.length,distinguishing:target}));
});
test('snapshots and initial input cannot rewrite canonical or pending state', async () => {
  const input = structuredClone(oracle.initial), editor = createEditor(input);
  input.saved.a.text = 'corrupt';
  await editor.dispatch({type:'edit',text:'a1'});
  const view = await editor.dispatch({type:'save'});
  view.pending.text = 'corrupt'; view.saved.a.text = 'corrupt';
  assert.deepEqual(await editor.dispatch({type:'complete',op:1,ok:true}), oracle.ordinary[0].steps[2].expected);
});
test('checker detects each consequential state field and propagates infrastructure errors', async () => {
  await assert.rejects(compare(() => {throw Error('load failed');}), /load failed/);
  await assert.rejects(compare(() => ({dispatch:async () => {throw Error('scheduler failed');}})), /scheduler failed/);
  for (const field of ['draft','saved','doc','owner','revision','dirty','feedback','intent','pending']) {
    const rows = await compare((...args) => {
      const editor = createEditor(...args);
      return {async dispatch(action) { const state = await editor.dispatch(action); state[field] = 'incorrect'; return state; }};
    });
    assert.ok(rows.some(row => !row.passed), field);
  }
});
test('invalid scheduler/target actions reject rather than fabricate successful navigation', async () => {
  const editor = createEditor(oracle.initial);
  await assert.rejects(editor.dispatch({type:'complete',op:1,ok:true}), /controlled completion/);
  await assert.rejects(editor.dispatch({type:'leave',target:'missing'}), /Unknown target/);
  assert.deepEqual(editor.snapshot(), oracle.initial);
});
