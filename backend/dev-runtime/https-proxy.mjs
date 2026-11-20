import https from 'node:https';
import http from 'node:http';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const [portText, upstreamText, certPath, keyPath] = process.argv.slice(2);
const port=Number(portText);
const upstreams = String(upstreamText).split(',').map(s => Number(s.trim())).filter(p => Number.isInteger(p) && p >= 1024 && p <= 65535);
if(!Number.isInteger(port)||port<1024||port>65535||upstreams.length===0||!process.env.EVAL_PROXY_KEY) throw new Error('Invalid isolated proxy configuration');
const allowedHosts = new Set([
  `127.0.0.1:${port}`,
  `localhost:${port}`,
  ...(process.env.EVAL_ALLOWED_HOSTS ? process.env.EVAL_ALLOWED_HOSTS.split(',').map(h => h.trim().includes(':') ? h.trim() : `${h.trim()}:${port}`) : [])
]);
const uiRoot=fileURLToPath(new URL('../../frontend/dist/',import.meta.url));
let rrIndex = 0;
const server=https.createServer({cert:readFileSync(certPath),key:readFileSync(keyPath),minVersion:'TLSv1.2'},(request,response)=>{
  if(!allowedHosts.has(request.headers.host) || Object.keys(request.headers).some(name=>name==='forwarded'||name==='x-http-method-override'||name.startsWith('x-forwarded-')||name.startsWith('x-eval-'))){
    response.writeHead(400,{'Content-Type':'application/json'});response.end('{"error":"invalid_proxy_request"}');return;
  }
  if(process.env.EVAL_UI_ENABLED==='1' && request.method==='GET') {
    const path=new URL(request.url,`https://${request.headers.host || `127.0.0.1:${port}`}`).pathname;
    // Browser auxiliary requests must not bootstrap a competing anonymous session.
    if(path==='/favicon.ico') { response.writeHead(204,{'Cache-Control':'no-store'});response.end();return; }
    const filename=path==='/'?'index.html':/^\/assets\/[A-Za-z0-9_-]+\.(js|css|png)$/.test(path)?path.slice(1):null;
    if(filename!==null) {
      const target=resolve(uiRoot,filename);
      if(!existsSync(target)||!realpathSync(target).startsWith(realpathSync(uiRoot)+sep)) {
        response.writeHead(404,{'Content-Type':'application/json'});response.end('{"error":"ui_asset_unavailable"}');return;
      }
      const mime=filename.endsWith('.png')?'image/png':filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':'text/html';
      response.writeHead(200,{'Content-Type':`${mime}; charset=utf-8`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
      response.end(readFileSync(target));return;
    }
  }
  const upstream = upstreams[rrIndex++ % upstreams.length];
  const headers={...request.headers,host:`127.0.0.1:${upstream}`,'x-eval-proxy-key':process.env.EVAL_PROXY_KEY,'x-forwarded-host':request.headers.host};
  for(const name of String(request.headers.connection??'').split(',')) delete headers[name.trim().toLowerCase()];
  delete headers.connection;delete headers['proxy-authorization'];delete headers['proxy-connection'];
  // Reinstall the server-owned secret after removing client hop-by-hop headers.
  headers['x-eval-proxy-key']=process.env.EVAL_PROXY_KEY;
  const forwarded=http.request({hostname:'127.0.0.1',port:upstream,method:request.method,path:request.url,headers},result=>{
    response.writeHead(result.statusCode??503,result.headers);result.pipe(response);
  });
  forwarded.on('error',()=>{if(!response.headersSent)response.writeHead(503,{'Content-Type':'application/json'});response.end('{"error":"local_upstream_unavailable"}');});
  request.on('aborted',()=>forwarded.destroy());request.pipe(forwarded);
});
const bindAddress = process.env.EVAL_BIND_ADDRESS || '127.0.0.1';
server.listen(port,bindAddress,()=>process.stdout.write('READY\n'));
server.on('error',()=>{process.stderr.write('Isolated proxy listener failed\n');process.exitCode=1;});
