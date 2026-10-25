import {HELD_ACTION_MAP,HELD_SUBTYPES,HELD_OFFSETS} from './ball-held-position-data.js';
const signed=v=>v<128?v:v-256;
// C28F -> source bank04:8003 -> AF94. RAM is the original 2KiB state.
export function positionHeldBall(r,x=12){
 const player=r[0x4d6],action=r[0x459+player]&127;
 if(action>=HELD_ACTION_MAP.length)throw new RangeError('Held-ball action exceeds original B07C table');
 let kind=HELD_ACTION_MAP[action];
 if(kind&128){const sub=HELD_SUBTYPES[kind&127],index=r[0x46c+player];if(!sub||index>=sub.length)throw new RangeError('Held-ball subtype exceeds original pointer boundary');kind=sub[index];}
 return applyHeldBallOffset(r,x,kind);
}
// C294 -> source bank04:8006 -> AF8D. Uses offset group1, still indexed by owner frame.
export function positionFixedHeldBall(r,x=12){return applyHeldBallOffset(r,x,1);}
export function applyHeldBallOffset(r,x,kind){
 const player=r[0x4d6],record=HELD_OFFSETS[kind],frame=r[0x94+player];
 // Original ASL / ADC retains ASL carry, then wraps Y to8bits.
 const index=(3*frame+(frame>>7))&255;
 if(!record||index+2>=record.bytes.length)throw new RangeError('Held-ball frame exceeds original offset record');
 r[0x1d]=kind;r[0x1c]=0;r[0x2f]=0;r[0x31]=0;r[0x33]=0;
 for(const base of [0x3e8,0x3f6,0x404,0x412,0x420,0x42e,0x314,0x327,0x34d,0x360,0x386,0x399])r[base+x]=r[base+player];
 r[0x4a3+x]=r[0x4a3+player];if(r[0x4a3+x]&128)r[0x1c]=255;
 r[0x2c]=record.cpu&255;r[0x2d]=record.cpu>>8;
 const offset=record.bytes.slice(index,index+3);
 for(let axis=0;axis<3;axis++){
  const lo=[0x314,0x34d,0x386][axis],hi=[0x327,0x360,0x399][axis];
  const delta=signed(offset[axis]);r[0x2f+axis*2]=delta<0?255:0;
  const value=((r[lo+x]|(r[hi+x]<<8))+(axis===0&&r[0x1c]?-delta:delta))&65535;
  r[lo+x]=value&255;r[hi+x]=value>>8;
 }
 return {player,kind,frame,offset};
}
