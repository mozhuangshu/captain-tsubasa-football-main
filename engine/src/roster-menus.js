import {ROSTER_MENU_DATA as D} from './roster-menus-data.js';
import {initializeMenuScreen,advancePaletteFade,beginPaletteFade,waitForPaletteFade,readMenuCommand,navigateMenuOption,setMenuCursorPosition,setMenuCursorBlink,queueMenuSelectionTile} from './state-dispatch.js';
import {teamAppearance} from './sprite-appearance.js';
const need=(s,n,...a)=>{if(typeof s[n]!=='function')throw new Error(`MissingTranslation: roster menu ${n}`);return s[n](...a);};
function appearance(r,{heads=true,palette=true}={}){const a=teamAppearance(r[0x52c],r[0x52d],Array.from(r.slice(0x532,0x53e)));if(heads){r.set(a.heads,0x55c);r.set(a.chrPages,0x5b8);r[0x1c]=(r[0x52d]&3)===0?1:0;r[0x1d]=r[0x1c]^1;}if(palette)r.set(a.paletteIds,0x5ae);}
export function commitTeamSelection(r){for(let side=0;side<2;side++){const i=r[0x5ca+side]&127;if(i>=D.teams5.length)throw new RangeError('8CFE original team selection index');r[0x52c+side]=D.teams5[i];}if((r[0x57]&32)&&r[0x5d]===1)r[0x52d]|=128;}
export function initializeTeamSelectionObjects(r){
 r[0x5ca]=0;r[0x80]=0;r[0x5cb]=13;r[0x63]=r[0x64]=5;r[0x6d]=r[0x5ae]=1;r[0x5b8]=8;r[0x5bb]=9;appearance(r);
 for(let x=0;x<2;x++){for(const a of [0x61,0x327,0x360,0x386,0x399,0x3e8,0x3f6,0x404,0x412,0x420,0x42e])r[a+x]=0;r[0x479+x]=255;r[0x459+x]=1;r[0x314+x]=D.objects5[x*2];r[0x34d+x]=D.objects5[x*2+1];}
 r[0x4d6]=r[0x4a3]=0;r[0x4a4]=r[0x320]=128;r[0x359]=208;for(const a of [0x333,0x36c,0x392,0x3a5])r[a]=0;
}
export function teamSelectionPatches(r){const p=[];if(!(r[0x57]&64))p.push({address:D.header5[0]*256+D.header5[1],bytes:D.header5.slice(3)});p.push({address:0x2074,bytes:[r[0x5d]|128]});const row=D.participants5[r[0x5d]];if(!row)throw new RangeError('8D69 participant amount');p.push({address:row[0]*256+row[1],bytes:row.slice(3,3+row[2])});return p;}
async function leaveTeamSelection(r,s){commitTeamSelection(r);beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);r[0x5cc]=0;r[0x59]=6;}
function finishTeamSelectionFrame(r,s){
 need(s,'updateMenuActors',r);need(s,'updateSpriteVisibility',r);need(s,'configureChrBanks',r);
 r[0x5b9]=r[0x66];r[0x5ba]=r[0x67];appearance(r,{palette:false});const old=[r[0x66],r[0x67]];r[0x66]=r[0x5b9];r[0x67]=r[0x5ba];r[0x5b9]=old[0];r[0x5ba]=old[1];commitTeamSelection(r);appearance(r,{heads:false});need(s,'updatePalette',r);r[0x6d9]=63;
}
/** Original main2/sub05, 05:8ABE..8DBB; independent 13-team selection. */
export async function stepTeamSelection(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);initializeTeamSelectionObjects(r);need(s,'configureChrBanks',r);need(s,'applyTilePatches',teamSelectionPatches(r));need(s,'requestSound',2);}
 r[0x30]=0x76;r[0x31]=0x8c;r.set(D.pointers5.slice(r[0x5c9]*4,r[0x5c9]*4+4),0x2c);
 if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
 else if(r[0x5c9]===1){
  if((r[0x57]&32)&&r[0x5d]===1){r[9]=0;if(r[0x5ca]&128)r[9]=r[8];}
  for(let side=0;side<2;side++){
   const slot=side+2;r[0x5cc]=side;
   if((r[0x5ca]&r[0x5cb])&128){await leaveTeamSelection(r,s);break;}
   const cmd=readMenuCommand(r),old=r[0x5ca+side];
   if(cmd===1){need(s,'requestSound',51);await leaveTeamSelection(r,s);break;}
   if(cmd===3&&!(old&128)){need(s,'requestSound',51);r[0x5ca+side]=old|128;queueMenuSelectionTile(r,slot,D.positions5,220);}
   else if(cmd===4){need(s,'requestSound',52);if(old&128){r[0x5ca+side]=old&127;queueMenuSelectionTile(r,slot,D.positions5,2);}}
   else if(cmd>=5&&!(old&128)){need(s,'requestSound',50);navigateMenuOption(r,slot,D.neighbors5);}
   setMenuCursorPosition(r,slot,D.positions5);setMenuCursorBlink(r,slot,13);need(s,'submitMenuCursor',r,slot);
  }
 }else throw new RangeError('Original sub05 phase');
 finishTeamSelectionFrame(r,s);
}
// Original9C05 scroll advances by four and skips the 240..255 nametable gap.
export function updateRosterMenuScroll(r){
 if(r[0x5c9]>=5){if(r[0xf2]===0&&r[0xf3]===1)return;r[0xf2]+=4;if(r[0xf2]>=240){r[0xf2]=0;r[0xf3]=1;}return;}
 if((r[0xf2]|r[0xf3])===0)return;r[0xf2]-=4;if(r[0xf2]>=240){r[0xf2]-=16;r[0xf3]--;}
 if((r[0xf3]&128)||((r[0xf3]|r[0xf2])===0)){r[0xf2]=r[0xf3]=0;}
}
export function restoreRosterPlayerChoice(r){const slot=(r[0x5cb]<<1)|r[0x5cc],i=D.names7.indexOf(r[0x532+slot]);r[0x5ca]=i<0?0:i;}
export function updateRosterMenuHead(r,slot){const side=r[0x5cc];r[0x55c+(slot|1)]=(((r[0x52c+side]&15)?12:0)+r[0x532+slot])&255;}
export function previewRosterPlayerChoice(r){const slot=(r[0x5cb]<<1)|r[0x5cc],n=D.names7[r[0x5ca]];if(n===undefined)throw new RangeError('Original roster choice');r[0x532+slot]=n;updateRosterMenuHead(r,slot);}
export function rosterPlayerIsUnique(r){let slot=(r[0x5cb]<<1)|r[0x5cc];r[0x1c]=r[0x532+slot];for(slot-=2;slot>=0;slot-=2)if(r[0x532+slot]===r[0x1c])return false;return true;}
export function restoreRosterTacticChoice(r){const group=D.tacticGroups7[r[0x5ca]];if(group===undefined)throw new RangeError('Original tactic choice');r[0x1c]=r[0x5d3+r[0x5cc]]>>>(group*2);const v=r[0x1c]&3;r[0x5ca]+=v===3?0:v;}
export function commitRosterTacticChoice(r){const i=r[0x5ca]*2;if(i+1>=D.tacticMasks7.length)throw new RangeError('Original tactic choice');r[0x1c]=D.tacticMasks7[i];r[0x1d]=D.tacticMasks7[i+1];const a=0x5d3+r[0x5cc];r[a]=(r[a]&r[0x1c])|r[0x1d];}
function rosterGraphics(r,s,entry,x=0){return need(s,'rosterMenuGraphics',r,entry,x,s);}
async function leaveRosterMenu(r,s){beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);r[0x59]=4;}
const rosterMark=(r,positions,tile)=>queueMenuSelectionTile(r,12,positions,tile);
function rosterTail(r,s,positions){updateRosterMenuScroll(r);if(!(r[0x5ca]&128)){setMenuCursorPosition(r,12,positions);setMenuCursorBlink(r,12,0);need(s,'submitMenuCursor',r,12);}for(let x=0;x<12;x++){rosterGraphics(r,s,'9DC2',x);need(s,'submitMenuCursor',r,x);}need(s,'updateSpriteVisibility',r);}
export async function initializeRosterMenu(r,s){
 const side=r[0x5cc];if(side>1)throw new RangeError('Original roster side');
 if(!(r[0x57]&128)){const screen=D.screens7[r[0x52c+side]&15];if(!(screen&128))need(s,'loadScreen',screen,r);}
 await rosterGraphics(r,s,'9FEB');r[0x5ca]=r[0x5cb]=255;r.fill(5,0x61,0x6e);r[0x530+side]&=3;
 for(let x=side;x<12;x+=2)updateRosterMenuHead(r,x);
 const i=(r[0x52c+side]&15)*2;r[0x5ba]=D.teamChr7[i];r.fill(D.teamPal7[i],0x5ae,0x5b2);r[0x5b8]=38;r[0x5b9]=39;r[0x5bb]=9;need(s,'configureChrBanks',r);need(s,'requestSound',2);
}
/** 05:97F5 main2/sub07 formation, six-player lineup and packed tactics. */
export async function stepRosterMenu(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);await initializeRosterMenu(r,s);}
 const phase=r[0x5c9],positions=D.positions7[phase],neighbors=D.neighbors7[phase];if(!positions)throw new RangeError('Original roster phase');r[0x30]=0x20;r[0x31]=0x9b;r.set(D.pointers7.slice(phase*4,phase*4+4),0x2c);r.set(r.slice(0xf0,0xf4),0xec);
 const sound=n=>need(s,'requestSound',n),nav=()=>navigateMenuOption(r,12,neighbors),mark=tile=>rosterMark(r,positions,tile),unset=()=>{r[0x5ca]=255;};
 if(phase===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);rosterTail(r,s,positions);return;}
 if(phase===1&&r[0x5ca]&128){if(r[0x5cb]&128)r[0x5cb]=3;r[0x5ca]=r[0x5cb]&1;mark(2);rosterGraphics(r,s,'9D9B');}
 if(phase===2&&r[0x5ca]&128){r[0x5ca]=r[0x530+r[0x5cc]]&3;mark(2);}
 if(phase===3&&r[0x5ca]&128){r[0x5ca]=(r[0x5cb]>>>1)&1;mark(2);rosterGraphics(r,s,'9DA0');}
 if(phase===4&&r[0x5cb]&128){r[0x5cb]=0;restoreRosterPlayerChoice(r);}
 if(phase===5&&r[0x5ca]&128){r[0x5ca]=0;restoreRosterTacticChoice(r);}
 const command=readMenuCommand(r),cmd=phase<=3&&command>=5?5:command;
 if(phase<=3&&cmd===1){sound(51);await leaveRosterMenu(r,s);return;}
 if(phase===1){
  if(cmd===3){sound(51);mark(220);r[0x5cb]=(r[0x5cb]&254)|r[0x5ca];r[0x5c9]+=r[0x5ca]?2:1;unset();}
  else if(cmd===4)sound(52);else if(cmd===5){r[0x5ca]^=1;sound(50);}
 }else if(phase===2){
  if(cmd===3){sound(51);mark(220);r[0x5c9]++;unset();}
  else if(cmd===4){sound(52);mark(220);unset();r[0x5c9]=1;}
  else if(cmd===5){sound(50);await rosterGraphics(r,s,'A07B',12);nav();await rosterGraphics(r,s,'A054',12);r[0x530+r[0x5cc]]=r[0x5ca];}
 }else if(phase===3){
  if(cmd===3){sound(51);mark(220);r[0x5c9]+=r[0x5ca]?2:1;r[0x5ca]=r[0x5cb]=255;}
  else if(cmd===4){sound(52);mark(220);r[0x5cb]=(r[0x5cb]&253)|(r[0x5ca]<<1);unset();r[0x5c9]=1;}
  else if(cmd===5){r[0x5ca]^=1;sound(50);}
 }else if(phase===4){
  if(cmd===1||cmd===3){
   if(r[0x5cb]===6){sound(51);r[0x5c9]=5;unset();}
   else{previewRosterPlayerChoice(r);if(!rosterPlayerIsUnique(r))sound(52);else{sound(51);await rosterGraphics(r,s,'9E60');r[0x5cb]++;if(r[0x5cb]===6)unset();else restoreRosterPlayerChoice(r);}}
  }else if(cmd===4){sound(52);const v=(r[0x5cb]-1)&255;r[0x5cb]=v&128?0:v;restoreRosterPlayerChoice(r);await rosterGraphics(r,s,'9E9C');}
  else if(cmd>=5&&r[0x5cb]!==6){if(cmd<7&&!(r[0x57]&128))r[0x5ca]^=1;else nav();previewRosterPlayerChoice(r);sound(50);}
 }else if(phase===5){
  if(cmd===1||(cmd===3&&r[0x5ca]>=9)){sound(51);await leaveRosterMenu(r,s);return;}
  if(cmd===3||cmd===4){sound(cmd===3?51:52);r[0x5cd]=cmd===3?6:5;nav();restoreRosterTacticChoice(r);}
  else if(cmd===5||cmd===6){nav();restoreRosterTacticChoice(r);sound(50);rosterGraphics(r,s,'9F64');}
  else if(cmd===7||cmd===8){nav();commitRosterTacticChoice(r);sound(50);rosterGraphics(r,s,'9F64');}
 }
 rosterTail(r,s,positions);
}
/** 05:92CD..9312 with AD91 six-character upper/lower glyph expansion. */
export async function prepareVersusPrematchOptions(r,s){
 const team=r[0x52c+r[0x5cc]]&15,row=D.versusNames[team];r[0x30]=D.versusNamePointers[team*2];r[0x31]=D.versusNamePointers[team*2+1];r[0x1c]=255;r[0x1d]=218;r[0x1e]=219;r[0x1f]=r[0x695]=r[0x6b8]=6;
 for(let y=0;y<6;y++){const v=row[y];if(v<16||v>=128){r[0x6b9+y]=v;r[0x696+y]=255;}else if(v<80){r[0x6b9+y]=v|128;r[0x696+y]=218;}else{r[0x6b9+y]=v+80;r[0x696+y]=219;}}
 r[0x694]=75;r[0x6b7]=107;r[0x693]=r[0x6b6]=32;
 const patches=[];for(const[base,inc]of[[0x693,0x690],[0x6b6,0x691]]){r[0x4c]=(r[0x4c]&251)|r[inc];patches.push({address:(r[base]<<8)|r[base+1],bytes:Array.from(r.slice(base+3,base+9)),...(r[inc]&4?{stride:32}:{})});r[inc]=0;r[base]=255;}
 need(s,'applyTilePatches',patches);await need(s,'nextFrame');
}
