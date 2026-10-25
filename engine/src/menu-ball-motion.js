// Original physical bank12 $94D9-$95EA and $9642-$96CF.
const DRAG=[24,48,16,24,24,32,24,48,16,24,24,32,24,48,16,24,24,32,48,48,32,48,64,64,48,48,32,48,64,64];
const signed=v=>v&32768?v-65536:v;
export function applyBallFriction(r,x=12,kind=0){
 const index=2*(kind*3+r[0x13c])+((r[0x50d]&128)?1:0);
 if(!Number.isInteger(index)||index<0||index>=DRAG.length)throw new RangeError('Original friction table boundary');
 const coefficient=DRAG[index];
 for(const [lo,hi] of [[0x3e8,0x3f6],[0x404,0x412]]){
  const raw=r[lo+x]|(r[hi+x]<<8),v=signed(raw);let result;
  if(r[hi+x]===0)result=Math.max(0,v-16);
  else if(r[hi+x]===255)result=Math.min(0,v+16);
  else{
   let drag=0;
   // Original multiplication drops the low byte independently at each set multiplier bit.
   for(let bit=0;bit<8;bit++)if(coefficient&(1<<bit))drag+=Math.floor(v*(1<<bit)/256);
   result=(v-drag)&65535;
  }
  r[lo+x]=result&255;r[hi+x]=(result>>8)&255;
 }
}
export function advanceBallRotation(r,x=12){
 let direction=r[0x4a3+x];r[0x74+x]=r[0x94+x]&3;
 const moving=[0x3f6,0x3e8,0x412,0x404,0x42e,0x420].some(a=>r[a+x]!==0);
 if(moving){
  direction=(r[0x3f6+x]&128)^128;
  const vx=signed(r[0x3e8+x]|(r[0x3f6+x]<<8)),vy=signed(r[0x404+x]|(r[0x412+x]<<8));
  const speed=((Math.abs(vx)>>8)+(Math.abs(vy)>>8))&255;
  const thresholds=[4,3,2,1,0],periods=[1,2,3,4,5];let slot=0;while(speed<thresholds[slot])slot++;
  r[0x87+x]=(r[0x87+x]+1)&255;
  if(r[0x87+x]>=periods[slot]){r[0x87+x]=0;r[0x94+x]=((r[0x94+x]&3)+1)&3;r[0x74+x]=r[0x94+x];}
 }
 r[0x1d]=direction;r[0x74+x]|=direction;return r[0x74+x];
}
import {integrateMotion,clearMotion} from './physics.js';
import {scanBallPlayerContacts} from './ball-collision.js';
import {initializeMovement} from './sprite-animation.js';
// $8FC8 action1 in menu context. Contact handling is consequential and is never replaced with an invented idle state.
export function updateRestingMenuBall(r,x=12,options={}){
 if(r[0x58]!==2)throw new RangeError('Menu-only wrapper; gameplay surface effects need their original caller');
 if((r[0x459+x]&127)!==1)throw new Error('Resting-ball wrapper requires original action1');
 if(!(r[0x459+x]&128)){
  initializeMovement(r,x);r[0x4f0]=0;r[0x4c9]=0;r[0x510]=0;r[0x50f]=128;
  for(const a of [0x42e,0x420,0x44a,0x43c])r[a+x]=0;
 }
 if(r[0x130+x]>=2)clearMotion(r,x); // Original9CC9 shared with the complete ball-action conversion.
 const nearX=(r[0x3f6+x]&128)?r[0x3f6+x]^255:r[0x3f6+x];
 const nearY=(r[0x412+x]&128)?r[0x412+x]^255:r[0x412+x];
 if(r[0x130+x]<2&&nearX===0&&nearY===0)applyBallFriction(r,x,0);
 if(!r[0xd9+x])r[0x130+x]=0;// $977B: the menu-state path returns here.
 if(r[0x130+x]===1)r[0x50d]=Math.min(255,r[0x50d]+1);
 applyBallFriction(r,x,0);integrateMotion(r,x);advanceBallRotation(r,x);
 return (options.scanBallPlayerContacts??scanBallPlayerContacts)(r,x);
}
