/** Shared opt-in and identity lookup; no gameplay mutation and no adapter cycles. */
import {getPlayerIdentity} from './tsubasa-teams.js';
const enabledRams=new WeakSet();
export function configureTsubasaGameplayContext(r,{enabled=true}={}){if(enabled)enabledRams.add(r);else enabledRams.delete(r);}
export const isTsubasaSpecialMovesEnabled=r=>enabledRams.has(r);
export function getTsubasaActorIdentity(r,slot){if(!Number.isInteger(slot)||slot<0||slot>=12)return null;try{return getPlayerIdentity(r[0x52c+(slot&1)]&15,r[0x532+slot],slot>=10&&!(r[0x67c+slot]&128)?'keeper':'field');}catch{return null;}}
