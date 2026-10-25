import {tsubasaMisugiRunStrength} from './tsubasa-misugi-heart.js';
import {storyRunStrength} from './tsubasa-story-stats.js';
import {beforeTsubasaAcrobatAction,afterTsubasaAcrobatAction} from './tsubasa-acrobat-move.js';
import {prepareTsubasaDefensiveAction,finishTsubasaDefensiveAction,beginTsubasaDefensivePlayerContact,finishTsubasaDefensivePlayerContact} from './tsubasa-defensive-moves.js';
import {isTsubasaSpecialMovesEnabled} from './tsubasa-special-moves.js';
import {FRICTION_WORDS,SURFACE_VERTICAL_MODES,SURFACE_VERTICAL_SPEEDS} from './player-actions-data.js';
import {PLAYER_SPEED_STRENGTHS,PLAYER_WET_PENALTIES,RUN_ANGLES,PLAYER_DIRECTION_VECTORS} from './player-actions-data.js';
import {AIR_CONTROL_VECTORS} from './player-actions-data.js';
import {ATTACK_ANGLES,ANGLE_SUBTYPES} from './player-actions-data.js';
import {collidePlayers,collideAirPlayers} from './player-collision.js';
import {integrateMotion,initializeJump,clearMotion} from './physics.js';
import {lookupSurface,resolveGround} from './terrain.js';
import {fieldBoundary,limitPlanarSpeed} from './goal.js';
import {initializeMovement,resetVerticalAndYMotion,advancePlayerAnimation,finishPlayerAnimation} from './sprite-animation.js';
const w=(r,l,h)=>r[l]|r[h]<<8;
const put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
// 06:9A7A..9AFB, sign-crossing saturation on both planar velocities.
export function applyPlayerFriction(r,x,kind){
 const i=(kind&7)*4+((r[0x4d7+x]&128)?0:r[0x130+x]),drag=FRICTION_WORDS[i];
 if(drag===undefined)throw new RangeError('Unrecovered friction table entry');
 for(const [l,h] of [[0x3e8,0x3f6],[0x404,0x412]]){const v=w(r,l+x,h+x),negative=!!(v&32768);let next=(v+(negative?drag:-drag))&65535;if(!!(next&32768)!==negative)next=0;put(r,l+x,h+x,next);}
}
// 07:D7F3..D890: queue an original footprint nametable address.
export function queuePlayerFootprint(r,x){
 if(r[0x5f0]>=4||!r[0xd9+x]||!(r[0x3e8+x]|r[0x3f6+x]|r[0x404+x]|r[0x412+x])||r[0x327+x]>=4)return;
 const yh=r[0x360+x],yl=r[0x34d+x];if(yh>=2||(yh===0?yl<16:yl>=104)||!((x^r[0x300])&1))return;
 const slot=r[0x5f0];r[0x43]=x;r[0x1c]=r[0x314+x]>>>3;r[0x1e]=yl&248;r[0x1f]=yh;
 let high=8;if(yh!==0||r[0x1e]>=240){high=10;r[0x1e]=(r[0x1e]-240)&255;}
 const shifted=((high<<8)|r[0x1e])<<2;r[0x1d]=shifted&255;r[0x5e8+slot]=(shifted>>>8)&255;r[0x5ec+slot]=(r[0x1d]+r[0x1c])&255;r[0x5f0]++;
}
export function updatePlayerSurface(r,x){r[0x130+x]=0;if(r[0x58]!==0)return;if(r[0xd9+x])lookupSurface(r,x);if(r[0x130+x]&&!(r[0x486+x]&128))queuePlayerFootprint(r,x);}
// 07:CDCB..CE2F. Table boundary is explicit; no invented high-action rows.
export function preparePlayerVerticalMotion(r,x){
 if(!(r[0x399+x]&128)&&(r[0x399+x]|r[0x386+x])){r[0x43c+x]=128;r[0x44a+x]=0;return;}
 if(r[0x130+x]<2){r[0x373+x]=r[0x386+x]=r[0x399+x]=0;return;}
 let mode=6;if(!(r[0x5c]&64)){const i=((r[0x459+x]<<1)&255)+(r[0x130+x]&1);mode=SURFACE_VERTICAL_MODES[i];if(mode===undefined)throw new RangeError('Unrecovered vertical surface action entry');}
 let speed=0;if(!(mode&128)){speed=SURFACE_VERTICAL_SPEEDS[mode];if(speed===undefined)throw new RangeError('Unrecovered vertical speed entry');if(!(speed&32768)&&!(r[0x399+x]&128))speed=0;}
 put(r,0x420+x,0x42e+x,speed);
}
export function followRiddenBallHeight(r,x){if(!(r[0x486+x]&16))return;r[0x130+x]=0;put(r,0x386+x,0x399+x,w(r,0x392,0x3a5)+((r[0x465]&127)===0x12?9:13));for(const a of [0x420,0x42e,0x43c,0x44a])r[a+x]=0;}
export function orientPlayerFrame(r,x){
 const state=r[0x486+x];let flip=r[0x4a3+x]&128;
 if((state&64)&&((state&128)||!(state&8))&&(r[0x465]&127)===9)flip=(((w(r,0x320,0x333)-w(r,0x314+x,0x327+x))&65535)>>>8)&128;
 r[0x74+x]^=flip;
}
// 06:810F..812D, exact caller order. F0 queues ball action; it does not launch it here.
export function updatePlayerCommonFrame(r,x,frictionKind,options={}){
 applyPlayerFriction(r,x,frictionKind);updatePlayerSurface(r,x);preparePlayerVerticalMotion(r,x);integrateMotion(r,x);followRiddenBallHeight(r,x);resolveGround(r,x);
 if(fieldBoundary(r,x)){r[0x34d+x]=r[0x30];r[0x360+x]=r[0x31];r[0x314+x]=r[0x32];r[0x327+x]=r[0x33];}
 const events=advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options});orientPlayerFrame(r,x);return events;
}
// 06:A28F..A2D0, including original low-byte-only height comparison.
export function selectKickAnimationSubtype(r,x,heightKind=0){
 r[0x44]=heightKind;const threshold=[16,32,48,8][r[0x486+x]&32?3:heightKind];
 if(threshold===undefined)throw new RangeError('Unrecovered kick height kind');
 const dz=(w(r,0x392,0x3a5)-w(r,0x386+x,0x399+x))&65535;r[0x1c]=dz&255;
 if((dz&32768)||(dz&255)>=threshold)return;r[0x46c+x]++;
 const dx=(w(r,0x314+x,0x327+x)-w(r,0x320,0x333))&65535;if(!((dx>>>8^r[0x4a3+x])&128))r[0x46c+x]++;
}
export function faceSelectedPassTarget(r,x){if(!(r[0x650+x]&128))return;const target=r[0x67e+(x&1)];if(!(target&16))return;const y=target&15,dx=(w(r,0x314+x,0x327+x)-w(r,0x314+y,0x327+y))&65535;r[0x4a3+x]=((dx>>>8)&128)^128;}
// 06:8296..82C9. 15 aliases the original 0A handler.
export function updateOrdinaryKickAction(r,x,options){
 const action=r[0x459+x]&127;if(![7,8,9,10,21].includes(action))throw new RangeError('Expected original action 07..0A or 15');
 if(!(r[0x459+x]&128)){if(action===7&&(r[0x486+x]&1)){r[0x459+x]=0x43;return [];}
 initializeMovement(r,x);selectKickAnimationSubtype(r,x,action<9?1:0);if(action===7||action===9)r[0x4a3+x]=(r[0x57]&32)?0:(x&1)*128;else faceSelectedPassTarget(r,x);resetVerticalAndYMotion(r,x);}
 return updatePlayerCommonFrame(r,x,3,options);
}
export function faceNewPlayerAngle(r,x){const angle=r[0x4b0+x];if(angle!==255&&(angle&127))r[0x4a3+x]=angle&128;}
// 06:A03F..A132. Returns true when the original pops its caller and exits.
export function redirectPlayerSkillAction(r,x,skillIndex,action=r[0x459+x]){
 if(skillIndex<0||skillIndex>6)throw new RangeError('Original skill dispatch has seven entries');
 if(isTsubasaSpecialMovesEnabled(r)&&r[0x58]===0)return false;
 r[0x1c]=action;r[0x1d]=skillIndex;
 const enabled=!!(r[0x4f1+x]&(128>>>skillIndex))||(skillIndex===2&&r[0x5fc]!==0&&(r[0x5fc]!==1||!!(r[0x486+x]&8)));
 if(!enabled)return false;let next;const state=r[0x486+x];
 if(skillIndex===0&&action===0x24)next=0x2f;
 if(skillIndex===1&&action===0x19)next=0x58;
 if(skillIndex===2&&(state&8)){if(action===0x32)next=0x4c;else if(action===0x33||action===0x34)next=0x48;}
 if(skillIndex===3&&action===0x41)next=0x5c;
 if(skillIndex===4&&(state&8))next=({49:0x4a,59:0x50,66:0x4e,34:0x4a,35:0x51})[action];
 if(skillIndex===5&&action===0x30&&(state&64))next=0x57;
 if(skillIndex===6&&(action===0x30||action===0x52)&&((x^r[0x4d6])&1)&&!(r[0x5c]&64)&&(r[0x4d6]<10||(r[0x690+r[0x4d6]]&128)))next=0x5b;
 if(next===undefined)return false;r[0x459+x]=next;return true;
}
export function setCurrentPlayerAngle(r,x){r[0x496+x]=r[0x4b0+x]===255?r[0x4a3+x]|64:r[0x4b0+x];}
// 06:A206..A273. Script/keeper/riding pose has priority over ordinary pose.
export function selectOrdinaryPlayerSubtype(r,x){
 const script=r[0x5c],side=x&1;let subtype;
 if((script&64)&&!(script&32)&&((script&15)?!!(script&2):!!r[0x559])){
  if(r[0x52a+side]&1)subtype=4;else if((r[0x52c+side]&15)!==15)subtype=[5,6,7,7,6,5][x>>>1];
 }
 if(subtype===undefined)subtype=x>=10&&!(r[0x67c+x]&128)&&!(script&64)?1:r[0x486+x]&1?2:r[0x486+x]&16?3:0;
 r[0x46c+x]=subtype;return subtype;
}
// 06:99F3..9A56: original signed shift/add direction scaling, preserving negative rounding.
export function setPlayerDirectionalVelocity(r,x,strength){
 let bits=strength&255,i=(r[0x496+x]&224)>>>3;
 let vx=PLAYER_DIRECTION_VECTORS[i]|PLAYER_DIRECTION_VECTORS[i+1]<<8,vy=PLAYER_DIRECTION_VECTORS[i+2]|PLAYER_DIRECTION_VECTORS[i+3]<<8;
 vx=vx<32768?vx:vx-65536;vy=vy<32768?vy:vy-65536;let sx=0,sy=0;
 do{const add=bits&128;bits=(bits<<1)&255;if(add){sx=(sx+vx)&65535;sy=(sy+vy)&65535;}vx>>=1;vy>>=1;}while(bits);
 put(r,0x3e8+x,0x3f6+x,sx);put(r,0x404+x,0x412+x,sy);put(r,0x2c,0x2d,vx);put(r,0x2e,0x2f,vy);r[0x1c]=0;
}
// 06:994C..99B9. Original non-21 path executes LDA #1D then LDA #20,
// so its BEQ branches are never taken; the resulting row is 7, not row4.
export function updatePlayerPlanarSpeed(r,x){
 let row=7;const state=r[0x486+x],speed=r[0x4d7+x];
 if((r[0x459+x]&127)===33)row=(state&17)?(state&16?5:6):(speed&128)?0:r[0x130+x]&3;
 r[0x1d]=row;r[0x1e]=speed&3;let strength=PLAYER_SPEED_STRENGTHS[row*4+(speed&3)];
 if(row<5)strength=(strength-PLAYER_WET_PENALTIES[(speed&3)+((r[0x50d]&128)?4:0)])&255;
 if(row===0){const story=storyRunStrength(x,!!(r[0x50d]&128));if(story!==null)strength=story;}
 strength=tsubasaMisugiRunStrength(r,x,strength,q=>{const sp=r[0x4d7+q]&3;let v=PLAYER_SPEED_STRENGTHS[row*4+sp];if(row<5)v=(v-PLAYER_WET_PENALTIES[sp+((r[0x50d]&128)?4:0)])&255;if(row===0){const st=storyRunStrength(q,!!(r[0x50d]&128));if(st!==null)v=st;}return v;});/* M-10: identity unless 三杉 seized */
 setPlayerDirectionalVelocity(r,x,strength);return strength;
}
// 06:83F3..8497, walk20, run21 and fast-movement1D; common tail is8409.
export function updatePlayerLocomotion(r,x,options={}){
 const action=r[0x459+x]&127;if(![0x20,0x21,0x1d].includes(action))throw new RangeError('Expected original locomotion action');
 if(!(r[0x459+x]&128)){initializeMovement(r,x);if(action===0x21)faceNewPlayerAngle(r,x);}
 if(action===0x1d){faceNewPlayerAngle(r,x);setCurrentPlayerAngle(r,x);setPlayerDirectionalVelocity(r,x,0x50);}
 else{
  selectOrdinaryPlayerSubtype(r,x);
  if(action===0x20){setCurrentPlayerAngle(r,x);updatePlayerPlanarSpeed(r,x);if(r[0x46c+x]===1)r[0x4a3+x]=(r[0x57]&32)?128:(x&1)*128;else faceNewPlayerAngle(r,x);}
  else{const a=r[0x4b0+x];r[0x496+x]=a===255?r[0x4a3+x]|64:RUN_ANGLES[(a>>>5)+((r[0x4a3+x]&128)?8:0)];
   if((r[0x496+x]^r[0x4a3+x])&128){r[0x459+x]=15;return [];}
   updatePlayerPlanarSpeed(r,x);faceNewPlayerAngle(r,x);
  }
 }
 return updatePlayerLocomotionTail(r,x,options);
}
export function updatePlayerLocomotionTail(r,x,options={}){
 updatePlayerSurface(r,x);preparePlayerVerticalMotion(r,x);integrateMotion(r,x);followRiddenBallHeight(r,x);resolveGround(r,x);
 if(fieldBoundary(r,x)){if((r[0x459+x]&127)===33)r[0x459+x]=1;r[0x34d+x]=r[0x30];r[0x360+x]=r[0x31];r[0x314+x]=r[0x32];r[0x327+x]=r[0x33];}
 const events=advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options});orientPlayerFrame(r,x);return events;
}
function soundEvent(events,options,value,r){r[0x1b]=r[0x7ff]=value;events.push({type:'sound',value});if(options.onSound)options.onSound(value,r);}
function clampPlayerBoundary(r,x){if(fieldBoundary(r,x)){r[0x34d+x]=r[0x30];r[0x360+x]=r[0x31];r[0x314+x]=r[0x32];r[0x327+x]=r[0x33];}}
// 06:84F5..8570. Collision callback is mandatory until its translation is installed.
export function updatePlayerGroundAttack(r,x,options={}){
 options={collidePlayers,...options};
 const action=r[0x459+x]&127;if(action!==34&&action!==35)throw new RangeError('Expected action22 or23');
 if(typeof options.collidePlayers!=='function')throw new Error('Original 9D65 player collision handler required');
 const events=[];
 if(!(r[0x459+x]&128)){
  if(action===34&&(r[0x486+x]&1)){r[0x459+x]=0x43;return events;}
  if(redirectPlayerSkillAction(r,x,4))return events;
  initializeMovement(r,x);if(action===35)faceNewPlayerAngle(r,x);soundEvent(events,options,0x3b,r);
  if(action===35||r[0x4b0+x]!==255){if(action===34)faceNewPlayerAngle(r,x);setCurrentPlayerAngle(r,x);setPlayerDirectionalVelocity(r,x,action===34?0x40:0x50);}
 }
 applyPlayerFriction(r,x,1);
 if(action===35&&!(r[0x3e8+x]|r[0x3f6+x]|r[0x404+x]|r[0x412+x])){finishPlayerAnimation(r,x);return events;}
 events.push(...updatePlayerGroundAttackTail(r,x,options));return events;
}
function collideWithTsubasaDefense(r,x,collision){const contact=beginTsubasaDefensivePlayerContact(r,x),events=collision(r,x)||[];finishTsubasaDefensivePlayerContact(r,contact,events);return events;}
export function updatePlayerGroundAttackTail(r,x,options={}){options={collidePlayers,...options};updatePlayerSurface(r,x);preparePlayerVerticalMotion(r,x);integrateMotion(r,x);resolveGround(r,x);clampPlayerBoundary(r,x);const events=collideWithTsubasaDefense(r,x,options.collidePlayers);events.push(...advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options}));orientPlayerFrame(r,x);return events;}
export function selectPlayerAngleSubtype(r,x){const angle=r[0x4b0+x];if(angle===255)return;const value=ANGLE_SUBTYPES[angle>>>5];if(!(value&128))r[0x46c+x]=value;}
// 06:84A8..84F4,8571..86E9: exact dodge/feint/attack sequence bodies.
export function updatePlayerManeuver(r,x,options={}){
 const a=r[0x459+x]&127;if(![25,36,37,38,39,40,41,42,47].includes(a))throw new RangeError('Unrecovered maneuver');
 const events=[],fresh=!(r[0x459+x]&128);
 if(fresh){
  if(a===25&&redirectPlayerSkillAction(r,x,1))return events;if(a===36&&redirectPlayerSkillAction(r,x,0))return events;
  initializeMovement(r,x);
  if(a===25){soundEvent(events,options,0x3b,r);if(r[0x4b0+x]!==255){faceNewPlayerAngle(r,x);setCurrentPlayerAngle(r,x);setPlayerDirectionalVelocity(r,x,0x40);}}
  if(a===38)selectKickAnimationSubtype(r,x,0);
  if([37,39,40,41].includes(a))selectPlayerAngleSubtype(r,x);
  if(a===37){r[0x496+x]=r[0x4a3+x]|0x48;r[0x4a3+x]^=128;}
  if(a===39||a===42){setCurrentPlayerAngle(r,x);for(const p of [0x420,0x42e,0x43c,0x44a])r[p+x]=0;if(a===39)setPlayerDirectionalVelocity(r,x,0x30);}
  if(a===40||a===41){r[0x496+x]=r[0x46c+x]?128:0;setPlayerDirectionalVelocity(r,x,0x70);}
  if(a===36||a===47){if(a===47)soundEvent(events,options,0x3c,r);setCurrentPlayerAngle(r,x);r[0x496+x]=ATTACK_ANGLES[((r[0x496+x]>>>1)|r[0x4a3+x])>>>4];selectPlayerAngleSubtype(r,x);setPlayerDirectionalVelocity(r,x,a===36?0x40:0x30);if(a===36)put(r,0x404+x,0x412+x,-w(r,0x404+x,0x412+x));else halveAxis(r,x,0x404,0x412);}
 }
 if(a===37){const i=r[0x46c+x]*2+((r[0x4a3+x]&128)?0:1);if(i>3)throw new RangeError('Original maneuver subtype outside turn table');r[0x496+x]=(r[0x496+x]+[240,16,16,240][i])&255;setPlayerDirectionalVelocity(r,x,0x70);}
 if(a===42){if(r[0x94+x]===0)applyPlayerFriction(r,x,1);else setPlayerDirectionalVelocity(r,x,0x40);}
 if(a===36&&!fresh&&r[0x87+x]===1){if(r[0x94+x]===2){clearMotion(r,x);soundEvent(events,options,0x3b,r);}else if(r[0x94+x]===3){setPlayerDirectionalVelocity(r,x,0x40);for(const [lo,hi] of [[0x404,0x412],[0x3e8,0x3f6]])put(r,lo+x,hi+x,w(r,lo+x,hi+x)<<2);}}
 if(a===25||a===40||a===41)applyPlayerFriction(r,x,1);
 events.push(...([37,38,39,42].includes(a)?updatePlayerLocomotionTail(r,x,options):updatePlayerGroundAttackTail(r,x,options)));return events;
}
// 06:A133..A166, eight original small signed acceleration vectors.
export function applyPlayerAirControl(r,x){const angle=r[0x4b0+x];if(angle===255)return;const at=(angle&224)>>>3;put(r,0x3e8+x,0x3f6+x,w(r,0x3e8+x,0x3f6+x)+(AIR_CONTROL_VECTORS[at]|AIR_CONTROL_VECTORS[at+1]<<8));put(r,0x404+x,0x412+x,w(r,0x404+x,0x412+x)+(AIR_CONTROL_VECTORS[at+2]|AIR_CONTROL_VECTORS[at+3]<<8));}
function halveAxis(r,x,lo,hi){let v=w(r,lo+x,hi+x);if(v&32768)v-=65536;put(r,lo+x,hi+x,v>>1);}
// 06:86EA..879E: jump30, post-air request45, and transition53.
// 9EBF collision is an explicit required dependency, never approximated.
export function updatePlayerJumpAction(r,x,options={}){
 options={collideAirPlayers,...options};
 const action=r[0x459+x]&127;if(![0x30,0x45,0x53].includes(action))throw new RangeError('Expected original jump action');
 if(typeof options.collideAirPlayers!=='function')throw new Error('Original 9EBF airborne-player collision handler required');
 const events=[];
 if(!(r[0x459+x]&128)){
  if(action===0x30&&(redirectPlayerSkillAction(r,x,5)||redirectPlayerSkillAction(r,x,6)))return events;
  initializeMovement(r,x);
  if(action===0x30){soundEvent(events,options,0x2b,r);r[0x496+x]=r[0x4a3+x]|64;initializeJump(r,x,0);halveAxis(r,x,0x404,0x412);}
  else if(action===0x53){halveAxis(r,x,0x3e8,0x3f6);halveAxis(r,x,0x404,0x412);}
  else{r[0x4bd+x]=0;r[0x44a+x]=0;r[0x43c+x]=128;}
 }
 selectOrdinaryPlayerSubtype(r,x);applyPlayerAirControl(r,x);events.push(...updatePlayerAirTail(r,x,options));return events;
}
export function updatePlayerAirTail(r,x,options={},attack=false){
 const events=[];limitPlanarSpeed(r,x);integrateMotion(r,x);
 if(!attack)resolveGround(r,x);
 const boundary=fieldBoundary(r,x);if(boundary){if(attack)r[0x4bd+x]=0;r[0x34d+x]=r[0x30];r[0x360+x]=r[0x31];r[0x314+x]=r[0x32];r[0x327+x]=r[0x33];}
 events.push(...(attack?collideWithTsubasaDefense(r,x,options.collidePlayers||collidePlayers):((options.collideAirPlayers||collideAirPlayers)(r,x)||[])));
 events.push(...advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options}));orientPlayerFrame(r,x);finishPlayerLanding(r,x,events,options);return events;
}
export function finishPlayerLanding(r,x,events=[],options={}){
 if((r[0x399+x]&128)||!(r[0x399+x]|r[0x386+x])){
  updatePlayerSurface(r,x);
  if(r[0x130+x]>=2){if(!(r[0x42e+x]&128)||!(r[0x386+x]&128))return events;}
  else r[0x373+x]=r[0x386+x]=r[0x399+x]=0;
  soundEvent(events,options,0x2c,r);finishPlayerAnimation(r,x);
 }
 return events;
}
function faceTeamAttack(r,x){r[0x4a3+x]=(r[0x57]&32)?0:(x&1)*128;}
function halvePlanar(r,x){halveAxis(r,x,0x3e8,0x3f6);halveAxis(r,x,0x404,0x412);}
function markZeroVerticalSpeed(r,x){if(r[0x42e+x]===0)r[0x486+x]|=2;}
// 06:87C2..8B6B, sharing exact8750 or8A1F tail, not a generic air approximation.
export function updatePlayerAirVariant(r,x,options={}){
 const a=r[0x459+x]&127,events=[];let attack=[49,59,62,63,65,66,67,71,73,75,77,79,84,88,91,92].includes(a);
 const allowed=[49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,70,71,72,73,74,75,76,77,78,79,80,81,82,84,85,87,88,89,90,91,92];
 if(!allowed.includes(a))throw new RangeError('Unrecovered airborne variant');
 const fresh=!(r[0x459+x]&128);
 if(fresh){
  if([50,51,52,70].includes(a)&&redirectPlayerSkillAction(r,x,2))return events;
  if([49,59,66].includes(a)&&redirectPlayerSkillAction(r,x,4))return events;
  if(a===82&&redirectPlayerSkillAction(r,x,6))return events;
  if(a===65&&redirectPlayerSkillAction(r,x,3))return events;
  if(a===88&&redirectPlayerSkillAction(r,x,1))return events;
  initializeMovement(r,x);
  if([50,51,52,55,56,70].includes(a)){markZeroVerticalSpeed(r,x);faceTeamAttack(r,x);if(a===50||a===70)clearMotion(r,x);initializeJump(r,x,1);if(a!==50&&a!==70)halvePlanar(r,x);}
  if(a===53||a===54){faceNewPlayerAngle(r,x);faceSelectedPassTarget(r,x);initializeJump(r,x,1);halvePlanar(r,x);}
  if(a===55||a===56){r[0x42c]=r[0x420+x];r[0x43a]=r[0x42e+x];}
  if(a===57||a===58){faceNewPlayerAngle(r,x);const dz=(r[0x392]-r[0x386+x])&255;initializeMovement(r,x,!(dz&128)&&dz>=16?58:57);faceSelectedPassTarget(r,x);initializeJump(r,x,1);halvePlanar(r,x);r[0x42c]=r[0x420+x];r[0x43a]=r[0x42e+x];}
  if(a===49){r[0x496+x]=r[0x4a3+x]|64;setCurrentPlayerAngle(r,x);initializeJump(r,x,2);setPlayerDirectionalVelocity(r,x,0x40);halveAxis(r,x,0x404,0x412);}
  if([60,61,89,90].includes(a)){clearMotion(r,x);r[0x496+x]=((r[0x496+x]&127)|((a===60||a===89)?128:0))^r[0x4a3+x];setPlayerDirectionalVelocity(r,x,0x20);r[0x4bd+x]=0;initializeJump(r,x,a&64?11:7);releaseCarriedBall(r,x);}
  if(a===82){soundEvent(events,options,0x2b,r);initializeJump(r,x,6);}
  if(a===87){soundEvent(events,options,0x2b,r);r[0x496+x]=r[0x4a3+x]|64;initializeJump(r,x,10);}
  if(a===74||a===81)initializeJump(r,x,0);
  if(a===72||a===76){faceTeamAttack(r,x);initializeJump(r,x,3);}
  if(a===78||a===80)initializeJump(r,x,3);
  if([73,75,77,79].includes(a)){soundEvent(events,options,0x3c,r);r[0x420+x]=r[0x42e+x]=0;r[0x4bd+x]=((r[0x5fd]+2)<<2)&255;}
  if(a===59||a===66){soundEvent(events,options,0x3b,r);initializeJump(r,x,3);}
  if(a===62||a===63){selectPlayerAngleSubtype(r,x);r[0x496+x]=r[0x46c+x]?128:0;setPlayerDirectionalVelocity(r,x,0x60);initializeJump(r,x,6);}
  if(a===84){clearMotion(r,x);initializeJump(r,x,4);}
  if(a===68)initializeJump(r,x,4);
  if(a===91){faceTeamAttack(r,x);soundEvent(events,options,0x38,r);initializeJump(r,x,4);}
  if(a===88){faceNewPlayerAngle(r,x);setCurrentPlayerAngle(r,x);soundEvent(events,options,0x38,r);setPlayerDirectionalVelocity(r,x,0x70);initializeJump(r,x,9);r[0x4bd+x]=4;}
  if(a===65||a===92){clearMotion(r,x);faceNewPlayerAngle(r,x);r[0x496+x]=r[0x4a3+x]|64;setPlayerDirectionalVelocity(r,x,0x70);initializeJump(r,x,1);}
  if(a===67||a===71){initializeJump(r,x,a===67?10:0);r[0x496+x]=r[0x4a3+x]|64;setPlayerDirectionalVelocity(r,x,0x50);soundEvent(events,options,0x38,r);}
  if(a===85){r[0x4bd+x]=64;initializeJump(r,x,8);releaseCarriedBall(r,x);soundEvent(events,options,0x39,r);}
 }
 if([73,75,77,79].includes(a)&&r[0x4bd+x]===0)finishPlayerAnimation(r,x);
 if(a===88&&r[0x42e+x]===255){halvePlanar(r,x);r[0x44a+x]=1;}
 if((a===65||(a===92&&fresh))&&r[0x87+x]===1&&r[0x94+x]===2){clearMotion(r,x);initializeJump(r,x,5);}
 if(a===85&&!(r[0x42e+x]&128)){r[0x496+x]=(r[0x496+x]+(r[0x4bd+x]&252))&255;setPlayerDirectionalVelocity(r,x,0x40);put(r,0x3e8+x,0x3f6+x,w(r,0x3e8+x,0x3f6+x)+w(r,0x3f5,0x403));put(r,0x404+x,0x412+x,w(r,0x404+x,0x412+x)+w(r,0x411,0x41f));}
 if(![50,60,61,64,67,70,71,85,87,89,90,91].includes(a))applyPlayerAirControl(r,x);
 events.push(...updatePlayerAirTail(r,x,options,attack));return events;
}
export function updatePlayerLinkedOrSetupAction(r,x,options={}){
 const a=r[0x459+x]&127,events=[];if(![18,20,22,27,28,86].includes(a))throw new RangeError('Unrecovered linked action');
 if(!(r[0x459+x]&128)){
  initializeMovement(r,x);
  if(a===22){resetVerticalAndYMotion(r,x);r[0x4a3+x]=(r[0x327+x]&2)?128:0;r[0x46c+x]=r[0x360+x]&1;r[0x1c]=r[0x46c+x]?0:128;r[0x67e+(x&1)]=r[0x1c];}
  if(a===86){soundEvent(events,options,0x2b,r);initializeJump(r,x,0);}
 }
 if(a===20||a===86){const y=r[0x4ca+x];for(const p of [0x3e8,0x3f6,0x404,0x412])r[p+x]=r[p+y];
  if(a===20){const partner=r[0x459+y]&127;if(r[0x5c]&64)r[0x459+x]=48;else if([1,33,29,32,15,17].includes(partner)){events.push(...advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options}));orientPlayerFrame(r,x);}else r[0x459+x]=[7,34,67].includes(partner)?71:48;return events;}
  selectOrdinaryPlayerSubtype(r,x);applyPlayerAirControl(r,x);events.push(...updatePlayerAirTail(r,x,options));return events;
 }
 if(a===22)return updatePlayerCommonFrame(r,x,3,options);
 if(a===27||a===28){r[0x496+x]=(r[0x4a3+x]^(a===27?128:0))|64;setPlayerDirectionalVelocity(r,x,a===27?0x20:0x40);}
 return updatePlayerLocomotionTail(r,x,options);
}
// 06:9FDA..A00B: release carried ball into ground/below-ground/falling request.
export function releaseCarriedBall(r,x){if(!(r[0x486+x]&64))return;r[0x41e]=r[0x410]=0;if(r[0x3a5]&128)r[0x485]=1;else if(!(r[0x3a5]|r[0x392]))r[0x485]=7;else{r[0x456]=0;r[0x448]=128;r[0x485]=6;}}
// Basic original stationary/recoil bodies sharing810F.
export function updatePlayerBasicAction(r,x,options={}){
 const a=r[0x459+x]&127,allowed=[1,2,3,4,5,6,11,12,13,14,15,16,17,26,43,45,46];if(!allowed.includes(a))throw new RangeError('Unrecovered basic action');
 const events=[];let friction=a===1?4:a===3?1:(a===4||a===5)?6:(a===45||a===46)?5:3;
 if(!(r[0x459+x]&128)){
  initializeMovement(r,x);
  if(a===4||a===5)releaseCarriedBall(r,x);
  if(a===11||a===12||a===13)selectKickAnimationSubtype(r,x,a===13?2:0);
  if(a===16)selectOrdinaryPlayerSubtype(r,x);
  if(a===6){clearMotion(r,x);releaseCarriedBall(r,x);soundEvent(events,options,0x46,r);}else if(a!==11&&a!==43)resetVerticalAndYMotion(r,x);
  if(a===12){if(r[0x4c9])for(const base of [0x3f6,0x3e8,0x412,0x404])r[base+x]=r[base+12];r[0x4a3+x]=(r[0x57]&32)?128:(x&1)*128;}
  if(a===2)faceNewPlayerAngle(r,x);
  if(a===26){r[0x4a3+x]=r[0x327+x]===0?0:128;r[0x3ad]&=127;}
  if(a===16)soundEvent(events,options,0x3b,r);
  if(a===45||a===46){r[0x496+x]=(r[0x4a3+x]^(a===45?128:0))|64;r[0x3e8+x]=r[0x3f6+x]=r[0x404+x]=r[0x412+x]=0;releaseCarriedBall(r,x);setPlayerDirectionalVelocity(r,x,0x60);}
 }
 if(a===1){selectOrdinaryPlayerSubtype(r,x);if(r[0x46c+x]===1)r[0x4a3+x]=(r[0x57]&32)?128:(x&1)*128;else faceNewPlayerAngle(r,x);}
 if(a===13)resetVerticalAndYMotion(r,x);
 if(a===15||a===43){if(a===15)selectOrdinaryPlayerSubtype(r,x);applyPlayerFriction(r,x,a===15?2:1);if(a===15&&!(r[0x3e8+x]|r[0x3f6+x]|r[0x404+x]|r[0x412+x])){finishPlayerAnimation(r,x);return events;}events.push(...updatePlayerLocomotionTail(r,x,options));return events;}
 if(a===6){events.push(...advancePlayerAnimation(r,x,{onEnd:finishPlayerAnimation,...options}));if((r[0x466]&127)===1)r[0x74+x]=0x24;else if(!r[0x525])finishPlayerAnimation(r,x);else if(r[0x300]&1)r[0x74+x]=0x24;orientPlayerFrame(r,x);return events;}
 events.push(...updatePlayerCommonFrame(r,x,friction,options));if(a===11&&(r[0x465]&127)!==9)finishPlayerAnimation(r,x);return events;
}
export const RECOVERED_PLAYER_ACTIONS=Object.freeze(Array.from({length:93},(_,i)=>i));
// Source dispatch803F. Missing cases fail explicitly instead of acting like a generic player.
export function updateRecoveredPlayerAction(r,x,options={}){
 beforeTsubasaAcrobatAction(r,x);const defensive=prepareTsubasaDefensiveAction(r,x),events=updateRecoveredPlayerActionNative(r,x,options);afterTsubasaAcrobatAction(r,x);
 finishTsubasaDefensiveAction(r,x,defensive);return events;
}
function updateRecoveredPlayerActionNative(r,x,options={}){
 const a=r[0x459+x]&127;
 if([18,20,22,27,28,86].includes(a))return updatePlayerLinkedOrSetupAction(r,x,options);
 if([0,19,23,24,30,31,44].includes(a))return [];
 if([7,8,9,10,21].includes(a))return updateOrdinaryKickAction(r,x,options);
 if([29,32,33].includes(a))return updatePlayerLocomotion(r,x,options);
 if(a===34||a===35)return updatePlayerGroundAttack(r,x,options);
 if([48,69,83].includes(a))return updatePlayerJumpAction(r,x,options);
 if([25,36,37,38,39,40,41,42,47].includes(a))return updatePlayerManeuver(r,x,options);
 if(a>=49&&a<=92)return updatePlayerAirVariant(r,x,options);
 if([1,2,3,4,5,6,11,12,13,14,15,16,17,26,43,45,46].includes(a))return updatePlayerBasicAction(r,x,options);
 throw new Error(`Missing original player movement ${a.toString(16).padStart(2,'0')} body`);
}
