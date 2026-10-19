// Deterministic application-transition double. No native keyboard/AX/speech engine.
import fs from 'node:fs';
import vm from 'node:vm';
import {environment,tick} from '../browser-improvement/model-harness.mjs';
export {environment,tick};
export const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
export function app(code=source,env=environment()) {
  const document={activeElement:null};
  class Element {
    constructor(id=''){this.id=id;this.value='';this.checked=false;this._hidden=false;this._disabled=false;this.textContent='';this.children=[];this.attrs={};this.events={};this.isConnected=true;}
    set hidden(v){this._hidden=v;if(v&&this.elements?.includes(document.activeElement))document.activeElement=document.body;}
    get hidden(){return this._hidden;}
    set disabled(v){this._disabled=v;if(v&&document.activeElement===this)document.activeElement=document.body;}
    get disabled(){return this._disabled;}
    addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
    dispatch(name){if(!this.disabled)for(const fn of this.events[name]??[])fn({preventDefault(){}});}
    setAttribute(k,v){this.attrs[k]=v;}
    focus(){if(this.isConnected&&!this.disabled)document.activeElement=this;}
    replaceChildren(...nodes){for(const n of this.children){n.isConnected=false;if(document.activeElement===n)document.activeElement=document.body;}this.children=nodes;}
  }
  const ui=Object.fromEntries(['add','notice','problem','scope','rows','prompt','form','name','complete','invalid','abandon','latest','copy','recovery','submit','elsewhere'].map(id=>[id,new Element(id)]));
  document.body=new Element('BODY');document.activeElement=document.body;
  document.getElementById=id=>ui[id]??ui.rows.children.find(n=>n.id===id)??null;
  document.createElement=()=>new Element();document.createTextNode=text=>({textContent:text});
  ui.scope.value='all';ui.form.elements=[ui.name,ui.complete,ui.submit,ui.abandon];
  ui.name.attrs['aria-invalid']='false';ui.name.attrs['aria-describedby']='invalid';
  const storage={getItem(){if(env.store.unreadable)throw Error('Denied');return env.store.raw;},setItem(key,value){if(env.store.reject){env.store.reject=false;throw Error('Controlled rejection');}env.store.raw=value;env.store.writes++;}};
  vm.runInNewContext(code,{document,localStorage:storage,navigator:{locks:env.locks},isSecureContext:true});
  return {ui,env,document,
    open(index){ui.rows.children[index].focus();ui.rows.children[index].dispatch('click');},
    click(id){ui[id].focus();ui[id].dispatch('click');},
    input(value){ui.name.value=value;ui.name.dispatch('input');},
    filter(value){ui.scope.value=value;ui.scope.dispatch('change');},
    async save(from='name'){ui[from].focus();ui.form.dispatch('submit');await tick();}
  };
}
