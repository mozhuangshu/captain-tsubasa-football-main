/** M-8 / Must D-39 (revised 19:00, team call): 立花 triangle shot (三角射门). One of the twins (the carrier) lifts the
 * ball; the other one of the twins kicks off the nearer post (project f1) and heads it DOWN AS A PASS with native action
 * 0x34; the twin who lifted it runs in and volleys on native action 0x38 at its strike frame 13. The volley is a native
 * shot: native keeper judgement, no guaranteed goal. Break (D-39 #4): 石崎 on the defending side within 0x40 px of the
 * kicked post at the kick moment kicks the post (project f2); the post shakes +-1 px for 3 frames; the twin on the post is
 * knocked off (project f3, held TRI.shakenFrames), then native knock-back 0x59 + native fall; the ball goes loose.
 * Art and post shake: 美术演绎、未核. Own path only: nothing here runs unless Tsubasa special moves are enabled and the
 * D-39 trigger holds, so ordinary play (2940-frame baseline) never reaches it.
 *
 * Native facts used (RAM-measured, runtime frame tables): action 0x34 shows frames 2,3x7,13x3 and is
 * the only header action with a ball contact kind (CONTACT_KINDS[0x34*2]=1 -> native header SHOT); 0x38 shows 2x4,3x4,13x2
 * and has no ball contact kind (255). So the header contact is converted to a pass here, and the volley contact at 0x38's
 * frame 13 performs exactly what a native kind-1 contact does (owner := volleyer, ball action 5) so the native shot,
 * aim and keeper rules take over.
 *
 * 美术演绎、未核 (scripted on the special path, not native): the lift and pass ball paths (closed-loop ballTo), the up-to-4 px/frame
 * push-off approach of the twin to the post, the 48 px run-in of the volleying twin, and the snap of 石崎 onto his post spot.
 * 团队拍板、未核: the down/stunned action set TRIANGLE_DOWN_ACTIONS.
 * Known keeper start positions that break the sequence (right goal, 森崎, review fixture), 团队拍板、未核: (872,205) the keeper's
 * native jump collides with the heading twin (header blocked, result header-missed); (868,196) the ball is lost before the header.
 * Known native behaviour, 团队拍板、未核: a keeper in front of goal always goes for the header when nobody else is near (loose-ball
 * react rule in assignLooseBallAI); a defender sent as chaser near the post does not stop it (notes DEFENDER-SEARCH.md).
 * D-39 qualifier, 团队拍板、未核: whether the keeper is in front of goal at the volley is decided by the original loose-ball rule. In all
 * 26 test runs he had already been pulled out by the header. The case where he stays in front of goal and faces the volley could not be
 * produced and is untested. This module writes no goal/score state; after the volley contact it is done and the shot is native.
 * The heading twin keeps the native facing (towards the attacked goal, not back to the lifter): 原版朝向、与动画头球回传姿态未核. */
import {getTsubasaActorIdentity} from './tsubasa-gameplay-context.js';
import {TSUBASA_TRIANGLE,TSUBASA_SHOOTING_RANGE} from '../data/tsubasa-special-moves.js';
const T=TSUBASA_TRIANGLE;
const states=new WeakMap();
const w=(r,l,h)=>r[l]|r[h]<<8,signed=v=>v&32768?v-65536:v;
const put=(r,l,h,v)=>{v=Math.round(v);r[l]=v&255;r[h]=(v>>8)&255;};
const pos=(r,s)=>({x:signed(w(r,0x314+s,0x327+s)),y:signed(w(r,0x34d+s,0x360+s)),z:signed(w(r,0x386+s,0x399+s))});
const place=(r,s,x,y,z)=>{put(r,0x314+s,0x327+s,x);put(r,0x34d+s,0x360+s,y);r[0x301+s]=r[0x33a+s]=0;if(z!=null){put(r,0x386+s,0x399+s,z);r[0x373+s]=0;}};
const still=(r,s)=>{for(const a of [0x3e8,0x3f6,0x404,0x412])r[a+s]=0;};
const action=(r,s)=>r[0x459+s]&127;
const cid=(r,s)=>getTsubasaActorIdentity(r,s)?.characterId??null;
const TWINS=['tachibana_masao','tachibana_kazuo'];
/** Down / stunned (D-39 #1): 6 (shocked), 0x3c/0x3d (fall), 0x59/0x5a (knock-back). This set is 团队拍板、未核. */
export const TRIANGLE_DOWN_ACTIONS=Object.freeze([6,0x3c,0x3d,0x59,0x5a]);
const down=(r,s)=>TRIANGLE_DOWN_ACTIONS.includes(action(r,s));
/** Team attack direction of a slot (native faceTeamAttack): true = attacks the LEFT goal. */
export const attacksLeft=(r,s)=>!(r[0x57]&32)&&!!(s&1);
/** Post ground points of the attacked goal (native goal-mouth y 0xA4/0xE4, x on the sloped field edge, goal.js). */
export function trianglePosts(left){return [0xa4,0xe4].map(y=>({y,x:left?160-((y-48)>>3):864+((y-48)>>3),which:y===0xa4?'top':'bottom',left}));}
/** Rendered post bar outlines in world x relative to the post point (measured on the real field render,
 * triangle-v1 README (post bar measurement)): field = the 1 px outline facing the pitch, inner = the outline facing into the goal. */
export const TRIANGLE_POST_EDGES=Object.freeze({right:{top:{field:5,inner:8},bottom:{field:5,inner:9}},left:{top:{field:-6,inner:-9},bottom:{field:-6,inner:-10}}});
export function trianglePostEdges(post){const e=TRIANGLE_POST_EDGES[post.left?'left':'right'][post.which];return {field:post.x+e.field,inner:post.x+e.inner};}
/** Anchor x so the authored sole's outer edge sits 1 px off the post outline (gap 0): f1 twin on the pitch side, f2 石崎
 * inside the goal. Runtime mirror convention: px = x + (mirrored ? -dx-1 : dx). */
export function triangleSoleAnchor(post,who){const e=trianglePostEdges(post);
 if(who==='twin')return post.left?{x:e.field+1+T.art.f1SoleX+1,mirrored:true}:{x:e.field-1-T.art.f1SoleX,mirrored:false};
 return post.left?{x:e.inner-1-T.art.f2SoleX,mirrored:false}:{x:e.inner+1+T.art.f2SoleX+1,mirrored:true};}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Pure D-39 trigger check (#1-#3, #5). Distances in px from the post point (Euclidean, planar). */
export function evaluateTsubasaTriangleTrigger(r,owner){
 const me=cid(r,owner);if(!TWINS.includes(me))return {ok:false,reason:'carrier-not-twin'};
 const otherId=TWINS.find(t=>t!==me);let partner=-1;for(let s=owner&1;s<12;s+=2)if(s!==owner&&cid(r,s)===otherId){partner=s;break;}
 if(partner<0)return {ok:false,reason:'other-twin-not-on-team'};
 if(down(r,owner)||down(r,partner))return {ok:false,reason:'twin-down'};
 const left=attacksLeft(r,owner),c=pos(r,owner),ox=left?1023-c.x:c.x;
 if(ox<TSUBASA_SHOOTING_RANGE.from||ox>=TSUBASA_SHOOTING_RANGE.to)return {ok:false,reason:'out-of-shooting-range',orientedX:ox};
 const q=pos(r,partner),posts=trianglePosts(left).map(p=>({...p,d:dist(q,p)})).sort((a,b)=>a.d-b.d),post=posts[0];
 if(post.d>T.postReach)return {ok:false,reason:'twin-too-far-from-post',distance:post.d,orientedX:ox};
 return {ok:true,carrier:owner,partner,post,distance:post.d,left,orientedX:ox};}
/** Pure D-39 #4 break check at the kick moment. */
export function evaluateTsubasaTriangleBreak(r,twinSlot,post){
 for(let s=(twinSlot&1)^1;s<12;s+=2){if(cid(r,s)!=='ishizaki'||down(r,s))continue;const d=dist(pos(r,s),post);if(d<=T.ishizakiReach)return {broken:true,slot:s,distance:d};return {broken:false,slot:s,distance:d};}
 return {broken:false,slot:null,distance:null};}
export function getTsubasaTriangleState(r){return states.get(r)??null;}
export function resetTsubasaTriangle(r){states.delete(r);}
/** Called from beginTsubasaShot (native shot start). Returns true when the shot became the triangle lift. */
export function tryStartTsubasaTriangle(r,owner){
 const prev=states.get(r);if(prev?.volleyPending&&owner===prev.carrier){prev.volleyPending=false;prev.volleyShot=r[0x300];prev.log.push({t:prev.t,frame:r[0x300],event:'volley-native-shot'});return false;}if(prev&&!prev.done)return false;
 const g=evaluateTsubasaTriangleTrigger(r,owner);if(!g.ok)return false;
 const twin=triangleSoleAnchor(g.post,'twin'),spot={x:twin.x,y:g.post.y},q=pos(r,g.partner),approach=Math.max(1,Math.ceil(dist(q,spot)/T.approachSpeed));
 const c=pos(r,owner),dir=g.left?-1:1;
 const s={done:false,phase:'lift',t:0,carrier:owner,partner:g.partner,post:g.post,left:g.left,spot,twinMirrored:twin.mirrored,from:{x:q.x,y:q.y},approach,
  kickT:1+approach,headerT:1+approach+T.kickFrames,volleyFrom:{x:c.x,y:c.y},volley:{x:c.x+dir*T.volleyAdvance,y:c.y},log:[],poses:[],shake:0,breakCheck:null,result:null,startFrame:r[0x300]};
 s.strikeT=s.headerT+T.headerStrikeDelay;states.set(r,s);s.log.push({t:0,frame:r[0x300],event:'lift',carrier:owner,partner:g.partner,post:{x:g.post.x,y:g.post.y,which:g.post.which},distance:g.distance});return true;}
function ballTo(r,target,n){const b=pos(r,12),g=T.gravity/256;n=Math.max(1,n);
 put(r,0x3e8+12,0x3f6+12,(target.x-b.x)/n*256);put(r,0x404+12,0x412+12,(target.y-b.y)/n*256);put(r,0x420+12,0x42e+12,((target.z-b.z)+g*n*(n-1)/2)/n*256);put(r,0x43c+12,0x44a+12,T.gravity);r[0x4bd+12]=0;}
function loose(r){r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;r[0x465]=6|128;r[0x492]=0;}
/** Takeover on the shot-start frame itself (project M-8 #2): called from beforeTsubasaBallIntegration, i.e. after the native shot
 * init wrote its velocities but BEFORE the ball integrates. The lift starts from the ball's actual position this frame, so
 * the native shot never moves the ball (no 23 px jump, no snap-back). Lift/pass paths: 美术演绎、未核. */
export function tsubasaTriangleTakeover(r){const s=states.get(r);if(!s||s.taken||s.done)return false;s.taken=true;
 const b=pos(r,12);loose(r);/* the native shot frame may integrate several times: hold the ball still this one frame (zero
 velocity and gravity); the closed-loop lift starts at t=1 from where it actually is */for(const a of [0x3e8,0x3f6,0x404,0x412,0x420,0x42e,0x43c,0x44a])r[a+12]=0;s.log.push({t:0,frame:r[0x300],event:'takeover',ball:b});return true;}
/** Per frame, before player/ball updates (match-actors). */
export function stepTsubasaTriangle(r){const s=states.get(r);if(!s||s.done)return;s.t++;const t=s.t;
 if(s.phase==='lift'||s.phase==='approach'||s.phase==='kick'||s.phase==='header'){
  if(t===1){loose(r);s.phase='approach';}
  if(s.phase!=='header'||!s.headed){if((r[0x465]&127)!==6&&(r[0x465]&127)!==5){s.phase='lost';s.done=true;s.result='ball-lost-before-header';return;}r[0x465]=6|128;
   ballTo(r,{x:s.spot.x,y:s.spot.y,z:T.headZ},s.strikeT-t+1);}
 }
 if(t===s.kickT){s.phase='kick';const b=evaluateTsubasaTriangleBreak(r,s.partner,s.post);s.breakCheck=b;s.log.push({t,frame:r[0x300],event:'kick',break:b});
  if(b.broken){s.phase='broken';s.ishizaki=b.slot;const ia=triangleSoleAnchor(s.post,'ishizaki');s.ishizakiSpot={x:ia.x,y:s.post.y};s.ishizakiMirrored=ia.mirrored;s.brokenT=t;}}
 if(s.phase==='kick'&&t===s.headerT){s.phase='header';r[0x459+s.partner]=0x34;r[0x87+s.partner]=r[0x94+s.partner]=r[0x46c+s.partner]=0;still(r,s.partner);s.log.push({t,frame:r[0x300],event:'header-start',action:0x34});}
 if(s.phase==='broken'){const k=t-s.brokenT;
  if(k===1+T.shakenFrames){r[0x459+s.partner]=0x59;r[0x87+s.partner]=r[0x94+s.partner]=r[0x46c+s.partner]=0;place(r,s.partner,s.f3x,s.spot.y,T.f3Lift);s.log.push({t,frame:r[0x300],event:'knock-back',action:0x59});s.phase='broken-fall';s.done=true;s.result='broken';}}
 if(s.phase==='pass'){if(!s.volleyStarted){s.volleyStarted=true;r[0x459+s.carrier]=0x38;r[0x87+s.carrier]=r[0x94+s.carrier]=r[0x46c+s.carrier]=0;still(r,s.carrier);s.volleyT0=t;s.log.push({t,frame:r[0x300],event:'volley-start',action:0x38});}
  r[0x465]=6|128;ballTo(r,{x:s.volley.x+(s.left?-T.volleyReachX:T.volleyReachX),y:s.volley.y,z:T.volleyZ},s.volleyT0+T.volleyStrikeDelay-t+1);}
}
const near=(b,p,zOff,reach)=>Math.hypot(b.x-p.x,b.y-p.y)<=reach.planar&&Math.abs(b.z-(p.z+zOff))<=reach.z;
/** Frame tail, after all updates and before OAM assembly: scripted positions, contacts at strike frames, poses. */
export function applyTsubasaTriangleFrame(r){const s=states.get(r);if(!s)return false;const t=s.t;s.poses=[];s.shake=0;
 if(s.done&&!s.tail){s.tail=true;}
 if(['approach','kick','header'].includes(s.phase)||(s.phase==='broken')){
  if(s.phase==='approach'){const k=Math.min(1,t/s.approach);place(r,s.partner,Math.round(s.from.x+(s.spot.x-s.from.x)*k),Math.round(s.from.y+(s.spot.y-s.from.y)*k));still(r,s.partner);}
  if(s.phase==='kick'||(s.phase==='broken'&&t===s.brokenT)){place(r,s.partner,s.spot.x,s.spot.y,0);still(r,s.partner);s.poses.push({slot:s.partner,key:'f1',mirrored:s.twinMirrored});}
  if(s.phase==='header'&&!s.headed){place(r,s.partner,s.spot.x,s.spot.y);still(r,s.partner);const df=r[0x74+s.partner]&127,b=pos(r,12),p=pos(r,s.partner);
   const nativeHit=r[0x4d6]===s.partner&&(r[0x465]&127)===5;
   if(nativeHit||(df===13&&near(b,p,T.headZOffset,T.headReach))){s.headed=true;s.phase='pass';r[0x4d6]=s.partner;r[0x465]=6|128;r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;s.log.push({t,frame:r[0x300],event:'header-pass',native:nativeHit,displayFrame:df,ball:b,twin:p});}
   else if(action(r,s.partner)!==0x34){s.phase='missed';s.done=true;s.result='header-missed';s.log.push({t,frame:r[0x300],event:'header-missed'});}}
  if(s.phase==='broken'){const k=t-s.brokenT;
   // contact frame (k=0) with the post at rest; the post shakes on the next T.shakeFrames frames and 石崎's sole rides it.
   if(k>=1&&k<=T.shakeFrames)s.shake=T.shakePattern[k-1];
   if(k<T.kickFrames){place(r,s.ishizaki,s.ishizakiSpot.x+s.shake,s.ishizakiSpot.y,0);still(r,s.ishizaki);s.poses.push({slot:s.ishizaki,key:'f2',mirrored:s.ishizakiMirrored});}
   if(k>=1&&k<=T.shakenFrames){s.f3x=s.left?trianglePostEdges(s.post).field+T.f3Offset:trianglePostEdges(s.post).field-T.f3Offset;place(r,s.partner,s.f3x,s.spot.y,T.f3Lift);still(r,s.partner);r[0x420+s.partner]=r[0x42e+s.partner]=r[0x43c+s.partner]=r[0x44a+s.partner]=0;s.poses.push({slot:s.partner,key:'f3',mirrored:s.twinMirrored});}}
 }
 if(s.phase==='pass'&&s.volleyStarted){const k=Math.min(1,(t-s.volleyT0+1)/T.volleyStrikeDelay);place(r,s.carrier,Math.round(s.volleyFrom.x+(s.volley.x-s.volleyFrom.x)*k),Math.round(s.volleyFrom.y+(s.volley.y-s.volleyFrom.y)*k));still(r,s.carrier);
  const df=r[0x74+s.carrier]&127,b=pos(r,12),p=pos(r,s.carrier);
  if(df===13&&near(b,p,T.volleyZOffset,T.volleyReach)){s.phase='volley';r[0x4d6]=s.carrier;r[0x465]=5;r[0x492]=132/* BALL_STATES[5] */;r[0x4f0]=r[0x4c9]=r[0x510]=0;s.volleyPending=true;s.log.push({t,frame:r[0x300],event:'volley',displayFrame:df,ball:b,twin:p});s.done=true;s.result='volley';}
  else if(action(r,s.carrier)!==0x38){s.phase='missed';s.done=true;s.result='volley-missed';s.log.push({t,frame:r[0x300],event:'volley-missed',ball:b,twin:p});}}
 s.log.at(-1).last=t;return true;}
/** Poses for the renderer this frame: [{slot,key:'f1'|'f2'|'f3',mirrored}]. */
export function getTsubasaTrianglePoses(r){return states.get(r)?.poses??[];}
/** Post shake for the renderer this frame: {post,edges,dx} or null (dx in native px, 美术演绎、未核). */
export function getTsubasaTrianglePostShake(r){const s=states.get(r);if(!s||!s.shake)return null;return {post:s.post,edges:trianglePostEdges(s.post),dx:s.shake};}
