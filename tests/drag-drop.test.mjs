import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createBoard} from '../evals/drag-drop/candidate.mjs';
import {recordingEffects} from '../evals/drag-drop/double.mjs';
import {frozen,compare} from '../evals/drag-drop/check.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/drag-drop/candidate.mjs',import.meta.url),'utf8');
test('three drag/drop families match 81 frozen intermediate identity/order/effect states', () => {
  assert.equal(new Set([...oracle.ordinary,...oracle.boundaries].map(row => row.family)).size,3);
  const rows = compare(); assert.equal(rows.length,81);
  assert.deepEqual(rows.filter(row => !row.passed),[]);
});
const faults = [
  {id:'visible-index-source',target:'filtered-anchor-canonical',step:1,
    from:'id:action.id,mode:action.mode,revision:',to:'id:views[action.owner]?.hidden.length ? lists[action.owner][1].id : action.id,mode:action.mode,revision:'},
  {id:'same-list-offset',target:'same-list-after-before',step:2,
    from:"(target.position === 'after' ? 1 : 0)",to:"(target.position === 'after' && target.dest !== captured.owner ? 1 : 0)"},
  {id:'move-end-prepends',target:'cross-list-nonempty-end',step:2,
    from:"target.position === 'end' ? destination.length",to:"target.position === 'end' ? (captured.mode === 'move' ? 0 : destination.length)"},
  {id:'same-position-consumes-history',target:'same-position-and-self',step:2,
    from:"if (isDeepStrictEqual(before,after)) { status = 'unchanged'; return; }",to:"if (isDeepStrictEqual(before,after)) { history.push({before,after}); status = 'unchanged'; return; }"},
  {id:'self-drop-removes-source',target:'same-position-and-self',step:8,
    from:"if (captured.mode === 'move' && captured.owner === target.dest && target.anchor === captured.id) { status = 'unchanged'; return; }",to:"if (captured.mode === 'move' && captured.owner === target.dest && target.anchor === captured.id) { lists[captured.owner] = lists[captured.owner].filter(item => item.id !== captured.id); status = 'unchanged'; return; }"},
  {id:'sorted-view-reorder-accepted',target:'sorted-reject-reorder-allow-transfer',step:2,
    from:'!(dest === drag.owner && views[dest]?.sorted)',to:'true'},
  {id:'filter-rewrites-canonical',target:'filtered-anchor-canonical',step:0,
    from:'views[action.owner] = {hidden:[...action.hidden],sorted:action.sorted}; break;',to:'lists[action.owner] = lists[action.owner].filter(item => !action.hidden.includes(item.id)); views[action.owner] = {hidden:[...action.hidden],sorted:action.sorted}; break;'},
  {id:'stale-source-unchecked',target:'stale-source',step:3,
    from:'revisions[captured.owner] !== captured.revision || revisions[target.dest] !== target.revision',to:'revisions[target.dest] !== target.revision'},
  {id:'stale-destination-unchecked',target:'stale-destination',step:3,
    from:'revisions[captured.owner] !== captured.revision || revisions[target.dest] !== target.revision',to:'revisions[captured.owner] !== captured.revision'},
  {id:'cancel-commits',target:'cancel-and-repeat',step:2,
    from:"case 'cancel': drag = null;",to:"case 'cancel': drop(); drag = null;"},
  {id:'repeated-begin-rebinds',target:'cancel-and-repeat',step:5,
    from:'if (drag) return;',to:'/* allow rebind */'},
  {id:'known-failure-still-applies',target:'known-failure-then-fresh-retry',step:3,
    from:"if (!recorder.commit({kind:captured.mode,lists:after})) { status = 'failed'; return; }",to:"if (!recorder.commit({kind:captured.mode,lists:after})) { status = 'failed'; }"},
  {id:'undo-overwrites-later-edit',target:'undo-conflict',step:4,
    from:"if (!isDeepStrictEqual(lists,entry.after))",to:'if (false)'},
  {id:'explicit-move-uses-label-peer',target:'explicit-move-same-contract',step:0,
    from:"case 'move': if (!drag) {begin(action);",to:"case 'move': if (!drag) {begin({...action,id:'a'});"},
];
for (const fault of faults) test('ordinary controls pass before named mismatch: '+fault.id,async t => {
  assert.equal(source.split(fault.from).length,2,'one mutation site');
  const parent = fs.realpathSync.native(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent,'rea-drag-drop-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)),parent);
    assert.ok(path.basename(directory).startsWith('rea-drag-drop-'));
    assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);
    fs.rmSync(directory,{recursive:true,force:true});
  });
  const file = path.join(directory,'mutant.mjs'); fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const mutant = await import(pathToFileURL(file));
  const controls = compare(mutant.createBoard,oracle.ordinary);
  assert.equal(controls.length,8); assert.ok(controls.every(row => row.passed),'ordinary move/copy/undo');
  const scenario = oracle.boundaries.find(row => row.id === fault.target);
  const rows = compare(mutant.createBoard,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'earlier checkpoints match');
  assert.equal(rows.at(-1).step,fault.step); assert.equal(rows.at(-1).passed,false,'state/effect mismatch, not exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:8,distinguishing:rows.at(-1)}));
});
test('all snapshot fields and independent attempts/effects participate in comparison', () => {
  for (const field of ['lists','views','drag','preview','status','history']) {
    const rows = compare((initial,recorder) => {
      const board = createBoard(initial,recorder);
      return {...board,dispatch:action => ({...board.dispatch(action),[field]:'incorrect'})};
    });
    assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare((initial,recorder) => {
    const board = createBoard(initial,recorder);
    return {...board,dispatch(action) {const result = board.dispatch(action); recorder.commit({kind:'unexpected',lists:initial}); return result;}};
  },[{...oracle.ordinary[0],steps:oracle.ordinary[0].steps.slice(0,1)}]);
  assert.deepEqual(rows[0].actual,rows[0].expected); assert.equal(rows[0].passed,false);
});
test('snapshots/effect records detached, repeated drop has exactly one effect, malformed fixtures propagate', () => {
  const initial = structuredClone(oracle.initial), recorder = recordingEffects(), board = createBoard(initial,recorder);
  initial.left[0].label = 'Changed';
  board.dispatch({type:'begin',owner:'left',id:'b',mode:'move'});
  board.dispatch({type:'preview',dest:'right',position:'before',anchor:'x'});
  const result = board.dispatch({type:'drop'}); result.lists.right[0].id = 'Changed';
  const saved = recorder.inspect(); saved.effects[0].lists.right[0].id = 'Changed';
  assert.deepEqual(board.dispatch({type:'drop'}),oracle.ordinary[0].steps[2].expected);
  assert.deepEqual(recorder.inspect().effects,oracle.ordinary[0].steps[2].effects);
  for (const action of [null,{type:'unknown'},{type:'external',owner:'missing',remove:'a'}]) assert.throws(() => board.dispatch(action));
  assert.throws(() => createBoard({left:[{id:'a',label:'A'},{id:'a',label:'B'}]},recorder),/Invalid fixture/);
  assert.throws(() => compare(() => {throw Error('factory broken');}),/factory broken/);
});

test('copy insertion preserves source/value and skips existing copy identities', () => {
  const initial = structuredClone(oracle.initial);
  initial.empty.push({id:'copy-1',label:'Existing'});
  const recorder = recordingEffects(), board = createBoard(initial,recorder);
  const result = board.dispatch({type:'move',owner:'left',id:'b',mode:'copy',dest:'right',position:'after',anchor:'x'});
  assert.deepEqual(result.lists.left,initial.left);
  assert.deepEqual(result.lists.right,[{id:'x',label:'X'},{id:'copy-2',label:'Same'}]);
  assert.deepEqual(result.lists.empty,initial.empty);
  assert.equal(recorder.inspect().effects.length,1);
  assert.deepEqual(board.dispatch({type:'undo'}).lists,initial);
});

test('explicit controls refuse sorted reorder and failed undo retains data/history for retry', () => {
  const recorder = recordingEffects(), board = createBoard(oracle.initial,recorder);
  board.dispatch({type:'view',owner:'left',hidden:[],sorted:true});
  const rejected = board.dispatch({type:'move',owner:'left',id:'b',mode:'move',dest:'left',position:'before',anchor:'c'});
  assert.equal(rejected.status,'rejected'); assert.equal(rejected.history,0);
  assert.deepEqual(recorder.inspect(),{attempts:[],effects:[]});
  const moved = board.dispatch({type:'move',owner:'left',id:'b',mode:'move',dest:'right',position:'end',anchor:null});
  recorder.failNext(); const failed = board.dispatch({type:'undo'});
  assert.equal(failed.status,'failed'); assert.equal(failed.history,1); assert.deepEqual(failed.lists,moved.lists);
  assert.deepEqual(board.dispatch({type:'undo'}).lists,oracle.initial);
  assert.equal(recorder.inspect().attempts.length,3); assert.equal(recorder.inspect().effects.length,2);
});
