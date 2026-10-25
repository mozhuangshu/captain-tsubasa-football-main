// Original bank06 field boundary, goal-frame collision, scoring and continuation.
// No invented geometry. Evidence: docs/DEVELOPMENT.md Audio engine remains external.
const w=(r,l,h)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;},neg=v=>!!(v&0x8000);
function check(r,s){if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('Gameplay RAM required');if(!Number.isInteger(s)||s<0||s>12)throw new RangeError('Player/ball slot 0..12 required');}
// $B7BA..$B89B, including original sloped side lines and scratch outputs.
export function fieldBoundary(r,s){
 check(r,s);r[0x1c]=0;if(r[0x58]!==0)return 0;
 const ball=s===12,minimumY=ball?48:40,maximumY=ball?348:352,leftBase=ball?160:168,rightBase=ball?864:856;
 r[0x1d]=ball?2:0;
 const y=w(r,0x34d+s,0x360+s),x=w(r,0x314+s,0x327+s);let delta=(y-minimumY)&65535,clampY=y;
 if(neg(delta)){delta=0;clampY=minimumY;r[0x1c]++;}else if(!neg((y-maximumY)&65535)){clampY=maximumY;r[0x1c]++;}
 put(r,0x30,0x31,clampY);delta>>>=3;put(r,0x2c,0x2d,delta);
 const left=(leftBase-delta)&65535;put(r,0x2e,0x2f,left);let clampX=x;
 if(neg((x-left)&65535)){delta=(-delta)&65535;put(r,0x2c,0x2d,delta);clampX=(leftBase+delta)&65535;r[0x1c]+=2;}
 else{const right=(rightBase+delta)&65535;put(r,0x2e,0x2f,right);if(!neg((x-right)&65535)){clampX=right;r[0x1c]+=2;}}
 put(r,0x32,0x33,clampX);
 if((r[0x5c]&12)&&s===r[0x4d6]&&!(r[0x57]&32))r[0x1c]=0;
 return r[0x1c];
}
// $BAB6..$BB98, including original frame thickness and height-band flags.
export function goalFrameGeometry(r,s){
 check(r,s);r[0x1c]=0;const x=w(r,0x314+s,0x327+s),y=w(r,0x34d+s,0x360+s),z=w(r,0x386+s,0x399+s);
 r[0x2e]=0x70;if(x<=0x70)r[0x1c]++;else{r[0x2e]=0x90;if(x>0x390)r[0x1c]++;}
 put(r,0x30,0x31,0xa4);
 if(y<=0xa4){r[0x20]=(0x95-y)&255;r[0x1c]|=2;if(y>0x95)r[0x1c]|=128;}
 else{put(r,0x30,0x31,0xe4);if(y>0xe4){r[0x20]=(0xf3-y)&255;r[0x1c]|=2;if(y<=0xf3)r[0x1c]|=128;}else if(r[0x34d+s]>=0xc0)r[0x30]++;else put(r,0x30,0x31,0xa4);}
 put(r,0x32,0x33,0x2f);
 if(neg((0x2f-z)&65535)){if(!neg((0x3f-z)&65535)&&r[0x1c]===0)r[0x1c]=0x84;else r[0x1c]=(r[0x1c]&127)|4;}
 return r[0x1c];
}
function applyFrameClamp(r,s){for(const [mask,lo,hi,src] of [[1,0x314,0x327,0x2e],[2,0x34d,0x360,0x30],[4,0x386,0x399,0x32]])if(r[0x1c]&mask){r[lo+s]=r[src];r[hi+s]=r[src+1];}}
function reverseX(r,s){put(r,0x3e8+s,0x3f6+s,-w(r,0x3e8+s,0x3f6+s));r[0x4a3+s]^=128;}
function reverseAxes(r,s){r[0x1d]=r[0x1c];if(r[0x1d]&1)reverseX(r,s);r[0x1d]>>>=1;if(r[0x1d]&1)put(r,0x404+s,0x412+s,-w(r,0x404+s,0x412+s));r[0x1d]>>>=1;if(r[0x1d]&1)put(r,0x420+s,0x42e+s,-w(r,0x420+s,0x42e+s));r[0x1d]>>>=1;}
function halfX(r,s){let v=w(r,0x3e8+s,0x3f6+s);if(v&32768)v-=65536;put(r,0x3e8+s,0x3f6+s,v>>1);}
// $A187..$A1E7 compares absolute HIGH BYTE, not full fixed-point magnitude.
export function limitPlanarSpeed(r,s){check(r,s);r[0x1d]=s<12?0:4;for(const [lo,hi,limit] of [[0x3e8,0x3f6,s<12?6:8],[0x404,0x412,s<12?4:8]]){const b=r[hi+s],m=b&128?(-b)&255:b;if(m>=limit)put(r,lo+s,hi+s,(b&128?-limit:limit)*256);}}
function resetSpecial(r){r[0x4f0]=0;r[0x4c9]=0;r[0x510]=0;r[0x50f]=128;}
function specialFrameBounce(r,s){
 if(r[0x4c9]===0){reverseX(r,s);return;}
 r[0x4c9]=0;r[0x510]=0;let index;
 if(!(r[0x1c]&2)){index=(r[0x386+s]&14)>>>1;const increments=[-2048,-2560,-1024,0,256,512,2048,2048];put(r,0x420+s,0x42e+s,w(r,0x420+s,0x42e+s)+increments[index]);}
 else{index=7;put(r,0x404+s,0x412+s,w(r,0x404+s,0x412+s)+2048);} // $BBFF negates A=02, masks to 0E.
 const rule=[0,129,128,128,128,128,129,0][index];if(rule&128)reverseX(r,s);for(let n=rule&127;n>0;n--)halfX(r,s);
}
function cameraGoalSide(r){let side=255;if((r[0x3ad]&15)===12){if(r[0x523])r[0x523]--;if(r[0xed]===0&&r[0xec]<0x48)side=128;else if(r[0xed]===2&&r[0xec]>=0xb8)side=0;}r[0x1d]=side;return side;}
function markGoalEffect(r,variant,sound){
 const side=cameraGoalSide(r);if(side&64)return;
 if(variant===2){sound(0x27);r[0x1d]=side|2;r[0x466]=side&128?0x86:0x85;r[0x5f5]=r[0x1d];r[0x50e]=1;return;}
 if(variant===0){if(r[0x523]===0)return;r[0x1d]=(r[0x1d]+1)&255;}
 else if((r[0x1c]&1)&&r[0x523]!==0)return;
 if(r[0xe5])r[0x5f5]=r[0x1d];
}
function setGameScript(r,event){if(!(r[0x5c]&64))r[0x5c]=(r[0x5c]&128)|[0x48,0x44,0x42][event];}
// Complete GAMEPLAY effects of $BA31..$BAB5 plus $BD55 / $9EB5.
function awardGoal(r,s,sound){
 if((r[0x5c]&64)||(r[0x492]&64))return;
 r[0x80]=0;if((r[0x466]&127)===1)r[0x13f]=0x60;else r[0x466]=0;
 if(r[0x5c]&64)return;
 setGameScript(r,2);let team=r[0x5cc]&1;
 if(r[0x57]&32){if(r[0x327+s]===0)return;}else team=r[0x327+s]===0?1:0;
 r[0x52a+team]=1;r[0x52e+team]=(r[0x52e+team]+1)&255;
 if((r[0x52e+team]&15)>=10){r[0x52e+team]=((r[0x52e+team]&240)+16)&255;if(r[0x52e+team]>=0xa0)r[0x52e+team]=0x99;}
 const keeper=(team^1)|10;r[0x4e4+keeper]=Math.min(255,r[0x4e4+keeper]+20);sound(0x2e);
}
// Whole original $B8C5..$BA30 gameplay branch graph. Returns original sound requests;
// producing audio/APU state is not implemented, and no fake sound is substituted.
export function processGoalAndBoundary(r,s=12){
 check(r,s);const sounds=[],before=[r[0x52e],r[0x52f]];
 const sound=id=>{if((r[0x58b]&64)||((r[0x58b]&128)&&id<32))return;r[0x1b]=id;r[0x7ff]=id;sounds.push(id);};
 const result=()=>({sounds,scoreChanged:r[0x52e]!==before[0]||r[0x52f]!==before[1],audioEngineComplete:false});
 const outOfPlay=side=>{
  const permit=side===0?r[0x50e]===255:!!(r[0x50e]&128);
  if(!(r[0x5c]&64)&&permit){setGameScript(r,side);sound(0x2d);for(const [src,dst] of [[0x314,0x517],[0x327,0x518],[0x34d,0x519],[0x360,0x51a]])r[dst]=r[src+s];}
  r[0x50e]=side===0?r[0x1c]&127:r[0x1c];
 };
 const settle=()=>{r[0x1c]=0;if(!(r[0x492]&128)||!(r[0x386+s]|r[0x399+s])){if(r[0x5c]&2)return;if(!(r[0x5c]&2))awardGoal(r,s,sound);}r[0x50e]=r[0x1c];};
 fieldBoundary(r,s);
 if(r[0x1c]===0){r[0x50e]=255;return result();}
 if(r[0x1c]===1){outOfPlay(1);return result();}
 if((r[0x5c]&12)&&!(r[0x57]&32))return result();
 goalFrameGeometry(r,s);
 const flags=r[0x1c];
 if(flags&128){
  if(r[0x50e]!==0){
   if(!(r[0x50e]&128)){outOfPlay(0);return result();}
   if(r[0x3f6+s]|r[0x3e8+s]){sound(0x27);specialFrameBounce(r,s);limitPlanarSpeed(r,s);r[0x4c9]=0;r[0x510]=0;r[0x50f]=128;fieldBoundary(r,s);if(r[0x1c]){r[0x34d+s]=r[0x30];r[0x360+s]=r[0x31];r[0x314+s]=r[0x32];r[0x327+s]=r[0x33];}}
   return result();
  }
 }else if(flags!==0&&r[0x50e]!==0){outOfPlay(0);return result();}
 if(flags!==0){
  applyFrameClamp(r,s);awardGoal(r,s,sound);
  if(r[0x4f0]){markGoalEffect(r,0,sound);sound(0x27);r[0x523]=(r[0x4c9]>>>1)&31;r[0x4f0]=0;r[0x510]=0;}
  if(r[0x4c9]&&r[0x42e+s]){markGoalEffect(r,2,sound);return result();}
  markGoalEffect(r,1,sound);
  if(r[0x523]){settle();return result();}
  reverseAxes(r,s);limitPlanarSpeed(r,s);resetSpecial(r);halfX(r,s);
 }
 if((r[0x50e]&128)||r[0x50e]===0){settle();return result();}
 r[0x1c]=r[0x50e];applyFrameClamp(r,s);reverseAxes(r,s);limitPlanarSpeed(r,s);resetSpecial(r);awardGoal(r,s,sound);return result();
}
