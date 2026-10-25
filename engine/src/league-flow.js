/** Recovered league-screen orchestration and weather setup; no CPU/ROM runner. */
import {advanceRandom} from './mood-league.js';
import {initializeMenuScreen,readMenuCommand,navigateMenuOption,setMenuCursorPosition,setMenuCursorBlink,beginPaletteFade,advancePaletteFade,waitForPaletteFade} from './state-dispatch.js';
import {MissingTranslation,selectLeagueOpponent,opponentMenuIndex,settleLeagueMatch,leagueQualification,enterBracket,prepareBracketMatch,encodeLeaguePassword,restoreLeaguePassword,passwordDisplayTiles} from './league.js';
import {leagueStoryAllows,leagueStoryCursor,leagueStoryAfterSettle} from './league-story-hooks.js';
export const LEAGUE_NEIGHBORS=Object.freeze([3, 1, 8, 4, 0, 2, 9, 5, 1, 3, 10, 6, 2, 0, 11, 7, 7, 5, 0, 8, 4, 6, 1, 9, 5, 7, 2, 10, 6, 4, 3, 11, 11, 9, 4, 0, 8, 10, 5, 1, 9, 11, 6, 2, 10, 8, 7, 3]); // file $0147F7
export const LEAGUE_CURSOR=Object.freeze([13, 6, 13, 11, 13, 16, 13, 21, 20, 6, 20, 11, 20, 16, 20, 21, 25, 6, 25, 11, 25, 16, 25, 21]); // file $014827
export const TEAM_MUSIC=Object.freeze([7, 3, 13, 5]); // file $0166E1
export const WEATHER_CONTINENT=Object.freeze([0, 1, 3, 2]); // file $017A9E
export const WEATHER_SURFACE_GROUP=Object.freeze([0, 4, 4, 8, 0, 12, 4, 4, 0, 0, 0, 0, 0, 4, 0, 8]); // file $017AA2
export const WEATHER_SURFACE=Object.freeze([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 2, 2, 2, 1]); // file $017AB2
export const WEATHER_MASKS=Object.freeze([15, 240, 12, 48, 3]); // file $017AC2
export const WEATHER_TEAM_RULES=Object.freeze([0, 1, 0, 0, 0, 0, 0, 4, 0, 3, 4, 0, 2, 0, 1, 4, 0, 0, 0, 0, 4, 2, 4, 2, 1, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 0, 1, 2, 4, 1, 2, 1, 1, 4, 0, 0, 4, 4, 0, 0, 0, 0, 0, 4, 4, 4, 0, 1, 0, 4, 0, 2, 0, 2]); // file $017AC7
export const WEATHER_DISTRIBUTIONS=Object.freeze([0, 0, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 1, 2, 2, 3, 1, 1, 1, 1, 2, 2, 2, 3, 1, 1, 2, 2, 3, 3, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0]); // file $017B11
export const WEATHER_PACKED=Object.freeze([0, 1, 17, 20, 34, 42, 51, 60, 68, 62]); // file $017B39
export const WEATHER_WETNESS=Object.freeze([0, 0, 0, 0, 0, 0, 16, 32, 16, 16, 32, 48, 32, 32, 48, 64, 16, 16, 32, 32]); // file $017B43
export const WEATHER_FORECAST=Object.freeze([0, 32, 48, 64, 64, 96, 128, 160, 192, 255]); // file $017B8A
function need(s,key,...args) {if(typeof s[key]!=='function')throw new MissingTranslation(key);return s[key](...args);}
function memory(r) {if(!(r instanceof Uint8Array)||r.length<0x800)throw new RangeError('Expected 2KB semantic state array');}
const FIELDS={points:0x555,played:0x556,losses:0x557,wins:0x558,stage:0x54a,mode:0x57,flag052a:0x52a,flag052b:0x52b,homeTeam:0x52c,opponent:0x52d,scoreHome:0x52e,scoreAway:0x52f,frame:0x300,screen:0x58,screenSubtype:0x59,returnScreen:0x5b,ending:0x61f,rng45:0x45,rng46:0x46};
/** Named live views are state adapters, never opcode/memory interpreters. */
export function leagueStateView(r) {
  memory(r);const s={records:r.subarray(0x53e,0x54a),bracket:r.subarray(0x54b,0x555)};
  for(const [name,address] of Object.entries(FIELDS))Object.defineProperty(s,name,{get:()=>r[address],set:v=>{r[address]=v;},enumerable:true});
  return s;
}
function random(r) {const out=advanceRandom(leagueStateView(r));r[0x0c]=out.scratch0c;return out.value;}
/** B9C4..BA5C + BA60..BA8D. IMPORTANT original AD 05 C0 reads 4C,
 * the first byte of the RNG jump stub; it does NOT invoke RNG five times.
 */
export function generateMatchWeather(r) {
  memory(r);r[0x529]=WEATHER_CONTINENT[(r[0x52d]&15)>>>2];
  const surfaceDraw=random(r)&3;
  const team=r[0x54a]<128?11:r[0x52d]&15;
  r[0x5fb]=WEATHER_SURFACE[(surfaceDraw|WEATHER_SURFACE_GROUP[team])&15]&3;
  r[0x494]=0;r[0x495]=0;
  for(let x=0;x<5;x++) {
    const distribution=x===4?0:WEATHER_TEAM_RULES[team*4+x];
    const index=WEATHER_DISTRIBUTIONS[distribution*8+(0x4c&7)]*2;
    const address=x<2?0x494:0x495;
    r[address]|=WEATHER_PACKED[index+(x<2?0:1)]&WEATHER_MASKS[x];
  }
  if(r[0x5fb]===2)r[0x494]&=0xf0;
  else r[0x5fb]|=WEATHER_WETNESS[((r[0x494]&15)<<2)|(random(r)&3)]&0x70;
  return {continent:r[0x529],surface:r[0x5fb],rainWind:r[0x494],hazards:r[0x495]};
}
/** Complete BB47..BB79 match reset, weather and forecast selection. */
export function resetMatchSetup(r) {
  memory(r);for(const a of [0x5f1,0x52e,0x52f,0x559,0x52a,0x52b])r[a]=0;
  const high=r[0x57]&0xf0;
  if(high===0 || high>=128)generateMatchWeather(r);
  const index=((r[0x494]&15)<<1)+(random(r)>=128?1:0);
  if(index>=WEATHER_FORECAST.length)throw new MissingTranslation('BB73 forecast outside original option domain');
  r[0x603]=WEATHER_FORECAST[index];return r[0x603];
}
/** 86B3..8711; caller performs the original preceding palette fade. */
export function startFromLeaguePassword(r) {
  memory(r);const valid=restoreLeaguePassword(leagueStateView(r),r.subarray(0x46e,0x478));
  r[0x52a]=r[0x52b]=0;
  for(let i=0;i<6;i++)r[0x532+i*2]=r[0x533+i*2]=i;
  if(r[0x57]&128){r[0x53a]=3;r[0x538]=4;}
  r[0x54a]=255;
  r.fill(8,0x5d5,0x5e1);r.fill(8,0x650,0x65c);r[0x5d3]=r[0x5d4]=0x55;
  const mode=r[0x57];const group=mode&128?0:mode&64?1:mode&32?2:3;
  r[0x58]=2;r[0x59]=[14,5,5,6][group];return valid;
}
async function fadeOut(r,s) {
  beginPaletteFade(r,'out');
  if(typeof s.updatePalette!=='function'||typeof s.nextFrame!=='function')throw new MissingTranslation('fadeOut/updatePalette/nextFrame');
  await waitForPaletteFade(r,s.updatePalette,s.nextFrame);
}
const sound=(s,id)=>need(s,'requestSound',id);
/** Exact 84FD..8592 phase4 editor body, original input bits not HTML key names.
 * Writes original palette-buffer tile stream for digit updates.
 * Caller owns common main2:01 cursor/object draw after this branch.
 */
export async function stepPasswordEditor(r,s) {
  memory(r);if(r[0x5ca]&128)r[0x5ca]=0;
  const command=readMenuCommand(r);
  if(command===1){sound(s,0x33);await fadeOut(r,s);startFromLeaguePassword(r);return 'start';}
  if(command===3){sound(s,0x33);r[0x5ca]=255;r[0x5c9]=3;return 'difficulty';}
  if(command===4){r[0x5ca]=255;r[0x5c9]=2;sound(s,0x34);r[0x479]=0x11;return 'previous';}
  if(command===5||command===6) {
    const a=0x46e+r[0x5ca];r[a]=(r[a]+(command===5?1:-1))&15;
    r.set(passwordDisplayTiles(r.subarray(0x46e,0x478)),0x696);
    r[0x695]=12;r[0x694]=15;r[0x693]=0x21;sound(s,0x32);
  }
  if(command===7||command===8){r[0x5ca]=(r[0x5ca]+(command===7?9:1))%10;sound(s,0x32);}
  return 'editing';
}
/** Original display entry 8953 does password generation once during init. */
function prepareStandings(r,s,scoresOnly=false) {
  const password=encodeLeaguePassword(leagueStateView(r),random(r));
  r.set(password,0x46e);r.set(password,0x2c);
  need(s,scoresOnly?'drawLeagueQualification':'drawLeagueStandings',r,passwordDisplayTiles(password));
}
/** 88D0..892A original paired 16-byte attribute column updates. */
export function highlightLeagueColumn(r) {
 const column=r[0x5ca]&3,colors=[0xaa,0xfa,0xaf,0xfa,0xaf,0xaa,0xff,0xaa];
 r.fill(colors[column*2],0x6b9,0x6c1);r.fill(colors[column*2+1],0x6c1,0x6c9);
 r[0x6b6]=0x23;r[0x6b7]=0xc8+column*8;r[0x6b8]=16;
}
export function clearLeagueColumn(r) {
 const column=r[0x5ca]&3;r.fill(255,0x696,0x6a6);
 r[0x693]=0x23;r[0x694]=0xc8+column*8;r[0x695]=16;
}
function initSelector(r,s) {
  r[0x5ca]=255;r[0x61]=5;r[0x52c]=0;r[0x5ae]=r[0x5af]=1;r[0x5b8]=0x26;r[0x5b9]=0x27;
  need(s,'commitGraphicsBanks',r);prepareStandings(r,s);sound(s,10);
}
/** Original league selector, main2:02, 871A..87DB. */
async function stepSelector(r,s) {
  if(!(r[0x59]&128)){initializeMenuScreen(r,s);initSelector(r,s);}
  if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);return;}
  if(r[0x5c9]!==1)throw new MissingTranslation('871A phase outside 0..1');
  if(r[0x5ca]&128){r[0x5ca]=leagueStoryCursor(r,opponentMenuIndex(r[0x52d]));highlightLeagueColumn(r);}
  const command=readMenuCommand(r);
  if(command===1||command===3) {
    const choice=selectLeagueOpponent(leagueStateView(r),r[0x5ca]);
    if(!choice.available||!leagueStoryAllows(r,choice.team&15))sound(s,0x34);/* story lock: inactive unless installed */
    else {
      sound(s,0x33);r[0x52d]=choice.team;r[0x55a]=TEAM_MUSIC[(choice.team&15)>>>2];
      await fadeOut(r,s);resetMatchSetup(r);r[0x59]=3;
    }
  }else if(command===4)sound(s,0x34);
  else if(command>=5){
    sound(s,0x32);if(command<=6)clearLeagueColumn(r);
    navigateMenuOption(r,0,LEAGUE_NEIGHBORS);
    if(command<=6)highlightLeagueColumn(r);
  }
  setMenuCursorPosition(r,0,LEAGUE_CURSOR);setMenuCursorBlink(r,0,0);need(s,'drawMenuObject',r,0);need(s,'flushMenuSprites',r);
}
/** B2B2..B3DB qualifications screen, exact one-time settlement on entry. */
async function stepQualification(r,s) {
  const state=leagueStateView(r);
  if(!(r[0x59]&128)) {
    if(r[0x54a]<128){r[0x59]=15;resetMatchSetup(r);return;}
    leagueStoryAfterSettle(r,settleLeagueMatch(state));const decision=leagueQualification(state);
    if(decision==='league'){r[0x59]=2;resetMatchSetup(r);return;}
    if(decision==='forced-bracket'){enterBracket(state);resetMatchSetup(r);return;}
    initializeMenuScreen(r,s);
    r[0x5ca]=255;r[0x6d]=4;r[0x61]=5;r[0x52c]=0;r[0x5ae]=7;r[0x80]=7;r[0x5b8]=0x26;r[0x5b9]=0x27;r[0x5bb]=0x2f;
    need(s,'commitGraphicsBanks',r);r[0x320]=0xc8;r[0x359]=0xa0;
    prepareStandings(r,s,true);sound(s,10);
  }
  if(r[0x5c9]===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
  else if(r[0x5c9]===1) {
    if(r[0x5ca]&128)r[0x5ca]=0;
    const command=Math.min(readMenuCommand(r),5);
    if(command===1||command===3){sound(s,0x33);await fadeOut(r,s);if(r[0x5ca]===0)enterBracket(state);else r[0x59]=2;resetMatchSetup(r);}
    else if(command===4){sound(s,0x34);r[0x5ca]=1;}
    else if(command===5){sound(s,0x32);r[0x5ca]^=1;}
    setMenuCursorPosition(r,0,[8,15,13,15]);
    setMenuCursorBlink(r,0,0);need(s,'drawMenuObject',r,0);
  }else throw new MissingTranslation('B2B2 phase outside 0..1');
  need(s,'drawMenuObject',r,12);need(s,'flushMenuSprites',r);
}
/** B47C..B4D5 + B4D6 non-graphics state; original actual pairing routine. */
async function stepBracket(r,s) {
  if(!(r[0x59]&128)) {
    initializeMenuScreen(r,s);r[0x5bb]=0x2f;need(s,'commitGraphicsBanks',r);
    r[0x6d]=4;r[0x80]=r[0x5ae]=7;r[0x320]=0xc8;r[0x359]=0xa0;
    if(r[0x5b]!==4)prepareBracketMatch(leagueStateView(r));
    need(s,'drawLeagueBracket',r);sound(s,2);
  }
  const activePhase=r[0x5c9];
  if(activePhase===0){if(r[0x5b2]&128)r[0x5c9]++;advancePaletteFade(r,s.updatePalette);}
  else if(activePhase!==1)throw new MissingTranslation('B47C phase outside 0..1');
  need(s,'drawMenuObject',r,12);need(s,'flushMenuSprites',r);
  if(activePhase===1 && (r[0x08]&0xf0)) {
    // In the original phase0 never falls through to phase1 during same call.
    sound(s,0x33);await fadeOut(r,s);r[0x59]=r[0x5b];r[0x529]=4;r[0x55a]=6;
  }
}
export async function stepLeagueScreen(r,s) {
  memory(r);if((r[0x58]&127)!==2)throw new RangeError('Not menu family');
  switch(r[0x59]&127) {
    case 2:return stepSelector(r,s);
    case 14:return stepQualification(r,s);
    case 15:return stepBracket(r,s);
    default:throw new MissingTranslation('league screen not owned by this module');
  }
}
/** 8953..89E0 + 8A11..8A66, exact direct nametable writes as host patches.
 * prepareStandings has already generated $046E password once; this does not
 * draw RNG again. Scores-only corresponds to 8947 jumping into 899E.
 */
export function leagueStandingsPatches(r,scoresOnly=false) {
 memory(r);const out=[];
 if(!scoresOnly){
  const positions=[0x20ee,0x218e,0x222e,0x22ce,0x20f5,0x2195,0x2235,0x22d5,0x20fa,0x219a,0x223a,0x22da];
  for(let option=0;option<12;option++){
   const {recordIndex}=selectLeagueOpponent(leagueStateView(r),option),record=r[0x53e+recordIndex],count=record&3;
   if(count)out.push({address:positions[option],bytes:Array.from({length:count},(_,i)=>(record&(128>>i))?0x16:0x17),stride:1});
  }
 }
 for(const [address,value] of [[0x232a,r[0x558]],[0x2330,r[0x557]],[0x2336,r[0x555]]]){
  const hundreds=Math.floor(value/100),tens=Math.floor(value/10)%10,ones=value%10;
  out.push({address,bytes:[hundreds?hundreds|128:2,(hundreds||tens)?tens|128:2,ones|128],stride:1});
 }
 out.push({address:0x236b,bytes:passwordDisplayTiles(r.subarray(0x46e,0x478)),stride:1});
 return out;
}
/** Host replacement for direct $2006/$2007 writes; no PPU model. */
export function applyLeaguePatches(image,patches) {
 if(!(image instanceof Uint8Array)||image.length<1024)throw new RangeError('nametable image');
 for(const p of patches)for(let i=0;i<p.bytes.length;i++){
  const offset=p.address-0x2000+i*p.stride;
  if(offset<0||offset>=image.length)throw new RangeError('league patch outside supplied image');
  image[offset]=p.bytes[i];
 }
 return image;
}

// Data extracted through original B7C6 pointer records, never runtime code.
export const BRACKET_PATH_PATCHES=[[null, null, null], [{"address": 8621, "bytes": [59, 59, 59]}, {"address": 8624, "bytes": [112, 113]}, {"address": 8657, "bytes": [8, 117]}], [{"address": 8717, "bytes": [59, 59, 59]}, {"address": 8656, "bytes": [104, 114, 115]}, {"address": 8657, "bytes": [8, 117]}], [{"address": 8813, "bytes": [59, 59, 59, 105]}, {"address": 8816, "bytes": [112, 114, 121]}, {"address": 8881, "bytes": [59, 237]}], [{"address": 8909, "bytes": [59]}, {"address": 8910, "bytes": [112, 113]}, {"address": 8943, "bytes": [8, 120]}], [{"address": 9005, "bytes": [59]}, {"address": 8942, "bytes": [104, 114, 115]}, {"address": 8943, "bytes": [8, 120]}], [null, {"address": 8880, "bytes": [119, 114, 118]}, {"address": 8881, "bytes": [59, 237]}], [null, {"address": 8754, "bytes": [104, 114, 114, 114, 115]}, {"address": 8755, "bytes": [8, 120]}], [null, {"address": 8658, "bytes": [117, 114, 114, 113]}, {"address": 8755, "bytes": [8, 120]}], [{"address": 8813, "bytes": [59, 59, 59, 105]}, null, null], [null, null, null], [{"address": 8525, "bytes": [59, 59, 59, 59, 59, 59, 59, 105]}, null, null]];
export const BRACKET_NAME_BYTES=Object.freeze([185, 208, 170, 179, 143, 140, 255, 255, 167, 207, 171, 169, 255, 255, 255, 255, 196, 207, 43, 202, 255, 255, 255, 255, 177, 163, 255, 255, 255, 255, 255, 255, 185, 208, 170, 179, 255, 255, 255, 255, 40, 183, 162, 255, 255, 255, 255, 255, 175, 185, 39, 202, 255, 255, 255, 255, 167, 195, 202, 217, 207, 255, 255, 255, 185, 208, 170, 179, 255, 255, 255, 255, 53, 163, 179, 255, 255, 255, 255, 255, 163, 207, 41, 200, 207, 53, 255, 255, 163, 177, 201, 162, 255, 255, 255, 255, 185, 208, 170, 179, 255, 255, 255, 255, 61, 200, 45, 202, 255, 255, 255, 255, 162, 202, 47, 207, 178, 207, 255, 255, 195, 168, 173, 171, 255, 255, 255, 255]); // 16 x 8 names at B746
export const BRACKET_HIGHLIGHTS=Object.freeze([35, 209, 170, 255, 255, 255, 35, 217, 250, 255, 255, 255, 35, 217, 175, 35, 225, 250, 35, 225, 175, 255, 255, 255, 35, 233, 170, 255, 255, 255, 35, 241, 170, 255, 255, 255]); // B881, six rows
/** B5E6..B743 rendering as original tile/attribute patch sequence. AD91
 * expands the original eight-character rows into upper/lower glyph halves.
 * B6B5 paths preserve separate buffer direction: only graphics uses stride32.
 */
export function leagueBracketPatches(r) {
 memory(r);const patches=[];let previous=255;
 for(let slot=0;slot<6;slot++){
  const team=r[0x54b+slot]&15,upper=[],lower=[];
  for(let i=0;i<8;i++){
   const v=BRACKET_NAME_BYTES[team*8+i];
   if(v<16 || v>=128){upper.push(255);lower.push(v);}
   else if(v<80){upper.push(0xda);lower.push(v|128);}
   else {upper.push(0xdb);lower.push((v+80)&255);}
  }
  patches.push({address:0x2125+slot*96,bytes:upper,stride:1},{address:0x2145+slot*96,bytes:lower,stride:1});
  if(team===(r[0x52d]&15)||team===(r[0x52c]&15)){
   const at=slot*6;
   let color=BRACKET_HIGHLIGHTS[at+2];
   if(previous<128 && previous+1===slot)color=0xaa;
   patches.push({address:(BRACKET_HIGHLIGHTS[at]<<8)|BRACKET_HIGHLIGHTS[at+1],bytes:[color,color],stride:1});
   if(BRACKET_HIGHLIGHTS[at+3]!==255)patches.push({address:(BRACKET_HIGHLIGHTS[at+3]<<8)|BRACKET_HIGHLIGHTS[at+4],bytes:[BRACKET_HIGHLIGHTS[at+5],BRACKET_HIGHLIGHTS[at+5]],stride:1});
   previous=slot;
  }
 }
 const stage=r[0x54a];if(stage>3)throw new RangeError('bracket display stage 0..3');
 const append=(index,vertical)=>{
  BRACKET_PATH_PATCHES[index].forEach((p,buffer)=>{if(p)patches.push({address:p.address,bytes:[...p.bytes],stride:buffer===1&&vertical?32:1});});
 };
 for(let pass=0;pass<stage;pass++){
  for(let slot=0;slot<10;slot++)if(r[0x54b+slot]&128)append(slot,true);
  append(stage+8,false);
 }
 return patches;
}
/** Bind recovered tile overlays to the native image-layout sink. The sink is
 * a host pixel/tile API, never ROM/CPU dispatch. Other sprite/audio services
 * remain mandatory and are not replaced with silent success here.
 */
export function leagueTileServices(layout,applyMenuTileRun) {
 if(typeof applyMenuTileRun!=='function')throw new TypeError('applyMenuTileRun required');
 const apply=patches=>{for(const p of patches)applyMenuTileRun(layout,p.address,p.bytes,{vertical:p.stride===32});};
 return {drawLeagueStandings:r=>apply(leagueStandingsPatches(r,false)),drawLeagueQualification:r=>apply(leagueStandingsPatches(r,true)),drawLeagueBracket:r=>apply(leagueBracketPatches(r))};
}

// 05:BCC8..BD01 original surface pointers and four-byte environment rows.
export const MATCH_SURFACE_POINTER_BYTES=Object.freeze([206, 188, 230, 188, 254, 188]); // file $017CD8
export const MATCH_SURFACE_ROWS=Object.freeze([64, 1, 0, 0, 64, 1, 0, 1, 64, 2, 0, 0, 70, 2, 1, 0, 70, 1, 1, 1, 70, 1, 1, 0, 76, 1, 2, 0, 76, 1, 2, 1, 76, 2, 2, 0, 82, 2, 3, 0, 82, 1, 3, 1, 82, 1, 3, 0, 88, 1, 4, 0]); // file $017CDE
export const MATCH_RAIN_WETNESS=Object.freeze([0, 0, 0, 16, 16, 16, 32, 48, 48, 48, 48, 48, 85, 0, 86, 0]); // file $017D1C
/** 05:BB84..BC1C, file017B94..017C2C. Caller then enters BC1D
 * configureRosterMemory. Integer ADC wraps before unsigned saturation check.
 * No weather generation here: reads the original pre-match option RAM.
 */
export function prepareMatchEnvironment(r) {
  memory(r);
  let surface=r[0x5fb]&3;
  if(r[0x559]!==0 && surface!==2) {
    r[0x5f1]=surface;
    const index=((r[0x494]&7)<<1)+(r[0x300]&1);
    let wet=((r[0x5fb]&0xf0)+MATCH_RAIN_WETNESS[index])&255;
    if(wet>=0x51)wet=0x50;
    r[0x5fb]=(wet&0x70)|surface;
  }
  r[0x5f1]=0;surface=r[0x5fb]&3;
  if(surface===2)r[0x5fb]=2;
  const wet=r[0x5fb]&0xf0;
  if(wet!==0 && wet!==0x50)r[0x5f1]=random(r);
  if(surface===3 || (surface!==2 && wet>0x50))throw new MissingTranslation('BBE4 surface table outside original menu range');
  const pointer=MATCH_SURFACE_POINTER_BYTES[surface*2]|(MATCH_SURFACE_POINTER_BYTES[surface*2+1]<<8);
  r[0x2c]=pointer&255;r[0x2d]=pointer>>>8;
  const offset=pointer-0xbcce+(wet>>>2);
  for(const [i,address] of [0x5f2,0x5f3,0x5f4,0x5e5].entries())r[address]=MATCH_SURFACE_ROWS[offset+i];
  r[0x5be]=0;r[0x5bf]=0;r[0x5c0]=0;r[0x5c1]=2;
}
