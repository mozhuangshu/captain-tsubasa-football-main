import {stepTsubasaMisugiHeart,afterTsubasaMisugiPlayers} from './tsubasa-misugi-heart.js';
import {tickTsubasaDefensiveState} from './tsubasa-defensive-moves.js';
import {observeTsubasaCooperation,syncTsubasaSpecialMoves,drainTsubasaSpecialEvents} from './tsubasa-special-moves.js';
import {stepTsubasaTriangle} from './tsubasa-triangle-shot.js';
import {stepTsubasaMorisakiSave} from './tsubasa-morisaki-save.js';
/** Source-directed main match actor sequencing (16 KiB source bank06 BD6A).
 * These are game functions, not a CPU interpreter. Remaining semantic services
 * must be provided explicitly; no approximate movement or renderer fallback.
 */
import {acceptPlayerActionFromState,updatePlayerActionFlags,acceptBallMovementRequest,updateBallPossessionFlags} from './controls-actions.js';
import {updateRecoveredPlayerAction} from './player-actions.js';
import {updateBallAction,updateElectricBallAppearance} from './ball-runtime.js';
import {processGoalAndBoundary} from './goal.js';
import {resolveCollisionShape,intersectCollisionShapes,scanHeldBallContacts} from './ball-collision.js';
import {updatePaletteForFade} from './sprite-palette-buffer.js';
import {submitObjectForDisplay} from './object-display-list.js';
export const ACTION_CALLOUTS=Object.freeze([44,45,2,23,51,50,7,52,44,48,51,63,51,47,48,52,61,62,55,63,46,41,49,53,39,7,14,54,46,42,48,53,40,19,62,56,62,63,43,41,0,2,57,24,7,63,51,57,16,17,51,44,19,20,51,47,58,63,62,43,0,2,44,57,7,47,48,50,16,25,49,51,19,24,51,47,55,42,62,63]);
const word=(r,l,h)=>r[l]|r[h]<<8;
// ABB3..ABDD: commands of a player standing on a teammate are forwarded.
export function forwardStackedPlayerCommands(r){
 for(let x=0;x<12;x++)if((r[0x459+x]&127)===0x14){const y=r[0x4ca+x];r[0x4b0+y]=r[0x4b0+x];r[0x479+y]=r[0x479+x];r[0x4a3+x]=r[0x4a3+y];r[0x479+x]=255;}
}
// ABDE..AC4C: clear/rebuild stack flags, then follow supporting actor exactly.
export function followStackedPlayers(r){
 for(let x=0;x<12;x++)r[0x486+x]&=254;
 for(let x=0;x<12;x++)if((r[0x459+x]&127)===0x14){const y=r[0x4ca+x];r[0x486+x]=r[0x486+y]|1;r[0x486+y]=r[0x486+x];
  for(const a of [0x314,0x327,0x34d,0x360,0x3e8,0x3f6,0x404,0x412])r[a+x]=r[a+y];
  const z=(word(r,0x386+y,0x399+y)+32)&65535;r[0x386+x]=z&255;r[0x399+x]=z>>>8;
 }
}
// bank03 B9EE..BAA0. The unused CMP #3A has no branch in the source.
export function chooseActionCallout(r,x,side=x&1){
 const a=r[0x459+x];if(a&128)return 0;let offset;
 if([9,7,0x31,0x32,0x46,0x33,0x34,0x37,0x38,0x49,0x4b,0x4d,0x4f].includes(a))offset=0;
 else if([10,8,0x35,0x39,0x36].includes(a))offset=4;
 else if([0x22,0x3b].includes(a))offset=8;
 else if([0x23,0x42].includes(a))offset=12;
 else if([0x2d,0x2e,0x3c,0x3d,0x59,0x5a].includes(a))offset=16;
 else return 0;
 r[0x1c]=offset;const group=(r[0x52c+side]&12)>>>2,pointer=0xbaa9+20*group;
 r[0x2c]=pointer&255;r[0x2d]=pointer>>>8;
 return ACTION_CALLOUTS[group*20+offset+(r[0x45]&3)]|128;
}
// C276 far-call to bank03 B999..B9ED; records the original action callout ID.
export function recordPlayerActionCallout(r,x){
 if((r[0x57]&32)||(r[0x459+x]&128))return;
 const side=x&1;r[0x1d]=side;let selected;
 if(r[0x52c+side]&128)selected=x===0;
 else{r[0x1e]=r[0x568+side];selected=x===r[0x1e];}
 if(selected){const value=chooseActionCallout(r,x,side);if(value){r[0x680+side]=value;r[0x684+side]=32;return;}}
 r[0x1e]=r[0x67a+side]&15;if(x!==r[0x1e])return;
 const value=chooseActionCallout(r,x,side);if(value){r[0x682+side]=value;r[0x684+side]=32;}
}
// B2A4..B300: physical interaction with weather actor slot13.
export function collideWeatherActor(r,x){
 r[0x43]=x;r[0x44]=13;
 const a=resolveCollisionShape(r,x,x===12?'ball':'player',0);if(!a)return false;
 r[0x2e]=a.address&255;r[0x2f]=a.address>>>8;
 const b=resolveCollisionShape(r,13,'weather',1);if(!b)return false;
 if(!intersectCollisionShapes(r,x,13,a,b))return false;
 const index=((r[0x466]<<1)&255)+(x===12?1:0),table=[255,255,6,254,255,255,85,22,0xad,0x4b,0xb5,0x85,0x2c,0xad];
 if(index>=table.length)throw new RangeError('Weather response outside original recovered table');
 const action=table[index];if(action<128)r[0x459+x]=action;else if(action!==255)r[0x525]=128;
 return true;
}
// Fixed D5EF..D616: wetness chooses the original sprite palette group.
export function updateWetBallPalette(r){
 if((r[0x466]&127)===1)return;
 const palette=(r[0x50d]&128)?3:(r[0x50d]&64)?2:1;
 if(r[0x5ae]===palette)return;r[0x5ae]=palette;updatePaletteForFade(r);r[0x6d9]=0x3f;
}
// BD6A..BDDE. Penalty mode intentionally forwards stack commands twice.
export function updateAllMatchActors(r,s={}){
 const events=[];tickTsubasaDefensiveState(r);observeTsubasaCooperation(r);stepTsubasaTriangle(r);/* M-8: no-op unless a triangle is running */events.push(...stepTsubasaMisugiHeart(r));/* M-10: no-op unless specials on + 武藏 */stepTsubasaMorisakiSave(r);/* M-9: no-op unless special moves are on and a special shot is active */forwardStackedPlayerCommands(r);
 function player(x){acceptPlayerActionFromState(r,x);recordPlayerActionCallout(r,x);events.push(...updateRecoveredPlayerAction(r,x,s.playerOptions??{}));collideWeatherActor(r,x);submitObjectForDisplay(r,x);}
 if(r[0x57]&32){forwardStackedPlayerCommands(r);player(r[0x5cc]&15);player(((r[0x5cc]&1)^1)|10);}
 else for(let x=0;x<12;x++)player(x);
 for(let x=0;x<12;x++)updatePlayerActionFlags(r,x);
 afterTsubasaMisugiPlayers(r);/* M-10 */
 acceptBallMovementRequest(r);events.push(...updateBallAction(r,12).events);updateElectricBallAppearance(r);
 const goal=processGoalAndBoundary(r,12);events.push(...goal.sounds.map(soundId=>({type:'sound',soundId})));
 if((r[0x492]&64)&&[3,9,20].includes(r[0x465]&127)){const out=scanHeldBallContacts(r,12);if(out?.events)events.push(...out.events);}
 updateBallPossessionFlags(r);submitObjectForDisplay(r,12);updateWetBallPalette(r);collideWeatherActor(r,12);followStackedPlayers(r);syncTsubasaSpecialMoves(r);events.push(...drainTsubasaSpecialEvents(r));
 return {events};
}
