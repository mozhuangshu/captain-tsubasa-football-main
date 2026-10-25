/** Read-only replacement of the four legacy 16x16 background-CHR portraits.
 * Exact source portrait tile pairs select identity, including command targets
 * and substituted players. Text, roles, arrows and numbers stay in their cells. */
import {HD_PORTRAITS} from '../art/hd-portraits.js';
import {isHudNameHolding} from './localization-zh.js';
import {FIELD_RENDER_DATA} from './field-render-data.js';
import {getPlayerIdentity,canonicalTeamId} from './tsubasa-teams.js';
import {fallbackArtId,isUnverifiedArtwork} from './tsubasa-identity.js';
const cells=[{side:0,address:0x2a42},{side:1,address:0x2a55},{side:0,address:0x2a48},{side:1,address:0x2a5b}];
const HUD_HOLD_FRAMES=20,hudMemos=new WeakMap();const hudMemo=r=>{let m=hudMemos.get(r);if(!m)hudMemos.set(r,m=new Map());return m;};
/** P-1: true while a face is being held through a panel refresh: the hold counts paints, so those paints must not be skipped */
export function isTsubasaHudHolding(r){const m=hudMemos.get(r);if(!m)return false;for(const v of m.values())if(v.age>0&&v.age<=HUD_HOLD_FRAMES)return true;return false;}
export function drawTsubasaHud(ctx,r,layout,{scale=2,palette=layout?.palette,background=null}={}){
 if(layout?.kind!=='field'||layout.hudProjection?.mode!=='players'||!(r[0x4d]&8))return [];
 const projection=layout.hudProjection,out=[];
 for(const {side,address} of cells){const at=address-0x2800,tiles=layout.panels[1],team=r[0x52c+side]&15,rows=FIELD_RENDER_DATA.numbers[team];
  const x=(address&31)*8,y=((address-0x2800)>>>5)*8+projection.hudStartY-projection.sourceY;
  let player=rows.findIndex(row=>tiles[at]===row[0]&&tiles[at+1]===row[0]+1);const memo=hudMemo(r),key=`${side}:${address}:${team}`;/* D-59: the original rewrites these tiles over several frames when the panel refreshes; hold the last face instead of blinking empty */if(player>=0)memo.set(key,{player,age:0});else{const m=memo.get(key);if(!m||++m.age>HUD_HOLD_FRAMES){/* An unresolved cell must not reveal its original CHR face. */ctx.fillStyle='#000000';ctx.fillRect(x*scale,y*scale,16*scale,16*scale);continue;}player=m.player;}
  const person=getPlayerIdentity(team,player),fallback=fallbackArtId(person.characterId),sourcePortrait=HD_PORTRAITS[person.characterId],portrait=(sourcePortrait&&!isUnverifiedArtwork(sourcePortrait)?sourcePortrait:null)??HD_PORTRAITS[fallback];
  if(!portrait)throw Error(`Missing HUD portrait: ${person.characterId}`);
  const cell=scale===2?portraitCell(ctx,portrait):null;
  if(cell)ctx.putImageData(cell,x*scale,y*scale);/* P-3: the same black box + face pixels, built once per portrait */
  else{ctx.fillStyle='#000000';ctx.fillRect(x*scale,y*scale,16*scale,16*scale);
   for(let yy=0;yy<portrait.height;yy++)for(let xx=0;xx<portrait.width;xx++){const v=parseInt(portrait.front[yy][xx],16);if(!v)continue;ctx.fillStyle=portrait.palette[v];ctx.fillRect((x+xx/2)*scale,(y+1+yy/2)*scale,scale/2,scale/2);}}
  out.push({side,teamId:canonicalTeamId(team),playerNumber:player,characterId:person.characterId,artCharacterId:portrait.id,x,y,width:16,height:16});
 }
 drawHudLeftEdge(ctx,projection,scale,{background,key:isHudNameHolding(r)?null:`${scale}|${JSON.stringify(projection)}|${out.map(p=>p.artCharacterId+':'+p.x+':'+p.y).join(',')}|${hudPanelKey(layout,r,palette)}`});
 return out;
}
/** P-3 (2026-10-22): one HUD cell as RGBA at scale 2: the 32x32 black box with the face 1px down, the exact pixels the
 * fillRect path draws. Only for an identity transform with plain #RRGGBB face colours; anything else keeps fillRect. */
const cellCache=new Map();
function portraitCell(ctx,portrait){if(typeof ctx.createImageData!=='function'||typeof ctx.putImageData!=='function')return null;const m=ctx.getTransform?.();if(m&&!(m.a===1&&m.b===0&&m.c===0&&m.d===1&&m.e===0&&m.f===0))return null;
 if(cellCache.has(portrait.id))return cellCache.get(portrait.id);let cell=ctx.createImageData(32,32);const d=cell.data;for(let i=3;i<d.length;i+=4)d[i]=255;
 for(let yy=0;yy<portrait.height;yy++)for(let xx=0;xx<portrait.width;xx++){const v=parseInt(portrait.front[yy][xx],16);if(!v)continue;const c=portrait.palette[v];if(!/^#[0-9a-f]{6}$/i.test(c)){cell=null;break;}const py=2+yy;if(py>=32||xx>=32)continue;const at=(py*32+xx)*4;d[at]=parseInt(c.slice(1,3),16);d[at+1]=parseInt(c.slice(3,5),16);d[at+2]=parseInt(c.slice(5,7),16);}
 cellCache.set(portrait.id,cell);return cell;}
/** what the HUD rows of the left-edge scan see besides the faces: the tiles, attributes, palettes and HUD mode */
/* HUD source rows: panel 1 tile rows 16-29 (players 130-184, banner 186-239) and their attribute rows 4-7; banner row 240 wraps to panel 0 row 0 */
const HUD_TILE_BYTES=[[1,16*32,30*32],[1,960+4*8,960+8*8],[0,0,32],[0,960,968]];
function hudPanelKey(layout,r,palette){let h=2166136261;const mix=v=>{h^=v;h=Math.imul(h,16777619);};for(const [p,from,to] of HUD_TILE_BYTES){const b=layout.panels?.[p];if(b)for(let i=from;i<to;i++)mix(b[i]);}for(const v of layout.palette??[])mix(v);/* the palette in use (fades / flashes) */for(const v of palette??[])mix(v);for(const v of layout.chrPages??[])mix(v);mix(r[0x4d]);mix(r[0x59]);mix(r[0x5c]);mix(r[0x52c]);mix(r[0x52d]);return h>>>0;}
/** D-59: the NES masks the leftmost 8px, which cut the left HUD panel's border off and left names touching a green bar. Close the box in that masked column. */
/* P-3: the scan reads rows 170-239 at x=20..35. Rows above the HUD are pitch, nothing but the background just drawn
 * (the name overlay is clipped to the HUD), so they are read from that background buffer; the HUD rows do not move
 * with the camera, so their read-back is kept per key (projection, faces, HUD tiles / palette). No background buffer:
 * read everything back as before, uncached. */
let edgeKey=null,edgeHudRows=null;
function drawHudLeftEdge(ctx,projection,scale,{key=null,background=null}={}){if(!ctx.getImageData)return;/* find the panel's own top/bottom border rows at x=20 (white), so the edge matches every HUD projection *//* D-62b: only rows whose x=20..35 run is solid white count as border rows (stray white text/pixels lower down made the edge run to the canvas bottom) */
 const bg=background&&scale===2?background.image.data:null,split=bg?Math.max(170,Math.min(240,projection.hudStartY)):170,w=[];
 if(bg)for(let y=170;y<split;y++){let solid=true;for(let x=0;x<16&&solid;x++){const i=(y*256+20+x)*4;solid=bg[i]+bg[i+1]+bg[i+2]>600;}if(solid)w.push(y);}
 const cacheable=bg&&key!==null;if(!(cacheable&&key===edgeKey)){edgeKey=cacheable?key:null;edgeHudRows=[];if(split<240){const d=ctx.getImageData(20*scale,split*scale,16*scale,(240-split)*scale).data,W=16*scale;for(let y=split;y<240;y++){let solid=true;for(let x=0;x<16&&solid;x++){const i=((y-split)*scale*W+x*scale)*4;solid=d[i]+d[i+1]+d[i+2]>600;}if(solid)edgeHudRows.push(y);}}}
 w.push(...edgeHudRows);if(w.length<2)return;const top=w[0],bottom=w.find(y=>y-top>=30);if(bottom==null)return;if(bottom-top<30)return;paintHudLeftEdge(ctx,{top,bottom},scale);}
function paintHudLeftEdge(ctx,{top,bottom},scale){ctx.fillStyle='#000000';ctx.fillRect(0,(top-1)*scale,8*scale,(bottom-top+3)*scale);ctx.fillStyle='#fcfcfc';ctx.fillRect(6*scale,(top+1)*scale,scale,(bottom-top-1)*scale);ctx.fillRect(7*scale,top*scale,scale,scale);ctx.fillRect(7*scale,bottom*scale,scale,scale);}
