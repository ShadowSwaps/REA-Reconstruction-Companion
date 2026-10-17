// Acceptance oracle from ACCEPTANCE.md and historical behavior. Does not import candidates.
import assert from 'node:assert/strict';
export function profile(target) {
  assert.ok(['reference','parity','improved'].includes(target));
  const improved=target==='improved', seed=[{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}], entries={};
  const bytes=items=>JSON.stringify({version:1,items});
  const add=(label,fields,items)=>{entries[label]={fields,stored:bytes(items)};};
  const first=[{id:1,title:'First',done:false},seed[1]], retry=[{id:1,title:'Draft Ω <tag>',done:true},seed[1]], newer=[...retry,{id:3,title:'New draft',done:false}], enter=[...retry,{id:3,title:'Enter submitted',done:false}];
  add('seed',{rows:['Alpha — Open','Beta — Done'],status:'Ready',hidden:true},seed);
  add('prior-success',{status:'Saved',title:'First'},first);
  add('failed-after-success',{rows:['First — Open','Beta — Done'],title:'  Draft Ω <tag>  ',done:true,status:improved?'Save failed':'Saved'},first);
  add('retry',{rows:['Draft Ω <tag> — Done','Beta — Done'],status:'Saved',error:'',title:'Draft Ω <tag>'},retry);
  add('retry-reload',{status:'Ready',hidden:true,rows:['Draft Ω <tag> — Done','Beta — Done']},retry);
  add('new-failure',{title:'  New draft  ',done:false,rows:['Draft Ω <tag> — Done','Beta — Done'],status:improved?'Save failed':'New task'},retry);
  add('new-retry',{status:'Saved',title:'New draft'},newer);
  add('blank-validation',{invalid:'Title is required.',status:improved?'Not saved':'Saved'},newer);
  add('filter-cancel',{rows:['New draft — Open'],hidden:true,status:'Cancelled'},newer);
  add('enter-submit',{status:'Saved',title:'Enter submitted'},enter);
  add('unsaved-reload',{hidden:true,scope:'all',rows:['Draft Ω <tag> — Done','Beta — Done','Enter submitted — Open']},enter);
  add('fresh-tab',{hidden:true,status:'Ready',rows:['Draft Ω <tag> — Done','Beta — Done','Enter submitted — Open']},enter);
  for(const isNew of [false,true]) {
    const prefix=isNew?'new':'edit',winner=isNew?[...seed,{id:3,title:'A wins',done:false}]:[{id:1,title:'A wins',done:false},seed[1]];
    add(prefix+'-winner',{status:'Saved'},winner);
    add(prefix+'-stale',{status:improved?'Conflict — draft kept':'Saved',title:'B draft',recovery:improved},improved?winner:isNew?[...seed,{id:3,title:'B draft',done:false}]:[seed[0],{id:2,title:'B draft',done:true}]);
    if(improved) {
      add(prefix+'-load-latest',{status:'Latest loaded — draft kept',title:'B draft'},winner);
      add(prefix+'-still-blocked',{status:'Conflict — draft kept',title:'B draft'},winner);
      add(prefix+'-copy',{status:'Saved',title:'B draft',recovery:false},[...winner,{id:isNew?4:3,title:'B draft',done:!isNew}]);
    }
  }
  if(improved) {
    for(const isNew of [false,true])for(const reverse of [false,true]) {
      const prefix=`overlap-${isNew?'new':'edit'}-${reverse?'B':'A'}`,title=reverse?'B overlap':'A overlap',draft=reverse?'A overlap':'B overlap',winner=isNew?[...seed,{id:3,title,done:false}]:[{id:1,title,done:false},seed[1]];
      add(prefix+'-held',{status:'Saving…',busy:true},seed);add(prefix+'-queued',{status:'Saving…',busy:true},seed);
      add(prefix+'-winner',{status:'Saved',busy:false},winner);
      add(prefix+'-conflict',{status:'Conflict — draft kept',title:draft,busy:false},winner);
      add(prefix+'-recovered',{status:'Saved'},[...winner,{id:isNew?4:3,title:draft,done:false}]);
    }
    add('lock-refusal',{status:'Save failed',title:'Lock kept',rows:['Alpha — Open','Beta — Done']},seed);
  }
  return entries;
}
export function auditCaptures(report) {
  assert.deepEqual(report.errors,[],'Recorded action/checkpoint errors');
  const expected=new Map(['reference','parity','improved'].flatMap(target=>Object.entries(profile(target)).map(([label,oracle])=>[target+'/'+label,oracle])));
  const seen=new Set();
  for(const capture of report.captures) {
    const key=capture.target+'/'+capture.label,oracle=expected.get(key);
    assert.ok(oracle,'Unexpected checkpoint '+key);assert.ok(!seen.has(key),'Duplicate checkpoint '+key);seen.add(key);
    assert.equal(typeof capture.ax,'string');assert.ok(capture.ax.length>0);
    for(const field of ['rows','selected','title','done','status','error','invalid','hidden','scope','busy','recovery','probe'])assert.ok(Object.hasOwn(capture.actual,field),'Missing field '+field);
    for(const [field,value] of Object.entries(oracle.fields))assert.deepEqual(capture.actual[field],value,key+'/'+field);
    assert.equal(capture.stored,oracle.stored,key+'/stored');
    if(capture.label==='failed-after-success'||capture.label==='new-failure')assert.match(capture.actual.error,/Save failed/);
    if(capture.target==='improved' && capture.label!=='fresh-tab') {
      const probe=JSON.parse(capture.actual.probe);assert.equal(probe.secure,true);assert.equal(probe.locks,true);
      if(capture.label.endsWith('-held'))assert.equal(probe.held,true);
      if(capture.label.endsWith('-queued')){assert.equal(probe.requests,1);assert.equal(probe.entered,0);assert.equal(probe.writes,0);}
    }
  }
  assert.equal(seen.size,expected.size,'Missing checkpoints');
  return {checkpoints:seen.size,reference:16,parity:16,improved:43,improvementFailures:{reference:['I1 stale success','I2 stale edit overwrite','I2 new-ID overwrite'],parity:['I1 stale success','I2 stale edit overwrite','I2 new-ID overwrite']},method:'Recomputed against source-controlled independent acceptance oracle; no stored pass flags or capture-supplied expectations trusted'};
}
