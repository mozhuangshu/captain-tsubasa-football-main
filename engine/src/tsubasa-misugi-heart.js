/** M-10 / Must D-41 (2026-10-14 04:33, team call; everything 未核 unless noted): 三杉 heart condition + 武藏 offside trap.
 * Own path only: every hook below is a no-op unless Tsubasa special moves are enabled AND one side is 武藏 (team 10) with 三杉
 * (characterId 'misugi') on that side's field slots. The 2940-frame ordinary baseline runs with special moves off -> zero writes.
 * Timer (item 1, GROUNDWORK §1, project 04:44): limit = one half of RUNNING main clock = 2400 logic frames, counted only on frames where
 *   the native main clock is decremented (updateMatchClock_D6E7 main branch). Stoppage time excluded. Kick-off/goal pauses don't count.
 * Knockdown (item 3): an opponent body contact that knocks 三杉 down (resolvePlayerAttackContact -> native 0x3c on him) consumes
 *   ceil(25% of the remaining limit) at once (团队拍板). Ball hits (0x59 etc.) are not body contact.
 * Expiry (item 3): h2 (project v1.3, 美术演绎、未核) plays ONCE for H2_FRAMES while he is held in place, then phase 'seized' to the final
 *   whistle: shot power and run strength = min(his current value, #4 nameless 武藏 field player story-mode value), never higher
 *   (project 04:44, 团队拍板). No fall, no substitution. RAM attribute bytes are NOT written (0x4e4 is also stamina/contact).
 * Trap (items 4-7): only 武藏 defending, only while 三杉 is on the pitch and not yet seized. Decided by this AI on an opposing forward
 *   pass to a team-mate (also when a human controls 武藏; no new button). The last two OUTFIELD 武藏 defenders step up together for
 *   STEP_FRAMES on the native run cycle f30->f0->f31->f0 (2 logic frames each; o1). At the end of the step the receiver is judged:
 *   offside line = nearer-to-own-goal of (2nd-last 武藏 player INCLUDING the keeper) and (ball x at the pass); only in 武藏's half
 *   (团队拍板、未核). Offside -> OFFSIDE overlay (o2) + whistle sound 0x2d (the native out-of-play whistle; listening 未核), no linesman,
 *   restart = NATIVE GOAL KICK (item 7: the original has no defending-side free kick at an arbitrary spot): ball dead at the receiver,
 *   native out-of-play script 0x48 with the passer as last toucher -> prepareRestart_Bank01_BE88 gives 武藏 the goal kick.
 *   Not offside / ball intercepted -> trap failed, native play simply continues.
 * Never writes goal/score/$7FF. The only game-script write is the native out-of-play value 0x48 (same as goal.js setGameScript(r,0)). */
import {getTsubasaActorIdentity,isTsubasaSpecialMovesEnabled} from './tsubasa-gameplay-context.js';
import {TSUBASA_STORY_STATS} from './tsubasa-story-stats.js';
export const MUSASHI_TEAM=10;
const n4=TSUBASA_STORY_STATS.generic.find(p=>p.teamId===MUSASHI_TEAM&&p.playerNumber===4);
/** One switchable constant (project may change it): post-expiry caps = #4 nameless 武藏 field player, story-mode values. */
export const MISUGI_SEIZED_CAP=Object.freeze({playerNumber:4,hp:n4.hp/* 50 story-mode (original 70) */,label:'团队拍板'});
export const TSUBASA_MISUGI_HEART=Object.freeze({limitFrames:2400,knockdownCut:0.25,h2Frames:40,stepFrames:8,stepPx:2,runCycle:Object.freeze([30,30,0,0,31,31,0,0]),
 attemptWindow:0x30,overlayFrames:60,whistle:0x2d,half:512,label:'团队拍板、未核'});
const T=TSUBASA_MISUGI_HEART,states=new WeakMap();
const w=(r,l,h)=>r[l]|r[h]<<8,signed=v=>v&32768?v-65536:v,put=(r,l,h,v)=>{v=Math.round(v);r[l]=v&255;r[h]=(v>>8)&255;};
const X=(r,s)=>signed(w(r,0x314+s,0x327+s)),Y=(r,s)=>signed(w(r,0x34d+s,0x360+s));
function musashiSide(r){for(const side of [0,1])if((r[0x52c+side]&15)===MUSASHI_TEAM)return side;return -1;}
function misugiSlot(r,side){for(let s=side;s<10;s+=2)if(getTsubasaActorIdentity(r,s)?.characterId==='misugi')return s;return -1;}
function n4Slot(r,side){for(let s=side;s<10;s+=2)if(r[0x532+s]===MISUGI_SEIZED_CAP.playerNumber)return s;return -1;}
/** oriented coordinate: grows toward 武藏's own goal (home side 0 defends the left goal, away side 1 the right goal; GROUNDWORK §5). */
const toward=(side,x)=>side===1?x:1023-x;
function ctx(r){if(!isTsubasaSpecialMovesEnabled(r))return null;const side=musashiSide(r);if(side<0)return null;const m=misugiSlot(r,side);
 let st=states.get(r);if(!st){st={side,misugi:m,elapsed:0,phase:'fit',h2Left:0,h2Start:null,trap:null,overlay:0,log:[],frame:0};states.set(r,st);}
 st.side=side;st.misugi=m;return st;}
export function resetTsubasaMisugiHeart(r){states.delete(r);}
export function getTsubasaMisugiHeartState(r){return states.get(r)??null;}
export function setTsubasaMisugiHeartElapsed(r,frames){const st=ctx(r);if(st)st.elapsed=frames;return st;}
export function remainingTsubasaMisugiFrames(r){const st=states.get(r);return st?Math.max(0,T.limitFrames-st.elapsed):null;}
function startH2(r,st,why){st.phase='h2';st.h2Left=T.h2Frames;st.h2Start=null;st.hold={x:X(r,st.misugi),y:Y(r,st.misugi)};st.trap=null;st.log.push({event:'expire',why,frame:st.frame,elapsed:st.elapsed});}
/** match-frame-helpers updateMatchClock_D6E7, main-clock branch only (one running clock frame). */
export function noteTsubasaMisugiClockFrame(r){const st=states.get(r)??ctx(r);if(!st||st.misugi<0||!isTsubasaSpecialMovesEnabled(r))return;
 if(st.phase!=='fit')return;st.elapsed++;if(st.elapsed>=T.limitFrames)startH2(r,st,'clock');}
/** player-collision resolvePlayerAttackContact, after the native knock-down (0x3c) of target y by attacker x. */
export function noteTsubasaMisugiKnockdown(r,x,y){const st=states.get(r)??ctx(r);if(!st||st.phase!=='fit'||y!==st.misugi||((x^y)&1)===0)return;
 const before=Math.max(0,T.limitFrames-st.elapsed),cut=Math.ceil(before*T.knockdownCut);st.elapsed+=cut;const after=Math.max(0,T.limitFrames-st.elapsed);
 st.log.push({event:'knockdown',frame:st.frame,attacker:x,remainingBefore:before,cut,remainingAfter:after});if(st.elapsed>=T.limitFrames)startH2(r,st,'knockdown');}
const seized=(r,s)=>{const st=states.get(r);return !!st&&isTsubasaSpecialMovesEnabled(r)&&st.phase!=='fit'&&s===st.misugi;};
/** ball-actions selectShotSpecial: the HP added to the shot power. */
export function tsubasaMisugiShotHP(r,owner){const v=r[0x4e4+owner];return seized(r,owner)?Math.min(v,MISUGI_SEIZED_CAP.hp):v;}
/** player-actions updatePlayerPlanarSpeed: strengthFor(slot) recomputes the run strength with another slot's speed. */
export function tsubasaMisugiRunStrength(r,x,strength,strengthFor){if(!seized(r,x))return strength;const st=states.get(r),q=n4Slot(r,st.side);return q<0?strength:Math.min(strength,strengthFor(q));}
/** ball-actions initializePassAction (after launchPass): the AI decides whether 武藏 springs the trap. */
export function noteTsubasaMisugiPass(r,out){const st=states.get(r)??ctx(r);if(!st)return;const passer=r[0x4d6],side=st.side;
 const why=(()=>{if(st.misugi<0)return 'misugi-off-pitch';if(st.phase!=='fit')return 'misugi-seized';if(passer>9||(passer&1)===side)return 'not-opponent-pass';
  if(st.trap&&!st.trap.done)return 'trap-running';const t=out?.target;if(t==null||t===255||t>9||(t&1)!==(passer&1))return 'no-receiver';
  if(toward(side,X(r,t))<=toward(side,X(r,passer)))return 'not-forward';const line=offsideLine(r,side,toward(side,X(r,12)));if(toward(side,X(r,t))<line.line-T.attemptWindow)return 'receiver-far-from-line';return null;})();
 st.log.push({event:'pass',frame:st.frame,passer,target:out?.target,decision:why??'trap'});if(why)return;
 const def=lastTwoOutfield(r,side);st.trap={passer,receiver:out.target,ballA:toward(side,X(r,12)),defenders:def,start:def.map(s=>({x:X(r,s),y:Y(r,s)})),t:0,done:false,result:null};}
export function lastTwoOutfield(r,side){const s=[];for(let q=side;q<10;q+=2)s.push(q);return s.sort((a,b)=>toward(side,X(r,b))-toward(side,X(r,a))).slice(0,2);}
/** line = nearer-to-own-goal of the 2nd-last 武藏 player (keeper included) and the ball. */
export function offsideLine(r,side,ballA){const all=[];for(let q=side;q<12;q+=2)all.push(toward(side,X(r,q)));all.sort((a,b)=>b-a);return {secondLast:all[1],ball:ballA,line:Math.max(all[1],ballA)};}
/** match-actors, before the players: overlay timer + trap judging. Returns sound events (never writes $7FF). */
export function stepTsubasaMisugiHeart(r){const st=states.get(r)??ctx(r),events=[];if(!st||!isTsubasaSpecialMovesEnabled(r))return events;st.frame++;if(st.overlay>0)st.overlay--;
 const tr=st.trap;if(tr&&!tr.done){
  if((r[0x59]&127)!==2||(r[0x5c]&64)){tr.done=true;tr.result='native-stop';st.log.push({event:'trap-cancel',frame:st.frame});}
  else if(r[0x4d6]<12&&(r[0x4d6]&1)===st.side&&(r[0x465]&127)!==4){tr.done=true;tr.result='failed-intercepted';st.log.push({event:'trap-failed',frame:st.frame,why:'intercepted'});}
  else if(tr.t>=T.stepFrames){tr.done=true;const line=offsideLine(r,st.side,tr.ballA),ra=toward(st.side,X(r,tr.receiver)),off=ra>line.line&&ra>T.half;tr.judge={...line,receiverA:ra};
   if(!off){tr.result='failed-onside';st.log.push({event:'trap-failed',frame:st.frame,why:'onside',...tr.judge});}
   else{tr.result='offside';st.overlay=T.overlayFrames;events.push({type:'sound',soundId:T.whistle});
    // native goal kick: ball dead at the receiver, passer = last toucher, out-of-play script (as goal.js setGameScript(r,0)).
    const bx=X(r,tr.receiver),by=Math.max(48,Math.min(348,Y(r,tr.receiver)));put(r,0x314+12,0x327+12,bx);put(r,0x34d+12,0x360+12,by);put(r,0x386+12,0x399+12,0);
    for(const a of [0x3e8,0x3f6,0x404,0x412,0x420,0x42e])r[a+12]=0;r[0x4d6]=tr.passer;if(!(r[0x5c]&64))r[0x5c]=(r[0x5c]&128)|0x48;
    for(const [src,dst] of [[0x314,0x517],[0x327,0x518],[0x34d,0x519],[0x360,0x51a]])r[dst]=r[src+12];
    st.log.push({event:'offside',frame:st.frame,...tr.judge,spot:{x:bx,y:by},restart:'native-goal-kick'});}}}
 return events;}
/** match-actors, after all players moved: h2 hold, o1 step-up (positions + native run-cycle frame bytes). */
export function afterTsubasaMisugiPlayers(r){const st=states.get(r);if(!st||!isTsubasaSpecialMovesEnabled(r))return;
 if(st.phase==='h2'){const s=st.misugi;put(r,0x314+s,0x327+s,st.hold.x);put(r,0x34d+s,0x360+s,st.hold.y);for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+s]=0;
  if(st.h2Start==null)st.h2Start=st.frame;st.h2Left=T.h2Frames-(st.frame-st.h2Start);if(st.h2Left<=0){st.phase='seized';st.log.push({event:'seized',frame:st.frame});}}
 const tr=st.trap;if(tr&&!tr.done&&tr.t<T.stepFrames){tr.t++;const dir=st.side===1?-1:1;/* toward midfield */
  tr.defenders.forEach((s,i)=>{put(r,0x314+s,0x327+s,tr.start[i].x+dir*T.stepPx*tr.t);put(r,0x34d+s,0x360+s,tr.start[i].y);for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+s]=0;
   r[0x74+s]=(dir<0?128:0)|T.runCycle[(tr.t-1)%T.runCycle.length];r[0x4a3+s]=(r[0x4a3+s]&127)|(dir<0?128:0);});}}
/** renderer queries */
export function getTsubasaMisugiHeartPose(r){const st=states.get(r);if(!st||st.phase!=='h2'||!isTsubasaSpecialMovesEnabled(r))return null;return {slot:st.misugi,mirrored:!!(r[0x4a3+st.misugi]&128)};}
export function getTsubasaMisugiOverlay(r){const st=states.get(r);if(!st||!isTsubasaSpecialMovesEnabled(r)||st.misugi<0)return null;
 return {offside:st.overlay>0,countdown:st.phase==='seized'?null:Math.max(0,T.limitFrames-st.elapsed)};}
