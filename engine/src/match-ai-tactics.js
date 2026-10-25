// Source bank03 tactics and formation functions; bounded original arithmetic, no interpreter.
import {ANGLE_LOOKUP,aimAtTarget,divideOriginal16By16} from './ball-actions.js';
import {measureAIDistance,rankAIObjects,classifyGoalkeeperArea} from './match-ai.js';
import {predictCommandPosition} from './mood-league.js';
import {applyFormationRoles} from './rosters.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,v)=>{r[l]=v&255;r[l+1]=(v>>>8)&255;};
const negative=v=>!!(v&32768),byte=v=>v&255;
function random(r){const a=r[0x45],b=r[0x46];r[0x0c]=a&2;r[0x45]=(a>>>1)|(((a^b)&2)<<6);r[0x46]=(b>>>1)|((a&1)<<7);return r[0x45];}
// AF38..B013: coarsened original angular approximation, distinct from F691 aimAtTarget.
export function angleBetweenAIObjects(r,x,y){
 let dx=(w(r,0x314+y,0x327+y)-w(r,0x314+x,0x327+x))&65535,dy=(w(r,0x34d+y,0x360+y)-w(r,0x34d+x,0x360+x))&65535;
 r[0x2a]=negative(dx)?255:0;r[0x2b]=negative(dy)?255:0;if(r[0x2a])dx=(-dx)&65535;if(r[0x2b])dy=(-dy)&65535;
 while(dx>=32||dy>=32){dx>>>=1;dy>>>=1;}
 r[0x1e]=dy;r[0x1f]=0;
 while((dx|dy)&&!((dx|dy)&16)){dx<<=1;dy<<=1;}
 r[0x1c]=dx;r[0x1d]=dy;let angle=96+(dx<dy?ANGLE_LOOKUP[dy-dx]:dx>dy?-ANGLE_LOOKUP[dx-dy]:0);
 if(r[0x2b])angle=128-angle;if(r[0x2a])angle=-angle;r[0x1f]=angle&255;return r[0x1f];
}
// B034..B0AD: up to6 visible same-parity candidates; triples(slot,angle,distance).
export function scanAIObjectsInCone(r,x,first){
 r[0x43]=x;r.fill(255,0x2c,0x3e);
 for(let y=first;y<12;y+=2){if(!r[0xd9+y])continue;r[0x3f]=x;if(y===x)continue;
  const angle=angleBetweenAIObjects(r,x,y);let delta=(angle-r[0x20])&255;if(delta&128)delta=(-delta)&255;if(delta>r[0x21])continue;
  measureAIDistance(r,x,y);r[0x44]=y;
  for(let i=15;i>=0;i-=3){if(r[0x24]>r[0x2e+i])break;if(i!==15){r[0x2f+i]=r[0x2c+i];r[0x30+i]=r[0x2d+i];r[0x31+i]=r[0x2e+i];}r[0x2e+i]=r[0x24];r[0x2d+i]=r[0x1f];r[0x2c+i]=y;}
 }
 return r[0x2c];
}
// B12D..B15C, same original6-role table as rosters's BC91 routine.
export function applyAIFormation(r,side){
 r[0x1c]=side&1;const kind=r[0x530+side]&3;if(kind===3)throw new RangeError('Original formation pointer3 absent');put(r,0x2c,0xb163+kind*6);applyFormationRoles(r.subarray(0x650,0x65c),side&1,kind);
}
function setTeam(r,side,value,limit=11){for(let y=side;y<limit;y+=2)r[0x65c+y]=value;}
function setByRole(r,side,values){r.set(values,0x1c);for(let y=side;y<11;y+=2)r[0x65c+y]=r[0x1c+((r[0x650+y]&48)>>>4)];}
function goalTarget(r,side){put(r,0x2e,side?0xa0:0x370);put(r,0x30,0xc0);}
// A520..A586 velocity quadrant.
export function classifyAIVelocity(r,y){
 const vx=w(r,0x3e8+y,0x3f6+y),vy=w(r,0x404+y,0x412+y);
 const angle=!(vx|vy)?255:!vx?(negative(vy)?0:128):negative(vx)?(!vy?192:negative(vy)?224:160):(!vy?64:negative(vy)?32:96);
 r[0x1c]=angle;return angle;
}
// A301..A39B: goal-angle/range/random selection. Returns original carry flag.
export function shouldAttemptAIGoal(r,side,player=r[0x4d6]){
 goalTarget(r,side);r[0x1c]=aimAtTarget(r,player);if(side)r[0x1c]=(-r[0x1c])&255;
 if(r[0x1c]<24||r[0x1c]>=104)return false;
 const owner=r[0x4d6],px=w(r,0x314+owner,0x327+owner),distance=((owner&1)?px-120:904-px)&65535;
 r[0x1c]=distance&255;if(distance>>>8)return false;r[0x1c]=(-r[0x1c])&255;
 r[0x1d]=(r[0x486+owner]&128)?255:r[0x45];const bonus=[64,64,128,160][r[0x4fd+owner]>>>6];
 const sum=r[0x1c]+bonus;return sum>255||sum+r[0x1d]>255;
}
// A106..A2E5: owning-side formation and controlled dribbler/goalkeeper strategy.
export function assignAttackingAI(r,side){
 const saved=r[0x4d6];if(r[0x486+saved]&1)r[0x4d6]=r[0x4ca+saved];let owner=r[0x4d6];
 if(owner&1){r[0x2c]=(-r[0x314+owner])&255;r[0x2d]=((r[0x327+owner]^255)+4)&255;}// original clears carry between low/high;2F deliberately retains prior scratch
 else {put(r,0x2c,w(r,0x314+owner,0x327+owner));put(r,0x2e,(w(r,0x2c)+((r[0x74+owner]&128)?-32:32))&65535);}
 if(r[0x2f]===0)setTeam(r,owner&1,10);
 else if(r[0x2f]===1)setByRole(r,owner&1,[12,12,10,10]);
 else {
  const h=(r[0x2d]-2)&255;if(h&128)r[0x2c]=0;r[0x2d]=h&128?0:h;put(r,0x2e,66);divideOriginal16By16(r);r[0x1d]=r[0x2c];
  const py=(w(r,0x34d+owner,0x360+owner)-48)&65535;put(r,0x2c,py&32768?0:py);put(r,0x2e,34);divideOriginal16By16(r);
  const zones=[0,6,12,18,24,30,36,42,48,64,64,128,160];const zone=zones[r[0x2c]];if(zone===undefined)throw new RangeError('A2F2 formation zone boundary');
  r[0x1d]=((zone+r[0x1d])*4)&255;const team=owner&1;r[0x530+team]=(r[0x530+team]&3)|r[0x1d];setByRole(r,team,[11,11,10,10]);
 }
 r[0x65c+owner]=15;
 if([6,14,9,10,11].includes(r[0x52c+side]&15)){r[0x530+side]=(r[0x530+side]&252)|1;applyAIFormation(r,side);}
 if((r[0x5d3+side]&12)!==8){
  if(shouldAttemptAIGoal(r,side,owner))r[0x65c+owner]=35;
  if(r[0x327+owner]===[3,0][side]){goalTarget(r,side);r[0x20]=aimAtTarget(r,owner);r[0x21]=16;scanAIObjectsInCone(r,owner,(owner^1)&1);if(r[0x2c]&128)r[0x65c+owner]=4;}
 }
 if(owner<10)r[0x666+side]=10;
 else {
  const tactic=r[0x5d3+side]&192,defense=r[0x4fd+owner]&192;let special=false;
  if(tactic){if(tactic===128||defense<128)special=true;else {const diff=(r[0x52e+side]-r[0x52e+(side^1)])&255;special=defense===192?!!(diff&128):!(diff&128);}}
  r[0x65c+owner]=special?39:15;
 }
 r[0x4d6]=saved;
}
// A4A8..A51F: choose tackle/press strategy for first candidate in2C.
export function assignAIPressure(r,side){
 let y=r[0x2c]&1;const tactic=r[0x5d3+y]&48;
 const randomChoice=()=>{y=r[0x2c];r[0x65c+y]=random(r)>=192?8:9;};
 if(tactic===0){randomChoice();return;}
 if(tactic===16){y=r[0x2c];const defense=r[0x4fd+y]&192;if(defense===0||defense===192){randomChoice();return;}}
 let action;if((r[0x5d3+side]&48)!==32&&(r[0x300]&96)===96)action=9;
 else {const owner=r[0x4d6];r[0x1c]=r[0x327+owner];if([3,0][owner&1]!==r[0x1c])action=32;else action=(r[0x5d3]&48)===16?9:7;}
 r[0x65c+r[0x2c]]=action;
}
// A39C..A4A7, A589..A596: defending-side press, formation and keeper decisions.
export function assignDefendingAI(r,side){
 const owner=r[0x4d6];if(owner>=10&&!(r[0x67c+owner]&128)){setTeam(r,side,10,10);return;}
 setByRole(r,side,[0,0,34,13]);r[0x21]=128;scanAIObjectsInCone(r,owner,side);
 if(r[0x2c]<10&&r[0x2e]<64)assignAIPressure(r,owner);// original X remains owner during first A4A8
 const stationary=classifyAIVelocity(r,owner)===255;
 if(!stationary){r[0x20]=r[0x1c];r[0x21]=80;scanAIObjectsInCone(r,owner,(owner^1)&1);}
 if(stationary||r[0x2c]>=10){r[0x22]=owner;r[0x23]=side;r[0x27]=5;r[0x28]=9;r[0x29]=2;rankAIObjects(r);}
 assignAIPressure(r,side);
 for(let y=(owner^1)&1;y<10;y+=2)if(r[0x65c+y]===0&&(r[0x650+y]&48)===0)r[0x65c+y]=10;
 if((r[0x530+side]&3)===1)r[0x664+side]=42;
 r[0x1c]=measureAIDistance(r,side+10,r[0x674+(side^1)]);
 r[0x666+side]=[48,40,56,64][r[0x4fd+side]>>>6]>=r[0x1c]?40:13;// original9B4C indexes team X, not keeper Y
 if([6,14,9,10,11].includes(r[0x52c+side]&15)){r[0x530+side]=(r[0x530+side]&252)|2;applyAIFormation(r,side);}
}
function withPredictedBall(r,timer,fn){
 r[0x1c]=timer;const predicted=predictCommandPosition(r,12,timer);put(r,0x32,predicted.x);put(r,0x34,predicted.y);
 const saved=[r[0x320],r[0x333],r[0x359],r[0x36c]];r[0x320]=r[0x32];r[0x333]=r[0x33];r[0x359]=r[0x34];r[0x36c]=r[0x35];
 const result=fn();[r[0x320],r[0x333],r[0x359],r[0x36c]]=saved;return result;
}
// 821F..8260: first nearest non-knocked-down candidate, not nearest unconditionally.
export function assignAIChaser(r){
 let y=255;for(let i=0;i<12;i+=2){y=r[0x2c+i];if(![4,5,45,46,60].includes(r[0x459+y]&127)){r[0x65c+y]=(r[0x465]&127)===5?5:6;return y;}}
 return y;
}
// A59B..A79D: loose-ball pursuit, predicted goalkeeper interception and reaction.
export function assignLooseBallAI(r,side){
 setTeam(r,side,10,12);
 const selected=withPredictedBall(r,r[0x524],()=>{r[0x22]=12;r[0x23]=side;r[0x28]=9;r[0x29]=2;r[0x27]=5;rankAIObjects(r);const y=assignAIChaser(r);r[0x1c]=y;return y;});
 const savedOwner=r[0x4d6];r[0x4d6]=selected;
 if(shouldAttemptAIGoal(r,side,selected)&&(r[0x5d3+side]&12)!==8)r[0x65c+selected]=37;r[0x4d6]=savedOwner;
 const other=side^1;r[0x44]=other;let nearby=r[0x674+other];
 const finish=()=>{if(!r[0x666+side])r[0x666+side]=10;};
 if(r[0x486+nearby]&128){
  const action=r[0x459+nearby]&127;
  if([50,51,52].includes(action)||(r[0x676+other]<32&&r[0x524]!==0&&r[0x524]<16)){
   nearby=r[0x674+other];
   // Original A64D indexes distance array by player slot, intentionally retained.
   if(r[0x676+nearby]<48&&r[0x360+nearby]===0&&r[0x34d+nearby]>=144&&r[0x34d+nearby]<240){r[0x666+side]=40;finish();return;}
  }
 }
 const speed=r[0x402],speedAbs=speed&128?(-speed)&255:speed;
 if((r[0x465]&127)!==5&&speedAbs<4){
  withPredictedBall(r,(r[0x492]&128)?r[0x524]:0,()=>{r[0x1c]=classifyGoalkeeperArea(r,12);if(side===r[0x1c]&&(r[0x36c]!==0?r[0x359]<32:r[0x359]>=112))r[0x666+side]=36;});finish();return;
 }
 let distance,react=false,forceRetreat=false;
 if(!(speed&128)){
  if(side!==1){finish();return;}
  distance=(w(r,0x31f,0x332)-w(r,0x320,0x333))&65535;r[0x1c]=distance&255;
  if((distance>>>8)===0)react=true;else if(!(distance&32768)){finish();return;}else if(r[0x1c]>=232)forceRetreat=true;else{finish();return;}
 }else{
  if(side!==0){finish();return;}
  distance=(w(r,0x320,0x333)-w(r,0x31e,0x331))&65535;r[0x1c]=distance&255;
  if((distance>>>8)===0)react=true;else if(!(distance&32768)){finish();return;}else if(r[0x1c]>=232)react=true;else forceRetreat=true;
 }
 if(forceRetreat){r[0x666+side]=38;finish();return;}
 if(react){
  if(!(r[0x3a5]&128)){r[0x1e]=Math.min(40,r[0x392]);r[0x1c]=Math.max(0,r[0x1c]-r[0x1e]);}
  const difficulty=r[0x52c+side]&128?r[0x57]&3:1,mask=[63,7,0][difficulty];if(mask===undefined)throw new RangeError('Original keeper difficulty table has three entries');
  const threshold=(random(r)&mask)+r[0x1c];
  if(threshold<16)r[0x666+side]=(r[0x686+side]&128)?38:14;
  else if((r[0x57]&3)===0&&side===1&&random(r)<160)r[0x666+side]=0;
  else r[0x666+side]=5;
 }
 finish();
}
// 8298..8338 set-piece strategies and source tables832E/8331/8334.
export function assignSetPieceAI(r){
 r[0x678]=r[0x679]=255;const serving=r[0x68b]&1;setTeam(r,serving,10,12);
 for(let y=serving^1;y<12;y+=2)r[0x65c+y]=y<10?41:10;
 const x=r[0x4d6],index=r[0x68a];let table;
 if(r[0x5c]&4)table=[21,22,23];
 else if(r[0x51a]!==0?r[0x519]===88:r[0x519]===48)table=[24,25,26];
 else table=[27,28,29,30,31];
 if(index>=table.length)throw new RangeError('Original set-piece decision table boundary');
 r[0x65c+x]=table[index];r[0x668+x]=(r[0x668+x]&240)|1;
}
// 81A9..821E: both-side tactical phase between AI preparation and player commands.
export function updateMatchAITactics(r){
 if(r[0x59]===3)return;if(r[0x59]===6){assignSetPieceAI(r);return;}
 const saved=r[0x4d6];
 for(let side=0;side<2;side++){
  const same=((side^r[0x4d6])&1)===0;
  if(r[0x492]&64){if(same)assignAttackingAI(r,side);else assignDefendingAI(r,side);}
  else if([4,10,21].includes(r[0x465]&127)&&same)assignAttackingAI(r,side);
  else assignLooseBallAI(r,side);
 }
 r[0x4d6]=saved;if(r[0x57]&32)r[0x65c+(r[0x5cc]&127)]=43;
}
