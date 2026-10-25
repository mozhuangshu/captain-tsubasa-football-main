import {drawTeamSelection} from './team-selection-view.js';
import {clearTsubasaDefensiveState} from './tsubasa-defensive-moves.js';
import {enableTsubasaSpecialMoves,resetTsubasaSpecialMoves,syncTsubasaSpecialMoves,pinTsubasaSpecialDisplayEntries,applyTsubasaRazorKeeperFrame,applyTsubasaSkylabFootVolleyFrame,applyTsubasaCpuSkylabSprintFrame,gateTsubasaCpuSkylabTakeoff} from './tsubasa-special-moves.js';
import {applyTsubasaTriangleFrame} from './tsubasa-triangle-shot.js';
import {applyTsubasaMorisakiSaveFrame} from './tsubasa-morisaki-save.js';
import {isUniformBlackPresentation} from './platform/black-presentation.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
import {createNativeFrameWait} from './platform/native-frame-clock.js';
import {elideEndingBlackFrame} from './platform/ending-black-frame.js';
import {drawOriginalScrolledScreen} from './scoreboard-view.js';
import {stepBootState} from './boot-flow.js';
import {stepEndingState} from './ending-flow.js';
import {prepareScoreActors,prepareVictoryActors,updateVictoryActors} from './scoreboard-actors.js';
import {updateScoreActors_BE42,updateEndingActors_BB3C} from './result-actor-flow.js';
import {loadScoreboardGraphicsBegin_B8A1,finishScoreboardGraphics_B8D2,updateScoreboardGraphics_B0B9} from './scoreboard-graphics.js';
import {stepTeamSelection,stepRosterMenu,prepareVersusPrematchOptions} from './roster-menus.js';
import {rosterMenuGraphics} from './roster-menu-graphics.js';
import {stepFieldOptions,stepWeatherInformation,stepStandingsMenu,stepPlayerProfile,stepMusicMenu} from './extra-menus.js';
import {createOriginalAudioDriver} from './audio-driver.js';
import {updateWeatherSprites} from './match-weather-sprites.js';
import {updateSecondWeatherEvent,updateWeatherActors,applyMatchWind} from './match-weather.js';
import {updateOriginalMatchAI} from './match-ai-runtime.js';
import {commitCommandHud_D61A,commitFieldFirstTick,commitFieldHud_F350} from './field-events.js';
import {initializeMatchRoster_Bank00_BB13} from './match-initialize.js';
import {updateAllMatchActors} from './match-actors.js';
import {updateMatchDecorations_Bank06_BECC,updateStatusBanner_F3A5,pausedInputSequence_CB5F,updateCamera_Bank03_BCF1,updateFrameTail_Bank03_BF23,prepareRestart_Bank01_BE88} from './match-frame-helpers.js';
import {commitFieldScroll_F0CE,drawFieldScreen,createFieldRenderServices} from './field-render.js';
import {stepMatchState} from './match-state-flow.js';
import {configureRosterMemory} from './platform/state-views.js';
import {stepMeetingScreen,meetingTileServices} from './meeting-flow.js';
import {stepDialogue} from './dialogue.js';
/** Native browser host for recovered original boot, menu, match and ending flows.
 * Hardware phase/pixel and remaining data-alias boundaries are documented. No CPU/PPU execution, ROM input or old Match code.
 */
import {stepPrematchIntro,stepPrematchOptions} from './prematch-flow.js';
import {BUTTONS,inputEdges} from './input-sprites.js';
import {advanceRandom} from './mood-league.js';
import {resolveState,enterMenuFamily,stepPrimaryMenuScreen,updateDynamicBallChr} from './state-dispatch.js';
import {createScreenLayout,loadOriginalScreen,drawOriginalScreen,applyMenuTileRun} from './screen-loader.js';
import {updatePaletteForFade} from './sprite-palette-buffer.js';
import {stepLeagueScreen,stepPasswordEditor,startFromLeaguePassword,prepareMatchEnvironment,leagueStateView,leagueTileServices} from './league-flow.js';
export {BUTTONS};
export class RecoveredApp {
  constructor({canvas=null,onStatus=()=>{},nextFrame=null,graphics=null,localization=null,audioSink=null,boot=false,tsubasaSpecialMoves=false}={}){
    this.tsubasaSpecialMoves=!!tsubasaSpecialMoves;this.boot=boot;this.audioSink=audioSink;this.canvas=canvas;this.ctx=canvas?.getContext('2d')??null;this.onStatus=onStatus;
    this.framePromise=nextFrame??createNativeFrameWait();
    this.matchServices={commitFieldScrollNow:r=>commitFieldScroll_F0CE(r,this.layout),prepareScoreActors_Bank02_B429:prepareScoreActors,prepareVictoryActors_Bank02_B53D:prepareVictoryActors,updateScoreActors_Bank06_BE42:r=>this.consumeEvents(updateScoreActors_BE42(r)),updateVictoryActors_Bank02_B6CE:r=>this.consumeEvents(updateVictoryActors(r)),updateEndingActors_Bank02_BB3C:r=>this.consumeEvents(updateEndingActors_BB3C(r)),loadScoreScreen_Bank01_B8A1:async r=>{loadScoreboardGraphicsBegin_B8A1(r,this.layout,{loadScreen:(id,rr,l)=>{this.requestSound(0);return loadOriginalScreen(id,rr,l);}});this.palette=null;await this.waitRenderingDisabled_ECA9();finishScoreboardGraphics_B8D2(r,this.layout);},updateSecondEvent_Bank03_BAF9:r=>this.consumeEvents(updateSecondWeatherEvent(r)),updateWeatherActors_Bank01_B9C0:r=>this.consumeEvents(updateWeatherActors(r)),applyWind_Bank04_800F:applyMatchWind,prepareRestart_Bank01_BE88,updateDecisionPipeline_Bank03_8015:r=>{const out=updateOriginalMatchAI(r);if(this.tsubasaSpecialMoves)gateTsubasaCpuSkylabTakeoff(r);this.consumeEvents(out);return out;},updateFrameTail_Bank03_BF23:r=>{updateFrameTail_Bank03_BF23(r);applyTsubasaRazorKeeperFrame(r);applyTsubasaCpuSkylabSprintFrame(r);applyTsubasaSkylabFootVolleyFrame(r);applyTsubasaTriangleFrame(r);applyTsubasaMorisakiSaveFrame(r);pinTsubasaSpecialDisplayEntries(r);},updateCamera_Bank03_BCF1,pausedInputSequence_CB5F:r=>pausedInputSequence_CB5F(r,{requestSound:id=>this.requestSound(id)}),updateStatusBanner_F3A5,initializeMatchRoster_Bank00_BB13,updateAllMatchActors_Bank06_BD6A:r=>{const out=updateAllMatchActors(r);this.consumeEvents(out);return out;},updateMatchDecorations_Bank06_BECC};this.graphics=graphics;this.localization=localization;this.meetingStep=stepMeetingScreen;
    this.running=false;this.runId=0;this.busy=false;this.missingDeps=[];this.audioEvents=[];this.controllerSources=new Map();this.controllers=[0,0,0,0];this.previous=[0,0,0,0];
    this.reset();
  }
  reset(){
    this.stateGeneration=(this.stateGeneration??0)+1;
    this.framePromise.reset?.();if(this.r){resetTsubasaSpecialMoves(this.r);clearTsubasaDefensiveState(this.r);}this.r=new Uint8Array(2048);if(this.tsubasaSpecialMoves)enableTsubasaSpecialMoves(this.r,{nativeArt:false});this.audio=createOriginalAudioDriver({sink:this.audioSink,ram:this.r});this.r[0x58]=this.boot?1:2;this.r[0x59]=0;if(this.boot){this.r[0x56]=240;this.r[0x5e6]=1;this.r[0x4f]=192;}
    // Deterministic cold-state seed: reset FE04 ORs25 into both seed bytes.
    this.r[0x45]=0x25;this.r[0x46]=0x25;this.r[0x4c]=0x8c;this.r[0x4d]=0x18;
    this.r[0x693]=255;this.r[0x6b6]=255;this.r[0x6d9]=255;
    this.presentationElided=false;this.layout=createScreenLayout();this.palette=null;this.previous.fill(0);this.missingDeps=[];this.blocked=false;this.lastError=null;this.audioEvents=[];
    this.report('原开机、菜单与比赛流程语义转换；部分数据边界与画面投影仍在验证，声音音色尚未完全复原');
  }
  setTsubasaSpecialMoves(enabled=true){this.tsubasaSpecialMoves=!!enabled;enableTsubasaSpecialMoves(this.r,{enabled:this.tsubasaSpecialMoves,nativeArt:false});if(!enabled)clearTsubasaDefensiveState(this.r,'disabled');return this.tsubasaSpecialMoves;}
  requestSound(id){if(!Number.isInteger(id)||id<0||id>255)throw new RangeError('Original sound event must contain a byte id');this.audioEvents.push({id,frame:this.r[0x300]});if(this.audioEvents.length>128)this.audioEvents.shift();this.audio?.requestSound(id,{demoFlags:this.r[0x58b]});this.audio?.syncRAM(this.r);}
  consumeEvents(out){for(const e of (Array.isArray(out)?out:out?.events??[]))if(e.type==='sound')this.requestSound(e.soundId??e.value);return out;}
  setGraphics(graphics){this.graphics=graphics;}
  setLocalization(localization){this.localization=localization;this.paint();}
  setMeetingStep(step){this.meetingStep=step;}
  setController(port,value){this.setControllerSource('manual',port,value);}
  setControllerSource(source,port,value){if(port<0||port>3||!Number.isInteger(port))throw new RangeError('controller');if(!this.controllerSources.has(source))this.controllerSources.set(source,[0,0,0,0]);this.controllerSources.get(source)[port]=value&255;this.controllers[port]=0;for(const values of this.controllerSources.values())this.controllers[port]|=values[port];}
  report(message=''){
    this.onStatus({message,main:this.r[0x58],sub:this.r[0x59],phase:this.r[0x5c9],screenId:this.layout.descriptor,missingDeps:[...this.missingDeps],blocked:this.blocked,localized:!!this.localization,scope:'recovered-original-flow'});
  }
  requireGraphics(name,...args){
    const f=this.graphics?.[name];if(typeof f!=='function')throw new Error(`MissingTranslation: menu graphics ${name}`);
    return f(...args);
  }
  commitTiles(){
    const r=this.r;
    for(const [base,increment] of [[0x693,0x690],[0x6b6,0x691]]){
      const high=r[base],count=r[base+2];if(high&128)continue;
      if(count===0||count>32)throw new RangeError('Unsupported original graphics queue count');
      r[0x4c]=(r[0x4c]&251)|r[increment];const vertical=!!(r[increment]&4);r[increment]=0;
      applyMenuTileRun(this.layout,(high<<8)|r[base+1],r.slice(base+3,base+3+count),{vertical});r[base]=255;
    }
    if(!(r[0x6d9]&128)){
      const count=r[0x6db],address=r[0x6d9]*256+r[0x6da];if(count===0||count>32)throw new RangeError('Unsupported original third graphics queue count');
      const vertical=!!(r[0x692]&4);r[0x4c]=(r[0x4c]&251)|r[0x692];r[0x692]=0;
      if(address>=0x2000&&address<0x3000)applyMenuTileRun(this.layout,address,r.slice(0x6dc,0x6dc+count),{vertical});
      else if(address>=0x3f00&&address<0x4000){const p=this.palette??this.layout.palette.slice();for(let i=0;i<count;i++){let at=(address+i)&31;if(at===16||at===20||at===24||at===28)at-=16;if(at<16)p[at]=r[0x6dc+i];}this.palette=p;}
      else throw new RangeError('Unrecovered third graphics queue address');r[0x6d9]=255;
    }
  }
  paint(){
    if(this.layout.descriptor!==null)this.layout.chrPages=[this.r[0x5bc]&254,(this.r[0x5bc]&254)+1,this.r[0x5bd]&254,(this.r[0x5bd]&254)+1];if(!this.ctx||this.layout.descriptor===null)return;
    if(isUniformBlackPresentation(this.r,this.palette??this.layout.palette)){this.ctx.fillStyle=DISPLAY_NES_RGB[15];this.ctx.fillRect(0,0,256,240);return;}
    if(this.presentationElided){this.ctx.fillStyle='#000';this.ctx.fillRect(0,0,256,240);return;}
    if(drawTeamSelection(this.ctx,this.r))return;
    if(this.layout.kind==='field')drawFieldScreen(this.ctx,this.graphics?.presentationCamera?.(this.r)??this.r,this.layout,{palette:this.palette??this.layout.palette});else drawOriginalScrolledScreen(this.ctx,this.r,this.layout,{palette:this.palette??this.layout.palette});
    if(this.localization?.drawOverlay)this.localization.drawOverlay(this.ctx,{screenId:this.layout.descriptor,ram:this.r,layout:this.layout,palette:this.palette??this.layout.palette});
    if(this.graphics?.draw)this.graphics.draw(this.ctx,this.r,{layout:this.layout,palette:this.palette});
  }
  services(){
    const graphics=name=>(...args)=>this.requireGraphics(name,...args);
    return {
      rosterMenuGraphics,prepareVersusPrematchOptions:r=>prepareVersusPrematchOptions(r,this.services()),
      loadScreen:(id,r)=>{this.requestSound(0);loadOriginalScreen(id,r,this.layout);this.palette=null;},
      applyTilePatches:patches=>{for(const p of patches)applyMenuTileRun(this.layout,p.address,p.bytes,{vertical:p.stride===32});},
      setRenderMask:mask=>{this.renderMask=mask;},
      requestSound:id=>this.requestSound(id),
      updatePalette:r=>{updatePaletteForFade(r);this.palette=r.slice(0x6dc,0x6ec);},
      nextFrame:async()=>{this.paint();await this.nextNativeFrame();},
      waitRenderingDisabled_ECA9:()=>this.waitRenderingDisabled_ECA9(),
      updateMenuActors:(...args)=>this.consumeEvents(graphics('updateMenuActors')(...args)),updateSpriteVisibility:graphics('updateSpriteVisibility'),
      submitMenuCursor:graphics('submitMenuCursor'),configureChrBanks:graphics('configureChrBanks'),
      commitGraphicsBanks:graphics('configureChrBanks'),drawMenuObject:graphics('submitMenuCursor'),flushMenuSprites:graphics('flushMenuSprites'),
      prepareFieldState:r=>{prepareMatchEnvironment(r);configureRosterMemory(r);},
      stepPasswordEditor,startFromLeaguePassword,
      ...leagueTileServices(this.layout,applyMenuTileRun),
      ...meetingTileServices(this.layout,applyMenuTileRun),
      ...createFieldRenderServices(this.layout),...this.matchServices,
      stepDialogue:r=>stepDialogue(r,{drawTiles:(address,tiles)=>applyMenuTileRun(this.layout,address,tiles),sound:id=>this.requestSound(id)}),
    };
  }
  async step(){
    if(this.busy||this.blocked)return false;this.busy=true;
    try{
      const r=this.r;syncTsubasaSpecialMoves(r);if(r[0x58]!==0||(r[0x59]&127)!==2||(r[0x5c]&128))clearTsubasaDefensiveState(r,'inactive');r[0x51]=0;updateDynamicBallChr(r);
      const sample=()=>{this.pollControllers?.();const input=inputEdges(this.previous,this.controllers);r.set(input.held,4);r.set(input.pressed,8);this.previous=[...input.held];};
      if(r[0x0a]&32){do{await this.nextNativeFrame();sample();}while(!(r[0x0a]&32));r[0x51]=0;}
      /* league story layer (tsubasa-league-story.js, only on the playable page): while its dialogue is up the
       * original state does not advance this step; the pad drives the dialogue instead. Absent = original path. */
      if(this.storyLayer?.intercept(r,sample)){this.paint();this.report();return true;}
      r[0x5a]=r[0x59];r[0x300]=(r[0x300]+1)&255;
      this.presentationElided=elideEndingBlackFrame(r,this.audio);
      if(!this.presentationElided)this.graphics?.beginFrame?.(r); // C28A: assemble PREVIOUS frame's display list
      advanceRandom(leagueStateView(r));sample();
      const state=resolveState(r[0x58],r[0x59]);
      const s=this.services();
      if(state.index===0){await stepMatchState(r,s);this.paint();this.report();return true;}
      if(state.index===1){await stepBootState(r,s);this.paint();this.report();return true;}
      if(state.index===3){await stepEndingState(r,s);this.paint();this.report();return true;}
      if(state.index!==2)throw new Error(`MissingTranslation: main state ${state.index}, substate ${state.substate}`);
      if(state.substate===0)enterMenuFamily(r);
      else if(state.substate===1)await stepPrimaryMenuScreen(r,s);
      else if(state.substate===3)await stepPrematchIntro(r,s);
      else if(state.substate===4)await stepPrematchOptions(r,s);
      else if(state.substate===5)await stepTeamSelection(r,s);
      else if(state.substate===6)await stepFieldOptions(r,s);
      else if(state.substate===7)await stepRosterMenu(r,s);
      else if(state.substate===8)await stepWeatherInformation(r,s);
      else if(state.substate===9)await stepStandingsMenu(r,s);
      else if(state.substate===10)await stepPlayerProfile(r,s);
      else if(state.substate===11)await stepMusicMenu(r,s);
      else if([2,14,15].includes(state.substate))await stepLeagueScreen(r,s);
      else if([12,13].includes(state.substate)&&this.meetingStep)await this.meetingStep(r,s);
      else throw new Error(`MissingTranslation: original menu ${state.substate.toString(16).padStart(2,'0').toUpperCase()} at ${state.substateEntry.toString(16).toUpperCase()}; no substitute gameplay`);
      this.paint();this.report();return true;
    }catch(error){
      this.lastError=error;this.blocked=true;this.missingDeps=[error.message];this.running=false;
      try{this.paint();}catch(renderError){this.missingDeps.push(renderError.message);}
      this.report('到达尚未转换的原流程，已停止；未调用重写比赛逻辑');return false;
    }finally{if(this.r[0x58]!==0||(this.r[0x59]&127)!==2||(this.r[0x5c]&128))clearTsubasaDefensiveState(this.r,'inactive');this.busy=false;}
  }
  /** ECA9→FBCB is a render-disable barrier, not an ordinary NMI tick.
   * It neither commits queues/CHR nor ticks audio, weather, or frame counter51.
   */
  async waitRenderingDisabled_ECA9(){
    const r=this.r,generation=this.stateGeneration,saved=r[0x4f];r[0x4f]=0;r[0x4c]|=128;
    try{await this.framePromise();r[0x4c]&=127;}finally{r[0x4f]=saved;}
    if(generation===this.stateGeneration)this.paint();
  }
  async nextNativeFrame(){
    const r=this.r,generation=this.stateGeneration,runId=this.runId;
    await this.framePromise();
    if(generation!==this.stateGeneration||runId!==this.runId)return false;
    if(r[0x58]===0&&[1,2,3,4,6].includes(r[0x59])&&this.layout.kind==='field'){
      if(r[0x51]===0)commitFieldFirstTick(r,this.layout,commitFieldScroll_F0CE);
      else if(r[0x51]===1)commitCommandHud_D61A(r,this.layout);
      else if((r[0x693]&r[0x6b6]&r[0x6d9])===255)commitFieldHud_F350(r,this.layout);else this.commitTiles();
    }else if(r[0x58]===0&&[5,8,10].includes(r[0x59])&&r[0x5e8])updateScoreboardGraphics_B0B9(r,this.layout);else this.commitTiles();
    if(this.layout.kind==='field')updateWeatherSprites(r);this.audio.tick();this.audio.syncRAM(r);
    r[0x51]=(r[0x51]+1)&255;this.paint();
  }
  async run(){if(this.running)return;this.running=true;const id=++this.runId;try{while(this.running&&id===this.runId&&!this.blocked){await this.step();if(!this.running||this.blocked||id!==this.runId)break;do{await this.nextNativeFrame();}while(this.r[0x51]<this.r[0x5e6]&&this.running&&id===this.runId);}}catch(error){if(id!==this.runId)return;this.lastError=error;this.blocked=true;this.running=false;this.missingDeps=[error.message];this.report('原流程尚有未恢复依赖或验证错误，已停止');}}
  stop(){this.running=false;this.runId++;}
}
export const BROWSER_CONTROLLER_KEYS=Object.freeze([
 {ArrowUp:BUTTONS.Up,ArrowDown:BUTTONS.Down,ArrowLeft:BUTTONS.Left,ArrowRight:BUTTONS.Right,KeyZ:BUTTONS.A,KeyX:BUTTONS.B,Enter:BUTTONS.Start,ShiftRight:BUTTONS.Select,ShiftLeft:BUTTONS.Select},
 {KeyW:BUTTONS.Up,KeyS:BUTTONS.Down,KeyA:BUTTONS.Left,KeyD:BUTTONS.Right,KeyG:BUTTONS.A,KeyH:BUTTONS.B,KeyT:BUTTONS.Start,KeyY:BUTTONS.Select},
 {KeyI:BUTTONS.Up,KeyK:BUTTONS.Down,KeyJ:BUTTONS.Left,KeyL:BUTTONS.Right,KeyN:BUTTONS.A,KeyM:BUTTONS.B,KeyO:BUTTONS.Start,KeyP:BUTTONS.Select},
 {Numpad8:BUTTONS.Up,Numpad2:BUTTONS.Down,Numpad4:BUTTONS.Left,Numpad6:BUTTONS.Right,Numpad0:BUTTONS.A,NumpadDecimal:BUTTONS.B,NumpadEnter:BUTTONS.Start,NumpadAdd:BUTTONS.Select}
]);
/** Browser keys are an input adapter only; all four ports retain original bits. */
export function installBrowserControls(app,target=window){
 const held=new Set(),portOf=code=>BROWSER_CONTROLLER_KEYS.findIndex(keys=>keys[code]!==undefined);
 const update=port=>{let value=0;for(const code of held)value|=BROWSER_CONTROLLER_KEYS[port][code]??0;if(app.setControllerSource)app.setControllerSource('keyboard',port,value);else app.setController(port,value);};
 const down=e=>{const port=portOf(e.code);if(port>=0){e.preventDefault();held.add(e.code);update(port);}},up=e=>{const port=portOf(e.code);if(port>=0){held.delete(e.code);update(port);}},blur=()=>{held.clear();for(let port=0;port<4;port++)update(port);};
 target.addEventListener('keydown',down);target.addEventListener('keyup',up);target.addEventListener('blur',blur);
 return ()=>{target.removeEventListener('keydown',down);target.removeEventListener('keyup',up);target.removeEventListener('blur',blur);};
}
