import {TSUBASA_RAZOR_STRAIGHT_TICKS,TSUBASA_RAZOR_TURN_DEG,TSUBASA_RAZOR_GOAL} from '../data/tsubasa-special-moves.js';
import {resetTsubasaAcrobatState,syncTsubasaAcrobatState,noteTsubasaAcrobatStrike,noteTsubasaAcrobatContact,consumeTsubasaAcrobatShot} from './tsubasa-acrobat-move.js';
export {getTsubasaAcrobatState} from './tsubasa-acrobat-move.js';
/** Opt-in gameplay adapter. No ROM/emulation; no renderer-owned movement.
 * Native special eligibility, HP, timer/subtype, collision, keeper resistance,
 * goal and boundary routines are still authoritative. Only the ball's real
 * fixed-point velocity/gravity are changed before native integration. */
import {configureTsubasaGameplayContext,getTsubasaActorIdentity} from './tsubasa-gameplay-context.js';
export {isTsubasaSpecialMovesEnabled,getTsubasaActorIdentity} from './tsubasa-gameplay-context.js';
import {enableTsubasaPartnerChains,prepareTsubasaPartnerActions,resetTsubasaPartnerChains,syncTsubasaPartnerChains,noteTsubasaPartnerShot,recordTsubasaPartnerContact,consumeTsubasaPartnerShot,drainTsubasaPartnerEvents} from './tsubasa-partner-chains.js';
export {getTsubasaPartnerState} from './tsubasa-partner-chains.js';
import {TSUBASA_MOVE_CATALOG,TSUBASA_NATIVE_ENTRY_BY_MOVE,TSUBASA_NATIVE_SUBTYPE_BY_MOVE,TSUBASA_KEEPER_SAVE_THRESHOLD_BY_MOVE,TSUBASA_NATIVE_DIVE_BY_MOVE,TSUBASA_SHOOTING_RANGE,TSUBASA_DRIVE_PUNCH_THRESHOLD,TSUBASA_CANVAS_BALL_ART_BY_MOVE,TSUBASA_NATIVE_PHYSICS_MOVES,TSUBASA_NATIVE_CHAIN_OVERRIDES,getTsubasaCharacterMoves} from '../data/tsubasa-special-moves.js';
import {SPECIAL_PHYSICS,SPECIAL_TRANSITIONS,velocityFrom16Directions} from './ball-actions.js';
import {TSUBASA_STORY_STATS} from './tsubasa-story-stats.js';
import {setTsubasaSpecialShadowLock} from './tsubasa-shadow-lock.js';
import {TSUBASA_AUTHORED_MOVE_ART} from './tsubasa-authored-move-art.js';
import {tryStartTsubasaTriangle,resetTsubasaTriangle,tsubasaTriangleTakeover} from './tsubasa-triangle-shot.js';
import {resetTsubasaMisugiHeart} from './tsubasa-misugi-heart.js';
import {resetTsubasaFireShot} from './tsubasa-fire-shot.js';
import {resetTsubasaMorisakiSave,isTsubasaMorisakiSaveRunning} from './tsubasa-morisaki-save.js';
import {SKYLAB_LAUNCH_ART} from './tsubasa-skylab-launch-art.js';
const sessions=new WeakMap();
export const TIGER_SKIM_Z=2;
const w=(r,l,h)=>r[l]|r[h]<<8,signed=v=>v&32768?v-65536:v;
const write=(r,l,h,v)=>{v=Math.round(v);r[l]=v&255;r[h]=(v>>8)&255;};
const pos=(r,s=12)=>({x:signed(w(r,0x314+s,0x327+s))+r[0x301+s]/256,y:signed(w(r,0x34d+s,0x360+s))+r[0x33a+s]/256,z:signed(w(r,0x386+s,0x399+s))+r[0x373+s]/256});
const velocity=(r,s=12)=>({x:signed(w(r,0x3e8+s,0x3f6+s))/256,y:signed(w(r,0x404+s,0x412+s))/256,z:signed(w(r,0x420+s,0x42e+s))/256});
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
/** nativeArt (Must D-6): true (API default) = original 热血 creature/crescent art for
 * moves with a native entry; 'authored' = project's redrawn frames on the same native
 * frame ids/timing (src/tsubasa-authored-move-art.js); false = football core + short
 * pixel effects. The game (app-runtime free match, story mode) passes false: the
 * creature/crescent looks were rejected by the user (2026-10-17). */
export function enableTsubasaSpecialMoves(r,{enabled=true,nativeArt=true}={}){if(!(r instanceof Uint8Array)||r.length<2048)throw TypeError('Gameplay RAM required');configureTsubasaGameplayContext(r,{enabled});enableTsubasaPartnerChains(r,{enabled});if(!enabled){resetTsubasaAcrobatState(r);sessions.delete(r);setTsubasaSpecialShadowLock(r,false);return false;}if(sessions.has(r))sessions.get(r).nativeArt=nativeArt;else sessions.set(r,{nativeArt,active:null,events:[],serial:0,strikes:new Map(),stacks:[],lastTouch:null,lastLaunch:null,legacyChargeOwned:false,legacyShotAppearance:false,shockVictims:new Map()});return true;}
export function resetTsubasaSpecialMoves(r,reason='reset'){resetTsubasaPartnerChains(r);resetTsubasaTriangle(r);resetTsubasaMorisakiSave(r);resetTsubasaMisugiHeart(r);resetTsubasaFireShot(r);resetTsubasaAcrobatState(r);const session=sessions.get(r);if(!session)return;end(r,reason);session.events.length=0;session.strikes.clear();session.stacks.length=0;session.lastTouch=session.lastLaunch=null;session.legacyChargeOwned=session.legacyShotAppearance=false;session.shockVictims.clear();}
function end(r,reason){const session=sessions.get(r),a=session?.active;if(!a)return;session.events.push({type:'tsubasa-special-end',id:a.id,moveId:a.moveId,owner:a.owner,characterId:a.characterId,name:a.name,reason});session.active=null;setTsubasaSpecialShadowLock(r,false);}
/** M-9 D-40: 森崎's body block takes the ball over; the special session ends there (ball becomes an ordinary loose ball). */
export function endTsubasaSpecialShot(r,reason){end(r,reason);}
function valid(r,a){return (r[0x459+12]&127)===5&&r[0x4d6]===a.owner&&getTsubasaActorIdentity(r,a.owner)?.characterId===a.characterId&&r[0x4f0]>0&&(a.preserveNativePhysics||(r[0x50f]&127)>=3||a.allowGeneric&&(r[0x50f]&127)>=1)&&!(r[0x5c]&0x4e)&&r[0x58]===0&&(r[0x59]&127)===2;}
export function syncTsubasaSpecialMoves(r){syncTsubasaPartnerChains(r);syncTsubasaAcrobatState(r);const session=sessions.get(r);if(session){if(r[0x5c]&128){session.strikes.clear();session.stacks.length=0;session.lastTouch=null;}if(r[0x58]!==0||(r[0x59]&127)!==2||(r[0x5c]&0x4e)){end(r,'nonmatch');session.strikes.clear();session.stacks.length=0;session.lastTouch=session.lastLaunch=null;if(r[0x58]!==0){session.shockVictims.clear();session.legacyChargeOwned=session.legacyShotAppearance=false;}return;}if(!r[0x525])session.legacyChargeOwned=false;for(const [slot,hit]of session.shockVictims)if((r[0x459+slot]&127)!==6||getTsubasaActorIdentity(r,slot)?.characterId!==hit.characterId)session.shockVictims.delete(slot);}const a=session?.active;if(a&&!valid(r,a))end(r,'native-stop');else if(a?.prepared)a.lastVelocity=velocity(r);}
export function drainTsubasaSpecialEvents(r){const session=sessions.get(r);return [...(session?session.events.splice(0):[]),...drainTsubasaPartnerEvents(r)];}
export function noteTsubasaStrikeFrame(r,slot){noteTsubasaAcrobatStrike(r,slot);const session=sessions.get(r);if(session&&slot<12)session.strikes.set(slot,{frame:r[0x300],characterId:getTsubasaActorIdentity(r,slot)?.characterId});}
export function observeTsubasaCooperation(r){prepareTsubasaPartnerActions(r);const session=sessions.get(r);if(!session)return;for(const [slot,strike]of session.strikes)if(strike.frame!==r[0x300])session.strikes.delete(slot);session.stacks=session.stacks.filter(v=>((r[0x300]-v.frame)&255)<=48);for(let slot=0;slot<12;slot++){if((r[0x459+slot]&127)!==0x14)continue;const support=r[0x4ca+slot];if(support>=12||((slot^support)&1))continue;const ids=[getTsubasaActorIdentity(r,slot)?.characterId,getTsubasaActorIdentity(r,support)?.characterId];if(ids.includes('tachibana_masao')&&ids.includes('tachibana_kazuo')){const previous=session.stacks.find(v=>v.slots.includes(slot)),boosted=(r[0x459+support]&127)===0x30&&velocity(r,support).z>0;session.stacks=session.stacks.filter(v=>!v.slots.includes(slot));session.stacks.push({slots:[slot,support],ids,heights:previous?.heights??[pos(r,slot).z,pos(r,support).z],frame:previous?.frame??r[0x300],boostFrame:previous?.boostFrame??(boosted?r[0x300]:null)});}}}
function strikeNow(r,slot){const strike=sessions.get(r)?.strikes.get(slot);return strike?.frame===r[0x300]&&strike.characterId===getTsubasaActorIdentity(r,slot)?.characterId;}
function nearbyPartner(r,owner,id,{radius=24,air=false}={}){const p=pos(r,owner),ball=pos(r);if(!strikeNow(r,owner)||Math.hypot(p.x-ball.x,p.y-ball.y)>24||Math.abs(p.z-ball.z)>32)return null;for(let slot=owner&1;slot<12;slot+=2){if(slot===owner||!r[0xd9+slot]||getTsubasaActorIdentity(r,slot)?.characterId!==id)continue;const q=pos(r,slot),a=r[0x459+slot]&127;if(!strikeNow(r,slot)||Math.hypot(q.x-ball.x,q.y-ball.y)>24||Math.abs(q.z-ball.z)>32||Math.hypot(q.x-p.x,q.y-p.y)>radius||Math.abs(q.z-p.z)>20)continue;if(![0x33,0x37,0x43,0x47].includes(a)||air&&q.z<28)continue;return {slot,characterId:id};}return null;}

/** Called only by the original resolved contact path. This is a provenance
 * ledger, never a collision test or a possession grant of its own. */
export function captureTsubasaBallContact(r,slot){const session=sessions.get(r);if(!session)return null;return {frame:r[0x300],owner:r[0x4d6],source:getTsubasaActorIdentity(r,r[0x4d6])?.characterId,action:r[0x465]&127,held:!!(r[0x492]&64),position:pos(r),velocity:velocity(r),runner:velocity(r,slot),launch:session.lastLaunch?{...session.lastLaunch}:null,replaceCharge:session.legacyChargeOwned&&r[0x525]>0};}
export function finishTsubasaBallContact(r,slot,before){const session=sessions.get(r);if(!session||!before)return;recordTsubasaPartnerContact(r,slot,before);noteTsubasaAcrobatContact(r,slot,before);if(before.replaceCharge&&(r[0x459+slot]&127)===6)session.shockVictims.set(slot,{characterId:getTsubasaActorIdentity(r,slot)?.characterId,frame:r[0x300]});if(before.owner===slot||r[0x4d6]!==slot)return;const identity=getTsubasaActorIdentity(r,slot);if(!identity)return;session.lastTouch={...before,slot,characterId:identity.characterId,resultAction:r[0x465]&127,sameTeam:!((before.owner^slot)&1)};}

/** Oriented ball x (toward the attacked goal) inside TSUBASA_SHOOTING_RANGE. */
export function inShootingRange(r,s=12){const x=pos(r,s).x,o=r[0x4a3+s]&128?1023-x:x;return o>=TSUBASA_SHOOTING_RANGE.from&&o<TSUBASA_SHOOTING_RANGE.to;}
export const CPU_SKYLAB_RADIUS=128;
function chooseMove(r,owner,characterId,sourceSpecialId=0){
 if(characterId==='diaz'&&consumeTsubasaAcrobatShot(r,owner))return {moveId:'diaz-backflip-shot',partners:[]};
 const combination=consumeTsubasaPartnerShot(r,owner);if(combination)return combination;
 if(['misugi','tsubasa','sano'/* batch D: canon overhead vs Nankatsu */].includes(characterId)&&[0x32,0x46].includes(r[0x459+owner]&127))return {moveId:'overhead-kick',partners:[]};
 if(characterId==='margus'&&(r[0x459+owner]&127)===0x34&&sourceSpecialId>0)return {moveId:'margus-power-header',partners:[]};/* batch D: his native header shot (0x34, the header action with a shot contact) that passed the native special height */
 const touch=sessions.get(r)?.lastTouch;if(touch?.slot===owner&&touch.characterId===characterId&&touch.sameTeam&&((r[0x300]-touch.frame)&255)<=2&&!touch.held){
  if(characterId==='nitta'&&touch.resultAction===5&&[4,6].includes(touch.action)&&touch.position.z>=8&&touch.position.z<=56&&Math.hypot(touch.runner.x,touch.runner.y)>=1)return {moveId:'running-volley-falcon',partners:[]};
 }
 if(characterId.startsWith('tachibana_')&&[0x34,0x38].includes(r[0x459+owner]&127)&&pos(r).z>=48&&inShootingRange(r)){const setup=sessions.get(r)?.stacks.find(v=>v.slots.includes(owner)&&v.boostFrame!==null&&((r[0x300]-v.boostFrame)&255)<=32&&((r[0x300]-v.frame)&255)<=48);if(setup){const slot=setup.slots.find(s=>s!==owner),p=pos(r,owner),q=pos(r,slot),id=getTsubasaActorIdentity(r,slot)?.characterId;if(r[0xd9+slot]&&setup.ids.includes(id)&&id!==characterId&&p.z>=48&&p.z>setup.heights[setup.slots.indexOf(owner)]+12&&Math.hypot(p.x-q.x,p.y-q.y)<=48)return {moveId:'skylab-hurricane',partners:[{slot,characterId:id}]};}}
 /* D-59 CPU skylab: the native AI never builds the twin stack (0x14), so a CPU-controlled twin's native special jump shot (0x33/0x37/0x34/0x38) inside the D-37 range, with the other twin on the field within CPU_SKYLAB_RADIUS (128) px, becomes the skylab; the board twin sprints in at <= native dash speed (applyTsubasaCpuSkylabSprintFrame), never teleports. 1P-controlled twins still need the real stack. */if(characterId.startsWith('tachibana_')&&(r[0x650+owner]&128)&&sourceSpecialId>=4&&[0x33,0x37,0x34,0x38].includes(r[0x459+owner]&127)&&inShootingRange(r)){const other=characterId==='tachibana_masao'?'tachibana_kazuo':'tachibana_masao',p=pos(r,owner);for(let slot=owner&1;slot<12;slot+=2){if(slot===owner||!r[0xd9+slot]||getTsubasaActorIdentity(r,slot)?.characterId!==other)continue;const sp=sessions.get(r)?.cpuSkylabSprint;if(sp&&sp.jumper===owner&&sp.board===slot&&(sp.arrived||sp.air&&cpuSkylabStepReaches(sp)))return {moveId:'skylab-hurricane',partners:[{slot,characterId:other}],cpu:true};/* D-59 sprint-in: the board twin must already have sprinted (or reach it with this logic frame's last capped sprint step, applied in this frame's tail before anything is drawn) (applyTsubasaCpuSkylabSprintFrame, armed within CPU_SKYLAB_RADIUS) to directly under the takeoff point */}}
 /* D-8 / D-44: drive-tiger is Jr.Youth (phase 2): never fires while its catalog status is not 'implemented' */if(TSUBASA_MOVE_CATALOG['drive-tiger']?.status==='implemented'&&(characterId==='tsubasa'||characterId==='hyuga')){const partner=nearbyPartner(r,owner,characterId==='tsubasa'?'hyuga':'tsubasa');if(partner)return {moveId:'drive-tiger',partners:[partner]};}
 const solo=getTsubasaCharacterMoves(characterId)?.moves.find(m=>m.kind==='shot'&&m.status==='implemented'&&!m.requiresContext);/* D-44: no own move -> keep the native 热血 special (no session, native art + trajectory) */return solo?{moveId:solo.id,partners:[]}:{moveId:null,nativeFallback:true,partners:[]};
}
/** Called only after the original selector has returned its real result. */
export function beginTsubasaShot(r,sourceSpecialId,s=12){const session=sessions.get(r);if(!session)return;end(r,'new-shot');if(s!==12)return;session.razorKeeper=null;const owner=r[0x4d6],identity=getTsubasaActorIdentity(r,owner);if(!identity)return;if(tryStartTsubasaTriangle(r,owner))return;/* M-8 D-39: the shot becomes the triangle lift (own path) */let choice=chooseMove(r,owner,identity.characterId,sourceSpecialId);if(choice.moveId==='razor-shot'&&!inShootingRange(r))choice={moveId:'basic-shot',partners:[]};/* Must D-37 (project): razor only inside the shooting range 0x290-0x350 (like Skylab); outside, a normal shot */if(!choice.nativeFallback&&!['implemented','basic'].includes(TSUBASA_MOVE_CATALOG[choice.moveId]?.status))choice={moveId:null,nativeFallback:true,partners:[]};/* D-44: an unimplemented move falls back to the native special, not basic-shot */noteTsubasaPartnerShot(r,sourceSpecialId);session.lastLaunch={owner,characterId:identity.characterId,frame:r[0x300],sourceSpecialId};session.legacyShotAppearance=false;if(sourceSpecialId<4&&!choice.preserveNativePhysics&&!(['skylab-hurricane','overhead-kick','diaz-backflip-shot','margus-power-header'].includes(choice.moveId)&&(sourceSpecialId===1||sourceSpecialId===2)))return;if(choice.nativeFallback)return;/* D-44: native special, no session */session.legacyShotAppearance=true;if(sourceSpecialId===30)session.legacyChargeOwned=true;const move=TSUBASA_MOVE_CATALOG[choice.moveId],nativeEntry=TSUBASA_NATIVE_ENTRY_BY_MOVE[move.id]??null;if(nativeEntry!==null){r[0x50f]=nativeEntry|128;setTsubasaSpecialShadowLock(r,true);}session.active={razor:move.id==='razor-shot'?razorStart(r,session,owner):null,nativeEntry,nativeSubtype:nativeEntry!==null?TSUBASA_NATIVE_SUBTYPE_BY_MOVE[move.id]??null:null,id:++session.serial,moveId:move.id,name:move.name,characterId:identity.characterId,owner,sourceSpecialId,preserveNativePhysics:!!choice.preserveNativePhysics||TSUBASA_NATIVE_PHYSICS_MOVES.has(move.id),chain:TSUBASA_NATIVE_CHAIN_OVERRIDES[move.id]??null,allowGeneric:sourceSpecialId===1||sourceSpecialId===2,archetype:move.trajectory,effect:move.effect,status:move.status,dive:TSUBASA_NATIVE_DIVE_BY_MOVE[move.id]??null,diveState:null,partners:choice.partners,origin:pos(r),age:0,path:[],phase:'launch',prepared:false,lastVelocity:null,gravity:0,launchFrame:r[0x300],main:r[0x58],aim:{x:signed(w(r,0x2e,0x2f))/256,y:signed(w(r,0x30,0x31))/256}};if(move.id==='drive-shot'){const k=10+((owner&1)^1);if(getTsubasaActorIdentity(r,k)?.characterId==='wakashimazu'){session.wakashimazuDriveFaced=(session.wakashimazuDriveFaced??0)+1;session.active.wakashimazu={slot:k,faced:session.wakashimazuDriveFaced};}}session.events.push({type:'tsubasa-special-start',id:session.active.id,moveId:move.id,owner,characterId:identity.characterId,name:move.name,status:move.status,partners:choice.partners.map(p=>({...p}))});}
/** Must D-24: a move may run its native entry state (animation/frame ids) on a
 * different *native* physics subtype from SPECIAL_PHYSICS/SPECIAL_TIMERS (tiger:
 * entry 22 straight frames on subtype 3, the only native subtype exempt from the
 * planar speed cap). Only while that move is active in its entry state; every
 * other caller (ordinary play, native teams) gets the recovered table value. */
export function tsubasaNativeSubtype(r,subtype){const a=sessions.get(r)?.active,id=r[0x50f]&127,own=a?.chain?.subtype?.[id];if(a&&own!=null)return own;/* chain override: this state flies another native subtype */return a&&a.nativeSubtype!=null&&id===a.nativeEntry?a.nativeSubtype:subtype;}
/** D-25: keeper contact rule for power-keeping specials. Returns null (native rule) unless
 * a move with a threshold is active: 'save' (keeper score >= threshold -> native save path)
 * or 'through' (native 0x59/0x37 already applied by the caller; ball is not blocked). */
const NAMED_KEEPER_SCORE=new Map(TSUBASA_STORY_STATS.named.map(p=>[p.characterId,p.hp+[20,15,12,8][p.defense&3]]));
/** Keeper score = D-10 named score (story HP + native def bonus) when the keeper is a named
 * character, else the live RAM score (HP before damage + def bonus). D-28: the tiger threshold passes resistance 0 (base ability only). */
export function tsubasaKeeperScore(r,slot,liveScore,resistance=0){const id=getTsubasaActorIdentity(r,slot)?.characterId,named=NAMED_KEEPER_SCORE.get(id);return Math.min(255,(named??liveScore)+resistance);}
export function tsubasaSpecialKeeperRule(r,slot,liveScore,resistance=0){const a=sessions.get(r)?.active,t=a?TSUBASA_KEEPER_SAVE_THRESHOLD_BY_MOVE[a.moveId]:undefined;if(t===undefined||!valid(r,a))return null;if(a.moveId==='drive-shot')return 'through';/* D-32/D-33: a ドライブシュート is never caught: the keepers who reach 95 chop it (handled before this rule), every other contact goes through */if(a.moveId==='cannon-shot')return tsubasaKeeperScore(r,slot,liveScore,0)>=t?null:'through';/* D-38: at/above the D-25 threshold the native shot-20 keeper contest decides (no forced save) */return tsubasaKeeperScore(r,slot,liveScore,0)>=t?'save':'through';/* D-28: base ability only; defensive-move bonuses (resistance) never count */}
/** the live native special belongs to a shooter without an own shot (a minor player): draw it as the native
 * colour-changing ball. A named shooter whose session already ended (goal, keeper) keeps the plain football. */
export function tsubasaNativeColourBallShot(r){const l=sessions.get(r)?.lastLaunch;if(!l||l.owner!==r[0x4d6])return true;
 return !getTsubasaCharacterMoves(l.characterId)?.moves.some(m=>m.kind==='shot'&&m.status==='implemented'&&!m.requiresContext);}
/** D-26: while a type-3 (over-speed) special is in flight the camera may step at the
 * ball's planar speed (16) instead of the native 8; everything else keeps the native 8. */
export function tsubasaSpecialCameraStep(r){const a=sessions.get(r)?.active;return a&&r[0x510]===3&&valid(r,a)?16:8;}/* any Tsubasa move in the over-speed subtype 3 (tiger 28, fire 20, the generic 03 after an overhead); no session = native 8 */
/** Native phase transitions may clearMotion/reaim. Keep native timers and power,
 * but continue the already travelling ball rather than snap it to a target. */
export function prepareTsubasaShotPhysics(r,s=12){const a=sessions.get(r)?.active;if(!a||s!==12)return;
 if(a.preserveNativePhysics){if(!a.prepared)a.path.push({...a.origin,age:0});a.prepared=true;applyNativeChainOverride(r,a,s);a.lastVelocity=velocity(r,s);a.gravity=w(r,0x43c+s,0x44a+s)/256;return;}
 if(a.prepared){if(a.lastVelocity){write(r,0x3e8+s,0x3f6+s,a.lastVelocity.x*256);write(r,0x404+s,0x412+s,a.lastVelocity.y*256);write(r,0x420+s,0x42e+s,a.lastVelocity.z*256);write(r,0x43c+s,0x44a+s,a.gravity*256);}return;}
 const v=a.aim??velocity(r,s),length=Math.hypot(v.x,v.y),direction=length?{x:v.x/length,y:v.y/length}:{x:r[0x4a3+s]&128?-1:1,y:0};
 // Preserve the original eight-pixel speed ceiling. The original aim direction
 // is sampled once; no keeper position, score or future goal test is consulted.
 // D-24: a native subtype override (tiger: subtype 3) keeps the planar speed the
 // native initializer just scaled from SPECIAL_PHYSICS (16), which bypasses the cap.
 const nativeV=velocity(r,s),nativeSpeed=Math.hypot(nativeV.x,nativeV.y);
 const speed=a.nativeSubtype!=null&&nativeSpeed>0?nativeSpeed:a.effect==='basic'?6.5:8;
 const distance=Math.max(32,Math.hypot(w(r,0x51b,0x51c)-a.origin.x,w(r,0x51d,0x51e)-a.origin.y));a.flightTime=Math.max(12,Math.min(110,distance/speed));a.direction=direction;a.bendSign=a.origin.y>=192?-1:1;
 let g=.008,vz=(12-a.origin.z)/a.flightTime+g*(a.flightTime-1)/2;
 /* 2026-10-19: every named shot now flies its native chain (TSUBASA_NATIVE_PHYSICS_MOVES); this adapted path is left only
  * for the basic shot and the pending drive-tiger combination */
 if(a.effect==='drive-tiger'){vz=4.4;g=2*(a.origin.z-12+vz*a.flightTime)/(a.flightTime*(a.flightTime-1));}
 a.gravity=g;const lateral=0;
 write(r,0x3e8+s,0x3f6+s,(direction.x*speed-direction.y*lateral)*256);write(r,0x404+s,0x412+s,(direction.y*speed+direction.x*lateral)*256);write(r,0x420+s,0x42e+s,vz*256);write(r,0x43c+s,0x44a+s,g*256);a.prepared=true;a.path.push({...a.origin,age:0});a.lastVelocity=velocity(r,s);
}
export function beforeTsubasaBallIntegration(r,s=12){if(s===12&&tsubasaTriangleTakeover(r))return;const a=sessions.get(r)?.active;if(!a||!a.prepared||s!==12)return;if(!valid(r,a)){end(r,'native-stop');return;}if(a.preserveNativePhysics)return;
 // Native timers hold vertical acceleration during special phases. Apply the
 // adapted aerodynamic drop to velocity while retaining the original timer.
 if(r[0x4c9]>0&&a.age>0){const v=velocity(r,s);write(r,0x420+s,0x42e+s,(v.z-a.gravity)*256);}
}
export function afterTsubasaBallIntegration(r,s=12){const a=sessions.get(r)?.active;if(!a||s!==12||!a.prepared)return;a.age++;if(a.flightFrame0==null&&valid(r,a))a.flightFrame0=r[0x300];/* M-5: first displayed flight frame (ball off the foot) */if(a.razor)noteRazorProgress(r,a,s);a.lastVelocity=velocity(r,s);const p=pos(r,s);a.phase=a.diveState?'dive':a.effect==='eagle'&&a.lifted&&a.lastVelocity.z>0?'lift':a.lastVelocity.z>0?'rising':a.effect==='razor'?'curving':'descending';a.path.push({...p,age:a.age});if(a.path.length>40)a.path.shift();}
function noteRazorProgress(r,a,s){const z=a.razor;if(a.preserveNativePhysics&&z.clock!==r[0x300]){z.clock=r[0x300];z.frames=(z.frames??0)+1;}/* native razor: count displayed flight frames here */const p=pos(r,s),left=!!(r[0x4a3+s]&128)||velocity(r,s).x<0,line=tsubasaRazorGoalLineX(p.y,left);
 if(z.goalLineFrame==null&&(left?p.x<=line:p.x>=line)){z.goalLineFrame=z.frames??0;z.goalLineClock=r[0x300];z.goalLineAt={x:p.x,y:p.y};}
 const session=sessions.get(r);if(a.keeperLookUp!=null&&!session.razorKeeper){const kx=pos(r,a.keeperLookUp).x;if(left?p.x<kx:p.x>kx)session.razorKeeper={slot:a.keeperLookUp,characterId:z.keeperCharacterId,passFrame:r[0x300],curve:z.curve,diveSide:z.curve>0?'up':'down',hold:{...(z.keeperHold??pos(r,a.keeperLookUp))}};}}
/** Rendering is pure: copies/frozen snapshots only. No age advances during paint. */
export function getTsubasaSpecialState(r){const a=sessions.get(r)?.active;if(!a||!valid(r,a))return null;const position=pos(r),v=velocity(r);return freeze({id:a.id,moveId:a.moveId,owner:a.owner,characterId:a.characterId,name:a.name,archetype:a.archetype,effect:a.effect,status:a.status,nativeEntry:a.nativeEntry,nativeState:r[0x50f]&127,diveState:a.diveState??null,nativeArtwork:!a.razor&&!TSUBASA_CANVAS_BALL_ART_BY_MOVE[a.moveId]&&a.nativeEntry!==null&&(sessions.get(r).nativeArt===true||sessions.get(r).nativeArt==='authored'&&!!TSUBASA_AUTHORED_MOVE_ART[a.moveId]),authoredArt:!a.razor&&!TSUBASA_CANVAS_BALL_ART_BY_MOVE[a.moveId]&&a.nativeEntry!==null&&sessions.get(r).nativeArt==='authored'&&!!TSUBASA_AUTHORED_MOVE_ART[a.moveId],lifted:!!a.lifted,flightTime:a.flightTime??null,dive:a.diveState??null,diveStart:a.diveStart?{...a.diveStart}:null,age:a.age,flightTick:a.flightFrame0==null?0:((r[0x300]-a.flightFrame0)&255)+1,phase:a.phase,dipped:!!a.dipped||a.moveId==='slider-shot'&&a.diveState==='diving'/* native 12 is the slider's dip */,origin:{...a.origin},position,velocity:v,path:a.path.map(p=>({...p})),partners:a.partners.map(p=>({...p})),power:r[0x4f0],razor:a.razor?{...a.razor}:null,sourceSpecialId:a.sourceSpecialId,worldX:position.x,worldY:position.y,z:position.z,frame:r[0x300],ballEntity:12});}

/** Presentation ownership belongs to the enabled field scene, independently of
 * physical shot validity. Contact, exhaustion and possession changes can leave
 * a cached special animation in OAM for two paints; never hand that glyph back.
 * This predicate is read-only and cannot extend a physical special or trail. */
export function shouldReplaceTsubasaBallArtwork(r){const session=sessions.get(r),a=session?.active;if(a&&a.nativeEntry!==null&&(session.nativeArt===true||session.nativeArt==='authored'&&TSUBASA_AUTHORED_MOVE_ART[a.moveId])&&valid(r,a))return false;return !!(sessions.has(r)&&r[0x58]===0);}

export function shouldReplaceTsubasaShockArtwork(r,slot){const hit=sessions.get(r)?.shockVictims.get(slot);return !!(hit&&r[0x58]===0&&(r[0x459+slot]&127)===6&&getTsubasaActorIdentity(r,slot)?.characterId===hit.characterId);}

/** D-29: Skylab uses only the first half of native state 07 (the dive). When 07 would advance
 * (ground contact or timer) the 07->10 skim is replaced by the native no-next-state end
 * (r[0x510]=0, power 0): the ball is already at the goal mouth and is judged from there. */
/** TSUBASA_NATIVE_CHAIN_OVERRIDES on a (re)initialised native state: the state's distance timer counted to the
 * move's own reference (native 04:BC7F with another target x), and the dive state noted for D-31/D-62 */
function applyNativeChainOverride(r,a,s){const c=a.chain;if(!c)return;const id=r[0x50f]&127,ref=c.timerReference?.[id];
 if(ref!=null){const x=signed(w(r,0x314+s,0x327+s)),left=!!(r[0x4a3+s]&128),d=left?x-(1024-ref):ref-x;r[0x4c9]=Math.min(255,Math.max(0,d)>>3);}
 const vz=c.vz?.[id];if(vz!=null){r[0x42e+s]=vz&255;r[0x420+s]=0;}/* the native initialiser just wrote the subtype's Vz (hi 0x42E, lo 0x420) */
 if(c.diveState===id&&!a.diveState){a.diveState='diving';a.diveStart={...pos(r,s),age:a.age};}
 const rb=c.razorBend,z=a.razor;if(rb&&z){const G=TSUBASA_RAZOR_GOAL,p=pos(r,s),left=!!(r[0x4a3+s]&128),ox=left?1023-p.x:p.x;
  if(id===rb.entry&&z.bendX==null){/* the bend point (oriented x), the timer that ends the leg there, and the leg aimed outside the post */
   const bx=Math.max(rb.min,Math.min(rb.max,Math.max(ox+24,ox+rb.ahead)));z.bendX=left?1023-bx:bx;r[0x4c9]=Math.min(255,Math.max(0,bx-ox)>>3);
   const ty=z.curve>0?G.topPostY-rb.outside:G.bottomPostY+rb.outside,v=velocity(r,s),speed=Math.hypot(v.x,v.y)||8,dx=z.bendX-p.x,dy=ty-p.y,L=Math.hypot(dx,dy)||1;
   write(r,0x3e8+s,0x3f6+s,dx/L*speed*256);write(r,0x404+s,0x412+s,dy/L*speed*256);z.aimY=ty;z.stage=0;}
  else if(id===rb.turnState&&z.bendAge==null){/* the native re-aim just ran: this is the turn. D-37 fooled keeper from here on */
   z.bendAge=a.age;z.stage=1;const v=velocity(r,s);z.headingDeg=Math.round(Math.atan2(Math.abs(v.y),Math.abs(v.x))*180/Math.PI);
   a.keeperLookUp=z.keeperSlot;if(!z.keeperHold){const q=pos(r,z.keeperSlot);z.keeperHold={x:q.x,y:q.y};}}}}
export function tsubasaSpecialAdvance(r,id){const a=sessions.get(r)?.active;const nx=a?.chain?.next?.[id];/* (the former TSUBASA_NATIVE_DIVE_BY_MOVE 07 dive is gone: drive, slider and skylab end their own chains with endAfter) */if(nx!=null){/* chain override: another successor; written like the native one (04:BCE3) */r[0x50f]=nx;r[0x87+12]=0;r[0x94+12]=0;return true;}if(a?.chain?.endAfter?.includes(id)){/* chain override: END instead of the native successor */r[0x510]=0;r[0x4f0]=0;a.phase='bottom';return true;}return false;}
/** D-29 pose hook (project: shots-v2/skylab-launch/, shots-v2/drive-hawk/). Authored frames are
 * registered per move/phase/character; until then the lookup returns null and the native pose
 * renders. Read-only: never changes RAM or flight. Skylab phases: springboard (one twin lying as
 * the board), launch (the other twin boosted up), peak-shot (shot struck at the top), dive (07). */
const AUTHORED_POSES=new Map();
export function registerTsubasaAuthoredPose(moveId,phase,characterId,frames){if(!Array.isArray(frames)||!frames.length)throw TypeError('frames required');AUTHORED_POSES.set(`${moveId}|${phase}|${characterId}`,Object.freeze(frames.slice()));}
export function resolveTsubasaAuthoredPose(moveId,phase,characterId){if(moveId==='skylab-hurricane')return null;/* D-62: project's shots-v2 skylab S1-S3 retired; skylab is built from native Nekketsu poses (applyTsubasaSkylabFootVolleyFrame) */return AUTHORED_POSES.get(`${moveId}|${phase}|${characterId}`)??null;}
/** D-29 Skylab sequence per twin: board twin = 'springboard' (S1) for the whole move; jumper =
 * 'launch' (S2, soles on the board's soles while still on it, then rising), shooter at the top
 * = 'peak-shot' (S3, special struck, before the dive), then 'dive' (07 first half, native pose). */
export function getTsubasaSkylabPoses(r){const session=sessions.get(r);if(!session)return [];const a=session.active;let board,jumper,phase;
 if(a?.moveId==='skylab-hurricane'&&valid(r,a)){jumper={slot:a.owner,characterId:a.characterId};board=a.partners[0];phase=a.diveState?'dive':'peak-shot';}
 else{const v=session.stacks?.find(s=>s.slots?.length===2&&s.slots.every(q=>getTsubasaActorIdentity(r,q)?.characterId?.startsWith('tachibana_')));if(!v)return [];const [p,q]=v.slots,lowP=pos(r,p).z<=pos(r,q).z;
  board={slot:lowP?p:q};jumper={slot:lowP?q:p};for(const t of [board,jumper])t.characterId=getTsubasaActorIdentity(r,t.slot)?.characterId;phase='launch';}
 // Both twins face the attack: the ball's direction once shot, else the jumper's (no per-twin flips).
 const dir=a?.moveId==='skylab-hurricane'?r[0x4a3+12]:r[0x4a3+jumper.slot],face=()=>dir&128?'left':'right';
 return [{...board,role:'board',phase:'springboard',facing:face(board.slot)},{...jumper,role:'jumper',phase,facing:face(jumper.slot)}].filter(t=>t.slot!=null).map(t=>({...t,authored:resolveTsubasaAuthoredPose('skylab-hurricane',t.phase,t.characterId)}));}
// D-29: project's signed Skylab launch v2 frames (S1 springboard, S2 push-off, S3 top-down strike), both twins.
for(const id of ['tachibana_masao','tachibana_kazuo'])for(const [phase,key] of [['springboard','S1'],['launch','S2'],['peak-shot','S3']])registerTsubasaAuthoredPose('skylab-hurricane',phase,id,[SKYLAB_LAUNCH_ART[key]]);
/** D-31: ドライブシュート fools the keeper. During its native 07 dip the opposing keeper reads it as
 * the high ball it looked like (same >=32 height rule as 89DD) and looks up at empty air instead of
 * jumping, so the ball dips in front of him. D-25 threshold, base ability only: a keeper whose
 * score is >= TSUBASA_KEEPER_SAVE_THRESHOLD_BY_MOVE['drive-shot'] is not fooled (native path).
 * Returns true while fooled; session.active.keeperLookUp records the slot for presentation. */
export function tsubasaKeeperReadsHighBall(r,slot){const a=sessions.get(r)?.active;if(a?.razor&&valid(r,a)&&a.keeperLookUp===slot)return true;/* D-37: razor-fooled keeper stays put */if(!a||a.moveId!=='drive-shot'||!a.diveState||!valid(r,a)||((slot^a.owner)&1)===0)return false;
 if(a.wakashimazu?.slot===slot)return false;// D-32: Wakashimazu is never fooled (he jumps natively)
 if(!(((r[0x392]-r[0x386+slot])&255)>=32&&!(r[0x3a5]&128))&&a.keeperLookUp!==slot)return false;
 // D-32 (project review): every keeper other than Wakashimazu is fooled whatever his stat
 a.keeperLookUp=slot;return true;}
/** D-32 (Wakashimazu only, ドライブシュート): the first drive he faces in a match (session) always
 * scores: 'bowl' = native 0x59 knock-back, ball goes on into the net with him (tiger's D-25 'through').
 * From the second on: base score (D-28 rule, no defensive bonus) >= TSUBASA_DRIVE_PUNCH_THRESHOLD ->
 * 'punch' (hand chop: ball knocked off target / out of play, never caught), else 'bowl'.
 * Any other keeper whose base score reaches the D-31 threshold (none in the story arc) also punches,
 * never catches. Returns null for no drive / not a keeper. */
export function tsubasaDriveKeeperContact(r,slot,liveScore){const a=sessions.get(r)?.active;if(!a||a.moveId!=='drive-shot'||!valid(r,a)||slot<10||((slot^a.owner)&1)===0)return null;
 if(a.wakashimazu?.slot===slot){if(a.wakashimazu.faced===1)return 'bowl';return tsubasaKeeperScore(r,slot,liveScore,0)>=TSUBASA_DRIVE_PUNCH_THRESHOLD?'punch':'bowl';}
 return 'bowl';}// D-32: only Wakashimazu (base >= 95, 2nd drive on) chops; everyone else concedes
/** D-32 punch: hand chop. Ball bounced back off target with an upward pop, power cleared, special ended;
 * the keeper never gains possession. Hook: getTsubasaDriveKeeperPunch(r) (project's punch frame, pending). */
export function applyTsubasaDrivePunch(r,slot){const session=sessions.get(r),a=session?.active;if(!a)return null;
 // Native knock: velocityFrom16Directions (strength 16) and the native free-flight ball action 06; the native
 // field bounds then stop play (throw-in, measured in shots/drive-v2/wakashimazu-2nd-chop). Direction: steeply back out
 // of the goal mouth toward the nearer touchline, i.e. off target and out of play.
 const towardRight=!!((r[0x3f6+12])&128)===false,y=r[0x34d+12]|r[0x360+12]<<8,up=y<0xe8,dir=towardRight?(up?15:9):(up?1:7);
 r[0x4b0+12]=dir<<4;clearTsubasaPowerForPunch(r);velocityFrom16Directions(r,12,16);r[0x465]=6;r[0x492]=BALL_STATE_6;
 session.lastDrivePunch={slot,frame:r[0x300],faced:a.wakashimazu?.faced??null,direction:dir};end(r,'keeper-punch');return dir;}
const BALL_STATE_6=128;// BALL_STATES[6] (ball-collision.js)
function clearTsubasaPowerForPunch(r){r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;setTsubasaSpecialShadowLock(r,false);}
export function getTsubasaDriveKeeperPunch(r){const p=sessions.get(r)?.lastDrivePunch;return p&&((r[0x300]-p.frame)&255)<16?p.slot:null;}
/** Review/test seed: drives Wakashimazu already faced earlier in this match. */
export function setTsubasaWakashimazuDriveFaced(r,n){const s=sessions.get(r);if(s)s.wakashimazuDriveFaced=n;}
export function getTsubasaWakashimazuDriveFaced(r){return sessions.get(r)?.wakashimazuDriveFaced??0;}
/** D-31 hook: the keeper slot currently looking up at the ドライブシュート (null otherwise). */
export function getTsubasaDriveKeeperLookUp(r){const a=sessions.get(r)?.active;return a&&a.moveId==='drive-shot'&&valid(r,a)&&a.keeperLookUp!=null?a.keeperLookUp:null;}

/** D-36 razor shot (剃刀, 早田誠), own special path. Curve direction is UNCONFIRMED: there is no default.
 * Only a test/capture hook may set it ('up' = screen -y, 'down' = screen +y); without it the razor never
 * triggers (Soda shoots a basic shot). Keepers keep native behaviour (no razor keeper outcome wired). */
export function setTsubasaRazorCurve(r,curve){if(curve!==null&&curve!=='up'&&curve!=='down')throw RangeError('razor curve must be "up", "down" or null');const session=sessions.get(r);if(!session)throw Error('enable Tsubasa special moves first');session.razorCurve=curve;}
export function getTsubasaRazorCurve(r){return sessions.get(r)?.razorCurve??null;}
/** Path (project, ball-final): TSUBASA_RAZOR_STRAIGHT_TICKS straight displayed frames, then the planar heading turns 0->25->45 deg
 * within 2 ticks toward the curve side and holds; planar speed unchanged. */
/** D-37 default curve (team call, unconfirmed): away from the opposing keeper. Keeper standing high (y < goal centre) ->
 * 'down', low -> 'up'. setTsubasaRazorCurve(r,'up'|'down') still overrides it (test/capture hook). */
function razorStart(r,session,owner){const keeperSlot=10|((owner&1)^1),keeperY=pos(r,keeperSlot).y,auto=keeperY<TSUBASA_RAZOR_GOAL.centerY?'down':'up',direction=session.razorCurve??auto;
 return {curve:direction==='down'?1:-1,direction,source:session.razorCurve?'hook':'default',keeperSlot,keeperY,keeperCharacterId:getTsubasaActorIdentity(r,keeperSlot)?.characterId??null,stage:0,headingDeg:0,straightened:false,goalLineFrame:null};}
/** Native ball goal line (goal.js $B7BA field boundary for the ball). */
export function tsubasaRazorGoalLineX(y,left){const d=Math.max(0,y-48)>>3;return left?160-d:864+d;}
/** D-37: the fooled keeper's presentation: 'misread' (approved v6 frame) from the turn until the ball passes him, then 'f15'
 * until the goal is over. Returns {slot,pose,characterId} or null. Read-only. */
export function getTsubasaRazorKeeperPose(r){const session=sessions.get(r),a=session?.active;
 if(a?.razor&&valid(r,a)&&a.keeperLookUp!=null&&!session.razorKeeper)return {slot:a.keeperLookUp,pose:'misread',characterId:a.razor.keeperCharacterId};
 const k=session?.razorKeeper;if(k&&r[0x58]===0&&((r[0x300]-k.passFrame)&255)<48)return {slot:k.slot,pose:'f15',characterId:k.characterId};return null;}
/** D-37 f15 mode per keeper, locked for the match on first use ('hd' needs project's approved HD f15). */
export function getTsubasaRazorKeeperF15Mode(r,characterId,table){const session=sessions.get(r);if(!session)return null;session.razorF15Modes??=new Map();const key=characterId??'generic';if(!session.razorF15Modes.has(key))session.razorF15Modes.set(key,table[key]==='hd'?'hd':'native');return session.razorF15Modes.get(key);}
/** D-37 native f15 + wrong-way dive (project's rule: f15 dives toward the side the ball was heading BEFORE the turn, i.e. away
 * from the final entry side: opposite to the curve). Called at the native frame tail before OAM assembly: while the razor keeper
 * shows f15 his display frame ($74+x) is 15 (facing bit kept: native assembler $03 flips tiles when bit7 is clear), and for the first
 * TSUBASA_RAZOR_KEEPER_DIVE.frames frames he moves TSUBASA_RAZOR_KEEPER_DIVE.step px/frame in y against the curve. */
/** D-62 (project) Skylab foot volley from EXISTING Nekketsu frames only (display frame byte $74+x, facing bit kept; RAM logic untouched):
 * board twin = native crouch f8 (landing crouch) while the jumper is airborne; jumper = native jump f2 on the way up; near the apex (native header rise f3) the native overhead wind-up f26, and from the
 * strike (native header f13 / shot fired) the overhead-kick foot frame f27 for holdTicks (
 * the frames Tsubasa's real overhead 0x32 uses at its apex). So the kick is with the foot, not the head. */
export const TSUBASA_SKYLAB_FOOT_VOLLEY=Object.freeze({boardFrame:8,headerFrame:13,kickFrames:Object.freeze([26,27]),extendFrame:58,headerAction:0x38,riseFrame:3,holdTicks:6});
export function applyTsubasaSkylabFootVolleyFrame(r){const session=sessions.get(r);if(!session)return false;const poses=getTsubasaSkylabPoses(r);if(!poses.length)return false;
 const T=TSUBASA_SKYLAB_FOOT_VOLLEY,j=poses.find(p=>p.role==='jumper'),b=poses.find(p=>p.role==='board');if(j?.slot==null)return false;const air=r[0x386+j.slot]>0;
 const set=(slot,f)=>{r[0x74+slot]=(r[0x74+slot]&128)|f;};session.skylabKick??={slot:null,ticks:0};const k=session.skylabKick;
 if(b?.slot!=null&&air){set(b.slot,T.boardFrame);/* v2 (project/project): the board twin stays crouched on the ground directly under the takeoff point, so the jump reads as springing off him */const P=(l,h,from,to)=>{r[l+to]=r[l+from];r[h+to]=r[h+from];};session.skylabBase??=(()=>({x:[r[0x314+j.slot],r[0x327+j.slot],r[0x301+j.slot]],y:[r[0x34d+j.slot],r[0x360+j.slot],r[0x33a+j.slot]]}))();const B=session.skylabBase;[r[0x314+b.slot],r[0x327+b.slot],r[0x301+b.slot]]=B.x;[r[0x34d+b.slot],r[0x360+b.slot],r[0x33a+b.slot]]=B.y;r[0x386+b.slot]=0;r[0x399+b.slot]=0;r[0x373+b.slot]=0;}else if(!air)session.skylabBase=null;
 const f=r[0x74+j.slot]&127,act=r[0x459+j.slot]&127,shot=session.active?.moveId==='skylab-hurricane';
 const w=(l,h,s)=>{const v=r[l+s]|r[h+s]<<8;return v&32768?v-65536:v;},toe=!shot&&air&&act===T.headerAction&&Math.abs(w(0x314,0x327,12)-w(0x314,0x327,j.slot))<=12&&w(0x386,0x399,12)-w(0x386,0x399,j.slot)>=14&&k.ballZ!=null&&w(0x386,0x399,12)<k.ballZ;k.ballZ=w(0x386,0x399,12);/* contact = the tick the ball tops out next to the inverted jumper (last tick before the native shot fires) */
 if(toe&&k.slot!==j.slot){r[0x74+j.slot]=((r[0x74+j.slot]&128)^128)|T.extendFrame;/* v2 contact: native inverted leg-extended f58, mirrored so the foot points at the ball, ball on the toe */}
 else if(air&&act===T.headerAction&&f===T.riseFrame&&k.slot!==j.slot){set(j.slot,T.kickFrames[0]);/* wind-up at the apex: native overhead leg-swing frame */}
 else if(air&&(f===T.headerFrame||shot)&&k.slot!==j.slot&&!k.done){k.slot=j.slot;k.ticks=0;k.clock=null;}
 if(k.slot===j.slot&&air&&k.ticks<T.holdTicks){set(j.slot,T.kickFrames[1]);if(k.clock!==r[0x300]){k.clock=r[0x300];k.ticks++;}if(k.ticks>=T.holdTicks)k.done=true;}else if(!air){k.slot=null;k.done=false;}
 return true;}
export const TSUBASA_RAZOR_KEEPER_DIVE=Object.freeze({frames:8,step:2});
export function applyTsubasaRazorKeeperFrame(r){const session=sessions.get(r),p=getTsubasaRazorKeeperPose(r);if(!p)return false;const put=(slot,x,y)=>{r[0x314+slot]=x&255;r[0x327+slot]=(x>>8)&255;r[0x34d+slot]=y&255;r[0x360+slot]=(y>>8)&255;};
 // fooled: he stays where he stood when the ball turned (native AI may not walk him), then the f15 dive
 if(p.pose==='misread'){const h=session.active?.razor?.keeperHold;if(h)put(p.slot,h.x,h.y);return true;}
 const k=session.razorKeeper;k.faceBit??=r[0x74+k.slot]&128;r[0x74+k.slot]=15|k.faceBit;/* facing locked for the whole f15 *//* display frame byte read by the assembler */
 if(k.diveClock!==r[0x300]){k.diveClock=r[0x300];k.diveFrames=(k.diveFrames??0)+1;}
 const n=Math.min(k.diveFrames??0,TSUBASA_RAZOR_KEEPER_DIVE.frames);put(k.slot,k.hold.x,k.hold.y-k.curve*TSUBASA_RAZOR_KEEPER_DIVE.step*n);k.diveOffsetY=-k.curve*TSUBASA_RAZOR_KEEPER_DIVE.step*n;
 return true;}
/** D-37: the razor's opposing keeper never touches it (fooled; no save, no chop; D-35 Wakashimazu rule is drive-only). */
export function tsubasaRazorIgnoresKeeper(r,slot){const a=sessions.get(r)?.active;return !!(a?.razor&&valid(r,a)&&slot===a.razor.keeperSlot);}
/** Razor kick (kick-v1): Soda's own HD frames re-timed f10x3, f33x1, f11x2 (contact), f13x4 - reuses the original shot
 * motion, not claimed to match the anime. Native already shows f10x3 and f33x1; from the contact frame (first native
 * frame after f33) the shooter shows f11 for 2 frames then f13 for 4, then native again. Only through the D-36 hook
 * (razor curve set explicitly) and only for 早田 (soda). Clock: r[0x300] (native frame counter). */
const razorKicks=new WeakMap();
export function getTsubasaRazorKickFrame(r,entity,nativeFrame=r[0x94+entity]){const session=sessions.get(r);if(!session||entity>=12||getTsubasaActorIdentity(r,entity)?.characterId!=='soda')return null;
 let k=razorKicks.get(r);if(!k){k=new Map();razorKicks.set(r,k);}const e=k.get(entity)??{last:null,start:null,clock:null},nat=nativeFrame&127,clock=r[0x300];
 if(e.clock!==clock){if(e.last===33&&nat!==33&&inShootingRange(r))e.start=clock;/* Must D-37: razor kick only where the razor can fire */e.last=nat;e.clock=clock;}k.set(entity,e);
 if(e.start===null)return null;const t=(clock-e.start)&255;if(t<2)return 11;if(t<6)return 13;e.start=null;return null;}

/** D-33 (keepers and ball are never dropped during specials), OAM-record level: when the native 64-record OAM is
 * exhausted, the entries at the tail of the display list ($A1..) get no records at all, and the native alternate-frame
 * reversal (03:BF23) moves the keepers to the tail every other frame. Only while a non-native special is active, move
 * the ball, its shadow and both keepers to the front of the list (stable order otherwise). Ordinary play untouched. */
// D-33: keepers (10,11) and the ball (12) go to the list tail so OAM-full frames never drop them. The ball shadow (0x2c) keeps its native slot so its layering over the keeper is unchanged.
function razorKickRunning(r){const session=sessions.get(r);if(!session)return false;for(let e=0;e<10;e++)if([10,33].includes(r[0x74+e]&127)&&getTsubasaActorIdentity(r,e)?.characterId==='soda'){if((r[0x74+e]&127)===33)session.razorKickPinFrom=r[0x300];return true;}if(session.razorKickPinFrom!=null&&((r[0x300]-session.razorKickPinFrom)&255)<10)return true;const k=razorKicks.get(r);if(!k)return false;for(const e of k.values())if(e.last===33||e.start!==null&&((r[0x300]-e.start)&255)<6)return true;return false;}
export function pinTsubasaSpecialDisplayEntries(r){const a=sessions.get(r)?.active;/* D-37: the razor kick (f10/f33 wind-up, f11/f13 contact) precedes the special session: pin through it too (special moves enabled only) */const kick=razorKickRunning(r)||isTsubasaMorisakiSaveRunning(r)/* M-9 D-40: keeper + ball stay pinned through the block (never cropped) */;if(!kick){if(!a||!valid(r,a))return false;const st=getTsubasaSpecialState(r);if(!st||st.nativeArtwork)return false;}
 const n=r[0xf4];if(n>32)return false;const list=[...r.subarray(0xa1,0xa1+n)],pin=v=>!(v&32)&&[10,11,12].includes(v&31);const out=[...list.filter(v=>!pin(v)),...list.filter(pin)];
 if(out.every((v,i)=>v===list[i]))return false;r.set(out,0xa1);return true;}

/** D-59 sprint-in (project/project/project): a CPU twin about to jump-shoot inside the D-37 range with the
 * other twin within CPU_SKYLAB_RADIUS arms a sprint: the board twin runs (native dash cycle frames 0/1)
 * toward the jumper (ground) / the takeoff point (airborne) at <= CPU_SKYLAB_SPRINT_SPEED px per logic
 * frame (native 0x21 dash max is 4.0 axis / 4.24 diagonal), then crouches. Only CPU jumpers arm it, so
 * the 1P stacked skylab is untouched. */
export const CPU_SKYLAB_SPRINT_SPEED=3*Math.SQRT2,CPU_SKYLAB_SPRINT_AXIS=4;/* native 0x21 dash: per-frame steps (2,2),(3,0),(3,2),(4,0),(3,3) -> max 4 px per axis, 4.24 px euclidean */
const CPU_SKYLAB_FOLLOW_GAP=0,CPU_SKYLAB_APPROACH=0x130;
export const CPU_SKYLAB_WAIT_SPEED=1,CPU_SKYLAB_MIN_CROUCH=2,CPU_SKYLAB_MAX_HOLD=90,CPU_SKYLAB_TAKEOFF_REQUESTS=Object.freeze([0x30,0x33,0x37,0x34,0x38]);
/** D-59 (b) (project/project/project): runs right after the native AI decision pipeline. A CPU twin of an armed pair asking for a
 * special jump shot (0x479 = 30 jump, or 33/37/34/38 jump shots, while on the ground with the ball) is held on the ground until the board twin has sprinted under him and crouched
 * >= CPU_SKYLAB_MIN_CROUCH frames; the held request is then handed back unchanged. Timeout CPU_SKYLAB_MAX_HOLD -> native jump (no skylab). */
export function getTsubasaCpuSkylabStats(r){return {...(sessions.get(r)?.cpuSkylabStats??{})};}
const bump=(r,k)=>{const se=sessions.get(r);if(!se)return;se.cpuSkylabStats??={};se.cpuSkylabStats[k]=(se.cpuSkylabStats[k]??0)+1;};
export function gateTsubasaCpuSkylabTakeoff(r){const sp=sessions.get(r)?.cpuSkylabSprint;if(!sp||sp.air)return false;const J=sp.jumper;
 if(sp.hold&&!sp.hold.release&&(r[0x4d6]!==J||!r[0xd9+J]||!r[0xd9+sp.board])){bump(r,'drop');sp.hold=null;return false;}/* ball lost: drop the hold */
 if(sp.hold){if(sp.hold.release){if(!sp.hold.given){r[0x479+J]=sp.hold.req;sp.hold.given=true;bump(r,sp.hold.timeout?'timeout':'release');}return true;}if(r[0x479+J]!==255)r[0x479+J]=255;return true;}
 const req=r[0x479+J];if(!CPU_SKYLAB_TAKEOFF_REQUESTS.includes(req)||r[0x4d6]!==J||pos(r,J).z>0)return false;const p=pos(r,J);bump(r,'hold');sp.hold={req,x:p.x,y:p.y,frames:0,crouch:0,release:false};r[0x479+J]=255;return true;}
export function applyTsubasaCpuSkylabSprintFrame(r){const session=sessions.get(r);if(!session)return false;
 const twin=q=>{const id=getTsubasaActorIdentity(r,q)?.characterId;return id==='tachibana_masao'||id==='tachibana_kazuo'?id:null;};
 session.twinGround??={};for(let q=0;q<12;q++)if(twin(q)&&pos(r,q).z<=0){const p=pos(r,q);session.twinGround[q]={x:p.x,y:p.y};}
 const jumping=q=>pos(r,q).z>0;
 let sp=session.cpuSkylabSprint;const skylabOn=session.active?.moveId==='skylab-hurricane';
 if(skylabOn){if(sp&&!session.active.partners?.some(p=>p.slot===sp.board))sp=session.cpuSkylabSprint=null;}
 else if(sp?.air){if(!r[0xd9+sp.jumper]||!r[0xd9+sp.board]||pos(r,sp.jumper).z<=0)sp=session.cpuSkylabSprint=null;}
 else{/* pick the CPU twin pair: both on the field, within CPU_SKYLAB_RADIUS, ball in the D-37 range, their side in possession or a twin jumping */let pick=null;
  const bx=pos(r).x,bo=r[0x4a3+12]&128?1023-bx:bx;/* arm a little before the D-37 range so the sprint has time; the skylab itself still needs inShootingRange at the shot */if(bo>=TSUBASA_SHOOTING_RANGE.from-CPU_SKYLAB_APPROACH&&bo<TSUBASA_SHOOTING_RANGE.to)for(let t=0;t<12&&!pick;t++){const id=twin(t);if(!id||!r[0xd9+t]||!(r[0x650+t]&128))continue;for(let o=t&1;o<12;o+=2){if(o===t||!r[0xd9+o]||!twin(o)||twin(o)===id)continue;const p=pos(r,t),q=pos(r,o);if(Math.hypot(p.x-q.x,p.y-q.y)>CPU_SKYLAB_RADIUS)continue;const ball=pos(r);let j=null;if(jumping(t))j=t;else if(jumping(o)&&(r[0x650+o]&128))j=o;else if(q.z<=0&&p.z<=0&&sp&&[t,o].includes(sp.jumper)&&[t,o].includes(sp.board))j=sp.jumper;/* hysteresis: keep the current runner while both are on the ground */else if(q.z<=0&&p.z<=0)j=Math.hypot(ball.x-p.x,ball.y-p.y)<=Math.hypot(ball.x-q.x,ball.y-q.y)?t:o;if(j!==null&&(r[0x650+j]&128)&&pos(r,j===t?o:t).z<=0){pick={jumper:j,board:j===t?o:t};break;}}}
  if(!pick)sp=session.cpuSkylabSprint=null;else if(!sp||sp.jumper!==pick.jumper||sp.board!==pick.board){const q=pos(r,pick.board);sp=session.cpuSkylabSprint={...pick,x:q.x,y:q.y,arrived:false,air:false,target:null,age:0,trace:[]};}}
 if(!sp)return false;const b=sp.board,jp=pos(r,sp.jumper),J=sp.jumper;
 const putS=(slot,lo,hi,fr,v)=>{const i=Math.floor(v);r[lo+slot]=i&255;r[hi+slot]=(i>>8)&255;r[fr+slot]=Math.round((v-i)*256)&255;};
 if(!sp.hold&&!sp.air&&!skylabOn){/* (b) armed only: both twins keep their native movement until the jumper asks to take off */const q=pos(r,b);sp.x=q.x;sp.y=q.y;return false;}
 if(sp.hold&&!sp.air&&jp.z<=0){/* (b) takeoff held (gateTsubasaCpuSkylabTakeoff): the jumper stays on the ball at the takeoff point in the native dribble cycle (never a still frame); the board twin sprints in */const h=sp.hold;h.frames++;if(Math.hypot(h.x-sp.x,h.y-sp.y)>CPU_SKYLAB_SPRINT_SPEED&&!h.crouch)h.x+=(r[0x4a3+12]&128?-1:1)*CPU_SKYLAB_WAIT_SPEED;/* project: the jumper keeps dribbling forward (slowed) until his brother is about to arrive, then plants for the step-up */putS(J,0x314,0x327,0x301,h.x);putS(J,0x34d,0x360,0x33a,h.y);r[0x74+J]=(r[0x74+J]&128)|((h.frames>>2)&1);
  const dx=h.x-sp.x,dy=h.y-sp.y,d=Math.hypot(dx,dy);let step=Math.min(CPU_SKYLAB_SPRINT_SPEED,d);if(step>0)step=Math.min(step,CPU_SKYLAB_SPRINT_AXIS*d/Math.max(Math.abs(dx),Math.abs(dy)));if(step>0&&d>0){sp.x+=dx/d*step;sp.y+=dy/d*step;}
  const there=Math.hypot(h.x-sp.x,h.y-sp.y)<1e-6;if(there){sp.x=h.x;sp.y=h.y;h.crouch++;}putS(b,0x314,0x327,0x301,sp.x);putS(b,0x34d,0x360,0x33a,sp.y);r[0x386+b]=0;r[0x399+b]=0;r[0x373+b]=0;
  r[0x74+b]=(step>0?(dx<0?128:0):(r[0x74+b]&128))|(there?TSUBASA_SKYLAB_FOOT_VOLLEY.boardFrame:((h.frames>>2)&1));
  if(there&&h.crouch>=CPU_SKYLAB_MIN_CROUCH)h.release=true;else if(h.frames>=CPU_SKYLAB_MAX_HOLD){h.release=true;h.timeout=true;}
  sp.trace.push({x:sp.x,y:sp.y,jx:h.x,jy:h.y,phase:there?'crouch':'sprint',hold:h.frames});if(sp.trace.length>256)sp.trace.shift();return true;}
 if(sp.hold&&jp.z>0&&!sp.air){if(sp.hold.timeout){session.cpuSkylabSprint=null;return false;}sp.air=true;sp.target={x:sp.hold.x,y:sp.hold.y};sp.hold=null;}
 if(skylabOn&&!sp.arrived&&sp.target){/* last sprint step (<= cap, guaranteed by cpuSkylabStepReaches) */const put=(lo,hi,fr,v)=>{const i=Math.floor(v);r[lo+b]=i&255;r[hi+b]=(i>>8)&255;r[fr+b]=Math.round((v-i)*256)&255;};sp.x=sp.target.x;sp.y=sp.target.y;sp.arrived=true;put(0x314,0x327,0x301,sp.x);put(0x34d,0x360,0x33a,sp.y);}
 if(skylabOn){/* hold: crouched exactly where he arrived (the takeoff point) */session.skylabBase??={x:[Math.floor(sp.x)&255,(Math.floor(sp.x)>>8)&255,Math.round((sp.x-Math.floor(sp.x))*256)&255],y:[Math.floor(sp.y)&255,(Math.floor(sp.y)>>8)&255,Math.round((sp.y-Math.floor(sp.y))*256)&255]};sp.trace.push({x:sp.x,y:sp.y,phase:'hold'});return true;}
 if(jp.z>0&&!sp.air){sp.air=true;sp.target=session.twinGround[sp.jumper]??{x:jp.x,y:jp.y};}
 let tx,ty,gap;if(sp.air){tx=sp.target.x;ty=sp.target.y;gap=0;}else{tx=jp.x;ty=jp.y;gap=CPU_SKYLAB_FOLLOW_GAP;}
 const dx=tx-sp.x,dy=ty-sp.y,d=Math.hypot(dx,dy);let step=Math.max(0,Math.min(CPU_SKYLAB_SPRINT_SPEED,d-gap));if(step>0)step=Math.min(step,CPU_SKYLAB_SPRINT_AXIS*d/Math.max(Math.abs(dx),Math.abs(dy)));
 if(step>0){sp.x+=dx/d*step;sp.y+=dy/d*step;}sp.arrived=sp.air&&Math.hypot(tx-sp.x,ty-sp.y)<1e-6;if(sp.arrived){sp.x=tx;sp.y=ty;}
 const put=(lo,hi,fr,v)=>{const i=Math.floor(v);r[lo+b]=i&255;r[hi+b]=(i>>8)&255;r[fr+b]=Math.round((v-i)*256)&255;};put(0x314,0x327,0x301,sp.x);put(0x34d,0x360,0x33a,sp.y);r[0x386+b]=0;r[0x399+b]=0;r[0x373+b]=0;
 sp.age++;const crouch=sp.arrived;const mirror=step>0?(dx<0?128:0):(r[0x74+b]&128);r[0x74+b]=mirror|(crouch?TSUBASA_SKYLAB_FOOT_VOLLEY.boardFrame:((sp.age>>2)&1));
 sp.trace.push({x:sp.x,y:sp.y,phase:crouch?'crouch':'sprint'});if(sp.trace.length>256)sp.trace.shift();return true;}
function cpuSkylabStepReaches(sp){if(!sp.target)return false;const dx=sp.target.x-sp.x,dy=sp.target.y-sp.y,d=Math.hypot(dx,dy);return d<=CPU_SKYLAB_SPRINT_SPEED&&Math.max(Math.abs(dx),Math.abs(dy))<=CPU_SKYLAB_SPRINT_AXIS;}
export function getTsubasaCpuSkylabSprint(r){const sp=sessions.get(r)?.cpuSkylabSprint;return sp?{...sp,trace:undefined}:null;}
