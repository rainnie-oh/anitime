import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createCMS} from './cms.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cms=createCMS();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res)=>cms(req,res,()=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 const base=pathname.startsWith('/uploads/')?path.join(root,'public'):path.join(root,'dist/client');let file=path.resolve(base,'.'+pathname);
 if(!file.startsWith(base+path.sep)&&file!==base){res.writeHead(403);return res.end();}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){if(!path.extname(pathname))file=path.join(root,'dist/client/index.html');else{res.writeHead(404);return res.end();}}
 if(!fs.existsSync(file)){res.writeHead(503);return res.end('Run npm run build first');}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
})).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('ANITIME: http://127.0.0.1:'+(process.env.PORT||4173)));
