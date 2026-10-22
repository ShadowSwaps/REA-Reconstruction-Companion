// Proposed teaching policy, NOT a configuration manager for real profiles.
import fs from 'node:fs';
import {isDeepStrictEqual as equal} from 'node:util';
const defaults = {enabled:true,limit:3,label:'auto'};
const own = (object, key) => Object.hasOwn(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function valid(key, value) {
  return key === 'enabled' ? typeof value === 'boolean' : key === 'limit' ?
    Number.isInteger(value) && value >= 0 && value <= 9 : key === 'label' && typeof value === 'string';
}
export function createPreferences(file) {
  let envelope, stored, draft, applied, session, writable, status, loadStatus;
  function load() {
    session = {}; writable = false; stored = {}; loadStatus = 'invalid';
    // OS read errors propagate; malformed supplied JSON is a tested product case.
    const bytes = fs.readFileSync(file, 'utf8');
    try {
      envelope = JSON.parse(bytes);
      if (!object(envelope) || !object(envelope.prefs)) throw Error('Invalid shape');
      if (![0,1].includes(envelope.version)) { loadStatus = 'unsupported'; }
      else {
        let prefs = structuredClone(envelope.prefs);
        if (envelope.version === 0) {
          if (['enabled','limit','label'].some(key => own(prefs,key))) throw Error('Ambiguous old fields');
          for (const [before, after] of [['on','enabled'],['n','limit'],['caption','label']]) {
            if (own(prefs,before)) { prefs[after] = prefs[before]; delete prefs[before]; }
          }
          // Known fields are ordered for the declared v1 writer; unknowns retained.
          prefs = Object.fromEntries([...Object.keys(defaults), ...Object.keys(prefs).filter(key => !own(defaults,key))]
            .filter(key => own(prefs,key)).map(key => [key,prefs[key]]));
        }
        if (Object.keys(defaults).some(key => own(prefs,key) && !valid(key,prefs[key]))) throw Error('Invalid preference');
        stored = prefs; writable = true; loadStatus = envelope.version === 0 ? 'older' : 'ready';
      }
    } catch { stored = {}; loadStatus = 'invalid'; }
    draft = structuredClone(stored); applied = structuredClone(stored); status = loadStatus;
  }
  function snapshot() {
    const effective = {}, sources = {};
    for (const key of Object.keys(defaults)) {
      const source = own(session,key) ? 'session' : own(applied,key) ? 'profile' : 'default';
      sources[key] = source;
      effective[key] = source === 'session' ? session[key] : source === 'profile' ? applied[key] : defaults[key];
    }
    return structuredClone({draft,applied,effective,sources,dirty:!equal(draft,applied),
      unsaved:!equal(draft,stored),status,bytes:fs.readFileSync(file,'utf8')});
  }
  load();
  return {snapshot, dispatch(action) {
    if (['edit','unset','override'].includes(action.type) &&
        (!own(defaults,action.key) || (action.type !== 'unset' && !valid(action.key,action.value))))
      throw Error('Outside finite action profile');
    switch (action.type) {
      case 'open': break;
      case 'reopen': load(); break;
      case 'override': session[action.key] = action.value; break;
      case 'edit':
      case 'unset':
      case 'reset':
      case 'apply':
      case 'save':
        if (!writable) { status = 'blocked'; break; }
        if (action.type === 'edit') { draft[action.key] = action.value; status = loadStatus; }
        if (action.type === 'unset') { delete draft[action.key]; status = loadStatus; }
        if (action.type === 'reset') {
          for (const key of Object.keys(defaults)) delete draft[key];
          status = loadStatus;
        }
        if (action.type === 'apply') { applied = structuredClone(draft); status = 'applied'; }
        if (action.type === 'save') {
          const next = {...envelope,version:1,prefs:structuredClone(draft)};
          fs.writeFileSync(file,JSON.stringify(next)+'\n','utf8');
          envelope = next; stored = structuredClone(draft); applied = structuredClone(draft);
          loadStatus = 'ready'; status = 'saved';
        }
        break;
      case 'cancel': draft = structuredClone(applied); status = loadStatus; break;
      default: throw Error('Unknown action');
    }
    return snapshot();
  }};
}
