/** Semantic recovery of C478-C53x and selected substate behavior.
 * No opcode interpreter, mapper emulation or ROM input. Addresses are evidence
 * labels only. Unrecovered callees must be supplied; none silently succeeds.
 */
export const MAIN_STATES = Object.freeze([
  { index: 0, entry: 0xc506, physicalBank: 14, family: 'fixed-substates' },
  { index: 1, entry: 0xaa6b, physicalBank: 5, family: 'pair2-substates' },
  { index: 2, entry: 0x8055, physicalBank: 10, family: 'pair5-substates' },
  { index: 3, entry: 0xbb5d, physicalBank: 5, family: 'pair2-alternate-substates' },
]);
export const SUBSTATE_ENTRIES = Object.freeze([
  Object.freeze([0xc539,0xc57d,0xc615,0xc699,0xc71e,0xc77d,0xc7d0,0xc743,0xc77d,0xc75d,0xc777,0xc743,0xc77d]),
  Object.freeze([0xaa88,0xaad9,0xab78,0xabde,0xabfe,0xac43,0xaca9,0xacbd,0xac43,0xaca9,0xacbd,0xabce]),
  Object.freeze([0x8083,0x808b,0x8091,0x8097,0x809d,0x80a3,0x80a9,0x80af,0x80b5,0x80bb,0x80c1,0x80c7,0x80cd,0x80cd,0x80d3,0x80d9]),
  Object.freeze([0xbb78,0xbbb1,0xbbce,0xbd00,0xbdc0,0xbe42,0xbe59,0xbe76,0xaa95,0xaad9,0xbe95]),
]);
export function resolveState(main,sub) {
  if (!Number.isInteger(main)||!Number.isInteger(sub)||main<0||main>255||sub<0||sub>255||!MAIN_STATES[main&0x7f]||SUBSTATE_ENTRIES[main&0x7f][sub&0x7f]===undefined)
    throw new RangeError('Unrecovered or invalid state index');
  return { ...MAIN_STATES[main&0x7f], rawMain: main, rawSubstate: sub, initialized: !!(sub&0x80), substate: sub&0x7f, substateEntry: SUBSTATE_ENTRIES[main&0x7f][sub&0x7f] };
}
function call(services,name,...args) {
  if(typeof services[name]!=='function') throw new Error(`Unrecovered dependency: ${name}`);
  return services[name](...args);
}
/** C478-C492. Services are semantic functions, never CPU-address dispatch. */
export function beginMainIteration(r,services) {
  r[0x51]=0;
  call(services,'updatePair3Entry0f',r); // C2A8 -> pair3:800F
  call(services,'updateFixedCea0',r);
  r[0x5a]=r[0x59];
  r[0x300]=(r[0x300]+1)&255;
  call(services,'updatePair4Entry00',r); // C28A -> pair4:8000
  call(services,'advanceRandom',r);
  call(services,'sampleControllers',r);
  return resolveState(r[0x58],r[0x59]);
}
/** C4C3-C4D8 plus NMI INC $51. Host calls onNmi at its platform frame boundary.
 * It must armWait AFTER executing the state; NMI during state work does not
 * satisfy the mandatory additional wait, but contributes to the threshold.
 */
export class MainFrameGate {
  constructor(r){this.r=r;this.waiting=false;this.snapshot=0;}
  beginIteration(){this.r[0x51]=0;this.waiting=false;}
  armWait(){this.snapshot=this.r[0x51];this.waiting=true;}
  onNmi(){
    this.r[0x51]=(this.r[0x51]+1)&255;
    if(!this.waiting||this.r[0x51]===this.snapshot)return false;
    if(this.r[0x51]<this.r[0x5e6]){this.snapshot=this.r[0x51];return false;}
    this.r[0x52]=Math.max(this.r[0x52],this.r[0x51]);
    this.waiting=false;return true;
  }
}
/** C4DB timeout/input decision only. DEC high occurs only when low becomes 0;
 * this is not a conventional 16-bit decrement. No transition I/O is hidden. */
export function evaluateAutomaticExit(r){
  if(r[0x08]&0x30)return 8;
  r[0x589]=(r[0x589]-1)&255;
  if(r[0x589]!==0)return null;
  r[0x58a]=(r[0x58a]-1)&255;
  return r[0x58a]===0 ? 5 : null;
}
/** Call only after the recovered D047,D062 transition has completed. */
export function commitAutomaticExit(r,next){
  if(next!==5&&next!==8)throw new RangeError('exit target');
  r[0x59]=next;r[0x4f]=0x80;r[0x58]=1;
}
/** C615-C646: Start-edge toggles pause bit. The 0x5C mask evidence is exact;
 * further pause rendering/cheat-sequence handler remains an explicit service. */
export function updatePauseBranch(r,services){
  if(r[0x08]&0x10){
    r[0x5c]^=0x80;
    if(r[0x5c]&0x80){r[0x6fd]=0;call(services,'requestSound',0);call(services,'requestSound',0x2d);}
    else call(services,'requestSound',r[0x55a]);
  }
  if(r[0x5c]&0x80){
    call(services,'updateFixedDe47',r);call(services,'updateFixedCaee',r);call(services,'pausedInputSequence',r);return 'paused';
  }
  return 'active'; // caller still owes C66B-C695, explicitly not recovered here
}
/** C7FB-C805, used only after C7D0-C7F4 dependencies have completed. */
export function finishRecoverySubstate(r){
  if(r[0x5c]===0){r[0x59]=2;r[0x3ad]&=0x7f;return true;}return false;
}

// D047/D04F/D054: five brightness levels, two update calls per level by default.
export function beginPaletteFade(r,direction='in'){
  if(direction!=='in'&&direction!=='out')throw new RangeError('fade direction');
  r[0x5b2]=direction==='out'?0x40:0;r[0x5b3]=2;r[0x5b5]=0;r[0x5b6]=0;
}
export function advancePaletteFade(r,updatePalette){
  if(r[0x5b2]&0x80)return true;
  const stage=r[0x5b6];
  if(stage>4)throw new RangeError('Unrecovered invalid fade stage');
  r[0x5b4]=(r[0x5b2]&0x40)?0x40-stage*0x10:stage*0x10;
  if(r[0x5b5]===0){
    if(typeof updatePalette!=='function')throw new Error('Unrecovered dependency: palette transform D0D5');
    updatePalette(r);r[0x690]=0;r[0x6d9]=0x3f;
  }
  r[0x5b5]=(r[0x5b5]+1)&255;
  if(r[0x5b5]<r[0x5b3])return false;
  r[0x5b5]=0;r[0x5b6]=(r[0x5b6]+1)&255;
  if(r[0x5b6]<5)return false;
  r[0x5b6]=0;r[0x5b2]|=0x80;return true;
}
/** D062 semantic wait contract. nextFrame is a native host frame promise;
 * no CPU polling or ROM execution. The original waits one NMI even on the
 * final transition update, so check completion only AFTER the frame wait.
 */
export async function waitForPaletteFade(r,updatePalette,nextFrame){
  if(typeof nextFrame!=='function')throw new Error('Missing platform nextFrame');
  do {advancePaletteFade(r,updatePalette);await nextFrame();} while(!(r[0x5b2]&0x80));
}
export const MENU_SCREEN_IDS=Object.freeze([0xff,2,3,11,4,6,7,5,8,13,12,9,15,10,20,21]);
const OBJECT_CLEAR_BASES=Object.freeze([0x459,0x486,0x4a3,0x4b0,0x3e8,0x3f6,0x404,0x412,0x420,0x42e,0x301,0x314,0x327,0x33a,0x34d,0x360,0x373,0x386,0x399,0x44a,0x43c]);
/** 05:80DF-816D. Actual original screen id data, not guessed menu names.
 * loadScreen is the still-untranslated E828 layout loader; setRenderMask is
 * a platform display operation. Array clearing and fade start are recovered.
 */
export function initializeMenuScreen(r,platform){
  const sub=r[0x59];if(sub>=MENU_SCREEN_IDS.length)throw new RangeError('Initialize only uninitialized menu state');
  r[0x4f]=0x80;r.fill(0,0xec,0xf4);r[0x5e6]=0;r[0x5c9]=0;r[0x5ce]=0;r[0x56]=0xf0;
  const screen=MENU_SCREEN_IDS[sub];if(screen&0x80)return {screen:null,initialized:false};
  call(platform,'loadScreen',screen,r);
  r[0x4d]|=2;call(platform,'setRenderMask',r[0x4d]); // C062 -> EF54/EF5E
  beginPaletteFade(r,'in');
  for(let x=12;x>=0;x--){for(const base of OBJECT_CLEAR_BASES)r[base+x]=0;r[0x479+x]=255;}
  r[0x59]|=0x80;return {screen,initialized:true};
}
/** 05:8083-808A, the complete menu-family substate0 body. */
export function enterMenuFamily(r){r[0x59]=1;}
/** 05:817E-81D2: exact menu command priority, selected-controller handling. */
export function readMenuCommand(r){
  let command=0;const global=r[0x08],local=r[0x08+r[0x5cc]];
  if(global&0x30)command=(global&0x10)?1:2;
  else if(local&0x80)command=3;
  else if(local&0x40)command=4;
  else if(local&1)command=8;
  else if(local&2)command=7;
  else if(local&4)command=6;
  else if(local&8)command=5;
  r[0x5cd]=command;return command;
}
export function menuCommandClass(command){return command>=5?5:command;}
/** 05:81DD-8204, adjacency table supplied as semantic menu data. Negative
 * entries hang forever in the original at81FF; fail explicitly in JS.
 */
export function navigateMenuOption(r,controllerSlot,neighbors){
  const command=r[0x5cd];if(command<5)return r[0x5ca+(controllerSlot&1)];
  const address=0x5ca+(controllerSlot&1),old=r[address];
  const index=(((old<<2)&255)+(command-5)+((old>>6)&1))&255;
  const next=neighbors[index];
  if(next===undefined||next&0x80)throw new RangeError('Invalid menu adjacency; original would stall');
  r[address]=next;return next;
}
// Original bank05:85AA-85B5: directions Up,Down,Left,Right per row.
export const PRIMARY_MENU_NEIGHBORS=Object.freeze([2,1,0,0, 0,2,1,1, 1,0,2,2]);
/** 05:860C-8639 defaults and 8673-868E mode bits, names deliberately neutral. */
export function restorePrimaryMenuOption(r){
  const flags=r[0x57];let n;
  if(flags&0x80)n=0;else if(flags&0x40)n=1;else if(flags&0x20)n=2;else if(flags&0x10)n=3;else {r[0x57]=1;n=0;}
  r[0x5ca]=n;return n;
}
export function commitPrimaryMenuOption(r){
  const n=r[0x5ca];if(n>3)throw new RangeError('primary menu option');
  r[0x57]=(r[0x57]&15)|[0x80,0x40,0x20,0x10][n];r[0x5d]=[1,2,1,1][n];
}

export const PRIMARY_MENU_PHASE_DATA=Object.freeze([
  {positions:[7,6,7,11,7,14],neighbors:PRIMARY_MENU_NEIGHBORS},
  {positions:[7,6,7,11,7,14],neighbors:PRIMARY_MENU_NEIGHBORS},
  {positions:[17,6,20,6,17,11,20,11,23,11,17,14,20,14],neighbors:[0,0,1,1,1,1,0,0,2,2,2,2,2,2,2,2,2,2,2,2,5,5,6,6,6,6,5,5]},
  {positions:[7,26,14,26,20,26],neighbors:[0,0,2,1,1,1,0,2,2,2,1,0]},
  {positions:[15,7,16,7,17,7,19,7,20,7,21,7,23,7,24,7,25,7,26,7],neighbors:PRIMARY_MENU_NEIGHBORS},
].map(x=>Object.freeze({positions:Object.freeze(x.positions),neighbors:Object.freeze(x.neighbors)})));
function positionPair(r,x,positions){
  const index=(r[0x5ca+(x&1)]<<1)&255;
  if(index+1>=positions.length)throw new RangeError('Unrecovered menu position');
  return [positions[index],positions[index+1]];
}
/** 05:822A: logical tile coordinates -> two-byte object pixel coordinates. */
export function setMenuCursorPosition(r,x,positions){
  const [tx,rawTy]=positionPair(r,x,positions),ty=rawTy>=32?rawTy-2:rawTy;
  const px=tx*8+(r[0x5ce]&15),py=ty*8+7;
  r[0x314+x]=px&255;r[0x327+x]=px>>8;r[0x34d+x]=py&255;r[0x360+x]=py>>8;r[0x386+x]=0;r[0x399+x]=0;
}
/** 05:828D: hide on phase0 of four-frame blink; ASL's sign uses option bit6. */
export function setMenuCursorBlink(r,x,kind){
  r[0x74+x]=((r[0x5ca+(x&1)]&0x40)||(r[0x300]&3)===0)?0x7f:(kind|0x80);
}
/** 05:82B4/82F4: original one-tile queued nametable write, not immediate I/O. */
export function queueMenuSelectionTile(r,x,positions,tile){
  const [tx,ty]=positionPair(r,x,positions);
  const address=0x2000+(((ty&31)|(tx&32)|((ty&32)<<1))<<5)+(tx&31);
  const base=(x&1)?0x6b6:0x693;
  r[base]=address>>8;r[base+1]=address&255;r[base+2]=1;r[base+3]=tile;
}
export function restoreParticipantMenuOption(r){
  if(r[0x5d]===0)r[0x5d]=1;
  const flags=r[0x57];if(flags===0)throw new RangeError('Original participant restore would loop on zero mode');
  let group=0,value=flags;while(!(value&128)){group++;value=(value<<1)&255;}
  const index=group*4+r[0x5d]-1,map=[0,1,1,1,2,2,2,2,5,6,6,6,7,7,7,7];
  if(index>=map.length)throw new RangeError('Unrecovered participant selection');
  r[0x5ca]=map[index];
}
export function commitParticipantMenuOption(r){
  const v=[1,2,2,2,2,1,2,1][r[0x5ca]];
  if(v===undefined)throw new RangeError('participant option');r[0x5d]=v;
}
function updatePrimaryMenuActors(r,s){call(s,'updateMenuActors',r);call(s,'updateSpriteVisibility',r);}
/** 05:8355 initialization. Graphics services are still explicit dependencies. */
export function initializePrimaryMenu(r,s){
  r[0x5ca]=255;
  for(const p of [0x5cc,0x61,0x62,0x52a,0x52b,0x52c,0x52d,0x55c])r[p]=0;
  r[0x63]=5;for(const p of [0x6d,0x5ae,0x5af,0x459,0x465])r[p]=1;
  r[0x314]=0x80;r[0x320]=0x8c;r[0x34d]=0xa4;r[0x359]=0xa5;
  updatePrimaryMenuActors(r,s);
  r[0x5b8]=0x26;r[0x5b9]=0x27;r[0x5ba]=0x20;r[0x5bb]=9;
  call(s,'configureChrBanks',r);call(s,'requestSound',2);
  r.fill(0,0x46e,0x478);
}
/** Full original main2/substate1 control flow through option phases0..3.
 * Phase4 and confirmed launch are delegated to the separately recovered
 * password/league functions, not substituted with a fabricated game start.
 */
export async function stepPrimaryMenuScreen(r,s){
  if(!(r[0x59]&128)){initializeMenuScreen(r,s);initializePrimaryMenu(r,s);}
  const phase=r[0x5c9];const data=PRIMARY_MENU_PHASE_DATA[phase];
  if(!data)throw new RangeError('primary menu phase');
  if(phase===4){
    await call(s,'stepPasswordEditor',r,s);
    if(!(r[0x5ca]&128)){setMenuCursorPosition(r,2,data.positions);setMenuCursorBlink(r,2,(r[0x5c9]&4)?1:0);call(s,'submitMenuCursor',r,2);}
    updatePrimaryMenuActors(r,s);return;
  }
  if(phase===0){
    if(r[0x5b2]&128)r[0x5c9]=(phase+1)&255;
    advancePaletteFade(r,s.updatePalette);updatePrimaryMenuActors(r,s);return;
  }
  if(r[0x5ca]&128){
    if(phase===1){restorePrimaryMenuOption(r);commitPrimaryMenuOption(r);}
    else if(phase===2){restoreParticipantMenuOption(r);commitParticipantMenuOption(r);}
    else {r[0x5ca]=r[0x57]&3;r[0x57]=(r[0x57]&0xf8)|r[0x5ca];}
    queueMenuSelectionTile(r,2,data.positions,2);
  }
  const command=menuCommandClass(readMenuCommand(r));
  if(command===1 || (phase===3&&command===3)){
    call(s,'requestSound',0x33);beginPaletteFade(r,'out');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);
    await call(s,'startFromLeaguePassword',r);
  }else if(command===3){
    call(s,'requestSound',0x33);r[0x479]=0x11;queueMenuSelectionTile(r,2,data.positions,0xdc);r[0x5ca]=255;
    r[0x5c9]=(phase===2&&(r[0x57]&128))?4:phase+1;
  }else if(command===4){
    if(phase===2){queueMenuSelectionTile(r,2,data.positions,2);r[0x5ca]=255;r[0x5c9]=phase-1;}
    else if(phase===3){queueMenuSelectionTile(r,2,data.positions,0xdc);r[0x5c9]=phase-1;r[0x5ca]=255;}
    call(s,'requestSound',0x34);r[0x479]=0x11;
  }else if(command===5){
    call(s,'requestSound',0x32);navigateMenuOption(r,2,data.neighbors);
    if(phase===1)commitPrimaryMenuOption(r);
    else if(phase===2)commitParticipantMenuOption(r);
    else r[0x57]=(r[0x57]&0xf8)|r[0x5ca];
  }
  if(!(r[0x5ca]&128)){
    setMenuCursorPosition(r,2,data.positions);setMenuCursorBlink(r,2,(r[0x5c9]&4)?1:0);call(s,'submitMenuCursor',r,2);
  }
  updatePrimaryMenuActors(r,s);
}

/** C2A8 -> pair3:BED4. Main-loop CHR selection, NOT teammate AI. */
export function updateDynamicBallChr(r){
 if(r[0x58]!==0)return;
 if((r[0x5c]&64)&&((r[0x5c]&15)?(r[0x5c]&2):r[0x559])){r[0x5bb]=17;return;}
 let index=0;
 if((r[0x466]&127)!==1){
  const frame=r[0x80]&127,threshold=[0,6,7,25,44,56,69,255];index=1;
  while(frame>threshold[index])index++;
 }
 const page=[10,9,10,11,12,13,14,255][index];if(page<128)r[0x5bb]=page;
}
