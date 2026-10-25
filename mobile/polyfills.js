/* 小红书小工具包专用：Chrome 61（Android 8.1 出厂 WebView）缺、而 game.js 实际用到的内置 API。
 * esbuild 只降级语法，不补 API，所以这里按能力检测补最小实现；新内核上全部跳过，一行不生效。
 * 清单由 xhs/package-xhs.mjs 扫描 game.js 核对（缺哪个会让打包失败）。 */
(function(){
'use strict';
var g=typeof window!=='undefined'?window:this;
function define(obj,name,value){if(!(name in obj))Object.defineProperty(obj,name,{value:value,writable:true,configurable:true,enumerable:false});}
if(typeof g.globalThis==='undefined')define(g,'globalThis',g);
define(Object,'fromEntries',function(entries){var o={};var it=entries[Symbol.iterator]();for(var s=it.next();!s.done;s=it.next()){o[s.value[0]]=s.value[1];}return o;});
define(Object,'hasOwn',function(o,k){return Object.prototype.hasOwnProperty.call(Object(o),k);});
function flatInto(out,arr,depth){for(var i=0;i<arr.length;i++){if(!(i in arr))continue;var v=arr[i];if(depth>0&&Array.isArray(v))flatInto(out,v,depth-1);else out.push(v);}return out;}
define(Array.prototype,'flat',function(depth){return flatInto([],this,depth===undefined?1:Number(depth)||0);});
define(Array.prototype,'flatMap',function(fn,thisArg){return flatInto([],Array.prototype.map.call(this,fn,thisArg),1);});
function at(n){var len=this.length>>>0;n=Math.trunc(Number(n))||0;if(n<0)n+=len;return n<0||n>=len?undefined:this[n];}
define(Array.prototype,'at',at);
define(String.prototype,'at',function(n){return at.call(String(this),n);});
['Int8Array','Uint8Array','Uint8ClampedArray','Int16Array','Uint16Array','Int32Array','Uint32Array','Float32Array','Float64Array'].forEach(function(t){if(g[t])define(g[t].prototype,'at',at);});
define(Array.prototype,'findLast',function(fn,thisArg){for(var i=this.length-1;i>=0;i--)if(fn.call(thisArg,this[i],i,this))return this[i];return undefined;});
define(Array.prototype,'findLastIndex',function(fn,thisArg){for(var i=this.length-1;i>=0;i--)if(fn.call(thisArg,this[i],i,this))return i;return -1;});
define(String.prototype,'replaceAll',function(search,replacement){
 if(search instanceof RegExp){if(!search.global)throw new TypeError('replaceAll must be called with a global RegExp');return String(this).replace(search,replacement);}
 var s=String(this),f=String(search);if(typeof replacement==='function'){var parts=s.split(f),out=parts[0],pos=parts[0].length;for(var i=1;i<parts.length;i++){out+=String(replacement(f,pos,s))+parts[i];pos+=f.length+parts[i].length;}return out;}
 return s.split(f).join(String(replacement).replace(/\$\$/g,'$'));});
define(String.prototype,'trimStart',String.prototype.trimLeft);
define(String.prototype,'trimEnd',String.prototype.trimRight);
if(typeof Promise!=='undefined')define(Promise.prototype,'finally',function(fn){var P=this.constructor||Promise;return this.then(function(v){return P.resolve(fn()).then(function(){return v;});},function(e){return P.resolve(fn()).then(function(){throw e;});});});
if(typeof Promise!=='undefined')define(Promise,'allSettled',function(items){return Promise.all(Array.from(items,function(p){return Promise.resolve(p).then(function(value){return {status:'fulfilled',value:value};},function(reason){return {status:'rejected',reason:reason};});}));});
/* structuredClone：游戏只拿它克隆纯数据（招式/连携表），覆盖对象、数组、Date、Map、Set、类型化数组与循环引用。 */
if(typeof g.structuredClone!=='function')define(g,'structuredClone',function(value){
 var seen=typeof Map==='function'?new Map():null;
 function clone(v){
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))return seen.get(v);
  var out;
  if(Array.isArray(v)){out=new Array(v.length);seen.set(v,out);for(var i=0;i<v.length;i++)if(i in v)out[i]=clone(v[i]);return out;}
  if(v instanceof Date){out=new Date(v.getTime());seen.set(v,out);return out;}
  if(v instanceof RegExp){out=new RegExp(v.source,v.flags);seen.set(v,out);return out;}
  if(typeof Map==='function'&&v instanceof Map){out=new Map();seen.set(v,out);v.forEach(function(val,key){out.set(clone(key),clone(val));});return out;}
  if(typeof Set==='function'&&v instanceof Set){out=new Set();seen.set(v,out);v.forEach(function(val){out.add(clone(val));});return out;}
  if(ArrayBuffer.isView(v)){out=new v.constructor(v);seen.set(v,out);return out;}
  if(v instanceof ArrayBuffer){out=v.slice(0);seen.set(v,out);return out;}
  if(typeof v==='function'||typeof v==='symbol')throw new Error('could not be cloned');
  out={};seen.set(v,out);var keys=Object.keys(v);for(var j=0;j<keys.length;j++)out[keys[j]]=clone(v[keys[j]]);return out;
 }
 return clone(value);
});
}).call(this);
