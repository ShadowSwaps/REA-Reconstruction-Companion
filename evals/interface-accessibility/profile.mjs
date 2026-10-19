// Literal proposed acceptance; kept independent of captures and candidate output.
const seed='{"version":1,"items":[{"id":1,"title":"Alpha","done":false},{"id":2,"title":"Beta","done":true}]}';
const saved='{"version":1,"items":[{"id":1,"title":"Corrected","done":false},{"id":2,"title":"Beta","done":true}]}';
const retry='{"version":1,"items":[{"id":1,"title":"Kept draft","done":false},{"id":2,"title":"Beta","done":true}]}';
export const profile={
  seed:{active:'BODY',hidden:true,rows:['Alpha — Open','Beta — Done'],store:seed},
  'new-focus':{active:'add'},'show-focus':{active:'scope'},'alpha-focus':{active:'task-1'},'beta-focus':{active:'task-2'},reverse:{active:'task-1'},
  editor:{active:'name',title:'Alpha',hidden:false},'done-focus':{active:'complete'},'space-toggle':{active:'complete',done:true},'save-focus':{active:'Save'},'cancel-focus':{active:'abandon'},
  'cancel-return':{active:'task-1',hidden:true},
  blank:{active:'name',invalid:'true',description:'invalid',error:'Title is required.',status:'Not saved',store:seed},
  corrected:{active:'name',invalid:'false',error:'',status:'Unsaved changes'},
  saved:{active:'name',title:'Corrected',status:'Saved',problem:'',store:saved},
  'save-again':{active:'Save',status:'Saved',store:saved},
  rejected:{active:'Save',title:'Kept draft',status:'Save failed',problem:'Save failed. Draft kept; storage or safe tab coordination is unavailable. Retry when available.',store:saved},
  retry:{active:'Save',status:'Saved',problem:'',store:retry},
  'row-return':{active:'task-1',hidden:true,rows:['Kept draft — Open','Beta — Done']},
  'filtered-fallback':{active:'add',hidden:true,rows:['No tasks.']},
  'new-editor':{active:'name',title:'',done:false,hidden:false},'new-cancel':{active:'add',hidden:true}
};
