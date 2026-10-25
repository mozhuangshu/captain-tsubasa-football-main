import {tsubasaMisugiShotHP,noteTsubasaMisugiPass} from './tsubasa-misugi-heart.js';
// Direct original pass/shot vector and launch routines. No CPU interpreter or runtime ROM.
import {clearMotion,integrateMotion} from "./physics.js";
import {beginTsubasaShot,tsubasaNativeSubtype,prepareTsubasaShotPhysics,beforeTsubasaBallIntegration,afterTsubasaBallIntegration,tsubasaSpecialAdvance} from "./tsubasa-special-moves.js";
import {noteTsubasaPartnerPass} from './tsubasa-partner-chains.js';
const integrateShotMotion=(r,s)=>{beforeTsubasaBallIntegration(r,s);integrateMotion(r,s);afterTsubasaBallIntegration(r,s);};
// bank07:$F8E7, file $01F8F7
export const ANGLE_LOOKUP = [0,1,2,4,5,6,8,9,10,11,12,13,14,16,17,18,19,20,21,22,23,24,25,26,27,28,28,29,30,31,31,32];
// bank07:$F907, file $01F917
export const SINE_PART = [0,7,15,20,25,33,38,48,51,56,64,69,76,81,87,94,99,107,110,115,122,128,133,138,140,148,153,158,163,166,174,176,179];
// bank07:$F928, file $01F938
export const COSINE_PART = [255,255,255,254,254,253,253,251,250,249,248,246,245,243,240,238,235,232,230,227,225,222,220,215,212,207,204,202,197,194,189,184,179];
// bank07:$F949, file $01F959
export const DISTANCE_PART = [0,0,0,0,0,1,2,3,4,5,7,8,10,15,16,20,21,24,26,28,33,36,38,45,49,56,60,64,73,77,88,99,105];
// bank06:$A41B, file $01A42B
export const PASS_OFFSETS = [67,0,189,255,67,0,189,255,96,0,0,0,67,0,67,0,67,0,67,0,189,255,67,0,160,255,0,0,189,255,189,255,189,255,189,255,67,0,189,255,96,0,0,0,67,0,67,0,189,255,67,0,189,255,67,0,160,255,0,0,189,255,189,255];
// bank06:$A45D, file $01A46D
export const PASS_LEAD_OFFSETS = [0,0,0,0,0,0,0,0,0,0,0,0,8,0,248,255,32,0,224,255,40,0,216,255,48,0,208,255,64,0,192,255];
// bank04:$BBCE, file $013BDE
export const SHOT_TARGETS = [168,0,168,0,192,0,168,0,192,0,168,0,255,255,216,0,255,255,192,0,192,0,216,0,216,0,216,0,192,0];
// bank04:$BD12, file $013D22
export const SPECIAL_BY_PLAYER = [4,15,22,15,24,15,23,30,4,15,26,15,27,15,25,32,4,15,33,27,31,15,32,30,4,15,29,26,28,22,30,15,4,20,5,30,6,20,7,20,8,30,9,30,10,30,11,20,12,20,13,20,14,30,15,20];
// bank04:$BD4A, file $013D5A
export const SPECIAL_PHYSICS = [8,0,8,248,8,1,16,4,8,0,0,0,0,1,8,0,4,0,4,6];
// bank04:$BD5E, file $013D6E
export const SPECIAL_TIMERS = [16,24,255,127,127,32,32,255,127,0];
// bank04:$BD68, file $013D78
export const SPECIAL_TRANSITIONS = [0,0,131,1,131,2,0,3,0,4,42,7,0,4,16,1,4,5,17,6,0,8,0,4,0,4,149,9,20,4,18,2,0,4,18,7,19,1,0,3,14,5,13,5,0,4,162,9,163,9,36,7,40,1,41,6,0,4,167,9,0,4,0,4,0,4,0,4,23,4,24,4,0,4,38,1,0,4,29,8,0,4,37,7,43,6,19,1];
// bank04:$BDD7, file $013DE7
export const SPECIAL_HEIGHTS = [16,28,36,36,28,20,32,50,56,56,50,44];
// bank06:$9435, file $019445
export const DIRECTION16 = [0,0,160,255,73,0,168,255,135,0,189,255,177,0,220,255,192,0,0,0,177,0,36,0,135,0,67,0,73,0,88,0,0,0,96,0,183,255,88,0,121,255,67,0,79,255,36,0,64,255,0,0,79,255,220,255,121,255,189,255,183,255,168,255];
// bank06:$94BF, file $0194CF
export const BALL_ARCS = [0,8,0,6,0,8,0,7,0,9,0,8,128,1,0,1,0,5,0,5,0,3,0,3];
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;},p24=(r,a,v)=>{r[a]=v&255;r[a+1]=(v>>>8)&255;r[a+2]=(v>>>16)&255;},u24=(r,a)=>r[a]|r[a+1]<<8|r[a+2]<<16;
const signed=v=>v&32768?v-65536:v,tw=(a,i)=>a[i]|a[i+1]<<8;
function check(r,s,max=12){if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('Gameplay RAM required');if(!Number.isInteger(s)||s<0||s>max)throw new RangeError(`Object index 0..${max} required`);}
// $F4C1..$F538: original normalized unsigned 24/16 long division. Includes the
// original dividend=1 early-return behavior; not replaced with unrestricted JS /.
export function divideOriginal24By16(r){
 let q=u24(r,0x1c),d=w(r,0x2c),rem=0;r[0x1f]=r[0x20]=r[0x21]=0;
 if(!d){r[0x1c]=r[0x1d]=r[0x1e]=0;return;}
 let count=24,carry=0;
 for(;;){carry=q>>>23;q=(q<<1)&0xffffff;count--;p24(r,0x1c,q);if(!count)return;if(carry)break;}
 q|=1;count++;r[0x2b]=count;
 for(;;){rem=((rem<<1)|carry)&0xffffff;p24(r,0x22,rem);if(rem>=d)rem-=d;else q=(q&0xffff00)|((q-1)&255);
  p24(r,0x1c,q);p24(r,0x1f,rem);r[0x2b]=--count;if(!count)return;carry=q>>>23;q=((q<<1)|1)&0xffffff;}
}
// $F691..$F8E6. Target integer X/Y enters at $2E..$31. Returns original angle.
export function aimAtTarget(r,s){
 // F698/F69F/F6A7/F6AE use absolute,X: every byte X is meaningful,
 // including FF selected by the original no-candidate AI path.
 check(r,s,255);r[0x1c]=0;const savedA=r[0x2a],savedB=r[0x2b];
 const dx=(w(r,0x2e)-w(r,0x314+s,0x327+s))&65535,dy=(w(r,0x30)-w(r,0x34d+s,0x360+s))&65535;
 put(r,0x34,0x35,dx);put(r,0x36,0x37,dy);const ax=Math.abs(signed(dx)),ay=Math.abs(signed(dy));put(r,0x38,0x39,ax);put(r,0x3a,0x3b,ay);
 let vx,vy,angle,scale=0x169;
 if(ax===ay){vx=dx&32768?-179:179;vy=dy&32768?-179:179;angle=dx&32768?(dy&32768?224:160):(dy&32768?32:96);if(!(dx&32768)&&(dy&32768))scale=0x100|r[0x69];}
 else{
  const xMajor=ax>ay;put(r,0x2c,0x2d,xMajor?ax:ay);r[0x1c]=0;put(r,0x1d,0x1e,xMajor?ay:ax);divideOriginal24By16(r);
  const a=ANGLE_LOOKUP[Math.min(255,r[0x1c]+3)>>>3];r[0x2a]=a;
  let major=a?COSINE_PART[a]:256,minor=a?SINE_PART[a]:0;scale=a?0x100|DISTANCE_PART[a]:256;
  vx=xMajor?major:minor;vy=xMajor?minor:major;
  if(dx&32768)vx=-vx;if(dy&32768)vy=-vy;
  angle=!(dx&32768)?(!(dy&32768)?(xMajor?64+a:128-a):(xMajor?64-a:a)):(!(dy&32768)?(xMajor?192-a:128+a):(xMajor?192+a:-a));
  if(!(dx&32768)&&!(dy&32768)&&!xMajor)r[0x23]=a;
 }
 put(r,0x2e,0x2f,vx);put(r,0x30,0x31,vy);put(r,0x32,0x33,scale);r[0x42]=angle&255;r[0x2a]=savedA;r[0x2b]=savedB;return r[0x42];
}
// $9867..$98D2: unsigned 16-bit strength * sign-extended 16-bit direction,
// accumulated at 24-bit precision; low product byte kept in $1F/$20.
export function scalePlanarVector(r,s){
 check(r,s);let strength=w(r,0x2c),vx=signed(w(r,0x2e))&0xffffff,vy=signed(w(r,0x30))&0xffffff,px=0,py=0;
 r[0x1d]=vx>>>16;r[0x1e]=vy>>>16;r[0x1f]=r[0x20]=0;put(r,0x3e8+s,0x3f6+s,0);put(r,0x404+s,0x412+s,0);
 while(strength){const use=strength&1;strength>>>=1;put(r,0x2c,0x2d,strength);if(use){px=(px+vx)&0xffffff;py=(py+vy)&0xffffff;}vx=(vx<<1)&0xffffff;vy=(vy<<1)&0xffffff;put(r,0x2e,0x2f,vx);r[0x1d]=vx>>>16;put(r,0x30,0x31,vy);r[0x1e]=vy>>>16;}
 r[0x1f]=px&255;r[0x20]=py&255;put(r,0x3e8+s,0x3f6+s,px>>>8);put(r,0x404+s,0x412+s,py>>>8);
}
// $98D3..$9926 predicts ball counter by the original discrete recurrence.
export function updateFlightCounter(r,s){
 check(r,s);const initial=w(r,0x420+s,0x42e+s);if(!initial)return;
 let speed=initial,height=w(r,0x373+s,0x386+s);put(r,0x2e,0x2f,speed);put(r,0x2c,0x2d,(speed<<2)&65535);r[0x524]=((speed<<2)&65535)>>>8;put(r,0x30,0x31,height);
 // Finite original state recurrence; detect a genuine nonterminating input instead of fabricating a result.
 const visited=new Set();while((height>>>8)!==0&&!(height&32768)){
  const key=height*65536+speed;if(visited.has(key))throw new RangeError('Original flight recurrence does not terminate for this state');visited.add(key);
  r[0x524]=(r[0x524]+1)&255;height=(height-speed)&65535;speed=(speed+w(r,0x43c+s,0x44a+s))&65535;put(r,0x30,0x31,height);put(r,0x2e,0x2f,speed);
 }
}
// $F5E4..$F630, bounded 24-bit multiply with original early overflow exit.
function multiplyDistance(r){let a=u24(r,0x1c),b=w(r,0x26),out=0;p24(r,0x23,a);p24(r,0x20,0);while(b){const bit=b&1;b>>>=1;put(r,0x26,0x27,b);if(bit){const sum=out+a;out=sum&0xffffff;p24(r,0x20,out);if(sum>0xffffff)return;}const shifted=a*2;a=shifted&0xffffff;p24(r,0x23,a);if(shifted>0xffffff)return;}}
// $F96A..$F9DD: actual angular cone + distance target scan, ties favor later slot.
export function selectPassTarget(r,s,first){
 check(r,s);const step=r[0x29],last=r[0x28];if(!step||first>12||last>12)throw new RangeError('Unsupported original candidate scan');
 r[0x3c]=255;r[0x3e]=255;r[0x3d]=127;
 for(let target=first;target<=last;target=(target+step)&255){if(target!==r[0x4d6]){
  put(r,0x2e,0x2f,w(r,0x314+target,0x327+target));put(r,0x30,0x31,w(r,0x34d+target,0x360+target));
  const angle=aimAtTarget(r,s);let delta=(angle-r[0x2a])&255;if(delta&128)delta=(-delta)&255;
  if(delta<=r[0x2b]){if(w(r,0x38)<w(r,0x3a))put(r,0x38,0x39,w(r,0x3a));put(r,0x1c,0x1d,w(r,0x38));r[0x1e]=0;put(r,0x26,0x27,w(r,0x32));multiplyDistance(r);const distance=w(r,0x21),difference=(w(r,0x3c)-distance)&65535;if(!(difference&32768)){put(r,0x3c,0x3d,distance);r[0x3e]=target;}}
 }}return r[0x3e];
}
// $A47D..$A4D7 original pass strength table.
function choosePassStrength(r,s){put(r,0x34,0x35,w(r,0x38)>>>4);put(r,0x36,0x37,w(r,0x3a)>>>4);let index=Math.min(14,(r[0x34]+r[0x36])&255)&14;if(index<5&&!(r[0x492]&128)&&(r[0x386+s]===0||(r[0x386+s]&128)))index=16;r[0x2b]=index;put(r,0x2c,0x2d,[256,512,512,768,1024,1280,1536,1536,2560][index>>>1]);}
// $A4D8..$A5A6: exact launch arc from original vector, distance and height.
function choosePassArc(r,s){
 if(r[0x2b]===16){put(r,0x420+s,0x42e+s,0);return;}
 const ax=Math.abs(signed(w(r,0x3e8+s,0x3f6+s))),ay=Math.abs(signed(w(r,0x404+s,0x412+s)));put(r,0x2e,0x2f,ax);put(r,0x30,0x31,ay);r[0x1c]=0;
 const offset=ay>=ax?2:0;put(r,0x2c,0x2d,offset?ay:ax);put(r,0x1d,0x1e,w(r,0x38+offset));divideOriginal24By16(r);
 const arc=r[0x1c]*64;put(r,0x2c,0x2d,arc);put(r,0x2e,0x2f,arc);put(r,0x420+s,0x42e+s,Math.min(4096,arc));r[0x1c]=r[0x386+s]>>>4;r[0x42e+s]=(r[0x42e+s]-r[0x1c])&255;r[0x43c+s]=128;r[0x44a+s]=0;
}
// Complete $A2FA..$A41A plus its translated callees. The original owner and command
// RAM, not a host-created recipient/strength, choose the target and velocity.
export function launchPass(r,s=12){
 check(r,s);const owner=r[0x4d6];if(owner>11)throw new RangeError('Pass owner must be an original player slot');const side=owner&1;let target=255,forceFallback=false;
 if(!(r[0x650+owner]&128)){let angle=r[0x4b0+owner];if(angle===255)angle=r[0x4a3+owner]|64;r[0x4b0+s]=angle&224;r[0x67e+side]=r[0x4b0+s];forceFallback=!!(r[0x57]&32);}
 if(!forceFallback){if(r[0x67e+side]&16){target=r[0x67e+side]&15;/* A335 AND0F; A393 indexes RAM directly, including 12..15. */}
 else{r[0x28]=side|10;r[0x29]=2;r[0x2b]=32;r[0x2a]=r[0x67e+side]&224;target=selectPassTarget(r,s,side);}}
 if(target===255){const index=(((r[0x67e+side]&224)>>>1)|r[0x4a3+s])>>>2;if(index>60)throw new RangeError('Direction outside recovered fallback table');put(r,0x2e,0x2f,w(r,0x314+s,0x327+s)+tw(PASS_OFFSETS,index));put(r,0x30,0x31,w(r,0x34d+s,0x360+s)+tw(PASS_OFFSETS,index+2));}
 else{
  r[0x668+target]=0x22;put(r,0x2e,0x2f,w(r,0x314+target,0x327+target));put(r,0x30,0x31,w(r,0x34d+target,0x360+target));
  if((r[0x6fc]&128)&&(r[0x486+target]&8)&&[3,0][side]!==r[0x2f]){
   const d=(w(r,0x314+s,0x327+s)-w(r,0x2e))&65535;const hi=d>>>8;
   if(hi===0||hi===255){r[0x1c]=hi===255?(-d)&255:d&255;const distance=r[0x1c]&128?127:r[0x1c],i=((distance>>>2)&252)+side*2;put(r,0x2e,0x2f,w(r,0x2e)+tw(PASS_LEAD_OFFSETS,i));}
  }
 }
 r[0x4b0+s]=aimAtTarget(r,s);choosePassStrength(r,s);scalePlanarVector(r,s);choosePassArc(r,s);if(r[0x2b]!==16)updateFlightCounter(r,s);
 return {target,angle:r[0x4b0+s]};
}
// $BB1E..$BBB9 bank04, original targeted shot direction (not nearest-goal heuristic).
export function aimShot(r,s=12){
 check(r,s);const y=w(r,0x34d+s,0x360+s);if(y>384)throw new RangeError('Shot Y outside recovered selector table');
 const index=(r[0x4a3+s]&128?4:0)+(r[0x50e]&128?0:2),tx=[0x380,0x400,0x80,0][index>>>1];put(r,0x2e,0x2f,tx);put(r,0x51b,0x51c,tx);
 const row=y<=160?0:y<=224?1:2;put(r,0x2c,0x2d,[0xbbce,0xbbd8,0xbbe2][row]);let ai=8;
 if(!(r[0x50f]&127)){let a=r[0x4b0+s];if(a===255){a=r[0x4a3+s]|64;r[0x4b0+s]=a;}ai=(a&192)>>>5;}
 let ty=tw(SHOT_TARGETS,row*10+ai);put(r,0x30,0x31,ty);put(r,0x51d,0x51e,ty);
 if(ty&32768){ty=y;put(r,0x30,0x31,ty);put(r,0x51d,0x51e,ty);r[0x2e]=r[0x51b]=0;if(r[0x2f]!==0)r[0x2f]=r[0x51c]=4;}
 const angle=aimAtTarget(r,s);r[0x4b0+s]=angle;return angle;
}
// bank04:$BA1B..$BB0D, with data $BB0E/$BD12/$BDD7. Actual team/player skill
// choice and height requirements, including the original CLC/SBC mirrored-X -1.
export function selectShotSpecial(r,s=12){
 check(r,s);const owner=r[0x4d6];if(owner>11)throw new RangeError('Shot owner outside roster');
 r[0x4a3+s]=r[0x4a3+owner];r[0x4b0+s]=r[0x4b0+owner];r[0x510]=r[0x50f]=r[0x512]=0;
 let position=w(r,0x314+s,0x327+s);if(r[0x4a3+s]&128)position=(1023-position)&65535;put(r,0x2c,0x2d,position);
 let group=0;for(const limit of [0x160,0x290,0x350]){if(position<limit)break;group+=2;}r[0x1c]=group;
 const addHP=value=>{r[0x4f0]=Math.min(255,r[0x4f0]+value);};
 if(r[0x399+s]===0){
  const action=r[0x459+owner]&127,highAction=action===0x33||action===0x37,difficulty=r[0x57]&3;
  if(difficulty>2)throw new RangeError('Difficulty 3 is outside recovered six-entry height tables');
  const entry=difficulty+(r[0x650+owner]&128?3:0),threshold=SPECIAL_HEIGHTS[(highAction?0:6)+entry];
  if(r[0x386+s]>=threshold){if(highAction)r[0x1c]++;let selected=[0,0,2,255,1,255,0,0][r[0x1c]];
   if(selected&128){let who=r[0x52c+(owner&1)]&15;if(who===0)who=(16+r[0x532+owner])&255;const i=(who<<1)&255;if(i+1>=SPECIAL_BY_PLAYER.length)throw new RangeError('Original special table roster index not recovered');r[0x1c]=i;addHP(SPECIAL_BY_PLAYER[i+1]);selected=SPECIAL_BY_PLAYER[i];}
   r[0x50f]=selected;if(selected===0x1e)r[0x525]=0x7f;
  }
 }
 addHP(tsubasaMisugiShotHP(r,owner)/* M-10: = r[0x4e4+owner] unless 三杉 seized */);const action=r[0x459+owner]&127;if((r[0x486+owner]&1)||action===0x43||action===0x47)addHP(0x28);
 if(r[0x50f]<3)addHP([10,20,30][r[0x50f]]);return r[0x50f];
}
// bank04:$BC7F..$BCE2 computes the dynamic special duration from actual X/direction.
function dynamicShotTimer(r,s){let reference=r[0x4a3+s]&128?(-0xb0)&65535:0xb0;reference=(reference+512)&65535;let d=(w(r,0x314+s,0x327+s)-reference)&65535;if(!(((d>>>8)^r[0x4a3+s])&128))d=0;if(d&32768)d=(-d)&65535;d>>>=3;put(r,0x2c,0x2d,d);return d&255;}
// bank04:$BBEC..$BC7C. Applies recovered subtype table, gravity/timer, red-shot
// two immediate integration calls, and original launch-height constraints.
export function initializeShotPhysics(r,s=12){
 check(r,s);const id=r[0x50f]&127;if(id*2+1>=SPECIAL_TRANSITIONS.length)throw new RangeError('Special transition index outside recovered table');
 const subtype=tsubasaNativeSubtype(r,SPECIAL_TRANSITIONS[id*2+1]);if(subtype>=SPECIAL_TIMERS.length)throw new RangeError('Special subtype outside recovered physics table');r[0x510]=subtype;
 const speed=SPECIAL_PHYSICS[subtype*2];if(speed){r[0x2c]=0;r[0x2d]=speed;scalePlanarVector(r,s);}
 r[0x42e+s]=SPECIAL_PHYSICS[subtype*2+1];r[0x420+s]=0;
 const duration=SPECIAL_TIMERS[subtype];r[0x4c9]=duration&128?dynamicShotTimer(r,s):duration;r[0x44a+s]=0;r[0x43c+s]=128;
 prepareTsubasaShotPhysics(r,s);
 const sounds=[];if(!(r[0x512]&128)){r[0x512]=(r[0x512]-1)&255;const sound=[0x29,0x28,0x2a][id===0?0:id<4?1:2];if(!(r[0x58b]&64)){r[0x1b]=sound;r[0x7ff]=sound;sounds.push(sound);}integrateShotMotion(r,s);integrateShotMotion(r,s);}
 if(r[0x399+s]&128){r[0x386+s]=r[0x399+s]=0;}else if(subtype===0&&r[0x386+s]<8)r[0x386+s]=8;
 return {sounds,audioEngineComplete:false};
}
// Original state05 initialization subsequence $8EEE..$8F07 (before animation/update).
// Does not manufacture ball state05 from a button event; the recovered dispatcher
// must enter that action at its original animation-triggered time.
export function initializeShotAction(r,s=12){
 check(r,s);r[0x459+s]|=128;r[0x87+s]=r[0x94+s]=r[0x46c+s]=0;const sourceSpecialId=selectShotSpecial(r,s);r[0x50f]|=128;aimShot(r,s);clearMotion(r,s);beginTsubasaShot(r,sourceSpecialId,s);const result=initializeShotPhysics(r,s);updateFlightCounter(r,s);return result;
}
// bank04:$BCE3..$BD0E: next special transition, not a custom skill sequence.
export function advanceShotSpecial(r,s=12){
 check(r,s);const id=r[0x50f]&127;if(id*2>=SPECIAL_TRANSITIONS.length)throw new RangeError('Special transition outside recovered table');let next=SPECIAL_TRANSITIONS[id*2];
 if(tsubasaSpecialAdvance(r,id))return;
 if(!next){r[0x510]=0;r[0x4f0]=0;return;}
 if(next&128){if(r[0x386+s]!==0&&r[0x4c9]===0)return;next&=127;}
 r[0x50f]=next;r[0x87+s]=0;r[0x94+s]=0;
}
// bank06:$93D1..$9434 with original 16-direction table. LSR→ADC keeps bit0 carry.
export function velocityFrom16Directions(r,s,strength){
 check(r,s);strength&=255;let multiplier=(strength+(strength>>>1)+(strength&1))&255;r[0x1c]=multiplier;
 const i=(r[0x4b0+s]&240)>>>2;let vx=tw(DIRECTION16,i),vy=tw(DIRECTION16,i+2),ox=0,oy=0;
 do{const use=multiplier&1;multiplier>>>=1;if(use){ox=(ox+vx)&65535;oy=(oy+vy)&65535;}vx=(vx<<1)&65535;vy=(vy<<1)&65535;}while(multiplier);
 r[0x1c]=0;put(r,0x2c,0x2d,vx);put(r,0x2e,0x2f,vy);put(r,0x3e8+s,0x3f6+s,ox);put(r,0x404+s,0x412+s,oy);
}
// bank06:$9475..$949B: HP decay on exact frame mask with original minimum-10 rule.
export function decaySpecialBallHP(r){if((r[0x510]|r[0x50f])&&(r[0x300]&3)===0)r[0x4f0]=r[0x4f0]===0?0:Math.max(10,r[0x4f0]-1);}
// bank06:$949C..$94D8, dry/wet arc table.
export function initializeBallArc(r,s,kind){check(r,s);if(!Number.isInteger(kind)||kind<0||kind>5)throw new RangeError('Ball arc table indices 0..5');const i=kind*4+(r[0x50d]&128?2:0);put(r,0x420+s,0x42e+s,tw(BALL_ARCS,i));r[0x43c+s]=128;r[0x44a+s]=0;}

// State04 first-entry initialization $8E94..$8EB6. Per-frame integration and
// animation are intentionally left to the original action dispatcher.
export function initializePassAction(r,s=12){
 check(r,s);r[0x459+s]|=128;r[0x87+s]=r[0x94+s]=r[0x46c+s]=0;const owner=r[0x4d6];if(owner>11)throw new RangeError('Pass owner outside roster');r[0x4a3+s]=r[0x4a3+owner];r[0x4b0+s]=r[0x4b0+owner];if(r[0x399+s]&128)r[0x386+s]=r[0x399+s]=0;clearMotion(r,s);const out=launchPass(r,s);noteTsubasaPartnerPass(r,out);noteTsubasaMisugiPass(r,out);/* M-10 */return out;
}
// Fixed C020 -> F469..F4C0: normalized unsigned16 division. The original
// dividend1 early exit returns quotient0 (same normalization quirk as24-bit).
// Input/output quotient $2C/$2D, divisor $2E/$2F unchanged, remainder $30/$31.
export function divideOriginal16By16(r){let q=w(r,0x2c),d=w(r,0x2e),rem=0;r[0x30]=r[0x31]=0;if(!d){r[0x2c]=r[0x2d]=0;return;}
 let count=16,carry=0;for(;;){carry=q>>>15;q=(q<<1)&65535;put(r,0x2c,0x2d,q);if(!--count)return;if(carry)break;}q|=1;count++;r[0x1c]=count;
 for(;;){rem=((rem<<1)|carry)&65535;if(rem>=d)rem-=d;else q=(q&0xff00)|((q-1)&255);put(r,0x2c,0x2d,q);put(r,0x30,0x31,rem);r[0x1c]=--count;if(!count)return;carry=q>>>15;q=((q<<1)|1)&65535;}
}
// C02C -> F59B..F5E3: unsigned24-by8 shift/add with early overflow exit.
// Unlike ordinary JS multiplication, a shifted multiplicand overflow aborts even
// when unprocessed multiplier bits remain. Scratch/input destruction is preserved.
export function multiplyOriginal24By8(r){let multiplicand=u24(r,0x1c),multiplier=r[0x1f],product=0;p24(r,0x23,multiplicand);p24(r,0x20,0);
 while(multiplier){const bit=multiplier&1;multiplier>>>=1;r[0x1f]=multiplier;if(bit){const sum=product+multiplicand;product=sum&0xffffff;p24(r,0x20,product);if(sum>0xffffff)return {product,overflow:true};}const shifted=multiplicand*2;multiplicand=shifted&0xffffff;p24(r,0x23,multiplicand);if(shifted>0xffffff)return {product,overflow:true};}
 return {product,overflow:false};}
