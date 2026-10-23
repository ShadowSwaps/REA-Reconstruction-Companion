import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRouter} from '../evals/keyboard-commands/candidate.mjs';
import {recordingEffects} from '../evals/keyboard-commands/double.mjs';
import {frozen,compare} from '../evals/keyboard-commands/check.mjs';
const oracle = frozen(), controls = oracle.cases.filter(row => row.ordinary);
const source = fs.readFileSync(new URL('../evals/keyboard-commands/candidate.mjs',import.meta.url),'utf8');
const double = fs.readFileSync(new URL('../evals/keyboard-commands/double.mjs',import.meta.url),'utf8');
test('three command families match 72 frozen full states and independent effect records', () => {
  assert.equal(new Set(oracle.cases.map(row => row.family)).size,3);
  const rows = compare();assert.equal(rows.length,72);assert.deepEqual(rows.filter(row => !row.passed),[]);
});
const faults = [
  {id:'editable-delete',scenario:'editable-delete',step:0,from:"context.focus === 'list'",to:"context.focus !== 'none'"},
  {id:'composition-routes-command',scenario:'composition-save',step:0,from:'if (action.composing)',to:'if (false)'},
  {id:'physical-instead-of-logical',scenario:'wrong-logical-key',step:0,from:"action.key.toLowerCase() === 's'",to:"action.code === 'KeyS'"},
  {id:'universal-meta-alias',scenario:'meta-is-not-control-profile',step:0,from:"if (!action.meta && !action.alt",to:"if (!action.alt",extra:["if (action.ctrl &&","if ((action.ctrl || action.meta) &&"]},
  {id:'extra-modifier-ignored',scenario:'extra-shift',step:0,from:' && !action.shift',to:''},
  {id:'claimed-event-reroutes',scenario:'claimed-event',step:0,from:'else if (action.defaultPrevented)',to:'else if (false)'},
  {id:'disabled-command-is-only-visual',scenario:'disabled-menu',step:0,from:' && context.saveEnabled',to:''},
  {id:'background-enter-confirms',scenario:'background-enter',step:0,from:"action.key === 'Enter' && context.dialog",to:"action.key === 'Enter'",extra:["return context.dialog && context.focus === 'confirm' && context.selection.length > 0;","return context.selection.length > 0;"]},
  {id:'held-one-shot-repeats',scenario:'duplicate-and-held-save',step:3,from:"if (repeat && command !== 'next')",to:'if (false)'},
  {id:'navigation-repeat-blocked',scenario:'navigation-repeat',step:2,from:"repeat && command !== 'next'",to:'repeat'},
  {id:'duplicate-event-routes-twice',scenario:'duplicate-and-held-save',step:2,from:'if (seen.has(action.id))',to:'if (false)'},
  {id:'pending-command-replaced',scenario:'pending-not-replaced',step:1,from:'if (pending) { reject',to:'if (false) { reject'},
  {id:'stale-context-reaches-effect',scenario:'stale-revision',step:2,from:'!isDeepStrictEqual(captured.context,context) || !applicable(captured.command)',to:'!applicable(captured.command)'},
  {id:'cancel-retains-command',scenario:'cancel-clears-intent',step:1,from:"{ pending = null; reject('cancelled'); }",to:"{ reject('cancelled'); }"},
  {id:'blur-retains-command',scenario:'blur-cancels-and-releases',step:1,from:"{ pending = null; held.clear(); context.focus",to:"{ held.clear(); context.focus"},
  {id:'delete-effect-duplicates',sink:true,scenario:'delete-confirm-repeat',step:4,from:"records.push({kind:'delete',selection:[...context.selection]});",to:"{ records.push({kind:'delete',selection:[...context.selection]}); records.push({kind:'delete',selection:[...context.selection]}); }"},
];
for (const fault of faults) test('ordinary controls pass before named state/effect mismatch: '+fault.id,async t => {
  let code = fault.sink ? double : source;
  for (const [from,to] of [[fault.from,fault.to],...(fault.extra ? [fault.extra] : [])]) {
    assert.equal(code.split(from).length,2,'exactly one mutation site');code = code.replace(from,to);
  }
  const parent = fs.realpathSync.native(os.tmpdir()),dir = fs.mkdtempSync(path.join(parent,'rea-keyboard-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)),parent);assert.ok(path.basename(dir).startsWith('rea-keyboard-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});
  });
  const file = path.join(dir,'mutant.mjs');fs.writeFileSync(file,code);const mutated = await import(pathToFileURL(file));
  const router = fault.sink ? createRouter : mutated.createRouter,sink = fault.sink ? mutated.recordingEffects : recordingEffects;
  const ordinary = compare(router,controls,sink);assert.equal(ordinary.length,5);assert.ok(ordinary.every(row => row.passed));
  const scenario = oracle.cases.find(row => row.id === fault.scenario);
  const rows = compare(router,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}],sink);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'prior checkpoints match');
  assert.equal(rows.at(-1).passed,false,'actual mismatch, not exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:5,distinguishing:rows.at(-1)}));
});
test('all state fields and external effects participate in comparison', () => {
  for (const field of ['context','pending','held','seen','decision']) {
    const rows = compare((initial,sink) => {
      const router = createRouter(initial,sink);return {...router,dispatch:action => ({...router.dispatch(action),[field]:'wrong'})};
    },controls);assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare(createRouter,controls,() => ({apply(){},inspect:() => []}));
  assert.deepEqual(rows[1].actual,rows[1].expected);assert.equal(rows[1].passed,false);
});
test('snapshot ownership and unexpected fixture failures stay visible', () => {
  const initial = structuredClone(oracle.cases[0].initial),sink = recordingEffects(),router = createRouter(initial,sink);
  initial.selection[0] = 'foreign';const snap = router.snapshot();snap.context.selection[0] = 'changed';
  assert.deepEqual(router.snapshot().context.selection,['a']);
  router.dispatch({type:'command',command:'save'});router.dispatch({type:'commit'});
  const records = sink.inspect();records[0].revision = 99;assert.equal(sink.inspect()[0].revision,0);
  assert.throws(() => router.dispatch({type:'unexpected'}),/Unknown fixture action/);
  assert.throws(() => compare(() => {throw Error('factory failure');}),/factory failure/);
  const broken = createRouter(oracle.cases[0].initial,{apply(){throw Error('sink failed');}});
  broken.dispatch({type:'command',command:'save'});assert.throws(() => broken.dispatch({type:'commit'}),/sink failed/);
});
test('confirmation rechecks selection, focus and dialog at the actual effect boundary', () => {
  for (const patch of [{selection:['b']},{selection:[]},{focus:'input'},{dialog:false}]) {
    const sink = recordingEffects(),router = createRouter({...oracle.cases[0].initial,dialog:true,focus:'confirm'},sink);
    assert.equal(router.dispatch({type:'command',command:'confirm-delete'}).decision.consumed,true);
    router.dispatch({type:'context',patch});const actual = router.dispatch({type:'commit'});
    assert.deepEqual(actual.decision,{command:'confirm-delete',consumed:false,reason:'stale'});
    assert.deepEqual(sink.inspect(),[]);assert.deepEqual(actual.context.selection,patch.selection ?? ['a']);
  }
});
test('held confirmation cannot become a fresh confirmation in a reopened dialog', () => {
  const modal = {...oracle.cases[0].initial,dialog:true,focus:'confirm'},sink = recordingEffects(),router = createRouter(modal,sink);
  const key = {...oracle.cases.find(row => row.id === 'modal-enter-precedence').steps[0].action};
  router.dispatch(key);router.dispatch({type:'commit'});
  router.dispatch({type:'context',patch:modal});
  const held = router.dispatch({...key,id:2});assert.equal(held.decision.reason,'repeat');
  router.dispatch({type:'commit'});assert.equal(sink.inspect().filter(r => r.kind === 'delete').length,1);
  router.dispatch({type:'release',code:'Enter'});router.dispatch({...key,id:3});router.dispatch({type:'commit'});
  assert.equal(sink.inspect().filter(r => r.kind === 'delete').length,2);
});
