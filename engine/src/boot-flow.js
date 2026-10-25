/** Semantic JS conversion of source bank_02 AA6B-B08A. Data and addresses
 * identify source routines only; this module never executes ROM or opcodes. */
import {beginPaletteFade,advancePaletteFade,waitForPaletteFade} from './state-dispatch.js';
import {submitObjectForDisplay} from './object-display-list.js';
import {advanceRandom} from './mood-league.js';
import {leagueStateView,resetMatchSetup,prepareMatchEnvironment} from './league-flow.js';
import {configureRosterMemory,loadAttributeMemory} from './platform/state-views.js';
import {acceptPlayerActionFromState,updatePlayerActionFlags,acceptBallMovementRequest,updateBallPossessionFlags,updateOrdinaryHumanControls} from './controls-actions.js';
import {updateRecoveredPlayerAction} from './player-actions.js';
import {updateBallAction} from './ball-runtime.js';
const need=(s,n,...a)=>{if(typeof s[n]!=='function')throw new Error(`MissingTranslation: boot ${n}`);return s[n](...a);};
const random=r=>{const out=advanceRandom(leagueStateView(r));r[0x0c]=out.scratch0c;return out.value;};
const LOGO_FRAMES=[128,12,129,6,130,6,131,6,132,6,134,6,133,1,133,1,134,96];
const TITLE_FRAMES=[0,6,0,48,3,24,0,48,255,3,255,16,255,32,255,32,255,32,0,16,255,4,255,8,0,32,2,255];
const LOGO_PALETTES=[69,70,71,72,71,70,69,68];
const LOGO_ATTRIBUTES=[2,0,0,0,11,0,0,0,15,2,0,0,14,11,0,0,8,15,2,0,0,14,11,0,0,8,15,2,0,0,14,11,0,0,8,15,0,0,0,14,0,0,0,8,0,0,0,0];
export const BOOT_TEXT_COORDINATES=Object.freeze({prompt:{screenId:1,address:0x22c6,x:48,y:176,width:144,height:8,accentAddress:0x22ad},title:{screenId:14},logo:{screenId:0}});
export async function waitBootEightFrames(s){for(let i=0;i<8;i++)await need(s,'nextFrame');}
/** AE49: zero-page61..F8, then 601..68E and 300..5FF (600 remains intact). */
export function clearBootActors(r){r.fill(0,0x61,0xf9);r[0x5c]=0;r[0x2c]=0;r[0x2d]=6;r.fill(0,0x601,0x68f);r.fill(0,0x300,0x600);r[0x2d]=2;}
function visible(r,s){need(s,'updateSpriteVisibility',r);}
function submit(r,s){submitObjectForDisplay(r,12);visible(r,s);}
function fade(r,s){return advancePaletteFade(r,rr=>need(s,'updatePalette',rr));}
async function fadeOut(r,s){beginPaletteFade(r,'out');r[0x5b3]=4;await waitForPaletteFade(r,rr=>need(s,'updatePalette',rr),()=>need(s,'nextFrame'));}
/** AE65: ending bypasses all fades/waits. */
export async function finishBootScene(r,s){if(r[0x58]!==3){await fadeOut(r,s);await waitBootEightFrames(s);}r[0x59]++;}
export function bootTimeout(r){r[0x1c]=0;if(r[8]&48)r[0x1c]=128;else{r[0x589]--;if(!r[0x589]){r[0x58a]--;if(!r[0x58a])r[0x1c]=64;}}return r[0x1c];}
/** AE01 animation: completion still submits the last logo frame. */
export async function animateBootLogo(r,s){r[0x93]--;if(!r[0x93]){r[0xa0]++;if(r[0xa0]>=9)await finishBootScene(r,s);else{const i=r[0xa0]*2;r[0x80]=LOGO_FRAMES[i];r[0x93]=LOGO_FRAMES[i+1];}}submit(r,s);}
/** AA95 shared with ending main3/sub8. */
export async function initializeBootLogo(r,s){need(s,'loadScreen',0,r);r[0x4d]|=2;need(s,'setRenderMask',r[0x4d]);r[0x6d]=8;r[0x93]++;r[0xa0]--;await animateBootLogo(r,s);r[0x320]=144;r[0x359]=86;r.set([29,31,33],0x5ae);r[0x5b8]=112;r[0x5b9]=113;need(s,'configureChrBanks',r);beginPaletteFade(r,'in');r[0x5b3]=4;r[0x59]++;}
/** AAD9..AB3F. Attribute columns update twice each, using pre-increment95. */
export async function stepBootLogo(r,s){await animateBootLogo(r,s);if(!(r[0x5b2]&128))fade(r,s);if(r[0xa0]<2)return;if(r[0x96]<8){r[0x5ac]=LOGO_PALETTES[r[0x96]++];need(s,'updatePalette',r);r[0x6d9]=63;}const old=r[0x95]++;if(old<23){r.set(LOGO_ATTRIBUTES.slice((old&254)*2,(old&254)*2+4),0x696);r[0x695]=4;r[0x694]=219;r[0x693]=35;}if(r[0xa0]===7){r[0x5ac]=60;r[0x5ae]++;r[0x5af]++;r[0x5b0]++;r[0x5b4]=64;r[0x5b3]=1;need(s,'updatePalette',r);r[0x692]=0;r[0x6d9]=63;await need(s,'nextFrame');r[0x5b5]=0;await need(s,'nextFrame');r[0x5b5]++;r[0x51]=0;}}
/** B033 title sprite loop; negative markers are delay repetitions, not frames. */
export function animateBootTitle(r,s){r[0x93]--;if(!r[0x93]){let y=0,a;if(!(r[0x94]&128)){r[0x94]--;if(r[0x94]===0){r[0x94]--;y=2;a=128;}else a=r[0x80]^1;}else{r[0xa0]++;y=(r[0xa0]*2)&255;if(y+1>=TITLE_FRAMES.length)throw new RangeError('Original title animation outside table');a=TITLE_FRAMES[y];if(a&128){r[0x94]=TITLE_FRAMES[y+1];y=0;a=r[0x80]^1;}}r[0x80]=a|128;r[0x93]=TITLE_FRAMES[y+1];}submit(r,s);}
export function initializeBootDemoActor(r,x){for(const a of [0x4b0,0x479,0x327])r[a+x]=255;r[0x485]=r[0x50e]=255;for(const a of [0x486,0x4a3,0x61])r[a+x]=0;r[0x4d6]=0;r[0x34d+x]=164;r[0x314+x]=192;if(x===0){let n=0;if(r[0x59]<8)n=r[0x9e]=random(r)&3;r[0x459+x]=[33,33,33,42][n];}else{r[0x61+x]++;r[0x459+x]=1;r[0x327+x]++;r[0x314+x]=128;}}
function suppressDemoInput(r){r[8]&=48;r[4]=r[8];}
function inject(r,bits){r[0x1c]=bits;r[8]|=bits;r[4]=r[8];}
export function writeBootPrompt(r){r[0x1c]=(r[0x300]&4)?0:218;const chars=[227,0,174,177,217,181,0,191,177,207,206,0,166,173,180,185,0,227];for(let i=0;i<18;i++)r[0x696+i]=(r[0x300]&4)?0:chars[i];r[0x6b9]=r[0x1c];r[0x695]=18;r[0x6b8]=1;r[0x694]=198;r[0x6b7]=173;r[0x6b6]=r[0x693]=34;}
/** ACF8..AD90 interactive title ball demo. */
export function stepBootInteractiveDemo(r){r[0x589]=128;switch(r[0x95]){case 0:suppressDemoInput(r);if(!r[0x327]&&r[0x314]>=32)r[0x95]++;return;case 1:if(r[8])r[0x95]++;else if(r[0x314]>=112){r[0x459]=1;r[0x95]++;}return;case 2:if(r[0x314]>=224||r[0x314]<32){r[0x314]=r[0x314]>=224?224:32;if((r[0x459]&127)===33)r[0x459]=1;}if(r[0x492]&64)return;{let speed=2;const hi=r[0x333];if(hi===0){if(r[0x320]>=8)return;}else if(!(hi&128))speed=254;r[0x456]=r[0x3f4]=0;r[0x402]=speed;r[0x43a]=2;r[0x448]=128;r[0x465]=6;}return;default:throw new RangeError('Original interactive demo state');}}
/** AEF7..B032 four source-authored skits, including original RNG calls. */
export function stepBootScriptedDemo(r){r[8]&=48;const scene=r[0x9e],p=r[0x95];if(scene<2){switch(p){case 0:if(!r[0x327]&&r[0x314]>=130){r[0x459]=1;r[0x95]++;}return;case 1:r[0x459]=14;r[0x95]++;return;case 2:random(r);if(r[0x392]<64)return;if(r[0x97]>=8)r[0x95]++;{let i=(random(r)&3)*2;if(r[0x97]===0)i+=2;r[0x96]=[64,0,24,128,24,0,24,0,24,0][i];r[0x4a3]=[64,0,24,128,24,0,24,0,24,0][i+1];r[0x97]++;if(r[0x97])r[0x95]++;}return;case 3:if(r[0x392]<r[0x96]){inject(r,128);r[0x95]=2;}return;case 4:if(r[0x392]<r[0x96]){inject(r,64);r[0x95]++;}return;case 5:if(r[0x333]){r[0x459]=33;r[0x95]++;}return;case 6:return;default:throw new RangeError('Original juggling demo state');}}if(scene===2){switch(p){case 0:if(!r[0x327]&&r[0x314]>=80){inject(r,192);r[0x95]++;}return;case 1:if(r[0x459]===129){r[0x459]=33;r[0x95]++;}return;case 2:if(r[0x97]>=2)r[0x95]=4;else if(r[0x314]>=224){r[0x4a3]=128;r[0x97]++;if(r[0x97])r[0x95]++;}return;case 3:if(r[0x314]<32){r[0x4a3]=0;r[0x95]=2;}return;case 4:return;default:throw new RangeError('Original running demo state');}}if(scene===3){switch(p){case 0:r[4]=1;if(r[0x320]>=240){r[0x43a]=2;r[0x402]=254;r[0x95]++;}return;case 1:r[4]=1;if(r[0x327]&&r[0x314]>=96){r[0x4a3]=128;r[0x95]++;}return;case 2:r[4]=2;return;default:throw new RangeError('Original chase demo state');}}throw new RangeError('Original demo scene');}
export async function stepBootState(r,s){if(r[0x58]!==1)throw new RangeError('Not boot main state');switch(r[0x59]&127){
case 0:r[0x4f]=128;clearBootActors(r);await waitBootEightFrames(s);await waitBootEightFrames(s);return initializeBootLogo(r,s);
case 1:return stepBootLogo(r,s);
case 2:await waitBootEightFrames(s);clearBootActors(r);need(s,'loadScreen',14,r);r[0x5b8]=89;need(s,'configureChrBanks',r);r[0x6d]=9;r[0x93]++;r[0x94]--;r[0x320]=192;r[0x359]=206;r.set([39,40,41,42],0x5ae);animateBootTitle(r,s);need(s,'requestSound',1);beginPaletteFade(r,'in');r[0x5b3]=4;r[0x589]=144;r[0x58a]=6;r[0x59]=11;return;
case 11:animateBootTitle(r,s);fade(r,s);if(r[0x5b2]&128)r[0x59]=3;return;
case 3:animateBootTitle(r,s);{const exit=bootTimeout(r);if(exit&128){await finishBootScene(r,s);r[0x59]=8;}else if(exit&64){await fadeOut(r,s);r[0x59]++;}}return;
case 4:r[0x57]=1;r[0x58]=r[0x59]=r[0x589]=0;r[0x58a]=3;r[0x58b]=r[0x52c]=128;r[0x52d]=(random(r)&15)|129;for(let x=0;x<12;x+=2)r[0x532+x]=r[0x533+x]=x/2;resetMatchSetup(r);prepareMatchEnvironment(r);configureRosterMemory(r);loadAttributeMemory(r);r[0x4f]=192;return;
case 5:case 8:await waitBootEightFrames(s);clearBootActors(r);r[0x300]=0;r[0x58a]=2;r[0x58b]=r[0x59]===5?64:128;need(s,'loadScreen',1,r);r.set([8,31,32,9],0x5b8);need(s,'configureChrBanks',r);r[0x5ae]=r[0x5af]=1;r[0x5e6]=3;for(const a of [0x569,0x56a,0x56b,0x67a])r[a]--;initializeBootDemoActor(r,0);initializeBootDemoActor(r,12);r[0x4d]|=2;need(s,'setRenderMask',r[0x4d]);visible(r,s);beginPaletteFade(r,'in');r[0x59]++;return;
case 6:case 9:suppressDemoInput(r);updateBootDemoActors(r,s);visible(r,s);fade(r,s);if(r[0x5b2]&128)r[0x59]++;return;
case 7:case 10:writeBootPrompt(r);if(r[0x59]<8)stepBootScriptedDemo(r);else stepBootInteractiveDemo(r);updateOrdinaryHumanControls(r);updateBootDemoActors(r,s);visible(r,s);{const exit=bootTimeout(r);if(!exit)return;if(exit&128){r[0x58b]=0;need(s,'requestSound',51);r[0x58]=2;r[0x59]=0;}else r[0x59]=4;await fadeOut(r,s);await waitBootEightFrames(s);}return;
default:throw new RangeError('Original boot substate');}}

/** 06:BDDF-BDFB exact reduced actor pass (no match collision/weather pipeline). */
export function updateBootDemoActors(r,s){const events=[];acceptPlayerActionFromState(r,0);events.push(...updateRecoveredPlayerAction(r,0));submitObjectForDisplay(r,0);updatePlayerActionFlags(r,0);acceptBallMovementRequest(r);events.push(...updateBallAction(r,12).events);updateBallPossessionFlags(r);submitObjectForDisplay(r,12);for(const e of events)if(e.type==='sound')need(s,'requestSound',e.soundId??e.value);return {events};}
export const BOOT_SOURCE_TABLES=Object.freeze({logoFrames:{address:0xae29,bytes:LOGO_FRAMES},titleFrames:{address:0xb06f,bytes:TITLE_FRAMES},logoPalettes:{address:0xab40,bytes:LOGO_PALETTES},logoAttributes:{address:0xab48,bytes:LOGO_ATTRIBUTES}});
