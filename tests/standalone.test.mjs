import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('source imports resolve inside the standalone web project',()=>{
 for(const dir of ['engine','src','tests','scripts'])for(const file of walk(path.join(root,dir)).filter(f=>/\.(m?js)$/.test(f))){
  const source=fs.readFileSync(file,'utf8');
  for(const m of source.matchAll(/^\s*(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?['"](\.[^'"]+)['"]/gm)){
   const target=path.resolve(path.dirname(file),m[1]);assert(target.startsWith(root),`${path.relative(root,file)} imports outside repository`);assert(fs.existsSync(target),`${path.relative(root,file)} missing ${m[1]}`);
  }
 }
});
test('build output and private development history are not tracked',()=>{
 const ignored=fs.readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
 for(const pattern of ['node_modules/','dist/','test-results/','.env','mobile/game.js'])assert(ignored.includes(pattern));
 for(const name of ['deployment','evidence','labs','archive','xhs'])assert.equal(fs.existsSync(path.join(root,name)),false,name);
});
