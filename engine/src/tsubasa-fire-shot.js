/** M-11 施耐德 火焰射门 (D-42, project v1.4 signed). Presentation only: never writes gameplay RAM, never touches goal/score/$7FF.
 * Keyed by MOVE ('fire-shot', assigned only to schneider), never by native shot 0x20 (cannon-shot shares it, D-38 unchanged).
 * - Ball: native F00 unchanged (no spin frames, no trail, collision untouched) + project's 2-frame flame tongue as a separate sprite
 *   (#d64a2c/#ff9b3d/#fff1ac, 未核), alternating a/b per displayed flight frame, right edge on the ball's left edge when the ball
 *   flies right, flipped onto the right edge when it flies left, vertically centred on the ball. No muzzle, no burst.
 * - Body: project's 3-colour frames replace Schneider's native frames 30/0/31 (run) and 24/11 (k1/k2) while he owns the fire shot.
 *   D-33 (same art throughout the move): the decision is taken once per shot from the launch action;
 *   ground launch uses ONLY v1.4 f30/f0/f31/f24/f11; an aerial launch (native jump/volley 0x33/0x37/0x45) uses ONLY project's v1.6
 *   volley frames f2/f10/f33/f22 for the whole move (D-42 supplement, 团队拍板). The two sets are never mixed within one shot. */
import {FIRE_SHOT_AERIAL_ART,FIRE_SHOT_BODY_ART,FIRE_SHOT_BODY_PALETTE,FIRE_SHOT_FLAME_ART,FIRE_SHOT_FLAME_PALETTE} from './tsubasa-fire-shot-art.js';
import {isTsubasaSpecialMovesEnabled} from './tsubasa-gameplay-context.js';import {inShootingRange} from './tsubasa-special-moves.js';
import {getTsubasaNativePlainBallFrame} from './tsubasa-native-shot-art.js';
export const TSUBASA_FIRE_SHOT_MOVE='fire-shot';
export const TSUBASA_FIRE_SHOT_AERIAL_ACTIONS=Object.freeze([0x33,0x37,0x45]);
const JUMP_ACTIONS=[0x30,0x33,0x37,0x45],LANDING_ACTION=0x02;
const BALL={left:-7,right:6,top:-6,bottom:7};
/** Ball frame for drawTsubasaSpecialBall, or null when the special is not Schneider's fire shot. */
export function getTsubasaFireBallFrame(state){
 if(state?.moveId!==TSUBASA_FIRE_SHOT_MOVE||state.characterId!=='schneider'||!Number.isFinite(state.flightTick))return null;
 const right=(state.velocity?.x??1)>=0,ball=getTsubasaNativePlainBallFrame(right?128:0),pixels=ball.pixels.map(p=>({...p,part:'ball'}));
 let key=null;
 if(state.flightTick>=1){key=state.flightTick&1?'a':'b';const f=FIRE_SHOT_FLAME_ART[key],x0=right?BALL.left-f.width:BALL.right+1,y0=Math.round((BALL.top+BALL.bottom+1)/2-f.height/2);
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const c=f.rows[y][right?x:f.width-1-x];if(c!=='.')pixels.push({x:x0+x,y:y0+y,color:FIRE_SHOT_FLAME_PALETTE[c],letter:c,part:'flame'});}}
 return {frameId:key?FIRE_SHOT_FLAME_ART[key].id:'native-plain-0',key,animation:'fire-ball',pixels,mirrored:!right,stage:key?'flame':'launch',ballFrame:ball.frameId};
}
const sessions=new WeakMap();
/** Body pose for one actor, or null. st = getTsubasaSpecialState(r). */
/** The fire volley is only decided at the kick, but Schneider's jump (f2/f10/f33/f22) starts ~20 frames earlier. D-33 (one art
 * per move): a jump Schneider takes off for (native 0x30, first airborne frame) inside the shooting range with specials on is
 * treated as one volley move and uses ONLY project's v1.7 volley frames (f0 f2 f10 f33 f22 f8) from take-off through the landing action 0x02. 团队拍板待确认: such a jump that does not end in a fire-shot (header, miss) also shows these frames. */
const jumps=new WeakMap();
function volleyJump(r,entity,frameByte,characterId){if(entity>=10||characterId!=='schneider'||!isTsubasaSpecialMovesEnabled(r))return false;
 let m=jumps.get(r);if(!m){m=new Map();jumps.set(r,m);}const a=r[0x459+entity]&127,air=JUMP_ACTIONS.includes(a),j=m.get(entity)??{air:false,volley:false};
 if(air&&!j.air)j.volley=a===0x30&&inShootingRange(r,entity);
 if(!air&&a!==LANDING_ACTION)j.volley=false;/* move = take-off (0x30) .. landing (0x02, f2/f8); next action = new move */
 j.air=air;m.set(entity,j);return j.volley;}
export function getTsubasaFireShotBodyPose(r,st,entity,frameByte,characterId){
 if(volleyJump(r,entity,frameByte,characterId)){const art=FIRE_SHOT_AERIAL_ART[String(frameByte&127)];if(art)return {art,set:'aerial',mirrored:!!(frameByte&128),nativeFrame:frameByte&127,palette:FIRE_SHOT_BODY_PALETTE};}
 if(!st||st.moveId!==TSUBASA_FIRE_SHOT_MOVE||st.owner!==entity||characterId!=='schneider'||st.characterId!=='schneider')return null;
 let s=sessions.get(r);if(!s||s.id!==st.id){s={id:st.id,aerial:TSUBASA_FIRE_SHOT_AERIAL_ACTIONS.includes(r[0x459+entity]&127)};sessions.set(r,s);}
 const art=(s.aerial?FIRE_SHOT_AERIAL_ART:FIRE_SHOT_BODY_ART)[String(frameByte&127)];if(!art)return null;
 return {art,set:s.aerial?'aerial':'ground',mirrored:!!(frameByte&128),nativeFrame:frameByte&127,palette:FIRE_SHOT_BODY_PALETTE};
}
export function resetTsubasaFireShot(r){sessions.delete(r);jumps.delete(r);}
/** Native-grid pixels of a body pose around the actor anchor (x,y). */
export function forEachFireShotBodyPixel(pose,x,y,fn){const a=pose.art;for(let yy=0;yy<a.height;yy++)for(let xx=0;xx<a.width;xx++){const c=a.rows[yy][xx];if(c==='.')continue;const dx=a.ox+xx;fn(x+(pose.mirrored?-dx-1:dx),y+a.oy+yy,pose.palette[c],c);}}
