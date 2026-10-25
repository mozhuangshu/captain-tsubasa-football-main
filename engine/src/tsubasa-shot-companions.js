/** Shot companions (2026-10-18, docs/SPECIAL_SHOT_NATIVE_MAPPING.md section 7): an original Nekketsu
 * special-ball element flies ALONGSIDE the football, never replacing it. Every companion is the native ball
 * frame's own pixels (ALL_BALL_FRAMES, CHR page per frame range, centred like getTsubasaNativePlainBallFrame),
 * one native pixel per cell, in a three-colour
 * NES palette; it is drawn behind every sprite like the drive aura and never touches physics or RAM.
 *
 *  falcon - the bird (native 1B: F39-F3B) flaps behind and above the ball
 *  (2026-10-21: razor / tiger / eagle no longer use native creatures; their anime looks are in src/tsubasa-shot-impacts.js)
 *  skylab - two native crescents (state 14: F11/F12) whirl round the ball: the hurricane
 *  jito   - the swelling ball of native 08 (Japan #4 いわかべ: F18/F19) as a pulsing glow round the football while it hovers (the charge)
 *  fire   - the scattering sparks of native 0A (Japan #6 うがじん: F13-F15), only the sparks, round the ball
 * 2026-10-21 (user: effects only after the kick, no cut-in), the six moves that flew as a plain ball:
 *  cannon - after the muzzle flash, native 20's energy ring F40 pulses one ring behind the ball (the shock wave)
 *  slider - thin air streaks behind the ball; they turn with the velocity, so the dip (native 12) reads as a drop
 *  overhead / backflip - short dashed streaks only (basic techniques, no element)
 *  jito   - after the hover, thick orange streaks (the 04 flight of the heavy shot)
 *  header - Margus: low streaks, and native 05/06's spray bits kicked up as dust while the ball skims the grass
 * Streaks are straight pixel lines back along the ball's screen velocity (x, y - z), never physics.
 * Characters without an own move get no companion: their native special draws the native colour-changing
 * ball instead (getTsubasaNativeColourBallFrame; user 2026-10-18: no fish for them). */
import {ALL_BALL_FRAMES} from './sprite-frames.js';
import {appearanceTile,DISPLAY_NES_RGB as N} from './sprite-appearance.js';
import {NATIVE_SHOT_PALETTE} from './tsubasa-native-shot-art.js';
const s8=v=>v>127?v-256:v;
/** CHR page each ball-frame range reads (runtime-art-data) */
export const ballFramePage=i=>i<8?9:i<0x1a?11:i<0x2d?12:i<0x39?13:14;
const cache=new Map();
/** native pixels of ball frame i around the ball anchor: [{x,y,c}] with c the CHR colour 1..3 */
export function nativeBallFramePixels(i){if(cache.has(i))return cache.get(i);const f=ALL_BALL_FRAMES[i],out=[];if(!f)return [];
 f.tiles.forEach((t,k)=>{const p=appearanceTile(t,{chrPages:[8,20,32,ballFramePage(i)]}),a=f.attributes[k],h=!!(a&64),v=!!(a&128);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=p[(v?7-y:y)*8+(h?7-x:x)];if(c)out.push({x:s8(f.dx[k])+x,y:s8(f.dy[k])+y+9,c});}});
 const frozen=Object.freeze(out.map(Object.freeze));cache.set(i,frozen);return frozen;}
const pal=(a,b,c)=>Object.freeze([N[a],N[b],N[c]]);
/* frames face left like the native creatures; dx/dy are native pixels, dx measured BACKWARD from the ball
 * along its travel, dy down; anchor 'ball' = the ball centre, 'ground' = the ball's ground point */
/* 2026-10-21 (user: the looks follow the anime / RISE OF NEW CHAMPIONS, Nekketsu only supplies the logic): no move flies with a
 * native creature or element any more; every named shot's look lives in src/tsubasa-shot-impacts.js (TSUBASA_SHOT_LOOKS).
 * The table stays for the API; nativeBallFramePixels is still used for the colour ball and the F41 flash. */
export const TSUBASA_SHOT_COMPANIONS=Object.freeze({});
/** the native colour-changing ball (generic special states 01/02/03, animation $BE6D): F00 -> F1C -> F02 -> F1D,
 * one tick each, white and orange balls alternating. Same shape as getTsubasaNativePlainBallFrame's result. */
export const NATIVE_COLOUR_BALL_FRAMES=Object.freeze([0x00,0x1c,0x02,0x1d]);
export function getTsubasaNativeColourBallFrame(tick=0,flip=0){const index=NATIVE_COLOUR_BALL_FRAMES[tick&3],direction=flip&128?1:-1,colours=[null,NATIVE_SHOT_PALETTE.K,NATIVE_SHOT_PALETTE.W,NATIVE_SHOT_PALETTE.O];
 const pixels=nativeBallFramePixels(index).map(p=>({x:direction<0?-p.x-1:p.x,y:p.y,color:colours[p.c]}));
 return {frameId:`native-colour-${index.toString(16)}`,animationTick:tick&3,frameIndex:index,stage:'native-colour',direction,grid:1,sourceStates:['01','02','03'],sourceFrames:NATIVE_COLOUR_BALL_FRAMES.map(f=>f.toString(16).padStart(2,'0')),cycleTicks:4,introTicks:0,width:16,height:16,pixels};}
/** companion pixels for a special ball, or null.
 *  state: getTsubasaSpecialState (or the plain residual state with nativeSpecialId), travel: +1 right / -1 left,
 *  ball: screen point of the ball centre, ground: screen point of its ground point. Returns [{x,y,color}] screen. */
export function getTsubasaShotCompanion(state,{travel,ball,ground,centre=null}){
 if(!state||!ball)return null;const age=Number.isFinite(state.clock)?state.clock:Number.isFinite(state.age)?state.age:0;
 if(state.presentationOnly)return null;const id=state.moveId,spec=TSUBASA_SHOT_COMPANIONS[id];if(!spec)return null;
 return null;}
