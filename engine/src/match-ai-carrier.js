// Original bank03 8AC8..8FAA ball-carrier decisions and 99F4..9B4B helpers.
import {CARRIER_DATA as D} from './match-ai-carrier-data.js';
import {ae37,selectDirectionB175,aeBF} from './match-ai-helpers.js';
import {scanAIObjectsInCone} from './match-ai-tactics.js';
import {selectLateDecisionBranch} from './match-ai-late-behaviors.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
// 99F4: opponent octants and borders, preserving original low/high comparisons.
export function mapCarrierObstacles(r,x){
 r[0x21]=128;scanAIObjectsInCone(r,x,(x&1)^1);const level=r[0x4fd+x]>>>6;r[0x1c]=[96,96,80,48][level];r[0x43]=x;r[0x688]=0;
 for(let i=0;i<18;i+=3){if(r[0x2d+i]===255)break;if(r[0x2e+i]<r[0x1c])r[0x688]|=1<<(((r[0x2d+i]+16)&224)>>>5);}
 r[0x689]=0;if(!r[0x360+x]){if(r[0x34d+x]<64)r[0x689]|=0x83;}else if(r[0x34d+x]>=64)r[0x689]|=0x38;
 if(!r[0x327+x]){if(r[0x314+x]<192)r[0x689]|=0xe0;}else if(r[0x327+x]===3&&r[0x314+x]>=64)r[0x689]|=14;
}
// 8F70/8F8F: ADC intentionally uses carry from fourth LSR (defense bit3).
export function isCarrierDirectionBlocked(r,x){
 if(r[0x1c]&r[0x689])return true;
 if(!(r[0x1c]&r[0x688]))return false;
 const control=r[0x650+x]&15;if(!control)return false;r[0x1d]=control;
 return ((r[0x4fd+x]>>>4)+((r[0x4fd+x]>>>3)&1)+control)<16;
}
export function chooseCarrierAvoidanceSide(r,x){
 for(let iteration=0,y=0;iteration<256;iteration++,y=(y+3)&255){const delta=(r[0x2d+y]-r[0x4b0+x])&255;r[0x1e]=delta;const magnitude=delta&128?(-delta)&255:delta;if(magnitude<33){r[0x2a]=delta&128?255:0;return y;}}
 throw new Error('Original9ABA candidate search has no matching octant');
}
export function adjustFreeCarrierDirection(r,x){
 if(!(r[0x57]&3)&&(x&1))return;if(!(r[0x1c]&68)||(r[0x2c]&128))return;
 let a=(r[0x2d]+32)&255;r[0x29]=a;if(a&128)a=(a+128)&255;if(a>=65||r[0x2e]>=48)return;
 const right=!!(r[0x1c]&64),negative=!!(r[0x29]&128),shiftRight=negative?!right:right;
 if(shiftRight){r[0x1c]>>>=1;if(r[0x1c]&r[0x689])r[0x1c]=(r[0x1c]<<1)&255;}
 else{r[0x1c]=(r[0x1c]<<1)&255;if(r[0x1c]&r[0x689])r[0x1c]>>>=1;}
}
function rotate(v,n){n=((n%8)+8)%8;return ((v<<n)|(v>>>(8-n)))&255;}
export function updateCarrierBot(r,x,h){
 const side=x&1,act=a=>{r[0x479+x]=a;},late=k=>h.late(r,x,k),random=()=>h.random(r);
 if(!(r[0x57]&3)&&random()<4){act(10);r[0x67e+side]=16;return;}
 const f=r[0x530+side]&3;if(f>=3)throw new RangeError('Carrier formation3 has no original pointer');
 const rootIndex=f*16+(x&14)+(r[0x4e4+x]&1),root=D.roots[rootIndex];put(r,0x2c,0x2d,root);
 const adjusted=((r[0x4e4+x]&7)-3+(r[0x650+x]&15))&255,skill=adjusted&128?0:Math.min(15,adjusted);
 const rowIndex=((skill>>>1)&254)|((r[0x4fd+x]&192)>>>3),ptr=D.pointers[root][rowIndex>>>1];put(r,0x2e,0x2f,ptr);
 let coords=D.coordinates[ptr];if(coords[0]&128){const index=Math.min(r[0x4e4+x]&31,27);put(r,0x2e,0x2f,D.fallbackPointer);coords=D.fallback.slice(index*4,index*4+4);}
 if(coords.length!==4)throw new RangeError('Original carrier coordinate record');
 r[0x62c+x]=coords[0];r[0x620+x]=coords[1];r[0x644+x]=coords[2];r[0x638+x]=coords[3];
 if(side)put(r,0x620+x,0x62c+x,1024-w(r,0x620+x,0x62c+x));ae37(r,x);r[0x1e]=r[0x1f]=16;selectDirectionB175(r,x);
 if(r[0x650+x]&64)return late(20);
 mapCarrierObstacles(r,x);r[0x1c]=1<<(r[0x4b0+x]>>>5);
 const movement=()=>{const vertical=!(r[0x4b0+x]&96),running=(r[0x459+x]&127)===33,deep=(r[0x486+x]&32)&&r[0x386+x]<240;act(vertical&&running?15:deep?48:vertical?32:33);};
 const freeDirection=()=>{
  r[0x2b]=r[0x1c];const other=side^1;
  if(r[0x676+other]<24&&aeBF(r,x,r[0x674+other])&&!(r[0x5d3+side]&3))return late(17);
  r[0x1c]=r[0x2b];r[0x1d]=random()&7;r[0x668+x]=(r[0x668+x]&240)|r[0x1d]|1;r[0x1d]=0;
  if(!r[0x1c])throw new Error('Original8D47 zero direction mask loop');
  while(!(r[0x1c]&1)){r[0x1c]>>>=1;r[0x1d]=(r[0x1d]+32)&255;}
  r[0x4b0+x]=r[0x1d];movement();
 };
 const avoid=()=>{const sign=r[0x2a]&128?1:-1;for(const n of [sign,-2*sign,3*sign,-4*sign,5*sign,-6*sign,-sign]){r[0x1c]=rotate(r[0x1c],n);if(!isCarrierDirectionBlocked(r,x))return freeDirection();}throw new Error('Original8D01 no escape direction infinite loop');};
 if(!isCarrierDirectionBlocked(r,x)){adjustFreeCarrierDirection(r,x);return freeDirection();}
 let y=chooseCarrierAvoidanceSide(r,x);
 if(!(r[0x57]&3))return avoid();
 const evade=()=>{y=r[0x2c];const delta=(w(r,0x34d+y,0x360+y)-w(r,0x34d+x,0x360+x))&65535;r[0x4b0+x]=delta&32768?0:128;act(36);};
 const jump=()=>{if(r[0x486+x]&16)act(16);else if(r[0x496+x]===255)return avoid();else act(48);};
 if((r[0x4f1+x]&4)&&(r[0x3f6+x]|r[0x412+x]))return jump();
 if((r[0x4f1+x]&128)&&(r[0x496+x]&96))return evade();
 if(!(r[0x5d3+side]&3)){y=side;return (r[0x5d3+y]&3)===2?avoid():late(17);}
 const routePtr=D.routes[r[0x52c+side]&15];put(r,0x1d,0x1e,routePtr);const branch=selectLateDecisionBranch(r,x,D.routeTables[routePtr]);y=branch.y;const address=D.routeTables[routePtr][branch.index];
 // Closed finite semantic branch table; addresses identify source routes only.
 switch(address){
 case 0x8eb5:return avoid();
 case 0x8eb8:return (r[0x5d3+y]&3)===2?avoid():late(17); // Source omitted TAY; retain selected-table Y.
 case 0x8ec7:return (r[0x5d3+y]&12)===8?avoid():late(35);
 case 0x8ed6:return freeDirection();
 case 0x8ed9:act(16);return;
 case 0x8edf:return evade();
 case 0x8f06:act(15);return;
 case 0x8f0c:act(13);return;
 case 0x8f12:return jump();
 case 0x8f2e:r[0x4b0+x]=(r[0x4b0+x]+128)&255;return movement();
 case 0x8f3a:
  if((r[0x5d3+y]&3)===2)return avoid();
  if(!(r[0x399+x]&128)&&r[0x386+x]){if(r[0x386+x]>=10)act(57);return;}act(r[0x486+x]&16?16:48);return;
 default:throw new RangeError('Unrecovered original carrier route');
 }
}
