// Original bank03 AI direction and movement helpers, no CPU interpreter.
export const AI_THRESHOLDS=Object.freeze([3,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32]);
const DIR=[255,64,192,255,128,96,160,255,0,32,224,255,255,255,255,255];
const w=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
const signed=v=>v&32768?v-65536:v;
// AE4B-AEBE: signed deltas saturate at signed8 bounds, retain original scratch.
export function ae4b(r,x){
 const dx=(w(r,0x32)-w(r,0x314+x,0x327+x))&65535;r[0x1e]=dx&255;r[0x28]=dx>>>8;
 const sx=Math.max(-128,Math.min(127,signed(dx)));r[0x1c]=sx&255;r[0x2a]=Math.abs(sx);r[0x29]=r[0x28]^r[0x74+x];
 const dy=(w(r,0x34)-w(r,0x34d+x,0x360+x))&65535;r[0x1e]=dy&255;
 const sy=Math.max(-128,Math.min(127,signed(dy)));r[0x1d]=sy&255;r[0x2b]=Math.abs(sy);
}
export function ae37(r,x){r[0x32]=r[0x620+x];r[0x33]=r[0x62c+x];r[0x34]=r[0x638+x];r[0x35]=r[0x644+x];ae4b(r,x);}
export function ae1a(r,x,y=r[0x1f]){r[0x1f]=y;r[0x32]=r[0x314+y];r[0x33]=r[0x327+y];r[0x34]=r[0x34d+y];r[0x35]=r[0x360+y];ae4b(r,x);}
// B175-B1EC: stop thresholds and Y-dominant suppression of diagonal X.
export function selectDirectionB175(r,x){
 let mask=(!r[0x2a]||r[0x2a]<r[0x1e])?0:(r[0x1c]&128)?2:1;r[0x20]=mask;
 if(r[0x2b]&&r[0x2b]>=r[0x1f]){if(mask&&r[0x2a]<r[0x2b])mask=0;mask|=(r[0x1d]&128)?8:4;}
 r[0x20]=mask;const angle=DIR[mask];r[0x4b0+x]=angle;r[0x650+x]=angle===255?r[0x650+x]|64:r[0x650+x]&191;return angle;
}
// 985F-98CF: original stop/walk/run decision, no approximate steering.
export function selectMovement985F(r,x){
 r[0x1e]=r[0x1f]=AI_THRESHOLDS[r[0x668+x]>>>4];const running=(r[0x459+x]&127)===33;if(!running)r[0x1f]>>>=1;
 const angle=selectDirectionB175(r,x);let action;
 if(angle===255)action=running?15:1;
 else if((angle&127)&&!(r[0x29]&128))action=running?(r[0x2a]>=16?33:15):(r[0x2a]>=32?33:32);
 else action=running?15:32;
 r[0x479+x]=action;return action;
}
export const difficulty9B4C=(r,x)=>r[0x4fd+x]>>>6;
export function jump9B57(r,x){const a=r[0x4b0+x];r[0x479+x]=a===r[0x496+x]?48:(a&112)?33:32;}
// 9B75-9BC1: easy-mode opponent prediction offsets depend on HP; not clipping.
export function clipPrediction9B75(r,x){if((r[0x57]&3)||!(r[0x57]&128)||!(x&1))return;
 const dx=(r[0x4e4+x]&31)-16,dy=(r[0x4e4+x]>>>3)-16;put(r,0x3c,0x3d,dx);put(r,0x3e,0x3f,dy);put(r,0x32,0x33,w(r,0x32)+dx);put(r,0x34,0x35,w(r,0x34)+dy);
}
// AEBF-AF37: original moving-target approach flags and coarse speed estimate.
export function aeBF(r,x,y){r[0x1c]=x;if(x===y)return true;
 const dx=(w(r,0x314+y,0x327+y)-w(r,0x314+x,0x327+x))&65535,dy=(w(r,0x34d+y,0x360+y)-w(r,0x34d+x,0x360+x))&65535;
 r[0x1c]=dx>>>8;r[0x1d]=dy>>>8;const vx=r[0x3f6+y],vy=r[0x412+y];r[0x1c]=vx?vx^r[0x1c]:128;r[0x1d]=(vy?vy^r[0x1d]:128)&r[0x1c];
 const coarse=(lo,hi)=>!(r[lo+y]|r[hi+y])?0:(((r[hi+y]&128)?(-r[hi+y])&255:r[hi+y])+1)&255;
 r[0x1c]=(coarse(0x3e8,0x3f6)+coarse(0x404,0x412))&255;return !!(r[0x1d]&128);
}
