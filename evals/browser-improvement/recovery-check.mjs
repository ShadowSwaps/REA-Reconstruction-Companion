import assert from 'node:assert/strict';
import {seed} from './browser-check.mjs';
// Supplemental actual-browser recovery and harness-negative checks. No page writes via evaluate.
export async function runRecoveryChecks(createTab,record) {
  const base='http://127.0.0.1:41776',captures=[];
  const control=await createTab(base+'/setup.html');
  const click=(tab,name)=>tab.playwright.getByRole('button',{name,exact:true}).click({timeoutMs:2000});
  await click(control,'Apply store');
  const a=await createTab(base+'/fixture.html'),b=await createTab(base+'/fixture.html'),writer=await createTab(base+'/index.html');
  async function check(label,tab,expected,items) {
    const ax=await tab.playwright.domSnapshot();
    const actual=JSON.parse(JSON.stringify(await tab.playwright.evaluate(()=>({rows:[...document.querySelectorAll('#rows button')].map(x=>x.textContent),title:document.getElementById('name').value,status:document.getElementById('notice').textContent,hidden:document.getElementById('form').hidden,probe:document.getElementById('probe')?.textContent}))));
    await click(control,'Read store');const stored=await control.playwright.locator('#stored').textContent();
    captures.push({label,ax,actual,stored,expected,expectedStore:JSON.stringify({version:1,items})});await record({captures});
    for(const [field,value]of Object.entries(expected))assert.deepEqual(actual[field],value,label+'/'+field);
    assert.equal(stored,JSON.stringify({version:1,items}),label+'/stored');
    return actual;
  }
  await check('seed-a',a,{rows:['Alpha — Open','Beta — Done'],status:'Ready'},seed.items);
  await check('seed-b',b,{rows:['Alpha — Open','Beta — Done'],status:'Ready'},seed.items);
  for(const [tab,index,title]of [[a,0,'Copy A'],[b,1,'Copy B'],[writer,0,'Winner']]) {await tab.playwright.locator('#rows button').nth(index).click();await tab.playwright.getByLabel('Title',{exact:true}).fill(title);}
  await click(writer,'Save');const winner=[{id:1,title:'Winner',done:false},seed.items[1]];
  await click(a,'Save');await click(b,'Save');
  await check('conflict-a',a,{title:'Copy A',status:'Conflict — draft kept'},winner);
  await check('conflict-b',b,{title:'Copy B',status:'Conflict — draft kept'},winner);
  await click(a,'Hold next lock');await click(a,'Save draft as new');
  const held=await check('copy-held',a,{title:'Copy A',status:'Saving…'},winner);assert.equal(JSON.parse(held.probe).held,true);
  await click(b,'Save draft as new');const queued=await check('copy-queued',b,{title:'Copy B',status:'Saving…'},winner);assert.equal(JSON.parse(queued.probe).entered,1);
  await click(a,'Release held lock');const copies=[...winner,{id:3,title:'Copy A',done:false},{id:4,title:'Copy B',done:true}];
  await check('copy-a-saved',a,{status:'Saved'},copies);await check('copy-b-saved',b,{status:'Saved'},copies);
  // Refuse malformed latest during conflict recovery, retaining exact draft and bytes.
  await a.playwright.getByLabel('Title',{exact:true}).fill('Keep malformed');
  await control.playwright.getByLabel('Raw store').fill('malformed');await click(control,'Apply store');await click(a,'Save');
  await click(a,'Load latest (keep draft)');await a.playwright.domSnapshot();
  const failed=await a.playwright.locator('#notice').textContent();assert.equal(failed,'Read failed — draft kept');
  await click(a,'Save draft as new');await a.playwright.domSnapshot();assert.equal(await a.playwright.locator('#notice').textContent(),'Save failed');
  const draft=await a.playwright.evaluate(()=>document.getElementById('name').value);assert.equal(draft,'Keep malformed');
  await click(control,'Read store');assert.equal(await control.playwright.locator('#stored').textContent(),'malformed');
  captures.push({label:'malformed-recovery',draft,status:'Save failed',stored:'malformed'});await record({captures});
  await control.playwright.getByLabel('Raw store').fill(JSON.stringify(seed));await click(control,'Apply store');await click(a,'Cancel');await check('cancel-latest',a,{hidden:true,status:'Cancelled',rows:['Alpha — Open','Beta — Done']},seed.items);
  for(const tab of [a,b,writer,control])await tab.close();
  return {captures,errors:[],method:'Additional same-agent actual-browser assertions; controlled lock hold; no real denial/restart claim'};
}
