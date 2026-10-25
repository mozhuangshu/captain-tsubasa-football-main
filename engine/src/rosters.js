/** Original roster/attribute/menu semantics, not a CPU interpreter.
 * Addresses use source's 16 KiB bank numbering. See docs/DEVELOPMENT.md */
import {applyAttributeBoosts} from './mood-league.js';
import {TEAM_ATTRIBUTE_POINTERS,ATTRIBUTE_ROWS,FORMATION_ROLES,CPU_TEAM_DEFAULTS,TACTIC_MENU_PAIRS,ROSTER_MENU_ORDER,FORMATION_MENU_POINTS,FORMATION_MENU_POINT_IDS,FORMATION_MENU_ANIMATIONS} from './roster-data.js';
export {FORMATION_ROLES,CPU_TEAM_DEFAULTS,ROSTER_MENU_ORDER};
function number(v,max,name){if(!Number.isInteger(v)||v<0||v>max)throw new RangeError(`${name}: expected 0..${max}`);return v;}
const byte=(v,n)=>number(v,255,n);
function bytes(a,n,name){if(!a||a.length!==n)throw new RangeError(`${name}: expected ${n} bytes`);for(const v of a)byte(v,name);return a;}
function formation(v){const f=byte(v,'formation')&3;if(f===3)throw new RangeError('formation 3 has no original table');return f;}
export const TEAMS = Object.freeze(TEAM_ATTRIBUTE_POINTERS.map((pointer,id)=>Object.freeze({
 id,canonicalAttributeTeam:id%4===0?0:id,attributePointer:pointer,playerCount:id%4===0?12:6,
 defaultTactics:CPU_TEAM_DEFAULTS[id][0],defaultFormation:CPU_TEAM_DEFAULTS[id][1],
 // Aliases are preserved, not asserted to be separate selectable teams.
 name:null,source:{bank:1,address:pointer,fileOffset:pointer-0x4000+16}
})));
export function playerAttributes(teamByte,playerNumber){
 const team=TEAMS[byte(teamByte,'team')&15];number(playerNumber,team.playerCount-1,'playerNumber');
 const row=(team.attributePointer-0xbd38)/4+playerNumber;
 const [hp04e4,speed04d7,defense04fd,skill04f1]=ATTRIBUTE_ROWS[row];
 return {id:`team-${team.canonicalAttributeTeam.toString(16)}-player-${playerNumber}`,teamId:team.id,playerNumber,hp04e4,speed04d7,defense04fd,skill04f1,
  source:{bank:1,address:team.attributePointer+playerNumber*4,fileOffset:team.source.fileOffset+playerNumber*4}};
}
export const PLAYERS=Object.freeze(TEAMS.filter(t=>t.id===t.canonicalAttributeTeam).flatMap(t=>Array.from({length:t.playerCount},(_,i)=>Object.freeze(playerAttributes(t.id,i)))));
/** 05:86B3..86F4. Only the roster/reset slice; does not pretend to execute
 * password decode B913 or scene routing 86F5..8711. */
export function initializeRosterState(s){
 byte(s.mode57,'mode57');
 s.playerNumbers=Array.from({length:12},(_,i)=>i>>>1);
 if(s.mode57&128){s.playerNumbers[8]=3;s.playerNumbers[6]=4;}
 s.possessionFlags=[0,0];s.value054a=255;
 s.moods=Array(12).fill(8);s.positionControl=Array(12).fill(8);s.tactics=[85,85];
 return s;
}
/** 05:BC1D..BC98: controller ownership and CPU team defaults.
 * Does NOT initialize player numbers, overwrite existing human tactics, or
 * initialize weather/time (those are neighboring, separate setup routines). */
export function configureRosterControls(s){
 byte(s.mode57,'mode57');byte(s.playersAmount,'playersAmount');
 if((s.mode57&240)!==0){number(s.playersAmount,4,'playersAmount');if(s.playersAmount<1)throw new RangeError('playersAmount must be positive in active modes');}
 bytes(s.teams,2,'teams');bytes(s.positionControl,12,'positionControl');bytes(s.tactics,2,'tactics');bytes(s.formations,2,'formations');
 const mode=s.mode57&240;
 // $20 high-nibble mode sets zero; all others OR in $80.
 const mask=mode!==0&&(mode&0xd0)===0?0:128;
 const controlSlots=mode&128?[0,10]:[0,1,10,11];
 if(mode&128&&s.playersAmount>2)throw new RangeError('league controller table contains only two slots');
 s.value06fc=mask?255:0;
 for(let i=11;i>=0;i--)s.positionControl[i]|=mask;
 if(mode!==0)for(let i=0;i<s.playersAmount;i++)s.positionControl[controlSlots[i]]&=127;
 s.goalkeeperControl=[s.positionControl[10]&128,s.positionControl[11]&128];
 for(let side=1;side>=0;side--)if(s.teams[side]&128){const pair=CPU_TEAM_DEFAULTS[s.teams[side]&15];s.tactics[side]=pair[0];s.formations[side]=pair[1];}
 return s;
}
/** 01:BC91..BCB9; identical data/operation at 03:B12D..B15C. */
export function applyFormationRoles(positionControl,side,formationByte){
 bytes(positionControl,12,'positionControl');number(side,1,'side');const roles=FORMATION_ROLES[formation(formationByte)];
 for(let slot=0;slot<6;slot++){const i=slot*2+side;positionControl[i]=(positionControl[i]&207)|roles[slot];}
 return positionControl;
}
/** 01:BC12..BCB9 plus separately converted BCBA helper.
 * Interleaved object indices are preserved: 0,2,..10 home / 1,3,..11 away.
 * fields are bytes at original RAM, not invented ratings or multipliers. */
export function loadMatchAttributes(s){
 bytes(s.teams,2,'teams');bytes(s.playerNumbers,12,'playerNumbers');bytes(s.positionControl,12,'positionControl');bytes(s.formations,2,'formations');byte(s.mode57,'mode57');byte(s.value054a,'value054a');bytes(s.moods,12,'moods');
 for(let side=0;side<2;side++)formation(s.formations[side]);
 const result=s.playerNumbers.map((n,i)=>playerAttributes(s.teams[i&1],n));
 for(let side=0;side<2;side++){
  for(let i=side;i<12;i+=2){
   let low=8,flags=0;
   if((s.mode57&128)&&side===0&&(s.teams[0]&15)===0){const packed=s.moods[s.playerNumbers[i]];low=packed&15;flags=packed&240;}
   s.positionControl[i]=(s.positionControl[i]&240)|low;
   applyAttributeBoosts(result[i],i,flags,s.value054a);
  }
  applyFormationRoles(s.positionControl,side,s.formations[side]);
 }
 s.attributes=result;return result;
}
/** 05:9CEA..9D06: the four original two-bit menu fields each have 3 values.
 * Labels are intentionally unresolved; downstream AI consumers need separate translation. */
export function setTacticMenuOption(packed,option){byte(packed,'packed');number(option,11,'option');const [mask,value]=TACTIC_MENU_PAIRS[option];return (packed&mask)|value;}
/** 05:9CB3..9CDD, valid menu group bases 0,3,6,9. */
export function selectedTacticMenuOption(packed,group){byte(packed,'packed');number(group,3,'group');const value=(packed>>>(group*2))&3;return group*3+(value===3?0:value);}
/** 05:9D43..9D58 roster selection write. Duplicate check is deliberately
 * separate: the original writes, then checks earlier slots at 9D73. */
export function setRosterMenuPlayer(s,side,slot,option){number(side,1,'side');number(slot,5,'slot');number(option,11,'option');bytes(s.playerNumbers,12,'playerNumbers');s.playerNumbers[slot*2+side]=ROSTER_MENU_ORDER[option];return s.playerNumbers[slot*2+side];}
/** 05:9D73..9D8F carry result; only previous same-side slots are checked. */
export function rosterChoiceIsUnique(playerNumbers,side,slot){bytes(playerNumbers,12,'playerNumbers');number(side,1,'side');number(slot,5,'slot');const i=slot*2+side;for(let j=i-2;j>=0;j-=2)if(playerNumbers[j]===playerNumbers[i])return false;return true;}
/** 05:9DC2..9DE5 diagram coordinates, NOT gameplay field coordinates. */
export function formationMenuLayout(id){const f=formation(id);return FORMATION_MENU_POINT_IDS[f].map((point,i)=>({x:FORMATION_MENU_POINTS[point][0],y:FORMATION_MENU_POINTS[point][1],roleAnimation:FORMATION_MENU_ANIMATIONS[f][i]}));}
