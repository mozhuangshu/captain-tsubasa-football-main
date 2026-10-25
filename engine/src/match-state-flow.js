import {routeCompletedMatch} from './league.js';
import {storyNoExtraTime,notifyStoryHalfTime} from './tsubasa-story-rules.js';
import {leagueStateView} from './league-flow.js';
/** Original main0 orchestration. This deliberately stops at unrecovered
 * semantic dependencies; it never calls the prior reconstructed Match class.
 */
import {beginPaletteFade,advancePaletteFade,waitForPaletteFade,updatePauseBranch} from './state-dispatch.js';
import {updateMatchClock_D6E7,updateFrameHud_DE47,copyCamera_CAEE,routeMatchScript_C89C,updateKickoffControls_B850,updateRestartCamera_C80B,classifyResultPresentation_CA58} from './match-frame-helpers.js';
import {updateOrdinaryHumanControls} from './controls-actions.js';
import {updateFieldScroll_DED3} from './field-render.js';
import {initializeTerrainPointers} from './terrain.js';
function need(s,name,...args){if(typeof s[name]!=='function')throw new Error(`MissingTranslation: ${name}`);return s[name](...args);}
/** CF93-D01E. Host display synchronization replaces the NMI handshake only. */
export async function initializeMatchScreen(r,s){
 r[0x5f0]=0;r[0x5ab]=0;r[0x5fd]=0;for(const a of [0x5fa,0x67c,0x67d,0x5f5])r[a]=255;
 initializeTerrainPointers(r); // E7D9
 await need(s,'initializeMatchRoster_Bank00_BB13',r); // C326, actual lineup/coordinates, never assumed defaults
 need(s,'configureChrBanks',r);
 r[0x5ac]=r[0x5f4];r[0x5ad]=15;
 r[0x5bc]=r[0x5f2];r[0x5bd]=(r[0x5f2]+4)&255;r[0x56]=0xb1;
 r[0x4c]&=127;r[0x4d]&=0xe7;
 await need(s,'renderInitialField_E3D9',r,{mirroring:1});
 await need(s,'renderMatchHud_Bank03_A995',r);
 if(r[0x57]&32){r[0x55a]=13;r[0x5f8]=0x83;}
 else r[0x5f8]=r[0x55b]?0x85:0x80;
 r[0x5f9]=0;need(s,'requestSound',r[0x55a]);r[0x5e6]=3;r[0x4c]|=128;r[0x4d]|=0x18;
}
/** DE0B-DE46: choose the actual background second CHR pair by camera X. */
export function updateFieldPatternPages(r){r[0x5bc]=r[0x5f2];r[0x5bd]=(r[0x5f2]+(r[0xed]<2?4:2))&255;}
/** C539-C57C. Every outstanding callee is named at its verified origin. */
export async function initializeMatchSubstate(r,s){
 r[0x4f]=0xc0;r[0x4d]&=0xf9; // EF5A removes leftmost sprite/background bits
 await initializeMatchScreen(r,s);updateFieldPatternPages(r);
 r[0x5b3]=2;for(const a of [0x5b2,0x5b6,0x5b5,0x5e2,0x5f0])r[a]=0;
 for(const a of [0x678,0x679,0x67a,0x67b,0x684,0x685])r[a]=255;
 await need(s,'updateAllMatchActors_Bank06_BD6A',r);
 await need(s,'updateMatchDecorations_Bank06_BECC',r);
 need(s,'updateSpriteVisibility',r);
}
export async function stepMatchState(r,s){
 if(r[0x58]!==0)throw new RangeError('Not match main state');
 if((r[0x58b]&128)&&await advanceMatchDemo_C4DB(r,s))return;
 switch(r[0x59]&127){
  case 0:return initializeMatchSubstate(r,s);
  case 1:return stepMatchOpening(r,s);
  case 2:return stepActiveMatch(r,s);
  case 3:return stepMatchCutscene(r,s);
  case 6:return stepRestartFrame(r,s);
  case 4:case 7:case 9:case 11:return initializeResultScene(r,s);
  case 5:case 8:case 10:case 12:return stepResultScene(r,s);
  default:throw new Error(`MissingTranslation: main0 substate ${r[0x59]&127}`);
 }
}

/** C57D..C612: entry sequence. AI remains one indivisible original-order service. */
export async function stepMatchOpening(r,s){
 await need(s,'updateDecisionPipeline_Bank03_8015',r);
 await need(s,'updateAllMatchActors_Bank06_BD6A',r);
 await need(s,'updateMatchDecorations_Bank06_BECC',r);
 await need(s,'updateStatusBanner_F3A5',r);
 need(s,'updateSpriteVisibility',r);advancePaletteFade(r,rr=>need(s,'updatePalette',rr));
 if(!(r[0x5b2]&128))return;
 if((r[0x5fa]&128)&&![2,3,6].includes(r[0x5f8]))r[0x5fa]=r[0x5f7]=0;
 if(r[0x5c]&1)updateKickoffControls_B850(r);else updateOrdinaryHumanControls(r);
 if(r[0x5c]&32){if(!(r[0x492]&192)){r[0x5e2]++;if(!(r[0x5e2]&128))return;}r[0x5c]&=223;r[0x55b]=r[0x5e2]=0;}
 else if(r[0x492]&64)return;
 r[0x59]++;r[0x5c]=r[0x52a]=r[0x52b]=0;
 r[0x1c]=r[0x52c]&12;r[0x5ad]=(r[0x1c]|((r[0x52d]&12)>>>2))+41;
 need(s,'updatePalette',r);r[0x692]=0;r[0x6d9]=63;r[0x5fa]=255;r[0x5f8]=134;r[0x5f9]=0;
 for(let x=0;x<32;x++)r[0x696+x]=r[0x6b9+x]=(x>=6&&x<11)?250:15;
}
/** D-26: the native camera moves <=8 px/frame, so DED3 queues at most one tile column.
 * When the special-move camera stepped 16 px (never in ordinary play), queue and commit
 * the intermediate column first, then the native one; every column stays native data. */
function scrollFollowingSpecial(r,s){
 const old=r[0xec]|r[0xed]<<8,next=r[0xf0]|r[0xf1]<<8,d=((next-old)&65535)<<16>>16;
 if(Math.abs(d)>8&&s?.commitFieldScrollNow){const mid=(old+Math.sign(d)*8)&65535;r[0xf0]=mid&255;r[0xf1]=mid>>8;if(updateFieldScroll_DED3(r))s.commitFieldScrollNow(r);r[0xec]=mid&255;r[0xed]=mid>>8;r[0xf0]=next&255;r[0xf1]=next>>8;}
 return updateFieldScroll_DED3(r);
}
/** C615..C698: each named dependency occupies its original position. */
export async function stepActiveMatch(r,s){
 const hud=rr=>updateFrameHud_DE47(rr,{updateFieldScroll_DED3:q=>scrollFollowingSpecial(q,s)});
 if(updatePauseBranch(r,{requestSound:s.requestSound,updateFixedDe47:hud,updateFixedCaee:copyCamera_CAEE,pausedInputSequence:rr=>need(s,'pausedInputSequence_CB5F',rr)})==='paused')return;
 updateFieldPatternPages(r);updateMatchClock_D6E7(r,s);hud(r);copyCamera_CAEE(r);
 await need(s,'updateWeatherActors_Bank01_B9C0',r);if(r[0x5c]&1)updateKickoffControls_B850(r);else updateOrdinaryHumanControls(r);
 await need(s,'updateDecisionPipeline_Bank03_8015',r);
 await need(s,'updateAllMatchActors_Bank06_BD6A',r);
 await need(s,'applyWind_Bank04_800F',r);
 await need(s,'updateCamera_Bank03_BCF1',r);
 routeMatchScript_C89C(r,s);await need(s,'updateMatchDecorations_Bank06_BECC',r);
 need(s,'updateSpriteVisibility',r);await need(s,'updateFrameTail_Bank03_BF23',r);
 advancePaletteFade(r,rr=>need(s,'updatePalette',rr));
}

/** C91A..CA1E state router, including roster-position low-nibble persistence. */
export function routeAfterMatchFade_C91A(r){
 for(const a of [0x5f8,0x5fd,0x5ff,0x600,0x601,0x602])r[a]=0;r[0x5f5]=r[0x5fa]=255;let save=false;
 switch(r[0x59]){
 case 3:
  if(r[0x57]&32){r[0x5cc]++;r[0x59]=r[0x5c]&2?4:0;}
  else if(r[0x5c]&32)r[0x59]=0;
  else if(r[0x5c]&15)r[0x59]=4;
  else r[0x59]=!r[0x559]?7:(r[0x52e]===r[0x52f]&&!storyNoExtraTime()/* D-50: story only */)?11:9;
  break;
 case 5:r[0x59]=0;break;
 case 8:r[0x58]=2;r[0x59]=4;r[0x559]++;save=true;notifyStoryHalfTime(r)/* D-50: story only, no-op otherwise */;break;
 case 10:save=routeCompletedMatch(leagueStateView(r))==='league-results';break;
 case 12:r[0x57]|=32;r[0x59]=0;break;
 }
 if(save&&(r[0x57]&128))for(let x=0;x<12;x+=2)r[0x5d5+r[0x532+x]]=r[0x650+x]&15;
}
/** C699..C71B, goal/end-of-period cutscene frame. */
export async function stepMatchCutscene(r,s){
 r[0x5ab]&=207;updateFieldPatternPages(r);updateFrameHud_DE47(r,{updateFieldScroll_DED3});copyCamera_CAEE(r);
 if(r[0x5c]&1)updateKickoffControls_B850(r);else updateOrdinaryHumanControls(r);
 await need(s,'updateWeatherActors_Bank01_B9C0',r);await need(s,'updateDecisionPipeline_Bank03_8015',r);await need(s,'updateAllMatchActors_Bank06_BD6A',r);
 await need(s,'applyWind_Bank04_800F',r);await need(s,'updateCamera_Bank03_BCF1',r);need(s,'updateStatusBanner_F3A5',r);need(s,'updateSpriteVisibility',r);need(s,'updateFrameTail_Bank03_BF23',r);
 if(r[0x5e2]>=32&&(r[0x5c]&2))r[0x3ad]=(r[0x4d6]&15)|64;
 const timer=r[0x5e2];if((timer<64&&(r[8]&48))||(timer>=64&&timer!==255)){beginPaletteFade(r,'out');need(s,'requestSound',0);r[0x5e2]=255;r[0x466]=0;}else if(timer<64)r[0x5e2]++;
 advancePaletteFade(r,rr=>need(s,'updatePalette',rr));if((r[0x5b2]&192)===192){routeAfterMatchFade_C91A(r);r[0x5c]=r[0x5e2]=0;}
}
/** C7D0..C808: stoppage time is accrued at its original later position. */
export async function stepRestartFrame(r,s){
 updateFieldPatternPages(r);updateFrameHud_DE47(r,{updateFieldScroll_DED3});copyCamera_CAEE(r);
 if(r[0x5c]&1)updateKickoffControls_B850(r);else updateOrdinaryHumanControls(r);
 await need(s,'updateWeatherActors_Bank01_B9C0',r);await need(s,'updateDecisionPipeline_Bank03_8015',r);updateMatchClock_D6E7(r,s);
 await need(s,'updateAllMatchActors_Bank06_BD6A',r);await need(s,'applyWind_Bank04_800F',r);updateRestartCamera_C80B(r);await need(s,'updateCamera_Bank03_BCF1',r);
 need(s,'updateMatchDecorations_Bank06_BECC',r);need(s,'updateSpriteVisibility',r);if(!r[0x5c]){r[0x59]=2;r[0x3ad]&=127;}
}

/** C71E/C743/C75D result-scene initialization through shared C735 tail. */
export async function initializeResultScene(r,s){
 const sub=r[0x59];await need(s,sub===9?'prepareVictoryActors_Bank02_B53D':'prepareScoreActors_Bank02_B429',r);
 r[0x56]=240;r[0x5bc]=100;r[0x5bd]=102;r[0xec]=r[0xee]=r[0xef]=r[0xf0]=r[0xf2]=r[0xf3]=0;r[0xed]=r[0xf1]=1;
 // CA1F ECA9 waits for native NMI before EE71/ECC1 disable output.
 await need(s,'waitRenderingDisabled_ECA9');r[0x4c]&=127;r[0x4d]&=231;classifyResultPresentation_CA58(r);await need(s,'loadScoreScreen_Bank01_B8A1',r);
 r[0x4d]|=24;r[0x4c]|=128;need(s,'setRenderMask',r[0x4d]);need(s,'requestSound',sub===4?12:9);
 r[0x5e2]=0;beginPaletteFade(r,'in');r[0x59]++;
}
/** C777/C77D..C7CD: independent score/victory actor routes share timing. */
export async function stepResultScene(r,s){
 if(r[0x59]===10)await need(s,'updateVictoryActors_Bank02_B6CE',r);
 else{copyCamera_CAEE(r);await need(s,'updateScoreActors_Bank06_BE42',r);await need(s,'updateCamera_Bank03_BCF1',r);}
 need(s,'updateSpriteVisibility',r);advancePaletteFade(r,rr=>need(s,'updatePalette',rr));if(!(r[0x5b2]&128))return;
 if(r[0x5b2]&64){routeAfterMatchFade_C91A(r);return;}
 if(!r[0x5e2])r[0x5e8]=r[0x5ec];r[0x5e2]++;
 if((r[8]&48)||(r[0x59]!==5&&(r[8]&192))||r[0x5e2]>=240){beginPaletteFade(r,'out');r[0x5e8]=0;need(s,'requestSound',0);}
}

/** C506→C4DB: demo timeout unwinds directly to C4C3, without another match call. */
export async function advanceMatchDemo_C4DB(r,s){
 let target=8;
 if(!(r[8]&48)){target=5;r[0x589]--;if(r[0x589])return false;r[0x58a]--;if(r[0x58a])return false;}
 r[0x2b]=target;beginPaletteFade(r,'out');await waitForPaletteFade(r,rr=>need(s,'updatePalette',rr),()=>need(s,'nextFrame'));
 r[0x59]=r[0x2b];r[0x4f]=128;r[0x58]=1;return true;
}
