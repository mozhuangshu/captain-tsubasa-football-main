/** Original result-screen actor scheduling: 04:B8AB,06:BE42,02:BB3C. */
import {updateInputHistory} from './input-history.js';
import {acceptActionRequest,updatePlayerActionFlags,DIRECTION_ANGLES} from './controls-actions.js';
import {updateScoreActor,updateVictoryActor} from './scoreboard-actors.js';
import {submitObjectForDisplay} from './object-display-list.js';
import {beginPaletteFade} from './state-dispatch.js';
import {advanceRandom} from './mood-league.js';
import {leagueStateView} from './league-flow.js';
export function updateResultController_B8AB(r,controller){
 r[0x43]=controller;const x=r[0x568+controller];if((r[0x650+x]&128)||!(r[0x479+x]&128))return;
 updateInputHistory(r,controller);r[0x1d]=r[4+controller];r[0x1e]=r[8+controller];r[0x1f]=r[0x56c+controller];r[0x20]=r[0x570+controller];r[0x21]=r[0x57c+controller];
 const state=r[0x486+x],held=r[0x1d];r[0x1c]=!(state&176)?0:state&128?1:state&32?2:3;r[0x2c]=5;r[0x2d]=186;
 let input=state&128?r[0x1e]>>>1:r[0x20];
 if(!(state&128)&&(input&128)){r[0x479+x]=(held&3)?(((r[0x4a3+x]>>>7)^held)&1?9:10):(state&8?9:8);return;}
 if(input&64){r[0x479+x]=4;return;}if(input&32){r[0x479+x]=5;return;}
 if(!(state&128))r[0x479+x]=(r[0x21]&15)?(r[0x21]&3?7:13):(held&15?6:1);
 r[0x4b0+x]=DIRECTION_ANGLES[held&15];
}
export function admitResultAction(r,x){const p={action0479:r[0x479+x],movement0459:r[0x459+x],state0486:r[0x486+x],skill04f1:r[0x4f1+x],surface0130:r[0x130+x]};acceptActionRequest(p,{weather0466:r[0x466]},'ball');r[0x479+x]=p.action0479;r[0x459+x]=p.movement0459;}
export function updateScoreActors_BE42(r){const events=[];
 for(let x=1;x>=0;x--){if(!(r[0x52a+x]&1))continue;
  if(r[0x59]!==5)r[0x3ad]=128;else if(r[0x5e2]<64){r[0x3ad]=x;r[0x4d6]=x^1;}else r[0x3ad]=x|64;
  updateResultController_B8AB(r,x);admitResultAction(r,x);events.push(...updateScoreActor(r,x));updatePlayerActionFlags(r,x,'ball');submitObjectForDisplay(r,x);
  if(((r[0x327+x]===0&&r[0x314+x]<128)||(r[0x327+x]===2&&r[0x314+x]>=128))&&(r[0x5b2]&128)){beginPaletteFade(r,'out');r[0x5e8]=0;}
 }
 if(r[0x5b2]&128){if(!(r[0x300]&63))events.push({type:'sound',soundId:63});else if(!(r[0x300]&7)&&(advanceRandom(leagueStateView(r)).value&128))events.push({type:'sound',soundId:64});}
 return {events};
}
export function updateEndingActors_BB3C(r){const events=[];updateResultController_B8AB(r,0);admitResultAction(r,0);events.push(...updateScoreActor(r,0));updatePlayerActionFlags(r,0,'ball');submitObjectForDisplay(r,0);for(const x of[1,12]){events.push(...updateVictoryActor(r,x));submitObjectForDisplay(r,x);}return {events};}
