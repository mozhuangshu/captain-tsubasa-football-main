import {installBackgroundHeadWarmup} from './head-warmup.js';
import {audioContext,connectAudio} from './audio.js';
import {installLeagueSave,leagueSaveLabel} from './league-save.js';
import {prepareSession} from './session.js';
import {installTeamSelectionTap} from '../engine/src/team-selection-view.js';
function showError(prefix,error){const b=document.querySelector('#error-banner');if(!b)return;b.hidden=false;b.textContent=prefix+(error&&error.message?error.message:String(error));}

/* game/index.html 的内联脚本（自由比赛），顺序与原页面一致 */
async function startMatch(){
 const [{installMatchCanvasScale}]=await Promise.all([import('../engine/src/platform/canvas-integer-scale.js')]);installMatchCanvasScale(document.querySelector('#game'));
 const [{RecoveredApp,installBrowserControls},{initializeTsubasaGame},{enableTsubasaMusic},{createTsubasaGraphics,installTsubasaPresentation,getTsubasaCoverage},{installTouchControls},{createOriginalWebAudioSink}]=await Promise.all([
  import('../engine/src/app-runtime.js'),import('../engine/src/tsubasa-bootstrap.js'),import('../engine/src/tsubasa-music.js'),import('../engine/src/tsubasa-runtime.js'),import('../engine/src/platform/touch-controls.js'),import('../engine/src/audio-driver.js')]);
 const audioSink=createOriginalWebAudioSink({volume:.18,contextFactory:audioContext});
 const status=document.querySelector('#status'),errorBanner=document.querySelector('#error-banner'),notice=document.querySelector('#notice'),settings=document.querySelector('#settings');
 const app=new RecoveredApp({boot:true,tsubasaSpecialMoves:true,audioSink,canvas:document.querySelector('#game'),onStatus:s=>{status.textContent=`原流程 ${s.main.toString(16)}:${s.sub.toString(16).padStart(2,'0')} · 选项阶段 ${s.phase}${s.localized?' · 中文显示':' · 原日文显示'}${s.message?'\n'+s.message:''}${s.missingDeps.length?'\n'+s.missingDeps.join('\n'):''}`;errorBanner.hidden=!s.blocked;if(s.blocked)errorBanner.textContent=`游戏流程已暂停。可在设置中重新启动。${s.message?' '+s.message:''}${s.missingDeps.length?' '+s.missingDeps.join('；'):''}`;}});
 window.recoveredApp=app;installBrowserControls(app);installTeamSelectionTap(app,document.querySelector('#game'));connectAudio(audioSink);
 const touch=installTouchControls(app,{root:document.querySelector('#touch-controls'),portSelect:document.querySelector('#touch-port')});
 settings.addEventListener('toggle',()=>{if(settings.hasAttribute('open'))touch.clear();});
 settings.addEventListener('keydown',e=>{if(settings.hasAttribute('open')||e.code==='Enter'||e.code==='Space')e.stopPropagation();});
 let chinese=null;
 initializeTsubasaGame();enableTsubasaMusic();
 const {installTsubasaHeads}=await import('../engine/src/tsubasa-heads.js');installTsubasaHeads();installBackgroundHeadWarmup(new URL('../engine/src/head-warm-worker.js',document.baseURI));
 const tsubasaGraphics=createTsubasaGraphics();app.setGraphics(tsubasaGraphics);installTsubasaPresentation(app);
 const {installLeagueStory}=await import('../engine/src/tsubasa-league-story.js');installLeagueStory(app,{loadImage:src=>{const image=new Image();image.decoding='async';image.src=new URL('../engine/'+src,document.baseURI).href;return image;}});
 window.tsubasaGame={graphics:tsubasaGraphics,getCoverage:getTsubasaCoverage,presentation:app.presentation};
 setInterval(()=>{const m=app.presentation.getMetrics();document.querySelector('#runtime-metrics').textContent=`游戏速度 ${m.gameSpeed}%（原生帧 ${m.nativeFps}/秒） · 实际绘制 ${m.drawnFps}/秒 · 重画调用 ${m.renderFps}/秒\n每次绘制 ${m.paintMs}ms · 最慢 ${m.paintMaxMs}ms（背景 ${m.backgroundMs} / 人物 ${m.spriteMs}，其中拼头 ${m.headMs}） · 原生等待 ${m.nativeWaitMs}ms\n累计 原生帧 ${m.nativeFrames} · 逻辑步 ${m.logicalSteps} · 重画 ${m.paintCalls}（跳过 ${m.skippedPaints??0}） · rAF ${m.rafHz}Hz / 间隔 ${m.rafIntervalMs}ms · 页面${document.visibilityState==='visible'?'可见':'隐藏'}`;},500);
 try{const m=await import('../engine/src/meeting-flow.js');if(m.stepMeetingScreen)app.setMeetingStep(m.stepMeetingScreen);}catch(error){console.info('会议流程依赖待接入',error.message);}
 try{const l=await import('../engine/src/localization-zh.js');chinese=l.chineseLocalization!=null?l.chineseLocalization:(l.createChineseLocalization?l.createChineseLocalization():l);app.setLocalization(chinese);}catch(error){console.info('中文词条与定位待接入',error.message);}
 let storage;try{storage=window.localStorage;}catch{}
 const resumeDialog=document.querySelector('#league-resume');
 const league=installLeagueSave(app,{storage,onChange:({save,error})=>{document.querySelector('#league-save-status').textContent=error||(save?'已自动保存：'+leagueSaveLabel(save):'联赛进度自动保存在此浏览器。');}});
 function launch(){const {save}=league.refresh();if(save){document.querySelector('#league-save-summary').textContent=leagueSaveLabel(save);resumeDialog.showModal();}else app.run();}
 resumeDialog.addEventListener('cancel',e=>e.preventDefault());
 document.querySelector('#league-continue').onclick=()=>{touch.clear();if(league.restore()){resumeDialog.close();app.run();}};
 document.querySelector('#league-new').onclick=()=>{if(!window.confirm('开始新联赛将替换此浏览器中的联赛进度，确定吗？'))return;league.clear();touch.clear();prepareSession(app,'solo');resumeDialog.close();app.run();};
 document.querySelector('#league-versus').onclick=()=>{touch.clear();prepareSession(app,'versus');resumeDialog.close();app.run();};
 let restarting=false;document.querySelector('#restart').addEventListener('click',async()=>{if(restarting)return;restarting=true;const button=document.querySelector('#restart');button.disabled=true;touch.clear();app.stop();try{while(app.busy)await new Promise(requestAnimationFrame);app.boot=true;app.reset();touch.clear();settings.removeAttribute('open');launch();}finally{button.disabled=false;restarting=false;}});
 let audioOn=true;document.querySelector('#audio').addEventListener('click',async()=>{const button=document.querySelector('#audio');button.disabled=true;try{if(!audioOn&&!await audioSink.unlock()){notice.textContent='浏览器暂时无法开启声音，请再次轻触尝试。';return;}audioOn=!audioOn;window.footballSoundOn=audioOn;audioSink.setMuted(!audioOn);button.textContent=audioOn?'关闭声音':'开启声音';notice.textContent='';}catch(error){notice.textContent=`声音未开启：${error.message}`;}finally{button.disabled=false;}});
 const exitButton=document.querySelector('#exit-fullscreen'),fullscreenButton=document.querySelector('#fullscreen');
 function fullscreenLabels(){const active=document.body.classList.contains('is-immersive');exitButton.hidden=!active;fullscreenButton.textContent=active?'退出全屏':'掌机全屏';}
 function toggleFullscreen(){touch.clear();if(document.body.classList.contains('is-immersive'))document.body.classList.remove('is-immersive');else{settings.removeAttribute('open');document.body.classList.add('is-immersive');}fullscreenLabels();}
 fullscreenButton.addEventListener('click',toggleFullscreen);exitButton.addEventListener('click',toggleFullscreen);
 document.dispatchEvent(new Event('football-ready'));launch();
}

startMatch().catch(e=>showError('游戏启动失败：',e));
