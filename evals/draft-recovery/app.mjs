import {Editor,KEY,LOCK,seed} from './policy.mjs';
const $=id=>document.getElementById(id);
// Access the native storage getter lazily: a native SecurityError is observable.
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const lock=navigator.locks ? (name,fn)=>navigator.locks.request(name,{mode:'exclusive'},fn) : null;
const editor=new Editor({storage,lock});
let reject=false,hold=false,loseAck=false,release=null;
const selected=()=>({account:$('account').value,document:$('document').value,lifetime:Number($('lifetime').value)});
function render() {
  const s=editor.state;
  $('status').textContent=s.status;
  $('editor').hidden=!s.scope;
  $('saved').textContent=s.saved;
  if($('text').value!==s.text)$('text').value=s.text;
  $('text').disabled=s.uncertain;
  $('save').disabled=!s.scope || !!editor.pending || s.uncertain || !s.dirty;
  $('restore').disabled=!s.scope || !editor.offered || !!editor.pending || s.uncertain;
  $('discard').disabled=!s.scope || !!editor.pending || s.uncertain;
  $('release').disabled=!release;
  $('state').textContent=JSON.stringify({...s,pending:!!editor.pending,offered:editor.offered?{scope:editor.offered.scope,base:editor.offered.base,time:editor.offered.time}:null},null,2);
}
$('open').onclick=()=>{editor.open(selected());render();};
$('latest').onclick=()=>{editor.open(editor.state.scope);render();};
$('expire').onclick=()=>{editor.open(null);render();};
$('text').oninput=()=>{const done=editor.edit($('text').value);render();done.finally(render);};
$('restore').onclick=()=>{editor.restore();render();};
$('discard').onclick=async()=>{await editor.discard();render();};
$('reject').onclick=()=>{reject=true;$('status').textContent='Next save: injected rejection';};
$('hold').onclick=()=>{hold=true;$('status').textContent='Next save: controlled hold before dispatch';};
$('lose').onclick=()=>{loseAck=true;$('status').textContent='Next save: controlled acknowledgement loss';};
$('release').onclick=()=>{const done=release;release=null;done?.();render();};
$('save').onclick=async()=>{
  const options={reject,loseAck};reject=false;loseAck=false;
  if(hold){hold=false;options.beforeDispatch=()=>new Promise(resolve=>{release=resolve;render();});}
  const done=editor.save(options);render();await done;render();
};
$('seed').onclick=()=>{$('raw').value=JSON.stringify(seed());};
$('apply').onclick=async()=>{
  try{if(!lock)throw new Error('Lock unavailable');await lock(LOCK,()=>storage.setItem(KEY,$('raw').value));$('stored').textContent=storage.getItem(KEY);editor.open(selected());render();}
  catch(e){$('status').textContent='Setup failed: '+e.message;}
};
$('read').onclick=()=>{try{$('stored').textContent=storage.getItem(KEY)??'(absent)';}catch(e){$('stored').textContent='Read failed: '+e.message;}};
editor.open(selected());render();
