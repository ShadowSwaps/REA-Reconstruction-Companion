import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createForm} from '../evals/form-validation/candidate.mjs';
import {recordingSubmission} from '../evals/form-validation/double.mjs';
import {frozen,compare} from '../evals/form-validation/check.mjs';
const oracle = frozen();
const source = fs.readFileSync(new URL('../evals/form-validation/candidate.mjs',import.meta.url),'utf8');
test('three form families match 69 frozen intermediate values, errors, payloads and effects', () => {
  assert.equal(new Set([...oracle.ordinary,...oracle.boundaries].map(row => row.family)).size,3);
  const rows = compare(); assert.equal(rows.length,69);
  assert.deepEqual(rows.filter(row => !row.passed),[]);
});
const faults = [
  {id:'errors-before-touch',target:'required-timing',step:0,
    from:'attempted || touched.includes(field)',to:'true'},
  {id:'blur-never-reveals',target:'required-timing',step:1,
    from:'attempted || touched.includes(field)',to:'attempted'},
  {id:'invalid-submission-starts',target:'required-timing',step:2,
    from:"if (Object.keys(validation()).length) { status = 'invalid'; return snapshot(); }",to:"if (false) { status = 'invalid'; return snapshot(); }"},
  {id:'format-accepts-malformed',target:'format-not-empty',step:1,
    from:"else if (!/^[1-9]$/.test(draft[field]))",to:'else if (false)'},
  {id:'cross-field-only-on-submit',target:'cross-field-edit',step:1,
    from:'if (!errors.low && !errors.high && Number(draft.high) < Number(draft.low))',to:'if (attempted && !errors.low && !errors.high && Number(draft.high) < Number(draft.low))'},
  {id:'hidden-value-cleared',target:'hidden-retain-omit',step:3,
    from:"if (!active('address')) touched = touched.filter(field => field !== 'address');",to:"if (!active('address')) { draft.address = ''; touched = touched.filter(field => field !== 'address'); }"},
  {id:'hidden-value-sent',target:'hidden-retain-omit',step:4,
    from:"...(active('address') ? {address:draft.address.trim()} : {}),",to:"...(draft.address ? {address:draft.address.trim()} : {}),"},
  {id:'hidden-still-required',target:'hidden-error-clears-and-required-returns',step:2,
    from:"if (active('address') && !draft.address.trim())",to:"if ((active('address') || (attempted && revision > 0)) && !draft.address.trim())"},
  {id:'disabled-value-retained',target:'disabled-clear',step:3,
    from:"draft.code = ''; touched = touched.filter(field => field !== 'code');",to:"touched = touched.filter(field => field !== 'code');"},
  {id:'untrimmed-title-sent',target:'normalization-captured',step:3,
    from:'return {title:draft.title.trim(),method:',to:'return {title:draft.title,method:'},
  {id:'code-case-not-normalized',target:'normalization-captured',step:3,
    from:"...(active('code') ? {code:draft.code.trim().toUpperCase()} : {})",to:"...(active('code') ? {code:draft.code.trim()} : {})"},
  {id:'unrelated-edit-clears-server-errors',target:'server-error-correction',step:4,
    from:'delete serverErrors[field];',to:'serverErrors = {};'},
  {id:'corrected-field-keeps-server-error',target:'server-error-correction',step:5,
    from:'delete serverErrors[field];',to:'/* retain server error */'},
  {id:'duplicate-submit-starts',target:'pending-edits-success',step:2,
    from:'if (pending) return snapshot();',to:'if (pending) { service.start(nextId++,payload(),() => {}); return snapshot(); }'},
  {id:'accepted-payload-from-live-draft',target:'pending-edits-success',step:3,
    from:'accepted = structuredClone(operation.payload);',to:'accepted = payload();'},
  {id:'newer-draft-labelled-accepted',target:'pending-edits-success',step:3,
    from:"status = applicable ? 'accepted' : 'accepted-older-draft';",to:"status = 'accepted';"},
  {id:'stale-failure-updates-current-ui',target:'pending-edits-failure',step:4,
    from:'if (applicable) {',to:'if (true) {'},
  {id:'success-overwritten-on-failure',target:'failure-after-success',step:4,
    from:"status = applicable ? 'failed' : 'failed-older-draft';",to:"accepted = null; status = applicable ? 'failed' : 'failed-older-draft';"},
];
for (const fault of faults) test('ordinary controls pass before actual rejection: '+fault.id,async t => {
  assert.equal(source.split(fault.from).length,2,'one mutation site');
  const parent = fs.realpathSync.native(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent,'rea-form-validation-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)),parent);
    assert.ok(path.basename(directory).startsWith('rea-form-validation-'));
    assert.equal(fs.lstatSync(directory).isSymbolicLink(),false);
    fs.rmSync(directory,{recursive:true,force:true});
  });
  const file = path.join(directory,'mutant.mjs'); fs.writeFileSync(file,source.replace(fault.from,fault.to));
  const mutant = await import(pathToFileURL(file));
  const controls = compare(mutant.createForm,oracle.ordinary);
  assert.equal(controls.length,7); assert.ok(controls.every(row => row.passed),'ordinary success/rejection/resubmit');
  const scenario = oracle.boundaries.find(row => row.id === fault.target);
  const rows = compare(mutant.createForm,[{...scenario,steps:scenario.steps.slice(0,fault.step+1)}]);
  assert.ok(rows.slice(0,-1).every(row => row.passed),'earlier checkpoints match');
  assert.equal(rows.at(-1).step,fault.step); assert.equal(rows.at(-1).passed,false,'value/state/effect mismatch, not exception');
  t.diagnostic(JSON.stringify({fault:fault.id,ordinaryPassed:7,distinguishing:rows.at(-1)}));
});
test('pending duplicate activation has one observed submission, even with a permissive transport', () => {
  function run(duplicate) {
    const calls = [], service = {start:(id,payload) => calls.push(structuredClone({id,payload}))};
    const form = createForm(oracle.initial,service);
    const first = form.dispatch({type:'submit'});
    const second = form.dispatch({type:'submit'});
    // An instrumented faulty wrapper represents a UI accidentally bypassing the guard.
    if (duplicate) service.start(2,first.pending.payload);
    return {first,second,calls};
  }
  const control = run(false), faulty = run(true);
  assert.deepEqual(control.first,control.second); assert.deepEqual(faulty.second,control.second);
  assert.deepEqual(control.calls,[{id:1,payload:oracle.ordinary[0].steps[1].expected.pending.payload}]);
  assert.notDeepEqual(faulty.calls,control.calls);
});
test('untouched invalid values still block submit; required and optional inactive errors differ', () => {
  const service = recordingSubmission(), form = createForm(oracle.initial,service);
  form.dispatch({type:'edit',field:'high',value:''});
  assert.deepEqual(form.snapshot().errors,{});
  assert.deepEqual(form.dispatch({type:'submit'}).errors,{high:'Required'});
  assert.deepEqual(service.inspect(),{attempts:[],effects:[]});
  form.dispatch({type:'edit',field:'high',value:'3'});
  form.dispatch({type:'edit',field:'coupon',value:true});
  assert.deepEqual(form.snapshot().errors,{code:'Required'});
  form.dispatch({type:'edit',field:'code',value:'x!'});
  assert.deepEqual(form.snapshot().errors,{code:'Use two letters'});
});
test('snapshots, captured payload and effects are detached; fixture errors propagate', () => {
  const service = recordingSubmission(), form = createForm(oracle.initial,service);
  const state = form.dispatch({type:'submit'}); state.pending.payload.title = 'Mutation'; state.draft.title = 'Mutation';
  service.complete('accept');
  assert.equal(form.snapshot().accepted.title,'Box'); assert.equal(service.inspect().effects[0].title,'Box');
  const saved = form.snapshot(); saved.accepted.title = 'Change';
  assert.equal(form.snapshot().accepted.title,'Box');
  for (const action of [null,{type:'other'},{type:'blur',field:'address'},
    {type:'edit',field:'code',value:'ab'},{type:'edit',field:'coupon',value:'false'},
    {type:'edit',field:'method',value:'air'},{type:'edit',field:'title',value:'x'.repeat(81)}]) {
    const before = form.snapshot(); assert.throws(() => form.dispatch(action)); assert.deepEqual(form.snapshot(),before);
  }
  assert.throws(() => createForm({...oracle.initial,extra:1},service),/Invalid fixture/);
  assert.throws(() => compare(() => {throw Error('factory broken');}),/factory broken/);
  const broken = createForm(oracle.initial,{start(){throw Error('adapter broken');}});
  assert.throws(() => broken.dispatch({type:'submit'}),/adapter broken/);
  assert.throws(() => recordingSubmission().complete('accept'),/Invalid completion/);
});
test('comparator observes every field and external attempts/effects independently', () => {
  for (const field of ['draft','touched','attempted','errors','formError','pending','accepted','outcome','status']) {
    const rows = compare((initial,service) => {
      const form = createForm(initial,service);
      return {dispatch:action => ({...form.dispatch(action),[field]:'incorrect'}),snapshot:form.snapshot};
    });
    assert.ok(rows.some(row => !row.passed),field);
  }
  const rows = compare((initial,service) => {
    const form = createForm(initial,service);
    return {dispatch(action) {const result = form.dispatch(action); service.start(99,{title:'Unexpected'},() => {}); return result;}};
  },[{...oracle.ordinary[0],steps:oracle.ordinary[0].steps.slice(0,1)}]);
  assert.deepEqual(rows[0].actual,rows[0].expected); assert.equal(rows[0].passed,false);
});
