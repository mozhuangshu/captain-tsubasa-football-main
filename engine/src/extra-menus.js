/** Native semantic menus from bank05: 9357, A0E0, 8893, A281, A576.
 * RAM/state/table arithmetic only; no CPU, mapper, ROM loader or invented input. */
import {EXTRA_MENU_DATA as D} from './extra-menus-data.js';
import {initializeMenuScreen,advancePaletteFade,beginPaletteFade,waitForPaletteFade,readMenuCommand,navigateMenuOption,setMenuCursorPosition,setMenuCursorBlink} from './state-dispatch.js';
import {updatePrematchPortrait} from './prematch-flow.js';
import {leagueStandingsPatches,TEAM_MUSIC,resetMatchSetup,prepareMatchEnvironment} from './league-flow.js';
import {configureRosterMemory,loadAttributeMemory} from './platform/state-views.js';
import {updateRosterMenuScroll} from './roster-menus.js';
import {teamAppearance} from './sprite-appearance.js';
import {requestDialogue,stepDialogue} from './dialogue.js';
export {EXTRA_MENU_DATA} from './extra-menus-data.js';
const need=(s,n,...a)=>{if(typeof s[n]!=='function')throw new Error(`MissingTranslation: extra menu ${n}`);return s[n](...a);};
const sound=(s,id)=>need(s,'requestSound',id);
function queue(r,base,address,bytes){r[base]=address>>>8;r[base+1]=address&255;r[base+2]=bytes.length;r.set(bytes,base+3);}
function flush(r,s){const patches=[];for(const base of [0x693,0x6b6,0x6d9])if(!(r[base]&128)&&r[base+2]){const inc=0x690+(base-0x693)/35;r[0x4c]=(r[0x4c]&251)|r[inc];patches.push({address:r[base]*256+r[base+1],bytes:Array.from(r.slice(base+3,base+3+r[base+2])),...(r[inc]&4?{stride:32}:{})});r[inc]=0;r[base]=255;}if(patches.length)need(s,'applyTilePatches',patches);}
function block(address,bytes,width){return Array.from({length:bytes.length/width},(_,i)=>({address:address+i*32,bytes:bytes.slice(i*width,(i+1)*width)}));}
function pointerContext(r,positions,neighbors){r[0x2c]=positions&255;r[0x2d]=positions>>>8;r[0x2e]=neighbors&255;r[0x2f]=neighbors>>>8;}
function positionsWithSentinel(positions,sentinel){const p=[...positions];p[254]=sentinel[0];p[255]=sentinel[1];return p;}
function portraitTail(r,s){updatePrematchPortrait(r,0);need(s,'drawMenuObject',r,0);need(s,'flushMenuSprites',r);}
async function backToOptions(r,s){beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);r[0x59]=4;}
/** 8893: original standings, not a second team-selection screen. */
export async function stepStandingsMenu(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);need(s,'applyTilePatches',leagueStandingsPatches(r));sound(s,2);}
 if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
 else if(r[0x5c9]===1){if(r[8]&240){sound(s,51);await backToOptions(r,s);}}
 else throw new RangeError('8893 phase');
}
/** BF65/BF2A: location and forecast are precomposed CHR tile-name data. */
export function weatherInformationPatches(r){
 const location=(r[0x57]&128)?(r[0x54a]&128?(r[0x52d]&15)+4:4):r[0x529];
 if(!D.locationLabels[location])throw new RangeError('BF65 location');
 return [...block(0x20aa,D.locationLabels[location],14),...block(0x2127,D.weatherLabels[(r[0x603]&224)>>>5],18)];
}
export function drawWeatherInformation(r,s){
 need(s,'applyTilePatches',weatherInformationPatches(r));need(s,'commitGraphicsBanks',r);
 const rain=(r[0x603]&224)>>>4,dir=(r[0x495]&3)*2,wind=(r[0x494]&112)>>>1;
 if(dir+2>D.direction.length||wind+8>D.wind.length)throw new RangeError('A16A original weather option domain');
 queue(r,0x693,0x2219,D.precipitation.slice(rain,rain+2));queue(r,0x6b6,0x225a,D.direction.slice(dir,dir+2));flush(r,s);
 queue(r,0x693,0x2278,D.wind.slice(wind,wind+4));queue(r,0x6b6,0x2298,D.wind.slice(wind+4,wind+8));r[0x2c]=216;r[0x2d]=34;flush(r,s);
 if(r[0x495]&12){queue(r,0x693,0x22d8,D.warnings.slice(0,4));flush(r,s);r[0x2c]=24;r[0x2d]=35;}
 if(r[0x495]&48){queue(r,0x693,r[0x2d]*256+r[0x2c],D.warnings.slice(4));flush(r,s);}
}
export async function stepWeatherInformation(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);r[0x61]=5;r[0x459]=8;r[0x5ae]=r[0x5af]=1;r[0x5b8]=38;r[0x5b9]=39;need(s,'commitGraphicsBanks',r);r[0x314]=40;r[0x34d]=184;drawWeatherInformation(r,s);sound(s,2);}
 if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
 else if(r[0x5c9]===1){if(r[8+r[0x5cc]]&240){sound(s,51);await backToOptions(r,s);}}
 else throw new RangeError('A0E0 phase');portraitTail(r,s);
}
function glyphRows(r,bytes){r[0x1c]=255;r[0x1d]=218;r[0x1e]=219;r[0x1f]=bytes.length;const upper=[],lower=[];for(const v of bytes){upper.push(v<16||v>=128?255:v<80?218:219);lower.push(v<16||v>=128?v:v<80?v|128:(v+80)&255);}return {upper,lower};}
function writeProfileText(r,s,address,bytes){r[0x34]=address&255;r[0x35]=address>>>8;const {upper,lower}=glyphRows(r,bytes);queue(r,0x693,address,upper);queue(r,0x6b6,address+32,lower);flush(r,s);}
/** A31F fixed profile card. Values deliberately come from A43C, not live stats. */
export function drawPlayerProfile(r,s){
 const player=r[0x5d1],offset=player*7;if(player>=12)throw new RangeError('A31F profile player');r[0x2b]=offset;
 for(let i=0;i<3;i++){const value=D.profileRows[offset+i];r[0x30]=value%10;r[0x31]=Math.floor(value/10);queue(r,0x693+i*35,[0x20f9,0x2139,0x2179][i],[r[0x31]|128,r[0x30]|128]);}flush(r,s);
 queue(r,0x6d9,0x21b9,[D.profileRows[offset+3]]);r[0x30]=(0xc0a0+player*5)&255;r[0x31]=(0xc0a0+player*5)>>>8;writeProfileText(r,s,0x21c4,D.names.slice(player*5,player*5+5));
 let address=0x21d2;r[0x34]=address&255;r[0x35]=address>>>8;r[0x2a]=2;
 for(let i=0;i<3;i++){const skill=D.profileRows[offset+4+i];if(skill&128)break;if(skill>=19)throw new RangeError('A492 skill');const source=0xa492+skill*12;r[0x30]=source&255;r[0x31]=source>>>8;writeProfileText(r,s,address,D.abilities.slice(skill*12,skill*12+12));address+=64;r[0x34]=address&255;r[0x35]=address>>>8;r[0x2b]++;r[0x2a]--;}
}
export async function stepPlayerProfile(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);r[0x52c]=0;const a=teamAppearance(r[0x52c],r[0x52d],Array.from(r.slice(0x532,0x53e)));r[0x1c]=(r[0x52d]&3)===0?1:0;r[0x1d]=r[0x1c]^1;r[0x5b9]=a.chrPages[1];r[0x5ba]=a.chrPages[2];r.set(a.heads,0x55c);need(s,'commitGraphicsBanks',r);r[0x55c]=r[0x5d1];r[0x5ca]=255;r[0x74]=r[0x61]=0;r[0x314]=60;r[0x34d]=96;r[0x459]=9;drawPlayerProfile(r,s);requestDialogue(r,(r[0x5d1]+1)&255);sound(s,2);}
 if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;}
 else if(r[0x5c9]===1){if(r[0x5b2]&128){if(r[0x5b2]&64){r[0x59]=r[0x5b];return;}if(s.stepDialogue)s.stepDialogue(r,s);else stepDialogue(r,{sound:id=>sound(s,id),drawTiles:(address,bytes)=>need(s,'applyTilePatches',[{address,bytes}])});if(!(r[0x605]&128))beginPaletteFade(r,'out');}}
 else throw new RangeError('A281 phase');portraitTail(r,s);advancePaletteFade(r,s.updatePalette);
}
export function chooseMenuMusic(r){const id=D.musicIds[r[0x5ca]&7];r[0x55a]=(id&128)?TEAM_MUSIC[r[0x529]&3]:id;return r[0x55a];}
/** A6E1 edge priority and original 00..50 hexadecimal clamp. */
export function stepHiddenMusic(r,s){
 const keys=r[8];let value=r[0x5cb];if(keys&1)value=Math.max(0,value-16);else if(keys&2)value=(value+16)&255;else if(keys&4)value=Math.max(0,value-1);else if(keys&8)value=(value+1)&255;
 else if(keys&128){sound(s,value);return;}else if(keys&64){sound(s,0);return;}else if(keys&48){r[0x5ca]=255;queue(r,0x6b6,0x20e5,[2,2]);return;}
 if(keys&15)r[0x5cb]=Math.min(value,80);value=r[0x5cb];queue(r,0x6b6,0x20e5,[(value>>>4)|128,(value&15)|128]);
}
export async function stepMusicMenu(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);r[0x5ca]=255;r[0x61]=r[0x459]=7;r[0x63]=5;r[0x55c]=0;r[0x5ae]=r[0x5af]=1;r.set([52,53,54,55],0x5b8);need(s,'commitGraphicsBanks',r);r[0x314]=40;r[0x34d]=184;sound(s,0);}
 pointerContext(r,0xa69f,0xa67b);
 if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
 else if(r[0x5c9]===1){if(r[0x5ca]===8)stepHiddenMusic(r,s);else{
  if((r[8]&32)&&r[0x5ca]===5&&(r[4]&2)){r[0x5ca]=8;r[0x5cb]=0;}
  if(r[0x5ca]&128){r[0x5ca]=7;sound(s,chooseMenuMusic(r));}
  const cmd=readMenuCommand(r);if(cmd===1||cmd===3){sound(s,51);chooseMenuMusic(r);await backToOptions(r,s);return;}
  if(cmd===4)sound(s,52);else if(cmd===5||cmd===6){navigateMenuOption(r,2,D.musicNeighbors);sound(s,chooseMenuMusic(r));}
 }}else throw new RangeError('A576 phase');
 setMenuCursorPosition(r,2,positionsWithSentinel(D.musicPositions,D.musicSentinel));setMenuCursorBlink(r,2,0);need(s,'drawMenuObject',r,2);portraitTail(r,s);
}
/** 955D / 95E6 retain the original packed option bytes. */
export function restoreFieldOption(r){const p=r[0x5c9];if(p<2)return;const values=[r[0x529]&3,r[0x5fb]&15,[0,1,1,2,2,3][r[0x5fb]>>>4],r[0x494]&15,r[0x494]>>>4,r[0x495]&3,(r[0x495]&12)>>>2,(r[0x495]&48)>>>4];if(values[p-2]===undefined)throw new RangeError('955D field option');r[0x5ca]=values[p-2];}
export function commitFieldOption(r){const p=r[0x5c9],v=r[0x5ca];switch(p){case 0:case 1:return;case 2:r[0x529]=v&3;break;case 3:r[0x5fb]=(r[0x5fb]&240)|v;break;case 4:r[0x5fb]=(r[0x5fb]&15)|[0,16,64,80][v&3];break;case 5:r[0x494]=(r[0x494]&240)|(v&15);break;case 6:r[0x494]=(r[0x494]&15)|((v&15)<<4);break;case 7:r[0x495]=(r[0x495]&252)|(v&3);break;case 8:r[0x495]=(r[0x495]&243)|((v&3)<<2);break;case 9:r[0x495]=(r[0x495]&207)|((v&3)<<4);break;default:throw new RangeError('95E6 phase');}}
export function queueFieldOptionHighlight(r){const phase=r[0x5c9],data=D.fieldAttrs[phase],offset=r[0x5ca]*8;if(phase<2||!data||offset+8>data.length)throw new RangeError('96AA highlight');r[0x32]=[0x970b,0x970b,0x970b,0x972b,0x9743,0x9763,0x9763,0x978b,0x97a3,0x97a3][phase]&255;r[0x33]=0x97;queue(r,0x6b6,D.fieldAttrAddresses[phase-2],data.slice(offset,offset+8));}
async function leaveFieldOptions(r,s){beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);r[0x5f2]&=15;resetMatchSetup(r);prepareMatchEnvironment(r);configureRosterMemory(r);loadAttributeMemory(r);r[0x55a]=TEAM_MUSIC[r[0x529]];if(r[0x57]&64)r[0x59]=3;else{r[0x58]=0;r[0x59]=0;}}
export async function stepFieldOptions(r,s){
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);r[0x5ca]=255;r.fill(127,0x74,0x78);r[0x61]=r[0x62]=5;r.fill(1,0x5ae,0x5b2);r[0x5b8]=38;r[0x5b9]=39;need(s,'commitGraphicsBanks',r);const phase=r[0x5c9];for(r[0x5c9]=2;r[0x5c9]<10;r[0x5c9]++){restoreFieldOption(r);queueFieldOptionHighlight(r);flush(r,s);}r[0x5c9]=phase;restoreFieldOption(r);sound(s,2);}
 const phase=r[0x5c9];if(phase>9)throw new RangeError('9357 phase');r.set(r.slice(0xf0,0xf4),0xec);
 const pos=D.fieldPositions[phase],neighbors=D.fieldNeighbors[phase];pointerContext(r,[0x951d,0x951d,0x951d,0x9525,0x952b,0x9533,0x953d,0x9547,0x954d,0x9555][phase],[0x94ed,0x94ed,0x94ed,0x94fd,0x94ed,0x9509,0x9509,0x94fd,0x94ed,0x94ed][phase]);
 if(phase<2){if(r[0x5b2]&128)r[0x5c9]+=2;advancePaletteFade(r,s.updatePalette);}
 else{if(r[0x5ca]&128)r[0x5ca]=0;const cmd=readMenuCommand(r);
  if(cmd===1||(cmd===3&&(phase===4||phase===9))){sound(s,51);await leaveFieldOptions(r,s);}
  else if(cmd===7||cmd===8){sound(s,50);navigateMenuOption(r,0,neighbors);commitFieldOption(r);queueFieldOptionHighlight(r);}
  else if(cmd===3||cmd===4||cmd===5||cmd===6){sound(s,cmd===3?51:cmd===4?52:50);commitFieldOption(r);r[0x5c9]=(cmd===4||cmd===5?D.fieldPrevious:D.fieldNext)[phase];restoreFieldOption(r);updateRosterMenuScroll(r);return;}
 }
 updateRosterMenuScroll(r);setMenuCursorPosition(r,0,positionsWithSentinel(pos,D.fieldSentinels[phase]));setMenuCursorBlink(r,0,0);need(s,'drawMenuObject',r,0);need(s,'flushMenuSprites',r);
}
