// Supported native-key tab adapter; no browser install, DOM mutation or key simulation.
import assert from 'node:assert/strict';
import {profile} from './profile.mjs';
export const checkpoints=['seed','new-focus','show-focus','alpha-focus','beta-focus','reverse','editor','done-focus','space-toggle','save-focus','cancel-focus','cancel-return','blank','corrected','saved','save-again','rejected','retry','row-return','filtered-fallback','new-editor','new-cancel'];
export function auditCaptures(report) {
  assert.deepEqual(report.errors,[],'Action errors remain failures');
  assert.deepEqual(report.captures.map(c=>c.label),checkpoints,'Incomplete/duplicate/reordered checkpoints');
  for(const c of report.captures)assert.deepEqual(c.actual,profile[c.label],c.label);
  return true;
}
export async function runBrowserChecks(createTab,record=async()=>{}, {port=41781}={}) {
  const report={captures:[],errors:[],method:'Actual native browser keys with read-only DOM/AX; source-exposed, same-agent',unrun:['Screen-reader announcements','Other browser/device combinations','Measured contrast and full conformance']};
  const base=`http://127.0.0.1:${port}`;let control,a;
  async function capture(label,expected,store) {
    const ax=await a.getAXState({emit:false});
    const actual=JSON.parse(JSON.stringify(await a.playwright.evaluate(()=>{
      const by=id=>document.getElementById(id),el=document.activeElement;
      return {active:el.id||(el===document.body?'BODY':el.textContent),hidden:by('form').hidden,title:by('name').value,done:by('complete').checked,status:by('notice').textContent,invalid:by('name').getAttribute('aria-invalid'),description:by('name').getAttribute('aria-describedby'),error:by('invalid').textContent,problem:by('problem').textContent,rows:[...by('rows').childNodes].map(n=>n.textContent)};
    })));
    const selected=Object.fromEntries(Object.keys(expected).map(k=>[k,actual[k]]));
    if(store!==undefined){await control.playwright.getByRole('button',{name:'Read store',exact:true}).click();selected.store=await control.playwright.locator('#stored').textContent();expected={...expected,store};}
    assert.deepEqual(expected,profile[label],'Replay must match frozen acceptance');
    report.captures.push({label,actual:selected,expected,ax});await record(report);
    assert.deepEqual(selected,expected,label);
  }
  const key=async value=>{await a.pressKey(null,value);};
  const seed='{"version":1,"items":[{"id":1,"title":"Alpha","done":false},{"id":2,"title":"Beta","done":true}]}';
  const saved='{"version":1,"items":[{"id":1,"title":"Corrected","done":false},{"id":2,"title":"Beta","done":true}]}';
  const retry='{"version":1,"items":[{"id":1,"title":"Kept draft","done":false},{"id":2,"title":"Beta","done":true}]}';
  try {
    control=await createTab(base+'/setup.html');await control.playwright.getByRole('button',{name:'Apply store',exact:true}).click();await control.getAXState({emit:false});
    a=await createTab(base+'/fixture.html');await capture('seed',{active:'BODY',hidden:true,rows:['Alpha — Open','Beta — Done']},seed);
    await key('Tab');await capture('new-focus',{active:'add'});
    await key('Tab');await capture('show-focus',{active:'scope'});
    await key('Tab');await capture('alpha-focus',{active:'task-1'});
    await key('Tab');await capture('beta-focus',{active:'task-2'});
    await key('shift+Tab');await capture('reverse',{active:'task-1'});
    await key('Return');await capture('editor',{active:'name',title:'Alpha',hidden:false});
    await key('Tab');await capture('done-focus',{active:'complete'});
    await key('space');await capture('space-toggle',{active:'complete',done:true});
    await key('Tab');await capture('save-focus',{active:'Save'});
    await key('Tab');await capture('cancel-focus',{active:'abandon'});
    await key('Return');await capture('cancel-return',{active:'task-1',hidden:true});
    await key('Return');await key('ctrl+a');await key('BackSpace');await key('Return');
    await capture('blank',{active:'name',invalid:'true',description:'invalid',error:'Title is required.',status:'Not saved'},seed);
    await a.typeText(null,'  Corrected  ');await capture('corrected',{active:'name',invalid:'false',error:'',status:'Unsaved changes'});
    await key('Return');await capture('saved',{active:'name',title:'Corrected',status:'Saved',problem:''},saved);
    await key('Tab');await key('Tab');await key('Return');await capture('save-again',{active:'Save',status:'Saved'},saved);
    await key('shift+Tab');await key('shift+Tab');await key('ctrl+a');await a.typeText(null,'Kept draft');
    // Only controlled fault preparation uses a click; navigation/retry below are actual keys.
    await a.playwright.getByRole('button',{name:'Reject next save',exact:true}).click();await a.getAXState({emit:false});
    await key('shift+Tab');await key('shift+Tab');await key('Return');
    await capture('rejected',{active:'Save',title:'Kept draft',status:'Save failed',problem:'Save failed. Draft kept; storage or safe tab coordination is unavailable. Retry when available.'},saved);
    await key('Return');await capture('retry',{active:'Save',status:'Saved',problem:''},retry);
    await key('Tab');await key('Return');await capture('row-return',{active:'task-1',hidden:true,rows:['Kept draft — Open','Beta — Done']});
    // Filter preparation is explicit; the removal/save/Cancel path uses keys.
    await a.playwright.getByLabel('Show',{exact:true}).selectOption('open');await a.getAXState({emit:false});
    await key('Tab');await key('Return');await key('Tab');await key('space');await key('Tab');await key('Return');await a.getAXState({emit:false});await key('Tab');await key('Return');
    await capture('filtered-fallback',{active:'add',hidden:true,rows:['No tasks.']});
    await key('Return');await capture('new-editor',{active:'name',title:'',done:false,hidden:false});
    await key('Tab');await key('Tab');await key('Tab');await key('Return');await capture('new-cancel',{active:'add',hidden:true});
    auditCaptures(report);return report;
  } catch(error) {report.errors.push(String(error));await record(report);throw error;}
  finally {await a?.close();await control?.close();}
}
