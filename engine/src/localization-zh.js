/** Chinese presentation only. Never writes semantic RAM, state IDs or timing. */
import {GLYPH_JA,DIALOGUE_MESSAGES,SCREEN_TEXT,DYNAMIC_TEXT,SPECIAL_SCREEN_TEXT,MATCH_COMMAND_HINT_TEXT,STATUS_BANNER_TEXT,SCOREBOARD_TEXT} from './localization-data.js';
import {dialogueSnapshot} from './dialogue.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
import {originalScreenTile} from './screen-loader.js';
import {crispFillText,clearCrispTextCache} from './crisp-text.js';
import {drawScreenArt,SCREEN_ART_SIZE,fadeStep,fadeNes} from './tsubasa-screen-art.js';
import {TSUBASA_KITS} from './tsubasa-teams.js';
import {canonicalTeamId,tsubasaPlayerNameZh,tsubasaHudName,teamNameZh,presentationTeamForScreen,TSUBASA_LOCALIZATION_POLICY,TSUBASA_EXTRA_LABELS} from './tsubasa-localization.js';
import {FIELD_RENDER_DATA} from './field-render-data.js';
export {teamNameZh,TSUBASA_LOCALIZATION_POLICY} from './tsubasa-localization.js';
export {DIALOGUE_MESSAGES,SCREEN_TEXT,DYNAMIC_TEXT,SPECIAL_SCREEN_TEXT,MATCH_COMMAND_HINT_TEXT};
export function decodeJapanese(bytes){let out='';for(const c of bytes){if(c===0xf8||c===255)break;if(c===0||c===2){out+=' ';continue;}if(c>=32&&c<80)out+=(GLYPH_JA[c|128]+'\u3099').normalize('NFC');else if(c>=80&&c<128)out+=(GLYPH_JA[c+80]+'\u309a').normalize('NFC');else out+=GLYPH_JA[c]??`[${c.toString(16)}]`;}return out;}
function dynamicPlayerTeam(entry){const m=entry.id.match(/^team-(\d+)-player-/);return m?Number(m[1]):entry.id.startsWith('player-')?0:null;}
export function translateDynamic(bytes,{team=null}={}){
 const japanese=decodeJapanese(bytes),matches=DYNAMIC_TEXT.filter(x=>x.japanese===japanese&&
  (team===null||dynamicPlayerTeam(x)===null||dynamicPlayerTeam(x)===canonicalTeamId(team)));
 if(matches.length===1)return {japanese,zh:matches[0].zh,status:'translated'};
 if(/^[0-9 ]*$/.test(japanese))return {japanese,zh:japanese,status:'numeric-preserved'};
 // Duplicate original names require team context; never silently borrow another team's player.
 return {japanese,zh:matches.length?'改编队员':'待确认',status:matches.length?'ambiguous-team':'untranslated'};
}
const baseGlyph=c=>c>=32&&c<80?c|128:c>=80&&c<128?c+80:c===0?255:c;
const matchBytes=(arr,at,bytes)=>bytes.every((c,i)=>arr[at+i]===baseGlyph(c)||c===2&&arr[at+i]===255);
function sourcePages(message,r){let pages=[],page=[],line=[];const commit=()=>{if(line.length||page.length){page.push(line);pages.push(page);}page=[];line=[];};for(const c of message.bytes){if(c===244){commit();}else if(c===247){page.push(line);line=[];}else if(c===240||c===241){for(const v of r.slice(c===240?0x611:0x617,c===240?0x617:0x61f)){if(v>=240)break;line.push(v);}}else if(c<240)line.push(c);}commit();return pages;}
function expand(text,r){return text.replaceAll('{name1}',translateDynamic(r.slice(0x611,0x617),{team:0}).zh).replaceAll('{name2}',translateDynamic(r.slice(0x617,0x61f),{team:0}).zh);}
/** Original event progression drives page/line/typewriter presentation. */
export function advanceChineseDialogue(view,r){const snapshot=dialogueSnapshot(r);if(snapshot.presentation){Object.assign(view,snapshot.presentation);view.events=snapshot.events;return view;}if(view.events===snapshot.events)return view;view.events=snapshot.events;for(const e of snapshot.events){if(e.type==='start'){view.id=e.id;view.page=-1;view.line=0;view.counts=[];view.visible=false;view.dynamicIssues=[];}else if(e.type==='clear'){view.page++;view.line=0;view.counts=[];view.visible=false;}else if(e.type==='character'){view.visible=true;view.counts[view.line]=(view.counts[view.line]||0)+1;}else if(e.type==='control'&&e.code===247)view.line++;}return view;}
export function chineseDialogueLines(view,r){if(!view.visible)return [];const message=DIALOGUE_MESSAGES[view.id];if(!message)return [];const pages=sourcePages(message,r),page=Math.max(0,view.page),source=pages[page]||[],translated=expand(message.zh,r).split('\f')[page]?.split('\n')||[];return translated.map((text,i)=>{const progress=Math.min(1,(view.counts[i]||0)/Math.max(1,source[i]?.length||1));return {text:[...text].slice(0,Math.ceil([...text].length*progress)).join(''),progress,row:25+i*2,col:2,width:27};});}
function textColor(layout,row,col,pixel){const image=layout.panels[layout.activePanel||0],attr=image[960+((row>>2)*8)+(col>>2)],shift=((row&2)<<1)|(col&2),pal=((attr>>shift)&3)*4;const ink=pixel??originalScreenTile(image[row*32+col],layout)[0];return DISPLAY_NES_RGB[layout.palette[pal+ink]&63];}
function background(layout,row,col){const image=layout.panels[layout.activePanel||0],pixels=originalScreenTile(image[row*32+col],layout);let pixel=pixels[0];if(pixel===1){const counts=[0,0,0,0];for(const v of pixels)counts[v]++;pixel=counts.indexOf(Math.max(...counts));}return textColor(layout,row,col,pixel);}
/** D-63: Chinese text uses Fusion Pixel 12px (OFL, assets/fonts/fusion-pixel-OFL.txt) at its native 12px; never smaller. */
export const ZH_PIXEL_FONT_FAMILY='Fusion Pixel 12px';
export function zhFont(){return `12px "${ZH_PIXEL_FONT_FAMILY}","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;}
/** 8x8 glyphs for the stoppage-time clock cell: 补 时 */
const STOPPAGE_GLYPHS=Object.freeze([
 ['.#...#..','####.#..','..#..##.','.##..#.#','#.##.#..','..#..#..','..#..#..','..#..#..'],
 ['......#.','###...#.','#.######','###...#.','#.#.#.#.','###..##.','......#.','.....##.']]);
/** 7x7 glyphs for the meeting menu column (はなす あいてむ でんわ でーた おわる -> 交谈 物品 联络 资料 结束): five 8px rows in a
 * row, where the 12px font overlaps. Baked at development time from Fusion Pixel Font 8px monospaced zh_hans
 * (TakWolf, SIL Open Font License 1.1); only these pixels ship, not the font. */
const MENU_GLYPHS_8=Object.freeze({
 '交':['...#...','#######','..#.#..','##...##','..#.#..','...#...','###.###'],
 '谈':['#.#.#.#','...#.#.','###...#','.#..#..','.##.#.#','.#.#.#.','.##...#'],
 '物':['##.#...','##.####','###.###','.#..###','##.#.##','.##.#.#','.#.#.##'],
 '品':['.#####.','.#...#.','.#####.','.......','###.###','#.#.#.#','###.###'],
 '联':['###.#.#','.##....','.##.###','.##..#.','.##.###','###..#.','..###.#'],
 '络':['.#..##.','#..#.#.','.#..#..','#.##.##','##.###.','...#.#.','##.###.'],
 '资':['#..#...','...####','..#.#.#','#..#.#.','.#####.','.#.#.#.','###.###'],
 '料':['#.#..#.','.#.#.#.','###..#.','.#.#.#.','##...##','######.','.#...#.'],
 '结':['.#..#..','#.#####','.#..#..','#..###.','##.....','...###.','##.###.'],
 '束':['...#...','#######','.#.#.#.','.#####.','...#...','..###..','##.#.##']});
const MENU_8PX_LABELS=new Set(['screen-0a-p0-r18-c10','screen-0a-p0-r19-c10','screen-0a-p0-r20-c10','screen-0a-p0-r21-c10','screen-0a-p0-r22-c10']);
function paintLabel8(ctx,label,layout){const x=label.col*8,y=label.row*8;ctx.fillStyle=background(layout,label.row,label.col);ctx.fillRect(x,y,label.width*8,8);ctx.fillStyle=textColor(layout,label.row,label.col,1);
 [...label.zh].forEach((ch,i)=>MENU_GLYPHS_8[ch]?.forEach((r,yy)=>{for(let xx=0;xx<r.length;xx++)if(r[xx]==='#')ctx.fillRect(x+i*8+xx,y+1+yy,1,1);}));}
export function hudShortName(t){const c=[...String(t)];return c.length>3?c.slice(0,3).join(''):c.join('');}
/** A995 writes the on-field role (control pair 0/2/4/6 = FW/MF/DF/GK) two tiles under each HUD name cell: lower name row + 35. */
const HUD_ROLE_BY_TILES=new Map(['FW','MF','DF','GK'].map((role,i)=>[FIELD_RENDER_DATA.controls[i*2]+','+FIELD_RENDER_DATA.controls[i*2+1],role]));
export function hudRoleAt(tiles,at){return HUD_ROLE_BY_TILES.get(tiles[at+35]+','+tiles[at+36])??null;}
if(typeof FontFace==='function'&&typeof document!=='undefined'&&document.fonts){try{const f=new FontFace(ZH_PIXEL_FONT_FAMILY,`url(${new URL('../assets/fonts/fusion-pixel-12px-zh_hans.woff2',import.meta.url)})`);document.fonts.add(f);f.load().then(()=>clearCrispTextCache()).catch(()=>{});}catch{}}
function paintLabel(ctx,label,layout,{color=null}={}){if(!label.zh&&!label.text)return;let text=label.zh??label.text;const x=label.col*8,y=label.row*8,w=label.width*8,h=(label.height||1)*8;/* D-63: 12px pixel font at native size: no vertical squash (old fitHeight) and no maxWidth squeeze; rows under 12px get a 12px band centred on the row; wider text overflows its slot (only HUD names are truncated) */const W=Math.max(w,Math.ceil(ctx.measureText?.(text).width??0)),H=Math.max(h,12),ty=y-((H-h)>>1);ctx.fillStyle=background(layout,label.row,label.col);ctx.font=zhFont();ctx.fillRect(x,ty,W,H);ctx.fillStyle=color??textColor(layout,label.row,label.col,1);ctx.font=zhFont(label.fontSize);ctx.textBaseline='top';const measured=ctx.measureText?.(text).width??[...text].length*12;const tx=label.align==='center'?Math.round(x+(w-Math.min(w,measured))/2):x;crispFillText(ctx,text,tx,ty+(H-12>>1)+(label.fitHeight?0:(label.textOffsetY||0)));}
function clearMarks(ctx,label,layout,panel=0){const tiles=layout.panels[panel];if(label.row===0)return;for(let i=0;i<label.width;i++){let at=(label.row-1)*32+label.col+i,t=tiles[at];if(t===12&&[3,13].includes(layout.descriptor)){const plain=originalScreenTile(5,layout),marked=originalScreenTile(12,layout);for(let p=0;p<64;p++)if(plain[p]!==marked[p]){ctx.fillStyle=textColor(layout,label.row-1,label.col+i,plain[p]);ctx.fillRect((label.col+i)*8+p%8,(label.row-1)*8+(p>>3),1,1);}}else if([218,219,90,91].includes(t)){ctx.fillStyle=background(layout,label.row,label.col+i);ctx.fillRect((label.col+i)*8,(label.row-1)*8,8,8);}}}
function translatedDynamicSpans(layout,panel,screenId,ram,painted=[]){
 const out=[],tiles=layout.panels[panel],team=presentationTeamForScreen(screenId,ram);
 const entries=DYNAMIC_TEXT.filter(entry=>dynamicPlayerTeam(entry)===null||dynamicPlayerTeam(entry)===team);
 for(let row=0;row<30;row++)for(let col=0;col<32;col++)for(const entry of entries){
  if(col+entry.bytes.length>32)continue;
  // A full static label already owns its source cells; avoid repainting a name over its number.
  if(painted.some(label=>row>=label.row&&row<label.row+(label.height||1)&&col<label.col+label.width&&col+entry.bytes.length>label.col))continue;
  if(matchBytes(tiles,row*32+col,entry.bytes))out.push({...entry,row,col,width:entry.bytes.length});
 }
 return out;
}
/** Baked original badges contain old team lettering; replace only their fixed logo rectangles.
 * Identity follows committed name tiles, never a pending selection in RAM.
 * The new shield is an original adaptation in the team's verified primary kit colors. */
export function drawTsubasaVersusBadges(ctx,{layout,panel=0}){
 if(panel!==0)return [];const out=[];
 for(const [side,col]of [5,20].entries()){
  const entry=SPECIAL_SCREEN_TEXT.find(label=>label.id.startsWith('versus-team-')&&label.id.endsWith(`-side-${side}`)&&label.source.tiles.every((v,i)=>layout.panels[0][label.row*32+col+Math.floor(i/7)*32+i%7]===v));
  const team=entry?Number(entry.id.split('-')[2]):null,kit=team===null?null:TSUBASA_KITS.kits.find(k=>k.teamId===canonicalTeamId(team))?.field;
  const shirt=kit?.shirt??'#F4F4ED',trim=kit?.trim??'#2054B5',x=col*8,y=48;
  ctx.save?.();ctx.fillStyle=background(layout,5,col);ctx.fillRect(x,y,56,64);/* D-59: the ROM badge's drop shadow (tile 35, one column right) no longer matches the new shield and read as a detached black bar */if(layout.panels[0].slice((7*32)+col+7).filter((_,i)=>i%32===0).slice(0,6).every(t=>t===0x35)){ctx.fillStyle=background(layout,5,col+7);ctx.fillRect(x+56,y+8,8,56);}
  ctx.fillStyle='#152638';ctx.fillRect(x+3,y+3,50,36);ctx.fillRect(x+7,y+39,42,7);ctx.fillRect(x+13,y+46,30,7);ctx.fillRect(x+21,y+53,14,4);
  ctx.fillStyle=trim;ctx.fillRect(x+5,y+5,46,32);ctx.fillRect(x+9,y+37,38,7);ctx.fillRect(x+15,y+44,26,7);ctx.fillRect(x+23,y+51,10,4);
  ctx.fillStyle=shirt;ctx.fillRect(x+8,y+8,40,25);ctx.fillRect(x+12,y+33,32,8);
  const rgb=[1,3,5].map(i=>parseInt(shirt.slice(i,i+2),16));ctx.fillStyle=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>145?'#152638':'#FFFFFF';
  ctx.font=zhFont();ctx.textBaseline='top';
  const title=team===null?'邀请赛':teamNameZh(team),width=ctx.measureText?.(title).width??title.length*10;crispFillText(ctx,title,x+(56-Math.min(40,width))/2,y+15,40);
  ctx.fillStyle='#152638';ctx.fillRect(x+10,y+44,36,10);ctx.fillStyle='#FFFFFF';ctx.fillRect(x+8,y+58,40,1);/* D-63: badge text removed, graphic only */ctx.restore?.();
  out.push({side,teamId:team===null?null:canonicalTeamId(team),shirt,trim,row:6,col,width:7,height:8,x,y});
 }
 clearVersusShadow(ctx,layout);
 return out;
}
/** D-59: the ROM 'VS' carries a hard black copy offset 2px down-right; at handheld scale it reads as ghosting. Repaint only black ink pixels of the VS block with the panel background; white letters untouched. */
function clearVersusShadow(ctx,layout){const tiles=layout.panels[0];if(!(tiles[9*32+14]===0x20&&tiles[10*32+14]===0x24))return;for(let row=9;row<=11;row++)for(let col=14;col<=18;col++){const t=tiles[row*32+col];if(!t)continue;const px=originalScreenTile(t,layout),bg=background(layout,5,col);for(let p=0;p<64;p++){const c=textColor(layout,row,col,px[p]);if(isDarkInk(c)&&c!==bg){ctx.fillStyle=bg;ctx.fillRect(col*8+(p&7),row*8+(p>>3),1,1);}}}}
function isDarkInk(c){const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(c));return !!m&&parseInt(m[1],16)+parseInt(m[2],16)+parseInt(m[3],16)<60;}
/** D-59: a dotted rule tile directly under a translated label (title prompt, team-select group headings) read as a line of garbled tiny text. Clear the contiguous run under the label. */
function clearUnderline(ctx,label,layout,panel=0){const tiles=layout.panels[panel],row=label.row+(label.height||1);if(row>=30)return;const isRule=(t,col)=>{const px=originalScreenTile(t,layout),cs=px.map(v=>textColor(layout,row,col,v)),n=new Map();for(const c of cs)n.set(c,(n.get(c)||0)+1);const major=[...n].sort((x,y)=>y[1]-x[1])[0][0],rows=new Set();let k=0;for(let p=0;p<64;p++)if(cs[p]!==major){rows.add(p>>3);k++;}return k>0&&k<=8&&rows.size===1;};
 if(!isRule(tiles[row*32+label.col],label.col))return;let a=label.col,b=label.col;const t0=tiles[row*32+label.col];while(a>0&&tiles[row*32+a-1]===t0)a--;while(b<31&&tiles[row*32+b+1]===t0)b++;ctx.fillStyle=background(layout,label.row,label.col);ctx.fillRect(a*8,row*8,(b-a+1)*8,8);}
/** D-59: the title screen's black bands (tile 03 rows 0-2 and 26-29) looked like letterboxing; extend the title backdrop. */
function fillTitleBands(ctx,layout,panel){const t=layout.panels[panel];if(!(t.slice(0,96).every(v=>v===3)&&t.slice(27*32,30*32).every(v=>v===3)))return;ctx.fillStyle=background(layout,10,16);ctx.fillRect(0,0,256,24);ctx.fillRect(0,26*8,256,32);}
// Labels inserted by ACBD in the meeting's right panel. Coordinates retain original targets.
const meetingLabels={0:[{row:17,col:16,width:3,zh:'对谁'}],1:[{row:17,col:16,width:3,zh:'给谁'},{row:18,col:23,width:3,zh:'什么'}],2:[{row:18,col:21,width:3,zh:'打给谁'},{row:20,col:17,width:3,zh:'队务'},{row:20,col:22,width:8,zh:'梦想杯赛事处'},{row:22,col:17,width:3,zh:'后勤'},{row:22,col:22,width:8,zh:'球迷与战术台'}],3:[{row:17,col:16,width:3,zh:'查看谁'}]};
export function createChineseLocalization(){const views=new WeakMap();return {language:'zh-CN',namePolicy:TSUBASA_LOCALIZATION_POLICY.anonymous,adaptation:TSUBASA_LOCALIZATION_POLICY.adaptation,drawOverlay(ctx,{screenId,ram,layout,panel=0,palette=layout.palette}){if(layout.kind==='field'){drawChineseFieldOverlay(ctx,{ram,layout,palette});return;}
 if(layout.screenProjection?.segments){if(layout.screenProjection.backgroundEnabled===false)return;for(const part of layout.screenProjection.segments){ctx.save?.();if(ctx.beginPath&&ctx.rect&&ctx.clip){ctx.beginPath();const left=Math.max(part.screenX,layout.screenProjection.leftClip??0);ctx.rect(left,part.screenY,Math.max(0,part.screenX+part.width-left),part.height);ctx.clip();}const dx=part.screenX-part.sourceX,dy=part.screenY-part.sourceY;if(ctx.translate){ctx.translate(dx,dy);this.drawOverlay(ctx,{screenId,ram,layout:{...layout,screenProjection:null},panel:part.panel,palette});}else if(dx===0&&dy===0)this.drawOverlay(ctx,{screenId,ram,layout:{...layout,screenProjection:null},panel:part.panel,palette});ctx.restore?.();}return;}
 if(layout.kind==='scoreboard'){drawChineseScoreboardPanel(ctx,{layout,panel,palette,frame:ram?.[0x300]??0});return;}if(screenId===1&&panel===0&&drawTsubasaTitle(ctx,{layout,palette}))return;/* item 7: the title picture replaces the title text page */layout={...layout,palette,activePanel:panel};let view=views.get(ram);if(!view)views.set(ram,view={page:-1,counts:[],visible:false});advanceChineseDialogue(view,ram);ctx.save?.();const painted=[];
 if([16,17,18].includes(screenId))drawTsubasaCrowd(ctx,{image:layout.panels[panel],colors:layout,layout,frame:ram[0x300]});
 for(const label of [...SCREEN_TEXT,...SPECIAL_SCREEN_TEXT,...TSUBASA_EXTRA_LABELS])if((label.screen===screenId||(screenId>=29&&screenId<=36/* 36: the closing ending page after the staff roll */&&(label.id==='screen-1c-p0-r3-c9'||label.id.startsWith('ending-rank-'))))&&label.panel===panel&&label.status==='translated'&&label.zh!==''&&(!label.source.tiles||label.source.tiles.every((v,i)=>layout.panels[panel][label.row*32+label.col+(label.source.rowWidth?Math.floor(i/label.source.rowWidth)*32+i%label.source.rowWidth:i)]===v))){if(MENU_8PX_LABELS.has(label.id)){paintLabel8(ctx,label,layout);painted.push(label);continue;}clearMarks(ctx,label,layout,panel);clearUnderline(ctx,label,layout,panel);/* D-63: before paint, so 12px glyph rows below the 8px cell survive */paintLabel(ctx,label,layout);painted.push(label);}
 if(screenId===1)fillTitleBands(ctx,layout,panel);
 if(screenId>=28&&screenId<=36&&panel===0)drawTsubasaEndingBillboard(ctx,{image:layout.panels[0],colors:{...layout,palette,activePanel:0},layout});
 if(screenId===11&&panel===0)painted.push(...drawTsubasaVersusBadges(ctx,{layout,panel}));
 if(screenId===10&&panel===0){const phase=ram[0x5c9],group=phase===2||phase===7?0:phase===3||phase===6||phase===8?1:phase===4||phase===9||phase===10?2:phase===5?3:-1;for(const label of meetingLabels[group]||[])paintLabel(ctx,label,layout);}
 for(const label of translatedDynamicSpans(layout,panel,screenId,ram,painted)){clearMarks(ctx,label,layout,panel);paintLabel(ctx,label,layout);}
 // Only original dialogue-capable menu/introduction/ending surfaces use this box.
 if(panel===0&&[10,12,14,28,29,30,31,32,33,34,35,36].includes(screenId))for(const label of chineseDialogueLines(view,ram)){clearMarks(ctx,label,layout,panel);paintLabel(ctx,label,layout);}
 if(screenId===2&&panel===0){ctx.fillStyle=background(layout,11,26);ctx.fillRect(20*8,10*8,6*8,3*8);}
 ctx.restore?.();},coverage(){return {dialogues:DIALOGUE_MESSAGES.length,translatedDialogues:DIALOGUE_MESSAGES.filter(x=>x.status==='translated').length,staticLabels:SCREEN_TEXT.filter(x=>x.status==='translated').length,specialLabels:SPECIAL_SCREEN_TEXT.length+TSUBASA_EXTRA_LABELS.length,dynamicLabels:DYNAMIC_TEXT.length,teams:13,players:84,adaptation:TSUBASA_LOCALIZATION_POLICY.adaptation,notClaimedComplete:['natural full-tournament playthrough and browser interaction require separate integration verification']};}};}
export const chineseLocalization=createChineseLocalization();

/** Fixed C080 roster lookup, including the four original home-team aliases. */
export function playerNameZh(team,player){return tsubasaPlayerNameZh(team,player);}
export function hudPlayerNameZh(team,player,role=null){return tsubasaHudName(team,player,role);}

/** Requires explicit host projection: never guesses IRQ HUD screen Y. */
export function drawHudLabels(ctx,labels,{backgroundColor='#003c50',color='#ffffff'}={}){for(const label of labels){if(!Number.isFinite(label.screenX)||!Number.isFinite(label.screenY))continue;const text=hudPlayerNameZh(label.team,label.player,label.role);ctx.save?.();ctx.fillStyle=backgroundColor;ctx.fillRect(label.screenX,label.screenY,40,16);ctx.fillStyle=color;ctx.font=zhFont();ctx.textBaseline='top';crispFillText(ctx,text,label.screenX,label.screenY+3);ctx.restore?.();}}

export function matchHintZh(id){const entry=MATCH_COMMAND_HINT_TEXT[id];if(!entry)throw new RangeError("Original command hint ID");return entry.zh;}

/** Field layout is an IRQ-split projection. Never scan its scrolling tiles as menu text. */
const hudNameMemo=new WeakMap();
/** P-1/P-3: true while a HUD name is being held through a cell rewrite: the hold counts paints, so those paints must be drawn */
export function isHudNameHolding(ram){const m=hudNameMemo.get(ram);if(!m)return false;for(const v of m.values())if(v.age>0&&v.age<=20)return true;return false;}
export function drawChineseFieldOverlay(ctx,{ram,layout,palette=layout.palette}){
 const projected=layout.hudProjection;
 const crop=projected?.cropTop??0,start=projected?.hudStartY??185-crop;if(projected?.fieldOnly)return;
 ctx.save?.();if(ctx.beginPath&&ctx.rect&&ctx.clip){ctx.beginPath();ctx.rect(0,start,256,(projected?.height??240)-start);ctx.clip();}
 const labels=[...(layout.hudLabels??[])];if(projected?.mode==='players'&&!projected.fieldOnly){for(const [side,address] of [0x2a07,0x2a1a].entries())if(!labels.some(l=>l.lowerAddress===address+32))labels.push({side,team:ram[0x52c+side],nameAddress:address,lowerAddress:address+32,screenX:(address&31)*8,screenY:((address-0x2800)>>>5)*8+start-projected.sourceY});}for(const label of labels){
  if(!Number.isFinite(label.screenX)||!Number.isFinite(label.screenY))continue;
  const at=(label.lowerAddress-0x2800)&1023,tiles=layout.panels[1];
  const team=canonicalTeamId(label.team??ram[0x52c+(label.side??0)]);
  const entries=DYNAMIC_TEXT.filter(x=>dynamicPlayerTeam(x)===team&&(label.player===undefined||x.id===(team===0?`player-${label.player}`:`team-${team}-player-${label.player}`)));
  let match=entries.find(x=>x.source.originalBytes?.length===5&&x.source.originalBytes.every((b,i)=>baseGlyph(b)===tiles[at+i]));{/* D-59: hold the last name while the original rewrites the cell over several frames */let memo=hudNameMemo.get(ram);if(!memo)hudNameMemo.set(ram,memo=new Map());const key=`${label.lowerAddress}:${team}`;if(match)memo.set(key,{match,age:0});else{const m=memo.get(key);if(!m||++m.age>20)continue;match=m.match;}}
  const row=at>>>5,col=at&31,colors={...layout,palette,activePanel:1};
  // FA is a horizontal border. Restore only the four/six FB/FC mark pixels,
  // then replace the five lower glyph cells. Keep score/time/jersey untouched.
  const x=label.screenX,y=label.screenY;ctx.fillStyle=textColor(colors,row,col,2);
  for(let i=0;i<5;i++){const top=tiles[at-32+i];if(top===251){for(const [px,py] of [[5,5],[7,5],[5,6],[7,6]])ctx.fillRect(x+i*8+px,y+py,1,1);}else if(top===252){for(const [px,py] of [[6,5],[5,6],[7,6],[6,7]])ctx.fillRect(x+i*8+px,y+py,1,1);}}
  ctx.fillRect(x,y+5,40,11);ctx.fillStyle=textColor(colors,row,col,1);ctx.font=zhFont();ctx.textBaseline='top';// D-63: 12px pixel font, never smaller; 3 glyphs max (36px <= 40px cell): long names show the family name, unnamed slots their role.
  crispFillText(ctx,hudPlayerNameZh(team,Number(match.id.match(/player-(\d+)$/)[1]),hudRoleAt(tiles,at)),x,y+4);
 }
 if(projected?.mode==='players')for(const address of [0x2a81,0x2a94,0x2a87,0x2a9a]){
  const at=address-0x2800,entry=MATCH_COMMAND_HINT_TEXT.find(h=>h.bytes.every((b,i)=>layout.panels[1][at+i]===b));if(!entry?.zh)continue;
  const row=at>>>5,col=at&31,x=col*8,y=row*8+start-projected.sourceY,colors={...layout,palette,activePanel:1};ctx.fillStyle=textColor(colors,row,col,2);ctx.fillRect(x,y,40,8);ctx.fillStyle=textColor(colors,row,col,1);ctx.font=zhFont();ctx.textBaseline='top';crispFillText(ctx,hudShortName(entry.zh),x,y-3);
 }
 /* the clock cell spells LOSS (4D 80 4E 4E at 0x2A2F) in stoppage time: 补时. That HUD row is its own 8px split, so the
  * two characters are 8x8 pixel glyphs like the original tiles, not the 12px font */
 if(projected?.mode==='players'){const at=0x2a2f-0x2800,t=layout.panels[1];if([0x4d,0x80,0x4e,0x4e].every((v,i)=>t[at+i]===v)){const row=at>>>5,col=at&31,x=col*8,y=row*8+start-projected.sourceY,colors={...layout,palette,activePanel:1};
  ctx.fillStyle=textColor(colors,row,col,2)/* the box's black */;ctx.fillRect(x,y,32,8);ctx.fillStyle=textColor(colors,row,col,1);
  STOPPAGE_GLYPHS.forEach((rows,k)=>rows.forEach((line,yy)=>[...line].forEach((c,xx)=>{if(c==='#')ctx.fillRect(x+7+k*9+xx,y+yy,1,1);})));}}
 if(projected?.mode==='banner'){
  const entry=STATUS_BANNER_TEXT.find(b=>{let n=0;return b.source.destinations.every((a,row)=>Array.from({length:b.source.rowLengths[row]},(_,i)=>layout.panels[1][a-0x2800+i]===b.source.tiles[n++]).every(Boolean));});
  if(entry?.zh){const row=24,col=6,x=48,y=192+start-projected.sourceY,colors={...layout,palette,activePanel:1};for(let gy=0;gy<2;gy++)for(let gx=0;gx<11;gx++){ctx.fillStyle=textColor(colors,row+gy*2,col+gx*2,2);ctx.fillRect(x+gx*16,y+gy*16,Math.min(16,168-gx*16),Math.min(16,24-gy*16));}ctx.font='16px "Noto Sans CJK SC","Microsoft YaHei",sans-serif';ctx.textBaseline='top';const w=ctx.measureText?.(entry.zh).width??entry.zh.length*16,tx=Math.round(x+(168-Math.min(168,w))/2);
   if(ctx.beginPath&&ctx.rect&&ctx.clip){for(let gy=0;gy<2;gy++)for(let gx=0;gx<11;gx++){ctx.save();ctx.beginPath();ctx.rect(x+gx*16,y+gy*16,Math.min(16,168-gx*16),Math.min(16,24-gy*16));ctx.clip();ctx.fillStyle=textColor(colors,row+gy*2,col+gx*2,1);ctx.fillText(entry.zh,tx,y+3,168);ctx.restore();}}
   else{ctx.fillStyle=textColor(colors,row,col,1);ctx.fillText(entry.zh,tx,y+3,168);}
  }
 }
 ctx.restore?.();
}

/** Stadium billboard (2026-10-19): the TECHNOS logo on the board under the scoreboard (goal / half-time / full-time) and in
 * the ending's celebration window is replaced by a Captain Tsubasa sponsor sign: a 176x28 board with rounded corners and a
 * ground shadow, the native ball F00, 足球小将 in the 12px pixel font doubled (every font pixel a 2x2 block) with a 1px
 * shadow, and a red tag reading CAPTAIN / TSUBASA. Everything is fixed 1-bit / indexed pixel data, so browser and headless
 * renders are identical. Colours are NES indices by role and follow the screen's palette fade (each fade step is -0x10). */
const SIGN=Object.freeze({
 title:['.#########.........#.#.......#........#....####','.#.......#..###....#..#......#........#.###...#','.#.......#...#..#######......#......#.#...#..#.','.#.......#...#.....#......#..#..#....##....##..','.#########...#..#..#..#...#..#...#....#.###....','.....#......###..#.#.#...#...#...#....#......#.','..#..#.......#.....##....#...#....#..##.#######','..#..#####...#....##.#..#....#....#.#.#......#.','..#..#.......##..#.#..#......#........#..#...#.','.#.###......##..#..#.........#........#...#..#.','#.....#####.......##.......###........#.....##.'],
 captain:['.###....#...####..#####...#...#####.#...#','#...#...#...#...#...#.....#.....#...##..#','#......#.#..#...#...#....#.#....#...##..#','#......#.#..#...#...#....#.#....#...#.#.#','#......###..####....#....###....#...#.#.#','#.....#...#.#.......#...#...#...#...#..##','#...#.#...#.#.......#...#...#...#...#..##','.###..#...#.#.......#...#...#.#####.#...#'],
 tsubasa:['#####..###..#...#.####....#....###....#..','..#...#...#.#...#.#...#...#...#...#...#..','..#...#.....#...#.#...#..#.#..#......#.#.','..#....##...#...#.####...#.#...##....#.#.','..#......#..#...#.#...#..###.....#...###.','..#.......#.#...#.#...#.#...#.....#.#...#','..#...#...#.#...#.#...#.#...#.#...#.#...#','..#....###...###..####..#...#..###..#...#'],
 ball:['....111111....','..1132223111..','.113222221111.','.112222221231.','13111211122231','12112221122221','12122222122221','12222222222221','11222222212221','11122222112231','.111222111211.','.132111222211.','..1131222311..','....111111....'],
 width:176,height:28,tagX:126,
 /* role -> NES index at full brightness; full = the board's own colour, used to read the current fade step */
 roles:Object.freeze({
  stadium:Object.freeze({full:0x1a,shadow:0x0a,edge:0x0f,fill:0x30,title:0x12,titleShadow:0x02,tag:0x16,tagText:0x30,ball:[null,0x0f,0x30,0x10]}),
  ending:Object.freeze({full:0x17,shadow:0x07,edge:0x07,fill:0x37,title:0x07,titleShadow:0x27,tag:0x27,tagText:0x37,ball:[null,0x07,0x37,0x27]})})});
/* the sign as a bitmap per (board colours, fade step) (2026-10-23, phone heat: it was a few thousand 1-px fillRects on every
 * paint of the scoreboard screens). Used at unit scale with integer translations (including scoreboard scrolling), where the copy lands on the same pixels */
const signBitmaps=new Map();
function drawTsubasaSign(ctx,x,y,roles,boardNow){
 const step=boardNow===0x0f?4:Math.max(0,(roles.full>>4)-(boardNow>>4)),t=ctx.getTransform?.(),plain=t&&t.a===1&&t.b===0&&t.c===0&&t.d===1&&Number.isInteger(t.e)&&Number.isInteger(t.f);
 if(plain&&ctx.drawImage){const key=(roles===SIGN.roles.ending?'e':'s')+step;let c=signBitmaps.get(key);
  if(c===undefined){const W=SIGN.width+3,H=SIGN.height+4;c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(W,H):typeof document!=='undefined'&&document.createElement?Object.assign(document.createElement('canvas'),{width:W,height:H}):null;
   const g=c?.getContext?.('2d');if(g)drawTsubasaSignPixels(g,1,1,roles,boardNow);else c=null;signBitmaps.set(key,c);}
  if(c){ctx.drawImage(c,x-1,y-1);return;}}
 drawTsubasaSignPixels(ctx,x,y,roles,boardNow);}
function drawTsubasaSignPixels(ctx,x,y,roles,boardNow){
 const step=boardNow===0x0f?4:Math.max(0,(roles.full>>4)-(boardNow>>4)),nes=c=>{const v=c-0x10*step;return DISPLAY_NES_RGB[v<0?0x0f:v];};
 const rect=(c,rx,ry,w,h)=>{ctx.fillStyle=nes(c);ctx.fillRect(rx,ry,w,h);};
 const bits=(rows,bx,by,c,scale=1)=>{ctx.fillStyle=nes(c);rows.forEach((r,yy)=>{for(let xx=0;xx<r.length;xx++)if(r[xx]==='#')ctx.fillRect(bx+xx*scale,by+yy*scale,scale,scale);});};
 const {width:W,height:H,tagX}=SIGN;
 rect(roles.shadow,x+1,y+H+1,W,2);rect(roles.edge,x,y-1,W,H+2);rect(roles.edge,x-1,y,W+2,H);rect(roles.fill,x,y,W,H);rect(roles.tag,x+tagX,y,W-tagX,H);
 SIGN.ball.forEach((r,yy)=>{for(let xx=0;xx<r.length;xx++)if(r[xx]!=='.'){ctx.fillStyle=nes(roles.ball[+r[xx]]);ctx.fillRect(x+4+xx,y+7+yy,1,1);}});
 bits(SIGN.title,x+23,y+4,roles.titleShadow,2);bits(SIGN.title,x+22,y+3,roles.title,2);
 bits(SIGN.captain,x+tagX+5,y+4,roles.tagText);bits(SIGN.tsubasa,x+tagX+5,y+16,roles.tagText);
}
/* the board under the scoreboard: TECHNOS = tiles 04-0F / 14-1F / 24-2F on rows 20-22, twelve cells from column 26 wrapping to
 * column 5 of the same panel (the band scrolls as a marquee). The sign is centred on that logo, drawn at x and x-256 so the
 * wrap reads like the original. */
const BILLBOARD_LOGO=[[20,0x04],[21,0x14],[22,0x24]];
function boardIndex(colors,image,row,col,layout){const attr=image[960+((row>>2)*8)+(col>>2)],shift=((row&2)<<1)|(col&2),pal=((attr>>shift)&3)*4;return colors.palette[pal+originalScreenTile(image[row*32+col],layout)[0]]&63;}
function drawTsubasaBillboard(ctx,{image,colors,layout}){
 const cells=[26,27,28,29,30,31,0,1,2,3,4,5];
 if(!BILLBOARD_LOGO.every(([row,base])=>cells.every((c,i)=>image[row*32+c]===base+i)))return;
 ctx.fillStyle=textColor(colors,19,8);for(const c of cells)ctx.fillRect(c*8,19*8,8,40)/* rows 19-23: row 19 holds the macron of TECHNŌS */;
 const now=boardIndex(colors,image,19,8,layout);for(const x0 of [21*8,21*8-256])drawTsubasaSign(ctx,x0,158,SIGN.roles.stadium,now);
}
/** The ending's framed celebration window shows the same band (rows 13-16 = scoreboard rows 20-23) in the sepia ending
 * palette; only the two ends of the logo are inside it (cells 26-27 and 4-5). Draw the sign in the window's own colours,
 * clipped to the board strip of the window. */
function drawTsubasaEndingBillboard(ctx,{image,colors,layout}){
 const starts=[[13,32],[14,48],[15,64]];if(!starts.every(([row,t])=>image[row*32+26]===t&&image[row*32+27]===t+1&&image[row*32+4]===t+2&&image[row*32+5]===t+3))return;
 if(!ctx.save||!ctx.clip)return;ctx.save();ctx.beginPath();ctx.rect(4*8,13*8,24*8,32);ctx.clip();
 ctx.fillStyle=textColor(colors,16,10);for(const c of [4,5,26,27])ctx.fillRect(c*8,13*8,8,24);
 const now=boardIndex(colors,image,16,10,layout);for(const x0 of [21*8,21*8-256])drawTsubasaSign(ctx,x0,106,SIGN.roles.ending,now);
 ctx.restore();
}
/** Item 8: the crowd above / beside the scoreboard and celebration screens (all three native crowd variants) is drawn from the Captain Tsubasa
 * crowd art instead, cell by cell in panel coordinates so it scrolls with the screen; frames A (arms up) and B (arms down)
 * alternate every 16 frames. The fade follows the billboard green (0x1A at full brightness). */
function drawTsubasaCrowd(ctx,{image,colors,layout,frame}){
 if(![16,17,18].includes(layout.descriptor))return;
 const step=fadeStep(boardIndex(colors,image,19,8,layout),0x1a),id=(frame>>4)&1?'crowdB':'crowdA';
 // Native animation rewrites the tile IDs. The stadium regions remain fixed.
 const regions=colors.activePanel===1?[[0,0,256,32],[0,32,32,112],[224,32,32,112]]:[[0,0,256,144]];
 const {width,height}=SCREEN_ART_SIZE[id];
 for(const [x,y,w,h] of regions)for(let dy=y;dy<y+h;){const sy=dy%height,sh=Math.min(height-sy,y+h-dy);
  for(let dx=x;dx<x+w;){const sx=dx%width,sw=Math.min(width-sx,x+w-dx);drawScreenArt(ctx,id,{dx,dy,sx,sy,sw,sh,step});dx+=sw;}dy+=sh;
 }
}
/** Item 7: the title page (screen 1). The picture covers the whole screen; the native text page underneath is not shown,
 * so its three lines are written here on the picture: the subtitle in the empty left middle, the blinking prompt where the
 * original puts it (only while its tiles are on: the blink is the original's), and the original's copyright at the bottom.
 * Fade: palette entry 1 is 0x30 at full brightness. Returns false when the screen is not the title page. */
function drawTsubasaTitle(ctx,{layout,palette}){
 const t=layout.panels[0];if(!(t.slice(0,96).every(v=>v===3)))return false;
 const step=fadeStep(palette[1]&63,0x30),ink=DISPLAY_NES_RGB[fadeNes(0x30,step)],shade=DISPLAY_NES_RGB[fadeNes(0x02,step)];
 drawScreenArt(ctx,'title',{step});if(step>=4)return true;
 const write=(text,x,y,color=ink,align='left')=>{ctx.font=zhFont();ctx.textBaseline='top';const w=ctx.measureText?.(text).width??text.length*12,tx=align==='center'?Math.round((256-w)/2):x;ctx.fillStyle=shade;crispFillText(ctx,text,tx+1,y+1);ctx.fillStyle=color;crispFillText(ctx,text,tx,y);};
 write('跨篇章联赛 · 六人制',16,104);
 const prompt=t.slice(22*32+6,22*32+6+18);if(prompt.some(v=>v!==0&&v!==3))write('♡ 请按开始键 ♡',0,174,ink,'center');
 write('原作 © 1993 TECHNOS JAPAN CORP.',0,214,DISPLAY_NES_RGB[fadeNes(0x10,step)],'center');
 return true;
}
/* a text slot's blank-tile background, as a bitmap per (slot, colours of its cells) (2026-10-23, phone heat: one 1-px
 * fillRect per pixel on every paint). The text itself is still drawn on the screen, so the web font is used as before */
const slotBitmaps=new Map();
function drawSlotBackground(ctx,colors,layout,slot,x,y,w,h){
 const blank=originalScreenTile(0x35,layout),colorAt=(xx,yy)=>textColor(colors,slot.row+(yy>>3),slot.col+(xx>>3),blank[(yy&7)*8+(xx&7)]);
 const t=ctx.getTransform?.(),plain=t&&t.a===1&&t.b===0&&t.c===0&&t.d===1&&Number.isInteger(t.e)&&Number.isInteger(t.f);
 if(plain&&ctx.drawImage){const cells=[];for(let yy=0;yy<h;yy+=8)for(let xx=0;xx<w;xx+=8)for(let k=0;k<4;k++)cells.push(textColor(colors,slot.row+(yy>>3),slot.col+(xx>>3),k));
  const key=w+'x'+h+':'+blank.join('')+':'+cells.join(',');let c=slotBitmaps.get(key);
  if(c===undefined){c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):typeof document!=='undefined'&&document.createElement?Object.assign(document.createElement('canvas'),{width:w,height:h}):null;
   const g=c?.getContext?.('2d');if(g){for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){g.fillStyle=colorAt(xx,yy);g.fillRect(xx,yy,1,1);}}else c=null;
   if(slotBitmaps.size>64)slotBitmaps.delete(slotBitmaps.keys().next().value);slotBitmaps.set(key,c);}
  if(c){ctx.drawImage(c,x,y);return;}}
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){ctx.fillStyle=colorAt(xx,yy);ctx.fillRect(x+xx,y+yy,1,1);}}
/** Draw only exact source scoreboard strings in the caller's projected panel. */
export function drawChineseScoreboardPanel(ctx,{layout,panel=0,palette=layout.palette,frame=0}){
 const seen=new Set(),image=layout.panels[panel],colors={...layout,palette,activePanel:panel};
 drawTsubasaCrowd(ctx,{image,colors,layout,frame});
 drawTsubasaBillboard(ctx,{image,colors,layout});
 for(const slot of layout.scoreboardTextSlots??[]){if(slot.panel!==panel)continue;const key=`${slot.kind}:${slot.row}:${slot.col}`;if(seen.has(key))continue;seen.add(key);const entry=SCOREBOARD_TEXT.find(x=>x.kind===slot.kind&&(x.kind!=='team'||x.teamId===slot.teamId));if(!entry||!entry.source.top.every((b,i)=>image[slot.row*32+slot.col+i]===b))continue;
  const x=slot.col*8,y=slot.row*8,w=slot.width*8,h=slot.height*8;drawSlotBackground(ctx,colors,layout,slot,x,y,w,h);ctx.fillStyle=textColor(colors,slot.row,slot.col,1);ctx.font=zhFont();ctx.textBaseline='top';const tw=ctx.measureText?.(entry.zh).width??entry.zh.length*12;crispFillText(ctx,entry.zh,Math.round(x+(w-Math.min(w,tw))/2),y+1,w);
 }
}
