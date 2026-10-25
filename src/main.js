import {installBackgroundHeadWarmup} from './head-warmup.js';
import {audioContext,connectAudio} from './audio.js';
import {installTeamSelectionTap} from '../engine/src/team-selection-view.js';
import {RecoveredApp} from '../engine/src/app-runtime.js';
import {initializeTsubasaGame} from '../engine/src/tsubasa-bootstrap.js';
import {enableTsubasaMusic} from '../engine/src/tsubasa-music.js';
import {installTsubasaHeads} from '../engine/src/tsubasa-heads.js';
import {createTsubasaGraphics,installTsubasaPresentation} from '../engine/src/tsubasa-runtime.js';
import {installLeagueStory} from '../engine/src/tsubasa-league-story.js';
import {chineseLocalization} from '../engine/src/localization-zh.js';
import {createOriginalWebAudioSink} from '../engine/src/audio-driver.js';
import {ACTIONS,LABELS,STORAGE_KEY,loadSettings,keyLabel,createControls} from './controls.js';
import {installDisplay} from './display.js';
import {prepareSession} from './session.js';
import {installLeagueSave,leagueSaveLabel} from './league-save.js';

const $=s=>document.querySelector(s),canvas=$('#game'),dialog=$('#settings');
const notice=message=>{$('#notice').textContent=message;};
let storage;try{storage=window.localStorage;}catch{storage=null;}
let session=false,paused=true,loop=Promise.resolve(),audioOn=true,transition=false;
const audio=createOriginalWebAudioSink({volume:.18,contextFactory:audioContext});audio.setMuted(true);
initializeTsubasaGame();enableTsubasaMusic();installTsubasaHeads();installBackgroundHeadWarmup(new URL('./engine/src/head-warm-worker.js',document.baseURI));
const app=new RecoveredApp({canvas,tsubasaSpecialMoves:true,audioSink:audio,graphics:createTsubasaGraphics(),localization:chineseLocalization,onStatus:s=>{
 if(s.blocked){$('#error').hidden=false;$('#error').textContent=`游戏已停止：${s.missingDeps.join('；')}。可返回大厅重新开始。`;}
}});
installTeamSelectionTap(app,canvas);connectAudio(audio);
installTsubasaPresentation(app);installLeagueStory(app,{loadImage:src=>{const image=new Image();image.decoding='async';image.src=new URL('./engine/'+src,document.baseURI).href;return image;}});
const controls=createControls(app,{settings:loadSettings(storage),onChange:refresh,onMessage:message=>{$('#mapping-message').textContent=message;}});
const league=installLeagueSave(app,{storage,onChange:({save,error})=>{
 $('#league-continue').hidden=!save;$('#league-continue').textContent=save?.screen==='ending'?'查看联赛结果':'继续联赛';
 $('#league-save-status').textContent=error||(save?`已自动保存：${leagueSaveLabel(save)}。存档仅保存在此浏览器。`:'联赛进度自动保存在此浏览器；不保存未完成的比赛。');
}});league.refresh();
const display=installDisplay(canvas,$('#screen-slot'),()=>controls.settings.display);
function save(){try{storage?.setItem(STORAGE_KEY,JSON.stringify(controls.settings));if(!storage)throw Error();}catch{notice('浏览器未允许保存设置；本次会话内仍然有效。');}}
function refresh(){
 save();$('#display').value=controls.settings.display;$('#deadzone').value=Math.round(controls.settings.deadzone*100);$('#deadzone-value').value=`${Math.round(controls.settings.deadzone*100)}%`;
 for(let p=0;p<2;p++){
  const keys=controls.settings.keys[p],pad=controls.pads.find(pad=>pad.index===controls.assignments[p]);
  $(`#device-${p}`).textContent=pad?`手柄 ${pad.index+1} · ${pad.id}`:'键盘已就绪';
  $(`#keys-${p}`).replaceChildren();
  for(const actions of [['Up','Down','Left','Right'],['A','B','Jump','Start']]){const row=document.createElement('div');for(const a of actions){const k=document.createElement('kbd');k.textContent=keyLabel(keys[a]);k.title=LABELS[a];row.append(k,' ');}$(`#keys-${p}`).append(row);}
 }
 const focus=document.activeElement?.dataset?.binding;
 $('#bindings').replaceChildren();
 for(let p=0;p<2;p++){
  const section=document.createElement('section');section.className='binding-player';const h=document.createElement('h3');h.textContent=`${p+1}P / ${p===0?'主场':'客场'}`;section.append(h);
  const label=document.createElement('label');label.append('手柄');const select=document.createElement('select');select.setAttribute('aria-label',`${p+1}P 手柄`);
  select.add(new Option('仅键盘',''));for(const pad of controls.pads)select.add(new Option(`${pad.index+1}: ${pad.id}${pad.mapping==='standard'?'':'（需核对映射）'}`,String(pad.index)));
  select.value=controls.assignments[p]===null?'':String(controls.assignments[p]);select.onchange=()=>controls.assign(p,select.value===''?null:Number(select.value));label.append(select);section.append(label);
  for(const a of ACTIONS){const row=document.createElement('div');row.className='binding-row';const name=document.createElement('span');name.textContent=LABELS[a];row.append(name);
   for(const type of ['keys','buttons']){const b=document.createElement('button');b.dataset.binding=`${p}-${a}-${type}`;const waiting=controls.capture?.player===p&&controls.capture.action===a&&controls.capture.type===type;
    b.textContent=waiting?'等待输入…':type==='keys'?keyLabel(controls.settings.keys[p][a]):`按钮 ${controls.settings.buttons[p][a]+1}`;
    b.classList.toggle('waiting',waiting);b.setAttribute('aria-label',`${p+1}P ${LABELS[a]} ${type==='keys'?'键盘':'手柄'} ${b.textContent}`);b.disabled=type==='buttons'&&controls.assignments[p]===null;b.onclick=()=>controls.remap(type,p,a);row.append(b);
   }section.append(row);
  }$('#bindings').append(section);
 }
 if(focus)document.querySelector(`[data-binding="${focus}"]`)?.focus();
 display.resize();
}
async function stop(){controls.setEnabled(false);app.stop();audio.setMuted(true);await loop;}
function run(){
 if(!session||document.hidden||dialog.open)return;paused=false;$('#paused').hidden=true;$('#pause').textContent='暂停';$('#session-status').textContent='比赛进行中';controls.setEnabled(true);audio.setMuted(!audioOn);canvas.focus({preventScroll:true});loop=app.run();
}
function pause(){if(!session||paused)return;paused=true;controls.setEnabled(false);app.stop();audio.setMuted(true);$('#paused').hidden=false;$('#pause').textContent='继续';$('#session-status').textContent='已暂停';}
async function resume(){if(transition)return;transition=true;await loop;run();transition=false;}
async function startSession(mode,continuing=false){
 if(transition)return;
 if(mode==='solo'&&!continuing&&league.refresh().save&&!window.confirm('开始新联赛将替换此浏览器中的联赛进度，确定吗？'))return;
 transition=true;await stop();
 if(continuing){if(!league.restore()){transition=false;return;}}
 else{if(mode==='solo')league.clear();prepareSession(app,mode);}
 session=true;paused=true;
 $('#welcome').hidden=true;$('#error').hidden=true;$('#pause').disabled=false;$('#home').disabled=false;
 $('#mode-label').textContent=mode==='versus'?'双人对战 / LOCAL VERSUS':'单人联赛 / LEAGUE';
 $('#game-hint').textContent=mode==='versus'?'1P 按开始进入选队；双方独立选择 13 支球队，也可点画面选队和确认。':'1P 按开始进入联赛，自由选择 12 支对手；方向键选择，A 确定。';
 run();transition=false;
}
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>startSession(button.dataset.mode);
$('#league-continue').onclick=()=>startSession('solo',true);
$('#pause').onclick=()=>paused?resume():pause();$('#resume').onclick=resume;
$('#home').onclick=async()=>{if(transition)return;transition=true;await stop();session=false;paused=true;$('#welcome').hidden=false;$('#paused').hidden=true;$('#pause').disabled=true;$('#home').disabled=true;$('#mode-label').textContent='准备开球';$('#session-status').textContent='本地游戏';$('#error').hidden=true;$('#game-hint').textContent='双人模式中，两位玩家分别选择自己的球队。';$('#welcome button').focus({preventScroll:true});$('#arena').scrollTop=0;window.scrollTo(0,0);transition=false;};
$('#settings-open').onclick=()=>{pause();controls.setEnabled(false);dialog.showModal();};
function closeSettings(){controls.cancel();dialog.close();if(session)$('#resume').focus();}
$('#settings-close').onclick=closeSettings;$('#settings-done').onclick=closeSettings;
dialog.addEventListener('cancel',e=>{if(controls.capture){e.preventDefault();controls.cancel();}});
dialog.addEventListener('close',()=>controls.cancel());
$('#reset-settings').onclick=()=>{controls.reset();notice('已恢复默认键位与画面设置。');};
$('#display').onchange=e=>{controls.settings.display=e.target.value;save();display.resize();if(session&&!paused)canvas.focus({preventScroll:true});};
$('#deadzone').oninput=e=>{controls.settings.deadzone=Number(e.target.value)/100;$('#deadzone-value').value=`${e.target.value}%`;save();};
$('#sound').onclick=async()=>{try{if(!audioOn&&!await audio.unlock()){notice('请再次点击开启声音。');return;}audioOn=!audioOn;window.footballSoundOn=audioOn;audio.setMuted(!audioOn||paused);$('#sound').textContent=audioOn?'关闭声音':'开启声音';}catch{notice('此浏览器暂时无法开启声音。');}finally{if(session&&!paused)canvas.focus({preventScroll:true});}};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('#arena').requestFullscreen)await $('#arena').requestFullscreen();else notice('此浏览器不支持全屏，请使用浏览器的全屏功能。');}catch{notice('未能切换全屏，请使用浏览器的全屏功能。');}finally{if(session&&!paused)canvas.focus({preventScroll:true});}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';display.resize();});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!dialog.open&&session){e.preventDefault();paused?resume():pause();}});
let nextStatus=0;
function devices(now){if(now>=nextStatus){controls.poll();nextStatus=now+(controls.capture?16:250);}requestAnimationFrame(devices);}
refresh();requestAnimationFrame(devices);
// Read-only diagnostics are opt-in and do not change game initialization.
if(new URLSearchParams(location.search).has('debug'))window.webGame={app,controls,display};
