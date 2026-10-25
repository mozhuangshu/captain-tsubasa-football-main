/** Diaz's bounded native backflip-shot adaptation.
 * Episode 14 describes cartwheel -> back handspring -> backward somersault.
 * The recovered artwork only establishes the final backward-somersault kick.
 * Consequently this module NEVER awards the complete `acrobat-shot` move.
 * It observes native actions 32/46, their actual pose order and actual contact;
 * it does not write RAM, grant possession, insert actions or move any object.
 */
import {isTsubasaSpecialMovesEnabled,getTsubasaActorIdentity} from './tsubasa-gameplay-context.js';

const sessions=new WeakMap();
const ACTIONS=new Set([0x32,0x46]);
const PREFIX=Object.freeze([2,3,4,26]);
const word=(r,l,h)=>r[l]|r[h]<<8;
const signed=n=>n&32768?n-65536:n;
const position=(r,s)=>({x:signed(word(r,0x314+s,0x327+s))+r[0x301+s]/256,y:signed(word(r,0x34d+s,0x360+s))+r[0x33a+s]/256,z:signed(word(r,0x386+s,0x399+s))+r[0x373+s]/256});
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const playable=r=>isTsubasaSpecialMovesEnabled(r)&&r[0x58]===0&&(r[0x59]&127)===2&&r[0x5c]===0;
const elapsed=(r,a)=>(r[0x300]-a.startFrame)&255;

export const TSUBASA_ACROBAT_ADAPTATION=freeze({
 moveId:'diaz-backflip-shot',name:'后空翻射门（动作简化）',characterId:'diaz',
 sourceUrl:'https://ball-ha-tomodachi.com/jryouth/story/14.html',
 evidence:'A1 episode synopsis; native final backflip segment only; not frame-exact',
 fullMoveId:'acrobat-shot',fullSequenceImplemented:false,
 missingStages:['cartwheel-hand-support','back-handspring-hand-support'],
 nativeActions:[0x32,0x46],requiredPosePrefix:[...PREFIX],minimumStamina:1,
});

function sameActor(r,a){const id=getTsubasaActorIdentity(r,a.slot);return id?.characterId==='diaz'&&id.role==='field'&&id.teamId===a.teamId&&r[0x532+a.slot]===a.playerNumber;}
function valid(r,a){return playable(r)&&sameActor(r,a)&&r[0x4e4+a.slot]>0&&ACTIONS.has(r[0x459+a.slot]&127)&&(r[0x459+a.slot]&127)===a.action&&elapsed(r,a)<=32;}
function registry(r){let s=sessions.get(r);if(!s){s=new Map();sessions.set(r,s);}return s;}
export function resetTsubasaAcrobatState(r){sessions.delete(r);}
export function syncTsubasaAcrobatState(r){const s=sessions.get(r);if(!s)return;if(!playable(r)){sessions.delete(r);return;}for(const [slot,a]of s)if(!valid(r,a))s.delete(slot);}

/** Hook immediately before the real native player update. Only a fresh,
 * accepted native backflip action can open an observation window. */
export function beforeTsubasaAcrobatAction(r,slot){
 const existing=sessions.get(r)?.get(slot);if(existing&&!valid(r,existing))sessions.get(r).delete(slot);
 // D9 is renderer visibility, not player activity. A camera pan must not
 // erase an already accepted native action; actual native contacts still gate.
 if(!playable(r)||slot<0||slot>=12||r[0x4e4+slot]===0)return;
 const action=r[0x459+slot]&127;if(!ACTIONS.has(action)||r[0x459+slot]&128)return;
 const id=getTsubasaActorIdentity(r,slot);if(id?.characterId!=='diaz'||id.role!=='field')return;
 registry(r).set(slot,{slot,teamId:id.teamId,playerNumber:r[0x532+slot],action,startFrame:r[0x300],lastFrame:null,lastPose:null,progress:0,poses:[],contact:null,consumed:false});
}

/** Observe, never replace, the sprite selected by the native animation. */
export function afterTsubasaAcrobatAction(r,slot){
 const a=sessions.get(r)?.get(slot);if(!a)return;if(!valid(r,a)){sessions.get(r).delete(slot);return;}
 if(a.lastFrame===r[0x300])return;a.lastFrame=r[0x300];
 if(position(r,slot).z<=0){sessions.get(r).delete(slot);return;}
 const pose=r[0x74+slot]&127;if(pose!==a.lastPose){
  a.poses.push({pose,frame:r[0x300],position:position(r,slot)});a.lastPose=pose;
  if(a.progress<PREFIX.length){if(pose===PREFIX[a.progress])a.progress++;else sessions.get(r).delete(slot);}
 }
}

function ready(r,slot){const a=sessions.get(r)?.get(slot);return a&&!a.consumed&&valid(r,a)&&a.progress===PREFIX.length&&position(r,slot).z>0?a:null;}
function inEnvelope(r,slot,b=position(r,12)){const p=position(r,slot);return b.z>0&&Math.abs(p.x-b.x)<=24&&Math.abs(p.y-b.y)<=12&&b.z-p.z>=-12&&b.z-p.z<=36;}

/** Hook on the original F0/05 command, before it queues the ball request.
 * Action 46 has its own native controlled-ball toss and kick command. Both
 * native ownership bits and the real ball's local envelope must still agree. */
export function noteTsubasaAcrobatStrike(r,slot){
 const a=ready(r,slot);if(!a||a.action!==0x46||a.lastPose!==26||r[0x4d6]!==slot||!(r[0x486+slot]&64)||!(r[0x492]&64)||!inEnvelope(r,slot))return;
 a.contact={kind:'native-owned-ball-strike',frame:r[0x300],position:position(r,12)};
}

/** Hook only after the native resolved ball-player contact. Action 32 has
 * no F0 kick command: its native active foot hitbox is authoritative instead.
 * `before` is the existing native contact ledger, captured before resolution. */
export function noteTsubasaAcrobatContact(r,slot,before){
 // Native action 32 opens its overhead foot hitbox in inverted pose 26,
 // before pose 27 fully extends the leg. Trust that resolved contact window;
 // requiring only 27 incorrectly rejects reachable, correctly timed volleys.
 const a=ready(r,slot);if(!a||a.action!==0x32||!before||before.held||![26,27].includes(r[0x74+slot]&127)||r[0x4d6]!==slot||(r[0x465]&127)!==5||!inEnvelope(r,slot,before.position))return;
 a.contact={kind:'native-foot-collision',frame:r[0x300],position:{...before.position}};
}

/** Called by the existing shot selector after its native eligibility result.
 * One native strike can label only one launch. Invalid / interrupted actions
 * cannot revive, including after pause, reset, fatigue or roster changes. */
export function consumeTsubasaAcrobatShot(r,slot){
 const a=ready(r,slot);if(!a?.contact||((r[0x300]-a.contact.frame)&255)>1||r[0x4d6]!==slot||(r[0x465]&127)!==5)return false;
 a.consumed=true;return true;
}

/** Read-only renderer/debug snapshot. No future pose or fictitious stage. */
export function getTsubasaAcrobatState(r){
 const s=sessions.get(r);if(!s||!playable(r))return freeze({active:[]});
 return freeze({active:[...s.values()].filter(a=>valid(r,a)).map(a=>({slot:a.slot,characterId:'diaz',moveId:TSUBASA_ACROBAT_ADAPTATION.moveId,name:TSUBASA_ACROBAT_ADAPTATION.name,fullSequenceImplemented:false,action:a.action,phase:a.contact?'strike':a.progress>=4?'inverted':a.progress>=3?'backward-rotation':'takeoff',age:elapsed(r,a),pose:a.lastPose,position:position(r,a.slot),poses:a.poses.map(p=>({...p,position:{...p.position}})),contact:a.contact?{...a.contact,position:{...a.contact.position}}:null,consumed:a.consumed}))});
}
