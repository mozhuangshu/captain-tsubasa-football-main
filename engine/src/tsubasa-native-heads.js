/** Edited heads on the ORIGINAL Nekketsu bodies (2026-10-18). The image model repaints the head on nine
 * native sprites (runtime-art-data); tools/ingest-head-edits.mjs keeps, per edited frame, only what
 * it changed in the head zone, anchored on a native head tile (art/head-edits.js). Here every one of the 83
 * frames is drawn from native tiles the way the game draws it, and the edited head is put on it the way
 * the game puts its head tiles: at that frame's head tile, with that tile's flips. So one edited head per
 * direction covers every pose, and the body is always the original one.
 *
 * Head marks (rows over a box in the anchor tile's canonical HD space): '.' not the head, '0' the edit
 * erased it, hex = colour index in the character's head palette. */
import {ALL_PLAYER_FRAMES} from './sprite-frames.js';
import {appearanceTile} from './sprite-appearance.js';
import {HEAD_TILES} from './input-sprites.js';
const s8=v=>v>127?v-256:v,CHR={chrPages:[8,20,32,9]},CHR_CEREMONY={chrPages:[8,20,32,17]};
/** sprite CHR pages per frame: the game swaps its 4th sprite page per scene (RAM 0x5b8-0x5bb). Match poses
 * read page 9; frames 65-79 (celebration / ceremony poses) read page 17 — drawn with page 9 their tiles
 * are HUD digits and boxes. Measured: silhouette overlap with the HD frames 0.60-0.80 on page 9, 0.89-0.94
 * on page 17, while match frames drop to 0.66 on page 17. */
export const frameChr=f=>f>=65&&f<=79?CHR_CEREMONY:CHR;
/** native tiles that are the head (character head tiles 0-5; 53/56 the shared looking-down head) */
export const NATIVE_HEAD_TILES=Object.freeze(new Set([0,1,2,3,4,5,53,56]));
/** placed cells of native frame f in HD-art world coords (the HD art is mirrored against native) */
export function nativeCells(f){const n=ALL_PLAYER_FRAMES[f];if(!n)return [];return n.tiles.map((t,i)=>{const a=n.attributes[i];return {i,t,wx:-(s8(n.dx[i])+8),wy:s8(n.dy[i])+1,h:!!(a&64),v:!!(a&128),p:a&3};});}
/** HD local (lx,ly) of a cell <-> canonical tile space (cx,cy); works outside the 16x16 too, and is its own inverse */
const flipX=(c,lx)=>c.h?lx:15-lx,flipY=(c,ly)=>c.v?15-ly:ly;
/** the original sprite of frame f (native tiles, head variant 0) in the HD frame's canvas: each native
 * pixel is a 2x2 block. Native colours 1 outline / 2 kit / 3 skin map to palette indices 1 / 2 / 3, and kit
 * pixels take the shirt/shorts/socks/trim split of the HD frame at the same place. owner[y][x] is the
 * index of the front-most tile drawn there (-1 none). */
/* colour 2 of sprite palette 0 (head tiles, the shared kick / cheer faces) is the eye white: the skin palette's lightest
 * neutral entry (its index 2 is the kit base, a team colour for some) */
const whites=new WeakMap(),eyeWhite=skin=>{if(whites.has(skin))return whites.get(skin);let b='2',bl=-1;skin.palette.forEach((c,k)=>{if(!c||!k||k>15)return;const [r,g,bb]=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),l=.3*r+.59*g+.11*bb;if(Math.max(r,g,bb)-Math.min(r,g,bb)<30&&l>bl){bl=l;b=k.toString(16);}});whites.set(skin,b);return b;};
export function nativeFrame(skin,f){const a=skin.frames[f],W=a.width,H=a.height,px=Array.from({length:H},()=>Array(W).fill('0')),owner=Array.from({length:H},()=>Array(W).fill(-1));
 const cells=nativeCells(f),chr=frameChr(f);for(let k=cells.length-1;k>=0;k--){const c=cells[k],t=c.t<6?HEAD_TILES[c.t]:c.t,p=appearanceTile(t,chr);
  for(let ly=0;ly<16;ly++)for(let lx=0;lx<16;lx++){const val=p[(flipY(c,ly)>>1)*8+(flipX(c,lx)>>1)];if(!val)continue;const X=Math.round((c.wx-a.originX)*2)+lx,Y=Math.round((c.wy-a.originY)*2)+ly;if(X<0||Y<0||X>=W||Y>=H)continue;px[Y][X]=c.p===0&&val===2?eyeWhite(skin):String(val);owner[Y][X]=c.i;}}
 const kit=[];a.materials.forEach((r,y)=>[...r].forEach((m,x)=>{if(m!=='0')kit.push([x,y,m]);}));
 /* colour 2 is kit only in the body palette; in sprite palette 0 (head tiles, the shared kick / cheer faces) it is the eye white */
 const pal0=new Set(cells.filter(c=>c.p===0).map(c=>c.i));
 const mat=px.map((r,y)=>r.map((v,x)=>{if(v!=='2'||pal0.has(owner[y][x]))return '0';const m=a.materials[y]?.[x];if(m&&m!=='0')return m;let b='1',bd=1e9;for(const [kx,ky,km] of kit){const d=(kx-x)**2+(ky-y)**2;if(d<bd){bd=d;b=km;}}return b;}));
 return {...a,pixels:px.map(r=>r.join('')),materials:mat.map(r=>r.join('')),shade:px.map(r=>r.map(v=>v==='2'?'1':'0').join('')),native:true,owner};}
/** frames the native render does not match (overlap with the HD frame below 0.84; the rest are 0.85-0.96):
 * 35/61 lying and 36/37 on the ground, whose HD art was drawn differently. They keep the HD art; tests
 * recompute the list. */
export const NATIVE_UNRELIABLE_FRAMES=Object.freeze(new Set([35,36,37,61]));
/** the head tile a frame's head is anchored on: its first (front-most) head tile */
export function headAnchor(f){return nativeCells(f).find(c=>NATIVE_HEAD_TILES.has(c.t))??null;}
/** the kicking head 53/56 (frames 15, 50-53) sits exactly where the 3/4 head 0/1 sits in the standing
 * frames; its own art is a small spiky down-turned head that the image model cannot edit into the
 * character (cell 5 came back wrong for everyone), so it takes the 3/4 head like the HD art does */
export const HEAD_TILE_ALIAS=Object.freeze({53:0,56:1});
const alias=t=>HEAD_TILE_ALIAS[t]??t;
const headSet=f=>nativeCells(f).filter(c=>NATIVE_HEAD_TILES.has(c.t)).map(c=>alias(c.t)).sort((a,b)=>a-b).join(',');
/** tiles around the head relative to the anchor, to pick the edited frame that looks most alike */
function around(f){const a=headAnchor(f);if(!a)return new Set();return new Set(nativeCells(f).filter(c=>Math.abs(c.wx-a.wx)<=24&&Math.abs(c.wy-a.wy)<=24).map(c=>`${c.t}@${c.wx-a.wx},${c.wy-a.wy}${c.h?'h':''}${c.v?'v':''}${c.i<a.i?'f':'b'}`));}
/** which edited frame's head to use on frame f: one with the same head tiles, the most alike around the head */
export function pickEditFrame(f,editFrames){const a=headAnchor(f);if(!a)return null;const hs=headSet(f),me=around(f);let best=null,bs=-1;
 for(const e of editFrames){const ea=headAnchor(e);if(!ea)continue;const same=headSet(e)===hs,sameAnchor=alias(ea.t)===alias(a.t);if(!same&&!sameAnchor)continue;
  const o=around(e);let s=(same?1000:0)+(ea.h===a.h&&ea.v===a.v?100:0);for(const k of me)if(o.has(k))s++;if(s>bs){bs=s;best=e;}}
 return best;}
/** frame f of a character with its edited head: null when the frame has no head tile (lying / baked
 * heads keep the native shared tiles) or no edited frame shares its head tiles */
export function composeEditedFrame(skin,f,edit){if(NATIVE_UNRELIABLE_FRAMES.has(f)||!skin.frames[f])return null;const a0=headAnchor(f),ef=a0&&pickEditFrame(f,Object.keys(edit.heads).map(Number));if(ef==null)return null;
 /* anchor on the same head tile the marks were taken from (frame 9 lists its tiles 3,2 where frame 16 has 2,3) */
 const hd=edit.heads[ef],a=nativeCells(f).find(c=>alias(c.t)===alias(hd.tile))??a0,base=nativeFrame(skin,f),W=base.width,H=base.height,px=base.pixels.map(r=>[...r]),mat=base.materials.map(r=>[...r]),sh=base.shade.map(r=>[...r]),own=px.map(r=>r.map(()=>'0'));
 const cells=nativeCells(f),byI=new Map(cells.map(c=>[c.i,c])),face=new Set(edit.faceTiles??[]);
 /* in front of the head and not part of it (an arm, the ball): keep */
 /* the row of body tiles right under the head tiles carries the lower face (native heads are 8 rows of a 14-row
  * head). The marks' erasures name the face tiles of the edited frame (edit.faceTiles); a pose that puts other
  * tiles there (38: 15h/182 under the kicking head) needs its own, or its old eyes and mouth stay under the new face */
 const heads=cells.filter(c=>NATIVE_HEAD_TILES.has(c.t)),tx0=Math.min(...heads.map(c=>c.wx)),tx1=Math.max(...heads.map(c=>c.wx))+8,ty=Math.min(...heads.map(c=>c.wy));
 const chinRow=c=>!a.v&&c.wy===ty+8&&c.wx+8>tx0&&c.wx<tx1&&!(c.i<a.i);
 const keep=(x,y)=>{const o=base.owner[y][x];if(o<0)return false;const c=byI.get(o);return c.i<a.i&&!NATIVE_HEAD_TILES.has(c.t)&&!face.has(c.t);};
 const clear=(x,y)=>{px[y][x]='0';mat[y][x]='0';sh[y][x]='0';};
 /* the old head tiles go entirely */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=base.owner[y][x];if(o>=0&&NATIVE_HEAD_TILES.has(byI.get(o).t))clear(x,y);}
 const X0=Math.round((a.wx-base.originX)*2),Y0=Math.round((a.wy-base.originY)*2);
 hd.rows.forEach((r,j)=>[...r].forEach((m,i)=>{if(m==='.')return;const lx=flipX(a,hd.x+i),ly=flipY(a,hd.y+j),X=X0+lx,Y=Y0+ly;if(X<0||Y<0||X>=W||Y>=H||keep(X,Y))return;
  if(m==='0'){const o=base.owner[Y][X];if(o<0||NATIVE_HEAD_TILES.has(byI.get(o).t)||face.has(byI.get(o).t)||chinRow(byI.get(o)))clear(X,Y);return;}
  px[Y][X]=m;mat[Y][X]='0';sh[Y][X]='0';own[Y][X]='1';}));
 const {owner,...art}=base;
 /* headRegion = where the pasted head really is. The copied HD headRegion belongs to the HD pose, whose head
  * sits elsewhere: kit patterns are laid out along the head->shirt axis (tsubasa-runtime shirtCoordinates),
  * so the wrong box spread 东邦's white shoulders over the whole back in frames 10/22/33. */
 let hx0=W,hy0=H,hx1=-1,hy1=-1;own.forEach((r,y)=>r.forEach((v,x)=>{if(v==='1'){hx0=Math.min(hx0,x);hy0=Math.min(hy0,y);hx1=Math.max(hx1,x);hy1=Math.max(hy1,y);}}));
 const headRegion=hx1<0?art.headRegion:{x:art.originX+hx0/2,y:art.originY+hy0/2,width:(hx1-hx0+1)/2,height:(hy1-hy0+1)/2};
 return {...art,headRegion,patternFrom:skin.frames[f],pixels:px.map(r=>r.join('')),materials:mat.map(r=>r.join('')),shade:sh.map(r=>r.join('')),personPalettes:[skin.palette,edit.headPalette],paletteOwners:own.map(r=>r.join('')),headEdit:{source:edit.source,from:ef}};}
/** inverse of the paste, for the ingest: head marks of edited frame ef from its changed pixels.
 * changed: Map "X,Y" -> head palette index or '0' (erased); untouched head-tile pixels are kept too
 * (mapped through bodyToHead) so a partly kept old head still moves with the tile. */
export function headMarks(skin,ef,changed,bodyToHead){const a=headAnchor(ef);if(!a)return null;const base=nativeFrame(skin,ef),cells=nativeCells(ef),byI=new Map(cells.map(c=>[c.i,c]));
 const X0=Math.round((a.wx-base.originX)*2),Y0=Math.round((a.wy-base.originY)*2),pts=[],face=new Set();
 for(let Y=0;Y<base.height;Y++)for(let X=0;X<base.width;X++){const k=X+','+Y,o=base.owner[Y][X],isHead=o>=0&&NATIVE_HEAD_TILES.has(byI.get(o).t);
  let m=changed.get(k);if(m===undefined){if(!isHead||base.pixels[Y][X]==='0')continue;m=bodyToHead(base.pixels[Y][X]);}
  else if(o>=0&&!isHead)face.add(byI.get(o).t);
  pts.push([flipX(a,X-X0),flipY(a,Y-Y0),m]);}
 if(!pts.length)return null;const x0=Math.min(...pts.map(p=>p[0])),y0=Math.min(...pts.map(p=>p[1])),x1=Math.max(...pts.map(p=>p[0])),y1=Math.max(...pts.map(p=>p[1]));
 const rows=Array.from({length:y1-y0+1},()=>Array(x1-x0+1).fill('.'));for(const [x,y,m] of pts)rows[y-y0][x-x0]=m;
 return {tile:a.t,x:x0,y:y0,rows:rows.map(r=>r.join('')),faceTiles:[...face]};}
