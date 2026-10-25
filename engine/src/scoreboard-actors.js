import {SCOREBOARD_DATA} from './scoreboard-actors-data.js';
import {integrateMotion,clearMotion,initializeJump} from './physics.js';
import {initializeMovement,resetVerticalAndYMotion,advanceAnimationRecord} from './sprite-animation.js';
import {applyPlayerFriction,orientPlayerFrame,faceNewPlayerAngle,setCurrentPlayerAngle,setPlayerDirectionalVelocity} from './player-actions.js';
import {submitObjectForDisplay} from './object-display-list.js';
const word=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
function data(a){for(const [base,bytes]of Object.entries(SCOREBOARD_DATA)){const at=a-Number(base);if(at>=0&&at<bytes.length)return bytes[at];}throw new RangeError('Scoreboard original data boundary '+a.toString(16));}
const dw=a=>data(a)|data(a+1)<<8;
function sound(r,events,id){if((r[0x58b]&64)||((r[0x58b]&128)&&id<32))return;r[0x1b]=r[0x7ff]=id;events.push({type:'sound',soundId:id});}
// 02:B429..B4FE. Only the scoring side's parity pair is initialized.
export function prepareScoreActors(r){for(let i=0;i<4;i++)r[0x5b8+i]=44+i;for(let x=18;x>=0;x--)r[0x74+x]=127;const side=r[0x52a]&1?0:1;r[0x5ba]=data(0xb4ff+((r[0x52c+side]&15)?1:0));
 for(let x=side;x<4;x+=2){r[0x4b0+x]=r[0x479+x]=255;r[0x61+x]=data(0xb525+x);r[0x459+x]=(r[0x58]===3||r[0x59]===4)?data(0xb529+x):12;
  for(const base of[0x486,0x3f6,0x3e8,0x412,0x404,0x42e,0x420,0x44a,0x43c,0x301,0x33a,0x373,0x386,0x399])r[base+x]=0;
  let team=r[0x52c+(x&1)]&15;if(!team)team=(16+r[0x532+x])&255;r[0x55c+x]=data(0xb501+team);r[0x4a3+x]=((x&1)<<7)^128;r[0x496+x]=r[0x4a3+x]|64;
  for(const [i,a]of[0x314,0x327,0x34d,0x360].entries())r[a+x]=data(0xb52d+x*4+i);
 }r[0x4e]=5;return {chrBanks:[...r.slice(0x5b8,0x5bc)],side};
}
// 02:B53D..B63E. Original descending overlapping RAM stores are retained.
export function prepareVictoryActors(r){for(let x=18;x>=0;x--){r[0x74+x]=127;for(const a of[0x360,0x399,0x386,0x3f6,0x404,0x412,0x420,0x42e,0x420,0x459,0x4a3])r[a+x]=0;r[0x327+x]=1;r[0x61+x]=7;}
 for(const a of[0xec,0xee,0xef,0xf0,0xf2,0xf3])r[a]=0;r[0xed]=r[0xf1]=1;const side=r[0x52b]&1?1:0;if(!side)r[0x5b0]=r[0x5b1]=r[0x5af];r[0x1f]=side;r[0x1c]=r[0x52c+side]&15;r[0x1d]=r[0x1c]>>>2;r[0x1e]=r[0x1c]-r[0x1d];let at=r[0x1e]*11;
 r[0x5b8]=data(0xb63f+at);for(let i=0;i<2;i++){const p=data(0xb640+at+i);if(!(p&128))r[0x5b0+i]=p;}
 for(const x of[1,3]){r[0x55c+x]=data(0xb642+at);const a=data(0xb643+at);r[0x459+x]=a&127;r[0x4a3+x]=a&128;r[0x314+x]=data(0xb644+at);r[0x34d+x]=data(0xb645+at);at+=4;}
 for(let i=1;i<4;i++)r[0x5b8+i]=(r[0x5b8]+i)&255;if(r[0x5bb]===55)r[0x5ba]=46;if(!r[0x1c]){r[0x55d]=data(0xb511+r[0x532+side]);r[0x55f]=data(0xb511+r[0x532+(side|10)]);}return {side};
}
export function finishScoreActorAnimation(r,x){const action=r[0x459+x]&127;let next=data(0xb272+action);if(next&128)next=r[0x486+x]&8?33:32;setAction(r,x,next);}
function setAction(r,x,a){r[0x459+x]=a;r[0x94+x]=r[0x87+x]=r[0x46c+x]=0;}
export function finishVictoryActorAnimation(r,x){const action=r[0x459+x]&127;let next=data(0xb8b2+action);if(next&128){if(next&64)next=action;else{const index=(next&63)*2;r[0x1c]=x;const other=r[0x58]===3?1:x^2;setAction(r,other,data(0xb8de+index));next=data(0xb8dd+index);}}setAction(r,x,next);}
function animate(r,x,victory,events){const root=victory?0xb904:(r[0x58]===3&&r[0x61f]===2?0xb38f:0xb371),end=victory?0xb86b:0xb24a;put(r,0x30,0x31,root);put(r,0x32,0x33,end);const pointer=dw(root+(r[0x459+x]&127)*2),stop=victory?0xba66:0xb429;const record=Array.from({length:stop-pointer},(_,i)=>data(pointer+i));events.push(...advanceAnimationRecord(r,x,record,{onEnd:victory?finishVictoryActorAnimation:finishScoreActorAnimation,onSound:id=>sound(r,events,id)}).filter(event=>event.type!=='sound'));}
function speed(r,x,n){r[0x493]=n;setPlayerDirectionalVelocity(r,x,(n&15)*16);}
function friction(r,x,n){r[0x493]=n;applyPlayerFriction(r,x,n);}
function jump(r,x,n){r[0x493]=n;initializeJump(r,x,n);}
export function clampScoreActor(r,x){r[0x1c]=r[0x58]===3?4:0;let y=word(r,0x34d+x,0x360+x),bound=null;if((y-196)&32768)bound=196;else if(!((y-240)&32768))bound=240;if(bound!==null)put(r,0x34d+x,0x360+x,bound);const lo=dw(0xb337+r[0x1c]),hi=dw(0xb339+r[0x1c]),v=word(r,0x314+x,0x327+x);bound=(v-lo)&32768?lo:!((v-hi)&32768)?hi:null;if(bound!==null){put(r,0x314+x,0x327+x,bound);if(r[0x58]===3)r[0x4a3+x]=r[0x314+x]&128;}}
function scoreTail(r,x,events,landing=false){integrateMotion(r,x);animate(r,x,false,events);orientPlayerFrame(r,x);clampScoreActor(r,x);if(landing&&((r[0x399+x]&128)||!(r[0x399+x]|r[0x386+x]))){r[0x373+x]=r[0x386+x]=r[0x399+x]=0;sound(r,events,44);finishScoreActorAnimation(r,x);}}
// B08B dispatcher is per-object, not a scene-wide loop.
export function updateScoreActor(r,x){const events=[],action=r[0x459+x]&127,fresh=!(r[0x459+x]&128);if(action>14)throw new RangeError('Score actor action outside15-entry dispatcher');put(r,0x2c,0x2d,dw(0xb09d+action*2));if(!action)return events;
 if(fresh)initializeMovement(r,x);
 if([1,2,3,4,5,12,13].includes(action)){if(fresh){resetVerticalAndYMotion(r,x);if([4,5,13].includes(action))faceNewPlayerAngle(r,x);}friction(r,x,action===1||action===12?4:action===3?2:3);if(action===3&&!(r[0x3f6+x]|r[0x3e8+x]|r[0x412+x]|r[0x404+x])){finishScoreActorAnimation(r,x);return events;}scoreTail(r,x,events);return events;}
 if(action===6){faceNewPlayerAngle(r,x);setCurrentPlayerAngle(r,x);speed(r,x,3);scoreTail(r,x,events);return events;}
 if(action===7){if(fresh)faceNewPlayerAngle(r,x);const angle=r[0x4b0+x];r[0x496+x]=angle===255?r[0x4a3+x]|64:data(0xb164+(((angle>>>1)|(r[0x4a3+x]&128))>>>4));if((r[0x496+x]^r[0x4a3+x])&128){r[0x459+x]=3;return events;}speed(r,x,4);faceNewPlayerAngle(r,x);scoreTail(r,x,events);return events;}
 if([8,9,10].includes(action)){if(fresh){r[0x496+x]=(r[0x4a3+x]|64)^(action===10?128:0);if(action!==8)speed(r,x,3);sound(r,events,43);jump(r,x,10);}scoreTail(r,x,events,true);return events;}
 if(action===11||action===14){if(fresh){const angle=r[0x4b0+x];let bounce=angle===255||!((angle^r[0x4a3+x])&128);if(bounce){const reflected=(-word(r,0x420+x,0x42e+x))&65535;put(r,0x420+x,0x42e+x,reflected-1024);bounce=reflected>=1024;}if(!bounce){r[0x420+x]=r[0x42e+x]=0;r[0x459+x]=2;scoreTail(r,x,events);return events;}}scoreTail(r,x,events,true);return events;}
}
// B6DD dispatcher can also be called by the original ending script for slot12.
export function updateVictoryActor(r,x){const events=[],action=r[0x459+x]&127,fresh=!(r[0x459+x]&128);if(action>42)throw new RangeError('Victory actor outside43-entry dispatcher');const address=dw(0xb6ef+action*2);put(r,0x2c,0x2d,address);if(!action)return events;
 if(fresh)initializeMovement(r,x);
 if(address===0xb758||address===0xb774){if(fresh)clearMotion(r,x);const y=address===0xb758?x^2:1;for(const a of[0x314,0x34d,0x386])r[a+x]=r[a+y];if(address===0xb758)r[0x74+x]=(r[0x74+y]+2)&255;else animate(r,x,true,events);return events;}
 if(address===0xb746){if(fresh)clearMotion(r,x);animate(r,x,true,events);orientPlayerFrame(r,x);return events;}
 if([0xb79b,0xb7bd,0xb7d3].includes(address)){if(fresh){clearMotion(r,x);r[0x496+x]=r[0x4a3+x]|(address===0xb7bd?128:64);}else if(address!==0xb79b)r[0x496+x]=(r[0x496+x]+8)&255;
  speed(r,x,3);integrateMotion(r,x);animate(r,x,true,events);if(address===0xb79b||(address===0xb7d3&&fresh))orientPlayerFrame(r,x);else r[0x74+x]|=r[0x496+x]&128;return events;}
 if([0xb7f8,0xb812,0xb82c].includes(address)){if(fresh){if(address===0xb82c){sound(r,events,43);jump(r,x,0);}else{r[0x496+x]=r[0x4a3+x]|64;speed(r,x,address===0xb7f8?4:7);jump(r,x,address===0xb7f8?0:10);}}
  integrateMotion(r,x);animate(r,x,true,events);orientPlayerFrame(r,x);if((r[0x399+x]&128)||!(r[0x399+x]|r[0x386+x])){r[0x373+x]=r[0x386+x]=r[0x399+x]=0;finishVictoryActorAnimation(r,x);if(r[0x58]!==3)sound(r,events,44);}return events;}
 throw new RangeError('Victory dispatch target unrecovered '+address.toString(16));
}
// B6CE scene loop invokes original object-display submission after each action.
export function updateVictoryActors(r){const events=[];for(const x of[1,3]){events.push(...updateVictoryActor(r,x));submitObjectForDisplay(r,x);}return events;}
export const updateScoreActor_B08B=updateScoreActor,updateVictoryActor_B6DD=updateVictoryActor;
