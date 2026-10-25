/** M-9 / Must D-40 (2026-10-14 02:37/02:59/03:05, team call): 森崎 拼命扑救 (desperate body block).
 * Trigger (arming): 森崎 is the defending keeper standing in his goal, a Tsubasa special shot is in flight towards that goal and
 * the ball is in the shooting range (oriented x in [0x290,0x350), mirrored for the left goal). Anime source is only the 立花 twin
 * shot (ep.39); other eligible specials = 团队拍板、未核. D-40 narrowed (project 2026-10-14): specials with a signed keeper-outcome rule
 * are exempt - drive (D-31/D-32), razor (D-37), tiger (D-25), cannon (D-38); see TSUBASA_MORISAKI_SAVE.exemptMoves.
 * Sequence: s1 ready (project HD, keeper held where he stood) while the special keeps its own flight/art -> s2 「大」 for
 * blockFrames when the ball reaches his body plane within reach (M-9 takes the ball there: special session ends, ball native
 * F00, loose) -> s3 side knock-back shown while the keeper runs the NATIVE knock-back 0x59 (its jump, duration and the native
 * fall 0x04 after it are untouched; only its direction byte is set so he goes back into his goal) -> ball rebounds loose.
 * If 石崎 is on the defending team within 0x40 px (planar, Euclidean) of the ball at the rebound, he blocks it with his face on
 * the native header action 0x34 (frames 2->3->13, contact on 13), no fall afterwards, ball loose. Otherwise the rebound ball
 * is left to the native loose-ball logic. If the special passes wide/over him or ends first, M-9 releases (native result).
 * Not done (D-40): no reduced-power-continues-to-goal; no forced goal or save. This module never writes goal/score/$7FF state.
 * Art (s1/s2/s3) = 美术演绎、未核; the in-goal test, body plane/reach, s2 hold, rebound/deflection velocities and the knock-back
 * direction = 团队拍板、未核 (poteto numbers) (TSUBASA_MORISAKI_SAVE). Own path only: nothing runs unless Tsubasa special moves are enabled
 * AND a special shot is active, so ordinary play (2940-frame baseline) never reaches it.
 * Known global debt (not fixed here): the display lags RAM by one frame (first s2 frame still shows the special's ball frame). */
import {getTsubasaActorIdentity,isTsubasaSpecialMovesEnabled} from './tsubasa-gameplay-context.js';
import {TSUBASA_MORISAKI_SAVE,TSUBASA_SHOOTING_RANGE} from '../data/tsubasa-special-moves.js';
import {getTsubasaSpecialState,endTsubasaSpecialShot} from './tsubasa-special-moves.js';
const M=TSUBASA_MORISAKI_SAVE;
const states=new WeakMap();
const w=(r,l,h)=>r[l]|r[h]<<8,signed=v=>v&32768?v-65536:v;
const put=(r,l,h,v)=>{v=Math.round(v);r[l]=v&255;r[h]=(v>>8)&255;};
const pos=(r,s)=>({x:signed(w(r,0x314+s,0x327+s)),y:signed(w(r,0x34d+s,0x360+s)),z:signed(w(r,0x386+s,0x399+s))});
const place=(r,s,x,y,z)=>{put(r,0x314+s,0x327+s,x);put(r,0x34d+s,0x360+s,y);r[0x301+s]=r[0x33a+s]=0;if(z!=null){put(r,0x386+s,0x399+s,z);r[0x373+s]=0;for(const a of [0x420,0x42e])r[a+s]=0;}};
const still=(r,s)=>{for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+s]=0;};
const action=(r,s)=>r[0x459+s]&127;
const cid=(r,s)=>getTsubasaActorIdentity(r,s)?.characterId??null;
const speed=r=>Math.hypot(signed(w(r,0x3e8+12,0x3f6+12))/256,signed(w(r,0x404+12,0x412+12))/256);
/** Down / stunned set (same as M-8, 团队拍板、未核). */
const DOWN=[6,0x3c,0x3d,0x59,0x5a,0x04,0x05];
/** Pure D-40 trigger check. owner = the shooter slot of the active special shot. */
export function evaluateTsubasaMorisakiSaveTrigger(r,owner,moveId='special'){
 if(!moveId||moveId==='basic-shot')return {ok:false,reason:'not-special'};
 if(M.exemptMoves.includes(moveId))return {ok:false,reason:'exempt-move'};/* D-40 narrowed (project): signed keeper-outcome rules win */
 const keeper=10+((owner&1)^1);if(cid(r,keeper)!=='morisaki')return {ok:false,reason:'keeper-not-morisaki',keeper};
 const left=!(r[0x57]&32)&&!!(owner&1)/* native faceTeamAttack: shooter attacks the LEFT goal */;
 const k=pos(r,keeper),kox=left?1023-k.x:k.x;
 if(DOWN.includes(action(r,keeper))||k.z>M.inGoal.maxZ)return {ok:false,reason:'keeper-down-or-airborne',keeper};
 if(kox<M.inGoal.minOrientedX||k.y<M.inGoal.minY||k.y>M.inGoal.maxY)return {ok:false,reason:'keeper-not-in-goal',keeper,keeperOrientedX:kox};
 const b=pos(r,12),ox=left?1023-b.x:b.x;
 if(ox<TSUBASA_SHOOTING_RANGE.from||ox>=TSUBASA_SHOOTING_RANGE.to)return {ok:false,reason:'out-of-shooting-range',orientedX:ox,keeper,left};
 return {ok:true,keeper,left,orientedX:ox,owner,moveId};}
/** Pure D-40 石崎 check at the rebound: first 石崎 on the keeper's (defending) side, not down, ball within 0x40 px. */
export function evaluateTsubasaMorisakiSaveIshizaki(r,keeper){
 for(let s=keeper&1;s<10;s+=2){if(cid(r,s)!=='ishizaki'||DOWN.includes(action(r,s)))continue;const p=pos(r,s),b=pos(r,12),d=Math.hypot(b.x-p.x,b.y-p.y);return {slot:s,distance:d,blocks:d<=M.ishizakiReach};}
 return {slot:null,distance:null,blocks:false};}
export function getTsubasaMorisakiSaveState(r){return states.get(r)??null;}
export function resetTsubasaMorisakiSave(r){states.delete(r);}
function loose(r){r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;r[0x465]=6|128;r[0x492]=0;}
function ballVel(r,vx,vy,vz,g){put(r,0x3e8+12,0x3f6+12,vx*256);put(r,0x404+12,0x412+12,vy*256);put(r,0x420+12,0x42e+12,vz*256);put(r,0x43c+12,0x44a+12,g);r[0x4bd+12]=0;}
/** Native 0x59 init (player-actions $A0xx) keeps bits 6..5 of $496 and sets bit7 = 1 ^ facing bit ($4A3): direction index
 * (bits 7..5) 2 = +x, 6 = -x. Before setting 0x59 we pick bits 6..5 = 10 and the facing bit so that he is knocked straight back into
 * his goal (away from the shot) instead of along whatever stale walking direction the native AI left in $496. 团队拍板、未核. */
function knockDirection(r,s){const want=s.dir>0?2:6,b7=(want>>2)&1;r[0x496+s.keeper]=(r[0x496+s.keeper]&0x9f)|0x40;r[0x4a3+s.keeper]=(r[0x4a3+s.keeper]&127)|((1^b7)<<7);}
/** Closed-loop path: reach target in n frames (same integrator as M-8's ballTo). */
function ballTo(r,target,n){const b=pos(r,12),g=M.gravity/256;n=Math.max(1,n);ballVel(r,(target.x-b.x)/n,(target.y-b.y)/n,((target.z-b.z)+g*n*(n-1)/2)/n,M.gravity);}
function hold(r){for(const a of [0x3e8,0x3f6,0x404,0x412,0x420,0x42e,0x43c,0x44a])r[a+12]=0;}
/** Per frame, before player/ball updates (match-actors). Arms on the trigger (s1), then runs the block sequence. While armed the
 * special shot keeps flying on its own path and art (M-12); only when it actually reaches 森崎's body does M-9 take the ball. */
export function stepTsubasaMorisakiSave(r){
 if(!isTsubasaSpecialMovesEnabled(r))return;let s=states.get(r);
 if(!s||s.done&&s.phase!=='s1'&&s.shotId!==getTsubasaSpecialState(r)?.id){const sp=getTsubasaSpecialState(r);if(!sp||s?.shotId===sp.id)return;
  const g=evaluateTsubasaMorisakiSaveTrigger(r,sp.owner,sp.moveId);if(!g.ok)return;
  const b=pos(r,12),k=pos(r,g.keeper);
  s={done:false,phase:'s1',t:0,shotId:sp.id,moveId:sp.moveId,shooter:sp.owner,keeper:g.keeper,left:g.left,dir:g.left?-1:1,hold:{x:k.x,y:k.y},
   startFrame:r[0x300],ishizaki:null,result:null,log:[{t:0,frame:r[0x300],event:'trigger',moveId:sp.moveId,shooter:sp.owner,keeper:g.keeper,left:g.left,orientedX:g.orientedX,ball:b,keeperPos:k,ballSpeed:speed(r)}]};
  states.set(r,s);return;}
 if(s.done)return;s.t++;const t=s.t,b=pos(r,12);
 if(s.phase==='s2'){r[0x465]=6|128;hold(r);
  if(t-s.contactT>=M.blockFrames){s.phase='s3';s.reboundT=t;
   r[0x4d6]=s.keeper;/* he touched it last */knockDirection(r,s);r[0x459+s.keeper]=0x59;r[0x87+s.keeper]=r[0x94+s.keeper]=r[0x46c+s.keeper]=0;/* native knock-back action, set fresh */
   const is=evaluateTsubasaMorisakiSaveIshizaki(r,s.keeper);s.ishizakiCheck=is;s.log.push({t,frame:r[0x300],event:'knock-back',action:0x59,ishizaki:is,ball:b});
   if(is.blocks){s.ishizaki=is.slot;r[0x459+is.slot]=0x34;r[0x87+is.slot]=r[0x94+is.slot]=r[0x46c+is.slot]=0;still(r,is.slot);s.headerT=t;s.log.push({t,frame:r[0x300],event:'ishizaki-header-start',action:0x34,slot:is.slot});
    const p=pos(r,is.slot);loose(r);ballTo(r,{x:p.x,y:p.y,z:M.headZ},M.headerStrikeDelay);}
   else{loose(r);ballVel(r,-s.dir*M.rebound.vx,0,M.rebound.vz,M.gravity);s.log.push({t,frame:r[0x300],event:'rebound-loose'});s.done=true;s.result='rebound-native-loose';}}
  return;}
 if(s.phase==='s3'&&s.ishizaki!=null&&!s.headed){const p=pos(r,s.ishizaki);
  if(action(r,s.ishizaki)!==0x34){s.done=true;s.result='ishizaki-missed';s.log.push({t,frame:r[0x300],event:'ishizaki-missed'});return;}
  r[0x465]=6|128;ballTo(r,{x:p.x,y:p.y,z:M.headZ},Math.max(1,s.headerT+M.headerStrikeDelay-t+1));}
}
/** Called right before the special ball integrates (ball-runtime, action 5, after the special's own steering): if this step
 * would carry the ball through 森崎's body plane within his reach, the step is shortened (whole velocity scaled) so the ball
 * stops ON the plane - no overshoot, no set-back jump. Other frames are untouched. */
export function clampTsubasaMorisakiSaveApproach(r,x=12){const s=states.get(r);if(x!==12||!s||s.done||s.phase!=='s1')return;
 const f=(l,h,sub)=>signed(w(r,l,h))+(sub!=null?r[sub]/256:0),bx=f(0x314+12,0x327+12,0x301+12),by=f(0x34d+12,0x360+12,0x33a+12),bz=f(0x386+12,0x399+12,0x373+12);
 const vx=signed(w(r,0x3e8+12,0x3f6+12))/256,vy=signed(w(r,0x404+12,0x412+12))/256,vz=signed(w(r,0x420+12,0x42e+12))/256,plane=s.hold.x-s.dir*M.chestDX;
 const ob=(plane-bx)*s.dir,ov=vx*s.dir;if(ob<0||ov<=ob||ov<=0)return;const k=ob/ov;
 if(Math.abs(by+vy*k-s.hold.y)>M.bodyReach.y||bz+vz*k>M.bodyReach.z)return;
 put(r,0x3e8+12,0x3f6+12,vx*k*256);put(r,0x404+12,0x412+12,vy*k*256);put(r,0x420+12,0x42e+12,vz*k*256);s.clamped=(s.clamped??0)+1;}
/** s1 -> s2: the (still special) ball reaches 森崎's body plane (oriented x >= keeper - chestDX) within his reach. Checked at
 * the frame tail after the ball integrated. The ball is set back onto the body plane (at most one frame of travel). */
function bodyContact(r,s){const b=pos(r,12),k=s.hold,ob=s.left?1023-b.x:b.x,ok=(s.left?1023-k.x:k.x)-M.chestDX;
 if(ob<ok)return null;if(Math.abs(b.y-k.y)<=M.bodyReach.y&&b.z<=M.bodyReach.z)return {ball:b,x:k.x-s.dir*M.chestDX};return {passed:true,ball:b};}
/** Frame tail (after all updates, before OAM assembly): hold the keeper, 石崎's contact at his frame 13, poses. */
export function applyTsubasaMorisakiSaveFrame(r){const s=states.get(r);if(!s)return false;s.pose=null;
 if(s.phase==='s1'&&!s.done){const sp=getTsubasaSpecialState(r),c=bodyContact(r,s);
  if(c?.passed||!c&&(!sp||sp.id!==s.shotId)){s.phase='released';s.done=true;s.result=c?.passed?'ball-passed-keeper':'special-ended-before-contact';s.log.push({t:s.t,frame:r[0x300],event:s.result,ball:pos(r,12)});return true;}
  if(c){endTsubasaSpecialShot(r,'morisaki-save');loose(r);put(r,0x314+12,0x327+12,c.x);r[0x301+12]=0;hold(r);s.phase='s2';s.contactT=s.t;r[0x74+12]=0;/* native ball frame F00 (the special art ends at the block) */s.contactShift=Math.abs(c.x-c.ball.x);
   s.log.push({t:s.t,frame:r[0x300],event:'body-contact',ball:c.ball,placed:{x:c.x,y:c.ball.y,z:c.ball.z},keeperPos:pos(r,s.keeper)});}}
 if(s.phase==='s2')r[0x74+12]=0;
 if(s.phase==='s1'||s.phase==='s2'){place(r,s.keeper,s.hold.x,s.hold.y,0);still(r,s.keeper);s.pose={slot:s.keeper,key:s.phase,mirrored:!s.left};}
 else if(s.phase==='s3'){if(action(r,s.keeper)===0x59&&(s.t-s.reboundT)<M.s3MaxFrames)s.pose={slot:s.keeper,key:'s3',mirrored:!s.left};else if(!s.s3End){s.s3End=s.t;s.log.push({t:s.t,frame:r[0x300],event:'s3-end',keeperAction:action(r,s.keeper)});}
  if(s.ishizaki!=null&&!s.headed&&!s.done){const df=r[0x74+s.ishizaki]&127,b=pos(r,12),p=pos(r,s.ishizaki);
   const nativeHit=r[0x4d6]===s.ishizaki&&(r[0x465]&127)===5;/* native 0x34 contact kind 1 = header SHOT: converted to the face block */
   if(nativeHit||df===13&&Math.hypot(b.x-p.x,b.y-p.y)<=M.headReach.planar&&Math.abs(b.z-(p.z+M.headZ))<=M.headReach.z){s.headed=true;s.headT=s.t;loose(r);r[0x4d6]=s.ishizaki;ballVel(r,-s.dir*M.deflect.vx,(b.y<p.y?-1:1)*M.deflect.vy,M.deflect.vz,M.gravity);s.done=true;s.result='ishizaki-face-block';s.log.push({t:s.t,frame:r[0x300],event:'ishizaki-face-block',native:nativeHit,displayFrame:df,ball:b,ishizakiPos:p});}}}
 if(s.done&&!s.pose&&s.phase!=='s3'){}
 return true;}
/** Ball contact filter (ball-collision scanBallPlayerContacts): the blocking keeper never catches the ball during s1/s2 nor on
 * the first M.reboundIgnoreFrames frames of the rebound (the block IS his contact; D-40: no catch, no forced save). 石崎 only
 * touches the ball on his header frame 13. */
export function tsubasaMorisakiSaveIgnores(r,slot){const s=states.get(r);if(!s)return false;if(s.ishizaki!=null&&slot===s.ishizaki)return s.headed?s.t-s.headT<M.reboundIgnoreFrames:(r[0x74+slot]&127)!==13;/* 石崎 meets the ball on 0x34's frame 13 (f2->f3->f13) */if(slot!==s.keeper)return false;return s.phase==='s1'||s.phase==='s2'||s.phase==='s3'&&s.t-s.reboundT<M.reboundIgnoreFrames;}
/** Pose for the renderer this frame: {slot,key:'s1'|'s2'|'s3',mirrored} or null. Right goal = mirrored (project's flip rule). */
export function getTsubasaMorisakiSavePose(r){return states.get(r)?.pose??null;}
/** True while the move (including the s3 knock-back display) still runs; review fixtures keep stepping meanwhile. */
export function isTsubasaMorisakiSaveRunning(r){const s=states.get(r);return !!s&&(!s.done||!!s.pose);}
