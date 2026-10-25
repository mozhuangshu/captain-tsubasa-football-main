// Original source03:8339 dispatch and early AI behaviors. No runtime machine code.
import * as helper from './match-ai-helpers.js';
import {EARLY_AI_DATA as D} from './match-ai-behavior-data.js';
import {advanceRandom,predictCommandPosition} from './mood-league.js';
import {measureAIDistance,rankAIObjects} from './match-ai.js';
import {aimAtTarget} from './ball-actions.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
export function aiRandom(r){const s={rng45:r[0x45],rng46:r[0x46]},o=advanceRandom(s);r[0x45]=s.rng45;r[0x46]=s.rng46;r[0xc]=o.scratch0c;return o.value;}
export function aiPredict(r,y,timer){r[0x1c]=timer;const p=predictCommandPosition(r,y,timer);put(r,0x32,0x33,p.x);put(r,0x34,0x35,p.y);return p;}
export function chasePredictedActor(r,x,y){
 const airborne=(!(r[0x399+y]&128)&&r[0x386+y]>=24)||(r[0x42e+y]|r[0x420+y]);
 const timer=airborne?r[0x524]:measureAIDistance(r,x,y)>>>4;aiPredict(r,y,timer);if(airborne)helper.clipPrediction9B75(r,x);helper.ae4b(r,x);helper.selectMovement985F(r,x);
}
function dependency(h,name,...args){if(typeof h[name]!=='function')throw new Error(`MissingTranslation: AI ${name}`);return h[name](...args);}
export function updateEarlyBot(r,x,kind,h={}){
 const side=x&1,act=a=>{r[0x479+x]=a;},go=k=>updateEarlyBot(r,x,k,h),late=k=>dependency(h,'late',r,x,k);
 switch(kind){
 case 0:act((r[0x459+x]&127)===33?15:1);r[0x4b0+x]=255;return;
 case 1:helper.ae37(r,x);helper.selectMovement985F(r,x);if(r[0x4b0+x]===255&&aiRandom(r)<32){r[0x4b0+x]=aiRandom(r)&224;act(32);}return;
 case 2:act(r[0x486+x]&128?57:10);r[0x67e+side]=r[0x67c+side]===255?side|16:r[0x67c+side];return;
 case 3:return go(6);
 case 4:act(9);r[0x4b0+x]=255;return;
 case 5:dependency(h,'predictGoalLine',r,x,h);if(x>=10&&(r[0x22]||r[0x21]<144))return dependency(h,'goalkeeper',r,x,h);
  r[0x638+x]=r[0x21];r[0x644+x]=r[0x22];put(r,0x620+x,0x62c+x,x===10?160:864);helper.ae37(r,x);helper.selectMovement985F(r,x);return;
 case 6:r[0x22]=x;r[0x23]=side^1;r[0x27]=6;r[0x28]=10;r[0x29]=2;rankAIObjects(r);
  if(r[0x2d]<64&&(!(r[0x3f4]|r[0x410])||(r[0x650+x]&15)>=14||helper.difficulty9B4C(r,x)>=2))return late(0x24);
  return chasePredictedActor(r,x,12);
 case 7:case 0x21:{const y=r[0x65c+x]===0x21?([3,5,2,4][x-6]):r[0x4d6];if(y===undefined)throw new RangeError('Original paired-player table outside valid6..9');return chasePredictedActor(r,x,y);}
 case 8:case 9:{
  if(!(r[0x57]&3)&&(r[0x57]&128)&&side&&aiRandom(r)>=48)return go(7);
  if(kind===9){
   if(r[0x4f1+x]&64){helper.ae1a(r,x,r[0x4d6]);if(r[0x2a]<48&&r[0x2b]<32&&!(r[0x29]&128)){act(25);return;}}
   if(r[0x4f1+x]&2){helper.ae1a(r,x,r[0x4d6]);if(r[0x2a]<48&&r[0x2b]<32&&!(r[0x29]&128)){r[0x1e]=r[0x1f]=0;helper.selectDirectionB175(r,x);act(48);return;}}
  }
  const distance=measureAIDistance(r,x,r[0x4d6]);r[0x1c]=distance;const difficulty=helper.difficulty9B4C(r,x),limit=(kind===8?[24,24,28,32]:[16,16,21,28])[difficulty];if(distance>=limit)return go(7);
  if(kind===8){if((r[0x4fd+x]&192)!==192&&!(r[0x486+difficulty]&128)){act(35);return;}if(r[0x486+x]&128)act(66);else helper.jump9B57(r,x);return;}
  const aggressive=(r[0x4fd+x]&192)===192||(r[0x650+x]&15)>=12;
  if(!aggressive&&(r[0x4f1+x]&2)){helper.jump9B57(r,x);return;}
  if(aggressive||(r[0x4f1+x]&8)||(r[0x486+x]&128)){if(r[0x486+x]&128)act(59);else helper.jump9B57(r,x);}else act(34);return;
 }
 case 10:{const f=r[0x530+side]&3;if(f>=3)throw new RangeError('Original formation selector');const base=f*24,i=x>>>1,table=D.tables['0x86ec'];const ptr=0x86ec+f*24;put(r,0x2c,0x2d,ptr);for(const [a,o]of[[0x620,0],[0x62c,6],[0x638,12],[0x644,18]])r[a+x]=table[base+i+o];
  const owner=r[0x4d6];if(!((x^owner)&1)&&(r[0x492]&64)&&(!side?r[0x327+owner]>=2:r[0x327+owner]<2))put(r,0x620+x,0x62c+x,w(r,0x620+x,0x62c+x)+192);
  if(side)put(r,0x620+x,0x62c+x,1024-w(r,0x620+x,0x62c+x));return go(1);}
 case 11:{const setting=r[0x530+side],f=setting&3,v=setting>>>2;if(f>=3||v>=D.formations[f].variants.length)throw new RangeError('Original formation variant outside recovered tables');const form=D.formations[f],row=form.variants[v],i=(x>>>1)*4;r[0x1c]=setting;put(r,0x2c,0x2d,form.pointer);put(r,0x2e,0x2f,row.pointer);r.set(row.bytes.slice(i,i+4),0x1c);if(side)put(r,0x1d,0x1c,1024-w(r,0x1d,0x1c));r[0x62c+x]=r[0x1c];r[0x620+x]=r[0x1d];r[0x644+x]=r[0x1e];r[0x638+x]=r[0x1f];helper.ae37(r,x);helper.selectMovement985F(r,x);return;}
 case 12:{const f=r[0x530+side]&3;if(f>=3)throw new RangeError('Original formation selector');const row=D.offsets[f],i=x*4;put(r,0x2c,0x2d,row.pointer);r.set(row.bytes.slice(i,i+4),0x1c);const y=r[0x4d6];put(r,0x620+x,0x62c+x,w(r,0x314+y,0x327+y)+w(r,0x1d,0x1c));put(r,0x638+x,0x644+x,w(r,0x34d+y,0x360+y)+w(r,0x1f,0x1e));const hi=r[0x644+x],lo=r[0x638+x];if((hi&128)||(!hi&&lo<48))put(r,0x638+x,0x644+x,48);else if(hi&&lo>=96)put(r,0x638+x,0x644+x,352);helper.ae37(r,x);helper.selectMovement985F(r,x);return;}
 case 13:return dependency(h,'goalkeeper',r,x,h);
 case 14:return dependency(h,'goalkeeperReaction',r,x,h);
 case 15:return dependency(h,'carrier',r,x,h);
 default:throw new RangeError('Unknown early AI kind');
 }
}
export function updateBotBehavior(r,x,h={}){
 if(!(r[0x479+x]&128)||!(r[0x650+x]&128))return;
 const kind=r[0x65c+x]&127,table=D.tables['0x8359'];if(kind>=44)throw new RangeError('AI dispatch outside44 original entries');r[0x2c]=table[kind*2];r[0x2d]=table[kind*2+1];
 return kind<16?updateEarlyBot(r,x,kind,h):dependency(h,'late',r,x,kind);
}
export function createBotHelpers(additional={}){return {...helper,random:aiRandom,predict98D0:aiPredict,distance:measureAIDistance,aim:aimAtTarget,...additional};}
