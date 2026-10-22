import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {frozen,compare} from '../evals/settings-preferences/check.mjs';
import {createPreferences} from '../evals/settings-preferences/candidate.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/settings-preferences/candidate.mjs',import.meta.url),'utf8');
function temporary(t) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent,'rea-prefs-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)),parent);
    assert.ok(path.basename(directory).startsWith('rea-prefs-'));
    assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);
    fs.rmSync(directory,{recursive:true,force:true});
  });
  return directory;
}
test('literal preference states and independent disk bytes survive fresh-instance reopen', t => {
  const rows = compare(temporary(t));
  assert.equal([...oracle.ordinary,...oracle.boundaries].length,10);
  assert.equal(rows.length,36);
  assert.deepEqual(rows.filter(row => !row.passed),[]);
});
const faults = [
  {id:'falsy-means-missing',target:'false-zero-empty',step:0,
    from:"source === 'profile' ? applied[key] : defaults[key]",to:"source === 'profile' ? (applied[key] || defaults[key]) : defaults[key]"},
  {id:'apply-writes-disk',target:'apply-cancel-reopen',step:1,
    from:"if (action.type === 'apply') { applied = structuredClone(draft); status = 'applied'; }",
    to:"if (action.type === 'apply') { fs.writeFileSync(file,JSON.stringify({...envelope,prefs:draft})+'\\n'); applied = structuredClone(draft); status = 'applied'; }"},
  {id:'cancel-reverts-applied',target:'apply-cancel-reopen',step:3,
    from:"case 'cancel': draft = structuredClone(applied);",to:"case 'cancel': draft = structuredClone(stored);"},
  {id:'apply-claims-saved',target:'apply-cancel-reopen',step:1,
    from:"if (action.type === 'apply') { applied = structuredClone(draft);",to:"if (action.type === 'apply') { stored = structuredClone(draft); applied = structuredClone(draft);"},
  {id:'reset-explicit-defaults',target:'reset-pending-remove',step:0,
    from:'for (const key of Object.keys(defaults)) delete draft[key];',to:'for (const key of Object.keys(defaults)) draft[key] = defaults[key];'},
  {id:'reset-drops-unknown',target:'reset-pending-remove',step:0,
    from:'for (const key of Object.keys(defaults)) delete draft[key];',to:'draft = {};'},
  {id:'reset-applies-immediately',target:'reset-pending-remove',step:0,
    from:'for (const key of Object.keys(defaults)) delete draft[key];',to:'for (const key of Object.keys(defaults)) delete draft[key]; applied = structuredClone(draft);'},
  {id:'session-leaks-to-storage',target:'session-override',step:1,
    from:'const next = {...envelope,version:1,prefs:structuredClone(draft)};',to:'const next = {...envelope,version:1,prefs:{...draft,...session}};'},
  {id:'save-drops-unknown',target:'false-zero-empty',step:1,
    from:'const next = {...envelope,version:1,prefs:structuredClone(draft)};',to:'const next = {...envelope,version:1,prefs:Object.fromEntries(Object.entries(draft).filter(([key]) => own(defaults,key)))};'},
  {id:'read-migrates-on-disk',target:'older-read-save',step:0,
    from:'draft = structuredClone(stored); applied = structuredClone(stored); status = loadStatus;',to:"if (loadStatus === 'older') fs.writeFileSync(file,JSON.stringify({...envelope,version:1,prefs:stored})+'\\n'); draft = structuredClone(stored); applied = structuredClone(stored); status = loadStatus;"},
  {id:'invalid-save-rewrites-data',target:'invalid-preserved',step:1,
    from:"if (!writable) { status = 'blocked'; break; }",to:"if (!writable) { fs.writeFileSync(file,JSON.stringify({version:1,prefs:{}})+'\\n'); status = 'blocked'; break; }"},
  {id:'unset-writes-default',target:'explicit-default-unset',step:2,
    from:"if (action.type === 'unset') { delete draft[action.key];",to:"if (action.type === 'unset') { draft[action.key] = defaults[action.key];"},
];
for (const fault of faults) test('ordinary controls precede value/state/byte rejection: '+fault.id,async t => {
  assert.equal(source.split(fault.from).length,2,'one mutation site');
  const directory = temporary(t), file = path.join(directory,'mutant.mjs');
  fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const mutant = await import(pathToFileURL(file));
  const controls = compare(directory,mutant.createPreferences,oracle.ordinary);
  assert.equal(controls.length,6);
  assert.ok(controls.every(row => row.passed),'ordinary save/reopen and cancel pass');
  const scenario = oracle.boundaries.find(row => row.id === fault.target);
  const rows = compare(directory,mutant.createPreferences,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'earlier states match');
  const target = rows.at(-1);
  assert.equal(target.step,fault.step);
  assert.equal(target.passed,false,'actual distinguishing mismatch, never an exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:controls.length,distinguishing:target}));
});
test('selected file only, snapshots detached, malformed bytes retained and I/O errors propagate', t => {
  const directory = temporary(t), a = path.join(directory,'a.json'), b = path.join(directory,'b.json');
  fs.writeFileSync(a,oracle.ordinary[0].initial); fs.writeFileSync(b,'unrelated bytes');
  const preferences = createPreferences(a), snapshot = preferences.snapshot();
  snapshot.draft.limit = 0; snapshot.effective.limit = 0;
  assert.deepEqual(preferences.snapshot(),oracle.ordinary[0].steps[0].expected);
  preferences.dispatch({type:'edit',key:'label',value:'custom'});
  preferences.dispatch({type:'save'});
  assert.equal(fs.readFileSync(b,'utf8'),'unrelated bytes');
  fs.writeFileSync(a,'{broken');
  const invalid = createPreferences(a);
  assert.equal(invalid.snapshot().status,'invalid');
  assert.equal(invalid.dispatch({type:'save'}).bytes,'{broken');
  assert.throws(() => createPreferences(path.join(directory,'missing.json')),/ENOENT/);
  assert.throws(() => compare(directory,() => {throw Error('load failed');}),/load failed/);
  assert.throws(() => preferences.dispatch({type:'edit',key:'limit',value:-1}),/finite action/);
});
test('comparison detects every state field and independently catches concealed byte changes', t => {
  const directory = temporary(t);
  for (const field of ['draft','applied','effective','sources','dirty','unsaved','status','bytes']) {
    const rows = compare(directory,file => {
      const real = createPreferences(file);
      const change = value => ({...value,[field]:'incorrect'});
      return {snapshot:() => change(real.snapshot()),dispatch:action => change(real.dispatch(action))};
    });
    assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare(directory,file => {
    const real = createPreferences(file);
    return {...real,dispatch(action) { const view = real.dispatch(action); fs.appendFileSync(file,' '); return view; }};
  },[{...oracle.ordinary[0],steps:oracle.ordinary[0].steps.slice(0,1)}]);
  assert.deepEqual(rows[0].actual,rows[0].expected);
  assert.equal(rows[0].passed,false,'independent readback catches a dishonest snapshot');
});
