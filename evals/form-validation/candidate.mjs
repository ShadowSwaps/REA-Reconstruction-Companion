// One proposed finite order-form policy; no DOM, storage, network or authorization.
export function createForm(initial, service) {
  const fields = ['title','method','address','low','high','coupon','code'];
  if (!initial || Object.keys(initial).length !== fields.length ||
      fields.some(key => key === 'coupon' ? typeof initial[key] !== 'boolean' : typeof initial[key] !== 'string') ||
      !['pickup','delivery'].includes(initial.method) || fields.some(key => typeof initial[key] === 'string' && initial[key].length > 80) ||
      (initial.method === 'pickup' && initial.address !== '') || (!initial.coupon && initial.code !== '')) throw Error('Invalid fixture');
  let draft = structuredClone(initial), touched = [], attempted = false, serverErrors = {},
    formError = null, pending = null, accepted = null, outcome = null, status = 'editing', revision = 0, nextId = 1;
  const active = field => field === 'address' ? draft.method === 'delivery' : field === 'code' ? draft.coupon : true;
  function validation() {
    const errors = {};
    if (!draft.title.trim()) errors.title = 'Required';
    else if (draft.title.trim().length > 20) errors.title = 'Use at most 20 characters';
    for (const field of ['low','high']) {
      if (!draft[field].trim()) errors[field] = 'Required';
      else if (!/^[1-9]$/.test(draft[field])) errors[field] = 'Use 1-9';
    }
    if (!errors.low && !errors.high && Number(draft.high) < Number(draft.low)) errors.high = 'Must be >= low';
    if (active('address') && !draft.address.trim()) errors.address = 'Required';
    if (active('code')) {
      if (!draft.code.trim()) errors.code = 'Required';
      else if (!/^[A-Z]{2}$/.test(draft.code.trim().toUpperCase())) errors.code = 'Use two letters';
    }
    return errors;
  }
  function payload() {
    return {title:draft.title.trim(),method:draft.method,low:Number(draft.low),high:Number(draft.high),
      ...(active('address') ? {address:draft.address.trim()} : {}),
      ...(active('code') ? {code:draft.code.trim().toUpperCase()} : {})};
  }
  function snapshot() {
    const errors = Object.fromEntries(Object.entries(validation()).filter(([field]) => attempted || touched.includes(field)));
    for (const [field,message] of Object.entries(serverErrors)) if (active(field)) errors[field] = message;
    return structuredClone({draft,touched,attempted,errors,formError,pending,accepted,outcome,status});
  }
  function dispatch(action) {
    if (!action || typeof action !== 'object') throw Error('Invalid action');
    if (action.type === 'edit') {
      const {field,value} = action;
      if (!fields.includes(field) || !active(field) ||
        (field === 'coupon' ? typeof value !== 'boolean' : typeof value !== 'string' || value.length > 80) ||
        (field === 'method' && !['pickup','delivery'].includes(value))) throw Error('Invalid edit');
      draft[field] = value; revision += 1; delete serverErrors[field];
      if (field === 'method') delete serverErrors.address;
      if (field === 'coupon') delete serverErrors.code;
      if (!active('address')) touched = touched.filter(field => field !== 'address');
      if (!active('code')) { draft.code = ''; touched = touched.filter(field => field !== 'code'); }
      if (!pending) status = 'editing';
    } else if (action.type === 'blur') {
      if (!fields.includes(action.field) || !active(action.field)) throw Error('Invalid blur');
      if (!touched.includes(action.field)) touched.push(action.field);
    } else if (action.type === 'submit') {
      if (pending) return snapshot();
      attempted = true;
      if (Object.keys(validation()).length) { status = 'invalid'; return snapshot(); }
      // A corrected or explicit resubmission rechecks server policy in the double.
      serverErrors = {}; formError = null;
      const operation = {id:nextId++,payload:payload(),revision};
      pending = structuredClone(operation); status = 'pending';
      service.start(operation.id,structuredClone(operation.payload),result => {
        if (!['accept','reject','address-reject'].includes(result)) throw Error('Invalid result');
        if (!pending || pending.id !== operation.id) return;
        const applicable = revision === operation.revision;
        pending = null; outcome = {id:operation.id,result};
        if (result === 'accept') {
          accepted = structuredClone(operation.payload);
          status = applicable ? 'accepted' : 'accepted-older-draft';
        } else {
          if (applicable) {
            formError = result === 'reject' ? 'Try again' : 'Choose another address';
            if (result === 'address-reject' && active('address')) serverErrors.address = 'Unavailable address';
          }
          status = applicable ? 'failed' : 'failed-older-draft';
        }
      });
    } else throw Error('Unknown action');
    return snapshot();
  }
  return {dispatch,snapshot};
}
