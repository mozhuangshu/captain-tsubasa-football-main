// Statically translated game logic, NOT a CPU interpreter. No ROM access at runtime.
// Original byte locations and scope limitations: docs/DEVELOPMENT.md
// Inputs are original gameplay bytes, held in a Uint8Array(0x800). Slot 12 is the ball.
export const PHYSICS_RAM = Object.freeze({
 xSub:0x301,xLo:0x314,xHi:0x327,ySub:0x33a,yLo:0x34d,yHi:0x360,
 zSub:0x373,zLo:0x386,zHi:0x399,vxLo:0x3e8,vxHi:0x3f6,vyLo:0x404,vyHi:0x412,
 vzLo:0x420,vzHi:0x42e,gLo:0x43c,gHi:0x44a,timer:0x4bd,state:0x486,surface:0x130
});
function check(ram, slot) {
 if(!(ram instanceof Uint8Array) || ram.length<0x800) throw new TypeError('Original gameplay RAM requires at least 2048 bytes');
 if(!Number.isInteger(slot)||slot<0||slot>18) throw new RangeError('Recovered object slots are 0..18');
}
function word(r,lo,hi){return r[lo]|r[hi]<<8;}
function putWord(r,lo,hi,v){r[lo]=v&255;r[hi]=(v>>>8)&255;}
// $9BAD..$9BCD / $9BDA..$9BFA / $9C04..$9C24.
// Preserve carry from fraction into integer and sign extension into the third byte.
function addVelocity(r,s,sub,lo,hi,vlo,vhi){
 let sum=r[sub+s]+r[vlo+s]; r[sub+s]=sum&255;
 let carry=sum>>>8, speedHi=r[vhi+s];
 if(speedHi&128) r[hi+s]=(r[hi+s]-1)&255;
 sum=r[lo+s]+speedHi+carry; r[lo+s]=sum&255;
 r[hi+s]=(r[hi+s]+(sum>>>8))&255;
}
// Complete bank06:$9B95..$9CC8, every branch, no callee dependencies.
export function integrateMotion(r,slot){
 check(r,slot);
 r[0x513]=r[0x314+slot];r[0x514]=r[0x327+slot];
 r[0x515]=r[0x34d+slot];r[0x516]=r[0x360+slot];
 addVelocity(r,slot,0x301,0x314,0x327,0x3e8,0x3f6);
 if(r[0x58]!==1&&r[0x58]!==3) addVelocity(r,slot,0x33a,0x34d,0x360,0x404,0x412);
 if(slot>=13)return;
 addVelocity(r,slot,0x373,0x386,0x399,0x420,0x42e);
 if(slot===12&&r[0x524]!==0)r[0x524]--;
 if(r[0x4bd+slot]!==0){
  const decrement=slot===12&&(r[0x50d]&128)&&r[0x510]===0?2:1;
  r[0x4bd+slot]=Math.max(0,r[0x4bd+slot]-decrement);
 }else{
  putWord(r,0x420+slot,0x42e+slot,(word(r,0x420+slot,0x42e+slot)-word(r,0x43c+slot,0x44a+slot))&65535);
 }
 if(r[0x58]!==0||r[0x5fc]===0)return;
 if(slot===12){
  if(r[0x486+slot]&32)return;
  // Original ASL/ROL changes the GLOBAL wind values in place, not a local copy.
  if(r[0x50d]&128){
   putWord(r,0x600,0x5ff,word(r,0x600,0x5ff)<<1);
   putWord(r,0x602,0x601,word(r,0x602,0x601)<<1);
  }
 }else if(!(r[0x486+slot]&128))return;
 putWord(r,0x3e8+slot,0x3f6+slot,word(r,0x3e8+slot,0x3f6+slot)+word(r,0x600,0x5ff));
 putWord(r,0x404+slot,0x412+slot,word(r,0x404+slot,0x412+slot)+word(r,0x602,0x601));
}
// Complete bank06:$9CC9..$9CE3. Does not clear position or action timer.
export function clearMotion(r,slot){check(r,slot);for(const a of [0x3f6,0x3e8,0x412,0x404,0x42e,0x420,0x44a,0x43c])r[a+slot]=0;}
export const JUMP_SPEEDS = Object.freeze([0x400,0x400,0x300,0x180,0x500,0x500,0x480,0x400,0x300,0x200,0x600,0xc00]);
// $9B60..$9B94. Only recovered table indices 0..11 are accepted.
export function initializeJump(r,slot,kind=r[0x493]){
 check(r,slot);if(!Number.isInteger(kind)||kind<0||kind>=JUMP_SPEEDS.length)throw new RangeError('Jump table only recovered for indices 0..11');
 putWord(r,0x420+slot,0x42e+slot,JUMP_SPEEDS[kind]);putWord(r,0x43c+slot,0x44a+slot,0x80);
}
// Complete bank06:$983F..$9855. Negative high byte forced to FF; low byte >= FC.
// This is not a universal ground clamp: the original preserves fraction and vertical speed.
export function limitNegativeHeight(r,slot){check(r,slot);if(r[0x399+slot]&128){r[0x399+slot]=255;if(r[0x386+slot]<=252)r[0x386+slot]=252;}}
// Exact fixed-bank $E780..$E7D1 classification AFTER tile lookup. No map inference.
export function classifySurfaceTile(tile,fieldColor,wetness){
 tile&=255;fieldColor&=255;wetness&=255;
 if(tile<0x40||(tile>=0x80&&tile<0x95))return fieldColor===4?3:fieldColor&1?(wetness&15)+1:0;
 if(tile<0x6c||(tile>=0x95&&tile<0xe8))return 0;
 return fieldColor&1?0:(wetness&15)+1;
}
// Exact fixed-bank $CD3F..$CDC6 continuation with caller-supplied verified surface results.
// Full $CD2F is NOT closed: $E6F0 tile-map selection is still unconverted. A missing
// second lookup needed on surface 2 aborts BEFORE mutation, never assumes a terrain.
export function resolveBelowGroundWithSurface(r,slot,surfaceAfterLookup){
 check(r,slot);
 if(!(r[0x399+slot]&128))return {complete:true,changed:false};
 const surface=r[0x130+slot];
 if(surface>3)throw new RangeError('Only original surface table entries 0..3 recovered');
 const moving=(r[0x3e8+slot]|r[0x3f6+slot]|r[0x404+slot]|r[0x412+slot])!==0;
 if(surface===2&&moving&&surfaceAfterLookup===undefined)return {complete:false,reason:'Unconverted $E6F0 surface lookup required at $CD8E'};
 if(surface<2){
  if(surface===0)for(const a of [0x44a,0x43c,0x42e,0x420])r[a+slot]=0;
  for(const a of [0x399,0x386,0x373])r[a+slot]=0;
 }else{
  if(r[0x386+slot]<[0xe8,0xf8][surface-2])r[0x386+slot]=[0xee,0xfa][surface-2];
  if(surface===2&&moving&&surfaceAfterLookup!==2){
   r[0x130+slot]=2;r[0x314+slot]=r[0x513];r[0x327+slot]=r[0x514];
   r[0x34d+slot]=r[0x515];r[0x360+slot]=r[0x516];
   putWord(r,0x386+slot,0x399+slot,word(r,0x386+slot,0x399+slot)+2);
  }
 }
 return {complete:true,changed:true};
}
