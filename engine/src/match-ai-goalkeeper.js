// source03 original goalkeeper targets, data only.
export const GOALKEEPER_TARGET_DATA = [5, 137, 13, 137, 21, 137, 53, 137, 53, 137, 85, 137, 117, 137, 149, 137, 149, 137, 181, 137, 0, 153, 0, 161, 0, 153, 0, 173, 0, 150, 0, 184, 0, 149, 0, 194, 0, 148, 0, 202, 0, 147, 0, 211, 0, 145, 0, 218, 0, 145, 0, 230, 0, 153, 0, 165, 0, 153, 0, 175, 0, 169, 0, 183, 0, 169, 0, 190, 0, 164, 0, 202, 0, 160, 0, 211, 0, 145, 0, 222, 0, 145, 0, 229, 0, 153, 0, 146, 0, 153, 0, 163, 0, 187, 0, 177, 0, 185, 0, 191, 0, 181, 0, 204, 0, 172, 0, 222, 0, 145, 0, 239, 0, 145, 0, 254, 3, 103, 0, 162, 3, 103, 0, 177, 3, 105, 0, 182, 3, 106, 0, 191, 3, 107, 0, 198, 3, 108, 0, 205, 3, 111, 0, 214, 3, 111, 0, 226, 3, 103, 0, 163, 3, 103, 0, 173, 3, 89, 0, 180, 3, 82, 0, 190, 3, 85, 0, 200, 3, 94, 0, 211, 3, 111, 0, 221, 3, 111, 0, 227, 3, 103, 0, 147, 3, 87, 0, 160, 3, 82, 0, 180, 3, 71, 0, 190, 3, 77, 0, 203, 3, 87, 0, 217, 3, 111, 0, 231, 3, 127, 0, 243, 136, 120, 0, 3, 192, 192, 0, 0];
import {ae37,selectMovement985F} from './match-ai-helpers.js';
import {tsubasaKeeperReadsHighBall} from './tsubasa-special-moves.js';
import {divideOriginal24By16,multiplyOriginal24By8,aimAtTarget} from './ball-actions.js';
const word=(r,l,h=l+1)=>r[l]|r[h]<<8,put=(r,l,h,v)=>{r[l]=v&255;r[h]=(v>>>8)&255;};
// 840D..84B8. Prediction at a keeper's X plane using ORIGINAL quantized quotient.
// The negative-Y branch intentionally retains quotient byte $1E; positive-Y clears it.
export function predictGoalLine(r,x,h){
 const bx=word(r,0x320,0x333),px=word(r,0x314+x,0x327+x),vx=word(r,0x3f4,0x402);put(r,0x1d,0x1e,x===10?bx-px:px-bx);put(r,0x2c,0x2d,x===10?-vx:vx);r[0x1c]=0;divideOriginal24By16(r);r[0x1f]=r[0x1c];const vy=word(r,0x410,0x41e),negative=!!(vy&32768);put(r,0x1c,0x1d,negative?-vy:vy);if(!negative)r[0x1e]=0;multiplyOriginal24By8(r);put(r,0x21,0x22,word(r,0x359,0x36c)+(negative?-1:1)*word(r,0x21));return word(r,0x21);
}
const data=a=>{if(a<0x8901||a>=0x89dd)throw new RangeError('Keeper target resource boundary');return GOALKEEPER_TARGET_DATA[a-0x8901];},dw=a=>data(a)|data(a+1)<<8;
// 8858..8900, behaviour0D. h supplies the actual converted shared AE37/985F tails.
export function updateGoalkeeperBot(r,x,h={ae37,selectMovement985F}){
 if(x!==10&&x!==11)throw new RangeError('Original goalkeeper table has slots10/11');if(typeof h?.ae37!=='function'||typeof h?.selectMovement985F!=='function')throw new TypeError('Original AE37 and985F implementations required');
 const saved=[r[0x314+x],r[0x327+x],r[0x34d+x],r[0x360+x]];r[0x314+x]=data(0x89d5+x-10);r[0x327+x]=data(0x89d7+x-10);r[0x34d+x]=data(0x89d9+x-10);r[0x360+x]=data(0x89db+x-10);
 put(r,0x2e,0x2f,word(r,0x320,0x333));put(r,0x30,0x31,word(r,0x359,0x36c));r[0x1c]=aimAtTarget(r,x);[r[0x314+x],r[0x327+x],r[0x34d+x],r[0x360+x]]=saved;
 if(x!==10)r[0x1c]=(-r[0x1c])&255;r[0x1c]=((r[0x1c]&128)?127:r[0x1c])>>>4;const root=dw(0x8901+(x&1)*2);put(r,0x2c,0x2d,root);const defense=r[0x4fd+x]>>>6,p=dw(root+defense*2);put(r,0x2e,0x2f,p);const at=p+r[0x1c]*4;
 r[0x62c+x]=data(at);r[0x620+x]=data(at+1);r[0x644+x]=data(at+2);r[0x638+x]=data(at+3);
 h.ae37(r,x);h.selectMovement985F(r,x);if((r[0x399+x]&128)&&r[0x386+x]<251)r[0x479+x]=48;return {defense,sector:(at-p)/4,targetX:word(r,0x620+x,0x62c+x),targetY:word(r,0x638+x,0x644+x)};
}
// 8A9C..8AC3: signed error retained separately from its absolute magnitude.
export function goalkeeperPredictionError(r,x,h){predictGoalLine(r,x,h);const d=(word(r,0x34d+x,0x360+x)-word(r,0x21))&65535;put(r,0x1c,0x1d,d);r[0x1e]=r[0x1d];if(d&32768)put(r,0x1c,0x1d,-d);return word(r,0x1c);}
// 89DD..8AC7, behaviour0E. Its only cross-behaviour tail is original83CA (state05).
export function updateGoalkeeperReaction(r,x,h){
 if(typeof h?.early!=='function')throw new TypeError('Original83CA early behaviour required');const fallback=()=>h.early(r,x,5);
 if([128,192,192,255][r[0x4fd+x]>>>6]<r[0x45])return fallback();
 let aerial=false;if(!(r[0x3a5]&128)&&((r[0x392]-r[0x386+x])&255)>=32){const vz=r[0x43a];aerial=!(vz&128)||vz>=252;}
 /* D-31 ドライブシュート: a fooled keeper looks up at empty air (no jump, no move); special path only */if(tsubasaKeeperReadsHighBall(r,x)){r[0x4b0+x]=255;r[0x479+x]=255;return {aerial:true,fooled:true};}
 goalkeeperPredictionError(r,x,h);if(r[0x22]||r[0x21]<144)return updateGoalkeeperBot(r,x,h);if(r[0x1d])return fallback();
 const difference=r[0x1c];if(!aerial&&difference<6)return fallback();
 if(aerial&&difference<12){r[0x4b0+x]=255;r[0x479+x]=r[0x4fd+x]>=128?84:82;return {aerial,difference};}
 r[0x4b0+x]=r[0x1e]&128?128:0;r[0x479+x]=aerial?(difference<20?63:62):(difference<20?41:40);return {aerial,difference};
}
