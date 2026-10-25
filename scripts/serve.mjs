import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.env.PORT||4180);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),target=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=(await stat(target)).isDirectory()?path.join(target,'index.html'):target;const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Web edition: http://127.0.0.1:${port}`));
