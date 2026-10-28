import {createWorkflow} from '../combined-navigation/candidate.mjs';
import {controlledAdapter} from '../combined-navigation/double.mjs';

// Browser transport around the unchanged proposed model. The port is native in
// app.mjs; Node regressions use an explicitly labelled history double.
export function createBrowserWorkflow(port, changed=()=>{}, run='disposable-run') {
  const service=controlledAdapter(), events=[];
  let epoch=1, pos=0, reconciliation=null, stopped=false, sequence=0;
  const event=(type,details={})=>events.push({sequence:++sequence,type,...structuredClone(details)});
  const stamp=(s=model.snapshot())=>({fixture:'rea-browser-workflow',run,epoch,pos,index:s.index,key:s.entries[s.index].key});
  const owned=e=>e?.fixture === 'rea-browser-workflow' && e.run === run && Number.isSafeInteger(e.pos);
  const current=()=>model.snapshot();
  function fail(reason) {stopped=true;reconciliation=null;event('stopped',{reason});changed();}
  function history(row) {
    if (row.navigation === 'traverse') {
      const native=port.read();
      if (native.state?.epoch === epoch && native.state?.key === row.key && native.url === row.url) {
        pos=native.state.pos;event('accepted-pop',{key:row.key,url:row.url});
      } else {
        const s=current(),delta=row.index-(native.state?.index ?? NaN);
        if (!owned(native.state) || native.state.epoch !== epoch || !Number.isSafeInteger(delta) || delta === 0) return fail('unavailable-traversal');
        reconciliation={kind:'commit',target:{...stamp(s),pos:native.state.pos+delta},url:row.url};
        event('traversal-planned',{delta,key:row.key,url:row.url});
      }
    } else {
      if (row.navigation === 'push') {pos++;port.push(stamp(),row.url);}
      else port.replace(stamp(),row.url);
      event('native-'+row.navigation,{...port.read()});
    }
  }
  const model=createWorkflow({...service,history});
  port.replace(stamp(),'/items/a');event('initial-entry',port.read());
  port.onPop(native=>{
    // URL has ALREADY moved here. Record it before restoring or accepting it.
    event('pop-observed',{...native,committedUrl:current().entries[current().index].url,hidden:true});
    if (stopped) return;
    if (!owned(native.state)) return fail('foreign-entry');
    if (reconciliation) {
      const pending=reconciliation;
      if (native.state.pos !== pending.target.pos || native.state.epoch !== pending.target.epoch || native.state.key !== pending.target.key || native.url !== pending.url) return fail('unexpected-pop-during-reconciliation');
      reconciliation=null;pos=native.state.pos;
      event('reconciled',{kind:pending.kind,...native});
      changed();return;
    }
    const s=current(),entry=s.entries[s.index],source={...stamp(s)};
    const target=s.entries[native.state.index];
    const obsolete=native.state.epoch !== epoch;
    if (!obsolete && (!target || target.key !== native.state.key || target.url !== native.url || native.state.pos-pos !== native.state.index-s.index)) return fail('entry-identity-mismatch');
    const proposal={type:'traverse',delta:native.state.index-s.index};
    if (obsolete || s.dirty || s.saving !== null || s.outcomes.some(r=>['pending','unknown'].includes(r.status)) || !s.active) {
      reconciliation={kind:'restore',target:source,url:entry.url,proposal:obsolete ? null : proposal};
      // Register this exact native request before any pending acknowledgement can
      // release an older approval. The model guards it; the dialog stays hidden
      // until the source entry is restored. Do not request it again on Resume.
      if (reconciliation.proposal) model.dispatch(reconciliation.proposal);
      event('restoration-issued',{delta:pos-native.state.pos,obsolete,source,observed:native.state});
      // A visible operator gate freezes this real intermediate DOM state. It
      // controls when history.go runs; it does not emulate the browser's pop.
      changed();
    } else {model.dispatch(proposal);changed();}
  });
  function act(action) {
    if (stopped || reconciliation) return false;
    model.dispatch(action);
    if (action.type === 'context') {
      epoch++;port.replace(stamp(),'/items/a');event('context-entry',port.read());
      if (action.active && action.read === true) model.dispatch({type:'read'});
    }
    event('action',{action});changed();return true;
  }
  model.dispatch({type:'read'});
  return {
    act,
    resume() {
      if (stopped || !reconciliation || reconciliation.issued) return false;
      reconciliation.issued=true;
      const delta=reconciliation.target.pos-port.read().state.pos;
      event('reconciliation-issued',{delta});port.go(delta);changed();return true;
    },
    commit(op) {service.commit(op);event('service-commit',{op});changed();},
    async finish(op,failed=false) {
      const row=service.inspect().calls.find(r=>r.op === op);
      if (!row) throw Error('Unknown browser operation');
      const effects=service.inspect().effects.filter(e=>e.kind === 'write' && e.scope === row.scope && e.url === row.url);
      const last=effects.at(-1),text=last?.text ?? (row.scope === 'a/x' ? row.url.at(-1).toUpperCase()+'0' : 'Q0');
      service.finish(op,{text,version:last?.version ?? 1},failed);
      await model.settle(op);event('response',{op,failed});changed();
    },
    snapshot() {return structuredClone({model:current(),native:port.read(),epoch,pos,reconciliation,stopped,events,service:service.inspect()});}
  };
}
