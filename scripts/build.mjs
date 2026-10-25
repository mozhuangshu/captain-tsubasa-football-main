import fs from 'node:fs';
import {compactHdRuntime,verifyCompactHdRuntime} from './compact-hd-runtime.mjs';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),dest=path.join(root,'dist');
fs.mkdirSync(dest,{recursive:true});
for(const name of ['index.html','src','engine','mobile']){const target=path.join(dest,name);fs.rmSync(target,{recursive:true,force:true});fs.cpSync(path.join(root,name),target,{recursive:true});}
const compactPlugin={name:'compact-art',setup(b){b.onLoad({filter:/hd-runtime\.js$/},async({path:p})=>{const original=fs.readFileSync(p,'utf8'),packed=compactHdRuntime(original);if(!verifyCompactHdRuntime(original,packed.code).ok)throw Error('Art compression changed pixels');return{contents:packed.code,loader:'js'};});}};
const worker=await build({entryPoints:[path.join(root,'engine/src/head-warm-worker.js')],bundle:true,format:'esm',target:'es2020',minify:true,write:false,plugins:[compactPlugin]});
const workerCode=worker.outputFiles[0].contents,workerHash=createHash('sha256').update(workerCode).digest('hex').slice(0,12),workerName=`head-warm-worker-${workerHash}.js`;
fs.writeFileSync(path.join(dest,'engine/src',workerName),workerCode);
const workerHostPlugin={name:'worker-url',setup(b){b.onLoad({filter:/[\/]src[\/](?:mobile-)?main\.js$/},({path:p})=>({contents:fs.readFileSync(p,'utf8').replace('engine/src/head-warm-worker.js','engine/src/'+workerName),loader:'js'}));}};
const mobile=await build({entryPoints:[path.join(root,'src/mobile-main.js')],bundle:true,format:'iife',target:'es2020',minify:true,write:false,plugins:[workerHostPlugin,compactPlugin,{name:'mobile-module-paths',setup(b){b.onLoad({filter:/\.js$/},({path:p})=>{const contents=fs.readFileSync(p,'utf8');if(!contents.includes('import.meta.url'))return;const relative=path.relative(path.join(root,'mobile'),p).split(path.sep).join('/');return{contents:contents.replaceAll('import.meta.url',`new URL(${JSON.stringify(relative)},document.baseURI).href`),loader:'js'};});}}]});
const mobileCode=mobile.outputFiles[0].contents,mobileHash=createHash('sha256').update(mobileCode).digest('hex').slice(0,12);

fs.writeFileSync(path.join(dest,'mobile/game.js'),mobileCode);
let mobileEntry=fs.readFileSync(path.join(dest,'src/mobile-entry.js'),'utf8').replace("script.type='module';",'').replace('./mobile-main.js',`../mobile/game.js?v=${mobileHash}`);
fs.writeFileSync(path.join(dest,'src/mobile-entry.js'),mobileEntry);
const mobileEntryHash=createHash('sha256').update(mobileEntry).digest('hex').slice(0,12);
const mobileHtml=fs.readFileSync(path.join(dest,'mobile/index.html'),'utf8').replace('../src/mobile-entry.js',`../src/mobile-entry.js?v=${mobileEntryHash}`);
fs.writeFileSync(path.join(dest,'mobile/index.html'),mobileHtml);
// Keep import.meta.url next to the original localization module's font path.
const result=await build({entryPoints:[path.join(root,'src/main.js')],bundle:true,format:'esm',target:'es2020',minify:true,write:false,metafile:true,plugins:[workerHostPlugin,compactPlugin]});
const code=result.outputFiles[0].contents,hash=createHash('sha256').update(code).digest('hex').slice(0,12);
const runtime=`engine/src/web-game-${hash}.js`;
fs.writeFileSync(path.join(dest,runtime),code);
const entry=await build({entryPoints:[path.join(root,'src/entry.js')],bundle:true,external:['./main.js'],format:'esm',target:'es2020',minify:true,write:false});
const entryCode=entry.outputFiles[0].text.replace('./main.js',`../${runtime}`),entryHash=createHash('sha256').update(entryCode).digest('hex').slice(0,12);
const entryPath=`src/entry-${entryHash}.js`;fs.writeFileSync(path.join(dest,entryPath),entryCode);
const html=fs.readFileSync(path.join(dest,'index.html'),'utf8').replace("import('./src/entry.js')",`import('./${entryPath}')`);
fs.writeFileSync(path.join(dest,'index.html'),html);
let bytes=0,files=0;function count(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())count(p);else{files++;bytes+=fs.statSync(p).size;}}}count(dest);
console.log(JSON.stringify({destination:dest,files,bytes,published:false}));
