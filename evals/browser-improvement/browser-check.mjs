// Supported-browser replay. Inject a createTab(url) function returning a tab with
// the documented Playwright-style UI actions and read-only DOM snapshot/evaluate.
// No browser packages, CDP bypass or write-through evaluate are used.
import assert from 'node:assert/strict';
import {profile} from './profile.mjs';
export const seed = {version:1,items:[{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}]};
export async function runBrowserChecks(createTab, record, {targets=['reference','parity','improved'],afterSeed}={}) {
  const tabs=[],captures=[],errors=[];
  const ports={reference:41774,parity:41775,improved:41776};
  const click=(tab,name)=>tab.playwright.getByRole('button',{name,exact:true}).click({timeoutMs:2000});
  const fields=target=>target==='reference'?{rows:'tasks',title:'title',done:'done',status:'status',error:'error',invalid:'validation',form:'editor',scope:'filter'}:{rows:'rows',title:'name',done:'complete',status:'notice',error:'problem',invalid:'invalid',form:'form',scope:'scope'};
  async function state(tab,target) {
    return tab.playwright.evaluate(ids=>{
      const el=k=>document.getElementById(ids[k]);
      return {rows:[...el('rows').querySelectorAll('button')].map(n=>n.textContent),selected:[...el('rows').querySelectorAll('button')].map(n=>n.getAttribute('aria-pressed')),title:el('title').value,done:el('done').checked,status:el('status').textContent,error:el('error').textContent,invalid:el('invalid').textContent,hidden:el('form').hidden,scope:el('scope').value,busy:el('title').disabled,recovery:document.getElementById('recovery')?.hidden===false,probe:document.getElementById('probe')?.textContent??null};
    },fields(target));
  }
  async function checkpoint(label,tab,target,control,expected,expectedStore) {
    try {
      const oracle=profile(target)[label];
      assert.deepEqual(expected,oracle.fields,'Replay/oracle field disagreement');assert.equal(expectedStore,oracle.stored,'Replay/oracle storage disagreement');
      const ax=await tab.playwright.domSnapshot(), actual=JSON.parse(JSON.stringify(await state(tab,target)));
      await click(control,'Read store');const stored=await control.playwright.locator('#stored').textContent();
      const capture={target,label,actual,stored,ax,expected,expectedStore};captures.push(capture);await record({captures,errors});
      for(const [key,value] of Object.entries(expected))assert.deepEqual(actual[key],value,`${target}/${label}/${key}`);
      if(expectedStore!==undefined)assert.equal(stored,expectedStore,`${target}/${label}/stored`);
      return {actual,stored};
    } catch(error) {errors.push({target,label,message:String(error)});await record({captures,errors});throw error;}
  }
  async function open(target) {
    const base=`http://127.0.0.1:${ports[target]}`;
    const control=await createTab(base+'/setup.html');tabs.push(control);await click(control,'Apply store');
    const a=await createTab(base+'/fixture.html');tabs.push(a);await a.playwright.domSnapshot();
    return {base,control,a};
  }
  const row=(tab,target,index)=>tab.playwright.locator('#'+fields(target).rows+' button').nth(index).click({timeoutMs:2000});
  const input=(tab,target,title)=>tab.playwright.locator('#'+fields(target).title).fill(title);
  const save=tab=>click(tab,'Save');
  const bytes=items=>JSON.stringify({version:1,items});
  try { for(const target of targets) {
    const {base,control,a}=await open(target), improved=target==='improved';
    await checkpoint('seed',a,target,control,{rows:['Alpha — Open','Beta — Done'],status:'Ready',hidden:true},JSON.stringify(seed));
    if(afterSeed) await afterSeed(a);
    await row(a,target,0);await input(a,target,'First');await save(a);
    const first=bytes([{id:1,title:'First',done:false},seed.items[1]]);
    await checkpoint('prior-success',a,target,control,{status:'Saved',title:'First'},first);
    await input(a,target,'  Draft Ω <tag>  ');await a.playwright.locator('#'+fields(target).done).setChecked(true);await click(a,'Reject next save');await save(a);
    await checkpoint('failed-after-success',a,target,control,{rows:['First — Open','Beta — Done'],title:'  Draft Ω <tag>  ',done:true,status:improved?'Save failed':'Saved'},first);
    await save(a);const recovered=bytes([{id:1,title:'Draft Ω <tag>',done:true},seed.items[1]]);
    await checkpoint('retry',a,target,control,{rows:['Draft Ω <tag> — Done','Beta — Done'],status:'Saved',error:'',title:'Draft Ω <tag>'},recovered);
    await a.reload();await checkpoint('retry-reload',a,target,control,{status:'Ready',hidden:true,rows:['Draft Ω <tag> — Done','Beta — Done']},recovered);
    await click(a,'New task');await input(a,target,'  New draft  ');await click(a,'Reject next save');await save(a);
    await checkpoint('new-failure',a,target,control,{title:'  New draft  ',done:false,rows:['Draft Ω <tag> — Done','Beta — Done'],status:improved?'Save failed':'New task'},recovered);
    await save(a);const newStore=bytes([...JSON.parse(recovered).items,{id:3,title:'New draft',done:false}]);
    await checkpoint('new-retry',a,target,control,{status:'Saved',title:'New draft'},newStore);
    await input(a,target,'   ');await save(a);await checkpoint('blank-validation',a,target,control,{invalid:'Title is required.',status:improved?'Not saved':'Saved'},newStore);
    await click(a,'Cancel');await a.playwright.locator('#'+fields(target).scope).selectOption('open');
    await checkpoint('filter-cancel',a,target,control,{rows:['New draft — Open'],hidden:true,status:'Cancelled'},newStore);
    await a.playwright.locator('#'+fields(target).scope).selectOption('all');await row(a,target,2);await input(a,target,'Enter submitted');await a.playwright.locator('#'+fields(target).title).press('Enter');
    const enterStore=bytes([...JSON.parse(recovered).items,{id:3,title:'Enter submitted',done:false}]);
    await checkpoint('enter-submit',a,target,control,{status:'Saved',title:'Enter submitted'},enterStore);
    await input(a,target,'Unsaved loss');await a.reload();await checkpoint('unsaved-reload',a,target,control,{hidden:true,scope:'all',rows:['Draft Ω <tag> — Done','Beta — Done','Enter submitted — Open']},enterStore);
    const fresh=await createTab(base+'/index.html');tabs.push(fresh);await checkpoint('fresh-tab',fresh,target,control,{hidden:true,status:'Ready',rows:['Draft Ω <tag> — Done','Beta — Done','Enter submitted — Open']},enterStore);
    // Independent groups reset through explicit storage UI, then both tabs reload.
    for(const newTask of [false,true]) {
      await click(control,'Apply store');await a.reload();
      const b=await createTab(base+'/fixture.html');tabs.push(b);await b.playwright.domSnapshot();
      if(newTask){await click(a,'New task');await click(b,'New task');}else{await row(a,target,0);await row(b,target,1);}
      await input(a,target,'A wins');await input(b,target,'B draft');await save(a);
      const winner=bytes(newTask?[...seed.items,{id:3,title:'A wins',done:false}]:[{id:1,title:'A wins',done:false},seed.items[1]]);
      await checkpoint((newTask?'new':'edit')+'-winner',a,target,control,{status:'Saved'},winner);await save(b);
      const overwritten=bytes(newTask?[...seed.items,{id:3,title:'B draft',done:false}]:[seed.items[0],{id:2,title:'B draft',done:true}]);
      await checkpoint((newTask?'new':'edit')+'-stale',b,target,control,{status:improved?'Conflict — draft kept':'Saved',title:'B draft',recovery:improved},improved?winner:overwritten);
      if(improved) {
        await click(b,'Load latest (keep draft)');await checkpoint((newTask?'new':'edit')+'-load-latest',b,target,control,{status:'Latest loaded — draft kept',title:'B draft'},winner);
        await save(b);await checkpoint((newTask?'new':'edit')+'-still-blocked',b,target,control,{status:'Conflict — draft kept',title:'B draft'},winner);
        await click(b,'Save draft as new');const copied=bytes([...JSON.parse(winner).items,{id:newTask?4:3,title:'B draft',done:!newTask}]);
        await checkpoint((newTask?'new':'edit')+'-copy',b,target,control,{status:'Saved',title:'B draft',recovery:false},copied);
      }
      await b.close();
    }
    if(improved) {
      // Real browser Web Lock scheduling, extended by an explicit test hold inside A's callback.
      for(const newTask of [false,true])for(const reverse of [false,true]) {
        await click(control,'Apply store');await a.reload();const b=await createTab(base+'/fixture.html');tabs.push(b);await b.playwright.domSnapshot();
        if(newTask){await click(a,'New task');await click(b,'New task');}else{await row(a,target,0);await row(b,target,0);}
        await input(a,target,'A overlap');await input(b,target,'B overlap');const first=reverse?b:a,second=reverse?a:b,prefix=`overlap-${newTask?'new':'edit'}-${reverse?'B':'A'}`;
        await click(first,'Hold next lock');await save(first);
        const held=await checkpoint(prefix+'-held',first,target,control,{status:'Saving…',busy:true},JSON.stringify(seed));
        assert.equal(JSON.parse(held.actual.probe).held,true);
        await save(second);const queued=await checkpoint(prefix+'-queued',second,target,control,{status:'Saving…',busy:true},JSON.stringify(seed));
        assert.equal(JSON.parse(queued.actual.probe).entered,0);
        await click(first,'Release held lock');const title=reverse?'B overlap':'A overlap';const committed=bytes(newTask?[...seed.items,{id:3,title,done:false}]:[{id:1,title,done:false},seed.items[1]]);
        await checkpoint(prefix+'-winner',first,target,control,{status:'Saved',busy:false},committed);
        await checkpoint(prefix+'-conflict',second,target,control,{status:'Conflict — draft kept',title:reverse?'A overlap':'B overlap',busy:false},committed);
        await click(second,'Save draft as new');await checkpoint(prefix+'-recovered',second,target,control,{status:'Saved'},bytes([...JSON.parse(committed).items,{id:newTask?4:3,title:reverse?'A overlap':'B overlap',done:false}]));
        await b.close();
      }
      await click(control,'Apply store');await a.reload();await row(a,target,0);await input(a,target,'Lock kept');await click(a,'Refuse locks');await save(a);
      await checkpoint('lock-refusal',a,target,control,{status:'Save failed',title:'Lock kept',rows:['Alpha — Open','Beta — Done']},JSON.stringify(seed));
    }
    await a.close();await fresh.close();await control.close();
  } } catch(error) {
    if (!errors.some(entry=>entry.message===String(error))) errors.push({stage:'action-or-checkpoint',message:String(error)});
    await record({captures,errors});throw error;
  }
  return {captures,errors,limits:['Source exposed; same-agent implementation, tests and review','Controlled pre-native write rejection and lock holds/refusal','Reload/fresh tab only; actual browser restart and real storage denial unrun','Cooperating tabs only; no protection against writers ignoring lock','DOM projection is bounded; no browser/profile identity or durability claim']};
}
