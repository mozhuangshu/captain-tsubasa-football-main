import {OAM_OVERFLOW_TILES} from './oam-overflow-data.js';
import {SPRITE_KINDS} from './sprite-kinds.js';
import {isTsubasaSpecialShadowLocked} from './tsubasa-shadow-lock.js';
import {assembleMetaSprite,createHiddenOam} from './input-sprites.js';
// $EB8C menu branch; the gameplay branch has ball-priority/shadow conditions and is not silently substituted.
export function submitMenuCursor(r,x=2){
 if([0,1,3].includes(r[0x58]))throw new RangeError('Gameplay display-list branch is not the menu branch');
 r[0x1c]=0;r[0x1d]=0;
 if((r[0x74+x]&127)===127)return false;
 if(r[0xf4]>=32)throw new RangeError('Original display-list capacity');
 r[0xa1+r[0xf4]]=x;r[0xf4]=(r[0xf4]+1)&255;return true;
}
// Physical page9:$B26E-$B315, followed by $B20D-$B26D stable depth sorting.
export function updateSpriteVisibility(r){
 r.fill(0,0xd9,0xec);r[0xf5]=r[0xf3]===0?0:16;
 let i=0;
 while(i<r[0xf4]){
  const entry=r[0xa1+i],entity=entry&31;
  const wx=r[0x314+entity]|(r[0x327+entity]<<8),cx=r[0xf0]|(r[0xf1]<<8);
  const screenX=(wx-cx)&65535;r[0x3af+entity]=screenX&255;
  let keep=false;
  if((screenX>>8)===0&&(screenX&255)>=8){
   const wy=r[0x34d+entity]|(r[0x360+entity]<<8),cy=r[0xf2]|(r[0xf3]<<8);
   const ground=(wy+r[0xf5]-cy)&65535;
   r[0x2c]=ground&255;r[0x2d]=ground>>8;r[0x3d5+entity]=ground&255;
   const z=r[0x386+entity]|(r[0x399+entity]<<8),projected=(ground-z)&65535;
   r[0x3c2+entity]=projected&255;
   if((projected>>8)===0){
    if(ground>>8)r[0x3d5+entity]=255;
    r[0xd9+entity]=1;
    if(!(entry&32))keep=true;
   }
   if(!keep&&(entry&32)){
    if((ground>>8)===0)keep=true;
    else r[0x3d5+entity]=255;
   }
  }
  if(keep)i++;
  else{
   r[0xf4]--;
   // Original shift executes once even when removing the last list element.
   for(let j=i;j<=Math.max(i,r[0xf4]-1);j++)r[0xa1+j]=r[0xa2+j];
  }
 }
 // Original depth keys use live camera Y low ($EE), not the projected-copy ($F2).
 // Original loop executes once for an empty list, preserved here.
 for(let j=0;j<Math.max(1,r[0xf4]);j++)r[0xc1+j]=(r[0x34d+(r[0xa1+j]&31)]-r[0xee])&255;
 r[0x2b]=r[0xf4];
 if(r[0x2b])r[0x2b]--;
 while(r[0x2b]>0){
  const end=r[0x2b];r[0x1c]=0;
  for(let j=0;j<end;j++)if(r[0xc1+j]<r[0xc2+j]){
   r[0x1f]=r[0xa2+j];[r[0xa1+j],r[0xa2+j]]=[r[0xa2+j],r[0xa1+j]];
   r[0x1f]=r[0xc2+j];[r[0xc1+j],r[0xc2+j]]=[r[0xc2+j],r[0xc1+j]];r[0x1c]++;
  }
  if(!r[0x1c])break;
  r[0x2b]--;
 }
 return r[0xf4];
}
// $8031..82C5 all draw branches plus unused-slot cleanup, without GPU/PPU emulation.
export function assembleMenuOam(r, actorTrace=null){
 if(r[0x5c]&128)return r.slice(0x200,0x300);
 if(actorTrace){actorTrace.length=0;actorTrace.ballRenderIntent=null;}
 const oam=r.slice(0x200,0x300);let cursor=252,full=false;r[0x5e3]=64;
 // D-14: during a Tsubasa special transform only, the ball shadow (12|32) and
 // then the ball body (12) are submitted first, so a full 64-record OAM can drop
 // neither (they sit in the highest, i.e. rearmost, records). Plain play unchanged.
 let protectEntries=0,protectCursor=252,processed=0;
 // v3b: a body hit by the special (native 0x59 knock-back) or the goalkeeper about to meet
 // the special ball (screen distance <=32/24) is protected next, so the impact frame never loses it to native OAM rotation.
 if(isTsubasaSpecialShadowLocked(r)&&r[0xf4]>1){const list=r.subarray(0xa1,0xa1+r[0xf4]);const victims=[...list].filter(e=>(e&31)<12&&!(e&96)&&((r[0x459+(e&31)]&127)===0x59||(e&31)>=10&&!(r[0x67c+(e&31)]&128)&&Math.abs(r[0x3af+(e&31)]-r[0x3af+12])<=32&&Math.abs(r[0x3d5+(e&31)]-r[0x3d5+12])<=24));for(const v of victims){const i=list.indexOf(v);list.copyWithin(i,i+1);list[list.length-1]=v;protectEntries++;}for(const e of [12,12|32]){const i=e===12?list.findIndex(v=>(v&127)===12):list.indexOf(e);/* v3b: also the goal-mouth front-drawn body 12|128 */const v=list[i];if(i>=0){list.copyWithin(i,i+1);list[list.length-1]=v;protectEntries++;}}}
 const write=(y,tile,attr,x)=>{oam[cursor]=y&255;oam[cursor+1]=tile;oam[cursor+2]=attr;oam[cursor+3]=x&255;r[0x5e3]--;cursor=(cursor-4)&255;full=cursor===252;};
 while(r[0xf4]&&!full){
  if(protectEntries&&processed===protectEntries)protectCursor=cursor;processed++;
  r[0xf4]--;const entry=r[0xa1+r[0xf4]],entity=entry&31,kind=r[0x61+entity];
  const px=r[0x3af+entity],py=r[0x3c2+entity],ground=r[0x3d5+entity],flags=entry&224;
  if(flags===32){const y=(ground-8)&255;if(y<r[0x56])write(y,0xa1,1,px-4);continue;}
  if(flags===64){const y=(ground-7)&255;if(y<r[0x56]){write(y,0xb7,0,px-8);if(!full)write(y,0xb7,64,px);}continue;}
  if(kind===3){const f=r[0x74+entity]&127,tile=[0xc0,0xc1,0xd0,0xd1,0xc2][f];if(tile===undefined)throw new RangeError('Original type3 frame boundary');write(py-11,tile,(f&1)+1,px-4);continue;}
  const frames=SPRITE_KINDS[kind];if(!frames)throw new RangeError('Unrecovered object render kind');
  const actorCursor=cursor;
  const result=assembleMetaSprite({x:px,y:py,groundY:ground,frame:r[0x74+entity],headVariant:r[0x55c+entity],entity,priority:entry>=32?32:0,clipY:r[0x56],frames},oam,cursor);
  if(actorTrace&&result.count){const indices=Array.from({length:result.count},(_,i)=>((actorCursor-i*4)&255)>>>2);actorTrace.push({entity,kind,x:px,y:py,groundY:ground,frame:r[0x74+entity],headVariant:r[0x55c+entity],priority:entry>=32?32:0,clipY:r[0x56],oamIndices:indices,sourceRecords:indices.map(i=>Array.from(oam.slice(i*4,i*4+4))),mainState:r[0x58],subState:r[0x59]&127,teamId:r[0x52c+(entity&1)]&15,playerNumber:r[0x58]===2&&(r[0x59]&127)===10?r[0x5d1]:r[0x532+entity],role:entity>=10&&entity<12?'keeper':'field'});}
  cursor=result.cursor;r[0x5e3]-=result.count;full=result.full;
 }
 if(!full){
  // Original cleanup writes once before checking weather's reserved first12 slots.
  do{oam[cursor]=248;cursor=(cursor-4)&255;}while(cursor!==252&&(r[0x466]===0||cursor>=48));
 }else if(r[0xf4]){
  // Presentation-only intent for a real body in the remaining depth-sorted
  // display list. OAM capacity is not a gameplay visibility flag. The native
  // allocator and all RAM writes below remain unchanged. Remaining bodies are
  // foreground of the allocated actors, hence insertion before OAM index 0.
  if(actorTrace)for(let index=0;index<r[0xf4];index++){
   const entry=r[0xa1+index],entity=entry&31;
   if(entity!==12||r[0x61+entity]!==1||[32,64].includes(entry&224))continue;
   actorTrace.ballRenderIntent={entity,kind:1,x:r[0x3af+entity],y:r[0x3c2+entity],groundY:r[0x3d5+entity],frame:r[0x74+entity],headVariant:r[0x55c+entity],priority:entry>=32?32:0,clipY:r[0x56],mainState:r[0x58],subState:r[0x59]&127,oamIndices:[],sourceRecords:[],renderIntent:true,insertionAt:0,reason:'oam-exhausted',displayListIndex:index};
   break;
  }
  // 81BF fallback includes the current, partially drawn object's list entry.
  r[0x1c]=252;
  // D-14: the protected special-transform shadow/ball records are not reused.
  if(isTsubasaSpecialShadowLocked(r))r[0x1c]=protectCursor;
  for(let index=r[0xf4];index>=0;index--){
   const entry=r[0xa1+index];if(entry<14)continue;
   const entity=entry&31,kind=(entity-14)&255;r[0x1f]=kind&255;r[0x1d]=r[0x3af+entity];
   const y=r[0x3c2+entity];if(y<192)continue;
   const tile=OAM_OVERFLOW_TILES[kind];
   r[0x1e]=y;const at=r[0x1c];
   // A real, already allocated ball body can lose every source record to
   // this native overflow pass. Record this exact cause, not arbitrary stale
   // OAM. Keep the replacement behind the reused slot and all lower indices.
   // The new overflow sprite still owns its bytes and must never be hidden.
   if(actorTrace&&!actorTrace.ballRenderIntent){
    const ball=actorTrace.find(a=>a.entity===12&&a.kind===1&&a.oamIndices.includes(at>>>2));
    if(ball)actorTrace.ballRenderIntent={...ball,oamIndices:[],sourceRecords:[],renderIntent:true,insertionAt:Math.min(...ball.oamIndices)+1,reason:'oam-overwritten',overwrittenOamIndices:[]};
   }
   if(actorTrace?.ballRenderIntent?.reason==='oam-overwritten'){
    const ball=actorTrace.find(a=>a.entity===12&&a.kind===1);
    if(ball?.oamIndices.includes(at>>>2))actorTrace.ballRenderIntent.overwrittenOamIndices.push(at>>>2);
   }
   oam[at]=(y-11)&255;oam[at+3]=(r[0x1d]-4)&255;oam[at+2]=1;r[0x44]=at;oam[at+1]=tile;r[0x1c]=(at-4)&255;
  }
  r[0xf4]=0;
 }
 r.set(oam,0x200);return oam;
}
export const assembleObjectOam=assembleMenuOam;
export function menuAppearanceFromState(r){return {chrPages:[...r.slice(0x5b8,0x5bc)],paletteIds:[...r.slice(0x5ae,0x5b2)]};}
import {acceptPlayerActionFromState,updatePlayerActionFlags,acceptBallMovementRequest,updateBallPossessionFlags} from './controls-actions.js';
import {initializeMovement,resetVerticalAndYMotion} from './sprite-animation.js';
import {updateRecoveredPlayerAction} from './player-actions.js';
import {updateBallAction} from './ball-runtime.js';
// A1F7 kind0 -> A206..A271. Preserve original subtype conditions, not a invented idle animation.
export function selectIdleAnimationSubtype(r,x){
 let subtype=null;
 if((r[0x5c]&64)&&!(r[0x5c]&32)&&((r[0x5c]&15)?(r[0x5c]&2):r[0x559])){
  if(r[0x52a+(x&1)]&1)subtype=4;
  else if((r[0x52c+(x&1)]&15)!==15){const row=[5,6,7,7,6,5];subtype=row[x>>1];if(subtype===undefined)throw new RangeError('Idle team subtype boundary');}
 }
 if(subtype===null){
  if(x>=10&&!(r[0x67c+x]&128)&&!(r[0x5c]&64))subtype=1;
  else subtype=(r[0x486+x]&1)?2:(r[0x486+x]&16)?3:0;
 }
 r[0x46c+x]=subtype;return subtype;
}
// Original player action dispatcher, with explicitly supported original bodies supplied by player-actions.
export function updateMenuPlayerBody(r,x,options={}){
 return (options.updatePlayerActionBody??updateRecoveredPlayerAction)(r,x,options);
}
// Original BDFC..BE31 call order, with directly translated player and ball dispatchers.
export function updateMenuActors(r,options={}){
 r[0x5e2]=(r[0x5e2]+1)&255;const events=[];
 for(let x=1;x>=0;x--){
  if(r[0x5e2]>=4){acceptPlayerActionFromState(r,x);events.push(...updateMenuPlayerBody(r,x,options));updatePlayerActionFlags(r,x);}
  submitMenuCursor(r,x);
 }
 if(r[0x5e2]>=4){
  r[0x5e2]=0;acceptBallMovementRequest(r);
  const ballEvents=(options.updateBallActionBody??updateBallAction)(r,12,options);if(ballEvents)events.push(...(Array.isArray(ballEvents)?ballEvents:ballEvents.events??[]));
  updateBallPossessionFlags(r);
 }
 submitMenuCursor(r,12);return events;
}
