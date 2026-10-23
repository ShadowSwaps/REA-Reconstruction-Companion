// Independent synthetic sink: records actual calls, never router status labels.
export function recordingEffects() {
  const records = [];
  return {apply(command,context) {
    if (command === 'save') records.push({kind:'save',revision:context.revision});
    else if (command === 'request-delete') records.push({kind:'open-confirm',selection:[...context.selection]});
    else if (command === 'confirm-delete') records.push({kind:'delete',selection:[...context.selection]});
    else if (command === 'cancel') records.push({kind:'close-confirm'});
    else if (command === 'next') records.push({kind:'navigate',selection:[{a:'b',b:'c',c:'c'}[context.selection[0]]]});
    else throw Error('Unknown synthetic command');
  },inspect:() => structuredClone(records)};
}
