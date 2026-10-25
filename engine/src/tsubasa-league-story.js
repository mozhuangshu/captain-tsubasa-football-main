/** Optional chapter dialogue inside the website league. Opponents are freely selectable;
 * chapter presentation never locks selection, changes the cursor, or rewrites results.
 * Existing league points, season limits and password format remain native. */
import {STORY_CHAPTERS,STORY_SPEAKERS,resolveDialogueLine} from './tsubasa-story.js';
import {storyOutroLinesFor} from './tsubasa-story-outro-variants.js';
import {storyLineExpression} from './tsubasa-story-expressions.js';
import {storyPortraitArt,STORY_PORTRAIT_ART} from './tsubasa-story-portraits.js';
import {STORY_TALK_LINES,STORY_FLOW_LINES} from './tsubasa-story-talk.js';
import {enableTsubasaStoryStats} from './tsubasa-story-stats.js';
import {setLeagueStoryHooks} from './league-story-hooks.js';
import {TSUBASA_ROSTERS} from '../data/tsubasa-team-data.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
import {zhFont} from './localization-zh.js';
import {crispFillText} from './crisp-text.js';
import {fadeStep,fadeNes} from './tsubasa-screen-art.js';

const CH=STORY_CHAPTERS,DONE=CH.length;
const SPEAKERS=Object.freeze({...STORY_SPEAKERS,izawa:Object.freeze({name:'井泽',portrait:null}),wakabayashi:Object.freeze({name:'若林',portrait:null})});
/** original record slot of a league opponent (league.js settleLeagueMatch: team - floor(team/4) - 1) */
export const leagueRecordIndex=team=>team-(team>>>2)-1;
const played=(r,team)=>r[0x53e+leagueRecordIndex(team)]&3;
/** league 1P/2P with 南葛 as the player's team, in the league stage (not the 梦想杯 bracket) */
export const leagueStoryOn=r=>!!(r[0x57]&128)&&(r[0x52c]&15)===0&&r[0x54a]>=128;
/** 0..5 = current chapter, 6 = 中学篇 complete */
export function leagueStoryChapter(r){for(let i=0;i<DONE;i++)if(!played(r,CH[i].teamId))return i;return DONE;}
const chapterMatch=r=>{if(!leagueStoryOn(r))return -1;const c=leagueStoryChapter(r);return c<DONE&&(r[0x52d]&15)===CH[c].teamId?c:-1;};
const NANKATSU=Object.freeze(Object.fromEntries((TSUBASA_ROSTERS.rosters.find(x=>x.teamId===0)?.players??[]).map(p=>[p.playerNumber,p.characterId])));

/** The three original-flow hooks (league-story-hooks.js). */
export function leagueStoryHooks({onSettle=null}={}){return {
 allows(){return true;},
 cursor(){return undefined;},
 afterSettle(r,res){
  if(!res?.recorded||!(r[0x57]&128)||(r[0x52c]&15)!==0)return;const team=r[0x52d]&15,c=CH.findIndex(x=>x.teamId===team);
  /* this was the chapter match iff every earlier chapter is cleared and this record now shows exactly this one play */
  if(c<0||CH.slice(0,c).some(x=>!played(r,x.teamId))||played(r,team)!==1)return;
  onSettle?.(c,res.result);
 }};}

const fill=(text,c)=>text.replace('{opponent}',CH[c].opponent);
function resolve(line,c){const out=resolveDialogueLine({...line,text:fill(line.text,c)},SPEAKERS);return {...out,expression:line.expression??storyLineExpression(line)};}
function segmentLines(c,kind,outcome){const all=CH[c].segments;
 const seg=kind==='intro'?all.filter(x=>x.id==='intro'):kind==='mid'?all.filter(x=>x.id.startsWith('mid')):all.filter(x=>x.id==='outro').map(x=>({...x,lines:storyOutroLinesFor(c,outcome,x.lines)}));
 return seg.flatMap(x=>x.lines.map(l=>({...l,tag:x.label})));}

export function createLeagueStory({loadImage=defaultLoadImage,sound=null}={}){
 const shown=new Set(),retries=new Array(DONE).fill(0),images=new Map();
 let dlg=null,lastKey='',age=0,lastPhase=-1,ram=null;
 const image=src=>{if(!images.has(src))images.set(src,loadImage(src));return images.get(src);};
 function open(c,tag,lines,key){if(key)shown.add(key);if(!lines.length)return false;
  dlg={chapter:c,lines:lines.map(l=>({...resolve(l,c),tag:l.tag??tag})),i:0,page:0,shown:0,tick:0};for(const l of dlg.lines){const a=storyPortraitArt(l.portrait,l.expression);if(a)image(a.src);}return true;}
 const once=(key,fn)=>shown.has(key)?false:fn();
 function trigger(r){
  const main=r[0x58],sub=r[0x59]&127,ready=!!(r[0x59]&128)&&r[0x5c9]===1&&(r[0x5b2]&192)===128;
  const key=`${main}:${sub}`;if(key!==lastKey){lastKey=key;age=0;}age++;
  const c=chapterMatch(r);if(c<0)return false;
  if(main===2&&sub===4&&ready){
   if(r[0x559]===0){if(!shown.has('intro:'+c))return open(c,'开场',segmentLines(c,'intro'),'intro:'+c);return once(`retry:${c}:${retries[c]}`,()=>retries[c]?open(c,'再战',STORY_FLOW_LINES.retry,`retry:${c}:${retries[c]}`):false);}
   if(r[0x559]===1)return once('mid:'+c,()=>open(c,'赛中名场面',segmentLines(c,'mid'),'mid:'+c));
  }
  if(main===2&&(sub===12||sub===13)){const phase=r[0x5c9],prev=lastPhase;lastPhase=phase;
   if(prev===7&&phase===1){const id=NANKATSU[r[0x5d1]],line=STORY_TALK_LINES[c]?.[id];if(line)return open(c,'交谈',[line],null);}return false;}
  if(main===0&&sub===10&&age>=90){const home=r[0x52e],away=r[0x52f],outcome=home>away?'win':home<away?'lose':'draw',k=`end:${c}:${r[0x556]}`;
   return once(k,()=>outcome==='lose'?open(c,'赛后',STORY_FLOW_LINES.loss,k):open(c,'赛后',[...segmentLines(c,'outro',outcome),...(c===DONE-1?STORY_FLOW_LINES.finale.map(l=>({...l,tag:'中学篇'})):[])],k));}
  return false;
 }
 /* typewriter as the original message routine (dialogue.js): one character every 2 frames on menu screens,
  * every frame while A/B/START/SELECT is held (r[4]|r[5]); the original 0x35 tick per visible character.
  * A or START: show the rest of this page at once, then the next page / line; B: skip the rest of this block. */
 function update(r){const line=dlg.lines[dlg.i],pages=dialoguePages(line),chars=[...pages[dlg.page].join('')],n=chars.length,press=r[8];dlg.tick++;
  if(dlg.shown<n&&((r[4]|r[5])&0xf0||dlg.tick%2===0)){if(chars[dlg.shown]!==' ')sound?.(0x35);dlg.shown++;}
  if(press&0x40){dlg=null;sound?.(0x33);return;}
  if(press&0x90){if(dlg.shown<n){dlg.shown=n;return;}dlg.shown=0;dlg.tick=0;if(++dlg.page<pages.length)return;dlg.page=0;if(++dlg.i>=dlg.lines.length)dlg=null;}
 }
 const layer={
  get dialogue(){return dlg?{chapter:dlg.chapter,index:dlg.i,total:dlg.lines.length,line:dlg.lines[dlg.i],page:dlg.page,shown:dlg.shown}:null;},
  get shownKeys(){return [...shown];},
  /** what draw() depends on beyond RAM / palette (tsubasaPaintKey): the open line, its typewriter count and the ▼ blink */
  get renderKey(){return dlg?`${dlg.chapter}:${dlg.i}:${dlg.page}:${dlg.shown}:${Math.floor(dlg.tick/16)&1}`:'';},
  /** fetch every portrait up front so a speaker's first line never shows an empty frame */
  preloadPortraits(){for(const a of Object.values(STORY_PORTRAIT_ART))image(a.src);},
  /** RecoveredApp.step: true = the dialogue owns this step (original state frozen). */
  intercept(r,sample){
   if(r!==ram){ram=r;shown.clear();retries.fill(0);dlg=null;lastKey='';lastPhase=-1;}/* app.reset() = new game */
   if(r[0x58]===2){const sub=r[0x59]&127;if(sub===2)enableTsubasaStoryStats(false);else if(sub===4)enableTsubasaStoryStats(chapterMatch(r)>=0);}
   if(!dlg&&!trigger(r))return false;sample();if(dlg)update(r);return true;},
  onSettle(c,result){if(result==='loss')retries[c]++;},
  draw(ctx,app,scale=2){const r=app.r;ctx.save();ctx.imageSmoothingEnabled=false;ctx.setTransform?.(scale,0,0,scale,0,0);try{drawBanners(ctx,app);if(dlg)drawDialogue(ctx,dlg,image,app);}finally{ctx.restore();}void r;},
 };
 return layer;
}
function defaultLoadImage(src){if(typeof Image!=='function')return null;const im=new Image();im.decoding='async';im.src=src;return im;}
export function installLeagueStory(app,options={}){
 const story=createLeagueStory({sound:id=>app.requestSound(id),...options});
 setLeagueStoryHooks(leagueStoryHooks({onSettle:(c,res)=>story.onSettle(c,res)}));app.storyLayer=story;if(options.preload!==false)story.preloadPortraits();return story;
}
export function uninstallLeagueStory(app){setLeagueStoryHooks(null);enableTsubasaStoryStats(false);if(app)app.storyLayer=null;}

/* ---------- drawing (logical 256x240 coordinates; the caller scales) ---------- */
const rgb=v=>DISPLAY_NES_RGB[v&63];
function fadeLevel(app){const full=app.layout?.palette,now=app.palette??full;if(!full)return 0;let step=0;for(let i=0;i<16;i++)if(full[i]>=0x20&&full[i]!==0x0f)step=Math.max(step,fadeStep(now[i]&63,full[i]&63));return step;}
const measure=(ctx,s)=>{ctx.font=zhFont();const w=ctx.measureText?.(s)?.width;return Math.ceil(Number.isFinite(w)&&w>0?w:[...s].length*12);};
function text(ctx,s,x,y,color){ctx.font=zhFont();ctx.textBaseline='top';ctx.fillStyle=color;crispFillText(ctx,s,x,y);}
function drawBanners(ctx,app){const r=app.r;if(r[0x58]!==2||!(r[0x59]&128)||!leagueStoryOn(r))return;const sub=r[0x59]&127;if(sub!==2&&sub!==3)return;
 const step=fadeLevel(app);if(step>=4)return;const full=app.layout.palette,now=app.palette??full,at=full.indexOf(0x0c);
 const bg=rgb(at>=0?now[at]:fadeNes(0x0c,step)),ink=rgb(fadeNes(0x30,step));
 const title='自由联赛 · 自选对手',w=measure(ctx,title);
 ctx.fillStyle=bg;ctx.fillRect(16,sub===2?18:12,224,sub===2?18:24);
 text(ctx,title,Math.round(128-w/2),sub===2?22:18,ink);
}
/* Dialogue in the original message look (2026-10-22, replaces the blue box): the screen's own backdrop
 * (palette 0x0C on the menus, entry 0 = black on the scoreboard), the 2px white (0x30) frame of the original windows with the speaker set into the top
 * edge like 「球员名单」, white 12px text two rows per page 16px apart (original rows 25 / 27), the
 * original blinking ▼ at 128,225 once a page is out. No dimming, no tags. On the 队内会议 screen the line
 * takes the original reply's place and form: 井泽：「中场我来补位。」 at row 25 with no window. */
export const DIALOGUE_PAGE_ROWS=2;
export const dialoguePages=line=>{const out=[];for(let i=0;i<line.lines.length;i+=DIALOGUE_PAGE_ROWS)out.push(line.lines.slice(i,i+DIALOGUE_PAGE_ROWS));return out.length?out:[['']];};
/** lobby: the window covers the 休息室 menu frame (24..231 x 128..215); elsewhere it sits at the bottom */
export const DIALOGUE_WINDOW=Object.freeze({lobby:Object.freeze({x:8,y:128,w:240,h:88}),bottom:Object.freeze({x:8,y:150,w:240,h:84})});
/** menu screens: their 0x0C panel colour; screens without one (the full-time scoreboard) use their own backdrop entry 0 (black there) */
function screenBackdrop(app){const full=app?.layout?.palette,now=app?.palette??full;if(!full)return rgb(0x0c);const at=full.indexOf(0x0c);return rgb(at>=0?now[at]:now[0]);}
function typedRows(rows,shown){let left=shown;return rows.map(row=>{const chars=[...row],part=chars.slice(0,Math.max(0,left)).join('');left-=chars.length;return part;});}
function waitMark(ctx,d,x,y,ink){if((Math.floor(d.tick/16)&1)!==0)return;ctx.fillStyle=ink;for(let i=0;i<4;i++)ctx.fillRect(x+i,y+i,7-i*2,1);}
function drawDialogue(ctx,d,image,app){const line=d.lines[d.i],pages=dialoguePages(line),rows=pages[d.page],done=d.shown>=[...rows.join('')].length;
 const r=app?.r,bg=screenBackdrop(app),ink=rgb(0x30),main=r?.[0x58],sub=(r?.[0x59]??0)&127;
 if(main===2&&(sub===12||sub===13)){/* 队内会议: the original reply rows */
  ctx.fillStyle=bg;ctx.fillRect(8,192,240,44);const head=line.name?`${line.name}：「`:'',indent=head?measure(ctx,head):0,typed=typedRows(rows,d.shown),last=d.page===pages.length-1;
  typed.forEach((part,i)=>{const s=(i===0&&d.page===0?head:'')+part+(head&&last&&done&&i===rows.length-1?'」':'');if(s)text(ctx,s,16+(i===0&&d.page===0?0:indent),198+i*16,ink);});
  if(done)waitMark(ctx,d,128,225,ink);return;}
 const {x,y,w,h}=main===2&&sub===4?DIALOGUE_WINDOW.lobby:DIALOGUE_WINDOW.bottom,art=storyPortraitArt(line.portrait,line.expression),img=art?image(art.src):null;
 ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);ctx.fillStyle=ink;ctx.fillRect(x,y,w,2);ctx.fillRect(x,y+h-2,w,2);ctx.fillRect(x,y,2,h);ctx.fillRect(x+w-2,y,2,h);
 if(line.name){const nw=measure(ctx,line.name);ctx.fillStyle=bg;ctx.fillRect(x+16,y,nw+16,2);text(ctx,line.name,x+24,y-4,ink);}
 let tx=x+16;const ty=y+Math.round((h-28)/2)-2;
 if(art){const px=x+10,py=y+Math.round((h-63)/2);/* black backdrop (scoreboard): dark hair would vanish, so the portrait sits on the scoreboard's grey 0x00 */if(bg===rgb(0x0f)){ctx.fillStyle=rgb(0x00);ctx.fillRect(px,py,63,63);}if(img&&img.complete!==false&&img.width)ctx.drawImage(img,px,py,63,63);tx=px+63+10;}
 typedRows(rows,d.shown).forEach((part,i)=>{if(part)text(ctx,part,tx,ty+i*16,ink);});
 if(done)waitMark(ctx,d,x+(w>>1)-3,y+h-11,ink);
}
