import {prepareSession} from './session.js';
import {leagueStateView,startFromLeaguePassword} from '../engine/src/league-flow.js';
import {encodeLeaguePassword} from '../engine/src/league.js';

export const LEAGUE_SAVE_KEY='tsubasa-web-league-v1';
const fields=['mode','stage','opponent','points','played','wins','losses','ending'];
const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
export function validLeagueSave(s){
 if(!s||s.version!==1||!['selector','qualification','bracket','ending'].includes(s.screen)||!Number.isSafeInteger(s.savedAt)||s.savedAt<=0)return false;
 if(!fields.every(k=>byte(s[k]))||![128,129,130].includes(s.mode)||s.ending>2||[4,8,12].includes(s.opponent&15))return false;
 if(!Array.isArray(s.records)||s.records.length!==12||!s.records.every(v=>byte(v)&&(v&28)===0))return false;
 if(!Array.isArray(s.bracket)||s.bracket.length!==10||!s.bracket.every(v=>byte(v)&&(v&112)===0))return false;
 let played=0,wins=0;for(const v of s.records){const count=v&3,mask=[0,128,192,224][count];if((v&224)&~mask)return false;played+=count;wins+=((v>>7)&1)+((v>>6)&1)+((v>>5)&1);}
 return s.played===played&&s.wins===wins&&s.losses<=played-wins&&(s.stage===255||s.stage<=3)&&((s.screen==='bracket'||s.screen==='ending')?s.stage<=3:s.stage===255);
}
export function readLeagueSave(storage){
 try{if(!storage)return {save:null,error:'浏览器未允许本地存档；本次游戏仍可正常进行。'};const raw=storage.getItem(LEAGUE_SAVE_KEY);if(!raw)return {save:null,error:''};const save=JSON.parse(raw);if(!validLeagueSave(save))throw Error();return {save,error:''};}
 catch{return {save:null,error:'本地存档无法读取，未删除原数据；可开始新联赛。'};}
}
function checkpoint(r){
 if((r[0x57]&240)!==128||r[0x5d]!==1)return null;
 const main=r[0x58],sub=r[0x59]&127;
 if(main===2&&sub===2)return 'selector';
 if(main===2&&(r[0x59]&128)&&sub===14)return 'qualification';
 if(main===2&&(r[0x59]&128)&&sub===15)return 'bracket';
 if(main===3)return 'ending';
 return null;
}
export function restoreLeagueSave(app,save){
 if(!validLeagueSave(save))return false;
 prepareSession(app,'solo');app.controllerSources.clear();app.controllers.fill(0);
 const r=app.r,state=leagueStateView(r);r[0x57]=save.mode;
 r.set(encodeLeaguePassword(save,0),0x46e);startFromLeaguePassword(r);
 for(const k of fields)state[k]=save[k];state.records.set(save.records);state.bracket.set(save.bracket);
 r[0x58]=save.screen==='ending'?3:2;
 // Qualification runs settlement on entry. Resume at selection instead: never count a result twice.
 r[0x59]=save.screen==='ending'?0:save.screen==='bracket'?15:2;
 // The saved bracket is already paired; native return-from-options avoids pairing it a second time.
 if(save.screen==='bracket')r[0x5b]=4;
 return true;
}
export function installLeagueSave(app,{storage,onChange=()=>{}}={}){
 let state=readLeagueSave(storage),lastRam=null,lastSignature='',failed=false,writable=!state.save,sessionRam=app.r;
 const previous=app.onStatus;
 function refresh(){state=readLeagueSave(storage);onChange(state);return state;}
 function capture(){
  if(app.blocked)return;const r=app.r;if(r!==sessionRam){sessionRam=r;writable=!state.save;}const screen=checkpoint(r);if(!screen)return;
  if(!writable){if(!failed){failed=true;onChange({...state,error:'已保留原联赛存档；请从继续联赛入口读档，或重新启动选择新联赛。'});}return;}
  const view=leagueStateView(r),save={version:1,screen,...Object.fromEntries(fields.map(k=>[k,view[k]])),records:[...view.records],bracket:[...view.bracket]};
  // Cursor, animation, RNG and the incomplete match are deliberately absent.
  const signature=JSON.stringify(save);if(r===lastRam&&signature===lastSignature)return;
  lastRam=r;lastSignature=signature;save.savedAt=Date.now();if(!validLeagueSave(save))return;
  try{if(!storage)throw Error();storage.setItem(LEAGUE_SAVE_KEY,JSON.stringify(save));state={save,error:''};failed=false;onChange(state);}
  catch{if(!failed){failed=true;state={...state,error:'进度未能保存到浏览器；请勿关闭页面，可使用游戏内密码保留胜场和积分。'};onChange(state);}}
 }
 app.onStatus=status=>{previous(status);capture();};
 return {refresh,get state(){return state;},restore(){const {save}=refresh();const restored=save?restoreLeagueSave(app,save):false;if(restored){sessionRam=app.r;writable=true;failed=false;}return restored;},clear(){try{if(!storage)throw Error();storage.removeItem(LEAGUE_SAVE_KEY);state={save:null,error:''};}catch{state={save:null,error:'浏览器未允许更新存档，本次新联赛可能无法保存。'};}lastRam=null;lastSignature='';writable=true;failed=false;onChange(state);}};
}
export const leagueSaveLabel=s=>s.screen==='ending'?'联赛已结束':`${s.played} 场 · ${s.wins} 胜 · ${s.losses} 负 · ${s.points} 积分${s.stage<128?' · 梦想杯':''}`;
