import {noteTsubasaStrikeFrame} from './tsubasa-special-moves.js';
import {PLAYER_ANIMATION_ROOTS,PLAYER_ANIMATION_RECORDS} from './sprite-animation-data.js';
export function initializeMovement(r,x,movement=r[0x459+x]){r[0x459+x]=movement|128;r[0x87+x]=0;r[0x94+x]=0;r[0x46c+x]=0;}
export function resetVerticalAndYMotion(r,x){for(const base of [0x44a,0x43c,0x42e,0x420,0x412,0x404])r[base+x]=0;}
export function resolvePlayerAnimation(action,subtype=0){
 let pointer=PLAYER_ANIMATION_ROOTS[action&127],record=PLAYER_ANIMATION_RECORDS[pointer];
 if(!record)throw new RangeError('Animation action outside recovered table');
 if(record[0]===253){const at=1+subtype*2;if(at+1>=record.length)throw new RangeError('Animation subtype outside original pointer table');pointer=record[at]|(record[at+1]<<8);record=PLAYER_ANIMATION_RECORDS[pointer];}
 return {pointer,record};
}
// $CEBD-$CF90: named animation records, not machine instructions. Events are exposed for original semantic handlers.
export function advanceAnimationRecord(r,x,record,{onEnd,onSound}={}){
 const events=[],visited=new Set();
 while(true){
  const index=r[0x94+x],at=(index*2)&255,key=index+':'+r[0x87+x];
  if(visited.has(key))throw new Error('Non-terminating original animation record state');visited.add(key);
  if(at>=record.length)throw new RangeError('Animation record read outside recovered boundary');
  const command=record[at],argument=record[at+1];
  const arg=()=>{if(argument===undefined)throw new RangeError('Animation operand outside recovered boundary');return argument;};
  if(command===0){r[0x74+x]=arg();return events;}
  if(command===255){
   if(typeof onEnd!=='function')throw new Error('Original animation completion handler required');
   onEnd(r,x);if(at===0)throw new RangeError('Original completion reads preceding table byte; unrecovered path');
   r[0x74+x]=record[at-1];events.push({type:'end',index});return events;
  }
  if(command===254){r[0x94+x]=0;r[0x87+x]=0;continue;}
  if(command===252){r[0x94+x]=arg();r[0x87+x]=0;continue;}
  if(command===240){if(argument===5)noteTsubasaStrikeFrame(r,x);if(r[0x486+x]&64){r[0x485]=arg();events.push({type:'ball-action',value:argument});}r[0x94+x]=(index+1)&255;continue;}
  if(command===241){const value=arg();if(onSound)onSound(value,r);events.push({type:'sound',value});r[0x94+x]=(index+1)&255;continue;}
  if(command===242){r[0x5c]=arg();r[0x65a]=(r[0x65a]&127)|r[0x68c];r[0x65b]=(r[0x65b]&127)|r[0x68d];events.push({type:'match-state',value:argument});r[0x94+x]=(index+1)&255;continue;}
  r[0x1c]=command;r[0x87+x]=(r[0x87+x]+1)&255;
  if(r[0x87+x]>command){r[0x94+x]=(index+1)&255;r[0x87+x]=0;continue;}
  r[0x74+x]=arg();return events;
 }
}
// Labels subdivide one contiguous animation-data area; they are not read bounds.
// 8428 changes run21→idle1 before this call without resetting94. Original CEBD
// therefore can read the next labeled animation's bytes for this single frame.
const PLAYER_ANIMATION_BYTES=new Map(),PLAYER_ANIMATION_STREAMS=new Map();
for(const [address,bytes] of Object.entries(PLAYER_ANIMATION_RECORDS))for(let i=0;i<bytes.length;i++)PLAYER_ANIMATION_BYTES.set(Number(address)+i,bytes[i]);
function playerAnimationStream(pointer){
 if(PLAYER_ANIMATION_STREAMS.has(pointer))return PLAYER_ANIMATION_STREAMS.get(pointer);
 const bytes=[];for(let i=0;i<256&&PLAYER_ANIMATION_BYTES.has(pointer+i);i++)bytes.push(PLAYER_ANIMATION_BYTES.get(pointer+i));
 PLAYER_ANIMATION_STREAMS.set(pointer,bytes);return bytes;
}
export function advancePlayerAnimation(r,x,options){const {pointer}=resolvePlayerAnimation(r[0x459+x],r[0x46c+x]);return advanceAnimationRecord(r,x,playerAnimationStream(pointer),options);}
import {PLAYER_ANIMATION_END_CODES,PLAYER_ANIMATION_END_BRANCHES} from './sprite-animation-data.js';
// $8B6C-$8BCD completion selection, called by original CEBD FF record.
export function finishPlayerAnimation(r,x){
 const action=r[0x459+x]&127;let next=PLAYER_ANIMATION_END_CODES[action];
 if(next===undefined)throw new RangeError('Movement completion table boundary');
 if(next&128){let branch;
  if(next===128)branch=(r[0x486+x]&16)||(r[0x399+x]&128)||r[0x386+x]===0?0:1;
  else if(next===129)branch=2+((r[0x486+x]&8)?1:0);
  else branch=(next===130?4:6)+((r[0x486+x]&64)?1:0);
  next=PLAYER_ANIMATION_END_BRANCHES[branch];
 }
 r[0x459+x]=next;r[0x94+x]=0;r[0x87+x]=0;r[0x46c+x]=0;return next;
}
