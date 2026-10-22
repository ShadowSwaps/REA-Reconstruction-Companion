import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEditor} from '../evals/offline-sync/candidate.mjs';
import {recordingService} from '../evals/offline-sync/double.mjs';
import {frozen,compare} from '../evals/offline-sync/check.mjs';
const oracle = frozen(), controls = oracle.cases.filter(row => row.ordinary);
const source = fs.readFileSync(new URL('../evals/offline-sync/candidate.mjs',import.meta.url),'utf8');
const double = fs.readFileSync(new URL('../evals/offline-sync/double.mjs',import.meta.url),'utf8');
test('three offline-sync families match 91 frozen full states and independent service records', () => {
  assert.equal(new Set(oracle.cases.map(row => row.family)).size,3);
  const rows = compare(); assert.equal(rows.length,91); assert.deepEqual(rows.filter(row => !row.passed),[]);
});
const faults = [
  {id:'accept-replaces-pending',scenario:'offline-single-slot',step:4,from:'inScope() && !pending',to:'inScope()'},
  {id:'send-uses-live-draft',scenario:'offline-single-slot',step:7,from:'value:pending.value,edit:pending.edit,base:pending.base',to:'value:draft.value,edit:pending.edit,base:pending.base'},
  {id:'ack-certifies-newer-draft',scenario:'offline-single-slot',step:9,from:'confirmed = structuredClone(reply.record); pending = null;',to:'confirmed = structuredClone(reply.record); draft.value = reply.record.value; pending = null;'},
  {id:'unknown-is-retryable',scenario:'lost-ack-reconcile',step:4,from:"reply.outcome === 'no-effect' ? 'queued' : 'unknown'",to:"'queued'"},
  {id:'unknown-replayed-on-send',scenario:'lost-ack-reconcile',step:7,from:"pending?.state !== 'queued'",to:"!['queued','unknown'].includes(pending?.state)"},
  {id:'empty-lookup-proves-no-effect',scenario:'unknown-without-receipt',step:5,from:'// An absent receipt alone never authorizes replay in this policy.',to:"if (receipt.outcome === 'unknown') pending.state = 'queued';"},
  {id:'unknown-discarded',scenario:'unknown-without-receipt',step:7,from:"['queued','conflicted'].includes(pending.state)",to:"['queued','conflicted','unknown'].includes(pending.state)"},
  {id:'owner-switch-loses-uncertainty',scenario:'owner-changes-before-completion',step:4,from:"if (!inScope() && pending?.state === 'in-flight') pending.state = 'unknown';",to:'/* incorrectly keep active state */'},
  {id:'stale-reply-clears-new-intent',scenario:'duplicate-old-reply',step:8,from:" || reply.id !== pending.id || reply.ticket !== pending.ticket",to:''},
  {id:'rebase-sends-newer-draft',scenario:'conflict-rebase',step:8,from:"pending = {...pending,id:'o'+nextId++,base:remote.revision",to:"pending = {...pending,value:draft.value,id:'o'+nextId++,base:remote.revision"},
  {id:'discard-forgets-live-edits',scenario:'conflict-discard',step:6,from:'if (remote) confirmed = structuredClone(remote);',to:'if (remote) { confirmed = structuredClone(remote); draft.value = remote.value; }'},
  {id:'server-overwrites-conflicting-revision',service:true,scenario:'conflict-rebase',step:5,from:'request.base !== server.revision',to:'false'},
  {id:'lost-ack-omits-actual-effect',service:true,scenario:'lost-ack-reconcile',step:4,from:"mode !== 'unknown-before'",to:"mode !== 'unknown-before' && mode !== 'lost-ack'"},
];
for (const fault of faults) test('ordinary controls pass before named state/effect mismatch: '+fault.id,async t => {
  const code = fault.service ? double : source;
  assert.equal(code.split(fault.from).length,2,'exactly one mutation site');
  const parent = fs.realpathSync.native(os.tmpdir()), dir = fs.mkdtempSync(path.join(parent,'rea-offline-sync-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)),parent); assert.ok(path.basename(dir).startsWith('rea-offline-sync-'));
    assert.equal(fs.lstatSync(dir).isSymbolicLink(),false); fs.rmSync(dir,{recursive:true,force:true});
  });
  const file = path.join(dir,'mutant.mjs'); fs.writeFileSync(file,code.replace(fault.from,fault.to));
  const mutated = await import(pathToFileURL(file));
  const editor = fault.service ? createEditor : mutated.createEditor;
  const service = fault.service ? mutated.recordingService : recordingService;
  const ordinary = compare(editor,controls,service);
  assert.equal(ordinary.length,12); assert.ok(ordinary.every(row => row.passed),'ordinary success and known-no-effect retry');
  const scenario = oracle.cases.find(row => row.id === fault.scenario);
  const rows = compare(editor,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}],service);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'prior checkpoints match');
  assert.equal(rows.at(-1).passed,false,'actual mismatch, not exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:12,distinguishing:rows.at(-1)}));
});
test('all snapshot fields and independently observed effects participate in comparison', () => {
  for (const field of ['owner','online','draft','confirmed','pending','remote']) {
    const rows = compare((initial,service) => {
      const editor = createEditor(initial,service);
      return {...editor,dispatch:action => ({...editor.dispatch(action),[field]:'incorrect'})};
    },controls);
    assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare(createEditor,controls,initial => {
    const service = recordingService(initial);
    return {...service,inspect:() => ({...service.inspect(),effects:[{unexpected:true}]})};
  });
  assert.deepEqual(rows[0].actual,rows[0].expected); assert.equal(rows[0].passed,false);
});
test('snapshots are detached; fixture failures propagate and changed bindings are rejected', () => {
  const initial = {value:'A',revision:0}, service = recordingService(initial), editor = createEditor(initial,service);
  initial.value = 'changed'; const snap = editor.snapshot(); snap.draft.value = 'changed';
  assert.equal(editor.snapshot().draft.value,'A');
  assert.throws(() => editor.dispatch({type:'invalid'}),/Unknown fixture action/);
  assert.throws(() => compare(() => {throw Error('broken factory');}),/broken factory/);
  assert.throws(() => service.finish(99,'ok'),/Invalid fixture completion/);
  const request = {ticket:1,id:'o1',owner:'alice',document:'note',value:'B',edit:1,base:0};
  service.start(request); request.value = 'changed'; service.finish(1,'lost-ack');
  const observed = service.inspect(); observed.effects[0].value = 'changed';
  assert.equal(service.inspect().effects[0].value,'B');
  assert.throws(() => service.finish(1,'ok'),/Invalid fixture completion/);
  assert.throws(() => service.lookup({id:'o1',owner:'alice',document:'note',value:'C',edit:1,base:0}),/Changed reconciliation binding/);
});
test('simulated receipt dedup is scoped/bound, and reconciliation preserves newer edits after later remote writes', () => {
  const service = recordingService({value:'A',revision:0}), editor = createEditor({value:'A',revision:0},service);
  editor.dispatch({type:'edit',value:'B'}); editor.dispatch({type:'accept'}); editor.dispatch({type:'online',value:true}); editor.dispatch({type:'send'});
  editor.dispatch({type:'result',reply:service.finish(1,'lost-ack')});
  editor.dispatch({type:'edit',value:'C'}); service.external('R');
  const reconciled = editor.dispatch({type:'reconcile'});
  assert.deepEqual(reconciled.draft,{value:'C',edit:2}); assert.deepEqual(reconciled.confirmed,{value:'B',revision:1}); assert.equal(reconciled.pending,null);
  assert.deepEqual(service.inspect().server,{value:'R',revision:2});
  const original = service.inspect().attempts[0]; service.start({...original,ticket:2});
  assert.deepEqual(service.finish(2,'ok'),{id:'o1',ticket:2,outcome:'ok',record:{value:'B',revision:1}});
  assert.equal(service.inspect().effects.length,1);
  assert.deepEqual(service.lookup({id:'o1',owner:'bob',document:'note',value:'B',edit:1,base:0}),{outcome:'unknown'});
  service.start({...original,ticket:3,value:'C'}); assert.throws(() => service.finish(3,'ok'),/Changed key\/payload binding/);
});
