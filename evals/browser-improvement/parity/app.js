// Independent MIT reconstruction of the evidence-linked Pocket Board contract.
const ui = Object.fromEntries(['add','notice','problem','scope','rows','prompt','form','name','complete','invalid','abandon'].map(id=>[id,document.getElementById(id)]));
const storageKey = 'pocket-board-v1';
let records = new Map([[1,{id:1,title:'Alpha',done:false}],[2,{id:2,title:'Beta',done:true}]]);
let edit = {mode:'idle',id:null};
try {
  const serialized = localStorage.getItem(storageKey);
  if (serialized !== null) {
    const decoded = JSON.parse(serialized);
    if (!decoded || decoded.version !== 1 || !Array.isArray(decoded.items)) throw new Error('Invalid store');
    const loaded = new Map();
    for (const task of decoded.items) {
      if (!task || !Number.isSafeInteger(task.id) || task.id <= 0 || typeof task.title !== 'string' || task.title.trim().length === 0 || typeof task.done !== 'boolean' || loaded.has(task.id)) throw new Error('Invalid task');
      loaded.set(task.id,{id:task.id,title:task.title,done:task.done});
    }
    records = loaded;
  }
} catch { ui.problem.textContent = 'Storage could not be read.'; }
function paintRows() {
  const nodes=[];
  for (const task of records.values()) {
    if (ui.scope.value !== 'all' && task.done !== (ui.scope.value === 'done')) continue;
    const row = document.createElement('button'); row.type='button';
    row.append(document.createTextNode(`${task.title} — ${task.done ? 'Done' : 'Open'}`));
    row.setAttribute('aria-pressed',String(edit.mode === 'existing' && edit.id === task.id));
    row.addEventListener('click',()=>begin(task.id)); nodes.push(row);
  }
  ui.rows.replaceChildren(...(nodes.length ? nodes : [document.createTextNode('No tasks.')]));
}
function begin(id) {
  const task = records.get(id);
  edit = task ? {mode:'existing',id} : {mode:'new',id:null};
  ui.form.hidden=false; ui.prompt.hidden=true; ui.name.value=task?.title ?? ''; ui.complete.checked=task?.done ?? false;
  ui.invalid.textContent=''; ui.notice.textContent=task ? 'Editing task' : 'New task';
  paintRows(); ui.name.focus();
}
ui.add.addEventListener('click',()=>begin(null));
ui.scope.addEventListener('change',paintRows);
ui.abandon.addEventListener('click',()=>{
  edit={mode:'idle',id:null}; ui.form.hidden=true; ui.prompt.hidden=false;
  ui.invalid.textContent=''; ui.notice.textContent='Cancelled'; paintRows();
});
ui.form.addEventListener('submit',event=>{
  event.preventDefault(); const title=ui.name.value.trim();
  if (title.length === 0) {ui.invalid.textContent='Title is required.';ui.name.focus();return;}
  const id=edit.mode === 'existing' ? edit.id : Math.max(0,...records.keys())+1;
  const changed=new Map(records); changed.set(id,{id,title,done:ui.complete.checked});
  try {localStorage.setItem(storageKey,JSON.stringify({version:1,items:[...changed.values()]}));}
  catch {ui.problem.textContent='Save failed.';return;}
  records=changed; edit={mode:'existing',id}; ui.name.value=title;
  ui.invalid.textContent=''; ui.problem.textContent=''; ui.notice.textContent='Saved'; paintRows();
});
paintRows();
