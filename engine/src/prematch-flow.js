/** Original menu substate03 (8DBC-8FF8) and prematch option routing.
 * Pure semantic code; graphic assets are bounded original tile data.
 */
import {PREMATCH_DATA as D} from './prematch-data.js';
import {initializeMenuScreen,advancePaletteFade,beginPaletteFade} from './state-dispatch.js';
import {advanceAnimationRecord} from './sprite-animation.js';
import {integrateMotion} from './physics.js';
function need(s,name,...args){if(typeof s[name]!=='function')throw new Error(`MissingTranslation: prematch ${name}`);return s[name](...args);}
export function introNamePatches(r){
 const out=[];
 for(let side=1;side>=0;side--){const tiles=D.teamLogos[r[0x52c+side]&15],base=[0x20e5,0x20f4][side];for(let row=0;row<9;row++)out.push({address:base+row*32,bytes:tiles.slice(row*7,row*7+7)});}
 const region=D.regionLabels[r[0x529]];if(!region)throw new RangeError('intro region');
 for(let row=0;row<2;row++)out.push({address:0x2044+row*32,bytes:region.slice(row*24,row*24+24)});
 return out;
}
export function initializeIntroObjects(r){
 const slots=[12,0,1,3];
 for(let i=0;i<4;i++){
  const slot=slots[i];if(i<2){const team=r[0x52c+i]&15;r[0x5ae+i]=D.teamPalettes[team];r[0x74+slot]=D.teamFrames[team];}
  r[0x61+slot]=6;const at=i*4;r[0x314+slot]=D.positions[at];r[0x327+slot]=D.positions[at+1];r[0x34d+slot]=D.positions[at+2];r[0x360+slot]=D.positions[at+3];
 }
 r[0x45c]=1;const at=r[0x529]*3;if(at+2>=D.regions.length)throw new RangeError('intro region');
 r[0x45a]=D.regions[at];r[0x5b0]=D.regions[at+1];r[0x5b1]=D.regions[at+2];
}
export function updateIntroObjects(r,s){
 const records={2:[0,0x8d],3:[8,0x8f,8,0x91,0xfe],4:[8,0x93,8,0x95,0xfe]};
 for(const slot of [12,0,1,3]){
  const action=r[0x459+slot]&127;
  if(action===1){
   const source=slot-2;if(source<0)throw new RangeError('intro follower source');
   for(const base of [0x314,0x327,0x34d,0x360,0x386,0x399])r[base+slot]=r[base+source];
   r[0x74+slot]=(r[0x74+source]+1)&255;
  }else if(action>=2&&action<=4){
   if(!(r[0x459+slot]&128)){r[0x459+slot]|=128;r[0x87+slot]=0;r[0x94+slot]=0;}
   advanceAnimationRecord(r,slot,records[action]);
   r[0x3e8+slot]=[0x80,0xa0,0xc0][action-2];r[0x3f6+slot]=255;integrateMotion(r,slot);
  }else if(action!==0)throw new RangeError('intro object action');
  need(s,'submitMenuCursor',r,slot);
 }
}
export async function stepPrematchIntro(r,s){
 if(!(r[0x59]&128)){
  initializeMenuScreen(r,s);r.set([40,41,42,43],0x5b8);need(s,'configureChrBanks',r);
  r[0x55d]=0;r[0x55f]=0;r[0x5d2]=0x38;initializeIntroObjects(r);
  for(let side=0;side<2;side++){const at=(r[0x52c+side]&15)*2;r[0x5ac+side]=D.backgroundPairs[at];r[0x5bd]=D.backgroundPairs[at+1];}
  need(s,'applyTilePatches',introNamePatches(r));need(s,'requestSound',8);
 }
 const phase=r[0x5c9];
 if(phase===0){if(r[0x5b2]&128)r[0x5c9]++;}
 else if(phase===1){
  if(r[0x5b2]&128){
   if(r[0x5b2]&64){r[0x59]=4;return;}
   if(r[0x08]&16){need(s,'requestSound',0x33);beginPaletteFade(r,'out');}
   else if((r[0x300]&15)===0){r[0x5d2]=(r[0x5d2]-1)&255;if(r[0x5d2]&128)beginPaletteFade(r,'out');}
  }
 }else throw new RangeError('intro phase');
 updateIntroObjects(r,s);need(s,'updateSpriteVisibility',r);advancePaletteFade(r,s.updatePalette);
}

import {readMenuCommand,navigateMenuOption,setMenuCursorPosition,setMenuCursorBlink,waitForPaletteFade} from './state-dispatch.js';
import {TEAM_PALETTE_PAIRS,TEAM_CHR_PAIRS} from './sprite-appearance-data.js';
import {settleRosterMood} from './mood-league.js';
import {loadAttributeMemory} from './platform/state-views.js';
export function settlePrematchRosterMood(r){
 const s={moods:r.subarray(0x5d5,0x5e1),rosterEven0532:Array.from({length:6},(_,i)=>r[0x532+i*2]),value052e:r[0x52e],value052f:r[0x52f],value0530:r[0x530],rng45:r[0x45],rng46:r[0x46]};
 settleRosterMood(s);r[0x45]=s.rng45;r[0x46]=s.rng46;
}
export function initializePrematchPortraits(r){
 const side=r[0x5cc];if(side>1)throw new RangeError('prematch side');const team=r[0x52c+side]&15;
 r[0x55d]=(team===0?0:12)+r[0x532+side];r[0x5ba]=TEAM_CHR_PAIRS[team][0];r[0x5b0]=TEAM_PALETTE_PAIRS[team][0];r[0x5b1]=TEAM_PALETTE_PAIRS[team][side?1:0];r[0x5ae]=1;r[0x5af]=1;
 const score=r[0x52e]===r[0x52f]?0:r[0x52e]<r[0x52f]?1:2;let at=score*4+side*2;
 for(const [i,slot]of [[0,1],[2,3]]){
  r[0x459+slot]=D.portraitActions[at++];r[0x314+slot]=D.portraitPositions[i];r[0x34d+slot]=D.portraitPositions[i+1];
  for(const base of [0x327,0x360,0x386,0x399])r[base+slot]=0;
 }
}
export function updatePrematchPortrait(r,slot){
 const action=r[0x459+slot]&127;if(action===0)return;
 if(!(r[0x459+slot]&128)){r[0x459+slot]|=128;r[0x87+slot]=0;r[0x94+slot]=0;r[0x46c+slot]=0;}
 const record=D.optionAnimations[action];if(!record)throw new RangeError('prematch portrait action');
 advanceAnimationRecord(r,slot,record,{onEnd:()=>{r[0x459+slot]&=127;}});
}
export async function choosePrematchOption(r,s){
 r[0x5d1]=r[0x532+r[0x5cc]];
 const index=r[0x5ca]*2+((r[0x57]&128)?0:1),route=D.optionRoutes[index];
 if(route===undefined)throw new RangeError('prematch option');
 if((route&0xc0)===0xc0){need(s,'requestSound',0x34);return false;}
 need(s,'requestSound',0x33);beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);
 if(route===0||(route&128&&r[0x5cc]!==0)){
  // Exact C335 -> state write -> BB84 -> slot1F order. Do not skip BB84.
  settlePrematchRosterMood(r);r[0x5cc]=0;r[0x58]=0;r[0x59]=0;
  need(s,'prepareFieldState',r);loadAttributeMemory(r);
 }else if(route&128){r[0x5cc]++;r[0x59]&=127;}
 else {r[0x59]=(route===9&&r[0x54a]<128)?15:route;r[0x5b]=4;}
 return true;
}
export async function stepPrematchOptions(r,s){
 if(!(r[0x59]&128)){
  initializeMenuScreen(r,s);
  if(r[0x57]&64){need(s,'loadScreen',19,r);await need(s,'prepareVersusPrematchOptions',r);}
  r[0x5ca]=255;r[0x61]=5;r[0x62]=5;r[0x64]=5;r.fill(0,0xec,0xf4);initializePrematchPortraits(r);
  r[0x5b8]=38;r[0x5b9]=39;r[0x5bb]=17;need(s,'configureChrBanks',r);need(s,'requestSound',2);
 }
 const phase=r[0x5c9];
 if(phase===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
 else if(phase===1){
  if(r[0x5ca]&128)r[0x5ca]=2;const command=readMenuCommand(r);
  if(command===1||command===3)await choosePrematchOption(r,s);
  else if(command===4){need(s,'requestSound',0x34);r[0x5ca]=2;}
  else if(command>=5){need(s,'requestSound',0x32);navigateMenuOption(r,0,D.optionNeighbors);}
 }else throw new RangeError('prematch options phase');
 // Original phase0 reads90EE+FE for FF selection, yielding offscreen20,56.
 // It is retained as a proved data read, not replaced with invented geometry.
 const positions=[...D.optionPositions];positions[254]=D.optionSentinel[0];positions[255]=D.optionSentinel[1];
 setMenuCursorPosition(r,0,positions);setMenuCursorBlink(r,0,0);need(s,'submitMenuCursor',r,0);
 for(const slot of [1,3]){updatePrematchPortrait(r,slot);need(s,'submitMenuCursor',r,slot);}
 need(s,'updateSpriteVisibility',r);
}
