// Separate accessibility candidate based on the frozen Pocket Board improved fixture.
const ids = ['add','notice','problem','scope','rows','prompt','form','name','complete','invalid','abandon','latest','copy','recovery'];
const ui = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const storageKey = 'pocket-board-v1', lockName = 'pocket-board-v1:write';
const seed = () => [{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}];
function decode(raw) {
  if (raw === null) return seed();
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.items)) throw new Error('Invalid store');
  const seen = new Set();
  return data.items.map(task=>{
    if (!task || !Number.isSafeInteger(task.id) || task.id <= 0 || typeof task.title !== 'string' || !task.title.trim() || typeof task.done !== 'boolean' || seen.has(task.id)) throw new Error('Invalid task');
    seen.add(task.id);return {id:task.id,title:task.title,done:task.done};
  });
}
let openerId = null;
let records = seed(), baseline, known = false, selected = null, busy = false, conflict = false;
function load() {
  // A successful read of malformed bytes is distinct from an unreadable store.
  const raw = localStorage.getItem(storageKey);
  let next;
  try {next=decode(raw);} catch {next=seed();ui.problem.textContent='Storage could not be read.';}
  records=next;baseline=raw;known=true;
}
try {load();} catch {ui.problem.textContent='Storage could not be read.';}
function paint() {
  const nodes=[];
  for (const task of records) {
    if (ui.scope.value !== 'all' && task.done !== (ui.scope.value === 'done')) continue;
    const row=document.createElement('button');row.type='button';row.textContent=`${task.title} — ${task.done ? 'Done' : 'Open'}`;
    row.id=`task-${task.id}`;row.disabled=busy;row.setAttribute('aria-pressed',String(selected === task.id));row.addEventListener('click',()=>begin(task));nodes.push(row);
  }
  ui.rows.replaceChildren(...(nodes.length ? nodes : [document.createTextNode('No tasks.')]));
  ui.recovery.hidden=!conflict;
  for (const node of [ui.add,ui.scope,...ui.form.elements,ui.latest,ui.copy]) node.disabled=busy;
}
function begin(task) {
  if (busy) return;
  // Recovery is explicit: selecting another row must not silently discard a conflict draft.
  if (conflict) {ui.problem.textContent='Keep this draft as a new task, or Cancel before opening another task.';return;}
  openerId=task?.id ?? null;selected=openerId;ui.form.hidden=false;ui.prompt.hidden=true;
  ui.name.value=task?.title ?? '';ui.complete.checked=task?.done ?? false;
  clearInvalid();ui.notice.textContent=task ? 'Editing task' : 'New task';paint();ui.name.focus();
}
function clearInvalid() {ui.invalid.textContent='';ui.name.setAttribute('aria-invalid','false');}
ui.name.addEventListener('input',()=>{if(ui.name.value.trim())clearInvalid();});
ui.add.addEventListener('click',()=>begin(null));ui.scope.addEventListener('change',paint);
for (const field of [ui.name,ui.complete]) field.addEventListener('input',()=>{
  if (!busy) ui.notice.textContent=conflict ? 'Conflict — draft kept' : 'Unsaved changes';
});
ui.abandon.addEventListener('click',()=>{
  if (busy) return;
  try {load();} catch {ui.notice.textContent='Read failed — draft kept';ui.problem.textContent='Could not load latest. Draft kept.';return;}
  selected=null;conflict=false;ui.form.hidden=true;ui.prompt.hidden=false;clearInvalid();ui.notice.textContent='Cancelled';paint();
  (document.getElementById(`task-${openerId}`) ?? ui.add).focus();
});
ui.latest.addEventListener('click',()=>{
  if (busy) return;
  try {
    // A malformed latest value must not become a seed snapshot during recovery.
    const raw=localStorage.getItem(storageKey), next=decode(raw);
    records=next;baseline=raw;known=true;
    ui.notice.textContent='Latest loaded — draft kept';ui.problem.textContent='Review latest tasks. Save draft as new, or Cancel and reopen a task.';paint();
  } catch {ui.notice.textContent='Read failed — draft kept';ui.problem.textContent='Could not load latest. Draft kept.';}
});
async function save(asNew) {
  if (busy) return;
  clearInvalid();
  const title=ui.name.value.trim(), done=ui.complete.checked;
  if (!title) {ui.name.setAttribute('aria-invalid','true');ui.invalid.textContent='Title is required.';ui.notice.textContent='Not saved';ui.name.focus();return;}
  if (conflict && !asNew) {ui.notice.textContent='Conflict — draft kept';ui.problem.textContent='Save draft as new, or Cancel and reopen a task.';return;}
  const invokingControl=document.activeElement;
  busy=true;ui.notice.textContent='Saving…';ui.problem.textContent='';paint();
  try {
    if (!globalThis.isSecureContext || typeof navigator.locks?.request !== 'function') throw new Error('Locks unavailable');
    await navigator.locks.request(lockName,{mode:'exclusive'},()=>{
      const raw=localStorage.getItem(storageKey);
      if (!asNew && (!known || raw !== baseline)) {
        conflict=true;ui.notice.textContent='Conflict — draft kept';ui.problem.textContent='Another tab changed stored tasks. Load latest to review; your draft is kept.';return;
      }
      // Recovery appends to the latest valid store; ordinary save uses its checked snapshot.
      const source=asNew ? decode(raw) : records;
      let id=selected;
      if (asNew || id === null) {
        const max=source.reduce((n,task)=>Math.max(n,task.id),0);
        if (max === Number.MAX_SAFE_INTEGER) throw new Error('No safe ID available');
        id=max+1;
      }
      const task={id,title,done};
      const next=asNew || selected === null ? [...source,task] : source.map(item=>item.id === id ? task : item);
      const serialized=JSON.stringify({version:1,items:next});
      localStorage.setItem(storageKey,serialized);
      // Publish memory/success only after storage accepts the write.
      records=next;baseline=serialized;known=true;selected=id;conflict=false;ui.name.value=title;
      ui.notice.textContent='Saved';ui.problem.textContent='';
    });
  } catch {ui.notice.textContent='Save failed';ui.problem.textContent='Save failed. Draft kept; storage or safe tab coordination is unavailable. Retry when available.';}
  finally {
    busy=false;paint();
    // Disabling/hiding controls can drop browser focus. Respect a move elsewhere.
    if (document.activeElement === document.body) {
      const target=invokingControl === ui.copy && !conflict ? ui.name : invokingControl;
      if (target?.isConnected && !target.disabled && target !== document.body) target.focus();
    }
  }
}
ui.form.addEventListener('submit',event=>{event.preventDefault();void save(false);});
ui.copy.addEventListener('click',()=>{void save(true);});
paint();
