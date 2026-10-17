// Explicitly loaded only by /fixture.html; plain /index.html has no injection.
(() => {
  let reject = false, hold = false, deny = false, release, requests = 0, entered = 0, writes = 0;
  const probe = document.getElementById('probe');
  const update = () => {probe.textContent = JSON.stringify({secure:isSecureContext,locks:typeof navigator.locks?.request === 'function',reject,hold,deny,requests,entered,writes,held:!!release});};
  document.getElementById('reject').onclick = () => {reject=true;update();};
  document.getElementById('hold').onclick = () => {hold=true;update();};
  document.getElementById('deny').onclick = () => {deny=true;update();};
  document.getElementById('release').onclick = () => {release?.();release=undefined;update();};
  const write = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key,value) {
    if (this === localStorage && key === 'pocket-board-v1') {
      if (reject) {reject=false;update();throw new DOMException('Controlled rejection before native write','QuotaExceededError');}
      write.call(this,key,value);writes++;update();return;
    }
    return write.call(this,key,value);
  };
  if (navigator.locks) {
    const request = navigator.locks.request.bind(navigator.locks);
    navigator.locks.request = (name,options,callback) => {
      requests++;update();
      if (deny) return Promise.reject(new Error('Controlled lock refusal'));
      return request(name,options,async lock => {
        entered++;update();
        if (hold) {hold=false;await new Promise(resolve=>{release=resolve;update();});}
        return callback(lock);
      });
    };
  }
  update();
})();
