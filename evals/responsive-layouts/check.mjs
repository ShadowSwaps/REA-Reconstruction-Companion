import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
export const expectations=JSON.parse(fs.readFileSync(new URL('./expectations.json',import.meta.url)));
export function verifyFrozen() {
  const identity=JSON.parse(fs.readFileSync(new URL('./identity.json',import.meta.url)));
  for(const [file,digest] of Object.entries(identity.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex'),digest,file);
}
// Accept measured data, never caller-supplied expected values. Not a rendering engine.
export function layoutFailures(actual,name) {
  const e=expectations[name];assert.ok(e,'Known frozen case required');
  const failures=[];
  if(actual.width!==e.width||actual.height!==e.height)failures.push('viewport');
  if(actual.font!==e.font)failures.push('font');
  if(actual.rows.length!==e.rows)failures.push('row-count');
  if(actual.columns!==e.columns)failures.push('columns');
  if(actual.scrollWidth>actual.width+1)failures.push('horizontal-overflow');
  if(actual.rows.some(r=>r.scrollHeight>r.clientHeight+1||r.scrollWidth>r.clientWidth+1))failures.push('row-text-clipped');
  if(actual.clipped.length)failures.push('ancestor-clipping');
  return failures;
}
export async function inspect(tab) {
  const result=JSON.parse(JSON.stringify(await tab.playwright.evaluate(()=>{
    const nodes=[...document.querySelectorAll('#rows button')];
    const clipped=[];
    for(const el of nodes){const r=el.getBoundingClientRect();for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(['hidden','clip'].includes(s.overflowY)&&(r.top<b.top-1||r.bottom>b.bottom+1))clipped.push(el.id);}}
    const panels=[...document.querySelectorAll('.panel')].map(p=>p.getBoundingClientRect());
    return {width:innerWidth,height:innerHeight,font:getComputedStyle(document.body).fontSize,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,columns:Math.abs(panels[0].top-panels[1].top)<1?2:1,clipped,
      rows:nodes.map(e=>({id:e.id,text:e.textContent,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})),
      active:document.activeElement.id,hidden:document.getElementById('form').hidden,title:document.getElementById('name').value,status:document.getElementById('notice').textContent,error:document.getElementById('invalid').textContent,invalid:document.getElementById('name').getAttribute('aria-invalid')};
  })));
  result.font=Number.parseFloat(result.font);return result;
}
export async function inspectControl(tab,id) {
  return JSON.parse(JSON.stringify(await tab.playwright.evaluate(id=>{
    const e=document.getElementById(id),r=e.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {id,active:document.activeElement.id,inViewport:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,hit:top===e||e.contains(top),outline:getComputedStyle(e).outlineStyle};
  },id)));
}
export function assertControl(a) {assert.equal(a.active,a.id,'focus');assert.equal(a.inViewport,true,'scrolled into viewport');assert.equal(a.hit,true,'control center unobscured');assert.notEqual(a.outline,'none','visible focus outline');}

// A finite report consistency check, not authentication of browser execution.
export function auditReport(report) {
  verifyFrozen();assert.deepEqual(report.errors,[]);assert.equal(report.completed,true);
  const labels=['ordinary','resized-editor','resize-return','long','blank','corrected','saved','long-cancel','empty','volume','volume-return','volume-reopen'];
  assert.deepEqual(report.captures.map(c=>c.label),labels,'complete ordered captures');
  const cases=['ordinary','narrow','ordinary','long','long','long','long','long','empty','volume','volume','volume'];
  report.captures.forEach((c,i)=>{assert.equal(c.case,cases[i]);assert.deepEqual(layoutFailures(c.actual,cases[i]),[],c.label);});
  const at=label=>report.captures.find(c=>c.label===label).actual;
  assert.equal(at('resized-editor').hidden,false);assert.equal(at('resized-editor').title,'Alpha');
  assert.equal(at('resize-return').active,'task-1');assert.equal(at('resize-return').hidden,true);
  assert.equal(at('blank').active,'name');assert.equal(at('blank').invalid,'true');assert.equal(at('blank').error,expectations.error);
  assert.equal(at('corrected').invalid,'false');assert.equal(at('corrected').error,'');
  assert.equal(at('saved').status,expectations.saved);assert.equal(at('saved').title,expectations.corrected);
  assert.equal(at('long-cancel').active,'task-1');assert.equal(at('long-cancel').rows[0].text,expectations.corrected+' — Open');
  assert.equal(at('volume-return').active,'task-20');assert.equal(at('volume-reopen').rows[19].text,expectations.lastSaved+' — Open');
  assert.deepEqual(layoutFailures(report.emptyEditor,'empty'),[]);assert.equal(report.emptyEditor.active,'name');assert.equal(report.emptyEditor.hidden,false);
  assert.deepEqual(report.controls.map(c=>c.id),['complete','save','abandon','save']);report.controls.forEach(assertControl);
  assert.deepEqual(report.defects.map(d=>d.variant),Object.keys(expectations.defects));
  const expectedFailures=[['columns','horizontal-overflow'],['row-text-clipped'],['ancestor-clipping']];
  report.defects.forEach((d,i)=>{assert.equal(d.case,expectations.defects[d.variant]);assert.deepEqual(layoutFailures(d.ordinary,'ordinary'),[]);assert.deepEqual(layoutFailures(d.extreme,d.case),expectedFailures[i]);});
  return true;
}

