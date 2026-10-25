import {MATCH_CAMERA_WORDS,MATCH_CONTROLLER_SLOTS,MATCH_OBJECT_KINDS,MATCH_INITIAL_ACTIONS,MATCH_INDICATOR_ACTIONS,MATCH_TEAM_FLAGS,MATCH_POSITION_POINTERS,MATCH_POSITION_ROWS} from './match-initialize-data.js';
import {teamAppearance} from './sprite-appearance.js';
const put=(r,a,v)=>{r[a]=v&255;r[a+1]=(v>>>8)&255;};
function random(r){r[12]=r[0x45]&2;const feedback=((r[0x46]&2)^r[12])?128:0,carry=r[0x45]&1;r[0x45]=(r[0x45]>>>1)|feedback;r[0x46]=(r[0x46]>>>1)|(carry<<7);return r[0x45];}
// Fixed C326 -> bank00 AE80 -> BB13..BDA6. No mapper is required by translated logic.
export function initializeMatchRoster_Bank00_BB13(r){
 if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('Original 2048-byte gameplay state required');
 if(r[0x5d]>4||(r[0x5d]===0&&(r[0x57]&240)))throw new RangeError('Recovered controller amount is1..4, or0 for demo');
 if(r[0x55b]>3)throw new RangeError('Original setup has four position variants');
 r.fill(255,0x568,0x56c);let mode=r[0x57]&240,table=0;if(mode)while(!(mode&128)){table+=4;mode=(mode<<1)&255;}
 // BB35..BB3F writes before CPX: demo amount0 still assigns the first slot.
 for(let i=0;i<Math.max(1,r[0x5d]);i++)r[0x568+i]=MATCH_CONTROLLER_SLOTS[table+i];
 r[0x5b8]=8;r[0x5bb]=9;r[0x52d]|=MATCH_TEAM_FLAGS[r[0x52d]&15];
 // BFF8 then BFF3: original palette then CHR/head assignments.
 const appearance=teamAppearance(r[0x52c],r[0x52d],Array.from(r.subarray(0x532,0x53e)));
 r.set(appearance.paletteIds,0x5ae);r.set(appearance.chrPages,0x5b8);r.set(appearance.heads,0x55c);
 r[0x1c]=(r[0x52d]&3)===0?1:0;r[0x1d]=r[0x1c]^1;
 if(!((r[0x52a]|r[0x52b])&1))r[0x52b]++;
 const index=side=>(((r[0x55b]<<1)|r[0x52a+side])<<1)&255;
 let left=MATCH_POSITION_POINTERS[index(0)>>>1],right=MATCH_POSITION_POINTERS[index(1)>>>1];
 if(left===undefined||right===undefined)throw new RangeError('Original possession/formation pointer index outside table');
 put(r,0x2c,left);put(r,0x2e,right);r[0x2b]=r[0x52a];
 for(const a of [0x4f0,0x4c9,0x525,0x50d])r[a]=0;r[0x59]=1;r[0x5c]=r[0x55b]?32:1;
 // Original inclusive indicator loop writes playersAmount+1 objects, starting14.
 for(let i=0;i<=r[0x5d];i++){r[0x459+14+i]=MATCH_INDICATOR_ACTIONS[i];r[0x61+14+i]=3;}
 if(r[0x57]&32){
  let finish=false;
  if(r[0x5cc]>=10&&!(r[0x5cc]&1)){
   r[0x52a]=r[0x52b]=0;
   if(r[0x52e]!==r[0x52f]){r[0x52a+(r[0x52f]>r[0x52e]?1:0)]=1;r[0x59]=9;r[0x57]&=223;r[0x5cc]=0;finish=true;}
   else{let count=r[0x5cc]&15;if(count>=10)count=0;r[0x5cc]=count|128;}
  }
  if(!finish){
   const side=r[0x5cc]&1,opposite=side^1;
   if((r[0x57]&128)&&side){if(r[0x569]&128)r[0x568+opposite]=opposite|10;}
   else{r[0x568+side]=r[0x5cc]&15;if(r[0x568+(opposite|2)]&128)r[0x568+opposite]=opposite|10;}
   for(let x=11;x>=0;x--){r[0x1c]=r[0x52c+(x&1)]&128;r[0x650+x]=(r[0x650+x]&127)|r[0x1c];}
   r[0x68e]=0;r[0x68f]=random(r);right=MATCH_POSITION_POINTERS[8];put(r,0x2e,right);
   for(const a of [0x559,0x5be,0x5c0,0x5c1])r[a]=0;r[0x5bf]=8;
  }
 }
 for(let x=0;x<13;x++){
  r[0x4b0+x]=r[0x479+x]=255;r[0x61+x]=MATCH_OBJECT_KINDS[x];r[0x459+x]=MATCH_INITIAL_ACTIONS[x];r[0x74+x]=127;
  for(const a of [0x486,0x3f6,0x3e8,0x412,0x404,0x42e,0x420,0x44a,0x43c,0x301,0x33a,0x373,0x386,0x399])r[a+x]=0;
  const penalty=!!(r[0x57]&32);r[0x4a3+x]=penalty?0:(x&1)*128;
  const mirror=!(x&1)&&!penalty,row=MATCH_POSITION_ROWS[mirror?left:right],at=(x&254)*2;
  const offset=row[at]|row[at+1]<<8,value=(512+(mirror?-offset:offset))&65535;
  r[0x314+x]=value&255;r[0x327+x]=value>>>8;r[0x34d+x]=row[at+2];r[0x360+x]=row[at+3];
 }
 r[0x5f6]=48;r[0x3ad]=12;let camera=(r[0x55b]<<2)+((r[0x2b]&1)?2:0);if(r[0x57]&32){r[0x3ad]=0x4c;camera=16;}
 for(let i=0;i<2;i++)r[0xec+i]=r[0xf0+i]=MATCH_CAMERA_WORDS[camera+i];r[0xee]=r[0xf2]=72;r[0xef]=r[0xf3]=0;r.fill(0,0x56c,0x588);
 return {appearance,positionPointers:[left,right]};
}
