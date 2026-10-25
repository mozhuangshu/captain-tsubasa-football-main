// Fixed bank15 EB8C..EC8E (file1EB9C..1EC9E): original display-list submission.
import {isTsubasaSpecialShadowLocked} from './tsubasa-shadow-lock.js';
const word=(r,a,x)=>r[a+x]|(r[a+0x13+x]<<8);
const negativeDifference=(a,b)=>!!(((a-b)&65535)&32768);
// EBED. Mutates the caller's scratch 1C/1D; these are intentionally not reset here.
export function applyBallDisplayPriority(r,x=12){
 const flags=r[0x50e];
 const front=()=>{r[0x1d]=128;r[0x1c]=(r[0x1c]+1)&255;};
 const omitShadow=()=>{if(isTsubasaSpecialShadowLocked(r))return;r[0x1c]=(r[0x1c]+1)&255;};
 if(flags===0){const px=word(r,0x314,x);if(negativeDifference(px,0x88)||!negativeDifference(px,0x378))front();return;}
 if(flags&129)return;
 if(!(flags&2)){omitShadow();return;}
 const y=word(r,0x34d,x);
 if(y>=0xe4)return;// original unsigned BCS, unlike following sign-bit comparisons
 const projected=(y-word(r,0x386,x))&65535;r[0x2c]=projected&255;r[0x2d]=projected>>8;
 if(!negativeDifference(projected,0x70)){
  if(negativeDifference(projected,0xa5))front();
 }else if(!negativeDifference(y,0x70)&&negativeDifference(y,0xe4))omitShadow();
}
export function submitObjectForDisplay(r,x){
 r[0x1c]=0;r[0x1d]=0;let y=r[0xf4];const initial=y;
 const write=(entry)=>{if(y>=32)throw new RangeError('Original display-list capacity');r[0xa1+y]=entry;r[0xf4]=(r[0xf4]+1)&255;};
 if(![0,1,3].includes(r[0x58])){if((r[0x74+x]&127)!==127)write(x);return r[0xf4]-initial;}
 if(r[0x399+x]&128){write(x|64);y++;r[0x1c]=(r[0x1c]+1)&255;}
 if((r[0x74+x]&127)!==127){if(x===12)applyBallDisplayPriority(r,x);write(x|r[0x1d]);}
 if(r[0x1c]===0&&x<13&&(r[0x486+x]&128)){y++;write(x|32);}
 return (r[0xf4]-initial)&255;
}
