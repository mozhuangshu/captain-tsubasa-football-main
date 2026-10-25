/** 构建优化：art/hd-runtime.js 的紧凑编码（只在打包时改写，源文件不动）。
 * 原文件：R = 65k 行像素串（每像素一个字符，字母表 0-9abdef），Q = 每帧引用的行号表。
 * 改写：R 每行做游程编码，(字符, 连续 1–5 个) 合成一个可打印 ASCII 字符，行之间用空格隔开；
 *       Q 里连续递增的行号写成「起点-长度」，36 进制。
 * 模块一加载就同步解码回与原来一模一样的 R、Q 数组，后面的代码原样保留，所以导出的
 * HD_CHARACTERS / HD_CHARACTER_BY_ID 与原模块逐字段相同（verifyCompactHdRuntime 会核对）。
 * 这不是把数据压缩藏起来：解码后的内容就是游戏要用的像素表，只是去掉了引号、逗号和重复字符。 */
const SYMBOLS='0123456789abdef';
const MAXRUN=5;
const CODES=(()=>{const a=[];for(let c=0x23;c<0x7f;c++){const ch=String.fromCharCode(c);if(!'\\"\'`$'.includes(ch))a.push(ch);}return a.slice(0,SYMBOLS.length*MAXRUN).join('');})();

function sections(src){
 const re=/^(?:export )?const (\w+)=/gm,out=[];let m;
 while((m=re.exec(src)))out.push({name:m[1],start:m.index,valueStart:m.index+m[0].length});
 for(let i=0;i<out.length;i++)out[i].end=i+1<out.length?out[i+1].start:src.length;
 return Object.fromEntries(out.map(s=>[s.name,s]));
}
function literal(src,s){const text=src.slice(s.valueStart,s.end).trim();if(!text.endsWith(';'))throw Error(`hd-runtime: ${s.name} does not end with ;`);return JSON.parse(text.slice(0,-1));}
function encodeRow(row){
 let out='';
 for(let i=0;i<row.length;){
  let j=i;while(j<row.length&&row[j]===row[i])j++;
  const sym=SYMBOLS.indexOf(row[i]);if(sym<0)throw Error('hd-runtime: unexpected pixel symbol '+row[i]);
  for(let n=j-i;n>0;){const k=Math.min(n,MAXRUN);out+=CODES[sym*MAXRUN+k-1];n-=k;}
  i=j;
 }
 return out;
}
function encodeRefs(list){
 const parts=[];
 for(let i=0;i<list.length;){let j=i;while(j+1<list.length&&list[j+1]===list[j]+1)j++;parts.push(j>i?list[i].toString(36)+'-'+(j-i).toString(36):list[i].toString(36));i=j+1;}
 return parts.join(',');
}
const DECODER=`const R=(()=>{const C=${JSON.stringify(CODES)},S=${JSON.stringify(SYMBOLS)},d={};for(let i=0;i<C.length;i++)d[C[i]]=S[Math.floor(i/${MAXRUN})].repeat(i%${MAXRUN}+1);return __ROWS__.split(" ").map(r=>{const o=[];for(let i=0;i<r.length;i++)o.push(d[r[i]]);return o.join("");});})();
const Q=__REFS__.split(";").map(q=>{const o=[];if(q)for(const p of q.split(",")){const k=p.indexOf("-");if(k<0)o.push(parseInt(p,36));else{const a=parseInt(p.slice(0,k),36),n=parseInt(p.slice(k+1),36);for(let i=0;i<=n;i++)o.push(a+i);}}return o;});
`;

export function compactHdRuntime(src){
 const sec=sections(src);
 if(!sec.R||!sec.Q||sec.R.end!==sec.Q.start)throw Error('hd-runtime: expected const R=… immediately followed by const Q=…');
 const R=literal(src,sec.R),Q=literal(src,sec.Q);
 if(!R.every(r=>typeof r==='string')||!Q.every(q=>Array.isArray(q)&&q.every(Number.isInteger)))throw Error('hd-runtime: R/Q shape changed');
 const rows=R.map(encodeRow).join(' '),refs=Q.map(encodeRefs).join(';');
 const head=src.slice(0,sec.R.start);
 const code=head+DECODER.replace('__ROWS__',JSON.stringify(rows)).replace('__REFS__',JSON.stringify(refs))+src.slice(sec.Q.end);
 return {code,bytesIn:Buffer.byteLength(src),bytesOut:Buffer.byteLength(code),rows:R.length,frames:Q.length};
}

/** Evaluates both module texts in Node and compares every exported value (deep, exact). */
export function verifyCompactHdRuntime(original,compact){
 const run=text=>{const names=[...text.matchAll(/^export const (\w+)=/gm)].map(m=>m[1]);return new Function(text.replace(/^export const /gm,'const ')+`;return {${names.join(',')}};`)();};
 const a=run(original),b=run(compact);
 const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();
 if(ka.join()!==kb.join())return {ok:false,detail:'exports differ: '+ka+' / '+kb};
 for(const k of ka){const sa=JSON.stringify(a[k]),sb=JSON.stringify(b[k]);if(sa!==sb)return {ok:false,detail:'export '+k+' differs'};}
 return {ok:true,detail:ka.join(', ')+' 逐字段相同（JSON '+(JSON.stringify(a).length/1048576).toFixed(1)+' MiB）'};
}
