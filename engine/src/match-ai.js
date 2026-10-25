// Source bank03:8015..818E common AI pipeline. Gameplay semantics, no CPU interpreter.
import {updateTeammateCommands,predictCommandPosition} from './mood-league.js';
const word=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,v)=>{r[l]=v&255;r[l+1]=(v>>>8)&255;};
function ram(r){if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('Original 2KiB RAM required');}
// B0D7..B12C, original signed16 inequalities and low-byte slope calculation.
export function classifyGoalkeeperArea(r,y){
 const py=word(r,0x34d+y,0x360+y),px=word(r,0x314+y,0x327+y);
 if(!((96-py)&32768)||((288-py)&32768))return 255;
 r[0x1c]=((r[0x34d+y]-96)&255)>>>3;r[0x1d]=8+r[0x1c];if(((0x300+r[0x1d]-px)&32768))return 1;
 r[0x1d]=(248-r[0x1c])&255;return ((r[0x1d]-px)&32768)?255:0;
}
// B0AE..B0D6, two goalkeeper flags, forced in special mode.
export function refreshGoalkeeperAreas(r){ram(r);for(let y=10;y<12;y++){const area=classifyGoalkeeperArea(r,y);if(!(area&128))r[0x1c]=area;r[0x67c+y]=area===(y&1)||(r[0x57]&32)?0:128;}}
// Fixed FA6D..FAED, including exact scratch writes and asymmetry at difference -256.
export function measureAIDistance(r,origin,candidate){
 const component=(lo,hi,target)=>{const d=(word(r,lo+candidate,hi+candidate)-word(r,lo+origin,hi+origin))&65535;r[target]=d&255;const high=d>>>8;if(high===0)return true;if(high!==255)return false;r[target]=r[target]===0?255:(-r[target])&255;return true;};
 if(!component(0x314,0x327,0x24)||!component(0x34d,0x360,0x25)){r[0x24]=255;return 255;}
 if(r[0x24]<r[0x25]){r[0x26]=r[0x24];r[0x24]=r[0x25];r[0x25]=r[0x26];}
 r[0x26]=(r[0x24]-r[0x25])>>>5;let part=r[0x24];do{part>>>=1;r[0x26]=(r[0x26]-1)&255;}while(!(r[0x26]&128));r[0x24]=Math.min(255,part+r[0x24]);return r[0x24];
}
// Full F9DE..FA6C: $22 origin, $23 first, $27 capacity, $28 last, $29 step.
// Maintains the original extra displaced pair just after the capacity, not JS sort.
export function rankAIObjects(r){
 ram(r);const count=r[0x27],first=r[0x23],last=r[0x28],step=r[0x29],origin=r[0x22];if(count<2||count>12||first>last||last>18||origin>18||!step)throw new RangeError('Original object ranking domain');
 for(let i=count*2-1;i>=0;i--)r[0x2c+i]=255;
 for(let y=first;y<=last;y+=step){measureAIDistance(r,origin,y);r[0x2a]=y;for(let i=count*2-2;i>=0;i-=2){if(r[0x24]>r[0x2d+i])break;r[0x2e+i]=r[0x2c+i];r[0x2f+i]=r[0x2d+i];r[0x2d+i]=r[0x24];r[0x2c+i]=r[0x2a];}}
 const a=r[0x2c],b=r[0x2e];if((r[0x486+a]&1)&&((word(r,0x386+a,0x399+a)-word(r,0x386+b,0x399+b))&32768)){r[0x28]=a;r[0x29]=r[0x2d];r[0x2c]=b;r[0x2d]=r[0x2f];r[0x2e]=r[0x28];r[0x2f]=r[0x29];}
 return Array.from({length:count},(_,i)=>({slot:r[0x2c+i*2],distance:r[0x2d+i*2]}));
}
// 8015..8160; complete prefix through the actual decision-stage branch.
export function prepareMatchAI(r){
 ram(r);refreshGoalkeeperAreas(r);const commandEvents=updateTeammateCommands(r);
 for(let x=11;x>=0;x--){r[0x668+x]|=240;r[0x65c+x]=0;}
 let saved=null,prediction=null;if(r[0x492]&128){r[0x1c]=r[0x524];prediction=predictCommandPosition(r,12,r[0x1c]);put(r,0x32,prediction.x);put(r,0x34,prediction.y);saved=[r[0x320],r[0x333],r[0x359],r[0x36c]];r[0x320]=r[0x32];r[0x333]=r[0x33];r[0x359]=r[0x34];r[0x36c]=r[0x35];}
 r[0x22]=12;r[0x23]=0;r[0x27]=6;r[0x28]=11;r[0x29]=1;const ranked=rankAIObjects(r);if(saved)[r[0x320],r[0x333],r[0x359],r[0x36c]]=saved;
 for(let side=0;side<2;side++){
  if((r[0x492]&64)&&(r[0x4d6]&1)===side){r[0x676+side]=0;r[0x674+side]=r[0x4d6];continue;}
  let i=0;while(r[0x2c+i]!==255&&(r[0x2c+i]&1)!==side){i+=2;if(i>254)throw new Error('Original nearest-side scan does not terminate in recovered RAM domain');}
  if(r[0x2c+i]===255){r[0x676+side]=255;r[0x674+side]=side;}else{r[0x676+side]=r[0x2d+i];r[0x674+side]=r[0x2c+i];}
 }
 r[0x1c]=16;r[0x1d]=1;for(let i=0;i<12;i+=2){if(r[0x2d+i]===255)break;const y=r[0x2c+i];let low=r[0x668+y]&15;if(low>=r[0x1d]&&y!==r[0x4d6])low=r[0x1d];r[0x668+y]=low|r[0x1c];r[0x1c]=(r[0x1c]+16)&255;r[0x1d]++;}
 for(const a of [0x672,0x673])if((r[a]&15)>=2)r[a]=0x22;
 const needsDecisions=r[0x59]!==1;if(!needsDecisions&&(r[0x5c]&32))r[0x65c+(r[0x52a]&1)]=6;
 return {needsDecisions,ranked,prediction,commandEvents};
}
// 816A..818E tail. updateBot must be the converted original8339 handler.
// This separate API permits the original81A9 -> A017 -> A7A1 sequence BETWEEN
// prefix and tail; callers must not shortcut that sequence.
export function finishMatchAI(r,updateBot){ram(r);if(typeof updateBot!=='function')throw new TypeError('Converted original8339 handler required');const results=[];for(let x=0;x<12;x++){r[0x668+x]--;if(!(r[0x668+x]&15)){results.push(updateBot(r,x));r[0x668+x]|=r[0x668+x]>>>4;}}return results;}
