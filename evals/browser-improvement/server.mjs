// Owned, synthetic loopback fixtures only. No packages, remote assets or backend.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.stringify({version:1,items:[{id:1,title:'Alpha',done:false},{id:2,title:'Beta',done:true}]});
const setup = `<!doctype html><meta charset="utf-8"><title>Disposable storage controls</title><h1>Disposable storage controls</h1><label>Raw store<textarea id="raw"></textarea></label><button id="apply">Apply store</button><button id="read">Read store</button><pre id="stored"></pre><p role="status" id="result"></p><script>raw.value=${JSON.stringify(seed)};apply.onclick=()=>{localStorage.setItem('pocket-board-v1',raw.value);result.textContent='Applied';};read.onclick=()=>{stored.textContent=localStorage.getItem('pocket-board-v1');result.textContent='Read';};</script>`;
const fixture = `<aside aria-label="Controlled instrumentation"><p>Synthetic pre-write rejection and lock scheduling only; not real browser storage denial.</p><button id="reject">Reject next save</button><button id="hold">Hold next lock</button><button id="release">Release held lock</button><button id="deny">Refuse locks</button><output id="probe"></output></aside><script src="/fixture.js"></script>`;
const servers = [];
for (const [target, port] of [['reference',41774],['parity',41775],['improved',41776]]) {
  const routes = new Map([['/index.html',[path.join(target,'index.html'),'text/html']],['/app.js',[path.join(target,'app.js'),'text/javascript']],['/fixture.js',['fixture.js','text/javascript']]]);
  const server = http.createServer((req,res)=>{
    let body, type = 'text/html';
    if (req.url === '/setup.html') body = setup;
    else if (req.url === '/fixture.html') body = fs.readFileSync(path.join(root,target,'index.html'),'utf8').replace('<script src="app.js">', fixture+'<script src="app.js">');
    else if (routes.has(req.url)) {const [file,mime] = routes.get(req.url); body = fs.readFileSync(path.join(root,file)); type = mime;}
    else {res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',type+'; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(body);
  });
  servers.push(server); server.listen(port,'127.0.0.1',()=>console.log(`${target}: http://127.0.0.1:${port}/setup.html`));
}
process.on('SIGINT',()=>{for (const server of servers) server.close();});
