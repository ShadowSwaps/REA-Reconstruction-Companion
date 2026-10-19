// Explicit routes for the owned disposable fixture. No remote resources/dependencies.
import http from 'node:http';
import fs from 'node:fs';
const seed='{"version":1,"items":[{"id":1,"title":"Alpha","done":false},{"id":2,"title":"Beta","done":true}]}';
const setup=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Disposable storage controls</title><h1>Disposable storage controls</h1><label>Raw store<textarea id="raw"></textarea></label><button id="apply">Apply store</button><button id="read">Read store</button><pre id="stored"></pre><p role="status" id="result"></p><script>raw.value=${JSON.stringify(seed)};apply.onclick=()=>{localStorage.setItem('pocket-board-v1',raw.value);result.textContent='Applied';};read.onclick=()=>{stored.textContent=localStorage.getItem('pocket-board-v1');result.textContent='Read';};</script></html>`;
const instrumentation='<aside aria-label="Controlled instrumentation"><p>Synthetic pre-native-write rejection only.</p><button id="reject">Reject next save</button></aside><script src="/fixture.js"></script>';
const rejection="const nativeSet=Storage.prototype.setItem;let reject=false;document.getElementById('reject').onclick=()=>{reject=true;};Storage.prototype.setItem=function(key,value){if(reject&&key==='pocket-board-v1'){reject=false;throw Error('Controlled rejection');}return nativeSet.call(this,key,value);};";
const servers=[];
for(const [target,port] of [['baseline',41780],['candidate',41781]]) {
  const base=target==='baseline'?new URL('../browser-improvement/improved/',import.meta.url):new URL('./',import.meta.url);
  const server=http.createServer((req,res)=>{
    let body,type='text/html';
    if(req.url==='/setup.html')body=setup;
    else if(req.url==='/index.html'||req.url==='/fixture.html') {
      body=fs.readFileSync(new URL('index.html',base),'utf8');
      if(req.url==='/fixture.html')body=body.replace('<script src="app.js">',instrumentation+'<script src="app.js">');
    } else if(req.url==='/app.js'){body=fs.readFileSync(new URL('app.js',base));type='text/javascript';}
    else if(req.url==='/fixture.js'){body=rejection;type='text/javascript';}
    else {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);
  });
  servers.push(server);server.listen(port,'127.0.0.1',()=>console.log(`${target}: http://127.0.0.1:${port}/setup.html`));
}
process.on('SIGINT',()=>{for(const server of servers)server.close();});
