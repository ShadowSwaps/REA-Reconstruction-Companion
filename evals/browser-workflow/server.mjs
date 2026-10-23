// Dependency-free loopback-only server, explicit public fixture allowlist.
import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
const allowed=new Set(['evals/browser-workflow/index.html','evals/browser-workflow/app.mjs','evals/browser-workflow/controller.mjs','evals/combined-navigation/candidate.mjs','evals/combined-navigation/double.mjs']);
export function createServer() {
  return http.createServer((req,res)=>{
    if (req.method !== 'GET' || !/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '')) {res.writeHead(403);res.end('Loopback GET only');return;}
    const url=new URL(req.url,'http://127.0.0.1');
    const file=/^\/items\/[abc]$/.test(url.pathname) ? 'evals/browser-workflow/index.html' : url.pathname.slice(1);
    if (url.search || !allowed.has(file)) {res.writeHead(404);res.end('Fixture route not found');return;}
    const body=fs.readFileSync(new URL(file,root));
    res.writeHead(200,{'Content-Type':file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'X-Content-Type-Options':'nosniff'});res.end(body);
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server=createServer();server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,origin:`http://127.0.0.1:${server.address().port}`,entry:'/items/a',scope:'task-owned disposable fixture'})));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
}
