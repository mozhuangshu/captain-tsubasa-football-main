/** Original menu07 visual operations, 05:9D9B..A0DF.
 * All table reads are named game data. No instruction decoding or ROM access.
 * Ordinary calls only populate the original RAM queues. The seven original
 * C07B calls in initialization are the only explicit queue/frame boundaries.
 */
import {ROSTER_MENU_GRAPHICS_DATA as D} from './roster-menu-graphics-data.js';
import {ROSTER_MENU_DATA as M} from './roster-menus-data.js';
import {restoreRosterTacticChoice} from './roster-menus.js';

const requireService=(s,name,...args)=>{
  if(typeof s?.[name]!=='function')throw new Error(`MissingTranslation: roster graphics ${name}`);
  return s[name](...args);
};
function tableValue(table,index,name){
  if(!Number.isInteger(index)||index<0||index>=table.length)throw new RangeError(`Original roster ${name} index ${index}`);
  return table[index];
}
const formationOf=r=>r[0x530+r[0x5cc]];

/** 9D9B / 9DA0: formation/lineup prompt at visual tile address 2144. */
export function queueRosterPrompt(r,formation=true){
  const i=formation?0:2;
  r[0x6ba]=D.promptTiles[i+1];r[0x6b9]=D.promptTiles[i];
  r[0x6b8]=2;r[0x6b7]=0x44;r[0x6b6]=0x21;
}

/** 9DC2: each player uses an even role marker plus an odd portrait object. */
export function updateRosterPlayerGraphic(r,slot){
  const player=slot>>>1,index=formationOf(r)*6+player;
  r[0x1c]=index;
  const position=tableValue(D.formationPositions,index,'formation position')*2;
  r[0x314+slot]=D.playerPositions[position];r[0x34d+slot]=D.playerPositions[position+1];
  const role=tableValue(D.formationAnimations,index,'formation animation');
  if(!(slot&1)){
    let animation=role;
    if(animation===0x88&&r[0x5c9]<3)animation=0x7f;
    if(r[0x5c9]===4&&player===r[0x5cb]&&(r[0x300]&3)===0)animation=0x7f;
    r[0x74+slot]=animation;
    return;
  }
  r[0x1d]=0;
  if(r[0x57]&0x80){
    const hintIndex=r[0x55c+slot]*2;
    if(!(tableValue(D.playerRoleHints,hintIndex,'player role hint')&0x80)){
      r[0x1d]++;
      if(D.playerRoleHints[hintIndex+1]!==role)r[0x1d]++;
    }
  }
  r[0x74+slot]=D.headAnimations[r[0x1d]];
  if(r[0x5c9]===4&&player>r[0x5cb])r[0x74+slot]=0x7f;
}

/** 82F4: selected table coordinate to original queue address, including scratch. */
function rosterSelectionAddress(r,slot=12){
  const positions=tableValue(M.positions7,r[0x5c9],'phase');
  const i=(r[0x5ca+(slot&1)]<<1)&255;
  const tx=tableValue(positions,i,'selection X'),ty=tableValue(positions,i+1,'selection Y');
  r[0x1d]=tx&31;
  const address=0x2000+(((ty&31)|(tx&32)|((ty&32)<<1))<<5)+(tx&31);
  r[0x30]=address&255;r[0x31]=address>>>8;
  return address;
}
function finishRosterNameLabel(r){
  r[0x6b9]=2;r[0x6b8]=3;r[0x6b7]=r[0x30];r[0x6b6]=r[0x31];
}
/** 9E60: confirmed player name receives this formation's position label. */
export function queueRosterConfirmedLabel(r){
  rosterSelectionAddress(r);
  const formation=formationOf(r),pointer=formation*2;
  r[0x32]=tableValue(D.formationLabelPointers,pointer,'formation label pointer');
  r[0x33]=D.formationLabelPointers[pointer+1];
  const label=formation*12+r[0x5cb]*2;
  r[0x6bb]=tableValue(D.formationLabels,label,'confirmed label');
  r[0x6ba]=D.formationLabels[label+1];
  finishRosterNameLabel(r);
}
/** 9E9C: restore the original unselected name prefix after moving backward. */
export function queueRosterUnconfirmedLabel(r){
  rosterSelectionAddress(r);r[0x6bb]=2;
  const foreign=(r[0x52c+r[0x5cc]]&15)!==0;
  let index=r[0x5ca];
  if(foreign){const shifted=(index+12)&255;if(shifted!==0)index=shifted;}
  r[0x6ba]=tableValue(D.unselectedNameTiles,index,'unconfirmed label');
  finishRosterNameLabel(r);
}
/** 9F64: seven original attribute bytes highlight a tactic's three choices. */
export function queueRosterTacticHighlight(r){
  const i=(r[0x5ca]<<3)&255;
  r[0x694]=tableValue(D.tacticAttributeRows,i,'tactic row');r[0x695]=7;
  for(let j=0;j<7;j++)r[0x696+j]=D.tacticAttributeRows[i+j+1];
  r[0x693]=0x2b;
}
/** A054: selected side's controller label alongside a formation. */
export function queueRosterFormationMarker(r){
  const i=(r[0x5ca]&15)*2;
  r[0x6b9]=0x1b+r[0x5cc];r[0x6ba]=0x1f;r[0x6b8]=2;
  r[0x6b7]=tableValue(D.formationMarkerAddresses,i,'formation marker');
  r[0x6b6]=D.formationMarkerAddresses[i+1];
}
/** A07B: erase previous formation marker using the other queue. */
export function queueRosterFormationMarkerClear(r){
  const i=(r[0x5ca]&15)*2;
  r[0x696]=r[0x697]=r[0x695]=2;
  r[0x694]=tableValue(D.formationMarkerAddresses,i,'formation marker clear');
  r[0x693]=D.formationMarkerAddresses[i+1];
}
/** A0A0: optional extra participant label. Queue 6D9 is a general tile queue
 * here, not a palette: the original address is 2124 and the count is two. */
export function queueRosterParticipantLabel(r){
  if(r[0x5d]<2)return;
  r[0x1c]=r[0x5d]-2;
  let i=r[0x1c]*3;
  if(!(r[0x57]&128)){i++;if(r[0x5cc]!==0)i++;}
  const tile=tableValue(D.participantLabelTiles,i,'participant label');
  if(tile&128)return;
  r[0x6dc]=tile;r[0x6dd]=0x1f;r[0x6db]=2;r[0x6da]=0x24;r[0x6d9]=0x21;
}

/** C07B -> EFAD/EFE5: consume nametable queues in original priority order.
 * This helper does not wait. The caller selects the original frame boundary.
 * Palette queues belong to the host's palette operation, never a tile patch.
 */
export function flushRosterMenuGraphicsQueue(r,s){
  const patches=[],queues=[];
  for(const [base,increment] of [[0x693,0x690],[0x6b6,0x691],[0x6d9,0x692]]){
    const hi=r[base];if(hi&128)continue;
    const count=r[base+2],address=(hi<<8)|r[base+1];
    if(count<1||count>32)throw new RangeError('Original roster queue count');
    if(address<0x2000||address>=0x3f00)throw new RangeError('Roster tile boundary encountered a non-nametable queue');
    patches.push({address,bytes:Array.from(r.slice(base+3,base+3+count)),stride:r[increment]&4?32:1});
    queues.push([base,increment]);
  }
  if(patches.length)requireService(s,'applyTilePatches',patches);
  for(const [base,increment]of queues){r[0x4c]=(r[0x4c]&251)|r[increment];r[increment]=0;r[base]=255;}
  return patches;
}

/** 9B1D/8205: preserve original table-pointer RAM writes without executing it. */
function prepareRosterPhasePointers(r){
  const i=r[0x5c9]*4;
  for(let j=0;j<4;j++)r[0x2c+j]=tableValue(D.phasePointerPairs,i+j,'phase pointer');
  r[0x30]=0x20;r[0x31]=0x9b;
}
function queueInitialRosterSelection(r){
  r[0x1c]=0xdc;rosterSelectionAddress(r,0);
  r[0x696]=r[0x1c];r[0x695]=1;r[0x694]=r[0x30];r[0x693]=r[0x31];
}
async function flushAndWait(r,s){flushRosterMenuGraphicsQueue(r,s);await requireService(s,'nextFrame');}
/** 9FEB..A04F: original three menu marks and four tactic rows, seven flushes. */
export async function initializeRosterMenuGraphics(r,s){
  const savedPhase=r[0x5c9];
  r[0x4c]&=127;r[0x4d]&=0xe7;requireService(s,'setRenderMask',r[0x4d]);
  queueRosterParticipantLabel(r);r[0x5c9]=3;
  do{
    prepareRosterPhasePointers(r);r[0x5ca]=1;
    if(r[0x5c9]===2){r[0x5ca]=formationOf(r)&3;queueRosterFormationMarker(r);}
    queueInitialRosterSelection(r);await flushAndWait(r,s);r[0x5c9]--;
  }while(r[0x5c9]!==0);
  r[0x5c9]=0;
  do{
    r[0x5ca]=D.tacticGroupStarts[r[0x5c9]];
    restoreRosterTacticChoice(r);queueRosterTacticHighlight(r);
    await flushAndWait(r,s);r[0x5c9]++;
  }while(r[0x5c9]<4);
  r[0x4d]|=0x18;requireService(s,'setRenderMask',r[0x4d]);r[0x4c]|=128;r[0x5c9]=savedPhase;
}

/** Fixed semantic entry selection, not address execution. 9EEC is data. */
export function rosterMenuGraphics(r,entry,x=0,s){
  switch(entry){
    case '9D9B':return queueRosterPrompt(r,true);
    case '9DA0':return queueRosterPrompt(r,false);
    case '9DC2':return updateRosterPlayerGraphic(r,x);
    case '9E60':return queueRosterConfirmedLabel(r);
    case '9E9C':return queueRosterUnconfirmedLabel(r);
    case '9F64':return queueRosterTacticHighlight(r);
    case '9FEB':return initializeRosterMenuGraphics(r,s);
    case 'A054':return queueRosterFormationMarker(r);
    case 'A07B':return queueRosterFormationMarkerClear(r);
    case 'A0A0':return queueRosterParticipantLabel(r);
    default:throw new RangeError(`Unrecovered roster graphic entry ${entry}`);
  }
}
