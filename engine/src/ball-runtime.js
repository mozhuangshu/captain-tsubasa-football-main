// bank06:$8CAF..$8CE0, original dispatcher destinations (data).
export const BALL_DISPATCH_ROOTS = [225, 140, 200, 143, 67, 141, 106, 141, 143, 142, 233, 142, 123, 143, 238, 143, 95, 144, 218, 144, 76, 146, 159, 146, 90, 147, 209, 147, 38, 146, 57, 141, 212, 146, 33, 142, 80, 142, 85, 141, 71, 145, 141, 147, 226, 140, 107, 146, 59, 144];
// Original ball runtime; direct gameplay functions, not a CPU interpreter.
// bank04:$BE0C..$BE63
export const SHOT_ANIMATION_ROOTS = [100, 190, 109, 190, 109, 190, 109, 190, 118, 190, 125, 190, 134, 190, 141, 190, 153, 190, 158, 190, 172, 190, 179, 190, 184, 190, 191, 190, 214, 190, 227, 190, 148, 190, 165, 190, 141, 190, 134, 190, 205, 190, 196, 190, 236, 190, 245, 190, 4, 191, 19, 191, 43, 191, 52, 191, 68, 191, 77, 191, 91, 191, 100, 191, 107, 191, 112, 191, 255, 190, 14, 191, 25, 191, 59, 191, 66, 191, 82, 191, 43, 191, 52, 191, 130, 190, 125, 190];
// bank04:$BE64..$BF78
export const SHOT_ANIMATION_DATA = [1, 128, 1, 129, 1, 130, 1, 131, 254, 1, 0, 1, 28, 1, 2, 1, 29, 254, 1, 8, 1, 16, 1, 10, 254, 1, 52, 1, 53, 254, 1, 65, 0, 69, 1, 11, 1, 12, 1, 13, 254, 1, 139, 1, 140, 1, 141, 254, 1, 14, 1, 15, 254, 1, 24, 1, 25, 254, 1, 0, 1, 13, 1, 10, 254, 1, 8, 1, 9, 1, 10, 254, 4, 19, 4, 20, 4, 21, 254, 2, 22, 2, 23, 254, 1, 182, 1, 183, 1, 184, 254, 2, 26, 2, 27, 254, 1, 0, 1, 28, 1, 2, 1, 29, 255, 2, 17, 2, 18, 2, 17, 2, 18, 255, 1, 8, 1, 16, 1, 10, 1, 8, 1, 16, 1, 10, 255, 1, 24, 1, 13, 1, 25, 1, 141, 254, 1, 37, 1, 38, 1, 39, 1, 40, 254, 3, 45, 3, 49, 2, 50, 2, 51, 252, 2, 2, 50, 2, 51, 254, 3, 45, 3, 46, 2, 47, 2, 48, 252, 2, 2, 47, 2, 48, 254, 2, 64, 1, 65, 0, 69, 8, 69, 1, 65, 2, 0, 2, 69, 1, 0, 1, 1, 1, 2, 1, 3, 252, 4, 1, 60, 1, 61, 1, 62, 1, 63, 254, 2, 57, 2, 58, 2, 59, 254, 1, 59, 1, 58, 1, 57, 255, 0, 57, 1, 41, 1, 42, 1, 43, 1, 44, 254, 1, 32, 1, 33, 254, 1, 30, 1, 31, 1, 30, 1, 31, 255, 1, 60, 1, 61, 1, 62, 1, 63, 254, 1, 34, 1, 35, 1, 36, 254, 1, 64, 1, 65, 254, 1, 66, 1, 67, 1, 68, 1, 195, 254];
// bank06:$90CA..$90D9
export const BOUNCE_COST = [0, 1, 0, 2, 0, 2, 0, 4, 0, 8, 0, 16, 0, 8, 0, 16];
import {integrateMotion,clearMotion,limitNegativeHeight} from './physics.js';
import {clampTsubasaMorisakiSaveApproach} from './tsubasa-morisaki-save.js';
import {beforeTsubasaBallIntegration,afterTsubasaBallIntegration,syncTsubasaSpecialMoves,drainTsubasaSpecialEvents} from './tsubasa-special-moves.js';
import {lookupSurface} from './terrain.js';
import {positionHeldBall,positionFixedHeldBall} from "./ball-held-position.js";
import {limitPlanarSpeed} from './goal.js';
import {initializePassAction,initializeShotAction,aimShot,initializeShotPhysics,updateFlightCounter,advanceShotSpecial,decaySpecialBallHP,velocityFrom16Directions,initializeBallArc} from './ball-actions.js';
import {scanBallPlayerContacts,clearBallPower} from './ball-collision.js';
import {applyBallFriction,advanceBallRotation} from './menu-ball-motion.js';
import {queuePlayerFootprint,orientPlayerFrame} from './player-actions.js';
import {initializeMovement,advanceAnimationRecord} from './sprite-animation.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
const snd=(r,events,id)=>{if(!(r[0x58b]&64)){r[0x1b]=r[0x7ff]=id;events.push({type:'sound',soundId:id});}};
// 977B: field texture lookup and original footprint eligibility.
export function updateBallSurface(r,x=12){
 if(!r[0xd9+x]){r[0x130+x]=0;return;}if(r[0x58])return;lookupSurface(r,x);if(!r[0x130+x]||(r[0x492]&16))return;
 if((((r[0x492]<<1)|r[0x492])&128)&&!(r[0x399+x]&128)&&(r[0x399+x]|r[0x386+x]))return;queuePlayerFootprint(r,x);
}
export function accumulateBallWetness(r,x=12){if(r[0x130+x]===1)r[0x50d]=Math.min(255,r[0x50d]+1);}
// 96DA..971E: player-controlled ordinary shot lateral correction.
export function steerOrdinaryShot(r,x=12){
 if(r[0x510])return;const y=r[0x4d6],angle=r[0x4b0+y];if((r[0x650+y]&128)||angle===255)return;const delta=[-128,-128,0,128,128,128,0,-128][angle>>>5],hi=r[0x412+x],sign=delta<0?128:0;if(!((hi^sign)&128)&&((hi&128)?(-hi)&255:hi)>=4)return;put(r,0x404+x,0x412+x,w(r,0x404+x,0x412+x)+delta);
}
// bank04 BDE3 -> fixed CEBD, all 44 original special-ball animation records.
export function animateShotBall(r,x=12){
 put(r,0x30,0x31,0xbe0c);put(r,0x32,0x33,0xbce3);const id=r[0x5c]&64?0:r[0x50f]&127;if(id>=44)throw new RangeError('Shot animation table index');const p=SHOT_ANIMATION_ROOTS[id*2]|SHOT_ANIMATION_ROOTS[id*2+1]<<8;
 return advanceAnimationRecord(r,x,SHOT_ANIMATION_DATA.slice(p-0xbe64),{onEnd:()=>advanceShotSpecial(r,x),onSound:(id)=>{r[0x1b]=r[0x7ff]=id;}});
}
function landing(r,x){if(!(r[0x399+x]&128))return;updateBallSurface(r,x);accumulateBallWetness(r,x);let next=8;if(r[0x130+x]>=2){limitNegativeHeight(r,x);next=1;}else r[0x386+x]=r[0x399+x]=0;if(r[0x459+x]&128)r[0x459+x]=next;}
function resting(r,x,action){
 if(!(r[0x459+x]&128)){initializeMovement(r,x);clearBallPower(r);if(action===7)r[0x74+x]&=0x83;for(const a of [0x420,0x42e,0x43c,0x44a])r[a+x]=0;}
 if(action===1&&r[0x130+x]>=2)clearMotion(r,x);
 else {let vx=r[0x3f6+x],vy=r[0x412+x];if(vx&128)vx^=255;if(vy&128)vy^=255;if(!vx&&!vy)applyBallFriction(r,x,0);}
 updateBallSurface(r,x);accumulateBallWetness(r,x);applyBallFriction(r,x,0);integrateMotion(r,x);advanceBallRotation(r,x);return scanBallPlayerContacts(r,x).events;
}
// 8CAF dispatcher body only: frame-level caller performs the subsequent possession,
// boundary, render and counter steps. No unrequested extra integration is inserted.
export function updateBallAction(r,x=12){
 if(x!==12)throw new RangeError('Ball action dispatcher requires slot 12');syncTsubasaSpecialMoves(r);const action=r[0x459+x]&127,first=!(r[0x459+x]&128),events=[];if(action>=25)throw new RangeError('Ball dispatch table boundary');put(r,0x2c,0x2d,BALL_DISPATCH_ROOTS[action*2]|BALL_DISPATCH_ROOTS[action*2+1]<<8);
 if(action===0)return {action,events};
 if(action===1||action===7){events.push(...resting(r,x,action));return {action,events};}
 if(action===4){if(first){initializePassAction(r,x);if(r[0x2b]===16){advanceBallRotation(r,x);integrateMotion(r,x);r[0x420+x]=r[0x42e+x]=0;r[0x459+x]=7;return {action,events};}}
  advanceBallRotation(r,x);integrateMotion(r,x);decaySpecialBallHP(r);if(r[0x42e+x]&128)r[0x459+x]=6;landing(r,x);return {action,events};}
 if(action===5){if(first){const init=initializeShotAction(r,x);events.push(...init.sounds.map(soundId=>({type:'sound',soundId})));}else if(!(r[0x50f]&128)){r[0x50f]|=128;aimShot(r,x);clearMotion(r,x);const init=initializeShotPhysics(r,x);events.push(...init.sounds.map(soundId=>({type:'sound',soundId})));updateFlightCounter(r,x);}
  if(r[0x5c]&64)clearBallPower(r);events.push(...animateShotBall(r,x));orientPlayerFrame(r,x);steerOrdinaryShot(r,x);beforeTsubasaBallIntegration(r,x);clampTsubasaMorisakiSaveApproach(r,x);/* M-9: no-op unless 森崎 is armed */integrateMotion(r,x);afterTsubasaBallIntegration(r,x);decaySpecialBallHP(r);if(r[0x510]!==3)limitPlanarSpeed(r,x);events.push(...scanBallPlayerContacts(r,x).events);syncTsubasaSpecialMoves(r);events.push(...drainTsubasaSpecialEvents(r));
  if(!r[0x4c9]){advanceShotSpecial(r,x);if(!(r[0x4f0]|r[0x510])&&(r[0x459+x]&128)){r[0x459+x]=6;landing(r,x);return {action,events};}}
  updateBallSurface(r,x);if(r[0x399+x]&128){r[0x386+x]=r[0x399+x]=0;advanceShotSpecial(r,x);snd(r,events,0x3e);if(r[0x130+x]>=2&&r[0x50f]===3){r[0x510]=4;r[0x50f]=16;}}return {action,events};
 }
 if(action===6){if(first)initializeMovement(r,x);advanceBallRotation(r,x);integrateMotion(r,x);decaySpecialBallHP(r);events.push(...scanBallPlayerContacts(r,x).events);if(r[0x399+x]&128)updateBallSurface(r,x);landing(r,x);return {action,events};}
 if(action===8){if(first){initializeMovement(r,x);snd(r,events,0x3d);applyBallFriction(r,x,1);}let i=r[0x13c]*4;if(r[0x50d]&128){r[0x74+x]=6;i+=2;}if(i+1>=BOUNCE_COST.length)throw new RangeError('Bounce surface table');const v=w(r,0x420+x,0x42e+x),halved=(v>>>1)|32768,cost=BOUNCE_COST[i]|BOUNCE_COST[i+1]<<8,n=(halved^65535)-cost;put(r,0x420+x,0x42e+x,n);if(n<0){r[0x420+x]=r[0x42e+x]=0;r[0x459+x]=7;}else if(r[0x459+x]&128){updateFlightCounter(r,x);integrateMotion(r,x);clearBallPower(r);r[0x459+x]=6;}events.push(...scanBallPlayerContacts(r,x).events);return {action,events};}
 if(action===0x16){if(first){initializeMovement(r,x);r[0x4c9]=64;initializeBallArc(r,x,5);}if(!(r[0x42e+x]&128)){r[0x4b0+x]=(r[0x4b0+x]+(r[0x4c9]&252))&255;velocityFrom16Directions(r,x,2);put(r,0x3e8+x,0x3f6+x,w(r,0x3e8+x,0x3f6+x)+w(r,0x3f5,0x403));put(r,0x404+x,0x412+x,w(r,0x404+x,0x412+x)+w(r,0x411,0x41f));}advanceBallRotation(r,x);integrateMotion(r,x);landing(r,x);return {action,events};}
 if(action===0x18){if(first)initializeMovement(r,x);r[0x4b0+x]=0;clearMotion(r,x);velocityFrom16Directions(r,x,8);integrateMotion(r,x);advanceBallRotation(r,x);events.push(...scanBallPlayerContacts(r,x).events);r[0x465]=7;return {action,events};}
 if(action===0x0d){velocityFrom16Directions(r,x,0x93);return {action,events};}
 if(action===10||action===14){if(action===14){initializeMovement(r,x,10);const y=r[0x4d6];for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+x]=r[a+y];r[0x43c+x]=128;r[0x44a+x]=0;}else if(first){initializeMovement(r,x);clearMotion(r,x);initializeBallArc(r,x,1);updateFlightCounter(r,x);}advanceBallRotation(r,x);integrateMotion(r,x);events.push(...scanBallPlayerContacts(r,x).events);landing(r,x);return {action,events};}
 if([11,12,16,23].includes(action)){if(first){initializeMovement(r,x);const y=r[0x4d6];if(action!==12)clearBallPower(r);
   if(action===23){r[0x4a3+x]^=128;r[0x4b0+x]=(((r[0x300]&7)<<4)|r[0x4a3+x])&240;velocityFrom16Directions(r,x,2);initializeBallArc(r,x,4);integrateMotion(r,x);}
   else {r[0x4a3+x]=r[0x4a3+y];r[0x4b0+x]=action===12?r[0x496+y]:r[0x4a3+y]|64;clearMotion(r,x);velocityFrom16Directions(r,x,2);initializeBallArc(r,x,action===11?2:action===12?3:1);updateFlightCounter(r,x);
    if(action===16){let d=(r[0x34d+x]-r[0x34d+y])&255;d=(d&128?d-256:d)*64;put(r,0x2c,0x2d,d);put(r,0x404+x,0x412+x,w(r,0x404+x,0x412+x)+d);if(!((r[0x2d]^r[0x3f6+x])&128))d=-d;d=(d*2)&65535;put(r,0x2c,0x2d,d);put(r,0x3e8+x,0x3f6+x,w(r,0x3e8+x,0x3f6+x)+d);}
   }}advanceBallRotation(r,x);integrateMotion(r,x);r[0x459+x]=6;return {action,events};}
 if(action===9||action===21){if(first){initializeMovement(r,x);if(action===9){const y=r[0x4d6];put(r,0x420+x,0x42e+x,w(r,0x420+y,0x42e+y)+128);r[0x43c+x]=128;r[0x44a+x]=0;clearBallPower(r);}else{r[0x526]=0;initializeBallArc(r,x,5);}}
  followBallOwnerVelocity(r,x,action===9?0:1);if(action===21)advanceBallRotation(r,x);integrateMotion(r,x);const y=r[0x4d6];put(r,0x34d+x,0x360+x,w(r,0x34d+y,0x360+y)+1);
  if(action===21){events.push(...scanBallPlayerContacts(r,x).events);r[0x526]++;if(r[0x526]>=14)r[0x459+x]=6;landing(r,x);}
  else {const diff=(w(r,0x386+x,0x399+x)-w(r,0x386+y,0x399+y))&65535;if(diff&32768){r[0x386+x]=r[0x386+y];r[0x399+x]=r[0x399+y];}if((diff&32768)||(r[0x399+x]&128)){advanceBallRotation(r,x);r[0x459+x]=3;}}
  return {action,events};}
 if(action===2||action===15||action===19){if(action===15){r[0x459+x]=2;r[0x525]=0;}if(!(r[0x459+x]&128)){initializeMovement(r,x);clearBallPower(r);}if(action===19){positionFixedHeldBall(r,x);r[0x74+x]=r[0x4a3+x];}else{positionHeldBall(r,x);advanceBallRotation(r,x);}return {action,events};}
 if(action===3){if(first)initializeMovement(r,x);updateBallSurface(r,x);accumulateBallWetness(r,x);r[0x513]=r[0x386+x];r[0x514]=r[0x399+x];positionHeldBall(r,x);r[0x420+x]=r[0x42e+x]=0;
  if(r[0x399+x]&128){if(r[0x513]&128){r[0x386+x]=r[0x513];r[0x399+x]=r[0x514];}else r[0x386+x]=r[0x399+x]=0;}
  r[0x2c]=r[0x2d]=0;const y=r[0x4d6],p=r[0x459+y]&127;if(!(r[0x486+y]&128)&&p>=32&&p!==32&&p!==15&&p!==47&&!(r[0x399+x]&128)){r[0x2c]=(r[0x300]&7)>>>1;if(!r[0x2c])snd(r,events,0x24);}
  if((r[0x4a3+x]&128)&&r[0x2c])put(r,0x2c,0x2d,-r[0x2c]);put(r,0x314+x,0x327+x,w(r,0x314+x,0x327+x)+w(r,0x2c));if(r[0x130+x]!==2&&(r[0x399+x]&128))r[0x373+x]=r[0x386+x]=r[0x399+x]=0;advanceBallRotation(r,x);return {action,events};}
 if(action===17||action===18){if(first)initializeMovement(r,x);positionBallUnderRider(r,x);const y=r[0x4d6];
  if(action===17){if(!(r[0x399+x]&128))for(const a of [0x399,0x386,0x373,0x42e,0x420])r[a+x]=0;if(r[0x486+y]&128)r[0x485]=1;advanceBallRotation(r,x);}
  else {r[0x74+x]=4;if(r[0x50d]){r[0x87+x]++;if(r[0x87+x]<4)r[0x74+x]=5;r[0x50d]=0;}if((r[0x459+y]&128)&&(r[0x459+y]&127)!==2){r[0x465]=17;r[0x74+x]=0;}}
  return {action,events};}
 if(action===20){if(first){initializeMovement(r,x);for(const [i,l,h]of[[0x1e,0x314,0x327],[0x20,0x34d,0x360],[0x22,0x386,0x399]])put(r,i,i+1,w(r,l+x,h+x));positionHeldBall(r,x);
   for(const [old,l,h,vl,vh,z] of [[0x1e,0x314,0x327,0x3e8,0x3f6,false],[0x20,0x34d,0x360,0x404,0x412,false],[0x22,0x386,0x399,0x420,0x42e,true]]){let d=(r[old]-r[l+x]+(z?8:0))&255;d=(d&128?d-256:d)*32;put(r,0x1c,0x1d,d);put(r,vl+x,vh+x,(z?1024:w(r,vl+x,vh+x))-d);}
   r[0x44a+x]=0;r[0x43c+x]=128;for(const [i,l,h]of[[0x1e,0x314,0x327],[0x20,0x34d,0x360],[0x22,0x386,0x399]])put(r,l+x,h+x,w(r,i));
  }advanceBallRotation(r,x);integrateMotion(r,x);landing(r,x);return {action,events};}
 throw new RangeError(`Ball action ${action.toString(16)} not yet converted`);
}

// 97C6..983E: owner-following planar velocity, preserving the low-byte equality test.
export function followBallOwnerVelocity(r,x=12,kind=0){if(kind!==0&&kind!==1)throw new RangeError('Owner velocity table');r[0x1c]=kind*4;const y=r[0x4d6];for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+x]=r[a+y];const target=(w(r,0x314+y,0x327+y)+(r[0x4a3+y]&128?-1:1)*(kind?8:10))&65535;put(r,0x2c,0x2d,target);if(((target-r[0x314+x])&255)===0)return;const negative=!!((target-w(r,0x314+x,0x327+x))&32768);put(r,0x3e8+x,0x3f6+x,w(r,0x3e8+x,0x3f6+x)+(negative?-1:1)*(kind?48:128));}

// 972F..977A, positioning used by the two ball-riding actions.
export function positionBallUnderRider(r,x=12){updateBallSurface(r,x);if(!r[0x130+x])r[0x373+x]=r[0x386+x]=r[0x399+x]=0;const y=r[0x4d6];r[0x314+x]=r[0x314+y];r[0x327+x]=r[0x327+y];put(r,0x34d+x,0x360+x,w(r,0x34d+y,0x360+y)+1);for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+x]=r[a+y];}
// 9609..9641: electric timer/animation substitution, separate from action body.
export function updateElectricBallAppearance(r,x=12){if(r[0x525]){if(r[0x5c]&64)r[0x525]=0;else {r[0x50d]=0;if(r[0x300]&1){r[0x525]--;r[0x74+x]=7|r[0x4a3+x];return;}}}if((r[0x74+x]&127)===7)r[0x74+x]=3|r[0x4a3+x];}
