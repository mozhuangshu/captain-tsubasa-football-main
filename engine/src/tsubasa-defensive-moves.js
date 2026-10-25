/** Opt-in Captain Tsubasa defensive adaptations. The recovered contact code
 * still owns damage, fatigue, catches, punching, random drops and rebounds.
 * These small, time-bounded reach/resistance changes never award possession.
 * Names/poses are sourced separately from deliberately adapted balance values. */
import {isTsubasaSpecialMovesEnabled,getTsubasaActorIdentity,tsubasaRazorIgnoresKeeper} from './tsubasa-special-moves.js';
import {fieldBoundary,goalFrameGeometry} from './goal.js';

const sessions=new WeakMap();
const w=(r,l,h)=>r[l]|r[h]<<8,sgn=n=>n&32768?n-65536:n;
const put=(r,l,h,n)=>{r[l]=n&255;r[h]=(n>>8)&255;};
const position=(r,s)=>({x:w(r,0x314+s,0x327+s),y:w(r,0x34d+s,0x360+s),z:sgn(w(r,0x386+s,0x399+s))});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const KEEP_ACTIONS=new Set([1,0x28,0x29,0x30,0x3e,0x3f,0x40,0x41,0x52,0x54]);
const JUMP_ACTIONS=new Set([0x30,0x52,0x54]);
const POST_JUMP_CONTINUATIONS=new Set([0x30,0x52,0x54,0x3e,0x3f,0x40,0x41]);
const BLOCK_ACTIONS=new Set([1,0x30,0x52]);
export const TSUBASA_DEFENSIVE_PROFILES=freeze({
 'karate-save':{characterId:'wakashimazu',name:'空手道扑救',kind:'keeper',pose:'karate-reach',defenseBonus:6,reach:[3,3,2,5,0],frames:16,minimumStamina:10,sourceUrls:['https://ball-ha-tomodachi.com/jryouth/chara/06.html'],evidence:'official-animation-character',isNamedCanonMove:false},
 'triangle-jump':{status:'implemented',characterId:'wakashimazu',name:'三角跳（保守适配）',kind:'keeper',pose:'post-rebound-jump',defenseBonus:6,reach:[4,4,2,8,0],frames:18,minimumStamina:16,sourceUrls:['https://www.takaratomy.co.jp/products/tsubasa_fcg/howto/faq_card.html?card=CT-01','https://emira-t.jp/fantasy/25782/'],evidence:'official-animation-licensed-name + secondary-original-manga-action; conservative-adaptation-not-animation-frame-reproduction',isNamedCanonMove:true},
 'sggk-guard':{characterId:'wakabayashi',name:'SGGK门前封堵',kind:'keeper',pose:'front-catch',defenseBonus:8,reach:[2,2,1,3,0],frames:14,minimumStamina:10,sourceUrls:['https://ball-ha-tomodachi.com/jryouth/story/29.html'],evidence:'official-animation-episode; title-style-not-named-technique',isNamedCanonMove:false},
 'power-catch':{characterId:'muller',name:'强力接球',kind:'keeper',pose:'power-catch',defenseBonus:12,reach:[2,2,2,2,0],frames:14,minimumStamina:12,sourceUrls:['https://ball-ha-tomodachi.com/jryouth/story/31.html'],evidence:'official-animation-episode; descriptive-adaptation-name',isNamedCanonMove:false},
 'perfect-save':{characterId:'hernandez',name:'稳健扑救',kind:'keeper',pose:'precision-catch',defenseBonus:10,reach:[3,3,1,4,0],frames:14,minimumStamina:10,sourceUrls:['https://ball-ha-tomodachi.com/jryouth/chara/12.html','https://ball-ha-tomodachi.com/jryouth/story/11.html'],evidence:'official-animation-character-and-episode; descriptive-adaptation-not-perfect-success',isNamedCanonMove:false},
 'aerial-tackle':{characterId:'kaltz',name:'空中铲断',kind:'air-tackle',pose:'aerial-slide',defenseBonus:0,reach:[3,3,2,4,0],frames:12,minimumStamina:8,sourceUrls:['https://ball-ha-tomodachi.com/jryouth/story/35.html','https://ball-ha-tomodachi.com/jryouth/chara/10.html'],evidence:'official-animation-episode-and-character; native-air-contact-adaptation',isNamedCanonMove:false},
 'face-block':{characterId:'ishizaki',name:'脸部挡球',kind:'block',pose:'face-block',defenseBonus:10,reach:[1,1,2,6,0],frames:12,minimumStamina:8,sourceUrls:['https://prtimes.jp/main/html/rd/p/000000601.000099047.html','https://www.soccer-king.jp/news/japan/japan_other/20181225/872448.html'],evidence:'licensed-animation-promotion; animation-frame-check-pending',isNamedCanonMove:true},
 'marking-slide':{characterId:'soda',name:'早田盯防铲断',kind:'tackle',pose:'low-slide',defenseBonus:0,reach:[3,3,2,0,0],frames:12,minimumStamina:8,sourceUrls:['https://www.soccer-king.jp/news/world/wc/20221118/1706524.html','https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/'],evidence:'official-animation-character; conservative-canon-adaptation; descriptive-name',isNamedCanonMove:false},
 /* 2026-10-21 roster (docs/SHOT_LOOK_CARDS.md section 6; names from the Dream Team skill list, tsubasa.im): smaller
  * bonuses than the named canon techniques; same live envelopes as face-block / power-block / marking-slide / power-catch */
 'takasugi-body-block':{characterId:'takasugi',name:'无敌身体拦截',kind:'block',pose:'body-block',defenseBonus:6,reach:[2,2,2,2,0],frames:14,minimumStamina:10,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=126'],evidence:'DT skill: Invincible Body Block'},
 'urabe-hot-block':{characterId:'urabe',name:'热血封堵',kind:'block',pose:'body-block',defenseBonus:5,reach:[2,2,2,2,0],frames:12,minimumStamina:8,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=7'],evidence:'DT skill: Hot-Blooded Block'},
 'kishida-shark-tackle':{characterId:'kishida',name:'鲨鱼铲断',kind:'tackle',pose:'low-slide',defenseBonus:0,reach:[3,3,2,0,0],frames:12,minimumStamina:8,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=6'],evidence:'DT skill: Shark Tackle'},
 'nakayama-strong-tackle':{characterId:'nakayama',name:'强力铲断',kind:'tackle',pose:'low-slide',defenseBonus:0,reach:[2,2,2,0,0],frames:12,minimumStamina:8,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=3'],evidence:'DT skill: Strong Tackle'},
 'galvan-rush-tackle':{characterId:'galvan',name:'冲撞铲断',kind:'tackle',pose:'low-slide',defenseBonus:0,reach:[3,3,2,0,0],frames:12,minimumStamina:10,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=151'],evidence:'DT skill: Galvan Rush Tackle'},
 'kato-headband-save':{characterId:'kato',name:'头带扑救',kind:'keeper',pose:'power-catch',defenseBonus:6,reach:[2,2,1,2,0],frames:14,minimumStamina:10,sourceUrls:[],evidence:'creative: his headband; no DT skill'},
 'amoros-power-punch':{characterId:'amoros',name:'强力拳击',kind:'keeper',pose:'precision-catch',defenseBonus:6,reach:[3,3,1,3,0],frames:14,minimumStamina:10,sourceUrls:['https://tsubasa.im/global/en/character/skills/?id=183'],evidence:'DT skill: Power Punch'},
 'power-block':{characterId:'jito',name:'身体拦截',kind:'block',pose:'body-block',defenseBonus:8,reach:[2,2,2,2,0],frames:14,minimumStamina:10,sourceUrls:['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/'],evidence:'official-animation-character; descriptive-adaptation-name',isNamedCanonMove:false},
});
const playable=r=>isTsubasaSpecialMovesEnabled(r)&&r[0x58]===0&&(r[0x59]&127)===2&&r[0x5c]===0;
export function isTsubasaActualGoalkeeper(r,slot){return (slot===10||slot===11)&&!(r[0x67c+slot]&128)&&getTsubasaActorIdentity(r,slot)?.role==='keeper';}
function sessionFor(r){let s=sessions.get(r);if(!s){s={clock:0,serial:0,owner:r[0x4d6],active:new Map(),cooldown:new Map(),events:[]};sessions.set(r,s);}return s;}
function emit(s,event){s.events.push({...event,clock:s.clock});if(s.events.length>24)s.events.shift();}
function identityStillMatches(r,a){const identity=getTsubasaActorIdentity(r,a.slot);return identity?.characterId===a.characterId&&identity.teamId===a.teamId&&r[0x532+a.slot]===a.playerNumber&&(a.kind!=='keeper'||isTsubasaActualGoalkeeper(r,a.slot));}
function activeValid(r,s,a){
 if(!playable(r)||a.sourceOwner!==r[0x4d6]||s.clock>=a.until||!identityStillMatches(r,a))return false;
 const action=r[0x459+a.slot]&127;
 // The native goalkeeper AI may turn the launch into an ordinary aerial
 // catch/punch on the following tick. Keep only the already completed rebound
 // while airborne and still travelling across the mouth. Never repeat its
 // impulse, suppress native AI, or admit recoil/ground/reverse-direction moves.
 if(a.moveId==='triangle-jump'&&a.impulseApplied){
  if(!POST_JUMP_CONTINUATIONS.has(action)||position(r,a.slot).z<=0||sgn(w(r,0x404+a.slot,0x412+a.slot))*a.postContact.away<=0)return false;
 }else if(a.action!==action)return false;
 // Recheck the live contact envelope, so a face block cannot quietly become a
 // foot save, nor a started interception become a shield around a held ball.
 const t=incoming(r,a.slot);if(!t)return false;
 if(a.kind==='air-tackle')return aerialTackleEnvelope(r,a.slot,t);
 if(a.kind==='tackle')return t.held&&t.distance<=52&&Math.abs(t.dy)<=20&&Math.abs(t.dz)<=12;
 if(t.held||(!t.approaching&&t.distance>2))return false;
 if(a.kind==='keeper')return t.distance<=112&&Math.abs(t.dy)<=64&&t.dz>=-12&&t.dz<=80&&nearOwnGoal(r,a.slot,t.p);
 return t.distance<=56&&Math.abs(t.dy)<=20&&(a.moveId==='face-block'?t.dz>=16&&t.dz<=40:t.dz>=0&&t.dz<=32);
}
export function clearTsubasaDefensiveState(r,reason='reset'){sessions.delete(r);return reason;}
/** One call per logic update, never per render. Host also clears on pause/reset. */
export function tickTsubasaDefensiveState(r){
 const s=sessions.get(r);if(!s)return;if(!playable(r)){clearTsubasaDefensiveState(r,'inactive');return;}
 s.clock++;if(s.owner!==r[0x4d6]){s.owner=r[0x4d6];s.active.clear();s.cooldown.clear();s.events=s.events.filter(e=>e.type==='tsubasa-special-contact');}
 for(const [slot,a] of s.active)if(!activeValid(r,s,a))s.active.delete(slot);
 s.events=s.events.filter(e=>s.clock-e.clock<24);
}
function incoming(r,slot){
 const owner=r[0x4d6];if(owner>=12||!((owner^slot)&1))return null;
 const p=position(r,slot),b=position(r,12),dx=b.x-p.x,dy=b.y-p.y,dz=b.z-p.z;
 const vx=sgn(w(r,0x3f4,0x402)),vy=sgn(w(r,0x410,0x41e));
 return {owner,p,b,dx,dy,dz,distance:Math.hypot(dx,dy),held:!!(r[0x492]&64),approaching:dx*vx+dy*vy<0,powered:r[0x4f0]>0||r[0x4c9]>0};
}
function aerialTackleEnvelope(r,slot,t){const target=position(r,t.owner);return slot<10&&!!(r[0x486+slot]&128)&&!!(r[0x486+t.owner]&128)&&t.p.z>=8&&target.z>=8&&Math.abs(target.z-t.p.z)<=24&&t.held&&t.distance<=52&&Math.abs(t.dy)<=20&&Math.abs(t.dz)<=28;}
function nearOwnGoal(r,slot,p){return Math.abs(p.x-((slot&1)?888:136))<=128&&p.y>=136&&p.y<=256;}
/** Posts lie on native goal-mouth Y=164/228. Their front X comes from the
 * recovered sloped field edge (goal.js); 12/8 are player-contact tolerances.
 * This is a local pole contact, not a keeper-wide launch-zone approximation. */
export function locateTsubasaGoalpostContact(r,slot){
 if(!isTsubasaActualGoalkeeper(r,slot))return null;const p=position(r,slot),vy=sgn(w(r,0x404+slot,0x412+slot));if(p.z<0||p.z>44)return null;
 for(const y of [164,228]){const slope=(y-48)>>>3,x=(slot&1)?864+slope:160-slope,away=y===164?1:-1;
  if(Math.abs(p.x-x)>12||Math.abs(p.y-y)>8||vy*away> -64)continue;
  // Probe the keeper's native 8-by-4 foot/body reach against the recovered
  // goal-frame collision, using a RAM copy so qualification stays read-only.
  const py=y-away;if(Math.abs(p.y-py)>4)continue;const probe=r.slice(),px=p.x+((slot&1)?8:-8);
  for(const [lo,hi,value] of [[0x320,0x333,px],[0x359,0x36c,py],[0x392,0x3a5,p.z]])put(probe,lo,hi,value);
  const boundary=fieldBoundary(probe,12),frame=goalFrameGeometry(probe,12);
  if((boundary&2)&&(frame&128)&&!(frame&5))return {x,y,z:p.z,away,collisionProbe:{x:px,y:py,z:p.z,boundary,frame},approachVelocity:{x:sgn(w(r,0x3e8+slot,0x3f6+slot)),y:vy}};
 }return null;
}
function choose(r,slot,t,identity){
 const a=r[0x459+slot]&127;
 if(isTsubasaActualGoalkeeper(r,slot)){
  if(tsubasaRazorIgnoresKeeper(r,slot))return null;// D-37: fooled by the razor (no karate-save/chop, no SGGK guard)
  if(!KEEP_ACTIONS.has(a)||t.held||!t.approaching||t.distance>112||Math.abs(t.dy)>64||t.dz< -12||t.dz>80||!nearOwnGoal(r,slot,t.p)||!t.powered)return null;
  if(identity.characterId==='wakashimazu'){const post=JUMP_ACTIONS.has(a)&&!(r[0x459+slot]&128)&&t.dz>=24?locateTsubasaGoalpostContact(r,slot):null;return post&&(t.b.y-post.y)*post.away>8?'triangle-jump':'karate-save';}
  if(identity.characterId==='wakabayashi')return 'sggk-guard';
  if(identity.characterId==='muller')return 'power-catch';
  if(identity.characterId==='hernandez')return 'perfect-save';
  if(identity.characterId==='kato')return 'kato-headband-save';
  if(identity.characterId==='amoros')return 'amoros-power-punch';
  return null;
 }
 // Keeper identities in FIELD never inherit their keeper technique.
 if(identity.canonicalRole==='GK')return null;
 if(identity.characterId==='kaltz'&&[0x3b,0x42].includes(a)&&aerialTackleEnvelope(r,slot,t))return 'aerial-tackle';
 if(identity.characterId==='soda'&&a===0x23&&t.held&&t.distance<=52&&Math.abs(t.dy)<=20&&Math.abs(t.dz)<=12)return 'marking-slide';
 {const slide={kishida:'kishida-shark-tackle',nakayama:'nakayama-strong-tackle',galvan:'galvan-rush-tackle'}[identity.characterId];if(slide&&a===0x23&&t.held&&t.distance<=52&&Math.abs(t.dy)<=20&&Math.abs(t.dz)<=12)return slide;}
 if(t.held||!t.powered||!t.approaching||t.distance>56||Math.abs(t.dy)>20||!BLOCK_ACTIONS.has(a))return null;
 if(identity.characterId==='ishizaki'&&t.dz>=16&&t.dz<=40)return 'face-block';
 if(identity.characterId==='jito'&&t.dz>=0&&t.dz<=32)return 'power-block';
 if(identity.characterId==='takasugi'&&t.dz>=0&&t.dz<=32)return 'takasugi-body-block';
 if(identity.characterId==='urabe'&&t.dz>=0&&t.dz<=32)return 'urabe-hot-block';
 return null;
}
/** Called from the player-action dispatcher before original initialization. */
export function prepareTsubasaDefensiveAction(r,slot){
 if(!playable(r))return null;const identity=getTsubasaActorIdentity(r,slot);if(!identity)return null;
 const s=sessionFor(r),old=s.active.get(slot);if(old&&activeValid(r,s,old))return old;if(old)s.active.delete(slot);
 if(s.owner!==r[0x4d6]){s.owner=r[0x4d6];s.active.clear();s.cooldown.clear();s.events=s.events.filter(e=>e.type==='tsubasa-special-contact');}
 if((s.cooldown.get(slot)??0)>s.clock)return null;
 const threat=incoming(r,slot);if(!threat)return null;const moveId=choose(r,slot,threat,identity),profile=TSUBASA_DEFENSIVE_PROFILES[moveId];if(!profile||profile.status?.startsWith('pending')||r[0x4e4+slot]<profile.minimumStamina)return null;
 const a={id:++s.serial,slot,moveId,...profile,teamId:identity.teamId,playerNumber:r[0x532+slot],sourceOwner:r[0x4d6],action:r[0x459+slot]&127,until:s.clock+profile.frames,phase:'ready',origin:{...threat.p},postContact:moveId==='triangle-jump'?locateTsubasaGoalpostContact(r,slot):null,impulseApplied:false};
 s.active.set(slot,a);s.cooldown.set(slot,s.clock+profile.frames+28);if(moveId!=='triangle-jump')emit(s,{type:'tsubasa-special-start',category:'defense',id:a.id,moveId,characterId:a.characterId,name:a.name,owner:slot,slot,pose:a.pose,position:{...threat.p},sourceOwner:a.sourceOwner});return a;
}
/** A real, bounded launch velocity adjustment after the native jump initializer.
 * No coordinates, action IDs, possession, stamina, or shot strength are forced. */
export function finishTsubasaDefensiveAction(r,slot,token){
 const s=sessions.get(r),a=s?.active.get(slot);if(!a||a!==token||a.moveId!=='triangle-jump'||a.impulseApplied||!activeValid(r,s,a))return;
 if(!a.postContact||position(r,slot).z<=a.origin.z){s.active.delete(slot);return;}
 a.impulseApplied=true;const vx=sgn(w(r,0x3e8+slot,0x3f6+slot)),vy=sgn(w(r,0x404+slot,0x412+slot)),vz=sgn(w(r,0x420+slot,0x42e+slot));
 a.velocityBefore={x:vx,y:vy,z:vz};
 // Rebound across the actual mouth from the contacted upper/lower post. The
 // original integrator moves the keeper on subsequent ticks; no teleport.
 put(r,0x404+slot,0x412+slot,a.postContact.away*Math.min(1024,Math.abs(a.postContact.approachVelocity.y)+128));
 put(r,0x3e8+slot,0x3f6+slot,((slot&1)?-1:1)*Math.min(1536,Math.max(64,Math.abs(vx))));
 put(r,0x420+slot,0x42e+slot,Math.max(-1536,Math.min(1536,vz+128)));a.phase='post-jump';
 a.velocityAfter={x:sgn(w(r,0x3e8+slot,0x3f6+slot)),y:sgn(w(r,0x404+slot,0x412+slot)),z:sgn(w(r,0x420+slot,0x42e+slot))};
 emit(s,{type:'tsubasa-special-start',category:'defense',id:a.id,moveId:a.moveId,characterId:a.characterId,name:a.name,owner:slot,slot,pose:a.pose,phase:'post-jump',position:position(r,slot),sourceOwner:a.sourceOwner});
}
function activeFor(r,slot){const s=sessions.get(r),a=s?.active.get(slot);return a&&activeValid(r,s,a)&&(a.moveId!=='triangle-jump'||a.impulseApplied)?a:null;}
/** No fabricated shape: a native missing/null contact window remains missing. */
export function adaptTsubasaDefensiveCollisionShape(r,slot,shape,kind='player',lane=0){
 if(!shape||kind!=='player')return shape;const a=activeFor(r,slot);if(!a||lane===1&&!['tackle','air-tackle'].includes(a.kind))return shape;
 return {...shape,extent:shape.extent.map((n,i)=>i===4?n:Math.min(i===3?96:63,n+a.reach[i]))};
}
export function getTsubasaDefensiveResistance(r,slot){return activeFor(r,slot)?.defenseBonus??0;}
/** Capture before native contact changes owner/action; never resolve it here. */
export function beginTsubasaDefensiveContact(r,slot){const a=activeFor(r,slot);return a?{id:a.id,slot,moveId:a.moveId,name:a.name,characterId:a.characterId,kind:a.kind,pose:a.pose,powerBefore:r[0x4f0],staminaBefore:r[0x4e4+slot],sourceOwner:r[0x4d6]}:null;}
export function finishTsubasaDefensiveContact(r,contact,events){
 if(!contact)return;const s=sessions.get(r);if(!s)return;
 const owner=r[0x4d6],action=r[0x465]&127,possessed=owner===contact.slot&&!!(r[0x492]&64),stopped=owner===contact.slot&&r[0x4f0]===0;
 const outcome=possessed?'caught':stopped?'blocked':owner===contact.slot&&[16,23].includes(action)?'parried':'failed';
 const event={type:'tsubasa-special-contact',category:'defense',...contact,owner:contact.slot,outcome,ballAction:action,powerAfter:r[0x4f0],staminaAfter:r[0x4e4+contact.slot],position:position(r,contact.slot),ballPosition:position(r,12)};
 emit(s,event);events?.push(event);const a=s.active.get(contact.slot);if(a?.id===contact.id){a.phase=outcome;a.contact=event;s.active.delete(contact.slot);}
}
/** Native player-contact observation only. The original collision routine
 * decides its target, damage, winner and recoil; this never awards possession. */
export function beginTsubasaDefensivePlayerContact(r,slot){
 const a=activeFor(r,slot);return a&&['tackle','air-tackle'].includes(a.kind)?{id:a.id,slot,moveId:a.moveId,name:a.name,characterId:a.characterId,kind:a.kind,pose:a.pose,sourceOwner:a.sourceOwner,action:r[0x459+slot]&127,staminaBefore:r[0x4e4+slot],targetStaminaBefore:r[0x4e4+a.sourceOwner]}:null;
}
export function finishTsubasaDefensivePlayerContact(r,contact,events){
 if(!contact||r[0x44]!==contact.sourceOwner||!events.some(e=>e.type==='sound'&&[0x36,0x37].includes(e.soundId)))return;
 const s=sessions.get(r);if(!s)return;
 const outcome=(r[0x459+contact.slot]&127)===contact.action?'tackled':'failed',event={type:'tsubasa-special-contact',category:'defense',...contact,owner:contact.slot,outcome,target:contact.sourceOwner,possessionAwarded:false,staminaAfter:r[0x4e4+contact.slot],targetStaminaAfter:r[0x4e4+contact.sourceOwner],position:position(r,contact.slot),targetPosition:position(r,contact.sourceOwner),contactPosition:position(r,contact.sourceOwner),contactAnchor:'target-feet',ballPosition:position(r,12)};
 emit(s,event);events.push(event);s.active.delete(contact.slot);
}
/** A frozen copy only. Paint cannot start moves, age windows or mutate RAM. */
export function getTsubasaDefensiveState(r){
 const s=sessions.get(r);if(!s||!playable(r))return freeze({clock:0,active:[],events:[]});
 const active=[...s.active.values()].filter(a=>activeValid(r,s,a)&&(a.moveId!=='triangle-jump'||a.impulseApplied)).map(a=>({id:a.id,slot:a.slot,owner:a.slot,moveId:a.moveId,name:a.name,characterId:a.characterId,kind:a.kind,phase:a.phase,pose:a.pose,remaining:a.until-s.clock,sourceOwner:a.sourceOwner,defenseBonus:a.defenseBonus,reach:[...a.reach],position:position(r,a.slot),origin:{...a.origin},postContact:a.postContact?{...a.postContact,approachVelocity:{...a.postContact.approachVelocity},collisionProbe:{...a.postContact.collisionProbe}}:null,velocityBefore:a.velocityBefore?{...a.velocityBefore}:null,velocityAfter:a.velocityAfter?{...a.velocityAfter}:null}));
 return freeze({clock:s.clock,active,events:s.events.map(e=>({...e,position:e.position?{...e.position}:null,ballPosition:e.ballPosition?{...e.ballPosition}:null,targetPosition:e.targetPosition?{...e.targetPosition}:null,contactPosition:e.contactPosition?{...e.contactPosition}:null,age:s.clock-e.clock,remaining:Math.max(0,24-(s.clock-e.clock))}))});
}
