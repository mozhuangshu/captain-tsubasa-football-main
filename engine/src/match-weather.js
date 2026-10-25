// Original weather event selection03:BAF9, actors01:B9C0 and wind04:B316.
import {integrateMotion} from './physics.js';
import {measureAIDistance} from './match-ai.js';
import {updatePaletteForFade} from './sprite-palette-buffer.js';
import {TEAM_PALETTE_PAIRS} from './sprite-appearance-data.js';
const word=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,n)=>{r[l]=n&255;r[h]=(n>>>8)&255;},signed=n=>n&32768?n-65536:n;
export function weatherRandom(r){r[0xc]=r[0x45]&2;const carry=((r[0x46]&2)^r[0xc])?128:0,low=r[0x45]&1;r[0x45]=(r[0x45]>>>1)|carry;r[0x46]=(r[0x46]>>>1)|(low<<7);return r[0x45];}
function sound(r,events,id){if((r[0x58b]&64)||((r[0x58b]&128)&&id<32))return;r[0x1b]=r[0x7ff]=id;events.push({type:'sound',soundId:id});}
export function updateWeatherDrift(r){r[0x1c]=r[0x5fd];r[0x1d]=(-r[0x5fd])&255;const d=r[0x5fe];r[0x140]=[32,64,96].includes(d)?r[0x1c]:r[0x1d];r[0x141]=d===64||d===192?0:d===96?r[0x1c]:r[0x1d];}
// Called only when D6E7's second-rollover random gate succeeds.
export function updateSecondWeatherEvent(r){
 const events=[];let effect=r[0x466]&127;if((r[0x5c]&64)||effect===1)return {events};
 if(effect===0||effect===4){if(r[0x494]&15){if(r[0x494]&4){if(weatherRandom(r)<160){r[0x466]=130;r[0x3ac]=12;}}else if(r[0x603]){r[0x1c]=Math.min(255,r[0x603]*2);if(weatherRandom(r)<r[0x1c]){r[0x466]=130;r[0x3ac]=(r[0x494]&15)*4;}}}}
 else if(effect===2){r[0x1c]=((r[0x494]&3)*4+243)&255;if(weatherRandom(r)>=r[0x1c]){r[0x466]=0;r[0x3ac]=12;}}
 let direction=false;
 if(r[0x494]<64){if(r[0x494]&48){r[0x1c]=(r[0x494]&48)>>>3;r[0x5fd]=((weatherRandom(r)&3)-2+r[0x1c])&255;direction=true;}}
 else if(!r[0x5fd]){if(weatherRandom(r)<192){r[0x5fd]=(weatherRandom(r)&3)+6;direction=true;}}
 else {if(weatherRandom(r)&128)r[0x5fd]=0;else r[0x5fd]=(weatherRandom(r)&3)+6;direction=true;}
 if(direction){const d=r[0x495]&3;r[0x5fe]=d===2||((d===1||d===3)&&(r[0x45]&128))?64:192;const q=weatherRandom(r);if(!(q&128)){r[0x1c]=r[0x5fe];r[0x1d]=(q&96)^r[0x5fe];r[0x5fe]=(r[0x1d]&96)||r[0x1c];}
  if((r[0x466]&127)!==2){if(r[0x5fd]){r[0x3ac]=(r[0x5fd]+5)&255;r[0x466]=132;}else if((r[0x466]&127)===4)r[0x466]=0;}}
 updateWeatherDrift(r);if(r[0x466]===132)sound(r,events,65);const thresholds=[255,224,160,96],t=(r[0x495]&48)>>>4,l=(r[0x495]&12)>>>2;
 if(t&&weatherRandom(r)>=thresholds[t])r[0x466]=131;if(l&&weatherRandom(r)>=thresholds[l])r[0x466]=129;return {events};
}
export function weatherVisibility(r){const dx=(word(r,0x321,0x334)-word(r,0xec))&65535;let visible=false;if(!(dx>>>8)){const dy=(word(r,0x35a,0x36d)-word(r,0xee))&65535;r[0x1d]=dy&255;visible=!(dy>>>8)&&r[0x1d]<240;}r[0x1c]=+visible;r[0x13d]=(r[0x321]-r[0xec])&255;r[0x13e]=(r[0x35a]-r[0xee]-8)&255;return visible;}
function restoreTeamPalette(r){r[0x5ae]=1;r[0x5af]=TEAM_PALETTE_PAIRS[r[0x52c]&15][0];r[0x5b0]=TEAM_PALETTE_PAIRS[r[0x52d]&15][0];r[0x5b1]=TEAM_PALETTE_PAIRS[r[0x52d]&15][1];}
export const LIGHTNING_OFFSETS_X=[112,112,48,176,48,176,48,176],LIGHTNING_OFFSETS_Y=[104,104,152,152,56,56,152,152],LIGHTNING_SPRITE_FLASH=[0,0,24,24,0,0,0,24],LIGHTNING_BACKGROUND_FLASH=[5,5,6,5,6,5,6,0];
// High-bit initialisation is cleared by the original weather OAM phase, not here.
export function updateWeatherActors(r){const events=[],raw=r[0x466],effect=raw&127;if(!raw)return {events};if(effect>6)throw new RangeError('Original weather dispatch resource boundary');
 if(effect===1){if(raw&128){r[0x5fd]=r[0x13f]=0;sound(r,events,69);r[0x5e4]=r[0x45]&7;}const i=r[0x5e4];if(i>7)throw new RangeError('Original lightning offset table boundary');r[0x1c]=LIGHTNING_OFFSETS_X[i];r[0x1d]=LIGHTNING_OFFSETS_Y[i];put(r,0x321,0x334,word(r,0xec)+r[0x1c]);put(r,0x35a,0x36d,word(r,0xee)+r[0x1d]);weatherVisibility(r);r[0xe6]=1;r[0x13f]=(r[0x13f]+1)&255;
  if(r[0x13f]>=20){restoreTeamPalette(r);r[0x5ac]=r[0x5f4];r[0x466]=0;r[0x3ac]=12;r[0xe6]=0;}else{const phase=r[0x13f]&7;if(LIGHTNING_SPRITE_FLASH[phase])restoreTeamPalette(r);else r.fill(0,0x5ae,0x5b2);r[0x5ac]=LIGHTNING_BACKGROUND_FLASH[phase]||r[0x5f4];}updatePaletteForFade(r);r[0x6db]=32;r[0x692]=r[0x6da]=0;r[0x6d9]=63;
 }else if(effect===3){if(raw&128){sound(r,events,65);r[0x5fd]=0;put(r,0x321,0x334,word(r,0xec)+(r[0x45]&191));put(r,0x35a,0x36d,word(r,0xee)+r[0x45]);r[0x13f]=r[0x3f5]=r[0x411]=0;r[0x403]=weatherRandom(r)&128?1:255;r[0x41f]=weatherRandom(r)&128?2:254;}
  integrateMotion(r,13);let bounce=false;if(r[0x36d]===1){if(r[0x35a]>=104){put(r,0x35a,0x36d,357);bounce=true;}}else if(r[0x35a]<48){put(r,0x35a,0x36d,50);bounce=true;}if(bounce)put(r,0x411,0x41f,-word(r,0x411,0x41f));r[0x13f]=(r[0x13f]+1)&255;
  if(r[0x13f]===255||r[0x334]>=4){r[0x466]=0;r[0x3ac]=12;r[0xe6]=0;}else{const visible=weatherVisibility(r);r[0x3ac]=visible?12:0;r[0xe6]=+visible;}}
 return {events};
}

export const TORNADO_FORCE_BYTES=[0, 1, 64, 0, 64, 0, 64, 0, 192, 0, 48, 0, 48, 0, 48, 0, 160, 0, 32, 0, 32, 0, 32, 0, 128, 0, 16, 0, 16, 0, 16, 0, 64, 0, 24, 0, 24, 0, 24, 0, 32, 0, 16, 0, 16, 0, 16, 0, 16, 0, 8, 0, 8, 0, 8, 0, 8, 0, 4, 0, 4, 0, 4, 0], WIND_VECTOR_BYTES=[0, 0, 128, 255, 166, 0, 173, 255, 0, 1, 0, 0, 166, 0, 83, 0, 0, 0, 128, 0, 90, 255, 83, 0, 0, 255, 0, 0, 90, 255, 173, 255];
export function applyMatchWind(r){const strength=r[0x5fd];if(strength>128)throw new RangeError('Wind strength beyond original generated range and threshold table');r[0x5fc]=[0,3,5,128].findIndex(t=>strength<=t);const at=(r[0x5fe]&224)>>>3;for(let i=0;i<4;i++)r[0x2c+i]=WIND_VECTOR_BYTES[at+i];r[0x600]=r[0x5ff]=r[0x602]=r[0x601]=0;
 if(strength){r[0x1c]=strength;do{const carry=r[0x1c]&128;r[0x1c]=(r[0x1c]<<1)&255;if(carry){put(r,0x600,0x5ff,word(r,0x600,0x5ff)+word(r,0x2c));put(r,0x602,0x601,word(r,0x602,0x601)+word(r,0x2e));}put(r,0x2c,0x2d,signed(word(r,0x2c))>>1);put(r,0x2e,0x2f,signed(word(r,0x2e))>>1);}while(r[0x1c]);}
 if(r[0x466]!==3)return;for(let x=0;x<13;x++){const distance=measureAIDistance(r,x,13);if(distance>=128)continue;r[0x1c]=(distance>>>3)&12;const index=(r[0x1c]+(x===12?2:0)+((r[0x486+x]&128)?1:0))*2,force=TORNADO_FORCE_BYTES[index]|TORNADO_FORCE_BYTES[index+1]<<8;put(r,0x2c,0x2d,force);put(r,0x2e,0x2f,force);
  for(const [lo,hi,vl,vh,scratch]of[[0x314,0x327,0x3e8,0x3f6,0x2c],[0x34d,0x360,0x404,0x412,0x2e]]){const p=word(r,lo+x,hi+x),target=word(r,lo+13,hi+13);if(p===target)continue;if(p>target)put(r,scratch,scratch+1,-word(r,scratch));put(r,vl+x,vh+x,word(r,vl+x,vh+x)+word(r,scratch));}}
}
