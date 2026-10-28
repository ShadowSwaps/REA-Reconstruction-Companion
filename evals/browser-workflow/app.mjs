import {createBrowserWorkflow} from './controller.mjs';
const $=id=>document.getElementById(id);
const run=crypto.randomUUID(),completed=new Set(),committed=new Set();
let previous=null,lastId=null;
const port={
  read:()=>({url:location.pathname,state:structuredClone(history.state)}),
  push:(state,url)=>history.pushState(state,'',url),
  replace:(state,url)=>history.replaceState(state,'',url),
  go:delta=>history.go(delta),
  onPop:callback=>addEventListener('popstate',()=>callback(port.read()))
};
const workflow=createBrowserWorkflow(port,render,run);
function dispatch(action) {workflow.act(action);}
function context(scope,active) {dispatch({type:'context',scope,active,read:active,write:active});}
function render() {
  const record=workflow.snapshot(),s=record.model,entry=s.entries[s.index];
  const blocked=record.stopped || record.reconciliation !== null;
  $('identity').textContent=`SIMULATED ${s.active ? s.scope : 'expired'} · session ${s.session} · route lifetime ${s.lifetime}`;
  $('route').textContent=`Native URL ${record.native.url} · committed view ${entry.url} · entry ${entry.key} · native position ${record.pos} · epoch ${record.epoch}`;
  $('status').textContent=blocked ? (record.stopped ? 'Stopped: unsupported history event' : 'Reconciling native URL; editor hidden') : `${s.notice} · loading ${s.loading ?? 'none'} · saving ${s.saving ?? 'none'} · dirty ${s.dirty}`;
  $('editor-panel').hidden=blocked || !s.active || !s.draft;
  $('hidden').hidden=!$('editor-panel').hidden;
  $('resume').hidden=record.reconciliation === null || record.stopped;
  $('resume').disabled=record.reconciliation?.issued === true;
  if ($('editor').value !== (s.draft?.text ?? '')) $('editor').value=s.draft?.text ?? '';
  $('editor').disabled=blocked || !s.active || s.write !== true || !s.draft;
  $('revision').textContent=s.draft ? `Revision ${s.draft.revision}; saved revision ${s.draft.savedRevision}; remote base ${s.draft.base}` : '';
  for (const id of ['a','b','c','push-c','back','forward','save','restore','expire','owner-a','owner-b','stale']) $(id).disabled=blocked || (id === 'stale' && previous === null);
  $('review').hidden=blocked || !s.departure;
  if (s.departure) {
    const p=s.departure;
    $('proposal').textContent=`Proposal ${p.id}: ${p.kind} ${p.url}, entry ${p.key ?? 'new/current'}, source revision ${p.sourceRevision}, lifetime ${p.sourceLifetime}`;
    if (lastId !== p.id && !blocked) {
      if (lastId !== null) previous=lastId;
      lastId=p.id;$('cancel').focus();
    }
  } else if (lastId !== null) {
    previous=lastId;lastId=null;
    if ($('review').contains(document.activeElement)) $('save').focus();
  }
  $('stale').disabled=blocked || previous === null;
  $('operations').replaceChildren();
  for (const row of record.service.calls) {
    const span=document.createElement('p');span.textContent=`${row.kind} ${row.op}: ${row.scope} ${row.url} (session ${row.session}, lifetime ${row.lifetime}) `;
    const button=(label,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=async()=>{try {await fn();} catch(e) {b.textContent='Fixture error: '+e.message;throw e;}};span.append(b);};
    if (row.kind === 'write') button(`Commit write ${row.op}`,()=>{committed.add(row.op);workflow.commit(row.op);},committed.has(row.op));
    button(`Complete ${row.kind} ${row.op}`,async()=>{completed.add(row.op);await workflow.finish(row.op);},completed.has(row.op) || (row.kind === 'write' && !committed.has(row.op)));
    button(`Fail ${row.kind} ${row.op}`,async()=>{completed.add(row.op);await workflow.finish(row.op,true);},completed.has(row.op));
    $('operations').append(span);
  }
  $('effects').textContent='Synthetic service effects: '+JSON.stringify(record.service.effects);
  $('observation').textContent=JSON.stringify(record,null,2);
}
for (const [id,kind,url] of [['a','push','a'],['b','push','b'],['c','replace','c'],['push-c','push','c']]) $(id).onclick=()=>dispatch({type:'navigate',kind,url:'/items/'+url});
$('back').onclick=()=>history.back();$('forward').onclick=()=>history.forward();
$('resume').onclick=()=>workflow.resume();
$('editor').oninput=e=>dispatch({type:'edit',text:e.target.value});
$('save').onclick=()=>dispatch({type:'save'});$('restore').onclick=()=>dispatch({type:'restore'});
for (const [id,choice] of [['choose-save','save'],['discard','discard'],['cancel','cancel']]) $(id).onclick=()=>dispatch({type:'choose',id:workflow.snapshot().model.departure.id,choice});
$('stale').onclick=()=>dispatch({type:'choose',id:previous,choice:'cancel'});
$('expire').onclick=()=>context(workflow.snapshot().model.scope,false);
$('owner-a').onclick=()=>context('a/x',true);$('owner-b').onclick=()=>context('b/x',true);
render();
