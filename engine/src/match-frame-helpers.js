import {noteTsubasaMisugiClockFrame} from './tsubasa-misugi-heart.js';
import {tsubasaSpecialCameraStep} from './tsubasa-special-moves.js';
import {releaseCarriedBall} from './player-actions.js';
/** Fixed-bank semantic helpers. Addresses are provenance, never executable pointers. */
import {advanceRandom} from './mood-league.js';
import {updatePaletteForFade} from './sprite-palette-buffer.js';
import {submitObjectForDisplay} from './object-display-list.js';
const w=(r,l,h=l+1)=>r[l]|r[h]<<8;
const put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
const need=(s,n,r)=>{if(!s[n])throw new Error(`MissingTranslation: ${n}`);return s[n](r);};
export function copyCamera_CAEE(r){r.copyWithin(0xec,0xf0,0xf4);}
// D7A4..D7F2: stoppage accrual is 40 ticks/second, capped at1:59.
export function accrueStoppageTime(r){
 r[0x5c2]++;if(r[0x5c2]<40)return;r[0x5c3]++;
 if(r[0x5c3]>=10){r[0x5c4]++;if(r[0x5c4]>=6){r[0x5c5]++;if(r[0x5c5]>=2){r[0x5c5]=1;r[0x5c4]=5;r[0x5c3]=9;r[0x5c2]=0;return;}r[0x5c4]=0;}r[0x5c3]=0;}r[0x5c2]=0;
}
function countdown(r,b){r[b+1]--;if(r[b+1]&128){r[b+2]--;if(r[b+2]&128){r[b+3]--;if(r[b+3]&128)r[b+3]=9;r[b+2]=5;}r[b+1]=9;}r[b]=19;}
export function updateMatchClock_D6E7(r,s={}){
 if(!(r[0x57]&32)&&(r[0x59]===6||(r[0x4d6]>=10&&(r[0x492]&64)&&!(r[0x67c+r[0x4d6]]&128))))accrueStoppageTime(r);
 if(r[0x5c1]|r[0x5c0]|r[0x5bf]){r[0x5be]--;noteTsubasaMisugiClockFrame(r);/* M-10: no-op unless specials on + 三杉 for 武藏 */if(!(r[0x5be]&128))return;
  const state={rng45:r[0x45],rng46:r[0x46]},out=advanceRandom(state);r[0x45]=state.rng45;r[0x46]=state.rng46;r[0xc]=out.scratch0c;
  if((out.value&160)===160)need(s,'updateSecondEvent_Bank03_BAF9',r);countdown(r,0x5be);return;
 }
 if(r[0x5c5]|r[0x5c4]|r[0x5c3]){r[0x5c2]--;if(r[0x5c2]&128)countdown(r,0x5c2);return;}
 if((r[0x466]&127)===1)r[0x13f]=80;else r[0x466]=0;
 if(r[0x59]!==6){r[0x5c]=64;need(s,'requestSound',0x31);}
}
// C89C..C919: game-script outcome transition, including the original equal-score winner flag.
export function routeMatchScript_C89C(r,s={}){
 if(!(r[0x5c]&64))return;let status;
 if(r[0x5c]&32)status=0x84;
 else if(r[0x5c]&15){if(r[0x5c]&2)status=0x81;else{if(r[0x57]&32)r[0x59]=3;else{r[0x59]=6;need(s,'prepareRestart_Bank01_BE88',r);}return;}}
 else{r[0x3ad]=0x8c;r[0x1c]=0;r[0x52a]=r[0x52b]=0;if(r[0x52f]===r[0x52e])r[0x1c]++;r[0x52a+(r[0x52f]>=r[0x52e]?1:0)]=1;if(r[0x559])status=0x82+r[0x1c];}
 if(status!==undefined){r[0x5f8]=status;r[0x5f9]=0;r[0x5ad]=15;updatePaletteForFade(r);r[0x6d9]=63;}
 r[0x59]=3;r[0x5e2]=0;
}
// CBD6..CD1E. ASL of the original action preserves carry=initialization bit into CC52 SBC.
export function updateMatchIndicator_CBD6(r,x){
 const raw=r[0x459+x],action=raw&127;if(action>5)throw new RangeError('Unrecovered indicator action');
 const ptr=action===0?0xcbf4:action===1?0xcbf5:0xcc0b;put(r,0x2c,0x2d,ptr);if(!action)return;
 r[0x459+x]=raw|128;let y=12,c=raw>>>7;
 if(action===1){r[0x74+x]=132;r[0x44]=12;}
 else{r[0x74+x]=126+action;y=r[0x568+action-2];if(y<128){r[0x44]=y;if((r[0x650+y]&128)||((r[0x57]&32)&&!r[0xd9+y])){r[0x74+x]=127;r[0x44]=0;}}else{r[0x74+x]=127;r[0x44]=0;}y=r[0x44];
  r[0x314+x]=r[0x314+y];r[0x327+x]=r[0x327+y];let d=r[0x314+y]-r[0xf0]-(1-c);r[0x1c]=d&255;c=d>=0?1:0;d=r[0x327+y]-r[0xf1]-(1-c);
  if((d&255)===0&&r[0x1c]>=8){r[0x34d+x]=r[0x34d+y];r[0x360+x]=r[0x360+y];d=r[0x34d+y]-r[0xf2];r[0x1c]=d&255;d=r[0x360+y]-r[0xf3]-(d<0?1:0);
   if((d&255)===0&&r[0x1c]>=24&&r[0x1c]<224){put(r,0x386+x,0x399+x,w(r,0x386+y,0x399+y)+32);return;}}
 }
 if(r[0x59]===1){r[0x74+x]=127;return;}
 put(r,0x2c,0x2d,w(r,0x314+y,0x327+y)>>>4);put(r,0x2e,0x2f,w(r,0x34d+y,0x360+y)>>>4);
 put(r,0x314+x,0x327+x,w(r,0xf0)+96+w(r,0x2c));put(r,0x34d+x,0x360+x,w(r,0xf2)+205+w(r,0x2e));r[0x386+x]=r[0x399+x]=0;
}
export function updateMatchDecorations_Bank06_BECC(r){if(r[0x5c]&2)return;for(let x=r[0x59]===1?15:14;x<19;x++){updateMatchIndicator_CBD6(r,x);submitObjectForDisplay(r,x);}}
// DE47..DED2: original six HUD glyphs, followed by separately recovered scroll writer.
export function updateFrameHud_DE47(r,s={}){
 if(r[0x59]===2||r[0x59]===6){r[0x5aa]=[92,93,94,95,108,109,110,111][r[0x5fe]>>>5];if(r[0x5fd])r[0x5a9]=r[0x5fd]+143;else r[0x5a9]=r[0x5aa]=15;
  if(!(r[0x5c1]|r[0x5c0]|r[0x5bf])&&(r[0x5c2]|r[0x5c3]|r[0x5c4]|r[0x5c5])){r[0x5a8]=77;r[0x5a7]=128;r[0x5a6]=78;r[0x5a5]=78;}
  else{r[0x5a8]=r[0x5c1]+128;r[0x5a7]=79;r[0x5a6]=r[0x5c0]+128;r[0x5a5]=r[0x5bf]+128;}
 }
 return need(s,'updateFieldScroll_DED3',r);
}
// F3A5..F3F6: status-banner attribute sweep and hold counter.
export function updateStatusBanner_F3A5(r){
 if(r[0x5fa]&128)return;
 if(r[0x5fa]!==7){r[0x6b9]=170;r[0x6ba]=255;r[0x6b8]=2;r[0x6b7]=r[0x5fa]+240;r[0x691]=0;r[0x6b6]=43;r[0x5fa]++;return;}
 if(!(r[0x300]&1))r[0x5f7]++;if(r[0x5f7]!==255)return;r[0x5f7]=254;if(r[0x5fa]===7)r[0x5fa]=0;
}
export function writeScoreHud_CB07(r){
 const a=r[0x52e],b=r[0x52f];r[0x5aa]=(a>>>4)?(a>>>4)+128:255;r[0x5a9]=(a&15)+128;r[0x5a8]=238;r[0x5a7]=239;
 if(b&240){r[0x5a6]=(b>>>4)+128;r[0x5a5]=(b&15)+128;}else{r[0x5a6]=(b&15)+128;r[0x5a5]=255;}
}
const PAUSE_SEQUENCE=[128,128,128,64,128,128,128,64,128,128,128,128,128,128,128];
// CB5F..CBD5 + C647..C698. Fifteen exact edge bytes, not held-key matching.
export function pausedInputSequence_CB5F(r,s={}){
 if(r[0x57]&128){const i=r[0x6fd];if(i===15){r.set([159,128,179,172,208,188],0x5a5);for(let x=0;x<6;x++)r[0x4f1+x*2]=255;return;}
  if(i>=15)throw new RangeError('Invalid original pause sequence index');
  if(r[8]===PAUSE_SEQUENCE[i]){r[0x6fd]++;if(r[0x6fd]===15)need(s,'requestSound',56);}else if(r[8])r[0x6fd]=0;
 }
 if(r[0x300]&1)r.fill(15,0x5a5,0x5ab);else writeScoreHud_CB07(r);
}
// 04:B850..B8AA. A/B/Start route retains controller X, while angle path reloads owner X.
// Both vertical held bits set index3, reading the next byte B8AB=$86 in the original.
export function updateKickoffControls_B850(r){
 const owner=r[0x4d6];let controller=-1;
 if(!(r[0x650]&r[0x651]&128))for(let x=0;x<4;x++)if(r[0x568+x]===owner){controller=x;break;}
 if(controller<0){if(r[0x300]&31)return;r[0x67e+owner]=owner|18;r[0x479+owner]=10;return;}
 const press=r[8+controller];if(press&128){r[0x479+controller]=10;return;}if(press&64){r[0x479+controller]=9;return;}
 if(r[8]&48){r[0x479+controller]=10;return;}r[0x4b0+owner]=[0,128,0,134][(r[4+controller]>>>2)&3];
}
// 03:BCF1..BED3, preserve byte-conditional clamps even outside nominal coordinates.
export function updateCamera_Bank03_BCF1(r){
 const y=r[0x3ad]&15;
 const smooth=(difference,L=8)=>{const d=difference&65535,hi=d>>>8,lo=d&255;return hi&128?(hi!==255?-L:Math.max(-L,((lo|0xff00)<<16>>16)>>3)):(hi>=1?L:Math.min(L,lo>>>3));};
 if(!(r[0x3ad]&128)){
  let target=(w(r,0x314+y,0x327+y)-128)&65535;
  if(r[0x3ad]&64)r[0x5f6]=0;else{if(r[0x4d6]&1){if(r[0x5f6]!==208)r[0x5f6]-=8;}else if(r[0x5f6]!==48)r[0x5f6]+=8;target=(target+(r[0x5f6]&128?r[0x5f6]-256:r[0x5f6]))&65535;}
  const step=smooth(w(r,0xec)-target,tsubasaSpecialCameraStep(r));put(r,0x1c,0x1d,step);put(r,0xf0,0xf1,w(r,0xec)-step);
 }
 const step=smooth(w(r,0xee)-(w(r,0x34d+y,0x360+y)-128));put(r,0x1c,0x1d,step);put(r,0xf2,0xf3,w(r,0xee)-step);
 if(r[0x59]===5||r[0x59]>=8){if(r[0xf1]===0){if(r[0xf0]<48)put(r,0xf0,0xf1,48);}else if(r[0xf0]>=208)put(r,0xf0,0xf1,464);r[0xf2]=r[0xf3]=0;return;}
 if(r[0xf1]<1&&r[0xf0]<64)put(r,0xf0,0xf1,64);if(r[0xf1]>=2&&r[0xf0]>=192)put(r,0xf0,0xf1,704);
 if(r[0xf3]&128)r[0xf2]=r[0xf3]=0;if(r[0xf3]>=1||r[0xf2]>=175)put(r,0xf2,0xf3,175);
}
// 03:BF23..BFDB: alternate-frame sprite priority reversal in crowded scenes.
export function updateFrameTail_Bank03_BF23(r){
 if(r[0x300]&1)return;
 const n=r[0xf4];if(n>32)throw new RangeError('Original display list overflow');
 let count=0;for(let x=(n-1)&255;;x=(x-1)&255){if(r[(0xa1+x)&255]<12)count++;if(((x-1)&255)&128)break;}
 if(count>=8){for(let x=n-1,y=0;x>=0;x--,y++)r[0x1c+y]=r[0xa1+x];for(let x=n-1,y=n-1;x>=0;x--,y--)r[0xa1+x]=r[0x1c+y];return;}
 put(r,0x1f,0x20,w(r,0x359,0x36c)-w(r,0x392,0x3a5));count=0;
 for(let x=12;x>=0;x--){if(!(r[0xd9+x]&1))continue;const d=(w(r,0x34d+x,0x360+x)-w(r,0x1f))&65535;r[0x1c]=d&255;if((d>>>8)===0&&(d&255)<24){r[0x2c+count++]=x;if(count===6)break;}}
 if(count<4)return;r[0x1c]=count;r[0x1d]=0;
 for(let x=(n-1)&255;;x=(x-1)&255){const entry=r[0xa1+x];for(let y=r[0x1c]-1;y>=0;y--)if(entry===r[0x2c+y]){r[0x44]=y;const i=r[0x1d];r[0x32+i]=entry;r[0x38+i]=x;r[0x1d]++;}if(((x-1)&255)&128)break;}
 r[0x1c]=0;for(let x=(r[0x1d]-1)&255;;x=(x-1)&255){r[0xa1+r[(0x38+x)&255]]=r[0x32+r[0x1c]];r[0x1c]++;if(((x-1)&255)&128)break;}
}

const RESTART_PLAYERS=[6,2,8,4,2,6,4,8,10,2,10,4,2,10,4,10];
const RESTART_POSITIONS=[184,0,144,0,155,0,48,0,167,0,240,0,118,0,88,1,101,3,48,0,80,3,144,0,138,3,88,1,88,3,240,0];
// 01:BE88..BF7D, caller C258. Release old carrier, select opposite-side restart taker.
export function prepareRestart_Bank01_BE88(r){
 r[0x65a]|=128;r[0x65b]|=128;r[0x1c]=(r[0x5c]>>>1)&4;if(r[0x333]>=2)r[0x1c]|=2;if(r[0x36c]||r[0x359]>=192)r[0x1c]++;
 releaseCarriedBall(r,r[0x4d6]);r[0x68b]=r[0x4d6];r[0x4d6]=(r[0x4d6]&1)^1;const index=(r[0x1c]<<1)|r[0x4d6];r[0x4d6]=RESTART_PLAYERS[index]|r[0x4d6];
 if(!(r[0x5c]&4)){r[0x1c]=(r[0x1c]<<1)|(r[0x4d6]&1);r.set(RESTART_POSITIONS.slice((r[0x1c]&7)*4,(r[0x1c]&7)*4+4),0x517);}
 else{put(r,0x519,0x51a,r[0x51a]?344:48);if(r[0x518]===0)put(r,0x517,0x518,w(r,0x517)+16);else if(r[0x518]===3)put(r,0x517,0x518,w(r,0x517)-16);}
 r[0x492]=r[0x68a]=0;r[0x3ad]=140;r[0x5fd]=0;if((r[0x466]&127)===1)r[0x13f]=96;else r[0x466]=0;
}
// C80B..C87A: restart camera unlock/return into the field viewport.
export function updateRestartCamera_C80B(r){
 if(!r[0xe5])r[0x402]=r[0x3f4]=r[0x41e]=r[0x410]=0;
 if(r[0x5c]&4){r[0x3ad]&=127;return;}const x=w(r,0xf0);if(x<128)put(r,0xf0,0xf1,x+8);else if(x>=640)put(r,0xf0,0xf1,x-8);
}
// CA58..CAED: original signed-byte result-grade selection; BCD tens differ add4.
export function classifyResultPresentation_CA58(r){
 const a=r[0x52e],b=r[0x52f];r[0x1c]=a&240;
 if((b&240)===r[0x1c]){r[0x1c]=a;r[0x1d]=b;}else if((b&240)>r[0x1c]){r[0x1c]=a+4;r[0x1d]=b;}else{r[0x1c]=a;r[0x1d]=b+4;}
 let diff=(r[0x1c]-r[0x1d])&255;
 if(r[0x57]&128){if(r[0x52a]&1){r[0x630]=(diff&128)||!diff?0:diff===1?1:diff===2?129:128;}
  else r[0x630]=(diff&128)?130:diff===0?2:0;
 }else{if(diff&128)diff=(-diff)&255;r[0x630]=diff===0?0:diff===1?1:diff===2?129:128;}
 return r[0x630];
}
