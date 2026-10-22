import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEditor} from '../evals/clipboard/candidate.mjs';
import {recordingClipboard} from '../evals/clipboard/double.mjs';
import {frozen,compare} from '../evals/clipboard/check.mjs';
const oracle = frozen(), source = fs.readFileSync(new URL('../evals/clipboard/candidate.mjs',import.meta.url),'utf8');

test('three finite clipboard families match 30 frozen intermediate states and effects', () => {
  const rows = compare();
  assert.equal(new Set([...oracle.ordinary,...oracle.boundaries].map(row => row.family)).size,3);
  assert.equal(rows.length,30);
  for (const row of rows) assert.equal(row.passed,true,JSON.stringify(row));
});
const faults = [
  {id:'selection-enumeration-order',target:'replacement-repeat',step:0,
    from:'source.filter(item => action.ids.includes(item[0]))',to:'action.ids.map(id => source.find(item => item[0] === id))'},
  {id:'insert-instead-of-replace',target:'replacement-repeat',step:1,
    from:'destination.splice(action.at,action.replace.length,...inserted)',to:'destination.splice(action.at,0,...inserted)'},
  {id:'cut-removes-on-write-failure',target:'write-rejected',step:0,
    from:"status = 'clipboard-rejected'; break; }\n        if (action.type === 'cut')",
    to:"if (action.type === 'cut') docs[action.owner] = source.filter(item => !action.ids.includes(item[0])); status = 'clipboard-rejected'; break; }\n        if (action.type === 'cut')"},
  {id:'partial-invalid-paste',target:'late-invalid',step:0,
    from:'if (!value.items.every(item =>',to:'if (!value.items.slice(0,1).every(item =>'},
  {id:'stale-source-removal',target:'source-changed',step:2,
    from:'!equal(ticket.source,docs[move.source]) || ',to:''},
  {id:'wrong-replacement-target',target:'destination-rejected',step:1,
    from:'!equal(destination.slice(action.at,action.at + action.replace.length).map(item => item[0]),action.replace)',to:'false'},
  {id:'copy-reads-live-source',target:'copy-snapshot-undo',step:2,
    from:"['n'+nextId++,item[1]]",to:"['n'+nextId++,Object.values(docs).flat().find(row => row[0] === item[0])?.[1] ?? item[1]]"},
  {id:'undo-recreates-identity',target:'undo-move',step:2,
    from:'docs = structuredClone(entry.before); redo.push(entry);',to:"docs = structuredClone(entry.before); docs.src = docs.src.map(item => ['restored-'+item[0],item[1]]); redo.push(entry);"},
  {id:'undo-clears-external-clipboard',target:'undo-move',step:2,
    from:'docs = structuredClone(entry.before); redo.push(entry);',to:'docs = structuredClone(entry.before); clipboard.write(null); redo.push(entry);'},
  {id:'redo-recreates-identity',target:'undo-move',step:4,
    from:'docs = structuredClone(entry.after); undo.push(entry);',to:"docs = structuredClone(entry.after); docs.dst = docs.dst.map(item => item[0] === 'a' ? ['new-a',item[1]] : item); undo.push(entry);"},
  {id:'cut-token-reused-after-undo',target:'undo-move',step:3,
    from:'consumed.has(move.token) || ',to:''},
  {id:'clipboard-mints-deletion-authority',target:'foreign-move',step:0,
    from:'move && pending.get(move.token)',to:'move && (pending.get(move.token) ?? {value:fragment,source:docs[move.source]})'},
];
for (const fault of faults) test('ordinary controls precede actual state/effect rejection: '+fault.id,async t => {
  assert.equal(source.split(fault.from).length,2,'one mutation site');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'rea-clipboard-'));
  t.after(() => fs.rmSync(directory,{recursive:true,force:true}));
  const file = path.join(directory,'mutant.mjs'); fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const mutant = await import(pathToFileURL(file));
  const controls = compare(mutant.createEditor,oracle.ordinary);
  assert.equal(controls.length,4); assert.ok(controls.every(row => row.passed),'ordinary copy and deferred cut pass');
  const scenario = oracle.boundaries.find(row => row.id === fault.target);
  const rows = compare(mutant.createEditor,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'earlier checkpoints match');
  assert.equal(rows.at(-1).step,fault.step); assert.equal(rows.at(-1).passed,false,'distinguishing assertion, never an exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:4,distinguishing:rows.at(-1)}));
});
test('double payloads and snapshots are detached; unknown adapter and harness errors propagate', () => {
  const value = {format:'text',text:'original'}, clipboard = recordingClipboard({value});
  value.text = 'changed'; const read = clipboard.read(); read.text = 'changed';
  const inspected = clipboard.inspect(); inspected.value.text = 'changed'; inspected.events.length = 0;
  assert.deepEqual(clipboard.inspect(),{value:{format:'text',text:'original'},events:['read:ok']});
  const editor = createEditor(oracle.ordinary[0].initial,clipboard), snap = editor.snapshot();
  snap.docs.src[0][1] = 'changed'; assert.equal(editor.snapshot().docs.src[0][1],'Alpha');
  for (const action of [{type:'copy',owner:'src',ids:['a']},{type:'paste',owner:'dst',at:0,replace:[]}]) {
    const broken = createEditor(oracle.ordinary[0].initial,{read(){throw Error('adapter broken');},write(){throw Error('adapter broken');}});
    assert.throws(() => broken.dispatch(action),/adapter broken/);
  }
  assert.throws(() => compare(() => {throw Error('load broken');}),/load broken/);
});
test('finite representation limits and direct destination rejection preserve data/history', () => {
  const invalid = [null,{format:'text',text:'a'.repeat(65)},
    {format:'items',version:2,items:[['a','A']]},
    {format:'items',version:1,items:[['a','A'],['a','B']]},
    {format:'items',version:1,items:Array.from({length:4},(_,i)=>['i'+i,'A'])},
    {format:'text',text:'A',unexpected:true}];
  for (const value of invalid) {
    const clipboard = recordingClipboard({value}), editor = createEditor(oracle.ordinary[0].initial,clipboard);
    const before = editor.snapshot(), actual = editor.dispatch({type:'paste',owner:'dst',at:1,replace:[]});
    assert.deepEqual(actual,{...before,status:'rejected'});
    assert.deepEqual(clipboard.inspect(),{value,events:['read:ok']});
  }
  const clipboard = recordingClipboard(), editor = createEditor(oracle.ordinary[0].initial,clipboard);
  editor.dispatch({type:'cut',owner:'src',ids:['a']});
  const before = editor.snapshot();
  for (const action of [{type:'paste',owner:'src',at:0,replace:[]}, {type:'paste',owner:'missing',at:0,replace:[]}, {type:'paste',owner:'dst',at:99,replace:[]}])
    assert.deepEqual(editor.dispatch(action),{...before,status:'rejected'});
});
test('comparator observes every result field and independent clipboard effects', () => {
  for (const field of ['docs','history','status']) {
    const rows = compare((initial,clipboard) => {
      const editor = createEditor(initial,clipboard);
      return {dispatch:action => ({...editor.dispatch(action),[field]:'incorrect'})};
    });
    assert.ok(rows.some(row => !row.passed),field);
  }
  const scenario = oracle.ordinary[0];
  const rows = compare((initial,clipboard) => {
    const editor = createEditor(initial,clipboard);
    return {dispatch(action) {const view = editor.dispatch(action); clipboard.write(null); return view;}};
  },[{...scenario,steps:scenario.steps.slice(0,1)}]);
  assert.deepEqual(rows[0].actual,rows[0].expected); assert.equal(rows[0].passed,false);
});
