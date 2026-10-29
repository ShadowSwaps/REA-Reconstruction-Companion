// Proposed local fixture policy. Storage and locking ports are doubles in Node tests.
export const KEY = 'companion-draft-recovery-v1';
export const LOCK = KEY + ':write';
export const TTL = 24 * 60 * 60 * 1000;
export const MAX_BYTES = 65536;
export const MAX_COPIES = 8;
const accounts = ['A', 'B'], documents = ['X', 'Y'];
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const integer = n => Number.isSafeInteger(n) && n >= 1 && n <= 1000000;
const text = s => typeof s === 'string' && s.length <= 2048;
export const recordKey = c => c.account + '/' + c.document;
export const slotKey = c => recordKey(c) + '/' + c.lifetime;
export function context(c) {
  if (!exact(c, ['account','document','lifetime']) || !accounts.includes(c.account) || !documents.includes(c.document) || ![1,2].includes(c.lifetime)) throw new Error('Invalid context');
  return {...c};
}
export function seed() {
  return {schema:1, records:Object.fromEntries(accounts.flatMap(a => documents.map(d => [a+'/'+d, {revision:1,text:a+d+' saved'}]))), drafts:{}};
}
export function decode(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('Invalid or oversized store');
  const db = JSON.parse(raw);
  if (!(exact(db,['schema','records','drafts']) || exact(db,['schema','records','drafts','copies'])) || db.schema !== 1 || !exact(db.records,['A/X','A/Y','B/X','B/Y']) || !db.drafts || typeof db.drafts !== 'object' || Array.isArray(db.drafts)) throw new Error('Invalid store schema');
  for (const r of Object.values(db.records)) if (!exact(r,['revision','text']) || !integer(r.revision) || !text(r.text)) throw new Error('Invalid saved record');
  if (Object.keys(db.drafts).length > 8) throw new Error('Too many drafts');
  for (const [key,d] of Object.entries(db.drafts)) {
    if (!exact(d,['scope','base','text','token','time']) || slotKey(context(d.scope)) !== key || !integer(d.base) || !text(d.text) || typeof d.token !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(d.token) || !Number.isSafeInteger(d.time) || d.time < 0) throw new Error('Invalid draft');
  }
  if ('copies' in db) {
    if (!db.copies || typeof db.copies !== 'object' || Array.isArray(db.copies) || Object.keys(db.copies).length > MAX_COPIES) throw new Error('Invalid copies');
    const decisions=new Set();
    for (const [id,c] of Object.entries(db.copies)) {
      if (!/^[1-8]$/.test(id) || !exact(c,['scope','base','text','source','latest','decision','time']) || !integer(c.base) || !integer(c.latest) || !text(c.text) || !['memory','retained'].includes(c.source) || typeof c.decision!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.decision) || decisions.has(c.decision) || !Number.isSafeInteger(c.time) || c.time<0) throw new Error('Invalid recovered copy');
      context(c.scope);decisions.add(c.decision);
    }
  }
  return db;
}
export const eligible = (draft, now) => !!draft && now >= draft.time && now - draft.time <= TTL;
const bytes = d => d === undefined ? null : JSON.stringify(d);
export class Editor {
  constructor({storage,lock,now=Date.now,token=()=>crypto.randomUUID()}) {
    Object.assign(this,{storage,lock,now,token,epoch:0,sequence:0,queue:Promise.resolve(),state:{status:'Closed',scope:null}});
  }
  read() { const raw = this.storage.getItem(KEY); if (raw === null) throw new Error('Store absent; use setup explicitly'); return decode(raw); }
  async write(change, reject=false, accepted=()=>{}) {
    if (!this.lock) throw new Error('Lock unavailable');
    return this.lock(LOCK, () => {
      const db = this.read(), result = change(db), raw = JSON.stringify(db);
      decode(raw);
      if (reject) throw new Error('Injected pre-write rejection');
      this.storage.setItem(KEY,raw);
      accepted();
      return result;
    });
  }
  open(scope) {
    this.epoch++; this.sequence++; this.pending = null; this.expected = null; this.offered = null; this.choice=null; this.copies=[];
    this.state = {scope:scope ? context(scope):null,text:'',saved:'',base:null,dirty:false,status:scope?'Loading':'Expired',uncertain:false};
    if (!scope) return;
    try {
      const db=this.read(), saved=db.records[recordKey(scope)], draft=db.drafts[slotKey(scope)];
      Object.assign(this.state,{text:saved.text,saved:saved.text,base:saved.revision});
      this.offered = draft ? structuredClone(draft) : null;
      this.copies=Object.entries(db.copies??{}).filter(([,c])=>slotKey(c.scope)===slotKey(scope)).map(([id,c])=>({id,...structuredClone(c),eligible:eligible(c,this.now())}));
      this.state.status = draft ? eligible(draft,this.now()) ? 'Recovery available' : 'Draft quarantined: lifetime clock' : 'Ready';
    } catch(e) {this.state.status='Storage unavailable: '+e.message; this.state.scope=null;}
  }
  edit(value) {
    if (!this.state.scope || this.state.uncertain) return Promise.resolve();
    this.choice=null;this.state.text=value; this.state.dirty=true; this.state.status='Checkpoint pending';
    const epoch=this.epoch, sequence=++this.sequence, scope={...this.state.scope}, base=this.state.base;
    const task = async () => {
      if (epoch !== this.epoch || sequence !== this.sequence) return;
      try {
        const draft={scope,base,text:value,token:this.token(),time:this.now()};
        await this.write(db=>{
          if (epoch !== this.epoch || sequence !== this.sequence) throw new Error('Superseded checkpoint');
          if (bytes(db.drafts[slotKey(scope)]) !== this.expected) throw new Error('Draft slot changed; restore or read latest');
          db.drafts[slotKey(scope)] = draft;
        });
        if (epoch === this.epoch) {this.expected=bytes(draft);this.offered=structuredClone(draft);}
        if (epoch === this.epoch && sequence === this.sequence) this.state.status='Draft checkpointed; not saved';
      } catch(e) {if (epoch === this.epoch && sequence === this.sequence) this.state.status='Checkpoint failed; memory only: '+e.message;}
    };
    this.queue=this.queue.then(task,task); return this.queue;
  }
  restore() {
    if (!this.state.scope || this.state.uncertain) return;
    this.choice=null;
    try {
      const d=this.read().drafts[slotKey(this.state.scope)];
      if (!d || bytes(d)!==bytes(this.offered) || !eligible(d,this.now())) throw new Error('No unchanged eligible draft');
      this.sequence++; this.expected=bytes(d);
      Object.assign(this.state,{text:d.text,base:d.base,dirty:true,status:'Draft restored; not saved'});
    } catch(e) {this.state.status='Restore blocked: '+e.message;}
  }
  async discard() {
    if (!this.state.scope || this.pending || this.state.uncertain) return;
    this.choice=null;
    const epoch=this.epoch, sequence=this.sequence, scope={...this.state.scope};
    try {
      await this.queue;
      if(epoch!==this.epoch || sequence!==this.sequence) throw new Error('Superseded discard');
      const selected=this.expected ?? bytes(this.offered);
      await this.write(db=>{
        if (epoch!==this.epoch || sequence!==this.sequence || bytes(db.drafts[slotKey(scope)])!==selected) throw new Error('Draft changed');
        delete db.drafts[slotKey(scope)];
      });
      if (epoch===this.epoch && sequence===this.sequence) {this.open(scope);this.state.status='Draft discarded';}
    } catch(e) {if(epoch===this.epoch && sequence===this.sequence)this.state.status='Discard blocked: '+e.message;}
  }
  async save({beforeDispatch=async()=>{},afterCommit=async()=>{},reject=false,loseAck=false}={}) {
    if (!this.state.scope || this.pending || this.state.uncertain || !this.state.dirty) return;
    this.choice=null;
    const epoch=this.epoch, sequence=this.sequence, operation={}; this.pending=operation;
    try {
      await this.queue;
      if(epoch!==this.epoch || sequence!==this.sequence) throw new Error('Superseded save');
      const scope={...this.state.scope}, payload=this.state.text, base=this.state.base, expected=this.expected;
      this.state.status='Saving';
      await beforeDispatch();
      const revision=await this.write(db=>{
        if(epoch!==this.epoch || sequence!==this.sequence) throw new Error('Superseded save');
        if(db.records[recordKey(scope)].revision!==base) throw new Error('Newer saved revision; conflict');
        if(expected===null || bytes(db.drafts[slotKey(scope)])!==expected || !eligible(db.drafts[slotKey(scope)],this.now())) throw new Error('Draft not checkpointed or changed');
        if(base>=1000000) throw new Error('Revision limit');
        db.records[recordKey(scope)]={revision:base+1,text:payload}; delete db.drafts[slotKey(scope)]; return base+1;
      },reject);
      await afterCommit();
      if(epoch!==this.epoch) return;
      if(loseAck) {this.state.uncertain=true;this.state.status='Unknown acknowledgement; read latest before retry';return;}
      // A committed effect and its caller's receipt are separate boundaries.
      // Reconcile the saved base without certifying a newer edit as saved.
      Object.assign(this.state,{saved:payload,base:revision});
      if(sequence!==this.sequence) {
        if(this.expected===expected)this.expected=null;
        if(bytes(this.offered)===expected)this.offered=null;
        await this.edit(this.state.text);
        return;
      }
      this.expected=null;this.offered=null;
      Object.assign(this.state,{saved:payload,base:revision,dirty:false,status:'Saved'});
    } catch(e) {if(epoch===this.epoch)this.state.status='Not saved: '+e.message;}
    finally {if(this.pending===operation)this.pending=null;}
  }
  invalidateChoice() { this.choice=null;this.choiceVersion=(this.choiceVersion??0)+1; }
  compare(source='memory') {
    this.invalidateChoice();
    if (!this.state.scope || this.pending || this.state.uncertain) return;
    try {
      if (!['memory','retained'].includes(source)) throw new Error('Invalid source');
      const db=this.read(),scope={...this.state.scope},slot=db.drafts[slotKey(scope)],time=this.now();
      if (source==='memory' && !this.state.dirty) throw new Error('No dirty editor text');
      if (source==='retained' && (!slot || bytes(slot)!==bytes(this.offered) || !eligible(slot,time))) throw new Error('Offered draft changed or expired; read latest');
      const payload=source==='memory'?this.state.text:slot.text,base=source==='memory'?this.state.base:slot.base;
      if (!text(payload) || !integer(base)) throw new Error('Invalid selected text');
      this.choice={decision:this.token(),version:this.choiceVersion,epoch:this.epoch,sequence:this.sequence,scope,source,text:payload,base,slot:bytes(slot),latest:structuredClone(db.records[recordKey(scope)]),time,
        retention:source==='retained'?'Retained checkpoint':this.expected!==null && bytes(slot)===this.expected && slot.text===payload && eligible(slot,time)?'Checkpointed editor text':'Memory only; reload can lose this text'};
      this.state.status='Comparison snapshot; confirm separately to keep both';
      return structuredClone(this.choice);
    } catch(e) {this.state.status='Compare blocked: '+e.message;}
  }
  async keepBoth({beforeDispatch=async()=>{},afterCommit=async()=>{},reject=false,loseAck=false}={}) {
    if (!this.choice || !this.state.scope || this.pending || this.state.uncertain) return;
    const selected=this.choice,epoch=this.epoch,operation={};this.pending=operation;
    let committed=false;
    // Consume the decision before any asynchronous boundary. No replay on failure.
    this.choice=null;
    try {
      this.state.status='Keeping separate copy';
      await beforeDispatch();
      const id=await this.write(db=>{
        if(epoch!==this.epoch || selected.version!==this.choiceVersion || selected.sequence!==this.sequence || slotKey(selected.scope)!==slotKey(this.state.scope) || !eligible(selected,this.now())) throw new Error('Decision superseded or expired; compare again');
        const slot=db.drafts[slotKey(selected.scope)];
        if(bytes(db.records[recordKey(selected.scope)])!==bytes(selected.latest) || bytes(slot)!==selected.slot || (selected.source==='retained' && !eligible(slot,this.now()))) throw new Error('Saved record or draft changed; compare again');
        const copies=db.copies??{};
        if(Object.values(copies).some(c=>c.decision===selected.decision)) throw new Error('Decision already recorded; read copies');
        const id=String(Math.max(0,...Object.keys(copies).map(Number))+1);
        if(Number(id)>MAX_COPIES) throw new Error('Copy capacity reached; nothing removed');
        copies[id]={scope:selected.scope,base:selected.base,text:selected.text,source:selected.source,latest:selected.latest.revision,decision:selected.decision,time:this.now()};
        db.copies=copies;return id;
      },reject,()=>{committed=true;});
      await afterCommit();
      if(epoch!==this.epoch) return;
      if(loseAck) {this.state.uncertain=true;this.state.status='Unknown copy acknowledgement; read latest before another decision';return;}
      // A copy receipt cannot certify the editor or change another pending choice.
      if(selected.sequence===this.sequence)this.state.status='Recovered copy '+id+' retained; original and draft unchanged; editor not saved';
    } catch(e) {
      if(epoch===this.epoch) {
        if(committed) {this.state.uncertain=true;this.state.status='Unknown copy acknowledgement; read latest before another decision';}
        else if(selected.sequence===this.sequence)this.state.status='Copy not confirmed; '+selected.retention+'; editor unchanged: '+e.message;
      }
    }
    finally {if(this.pending===operation)this.pending=null;}
  }
}
