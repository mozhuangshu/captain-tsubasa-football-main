/** Direct conversion of bounded original input-to-action decisions. No interpreter.
 * Player action $0479 is a request; movement $0459 is the accepted state.
 * This module does not invent ball physics, animations, or missing action bodies. */
import {ACTION_TABLES,ACTION_TABLE_ADDRESSES,DIRECTION_ANGLES,PLAYER_ACTION_RULES,BALL_ACTION_RULES,BALL_MOVEMENT_FLAGS} from './controls-actions-data.js';
export {ACTION_TABLES,ACTION_TABLE_ADDRESSES,DIRECTION_ANGLES,PLAYER_ACTION_RULES,BALL_ACTION_RULES,BALL_MOVEMENT_FLAGS};
function n(v,max,name){if(!Number.isInteger(v)||v<0||v>max)throw new RangeError(`${name}: expected 0..${max}`);return v;}
const byte=(v,name)=>n(v,255,name);
function validate(p,keys){for(const k of keys)byte(p[k],k);}
/** 04:B505..B576, using the actual flag fields rather than inferred distance.
 * p.index is object slot; world.carrierControl is $067C[ballOwner]. */
export function playerActionContext(p,w){
 n(p.index,11,'index');validate(p,['state0486','control067c']);validate(w,['script5c','ballOwner04d6','ballState0492','carrierControl067c','ballMovement0465']);
 if(!w.possession052a||w.possession052a.length!==2||!w.passDirection067a||w.passDirection067a.length!==2)throw new RangeError('two team bytes required');
 for(const a of [w.possession052a,w.passDirection067a])for(const v of a)byte(v,'team byte');
 const side=p.index&1;
 if(w.script5c&64)return 3;
 if(!(p.state0486&1)){
  if(p.index>=10){if(!(p.control067c&128))return p.state0486&64?4:5;}
  else{
   if(w.ballOwner04d6>=10&&(w.ballState0492&64)&&!(w.carrierControl067c&128))return 3;
   if((w.passDirection067a[side]&15)!==15)return 3;
  }
 }
 if(!((w.possession052a[0]|w.possession052a[1])&128))return 0;
 if(!(w.possession052a[side]&128))return 1;
 return p.state0486&64?2:3;
}
/** 04:B586..B5AE. 0=none of B0 flags;1=bit7;2=bit5;3=bit4. */
export function playerActionStateGroup(state){byte(state,'state');return !(state&0xb0)?0:state&128?1:state&32?2:3;}
/** 04:B5B0..B723. The data-dependent fallback byte is preserved: rejected
 * $FF candidates feed subsequent shifts in the original, not a fresh input read.
 * input.buffered0570 and doubleTap057c come from original FAEE input history. */
export function selectPlayerAction(p,w,input){
 validate(p,['state0486','movement0459','actionTimer04bd','action0479','newAngle04b0','positionControl0650','control067c']);
 validate(input,['held','pressed','buffered0570','doubleTap057c']);
 if(p.positionControl0650&128||!(p.action0479&128))return {changed:false,reason:'not-human-or-pending-action'};
 const context=playerActionContext(p,w),group=playerActionStateGroup(p.state0486),row=ACTION_TABLES[context][group];
 const info={context,group,tableAddress:ACTION_TABLE_ADDRESSES[context][group]};
 const choose=(action,entry,angle=false)=>{p.action0479=action;if(angle)p.newAngle04b0=DIRECTION_ANGLES[input.held&15];return {...info,changed:true,action,entry,angleWritten:angle};};
 let value;
 if(p.state0486&128){
  if(p.actionTimer04bd!==0&&(p.movement0459&127)!==0x58&&(input.pressed&0xc0))return choose(0x45,'B5CA');
  value=input.pressed>>>1;
 }else{
  value=input.buffered0570;
  if(value&128){
   if(input.held&12){value=row[1];if(value<128)return choose(value,1);}
   if(input.held&3){value=row[0];if(value<128)return choose(value,0);throw new RangeError('original B5EB self-loop: inconsistent action-table/input state');}
   if(p.state0486&8){value=row[2];if(value<128)return choose(value,2);}
   value=row[3];if(value<128)return choose(value,3);
  }
 }
 value=(value<<1)&255; // B614
 if(value&128){
  if((w.ballMovement0465&127)===10&&p.index===w.ballOwner04d6){value=row[4];if(value<128)return choose(value,4);}
  if(input.held&12){value=row[5];if(value<128)return choose(value,5);}
  value=row[6];if(value<128)return choose(value,6);
 }
 value=(value<<1)&255; // B647, including a rejected previous table candidate
 if(value&128){
  if((p.movement0459&127)===2){value=row[11];if(value<128)return choose(value,11);}
  if(!(input.held&15)){value=row[7];if(value<128)return choose(value,7);}
  if(input.held&12){value=row[8];if(value<128)return choose(value,8);}
  if(((p.index^input.held)&1)===0){value=row[9];if(value<128)return choose(value,9);}
  value=row[10];if(value<128)return choose(value,10);
 }
 // B696..B718: normal direction/double-tap requests only update the angle here.
 let action=null;
 if(!(p.state0486&128)){
  if((p.movement0459&127)===3&&(input.held&15))action=input.held&3?0x2a:0x27;
  else if(p.state0486&8){
   if((p.state0486&0x50)&&(input.doubleTap057c&12))action=p.state0486&16?0x25:0x24;
   else if(input.doubleTap057c&15)action=0x1d;
  }else action=input.doubleTap057c&15?0x21:input.held&15?0x20:1;
 }
 if(action!==null)return choose(action,'B70F',true);
 p.newAngle04b0=DIRECTION_ANGLES[input.held&15];return {...info,changed:false,angleWritten:true};
}
/** 06:AA19..AABC for player rules, AA14 for ball rules. All accept/reject
 * paths clear a processed request to $FF. Inactive movement keeps it pending. */
export function acceptActionRequest(p,environment,kind='player'){
 validate(p,['action0479','movement0459','state0486','skill04f1','surface0130']);byte(environment.weather0466,'weather0466');
 const rules=kind==='player'?PLAYER_ACTION_RULES:kind==='ball'?BALL_ACTION_RULES:null;
 if(!rules)throw new RangeError('kind must be player or ball');
 if((environment.weather0466&127)===1&&!(p.state0486&128)&&!(p.skill04f1&1)&&p.surface0130>0&&p.surface0130<3)p.action0479=6;
 if(p.action0479&128)return {accepted:false,pending:false,reason:'no-request'};
 if(!(p.movement0459&128))return {accepted:false,pending:true,reason:'movement-not-ready'};
 const request=p.action0479,current=p.movement0459&127;
 n(request,rules.length-1,'requested action');n(current,rules.length-1,'current movement');
 const [flags,priority]=rules[request],currentPriority=rules[current][1];
 let reason=null;
 if(!(p.state0486&64)&&(flags&64))reason='requires-state40';
 else if((p.state0486&32)&&!(flags&32))reason='blocked-state20';
 else if((p.state0486&128)&&!(flags&128))reason='blocked-air-state80';
 else if(currentPriority!==0&&priority<=currentPriority)reason='priority';
 else if(current===request)reason='same-movement';
 if(reason===null)p.movement0459=request;
 p.action0479=255;
 return {accepted:reason===null,pending:false,request,reason,flags,priority,currentPriority};
}

import {updateInputHistory} from './input-history.js';
function memory(r){if(!r||r.length<0x800)throw new RangeError('Original game state requires 0x800 bytes');}
/** 04:B4C9 full one-controller boundary. Does not update history for an
 * unmapped, CPU-controlled, or already-requesting player, matching B4CB..B4D9. */
export function updateHumanController(r,controller){
 memory(r);n(controller,3,'controller');const index=r[0x568+controller];
 if(index&128)return {changed:false,reason:'unmapped-controller'};
 n(index,11,'controlled player');
 if((r[0x650+index]&128)||!(r[0x479+index]&128))return {changed:false,reason:'not-human-or-pending-action'};
 updateInputHistory(r,controller);
 const p={index,state0486:r[0x486+index],movement0459:r[0x459+index],action0479:r[0x479+index],newAngle04b0:r[0x4b0+index],actionTimer04bd:r[0x4bd+index],positionControl0650:r[0x650+index],control067c:r[0x67c+index]};
 const w={script5c:r[0x5c],ballOwner04d6:r[0x4d6],ballMovement0465:r[0x465],ballState0492:r[0x492],carrierControl067c:r[0x67c+r[0x4d6]],possession052a:[r[0x52a],r[0x52b]],passDirection067a:[r[0x67a],r[0x67b]]};
 const out=selectPlayerAction(p,w,{held:r[4+controller],pressed:r[8+controller],buffered0570:r[0x570+controller],doubleTap057c:r[0x57c+controller]});
 r[0x479+index]=p.action0479;r[0x4b0+index]=p.newAngle04b0;
 return {...out,controller,index};
}
/** Ordinary match route 04:B4B2; PK bit0 routes to B850, intentionally explicit. */
export function updateOrdinaryHumanControls(r){
 memory(r);if(r[0x5c]&1)throw new Error('MissingTranslation: 04:B850 penalty control route');
 return Array.from({length:4},(_,i)=>updateHumanController(r,i));
}
/** Original state bridge for 06:AA19 player admission, separately schedulable
 * after human/AI request producers, not automatically inside input handling. */
export function acceptPlayerActionFromState(r,index){
 memory(r);n(index,11,'index');
 const p={action0479:r[0x479+index],movement0459:r[0x459+index],state0486:r[0x486+index],skill04f1:r[0x4f1+index],surface0130:r[0x130+index]};
 const out=acceptActionRequest(p,{weather0466:r[0x466]});r[0x479+index]=p.action0479;r[0x459+index]=p.movement0459;return out;
}

/** 06:AAC8..AB0A. Recompute one actor's state from accepted movement flags.
 * Preserve bit08 only when rules bit04 does not request clearing it. */
export function updatePlayerActionFlags(r,index,kind='player'){
 memory(r);n(index,18,'index');const rules=kind==='player'?PLAYER_ACTION_RULES:kind==='ball'?BALL_ACTION_RULES:null;
 if(!rules)throw new RangeError('kind');const action=r[0x459+index]&127;n(action,rules.length-1,'movement');
 const flags=rules[action][0],old08=r[0x486+index]&8;
 const below=(r[0x399+index]&128)&&r[0x386+index]<248?32:0;
 r[0x486+index]=(flags&0x89)|below|((flags&4)?0:old08);
 return r[0x486+index];
}
/** 06:AB0B..AB51, including complete 9856 electric/weather reset helper.
 * Original X is ball slot12 for this path. */
export function acceptBallMovementRequest(r){
 memory(r);const x=12;
 if((r[0x466]&127)===1){
  r[0x4f0]=0;r[0x4c9]=0;r[0x510]=0;r[0x50f]=128;
  if(!(r[0x492]&128)&&r[0x130+x]>0&&r[0x130+x]<3)r[0x525]=255;
 }
 const request=r[0x485];if(request&128)return {accepted:false,pending:false};
 n(request,BALL_MOVEMENT_FLAGS.length-1,'ball request');
 const accepted=(r[0x492]&15)<=(BALL_MOVEMENT_FLAGS[request]&15);
 if(accepted)r[0x465]=request;r[0x485]=255;return {accepted,request,pending:false};
}
/** 06:AB52..ABB2. Clear team possession bit7 then derive from ball state.
 * It intentionally does not clear player bits40/10; AAC8 does that in the
 * earlier actor pass before this function ORs current ball attachment flags. */
export function updateBallPossessionFlags(r){
 memory(r);const action=r[0x465]&127;n(action,BALL_MOVEMENT_FLAGS.length-1,'ball movement');
 for(let side=0;side<2;side++)r[0x52a+side]&=127;
 r[0x492]=BALL_MOVEMENT_FLAGS[action]|((r[0x3a5]&128)?32:0);
 if(r[0x492]&0x50){const owner=r[0x4d6];n(owner,11,'ball owner');
  if(r[0x492]&64){r[0x486+owner]|=64;r[0x492]|=r[0x486+owner]&128;r[0x52a+(owner&1)]|=128;}
  if(r[0x492]&16)r[0x486+owner]|=16;
 }
 return r[0x492];
}
