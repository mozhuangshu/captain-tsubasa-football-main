import {captureTsubasaBallContact,finishTsubasaBallContact} from './tsubasa-special-moves.js';
import {tsubasaMorisakiSaveIgnores} from './tsubasa-morisaki-save.js';
import {tsubasaRazorIgnoresKeeper,tsubasaSpecialKeeperRule,getTsubasaDriveKeeperLookUp,tsubasaDriveKeeperContact,applyTsubasaDrivePunch,getTsubasaDriveKeeperPunch} from './tsubasa-special-moves.js';
import {adaptTsubasaDefensiveCollisionShape,getTsubasaDefensiveResistance,beginTsubasaDefensiveContact,finishTsubasaDefensiveContact} from './tsubasa-defensive-moves.js';
// Original bank06 collision descriptors and contact responses, direct semantic translation.
// bank06:$B545..$B7B9; resource data only.
export const COLLISION_DATA = [190, 182, 67, 182, 92, 182, 81, 181, 11, 182, 57, 182, 1, 1, 131, 1, 1, 2, 3, 3, 255, 255, 255, 255, 255, 255, 128, 1, 129, 1, 255, 1, 255, 1, 255, 1, 255, 1, 130, 1, 1, 1, 21, 1, 255, 1, 1, 1, 1, 1, 1, 1, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 15, 15, 255, 255, 255, 255, 255, 255, 1, 1, 255, 255, 255, 255, 1, 1, 1, 1, 15, 15, 16, 16, 255, 1, 1, 1, 255, 255, 3, 3, 1, 32, 1, 32, 4, 4, 77, 1, 1, 1, 255, 255, 255, 255, 255, 33, 19, 1, 66, 66, 64, 1, 67, 1, 65, 1, 65, 1, 65, 1, 255, 1, 255, 1, 255, 1, 255, 1, 255, 15, 255, 255, 255, 255, 1, 32, 1, 32, 1, 1, 72, 72, 255, 73, 75, 75, 1, 1, 19, 1, 255, 1, 75, 75, 255, 1, 75, 75, 255, 1, 3, 3, 255, 1, 76, 76, 255, 1, 3, 3, 255, 1, 255, 1, 1, 1, 1, 1, 72, 72, 255, 255, 1, 1, 78, 78, 255, 15, 255, 255, 255, 255, 1, 1, 33, 33, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 34, 34, 255, 255, 35, 35, 255, 255, 75, 182, 78, 182, 81, 182, 84, 182, 68, 69, 69, 68, 74, 74, 71, 70, 70, 1, 30, 31, 1, 1, 1, 1, 1, 122, 182, 130, 182, 135, 182, 138, 182, 144, 182, 147, 182, 151, 182, 154, 182, 158, 182, 164, 182, 168, 182, 171, 182, 174, 182, 179, 182, 182, 182, 255, 10, 11, 12, 13, 14, 255, 255, 255, 8, 9, 255, 255, 15, 4, 255, 255, 5, 6, 7, 255, 255, 8, 9, 255, 5, 6, 7, 255, 17, 255, 255, 255, 255, 18, 255, 1, 1, 1, 255, 255, 255, 255, 20, 255, 255, 22, 23, 255, 24, 25, 255, 26, 27, 28, 29, 255, 255, 1, 255, 255, 255, 255, 255, 255, 255, 255, 19, 6, 183, 11, 183, 16, 183, 21, 183, 26, 183, 31, 183, 36, 183, 41, 183, 46, 183, 51, 183, 56, 183, 61, 183, 66, 183, 71, 183, 76, 183, 81, 183, 86, 183, 91, 183, 96, 183, 101, 183, 106, 183, 111, 183, 116, 183, 121, 183, 126, 183, 131, 183, 136, 183, 141, 183, 146, 183, 151, 183, 156, 183, 161, 183, 166, 183, 171, 183, 176, 183, 181, 183, 8, 8, 6, 16, 0, 8, 8, 4, 32, 0, 8, 8, 4, 24, 0, 16, 16, 4, 16, 0, 248, 16, 4, 12, 0, 12, 2, 4, 12, 252, 8, 2, 4, 12, 252, 8, 16, 4, 12, 252, 12, 4, 4, 32, 232, 4, 12, 4, 32, 232, 8, 8, 4, 24, 240, 0, 16, 4, 24, 240, 8, 8, 4, 32, 240, 16, 8, 4, 24, 240, 16, 0, 4, 24, 240, 4, 18, 6, 20, 244, 0, 16, 4, 15, 0, 8, 8, 4, 12, 0, 8, 8, 4, 32, 232, 8, 8, 4, 32, 254, 0, 16, 4, 12, 0, 8, 8, 4, 32, 0, 8, 8, 4, 12, 0, 8, 16, 4, 12, 0, 8, 16, 4, 12, 248, 16, 8, 4, 12, 248, 12, 12, 4, 30, 254, 12, 12, 4, 30, 254, 12, 12, 4, 30, 254, 12, 12, 4, 30, 254, 4, 12, 8, 32, 0, 8, 8, 4, 64, 0, 4, 12, 12, 24, 0, 12, 12, 18, 32, 0, 32, 32, 16, 32, 0, 8, 8, 4, 32, 0];
// bank06:$B097..$B150; resource data only.
export const CONTACT_KINDS = [255, 255, 5, 6, 5, 255, 4, 255, 255, 255, 255, 255, 255, 255, 0, 255, 2, 2, 255, 255, 255, 255, 255, 255, 255, 6, 3, 255, 255, 255, 5, 6, 255, 255, 5, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 7, 255, 255, 255, 255, 255, 255, 5, 6, 255, 255, 255, 255, 5, 6, 5, 6, 255, 7, 5, 255, 255, 255, 255, 255, 255, 255, 4, 255, 255, 7, 255, 6, 4, 255, 255, 7, 255, 255, 255, 255, 255, 255, 255, 255, 5, 6, 1, 255, 0, 255, 0, 255, 1, 255, 2, 255, 2, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 7, 255, 255, 255, 255, 255, 7, 255, 6, 255, 6, 255, 7, 255, 255, 0, 255, 5, 255, 5, 6, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 255, 255, 5, 6, 255, 6, 255, 7, 255, 255, 255, 255, 5, 6, 255, 255, 255, 255, 255, 255, 0, 6, 255, 7];
// bank06:$AC4D..$AC64; resource data only.
export const BALL_STATES = [0, 0, 64, 64, 128, 132, 128, 0, 0, 192, 128, 0, 0, 128, 128, 72, 72, 80, 80, 64, 192, 192, 132, 0];
const word=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,v)=>{r[l]=v&255;r[l+1]=v>>>8;};
function data(a){if(a<0xb545||a>=0xb7ba)throw new RangeError('Collision descriptor outside recovered resource');return COLLISION_DATA[a-0xb545];}
const dw=a=>data(a)|data(a+1)<<8;
// B301/B313/B325 -> B337 -> B38C/B396. lane=0 is attack/ball; lane=1 is defence.
export function resolveCollisionShape(r,slot,kind=slot===12?'ball':'player',lane=0){
 // Weather5/6 read into adjacent subtype-pointer bytes. That original pointer
 // is $1C1B, a mirrored RAM data address, not a ROM descriptor resource.
 const read=a=>{a&=65535;return a<0x2000?r[a&0x7ff]:a===0xffff?255:data(a);},readWord=a=>read(a)|read(a+1)<<8;
 let p=readWord(kind==='ball'?0xb54d:kind==='weather'?0xb54f:0xb54b),i=((r[0x459+slot]&127)*2+lane)&255;put(r,0x2c,p);let a=read(p+i);
 if(a&128){if(a===255)return null;i=(a*2)&255;put(r,0x32,0xb643);p=readWord(0xb643+i);put(r,0x2c,p);a=read(p+r[0x46c+slot]);if(a&128)return null;}
 a=(a*2)&255;if(a&128){i=a&127;put(r,0x32,0xb65c);p=readWord(0xb65c+i);put(r,0x2c,p);a=(read(p+r[0x94+slot])*2)&255;if(a&128)return null;}
 put(r,0x2c,0xb6be);const address=readWord(0xb6be+a);return adaptTsubasaDefensiveCollisionShape(r,slot,{address,extent:Array.from({length:5},(_,j)=>read(address+j))},kind,lane);
}
const sub=(a,b,c=1)=>{const n=a-b-(1-c);return [n&255,n>=0?1:0];};
// B3A0..B4E8. The original deliberately mixes borrow and signed-byte tests.
export function intersectCollisionShapes(r,x,y,a,b){
 r[0x43]=x;r[0x44]=y;put(r,0x2e,a.address);put(r,0x30,b.address);
 if(!(r[0x5c]&12)&&(!r[0xd9+x]||!r[0xd9+y]))return false;
 const A=a.extent,B=b.extent;
 function direction(lo,hi,reverse,mask,e1,e2,borrow=false){const d=(word(r,lo+(reverse?y:x),hi+(reverse?y:x))-word(r,lo+(reverse?x:y),hi+(reverse?x:y)))&65535;r[0x34]=d&255;if(d&32768)return true;if(d>>>8||(d&mask))return false;let [v,c]=sub(d&255,e1);if(borrow?!c:v&128)return true;[v,c]=sub(v,e2,c);return !!(borrow?!c:v&128);}
 if(!direction(0x34d,0x360,false,0xe0,A[2],B[2],true)||!direction(0x34d,0x360,true,0xe0,A[2],B[2]))return false;
 r[0x1d]=r[0x1f]=0;r[0x1e]=r[0x20]=1;if(r[0x4a3+x]&128){r[0x1d]=1;r[0x1e]=0;}if(r[0x4a3+y]&128){r[0x1f]=1;r[0x20]=0;}
 if(!direction(0x314,0x327,false,0xe0,A[r[0x1d]],B[r[0x20]])||!direction(0x314,0x327,true,0xe0,A[r[0x1e]],B[r[0x1f]]))return false;
 return direction(0x386,0x399,false,0xc0,A[4],B[3])&&direction(0x386,0x399,true,0xc0,B[4],A[3]);
}
export function clearBallPower(r){r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;}
export function setBallContactAction(r,action){if(action>=BALL_STATES.length)throw new RangeError('Ball action table');r[0x465]=action;r[0x492]=BALL_STATES[action];}
export function setContactPlayerAction(r,y,action){r[0x1e]=action;if((r[0x459+y]&127)===action)return;r[0x459+y]=action;r[0x87+y]=r[0x94+y]=r[0x46c+y]=0;}
function sound(r,events,id){if((r[0x58b]&64)||((r[0x58b]&128)&&id<32))return;r[0x1b]=r[0x7ff]=id;events.push({type:'sound',soundId:id});}
function wetTransfer(r,y){if(r[0x50d]&128)for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+y]=r[a+12];}
function random(r){r[12]=r[0x45]&2;const c=((r[0x46]&2)^r[12])?128:0,low=r[0x45]&1;r[0x45]=(r[0x45]>>>1)|c;r[0x46]=(r[0x46]>>>1)|(low<<7);return r[0x45];}
// AF63: true means original PLA/PLA aborts the enclosing contact handler.
export function applyBallContactDamage(r,x,y,events=[]){
 let group;
 if(r[0x525]&&(r[0x492]&128)&&!(r[0x4f0]|r[0x4c9]))group=3;
 else {if(!(r[0x4f0]|r[0x4c9]))return false;if(y===r[0x4d6])return true;/* D-31: the keeper looking up at a ドライブシュート never touches it (special path only) */if(y>=10&&(getTsubasaDriveKeeperLookUp(r)===y||tsubasaRazorIgnoresKeeper(r,y)))return true;/* D-37: the razor's opposing keeper is fooled, never touches it */group=!r[0x510]?0:r[0x510]<4?1:2;}
 const rows=[[5,0x3c,0x36],[7,0x59,0x37],[9,0x59,0x37],[0,6,0x36]];let damage=rows[group][0],carry=0;r[0x1e]=group*3;if(r[0x50d]&128)damage++;if(r[0x525]){r[0x1e]=9;damage+=1+carry;group=3;}
 const preHP=r[0x4e4+y];r[0x21]=damage;r[0x4e4+y]=Math.max(0,r[0x4e4+y]-damage);r[0x21]=8;r[0x4f0]=Math.max(0,r[0x4f0]-8);
 /* D-32 ドライブシュート keeper contact (special path only): punch = hand chop, never a catch */if(y>=10&&tsubasaDriveKeeperContact(r,y,preHP+[20,15,12,8][r[0x4fd+y]&3])==='punch'){sound(r,events,0x36);applyTsubasaDrivePunch(r,y);return true;}
 const resistance=getTsubasaDefensiveResistance(r,y);let block=Math.min(255,r[0x4e4+y]+resistance)>=r[0x4f0];if(y>=10&&!(r[0x67c+y]&128)){const hp=(r[0x4e4+y]+[20,15,12,8][r[0x4fd+y]&3])&255,rule=tsubasaSpecialKeeperRule(r,y,preHP+[20,15,12,8][r[0x4fd+y]&3],resistance);if(rule==='save'||rule===null&&Math.min(255,hp+resistance)>=r[0x4f0])return false;block=rule==='through'?false:!(r[0x300]&1);}
 if(block){clearBallPower(r);r[0x465]=0x17;r[0x4d6]=y;}
 sound(r,events,rows[group][2]);setContactPlayerAction(r,y,rows[group][1]);
 if(r[0x459+y]===6){if(!r[0x4f0])r[0x525]=16;}
 else if(!((r[0x4a3+x]^r[0x4a3+y])&128))r[0x459+y]++;
 return true;
}
// AD41..AF4F, including AF50 nonlocal-return semantics represented explicitly.
export function resolveBallPlayerContact(r,y,x=12){
 const cooperation=captureTsubasaBallContact(r,y),defensive=beginTsubasaDefensiveContact(r,y),events=[];r[0x1d]=y;r[0x1c]=y>=10&&!(r[0x67c+y]&128)?1:0;const index=((r[0x459+y]<<1)+r[0x1c])&255;if(index>=CONTACT_KINDS.length)throw new RangeError('Unrecovered contact action');const kind=CONTACT_KINDS[index];
 let returnIndex=kind&128?index:kind<2?kind*2+2:y;const set=a=>{setBallContactAction(r,a);returnIndex=a;},pa=a=>setContactPlayerAction(r,y,a),snd=a=>sound(r,events,a),dam=()=>applyBallContactDamage(r,x,y,events),script=()=>{if(!(r[0x5c]&12))return false;r[0x4d6]=r[0x1d];set(0x13);return true;};
 const result=()=>{finishTsubasaDefensiveContact(r,defensive,events);finishTsubasaBallContact(r,y,cooperation);return {events,audioEngineComplete:false,kind,returnIndex};};
 if(kind&128)return result();
 if(kind<2){if(!r[0x510]){returnIndex=y;if(!r[0x4c9]||y!==r[0x4d6]){r[0x4d6]=y;set(5);}}return result();}
 if(kind<5){if(kind!==4)snd(kind===2?0x20:0x23);if(!dam()){r[0x4d6]=y;set(kind===2?4:kind===3?10:12);}return result();}
 if(kind===7){if((r[0x3f6+x]^r[0x4a3+y])&128){r[0x4d6]=y;snd(0x26);set(16);}return result();}
 if(kind===5){if(script()||dam())return result();const action=r[0x465]&127,p=r[0x459+y]&127,air=!!(r[0x486+y]&128);
  if(action===9||(action===3&&y===r[0x4d6])||(action===0x15&&!air)||(action===10&&![0x20,0x21,0x1d].includes(p)&&!air))return result();
  r[0x4d6]=y;if(air){if((r[0x492]&128)||!(r[0x42e+y]&128)){wetTransfer(r,y);snd(0x23);set(9);}else{snd(0x43);pa(2);set(r[0x5c]&64?17:18);}return result();}
  if(p===1)r[0x4a3+y]=((word(r,0x320,0x333)-word(r,0x314+y,0x327+y))&32768)?128:0;
  const z=r[0x386+x],special=!(r[0x50d]&128)&&(p===0x21||p===0x1d);if(!z||(special&&(z&128))){set(3);return result();}wetTransfer(r,y);if(special){snd(0x23);pa(0x26);set(0x15);}else{pa(11);snd(0x23);set(9);}return result();
 }
 if(kind!==6)throw new RangeError('Unknown contact kind');if(dam())return result();r[0x4d6]=y;if(script()||(r[0x5c]&64))return result();snd(0x26);r[0x4d6]=y;wetTransfer(r,y);
 if(r[0x4f0]&&random(r)<[0x40,0x50,0x60,0x70][r[0x4fd+y]&3]){if(!(r[0x486+y]&128))pa(17);set(23);return result();}
 r[0x492]|=64;if(r[0x57]&32)r[0x5c]=64;const air=!!(r[0x486+y]&128),p=r[0x459+y]&127;if(p!==(air?0x3f:0x29))pa(air?64:12);r[0x492]=64;r[0x1c]=Math.min(15,(r[0x650+y]&15)+2);r[0x650+y]=(r[0x650+y]&240)|r[0x1c];set(15);return result();
}
// B1D3..B216: scan first intersecting player in original slot order.
export function scanBallPlayerContacts(r,x=12){
 r[0x43]=x;r[0x44]=r[0x5c]&12?r[0x4d6]:0;const a=resolveCollisionShape(r,x,'ball');if(!a)return {contact:false,events:[]};put(r,0x2e,a.address);
 do{const y=r[0x44],b=resolveCollisionShape(r,y,'player');if(b&&getTsubasaDriveKeeperPunch(r)!==y/* D-32: the chopping keeper never touches (catches) the punched ball */&&!tsubasaMorisakiSaveIgnores(r,y)/* M-9 D-40: 森崎's body block is his contact; no native catch */&&intersectCollisionShapes(r,x,y,a,b)){const result=resolveBallPlayerContact(r,y,x);return {contact:true,player:y,...result};}if(r[0x5c]&12)break;r[0x44]++;}while(r[0x44]<12);
 return {contact:false,events:[]};
}
// B508: state-bit priority, goalkeeper override and slide action override.
export function ballContactPriority(r,y){if(y>=10&&!(r[0x67c+y]&128))return 10;if((r[0x459+y]&127)===0x23)return 8;r[0x1d]=(r[0x486+y]&0x98)>>>3;const i=((r[0x1d]&16)>>>2|r[0x1d])&7;return [6,6,15,15,6,6,6,6][i];}
export function opponentOutranksBallOwner(r,y){r[0x1c]=y;r[0x1e]=ballContactPriority(r,r[0x4d6]);return ballContactPriority(r,y)>r[0x1e];}
// 9FE0..A00B: request loose rolling/falling ball, without prematurely accepting it.
export function requestLooseBall(r){r[0x41e]=r[0x410]=0;if(r[0x3a5]&128)r[0x485]=1;else if(!(r[0x3a5]|r[0x392]))r[0x485]=7;else {r[0x456]=0;r[0x448]=128;r[0x485]=6;}}
// B217..B275. Includes the original post-response Y comparison, which is NOT
// equivalent to checking whether the owner changed: AD8B returns the action in Y.
export function scanHeldBallContacts(r,x=12){
 const events=[];r[0x43]=x;r[0x44]=0;const a=resolveCollisionShape(r,x,'ball');if(!a)return {contact:false,events};put(r,0x2e,a.address);
 do{const y=r[0x44];if(y===r[0x4d6]||((y^r[0x4d6])&1)){const b=resolveCollisionShape(r,y,'player');if(b&&getTsubasaDriveKeeperPunch(r)!==y){if(intersectCollisionShapes(r,x,y,a,b)){if(y===r[0x4d6]||opponentOutranksBallOwner(r,y)){const response=resolveBallPlayerContact(r,y,x);events.push(...response.events);if(response.returnIndex!==r[0x4d6])return {contact:true,player:y,events};}}else if(y===r[0x4d6])requestLooseBall(r);}}
 r[0x44]++;}while(r[0x44]<12);return {contact:false,events};
}
