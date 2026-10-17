// Minimal DOM/storage test double. This is not a browser or a Web Locks implementation.
import vm from 'node:vm';
import fs from 'node:fs';
export const seed = {version:1,items:[{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}]};
export const tick = () => new Promise(resolve=>setImmediate(resolve));
export function environment(raw=JSON.stringify(seed)) {
  const store={raw,writes:0,reject:false,unreadable:false};
  let tail=Promise.resolve(), hold=false, release;
  const locks={requests:0,entered:0,deny:false,
    hold(){hold=true;},release(){release?.();release=undefined;},
    request(name,options,callback){
      if (name !== 'pocket-board-v1:write' || options.mode !== 'exclusive') throw Error('Unexpected lock contract');
      this.requests++;
      if(this.deny)return Promise.reject(Error('Denied'));
      const run=tail.then(async()=>{this.entered++;if(hold){hold=false;await new Promise(r=>{release=r;});}return callback({name,mode:'exclusive'});});
      tail=run.catch(()=>{});return run;
    }
  };
  return {store,locks};
}
class Element {
  constructor(id=''){this.id=id;this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.textContent='';this.children=[];this.attrs={};this.events={};}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  dispatch(name){if(this.disabled)return;this['on'+name]?.({preventDefault(){}});for(const fn of this.events[name]??[])fn({preventDefault(){}});}
  append(node){this.children.push(node);this.textContent+=node.textContent;}
  replaceChildren(...nodes){this.children=nodes;this.textContent=nodes.map(n=>n.textContent).join('');}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){this.focused=true;}
}
export function app(target,env=environment(),{secure=true,capability=true}={}) {
  const original=target==='reference';
  const map=original ? {add:'new',notice:'status',problem:'error',scope:'filter',rows:'tasks',prompt:'hint',form:'editor',name:'title',complete:'done',invalid:'validation',abandon:'cancel'} : {};
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
  const ui=Object.fromEntries(['add','notice','problem','scope','rows','prompt','form','name','complete','invalid','abandon','latest','copy','recovery'].map(id=>[id,get(map[id]??id)]));
  ui.notice.textContent='Ready';ui.scope.value='all';ui.form.hidden=true;ui.recovery.hidden=true;
  ui.form.elements=[ui.name,ui.complete,ui.abandon,get('submit')];
  const storage={getItem(){if(env.store.unreadable)throw Error('Read denied');return env.store.raw;},setItem(key,value){if(env.store.reject){env.store.reject=false;throw Error('Write denied');}env.store.raw=value;env.store.writes++;}};
  const document={getElementById:get,createElement:()=>new Element(),createTextNode:text=>({textContent:text})};
  const source=fs.readFileSync(new URL(`./${target}/app.js`,import.meta.url),'utf8');
  vm.runInNewContext(source,{document,localStorage:storage,navigator:{locks:capability ? env.locks : undefined},isSecureContext:secure});
  return {env,ui,
    open(index){ui.rows.children[index].dispatch('click');},
    click(name){ui[name].dispatch('click');},
    input(title,done=ui.complete.checked){ui.name.value=title;ui.complete.checked=done;ui.name.dispatch('input');},
    filter(value){ui.scope.value=value;ui.scope.dispatch('change');},
    async save(){ui.form.dispatch('submit');await tick();},
    snapshot(){return {rows:ui.rows.children.map(n=>n.textContent),selected:ui.rows.children.map(n=>n.attrs?.['aria-pressed']),title:ui.name.value,done:ui.complete.checked,status:ui.notice.textContent,error:ui.problem.textContent,invalid:ui.invalid.textContent,hidden:ui.form.hidden,recovery:!ui.recovery.hidden,stored:env.store.raw};}
  };
}
