import {GOAL_AIM,OFFSET_X_LO,OFFSET_X_HI,OFFSET_Y_LO,OFFSET_Y_HI,WAIT_HEIGHT,JUMP_ALIGNMENT,CHASE_HEIGHT,KEEPER_ANCHORS,PRESS_DISTANCE,DEFENDER_TARGETS,OWN_GOAL_POINTS} from './match-ai-late-data.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
const action=(r,x,a)=>{r[0x479+x]=a;},shoot=(r,x,a)=>{action(r,x,a);r[0x4b0+x]=255;};
// 03:9812..9834: index calculation before the table loads. r1D/1E is the
// original caller's table pointer; the caller owns its semantic branch table.
export function selectLateDecisionIndex(r,x){
 r[0x1f]=(r[0x4fd+x]&192)>>>4;r[0x20]=((r[0x45]&7)-4)&255;
 return (((r[0x650+x]+r[0x20])&15)>>>2)|r[0x1f];
}
// Optional exact9835..983E scratch/register result for static table metadata.
// Addresses identify original semantic branches; they are never executed/read as code.
export function selectLateDecisionBranch(r,x,originalAddresses){
 const index=selectLateDecisionIndex(r,x),address=originalAddresses[index];
 if(!Number.isInteger(address)||address<0||address>65535)throw new RangeError('Missing original decision table entry');
 r[0x1f]=address&255;r[0x20]=address>>>8;return {index,a:r[0x20],y:index*2+1,carry:false};
}
function movement(r,x,h){return h.selectMovement985F(r,x);}
function clearCommand(r,x){if(r[0x678+(x&1)]===2)r[0x678+(x&1)]=255;}
// 8FBB..903D. Edge pass writes067E+object index, as in the source, not side.
function pass(r,x,h){
 if(r[0x360+x]===0&&r[0x34d+x]<64){r[0x67e+x]=128;action(r,x,10);return;}
 if(r[0x360+x]!==0&&r[0x34d+x]>=80){r[0x67e+x]=0;action(r,x,10);return;}
 r[0x21]=128;h.scanB034(r,x,x&1,128);let at=r[0x45]&128?3:0;
 for(let n=0;n<86;n++,at=(at+3)&255){const candidate=r[0x2c+at];if(candidate&128)return h.early(r,x,0);
  r[0x44]=at;if([4,5,45,46,60].includes(r[0x459+candidate]&127))continue;r[0x1c]=candidate;r[0x67e+(x&1)]=candidate|16;action(r,x,10);return;
 }
 throw new Error('Original pass scan lacked a negative sentinel');
}
function aimGoal(r,x,h){const i=(x&1)*4;r.set(GOAL_AIM.slice(i,i+4),0x2e);let angle=h.aim(r,x);r[0x1c]=angle;if(x&1){angle=(-angle)&255;r[0x1c]=angle;}return angle>=32&&angle<96;}
function randomizedShot(r,x,a,h){shoot(r,x,a);if(h.random(r)<64)return pass(r,x,h);}
function aerialShot(r,x,h){if(r[0x486+x]&128){const b=r[0x46];return randomizedShot(r,x,b&128?55:b>=64?56:70,h);}action(r,x,r[0x486+x]&16?16:48);}
function predict(r,x,y,timer,h){r[0x1c]=timer;h.predict98D0(r,y,timer);h.ae4b(r,x);}
function chasePrediction(r,x,h){let timer=(r[0x524]-r[0x1c])&255;if(timer&128)timer=0;r[0x1c]=timer;h.predict98D0(r,12,timer);h.clipPrediction9B75(r,x);h.ae4b(r,x);movement(r,x,h);}
function alignForJump(r,x,difficulty,h){r[0x1f]=12;h.ae1a(r,x,12);h.selectDirectionB175(r,x);r[0x1f]=r[0x1e]=JUMP_ALIGNMENT[difficulty];h.selectDirectionB175(r,x);if(r[0x4b0+x]!==255&&r[0x4b0+x]!==r[0x496+x])return h.jump9B57(r,x);action(r,x,48);}
function chaseHighBall(r,x,h,aggressive){
 const difficulty=h.difficulty9B4C(r,x);r[0x1c]=difficulty;const threshold=(aggressive?CHASE_HEIGHT:WAIT_HEIGHT)[difficulty];
 if(threshold<r[0x524])return chasePrediction(r,x,h);
 if(!aggressive){if(!(h.random(r)&128))return chasePrediction(r,x,h);if(h.distance(r,x,12)>=48)return chasePrediction(r,x,h);return alignForJump(r,x,difficulty,h);}
 if(h.distance(r,x,12)>=64)return chasePrediction(r,x,h);
 if(!(r[0x486+x]&128))return alignForJump(r,x,difficulty,h);
 if(!h.aeBF(r,x,12)||!(r[0x45]&128))return chasePrediction(r,x,h);
 const roll=h.random(r);shoot(r,x,roll>=160?51:roll>=80?52:50);clearCommand(r,x);
}
function chaseBall(r,x,h,aggressive){
 const high=r[0x3a5],low=r[0x392];if(!(high&128)&&(aggressive?low:(high|low))>=24)return chaseHighBall(r,x,h,aggressive);
 const timer=h.distance(r,x,12)>>>3;predict(r,x,12,timer,h);
 if(!aggressive)return movement(r,x,h);
 const side=x&1,dx=r[0x1c];
 if(r[0x2b]>=8||r[0x34d+x]<144||(side?(!(dx&128)||dx>=224||dx<200||!(r[0x74+x]&128)):((dx&128)||dx<32||dx>=56||(r[0x74+x]&128))))return movement(r,x,h);
 r[0x4b0+x]=side?192:64;action(r,x,49);clearCommand(r,x);
}
function defendAir(r,x,h){
 const y=r[0x674+((x^1)&1)];r[0x44]=y;if(!(r[0x486+y]&128))return h.early(r,x,9);
 const timer=h.distance(r,x,y)>>>5;r[0x1c]=timer;h.predict98D0(r,y,timer);r[0x1f]=y;h.ae4b(r,x);
 const dx=r[0x2a],dy=r[0x2b];let request;
 if(!(r[0x67c+x]&128)){if(dy<8&&dx<56&&dx>=40)request=65;else if(dy<8&&dx<40)request=84;else if(dy<80&&dx<24)request=62;}
 if(request!==undefined){r[0x1e]=r[0x1f]=0;h.selectDirectionB175(r,x);r[0x4b0+x]=request===62?(r[0x4b0+x]+64)&128:(r[0x4b0+x]&128)+64;action(r,x,request);return;}
 r[0x638+x]=r[0x34];r[0x644+x]=r[0x35];r[0x620+x]=r[0x314+x];r[0x62c+x]=r[0x327+x];h.ae37(r,x);movement(r,x,h);
}
function penaltyAttack(r,x,h){
 if(!(r[0x492]&64)){if(!(r[0x3a5]&128)&&r[0x392]>=24)return chaseBall(r,x,h,true);return h.early(r,x,6);}
 if(r[0x486+x]&128){const roll=h.random(r);if(roll>=64)return;shoot(r,x,(roll&3)===0?70:(roll&3)===1?56:55);return;}
 if(!r[0x68e])r[0x68e]=1;const seed=r[0x68f];r[0x1c]=(seed&240)>>>2;put(r,0x620+x,0x62c+x,0x308+r[0x1c]);r[0x1c]=(seed&15)<<3;put(r,0x638+x,0x644+x,132+r[0x1c]);
 h.ae37(r,x);r[0x1e]=8;r[0x1f]=5;h.selectDirectionB175(r,x);const angle=r[0x4b0+x];
 if(angle!==255){action(r,x,angle&112?33:(r[0x459+x]&127)===33?32:15);return;}
 if(r[0x68e]===1)r[0x68e]=2;action(r,x,[48,16,14,9][h.random(r)&3]);
}
// 03:8FAB..9811: all late dispatcher kinds10..2B. Helpers are named semantic routines.
export function updateLateBot(r,x,kind,h){
 if(kind<16||kind>43)throw new RangeError('Late bot kind outside10..2B');
 if(kind===16){r[0x4b0+x]=r[0x67c+(x&1)];action(r,x,32);return;}
 if(kind>=17&&kind<=19)return pass(r,x,h);
 if(kind===20){if(!aimGoal(r,x,h)||((x&1)?r[0x314+x]!==0:r[0x327+x]!==3)||(r[0x5d3+(x&1)]&12)===8)return pass(r,x,h);shoot(r,x,9);return;}
 if([21,24,28].includes(kind)){r[0x1f]=12;h.ae1a(r,x,12);movement(r,x,h);if(r[0x492]&64)r[0x68a]++;return;}
 if([22,25,30].includes(kind)){r.set(r.slice(0x517,0x51b),0x32);h.ae4b(r,x);movement(r,x,h);if(r[0x4b0+x]===255)r[0x68a]++;return;}
 if(kind===23){action(r,x,22);return;}
 if(kind===26||kind===31){action(r,x,26);r[0x67e+(x&1)]=(x&1)|16;return;}
 if(kind===27||kind===29){if(kind===27){r[0x620+x]=r[0x314+x];r[0x62c+x]=r[0x327+x];r[0x638+x]=r[0x359];r[0x644+x]=r[0x36c];}else{r[0x638+x]=r[0x34d+x];r[0x644+x]=r[0x360+x];r[0x620+x]=r[0x517];r[0x62c+x]=r[0x518];}h.ae37(r,x);movement(r,x,h);if(r[0x4b0+x]===255)r[0x68a]++;return;}
 if(kind===32||kind===34){let target=12;if(r[0x65c+x]===34){if(x<6||x>9)throw new RangeError('Bot22 source defender table requires slot6..9');target=DEFENDER_TARGETS[x-6];}r[0x1c]=target;const side=x&1;for(let i=0;i<4;i++)r[0x2e+i]=OWN_GOAL_POINTS[i*2+side];const angle=h.aim(r,target)>>>4;put(r,0x2e,0x2f,w(r,0x314+target,0x327+target)+(OFFSET_X_LO[angle]|OFFSET_X_HI[angle]<<8));put(r,0x30,0x31,w(r,0x34d+target,0x360+target)+(OFFSET_Y_LO[angle]|OFFSET_Y_HI[angle]<<8));r[0x620+x]=r[0x2e];r[0x62c+x]=r[0x2f];r[0x638+x]=r[0x30];r[0x644+x]=r[0x31];h.ae37(r,x);return movement(r,x,h);}
 if(kind===33)return h.early(r,x,7);
 if(kind===35){if(!aimGoal(r,x,h))return pass(r,x,h);if((r[0x4fd+x]&128)||((r[0x4f1+x]&4)&&(r[0x459+x]&127)===33))return aerialShot(r,x,h);if(r[0x486+x]&128){if(r[0x386+x]<18)return;return randomizedShot(r,x,55,h);}if((r[0x650+x]&15)>=14)return aerialShot(r,x,h);return randomizedShot(r,x,9,h);}
 if(kind===36||kind===37)return chaseBall(r,x,h,kind===37);
 if(kind===38){r[0x4b0+x]=(x&1)?64:192;action(r,x,33);return;}
 if(kind===39){if(x<10||x>11)throw new RangeError('Keeper anchor requires slot10/11');const i=(x-10)*4;r[0x620+x]=KEEPER_ANCHORS[i];r[0x62c+x]=KEEPER_ANCHORS[i+1];r[0x638+x]=KEEPER_ANCHORS[i+2];r[0x644+x]=KEEPER_ANCHORS[i+3];h.ae37(r,x);r[0x1e]=r[0x1f]=4;h.selectDirectionB175(r,x);if(r[0x4b0+x]!==255){action(r,x,r[0x486+x]&8?15:32);return;}if([4,5,2,45,46,60,61,89,90].includes(r[0x459+(x&1)]&127)){action(r,x,1);return;}action(r,x,10);r[0x674+x]=(x&1)|16;return;}
 if(kind===40)return defendAir(r,x,h);
 if(kind===41){let yy=w(r,0x34d+x,0x360+x);if(r[0x360+x])yy=255;else if(r[0x34d+x]<144)yy=146;put(r,0x638+x,0x644+x,yy);const high=r[0x327+x];put(r,0x620+x,0x62c+x,high===0?256:high===3?767:w(r,0x314+x,0x327+x));h.ae37(r,x);return movement(r,x,h);}
 if(kind===42){const y=r[0x4d6],pos=w(r,0x314+y,0x327+y),relative=(y&1)?pos:(1024-pos)&65535;put(r,0x1c,0x1d,relative);if(relative>=384||(r[0x360+y]?r[0x34d+y]>=32:r[0x34d+y]<96))return h.early(r,x,10);r[0x1c]=h.distance(r,x,y);const d=h.difficulty9B4C(r,x);if(r[0x1c]>=PRESS_DISTANCE[d])return h.early(r,x,10);const tactic=r[0x5d3+(x&1)]&48;if(tactic===0)return h.early(r,x,9);if(tactic===32)return h.early(r,x,7);if((r[0x300]&48)===48||d>=2||(r[0x650+x]&15)>=14)return h.early(r,x,9);return h.early(r,x,7);}
 return penaltyAttack(r,x,h);
}
