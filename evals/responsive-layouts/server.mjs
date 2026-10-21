// Owned synthetic example only. No dependencies, external resources or user data.
import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
export const longTitle='Review Å猫🙂 '+ 'UnbrokenIdentifier'.repeat(7);
export function fixturePage(name='ordinary',variant='candidate',keep=false) {
  if(!['ordinary','narrow','long','empty','volume'].includes(name)||!['candidate','fixed-columns','clipped-text','clipped-list'].includes(variant))throw Error('Unknown fixture');
  const items=name==='empty'?[]:name==='volume'?Array.from({length:20},(_,i)=>({id:i+1,title:`Task ${i+1} Å`,done:false})):[{id:1,title:name==='long'?longTitle:'Alpha',done:false},{id:2,title:'Beta',done:true}];
  let body=html.replace('<body>',`<body class="${name==='long'?'large ':''}${variant}">`);
  if(name==='long')body=body.replace('>Pocket Board<','>Pocket Board — long heading Å猫🙂<').replace('>New task<','>Create a new task with a long label Å猫🙂<').replace('for="name">Title<','for="name">Full task title — long label Å猫🙂<');
  const config=`<script>${keep?'':`localStorage.setItem('pocket-board-v1',${JSON.stringify(JSON.stringify({version:1,items}))});`}</script>`;
  return body.replace('<!-- Fixture configuration is inserted here by server.mjs before the unchanged application. -->',config);
}
export function createFixtureServer() {
  return http.createServer((req,res)=>{
    try {
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/environment') {
        res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.headers['user-agent']||'unavailable');return;
      }
      if(url.pathname==='/interface-accessibility/app.js') {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(fs.readFileSync(new URL('../interface-accessibility/app.js',import.meta.url)));return;
      }
      if(!['/','/index.html'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return;}
      const page=fixturePage(url.searchParams.get('case')||'ordinary',url.searchParams.get('variant')||'candidate',url.searchParams.get('keep')==='1');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(page);
    } catch {res.writeHead(400);res.end('Unknown fixture');}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const server=createFixtureServer();server.listen(41785,'127.0.0.1',()=>console.log('Disposable fixture: http://127.0.0.1:41785/'));
  process.on('SIGINT',()=>server.close());
}
