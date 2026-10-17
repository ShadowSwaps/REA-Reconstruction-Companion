// Original MIT-licensed trial fixture. Local synthetic data only.
const key = 'pocket-board-v1';
const $ = id => document.getElementById(id);
let items = [{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}];
let selected = null;
try {
  const raw = localStorage.getItem(key);
  if (raw !== null) {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.items) || data.items.some(x => !x || !Number.isSafeInteger(x.id) || x.id < 1 || typeof x.title !== 'string' || !x.title.trim() || typeof x.done !== 'boolean') || new Set(data.items.map(x=>x.id)).size !== data.items.length) throw Error('schema');
    items = data.items;
  }
} catch { $('error').textContent = 'Storage could not be read.'; }
function render() {
  const shown = items.filter(x => $('filter').value === 'all' || x.done === ($('filter').value === 'done'));
  $('tasks').replaceChildren();
  for (const item of shown) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = item.title + (item.done ? ' — Done' : ' — Open');
    button.setAttribute('aria-pressed', String(selected === item.id));
    button.onclick = () => open(item);
    $('tasks').append(button);
  }
  if (!shown.length) $('tasks').textContent = 'No tasks.';
}
function open(item) {
  selected = item?.id ?? null;
  $('hint').hidden = true; $('editor').hidden = false;
  $('title').value = item?.title ?? ''; $('done').checked = item?.done ?? false;
  $('validation').textContent = ''; $('status').textContent = item ? 'Editing task' : 'New task';
  render(); $('title').focus();
}
$('new').onclick = () => open(null);
$('filter').onchange = render;
$('cancel').onclick = () => {
  selected = null; $('editor').hidden = true; $('hint').hidden = false;
  $('validation').textContent = ''; $('status').textContent = 'Cancelled'; render();
};
$('editor').onsubmit = event => {
  event.preventDefault();
  const title = $('title').value.trim();
  if (!title) { $('validation').textContent = 'Title is required.'; $('title').focus(); return; }
  const id = selected ?? (Math.max(0, ...items.map(x=>x.id)) + 1);
  const next = {id,title,done:$('done').checked};
  const updated = selected === null ? [...items,next] : items.map(x=>x.id === id ? next : x);
  try { localStorage.setItem(key, JSON.stringify({version:1,items:updated})); }
  catch { $('error').textContent = 'Save failed.'; return; }
  items = updated; selected = id; $('title').value = title;
  $('validation').textContent = ''; $('error').textContent = ''; $('status').textContent = 'Saved'; render();
};
render();
