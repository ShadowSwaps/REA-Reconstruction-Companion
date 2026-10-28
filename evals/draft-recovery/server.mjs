import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const routes=new Map([['/','index.html'],['/app.mjs','app.mjs'],['/policy.mjs','policy.mjs']]);
export function createServer() {
  return http.createServer((req,res)=>{
    if(req.method!=='GET' || !/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')){res.writeHead(403);res.end('Loopback GET only');return;}
    const url=new URL(req.url,'http://127.0.0.1'),file=routes.get(url.pathname);
    if(url.search || !file){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'X-Content-Type-Options':'nosniff'});
    res.end(fs.readFileSync(new URL(file,import.meta.url)));
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const server=createServer();server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,origin:`http://127.0.0.1:${server.address().port}`})));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
