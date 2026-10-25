import {createPixelBatch} from './platform/pixel-batch.js';
/** 原E3D9/E481/E4AF/E538/E5A1与bank03:A995，直接转换资料与游戏状态。
 * 不执行ROM，不模拟CPU/PPU；地址仅用于原资料来源及原游戏暂存字段。 */
import {TERRAIN_ROWS,TERRAIN_LAYOUTS,TERRAIN_ROW_POINTERS} from './terrain.js';
import {FIELD_RENDER_DATA as D,FIELD_CHR_PAGES} from './field-render-data.js';
import {BACKGROUND_PALETTE_GROUPS} from './sprite-background-palettes.js';
import {decodeChrTile} from './input-sprites.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
import {applyMenuTileRun,createScreenLayout} from './screen-loader.js';
export {FIELD_RENDER_DATA,FIELD_CHR_PAGES} from './field-render-data.js';
function pair(r,a,v){r[a]=v&255;r[a+1]=v>>>8;}
function check(r,l){if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('需要完整游戏状态');if(!l?.panels?.[1])throw new TypeError('需要双页画面');}
function key(r,page){return `${r[0x5f3]}:${r[0x5e5]}:${(r[0x5f1]>>>page)&1}`;}
function selected(r,page,attrs){if(page>8)throw new RangeError('原场地页超出已验证资料');const k=page===8?`${r[0x5f3]}:${r[0x5e5]}:1`:key(r,page),actualPage=page===8?0:page,p=(attrs?D.attributePointers:TERRAIN_ROW_POINTERS)[k];if(!p)throw new RangeError('尚未恢复此场地配置');return {key:k,page:actualPage,pointer:p[actualPage]};}
function selectPair(r,page,attrs){
 const a=selected(r,page,attrs),b=selected(r,page+1,attrs);r[0x22]=page+1;r[0x28]=((r[0x5f1]>>>(page+1))&1)*16;r[0x29]=r[0x5f1]>>>(page+2);pair(r,0x2e,a.pointer);pair(r,0x30,b.pointer);return [a,b];
}
function rows(r,l,page,count,attrs){
 const [a,b]=selectPair(r,page,attrs),size=attrs?8:32;
 r[0x1d]=count;r[0x20]=attrs?(page<4?0x23:0x2b):(page<4?0x20:0x28);r[0x1f]=r[0x1c];r[0x1e]=0;
 for(let row=0;row<count;row++){
  let use=a;r[0x21]=0;pair(r,0x32,use.pointer);
  for(let col=0;col<size;col++){
   let value;
   if(attrs)value=D.attributes[use.key][use.page][r[0x1f]-0xc0];
   else {const rowKey=TERRAIN_LAYOUTS[use.key][use.page][row];pair(r,0x34,Number(rowKey.split(':')[1]));value=TERRAIN_ROWS[rowKey][r[0x1f]&31];}
   applyMenuTileRun(l,(r[0x20]<<8)|r[0x1f],[value]);r[0x21]++;
   r[0x1f]++;if((r[0x1f]&(size-1))===0){r[0x1f]-=size;if(col!==size-1){use=b;pair(r,0x32,b.pointer);}}
  }
  r[0x1e]++;if(row!==count-1){const next=r[0x1f]+size;r[0x1f]=next&255;if(!attrs)r[0x20]+=next>>>8;}
 }
}
export function renderInitialField_E3D9(r,layout=createScreenLayout()){
 check(r,layout);if(r[0xed]>3||(r[0xed]===3&&r[0xec]!==0))throw new RangeError('E3D9右侧初始视口超出已验证范围');
 r[0x4c]&=0xfb;layout.mirroring=1;layout.kind='field';layout.descriptor='field';
 pair(r,0x2c,r[0x5e5]?0x8034:0x8024);r[0x1c]=r[0xec]>>>3;
 rows(r,layout,r[0xed],30,false);rows(r,layout,r[0xed]+4,16,false);
 pair(r,0x2c,D.attributeRoots[`${r[0x5f3]}:${r[0x5e5]}`]);r[0x1c]=0xc0+(r[0xec]>>>5);
 rows(r,layout,r[0xed],8,true);rows(r,layout,r[0xed]+4,4,true);
 applyMenuTileRun(layout,0x2a00,D.hudBase);applyMenuTileRun(layout,0x2ae0,new Uint8Array(224).fill(15));
 applyMenuTileRun(layout,0x2be0,new Uint8Array(32).fill(0xaa));applyMenuTileRun(layout,0x2be0,D.hudAttributes);
 layout.chrPages=[r[0x5bc]&254,(r[0x5bc]&254)+1,r[0x5bd]&254,(r[0x5bd]&254)+1];
 const p=BACKGROUND_PALETTE_GROUPS[r[0x5ac]],q=BACKGROUND_PALETTE_GROUPS[r[0x5ad]];if(!p||!q)throw new RangeError('原场地调色板不存在');
 layout.palette=Uint8Array.from([...p,...q]);for(let i=4;i<16;i+=4)layout.palette[i]=layout.palette[0];
 layout.cameraAtLoad=[r[0xec],r[0xed],r[0xee],r[0xef]];return layout;
}
/** A995显示的是两侧当前球员，不是比分/队名。 */
export function renderMatchHud_Bank03_A995(r,layout){
 check(r,layout);r[0x4c]&=0xfb;layout.hudLabels=[];
 for(let side=0;side<2;side++){
  const team=r[0x52c+side]&15,penalty=!!(r[0x57]&32),defending=!!((side^r[0x5cc])&1);
  const player=penalty?(defending?r[0x53c+side]:(r[0x5cc]&127)>>>1):r[0x532+side];
  const name=D.names[team]?.[player],number=D.numbers[team]?.[player];if(!name||!number)throw new RangeError('当前球员姓名索引超出原表');
  pair(r,0x2e,D.namePointers[team]+player*5);pair(r,0x32,D.numberPointers[team]+player*2);
  r.fill(0xfa,0x1c,0x21);
  for(let i=0;i<5;i++){const v=name[i];r[0x2b]=v<0x50?v+0x80:v<0x80?v+0x50:v;if(v<0x80)r[0x1c+i]=v<0x50?0xfb:0xfc;r[0x21+i]=r[0x2b];}
  r[0x26]=number[0];r[0x27]=number[0]+1;r[0x28]=number[1];
  const dest=n=>0x2a00+D.hudDestinations[n*2+side];
  applyMenuTileRun(layout,dest(0),r.slice(0x1c,0x21));applyMenuTileRun(layout,dest(1),r.slice(0x21,0x26));
  applyMenuTileRun(layout,dest(2),[penalty?255:r[0x52c+side]&128?0x4c:0x3e+side,r[0x26],r[0x27]]);
  applyMenuTileRun(layout,dest(3),[r[0x28]]);
  const slot=penalty?(defending?side+10:r[0x5cc]&127):side,control=(r[0x650+slot]&0x30)>>>3;
  applyMenuTileRun(layout,dest(4),[D.controls[control],D.controls[control+1],...(!penalty?[0xdc]:[])]);applyMenuTileRun(layout,dest(5),[12,13]);
  layout.hudLabels.push({side,team,player,nameAddress:dest(0),lowerAddress:dest(1),upper:[...r.slice(0x1c,0x21)],lower:[...r.slice(0x21,0x26)]});
 }
 return layout;
}
export function createFieldRenderServices(layout){return {renderInitialField_E3D9:r=>renderInitialField_E3D9(r,layout),renderMatchHud_Bank03_A995:r=>renderMatchHud_Bank03_A995(r,layout)};}
const cache=new Map();
export function originalFieldTile(tile,pages){const page=pages[tile>>>6],id=page*64+(tile&63);if(!cache.has(id)){const hex=FIELD_CHR_PAGES[page];if(!hex)throw new RangeError(`未提取场地CHR页 ${page}`);const at=(tile&63)*32;cache.set(id,decodeChrTile(Array.from({length:16},(_,i)=>parseInt(hex.slice(at+i*2,at+i*2+2),16))));}return cache.get(id);}
export function fieldHudPatternPages(r){const first=r[0x52d]&64?6:4;return [first,first+1,2,3];}
/** 完整双页资料审阅图。下页row16起用原FD4C的HUD字形组；不是最终IRQ屏幕投影。 */
export function drawFieldPanels(ctx,r,layout,{palette=layout.palette,scale=1}={}){
 const batch=createPixelBatch(ctx,256,480,{scale});
 for(let p=0;p<2;p++)for(let y=0;y<240;y++)for(let x=0;x<256;x++){
  const color=fieldPixel(layout,p,x,y,p===1&&y>=128?fieldHudPatternPages(r):layout.chrPages,palette);
  batch.pixel(x,y+p*240,color);
 }
 batch.flush();
}
function fieldPixel(layout,p,x,y,pages,palette,mask=null,maskAt=0){const col=x>>>3,row=y>>>3,bytes=layout.panels[p],tile=originalFieldTile(bytes[row*32+col],pages),attr=bytes[960+(row>>>2)*8+(col>>>2)],shift=((row&2)<<1)|(col&2),index=tile[(y&7)*8+(x&7)],pal=index?((attr>>>shift)&3)*4+index:0;if(mask)mask[maskAt]=index?1:0;return DISPLAY_NES_RGB[palette[pal]&63];}
/** 从公开原游戏像素截图量取的稳定分屏：224行可视截图HUD黑行177、顶框178。
 * 对应240行坐标185/186；源$2A00含fineY=2，因此源Y130映射屏幕185。
 * 硬件IRQ入口相位/边缘半扫描线未声称逐像素等价；见docs/DEVELOPMENT.md。
 */
export const FIELD_VIEWPORT={width:256,height:240,hudStartY:185,hudSourceY:130,croppedHeight:224,cropTop:8,evidence:'field-render-visual-measurements.json'};
export function fieldHudMode(r){return r[0x59]===1||(r[0x59]===3&&((r[0x5c]&3)|r[0x559]|r[0x55b]))?'banner':'players';}
/* One decoded background per context, separate from the shared pixel-batch buffer. Weather
 * changes OAM at native frequency while these inputs stay unchanged. Compare actual bytes
 * (no hash collisions), and keep a bounded snapshot of the pixels and occlusion mask. */
const fieldScreens=new WeakMap();
const sameBytes=(a,b)=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
export function drawFieldScreen(ctx,r,layout,{palette=layout.palette,fieldOnly=false,cropTop=0,height=240}={}){
 const banner=fieldHudMode(r)==='banner',hudPages=banner?[0,1,16,17]:fieldHudPatternPages(r);
 // Read-only presentation metadata, sharing exactly the renderer's projection.
 layout.hudProjection={mode:banner?'banner':'players',cropTop,hudStartY:FIELD_VIEWPORT.hudStartY-cropTop,sourceY:banner?186:130,fieldOnly,height};
 layout.rasterVerification='公开截图验证稳定布局；IRQ边界扫描线未声明硬件逐像素等价';
 for(const label of layout.hudLabels??[]){label.screenX=(label.nameAddress&31)*8;label.screenY=banner||fieldOnly?undefined:183-cropTop;}
 const mask=layout.backgroundOpaque?.length===256*height?layout.backgroundOpaque:new Uint8Array(256*height);mask.fill(0);layout.backgroundOpaque=mask;layout.backgroundMaskWidth=256;layout.backgroundMaskHeight=height;
 const batch=createPixelBatch(ctx,256,height);
 if(batch.batched){
  const inputs=[r[0xec],r[0xee],r[0xef]&1,r[0x4d]&10,fieldOnly,cropTop,height,banner,...hudPages,...layout.chrPages,...palette];
  let saved=fieldScreens.get(ctx);
  if(saved&&sameBytes(saved.inputs,inputs)&&layout.panels.length===saved.panels.length&&saved.panels.every((p,i)=>sameBytes(p,layout.panels[i]))){batch.data.set(saved.pixels);mask.set(saved.mask);batch.last(saved.color);batch.flush();return layout;}
  fastFieldPixels(batch,r,layout,{palette,fieldOnly,cropTop,height,banner,hudPages,mask});if(!(r[0x4d]&8))mask.fill(0);batch.flush();
  if(!saved||saved.pixels.length!==batch.data.length)saved={pixels:new Uint8ClampedArray(batch.data.length),mask:new Uint8Array(mask.length)};
  saved.inputs=inputs;saved.panels=layout.panels.map(p=>Uint8Array.from(p));saved.pixels.set(batch.data);saved.mask.set(mask);saved.color=ctx.fillStyle;fieldScreens.set(ctx,saved);return layout;
 }
 for(let y=0;y<height;y++)for(let x=0;x<256;x++){
  let color;
  const screenY=y+cropTop,isHud=!fieldOnly&&screenY>=FIELD_VIEWPORT.hudStartY;
  // D-59 display-only: the NES left-8 mask column showed the stage backdrop (e.g. orange on mud) as a strip beside the pitch; paint the whole column off-field black (pitch + HUD rows). RAM untouched.
  if(x<8&&!(r[0x4d]&2))color=DISPLAY_NES_RGB[0x0f];
  else if(isHud){const sourceY=(banner?186:130)+screenY-185;color=fieldPixel(layout,(1+Math.floor(sourceY/240))&1,x,sourceY%240,hudPages,palette,mask,y*256+x);}
  else {const worldY=r[0xee]+(r[0xef]&1)*240+screenY,p=Math.floor(worldY/240)&1;color=fieldPixel(layout,p,(r[0xec]+x)&255,worldY%240,layout.chrPages,palette,mask,y*256+x);}
  batch.pixel(x,y,color);
 }
 if(!(r[0x4d]&8))mask.fill(0);
 batch.flush();
 return layout;
}
/** P-2 (2026-10-22): the same pixels, mask and last fill colour as the per-pixel loop below, written straight into the
 * batch's RGBA buffer: the 16 palette colours are resolved once per paint and a tile is looked up once per 8 pixels. */
function fastFieldPixelsPerTile(batch,r,layout,{palette,fieldOnly,cropTop,height,banner,hudPages,mask}){
 const data=batch.data,rgb=[],black=batch.rgba(DISPLAY_NES_RGB[0x0f]),leftBlack=!(r[0x4d]&2);
 for(let i=0;i<16;i++)rgb.push(batch.rgba(DISPLAY_NES_RGB[palette[i]&63]));
 let lastColor=null;
 for(let y=0;y<height;y++){
  const screenY=y+cropTop,isHud=!fieldOnly&&screenY>=FIELD_VIEWPORT.hudStartY;let p,ty,pages,scrollX;
  if(isHud){const sourceY=(banner?186:130)+screenY-185;p=(1+Math.floor(sourceY/240))&1;ty=sourceY%240;pages=hudPages;scrollX=0;}
  else{const worldY=r[0xee]+(r[0xef]&1)*240+screenY;p=Math.floor(worldY/240)&1;ty=worldY%240;pages=layout.chrPages;scrollX=r[0xec];}
  const bytes=layout.panels[p],row=ty>>>3,fy=(ty&7)*8,rowBase=row*32,attrBase=960+(row>>>2)*8,rowShift=(row&2)<<1;
  let col=-1,tile=null,attrPal=0;
  for(let x=0,at=y*1024,m=y*256;x<256;x++,at+=4,m++){
   let c;
   if(x<8&&leftBlack){c=black;lastColor=0x0f;}
   else{const sx=(scrollX+x)&255,tc=sx>>>3;if(tc!==col){col=tc;tile=originalFieldTile(bytes[rowBase+tc],pages);attrPal=((bytes[attrBase+(tc>>>2)]>>>(rowShift|(tc&2)))&3)*4;}
    const index=tile[fy+(sx&7)],pal=index?attrPal+index:0;mask[m]=index?1:0;c=rgb[pal];lastColor=palette[pal]&63;}
   data[at]=c[0];data[at+1]=c[1];data[at+2]=c[2];data[at+3]=255;}
 }
 if(lastColor!==null)batch.last(DISPLAY_NES_RGB[lastColor]);
}
/** Tile-row strips (2026-10-23, phone heat): a row of 32 tiles with its attributes, CHR pages and palette always draws the
 * same 256x8 strip, so each strip is drawn once and a paint copies one strip line per screen row (wrapping at the scroll),
 * one 32-bit write per pixel. Same pixels, mask and last colour as fastFieldPixelsPerTile, which stays for big-endian hosts. */
const LITTLE_ENDIAN=new Uint8Array(new Uint32Array([1]).buffer)[0]===1,stripCache=new Map(),u32Views=new WeakMap();
function fieldStrip(bytes,row,pages,palette,rgb32){
 const rowBase=row*32,attrBase=960+(row>>>2)*8,rowShift=(row&2)<<1;let key=pages.join(',')+'|'+rowShift+'|';
 for(let i=0;i<16;i++)key+=palette[i]+',';for(let i=0;i<32;i++)key+=bytes[rowBase+i]+',';for(let i=0;i<8;i++)key+=bytes[attrBase+i]+',';
 let strip=stripCache.get(key);if(strip){stripCache.delete(key);stripCache.set(key,strip);return strip;}
 const px=new Uint32Array(256*8),mask=new Uint8Array(256*8),pal=new Uint8Array(256*8);
 for(let tc=0;tc<32;tc++){const tile=originalFieldTile(bytes[rowBase+tc],pages),attrPal=((bytes[attrBase+(tc>>>2)]>>>(rowShift|(tc&2)))&3)*4;
  for(let fy=0;fy<8;fy++)for(let fx=0;fx<8;fx++){const index=tile[fy*8+fx],p=index?attrPal+index:0,at=fy*256+tc*8+fx;px[at]=rgb32[p];mask[at]=index?1:0;pal[at]=p;}}
 strip={px,mask,pal};stripCache.set(key,strip);if(stripCache.size>512)stripCache.delete(stripCache.keys().next().value);return strip;}
function fastFieldPixels(batch,r,layout,options){
 const data=batch.data;if(!LITTLE_ENDIAN||data.byteOffset%4)return fastFieldPixelsPerTile(batch,r,layout,options);
 const {palette,fieldOnly,cropTop,height,banner,hudPages,mask}=options;
 let out=u32Views.get(data);if(!out){out=new Uint32Array(data.buffer,data.byteOffset,data.length>>2);u32Views.set(data,out);}
 const pack=c=>(255<<24|c[2]<<16|c[1]<<8|c[0])>>>0,rgb32=new Uint32Array(16),black=pack(batch.rgba(DISPLAY_NES_RGB[0x0f])),leftBlack=!(r[0x4d]&2);
 for(let i=0;i<16;i++)rgb32[i]=pack(batch.rgba(DISPLAY_NES_RGB[palette[i]&63]));
 let lastColor=null,lastKey=-1,strip=null;/* 8 screen rows share a tile row: look the strip up once for them */
 for(let y=0;y<height;y++){
  const screenY=y+cropTop,isHud=!fieldOnly&&screenY>=FIELD_VIEWPORT.hudStartY;let p,ty,pages,scrollX;
  if(isHud){const sourceY=(banner?186:130)+screenY-185;p=(1+Math.floor(sourceY/240))&1;ty=sourceY%240;pages=hudPages;scrollX=0;}
  else{const worldY=r[0xee]+(r[0xef]&1)*240+screenY;p=Math.floor(worldY/240)&1;ty=worldY%240;pages=layout.chrPages;scrollX=r[0xec];}
  const sk=(isHud?64:0)+p*32+(ty>>>3);if(sk!==lastKey){strip=fieldStrip(layout.panels[p],ty>>>3,pages,palette,rgb32);lastKey=sk;}
  const line=(ty&7)*256,dst=y*256,first=256-scrollX;
  out.set(strip.px.subarray(line+scrollX,line+256),dst);mask.set(strip.mask.subarray(line+scrollX,line+256),dst);
  if(scrollX){out.set(strip.px.subarray(line,line+scrollX),dst+first);mask.set(strip.mask.subarray(line,line+scrollX),dst+first);}
  if(leftBlack){out.fill(black,dst,dst+8);mask.fill(0,dst,dst+8);}
  if(y===height-1)lastColor=leftBlack&&255<8?0x0f:palette[strip.pal[line+((scrollX+255)&255)]]&63;}
 if(lastColor!==null)batch.last(DISPLAY_NES_RGB[lastColor]);
}
/** DED3..E152：以旧相机EC/ED与待提交相机F0/F1判断跨瓦片；只写原队列。 */
export function updateFieldScroll_DED3(r){
 const old=r[0xec]|r[0xed]<<8,next=r[0xf0]|r[0xf1]<<8;r[0x1d]=((old-next)&65535)>>>8;
 const movingRight=!!(r[0x1d]&128);let test;
 if(movingRight){r[0x27]=((r[0xf0]-1)&255)&248;test=((((r[0xec]-1)&255)|7)-r[0x27])&255;}
 else {r[0x27]=r[0xec]&248;test=((r[0xf0]|7)-r[0x27])&255;}
 if(!(test&128))return false;
 const edge=next+(movingRight?255:8);r[0x1e]=(edge&255)>>>3;r[0x1f]=(edge>>>8)&255;r[0x58e]=r[0x1e];r[0x58d]=r[0x1e]+128;
 const root=r[0x40]|r[0x41]<<8,cov=root===0x8024?0:root===0x8034?1:-1;if(cov<0)throw new RangeError('未恢复场地瓦片根指针');
 const table=(page,attrs=false)=>{
  if(page>7)throw new RangeError('滚动页超出原场地资料');
  r[0x28]=((r[0x5f1]>>>page)&1)*16;r[0x29]=r[0x5f1]>>>(page+1);
  const k=`${r[0x5f3]}:${attrs?r[0x5e5]:cov}:${r[0x28]?1:0}`,ptrs=attrs?D.attributePointers[k]:TERRAIN_ROW_POINTERS[k];
  if(!ptrs)throw new RangeError('未恢复滚动场地配置');pair(r,attrs?0x2e:0x2c,ptrs[page]);return {k,page};
 };
 for(const [page,start,count,at] of [[r[0x1f],4,26,0x142],[r[0x1f]+4,0,16,0x15c]]){
  r[0x1f]=page;const t=table(page);
  for(let i=0;i<count;i++){const rk=TERRAIN_LAYOUTS[t.k][page][i+start];pair(r,0x2e,+rk.split(':')[1]);r[at+i]=TERRAIN_ROWS[rk][r[0x1e]];}
 }
 r[0x5ab]|=128;if(!(r[0x58d]&1))return true;
 if(!movingRight){r[0x1f]=r[0xf1];r[0x21]=r[0xf1];r[0x1e]=r[0xf0]>>>5;r[0x20]=r[0x22]=r[0x1e];if(r[0x58d]&2)r[0x1f]++;}
 else {const n=(next-1)&65535;r[0x27]=n&255;r[0x1f]=r[0x21]=n>>>8;r[0x1e]=(n&255)>>>5;r[0x20]=r[0x22]=r[0x1e];if(r[0x58d]&2)r[0x1f]++;r[0x21]++;}
 r[0x23]=r[0x58d]&2?0x33:0xcc;r[0x24]=r[0x23]^255;pair(r,0x2c,D.attributeRoots[`${r[0x5f3]}:${r[0x5e5]}`]);
 for(const [page,count,start,at,mask,merge] of [[r[0x1f],7,8,0x59a,r[0x23],false],[r[0x1f]+4,4,0,0x5a1,r[0x23],false],[r[0x21],7,8,0x59a,r[0x24],true],[r[0x21]+4,4,0,0x5a1,r[0x24],true]]){
  const t=table(page,true);r[0x26]=r[0x1e];for(let i=0;i<count;i++){const index=r[0x1e]+start+i*8,v=D.attributes[t.k][page][index]&mask;r[at+i]=merge?r[at+i]|v:v;}
  r[0x26]=r[0x1e]+(count*8); // both loops end at +56 / +32
 }
 r[0x1f]+=4;r[0x21]+=4;
 r[0x25]=r[0x22]+0xc8;for(let i=0;i<7;i++){r[0x58f+i]=r[0x25];r[0x25]+=8;}
 r[0x25]=r[0x22]+0xc0;for(let i=0;i<4;i++){r[0x596+i]=r[0x25];r[0x25]+=8;}
 r[0x5ab]|=64;return true;
}
/** F0CE..F165：仅在原绘制队列标志存在时消费队列，未合并HUD/进球分支。 */
export function commitFieldScroll_F0CE(r,layout){
 if(!(r[0x5ab]&128))return false;r[0x4c]|=4;
 applyMenuTileRun(layout,0x2000+r[0x58d],r.slice(0x142,0x15c),{vertical:true});
 applyMenuTileRun(layout,0x2800+r[0x58e],r.slice(0x15c,0x16c),{vertical:true});r[0x5ab]&=127;
 if(r[0x5ab]&64){for(let i=0;i<7;i++)applyMenuTileRun(layout,0x2300+r[0x58f+i],[r[0x59a+i]]);for(let i=0;i<4;i++)applyMenuTileRun(layout,0x2b00+r[0x596+i],[r[0x5a1+i]]);}
 r[0x5ab]&=191;return true;
}
