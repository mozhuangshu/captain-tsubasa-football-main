import {build} from 'esbuild';
import {mkdir,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
await mkdir('test-results/fixtures',{recursive:true});
await build({entryPoints:['tests/fixtures/celebration.js'],outfile:'test-results/fixtures/celebration.js',bundle:true,format:'esm',platform:'browser',target:'es2020'});
const files=(await readdir('tests/browser')).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/browser/'+f);
const child=spawn(process.execPath,['--test','--test-concurrency=1',...files],{stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
