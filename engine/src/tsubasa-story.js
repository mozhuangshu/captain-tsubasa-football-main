import {storyOutroLinesFor,STORY_OUTRO_ANIME_OUTCOME} from './tsubasa-story-outro-variants.js';
/** Story mode skeleton (Must S-4, D-47). 中学篇 chapter flow, save, unlock,
 * retry and skippable text. Pure logic: no DOM; storage is injected
 * (localStorage-compatible getItem/setItem/removeItem).
 * Text: S-1 chapter names only. Dialogue slots (intro/outro) stay empty until
 * S-3 lines are written; S-5 art is pending, so screens are text-only. */
import {STORY_LINES} from './tsubasa-story-lines.js';
import {storyLineExpression} from './tsubasa-story-expressions.js';
export const STORY_SAVE_KEY='tsubasa-story-save';
export const STORY_SAVE_VERSION=1;
/** Opponents = existing 中学 rosters (team ids as in tsubasa-teams.js); stats via tsubasa-story-stats (D-46). */
export const STORY_CHAPTERS=Object.freeze([
 {id:'otomo',number:1,teamId:1,title:'静冈县预选决赛',opponent:'大友中'},
 {id:'azumaichi',number:2,teamId:3,title:'全国大赛 1 回战',opponent:'东一中'},
 {id:'hanawa',number:3,teamId:5,title:'3 回战',opponent:'花轮中'},
 {id:'hirado',number:4,teamId:6,title:'准八强',opponent:'比良户中'},
 {id:'furano',number:5,teamId:7,title:'准决赛',opponent:'富良野中'},
 {id:'toho',number:6,teamId:9,title:'决赛',opponent:'东邦学园'},
].map(c=>Object.freeze({...c,home:0,homeName:'南葛中',/* S-3 v2 (D-49): segments verbatim from tsubasa-story-lines.js */segments:STORY_LINES[c.number-1].segments})));
export const STORY_HOME_TEAM=0;
/** D-48 dialogue model (S-3 slot). A line is {speaker, text}; the speaker table maps
 * id -> {name, portrait}. portrait null = name-only box (no portrait art), and several
 * speakers may share one portrait id (立花兄弟 -> 'tachibana'). S-5 art supplies portraits later. */
const P=(name,portrait)=>Object.freeze({name,portrait});
/* portrait = art id that S-5 will supply (nothing is drawn until then; no placeholders).
 * null = name-only speaker (D-48: 佐野/石崎/高杉). 立花政夫/和夫 share 'tachibana'. Narrator = speaker null (no name box). */
export const STORY_SPEAKERS=Object.freeze({tsubasa:P('翼','tsubasa'),hyuga:P('日向','hyuga'),morisaki:P('森崎','morisaki'),nitta:P('新田','nitta'),sanae:P('早苗','sanae'),soda:P('早田','soda'),wakashimazu:P('若岛津','wakashimazu'),
 tachibana_masao:P('立花政夫','tachibana'),tachibana_kazuo:P('立花和夫','tachibana'),taki:P('泷','taki'),jito:P('次藤','jito'),matsuyama:P('松山','matsuyama'),kisugi:P('来生','kisugi'),
 sano:P('佐野','sano'),ishizaki:P('石崎','ishizaki'),takasugi:P('高杉','takasugi')});
export const STORY_LINE_MAX_CHARS=11;/* S-3: portrait lines ≤11 chars each */
/** -> {name, portrait|null, lines:[...]} for display; throws on malformed data. */
export function resolveDialogueLine(line,speakers=STORY_SPEAKERS){
 if(!line||typeof line.text!=='string'||!line.text)throw new TypeError('dialogue line needs text');
 const sp=line.speaker==null?null:speakers[line.speaker];if(line.speaker!=null&&!sp)throw new RangeError('unknown speaker '+line.speaker);
 const lines=line.text.split('\n');if(lines.some(l=>[...l].length>STORY_LINE_MAX_CHARS))throw new RangeError('line over '+STORY_LINE_MAX_CHARS+' chars');
 return {name:sp?.name??null,portrait:sp?.portrait??null,expression:storyLineExpression(line),lines};
}
export const chapterLabel=c=>`第 ${c.number} 章 ${c.title}`;
export const chapterVersus=c=>`${c.homeName} vs ${c.opponent}`;

export function defaultStoryProgress(){return {version:STORY_SAVE_VERSION,unlocked:1,cleared:[]};}
function valid(p){return p&&typeof p==='object'&&p.version===STORY_SAVE_VERSION&&Number.isInteger(p.unlocked)&&p.unlocked>=1&&p.unlocked<=STORY_CHAPTERS.length&&Array.isArray(p.cleared)&&p.cleared.every(i=>Number.isInteger(i)&&i>=0&&i<STORY_CHAPTERS.length)&&p.cleared.every(i=>i<p.unlocked||(i===STORY_CHAPTERS.length-1));}
/** Never throws: missing/corrupt/foreign-version data -> fresh progress + reason. */
export function loadStoryProgress(storage){
 let raw=null;try{raw=storage?.getItem(STORY_SAVE_KEY)??null;}catch{return {progress:defaultStoryProgress(),recovered:true,reason:'storage-unavailable'};}
 if(raw==null)return {progress:defaultStoryProgress(),recovered:false,reason:'none'};
 let p;try{p=JSON.parse(raw);}catch{return {progress:defaultStoryProgress(),recovered:true,reason:'corrupt-json'};}
 if(p&&typeof p==='object'&&!Array.isArray(p)&&'version' in p&&p.version!==STORY_SAVE_VERSION)return {progress:defaultStoryProgress(),recovered:true,reason:'version-'+String(p.version)};
 if(!valid(p))return {progress:defaultStoryProgress(),recovered:true,reason:'invalid-shape'};
 return {progress:{version:p.version,unlocked:p.unlocked,cleared:[...new Set(p.cleared)].sort((a,b)=>a-b)},recovered:false,reason:'ok'};
}
export function saveStoryProgress(storage,progress){if(!valid(progress))throw new TypeError('invalid story progress');try{storage?.setItem(STORY_SAVE_KEY,JSON.stringify(progress));return true;}catch{return false;}}
/** D-50: a win OR a draw clears the chapter (final included); only a loss means retry. Story matches have no extra time. */
export function storyOutcome(score){const {home,away}=score??{};if(!Number.isInteger(home)||!Number.isInteger(away))throw new TypeError('score');return home>away?'win':home<away?'lose':'draw';}

/** Screens (D-50): chapters -> intro(开场) -> match -> halftime(赛中名场面, skippable) -> match -> result -> (win/draw) outro(赛后) -> chapters | complete ; (lose) retry -> match. */
export const storyClears=outcome=>outcome==='win'||outcome==='draw';
export function createStoryFlow({storage,chapters=STORY_CHAPTERS}={}){
 const loaded=loadStoryProgress(storage);let progress=loaded.progress;
 const state={screen:'chapters',chapter:null,line:0,result:null,halfTimeShown:false,saveOk:true,loadReason:loaded.reason,recovered:loaded.recovered};
 const persist=()=>{state.saveOk=saveStoryProgress(storage,progress);};
 const segs=k=>{if(state.chapter===null)return [];const all=chapters[state.chapter].segments;return k==='intro'?all.filter(x=>x.id==='intro'):k==='halftime'?all.filter(x=>x.id.startsWith('mid')):all.filter(x=>x.id==='outro').map(x=>({...x,lines:storyOutroLinesFor(state.chapter,state.result?.outcome??STORY_OUTRO_ANIME_OUTCOME[state.chapter],x.lines)}));};
 const flat=k=>segs(k).flatMap(x=>x.lines.map(l=>({...l,segment:x.id,segmentLabel:x.label})));const lines=flat;
 const need=s=>{if(state.screen!==s)throw new Error(`story: expected ${s}, at ${state.screen}`);};
 const api={
  get state(){return {...state,progress:{...progress,cleared:[...progress.cleared]}};},
  currentLine(){const k=state.screen;if(k!=='intro'&&k!=='outro'&&k!=='halftime')return null;const l=lines(k)[state.line];return l?{...resolveDialogueLine(l),segment:l.segment,segmentLabel:l.segmentLabel,index:state.line,total:lines(k).length}:null;},
  isUnlocked:i=>Number.isInteger(i)&&i>=0&&i<progress.unlocked,
  isCleared:i=>progress.cleared.includes(i),
  selectChapter(i){need('chapters');if(!api.isUnlocked(i))throw new RangeError('chapter locked');Object.assign(state,{chapter:i,screen:'intro',line:0,result:null,test:false});return api.state;},
  /** next dialogue line, or leave the text screen when none remain */
  advance(){if(state.screen==='intro'||state.screen==='outro'||state.screen==='halftime'){const k=state.screen;if(state.line+1<lines(k).length){state.line++;return api.state;}return api.skip();}throw new Error('story: nothing to advance');},
  /** skip the whole text block; never changes progress */
  skip(){if(state.screen==='intro'){state.screen='match';state.line=0;state.halfTimeShown=false;}else if(state.screen==='halftime'){state.screen='match';state.line=0;}else if(state.screen==='outro'){const last=state.chapter===STORY_CHAPTERS.length-1;state.screen=last?'complete':'chapters';if(!last)state.chapter=null;state.line=0;}else throw new Error('story: nothing to skip');return api.state;},
  /** original half-time reached: show 赛中名场面 once per match (returns false if already shown or no lines) */
  halfTime(){need('match');if(state.test)return false;if(state.halfTimeShown)return false;state.halfTimeShown=true;if(!lines('halftime').length)return false;state.screen='halftime';state.line=0;return true;},
  matchSpec(){need('match');const c=chapters[state.chapter];/* hidden QA side=opp: 1P (home slot) plays the opponent team */if(state.test&&state.testSide==='opp')return {chapter:state.chapter,home:c.teamId,away:c.home,storyStats:true,side:'opp'};return {chapter:state.chapter,home:c.home,away:c.teamId,storyStats:true};},
  reportMatch(score){need('match');if(state.test&&state.testSide==='opp')score={home:score.away,away:score.home};/* keep 南葛-perspective score */const outcome=storyOutcome(score);state.result={...score,outcome};
   if(storyClears(outcome)&&!state.test){if(!progress.cleared.includes(state.chapter))progress.cleared=[...progress.cleared,state.chapter].sort((a,b)=>a-b);progress.unlocked=Math.max(progress.unlocked,Math.min(STORY_CHAPTERS.length,state.chapter+2));persist();}
   state.screen='result';return api.state;},
  /** Hidden QA entry (D-59 test entry): straight into chapter i's real match, ignoring locks; no dialogue, no half-time text, progress never saved. */
  testMatch(i,{side='home'}={}){if(!Number.isInteger(i)||i<0||i>=chapters.length)throw new RangeError('chapter');Object.assign(state,{chapter:i,screen:'match',line:0,result:null,halfTimeShown:true,test:true,testSide:side==='opp'?'opp':'home'});return api.state;},
  /** match could not start/finish (error): back to the intro, progress untouched */
  abortMatch(){need('match');state.halfTimeShown=false;state.screen='intro';state.line=0;return api.state;},
  retry(){need('result');if(state.result?.outcome!=='lose')throw new Error('story: retry only after a loss');state.result=null;state.screen='match';state.halfTimeShown=false;return api.state;},
  continue(){need('result');if(!storyClears(state.result?.outcome))throw new Error('story: continue only after a win/draw');state.screen='outro';state.line=0;return api.state;},
  backToChapters(){if(!['intro','result','complete'].includes(state.screen))throw new Error('story: cannot leave '+state.screen);Object.assign(state,{screen:'chapters',chapter:null,line:0,result:null,test:false});return api.state;},
  resetProgress(){progress=defaultStoryProgress();persist();Object.assign(state,{screen:'chapters',chapter:null,line:0,result:null});return api.state;},
 };
 return api;
}
