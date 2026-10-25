/** Head blocks (2026-10-20, docs/HEAD_SWAP_STUDY.md). The original game swaps a player's look through its head
 * tiles only; the lower face and the fists share the tile row right under them (the "face row"). A head block is
 * the head tiles + that face row, as one character-specific picture, plus hair that grows past it (above / beside,
 * on the background only). Frames whose head is built from the same tiles in the same places share one block, the
 * way the original shares tiles, so the seams stay on tile edges.
 * Data: art/head-blocks.js (tools/ingest-head-blocks.mjs, cut from the raw image-model edits). Block coordinates are
 * HD px relative to the block box's top-left (headBlock(f).box, HD-art world); rows: '.' not the block, '0' empty,
 * hex = head palette index, 'n' = the original pixel (the face row's fists / shoulders); kit: [x,y,material,...] for kit pixels (body palette, they follow the team). */
import {nativeCells,nativeFrame} from './tsubasa-native-heads.js';
export const HEAD_BLOCK_TILES=Object.freeze(new Set([0,1,2,3,4,5,53,56,6]));
export const HAIR_MARGIN=4;/* native px above / beside the block */
/** native frame -> {cells, heads, face, flipV, box (HD-art world), zone(wx,wy), inBlock(cell), role(cell)} or null */
/* frames whose head the original draws inside bigger body tiles ("baked"): the tiles that hold the head, and the
 * tiles next to it with the shoulder / fist (they play the face row's part). Knocked down 7, lying 35, celebrating 36 */
export const BAKED_HEAD_TILES=Object.freeze({7:{head:[47,63],face:[46,62]},35:{head:[133,63],face:[134,62]},36:{head:[198],face:[214]},
 /* the typical-faces sheet's painted heads (diving header 18, tumbling 19, face-down 45: the fists / shoulders in these
  * tiles stay original through the keep guide) and 61, lying like 35 in the same tiles */
 18:{head:[57,138,153,154],face:[]},19:{head:[89,105],face:[]},45:{head:[163],face:[]},61:{head:[133,63],face:[134,62]}});
export function headBlock(f){const cells=nativeCells(f),bk=BAKED_HEAD_TILES[f&127],isHead=c=>bk?bk.head.includes(c.t):HEAD_BLOCK_TILES.has(c.t),heads=cells.filter(isHead);if(!heads.length)return null;
 const flipV=heads[0].v,hy=Math.min(...heads.map(c=>c.wy)),hx0=Math.min(...heads.map(c=>c.wx)),hx1=Math.max(...heads.map(c=>c.wx))+8,faceY=flipV?hy-8:hy+8;
 const face=bk?cells.filter(c=>bk.face.includes(c.t)):cells.filter(c=>!HEAD_BLOCK_TILES.has(c.t)&&Math.abs(c.wy-faceY)<=2&&c.wx+8>hx0+1&&c.wx<hx1-1),inBlock=new Set([...heads,...face].map(c=>c.i));
 const all=[...heads,...face],box={x0:Math.min(...all.map(c=>c.wx)),y0:Math.min(...all.map(c=>c.wy)),x1:Math.max(...all.map(c=>c.wx))+8,y1:Math.max(...all.map(c=>c.wy))+8};
 const M=HAIR_MARGIN,zone=(wx,wy)=>wx>=box.x0-M&&wx<box.x1+M&&(flipV?wy>=box.y0&&wy<box.y1+M:wy>=box.y0-M&&wy<box.y1);
 return {cells,heads,face,flipV,box,zone,inBlock:c=>inBlock.has(c.i),role:c=>isHead(c)?'head':inBlock.has(c.i)?'face':'body'};}
/** which block a frame uses: source frame -> the frames built from the same head + face-row tiles (measured,
 * runtime-art-data). 77.0 + 15.4 + 0.2 + 0.05 % of the screen time. */
export const HEAD_BLOCK_GROUPS=Object.freeze(Object.fromEntries(Object.entries({0:[0,1,2,30,31,40,80,81],16:[5,16,32,47,62,63],10:[10,33],22:[22],
 /* the 9 head-asm cells (runtime-art-data): 1.4 + 0.9 + 0.5 + 0.5 + 0.3 + 0.3 + 0.3 + 0.3 + 0.2 % */
 15:[15,50,51,52,53],8:[8],38:[38],25:[25,39],3:[3,24],6:[6],12:[12,28,34],17:[17],13:[13,59],
 /* likeness round 2 (runtime-art-data): 1.0 + 0.41 + 0.32 + 0.18 + 0.16 + 0.16 + 0.10 + 0.04 + 0.04 % */
 7:[7],35:[35],36:[36],14:[14],11:[11],23:[23,54,55,56,64],9:[9],43:[43,82],29:[29]}).map(([k,v])=>[k,Object.freeze(v)])));
const SOURCE=new Map(Object.entries(HEAD_BLOCK_GROUPS).flatMap(([s,fs])=>fs.map(f=>[f,+s])));
/* heads painted into body tiles that only the typical-faces sheet draws: their own block, outside the groups */
const PAINTED_SOURCES=new Set([18,19,45]);
export const headBlockSource=f=>SOURCE.get(f&127)??(PAINTED_SOURCES.has(f&127)?f&127:null);
/* the typical-faces sheet (runtime-art-data, user 2026-10-22) draws these heads; with it in (data.typicalSource)
 * every other frame built from head tiles 0-5 derives from its 0 / 16 / 10 blocks, not an older round's own block */
export const TYPICAL_OWN=Object.freeze(new Set([0,16,10,15,23,7,35,18,19,45]));
const kitMaps=new WeakMap(),kitAt=blk=>{let m=kitMaps.get(blk);if(!m){m=new Map();const k=blk.kit??[];for(let i=0;i<k.length;i+=3)m.set(k[i]+','+k[i+1],k[i+2]);kitMaps.set(blk,m);}return m;};
/* skinTone (index -> colour): the body's skin follows a redrawn face in a different skin (Hyuga is tanned) */
const tones=new WeakMap();export const bodyPalette=(skin,tone)=>{let m=tones.get(skin);if(!m||m.tone!==tone){m={tone,palette:skin.palette.map((c,k)=>tone[k]??c)};tones.set(skin,m);}return m.palette;};
/** stitch: repair the block / body edge (tools/check-head-seams.mjs turns it off to measure the raw cut) */
export const headBlockOptions={stitch:true};
export const HD_BODY=Object.freeze(new Set([36]));
/* frames left to the HD art with the fitted block head (src/tsubasa-layered-sprites.js): 36/37 are the special-shot
 * effect sprites in the original (birds, tornado...), which the shot design keeps out; the HD art draws a celebration */
export const FITTED_OVER_BLOCK=Object.freeze(new Set([36,37]));
const PAD=8;/* HD px around the native canvas, room for hair that grows past the block */
/* Original assembly, original body (user, 2026-10-21): every frame is the original Nekketsu sprite; only the head
 * tiles the original swaps per character get the character's new head, the way the original reuses them.
 *  - own block: the frame's head-block group (HEAD_BLOCK_GROUPS) where the image model drew that head right
 *  - derived: the original reuses another frame's head tiles. The character's head tiles 0/1 (3/4 front), 2/3 (side),
 *    4/5 (back) come from the blocks of frames 0 / 16 / 10, moved tile by tile onto this frame's cells: a pixel keeps its
 *    place inside its tile (canonical tile coordinates, through both frames' flips), hair beside a tile goes with the
 *    nearest head tile. 38 (tackle) = the kick head 53/56 of frame 15 mirrored, with its face-row tile 15.
 *  - pending: the head the original draws there is not one the image model has drawn yet (a shared expression, or a
 *    head painted into body tiles): the frame stays wholly original until that delivery is in (the data key)
 *  - original: no head tiles at all (the head is painted into body tiles): wholly original */
export const DERIVED_BLOCKS=Object.freeze({38:{from:15,face:[15],positional:true},61:{from:35,face:[134,62]}});
const ANGLE_SOURCE=Object.freeze({0:0,1:0,2:16,3:16,4:10,5:10});
export const PENDING_HEADS=Object.freeze(Object.fromEntries([...[15,50,51,52,53,38].map(f=>[f,'kickfaceSource']),...[23,54,55,56,64].map(f=>[f,'cheerfaceSource']),[35,'lyingfaceSource'],...[18,19,45,61].map(f=>[f,'typicalSource'])]));
/* frames outside this scheme (their tiles come from the special-shot effect banks, or the ceremony page): left as before */
export const OUTSIDE_ORIGINAL=f=>[20,36,37,49].includes(f&127)||(f&127)>=65&&(f&127)<=79;
const derivedCache=new WeakMap();
const tflipX=(c,l)=>c.h?l:15-l,tflipY=(c,l)=>c.v?15-l:l;
/** spec for frame f: {sources:[source frames], faces:[face-row tiles carried from the source], positional?} or null */
function deriveSpec(f,data){const d=DERIVED_BLOCKS[f&127],typical=!!data?.typicalSource;
 /* positional (typical): 38's face row is 15 / 182 where 15 has 15 / 130, so the mouth drawn in 130 comes along by place */
 if(d)return {sources:[d.from],faces:d.face,positional:typical&&!!d.positional};const s=headBlockSource(f);
 if(s!=null&&!(typical&&!TYPICAL_OWN.has(s)))return null;
 const b=headBlock(f),srcs=b&&[...new Set(b.heads.filter(c=>c.t in ANGLE_SOURCE).map(c=>ANGLE_SOURCE[c.t]))];if(!srcs?.length)return null;
 /* typical: the source's lower face comes along by its place under the head tiles, whatever this frame's face-row tiles
  * (3 draws its chin in 20 / 21 where 0 has 16 / 17); this frame's own fists and shoulders there stay original */
 return {sources:srcs,faces:[],positional:typical};}
/* lying 35 (and 61, its flip): the hands cover the face and only the hair shows (user, 2026-10-22), like the face-down
 * 45. With the typical sheet in, 35's head is 45's hair turned a quarter left (crown up), set on the original hair: it
 * covers the original's black hair and grows onto the background, never over the hands */
const HAIR_TURNED=Object.freeze({35:45});
const turnedCache=new WeakMap();
function turnedHairBlock(skin,f,data){let m=turnedCache.get(data);if(!m)turnedCache.set(data,m=new Map());if(m.has(f))return m.get(f);
 const src=data?.blocks?.[HAIR_TURNED[f]];if(!src)return null;const b=headBlock(f),n=nativeFrame(skin,f),byI=new Map(b.cells.map(c=>[c.i,c]));
 const inTiles=(x,y)=>{const o=n.owner[y]?.[x];return o>=0&&b.inBlock(byI.get(o));},v=(x,y)=>n.pixels[y]?.[x]??'0';
 /* the original hair: per column of the block tiles, the outline-coloured run from the top down to the hands (a run of
  * 1-3 px is an arm's or finger's outline) */
 const hair=new Set();for(let x=0;x<n.width;x++){let y=0;while(y<n.height&&!(inTiles(x,y)&&v(x,y)!=='0'))y++;const run=[];while(y<n.height&&inTiles(x,y)&&v(x,y)==='1')run.push(y++);if(run.length>=4)for(const q of run)hair.add(x+','+q);}
 if(!hair.size)return null;const hs=[...hair].map(k=>k.split(',').map(Number)),hx0=Math.min(...hs.map(p=>p[0])),hx1=Math.max(...hs.map(p=>p[0])),hy1=Math.max(...hs.map(p=>p[1]));
 /* the source's hair turned: right (crown) -> up */
 const pts=[];src.rows.forEach((r,j)=>[...r].forEach((c,i)=>{if(!'.0n'.includes(c))pts.push([src.x+i,src.y+j,c]);}));
 const sy0=Math.min(...pts.map(p=>p[1])),sy1=Math.max(...pts.map(p=>p[1])),sx0=Math.min(...pts.map(p=>p[0])),sx1=Math.max(...pts.map(p=>p[0]));
 const dx=Math.round((hx0+hx1)/2-(sy1-sy0)/2),dy=hy1-(sx1-sx0),painted=new Map();
 for(const [sx,sy,c] of pts){const x=dx+(sy-sy0),y=dy+(sx1-sx);if(hair.has(x+','+y)||v(x,y)==='0')painted.set(x+','+y,c);}
 /* original hair the turned hair does not reach: the nearest new hair pixel in its row */
 for(const k of hair)if(!painted.has(k)){const [x,y]=k.split(',').map(Number);for(let d=1;d<8;d++){const c=painted.get((x-d)+','+y)??painted.get((x+d)+','+y);if(c){painted.set(k,c);break;}}}
 const ox=Math.round((n.originX-b.box.x0)*2),oy=Math.round((n.originY-b.box.y0)*2),out=new Map();
 for(let y=0;y<n.height;y++)for(let x=0;x<n.width;x++)if(inTiles(x,y))out.set((x+ox)+','+(y+oy),'n');
 for(const [k,c] of painted){const [x,y]=k.split(',').map(Number);out.set((x+ox)+','+(y+oy),c);}
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const k of out.keys()){const [x,y]=k.split(',').map(Number);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const rows=Array.from({length:y1-y0+1},()=>Array(x1-x0+1).fill('.'));for(const [k,c] of out){const [x,y]=k.split(',').map(Number);rows[y-y0][x-x0]=c;}
 const blk={x:x0,y:y0,rows:rows.map(r=>r.join('')),kit:[],turnedFrom:HAIR_TURNED[f]};m.set(f,blk);return blk;}
const sourceBlock=(skin,s,data)=>HAIR_TURNED[s]&&data?.typicalSource?turnedHairBlock(skin,s,data):data?.blocks?.[s];
function derivedBlock(skin,f,data){const d=deriveSpec(f,data);if(!d)return null;let m=derivedCache.get(data);if(!m)derivedCache.set(data,m=new Map());if(m.has(f))return m.get(f);
 const bt=headBlock(f),pair=t=>bt.cells.find(c=>c.t===t),out=new Map();
 for(const from of d.sources){const src=sourceBlock(skin,headBlockSource(from),data);if(!src)return null;const bs=headBlock(from);
  const inCell=(c,wx,wy)=>wx>=c.wx&&wx<c.wx+8&&wy>=c.wy&&wy<c.wy+8;
  const near=(wx,wy)=>{/* positional: every pixel goes by the head tile above it (face-row pixels sit past its 16 rows) */
   const fc=bs.face.find(c=>inCell(c,wx,wy))??(bs.face.some(c=>wy>=c.wy&&wy<c.wy+8)?bs.face.find(c=>d.faces.includes(c.t))??bs.face[0]:null);
   if(fc&&!d.positional)return d.faces.includes(fc.t)?[fc,pair(fc.t)]:[null,null];/* face row: carried only where the frame shares the face-row tile */
   const h=bs.heads.find(c=>inCell(c,wx,wy))??bs.heads.reduce((b,c)=>Math.hypot(wx-(c.wx+4),wy-(c.wy+4))<Math.hypot(wx-(b.wx+4),wy-(b.wy+4))?c:b);return [h,pair(h.t)];};
  const put=(i,j,v)=>{const wx=bs.box.x0+(src.x+i)/2,wy=bs.box.y0+(src.y+j)/2,[cs,cd]=near(wx,wy);if(!cd)return;
   const cx=tflipX(cs,Math.round((wx-cs.wx)*2)),cy=tflipY(cs,Math.round((wy-cs.wy)*2));
   const X=Math.round((cd.wx-bt.box.x0)*2)+tflipX(cd,cx),Y=Math.round((cd.wy-bt.box.y0)*2)+tflipY(cd,cy);if(!out.has(X+','+Y)||v!=='0')out.set(X+','+Y,v);};
  src.rows.forEach((r,j)=>[...r].forEach((v,i)=>{if(v!=='.')put(i,j,v);}));
  for(let k=0;k<(src.kit?.length??0);k+=3)put(src.kit[k],src.kit[k+1],'K'+src.kit[k+2]);/* kit pixels move like the rest */}
 /* the frame's own block tiles not covered: face-row tiles keep the original (shoulder, fist, and the original lower face
  * where the frame does not share the source's face row), head tiles are empty (the original head showed through) */
 /* a 1-2 px gap between two moved pixels (61: the source's tiles overlap by a pixel where this frame's meet) takes the
  * pixel beside it, so no seam line runs through the face */
 const cellKeys=[...bt.heads,...bt.face].flatMap(c=>Array.from({length:256},(_,q)=>[Math.round((c.wx-bt.box.x0)*2)+q%16,Math.round((c.wy-bt.box.y0)*2)+(q>>4)]));
 const solid=(x,y)=>{const v=out.get(x+','+y);return v&&v!=='0'?v:null;},gap=new Map();
 for(const [X,Y] of cellKeys){if(out.has(X+','+Y))continue;for(const [dx,dy] of [[1,0],[0,1]]){const u=solid(X-dx,Y-dy)??solid(X-2*dx,Y-2*dy),w=solid(X+dx,Y+dy)??solid(X+2*dx,Y+2*dy);
  if(u&&w&&(solid(X-dx,Y-dy)||solid(X+dx,Y+dy))){gap.set(X+','+Y,u);break;}}}for(const [k,v] of gap)out.set(k,v);
 for(const c of [...bt.heads,...bt.face])for(let ly=0;ly<16;ly++)for(let lx=0;lx<16;lx++){const k=(Math.round((c.wx-bt.box.x0)*2)+lx)+','+(Math.round((c.wy-bt.box.y0)*2)+ly);if(!out.has(k))out.set(k,bt.heads.includes(c)?'0':'n');}
 /* where the source's face row is carried (38), an original pixel kept in the face row must be body (reached from the
  * body tiles without crossing an outline, plus the outline around it, as tools/ingest-head-asm.mjs marks it): the rest
  * of that row is the original face (tile 182's cheek line floated beside the new face) */
 if(d.faces.length||d.positional){const n=nativeFrame(skin,f),byI=new Map(bt.cells.map(c=>[c.i,c])),role=(x,y)=>{const o=n.owner[y]?.[x];return o>=0?bt.role(byI.get(o)):null;},v=(x,y)=>n.pixels[y]?.[x]??'0',body=new Set(),st=[];
  for(let y=0;y<n.height;y++)for(let x=0;x<n.width;x++)if(role(x,y)==='body'&&!['0','1'].includes(v(x,y)))st.push([x,y]);
  const seen=new Set(st.map(q=>q+''));while(st.length){const [x,y]=st.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(seen.has(k)||role(a,b)!=='face'||['0','1'].includes(v(a,b)))continue;seen.add(k);body.add(k);st.push([a,b]);}}
  for(let y=0;y<n.height;y++)for(let x=0;x<n.width;x++)if(role(x,y)==='face'&&v(x,y)==='1'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>body.has((x+dx)+','+(y+dy))||role(x+dx,y+dy)==='body'&&v(x+dx,y+dy)!=='0'))body.add(x+','+y);
  const ox=Math.round((n.originX-bt.box.x0)*2),oy=Math.round((n.originY-bt.box.y0)*2);
  for(const [k,val] of out)if(val==='n'){const [X,Y]=k.split(',').map(Number);if(role(X-ox,Y-oy)==='face'&&!body.has((X-ox)+','+(Y-oy)))out.set(k,'0');}
  if(d.positional)for(const k of body){const [x,y]=k.split(',').map(Number);out.set((x+ox)+','+(y+oy),'n');}}
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const k of out.keys()){const [x,y]=k.split(',').map(Number);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const rows=Array.from({length:y1-y0+1},()=>Array(x1-x0+1).fill('.')),kitOut=[];
 for(const [k,v] of out){const [x,y]=k.split(',').map(Number);if(v[0]==='K'){rows[y-y0][x-x0]='2';kitOut.push(x-x0,y-y0,+v.slice(1));}else rows[y-y0][x-x0]=v;}
 const blk={x:x0,y:y0,rows:rows.map(r=>r.join('')),kit:kitOut,derivedFrom:d.sources};m.set(f,blk);return blk;}
/** the wholly original frame (body and head) on the head-block canvas, for frames whose head is pending or painted into
 * body tiles; personPalettes as the block frames (the body skin follows the new face: skinTone) */
export function originalHeadFrame(skin,f,data){if(OUTSIDE_ORIGINAL(f)||!skin.frames[f])return null;const n=nativeFrame(skin,f),W=n.width+2*PAD,H=n.height+2*PAD;
 const grid=(src,fill)=>Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>src?.[y-PAD]?.[x-PAD]??fill).join(''));const {owner:_o,...art}=n;
 for(const k of ['sleeveMask','shortSleeveMask','patternSourceMaterials'])if(n[k])art[k]=grid(n[k],'0');
 return {...art,width:W,height:H,originX:n.originX-PAD/2,originY:n.originY-PAD/2,patternFrom:skin.frames[f],pixels:grid(n.pixels,'0'),materials:grid(n.materials,'0'),shade:grid(n.shade,'0'),
  personPalettes:[data?.skinTone?bodyPalette(skin,data.skinTone):skin.palette,data?.palette??skin.palette],paletteOwners:Array.from({length:H},()=>'0'.repeat(W)),headBlock:{from:null,original:true}};}
/** frame f of a character with its head block, or null when the frame has no block for this character */
/* data.originalFrames: frames the user preferred wholly original for this character (Tsubasa 35 / 38 / 61, 2026-10-22) */
export function composeHeadBlockFrame(skin,f,data){if(OUTSIDE_ORIGINAL(f))return null;const pend=PENDING_HEADS[f&127];if(pend&&!data?.[pend]||data?.originalFrames?.includes(f&127))return originalHeadFrame(skin,f,data);
 const spec=deriveSpec(f,data),sf=spec?null:headBlockSource(f),blk=spec?derivedBlock(skin,f,data):sf==null?null:sourceBlock(skin,sf,data);if(!blk||!skin.frames[f])return spec||sf!=null?null:originalHeadFrame(skin,f,data);
 const b=headBlock(f);if(!b)return null;const n=nativeFrame(skin,f),W=n.width+2*PAD,H=n.height+2*PAD,originX=n.originX-PAD/2,originY=n.originY-PAD/2;
 /* plain loops: this runs for every (character, frame) the first time it is drawn (2026-10-23: the callback form was 60% of it) */
 const grid=(src,fill)=>{const out=new Array(H);for(let y=0;y<H;y++){const r=src?.[y-PAD],row=new Array(W);for(let x=0;x<W;x++){const v=r?.[x-PAD];row[x]=v==null?fill:v;}out[y]=row;}return out;};
 /* the original pixels, once (stitch and hole fill read them), and the working copies */
 const op=grid(n.pixels,'0'),om=grid(n.materials,'0'),os=grid(n.shade,'0'),px=op.map(r=>r.slice()),mat=om.map(r=>r.slice()),sh=os.map(r=>r.slice()),owner=grid(n.owner,-1),own=px.map(r=>r.map(()=>'0')),byI=new Map(b.cells.map(c=>[c.i,c]));
 /* poses the native tiles cannot draw (the celebration 36 uses tiles from another bank: blocks, a hollow square, a bar):
  * the body is the HD art, drawn on the same canvas, without its old head; the new head block goes on top */
 const hd=HD_BODY.has(f&127)?skin.frames[f]:null;if(hd){const hx=Math.round((hd.originX-n.originX)*2),hy=Math.round((hd.originY-n.originY)*2),r=hd.headRegion;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sy=y-PAD-hy,sx=x-PAD-hx,wx=n.originX-PAD/2+x/2,wy=n.originY-PAD/2+y/2,inHead=r&&wx>=r.x&&wx<r.x+r.width&&wy>=r.y&&wy<r.y+r.height;
   px[y][x]=inHead?'0':hd.pixels[sy]?.[sx]??'0';mat[y][x]=inHead?'0':hd.materials?.[sy]?.[sx]??'0';sh[y][x]=inHead?'0':hd.shade?.[sy]?.[sx]??'0';}}
 /* the block's tiles go entirely; the block brings their new pixels */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=owner[y][x];if(o>=0&&b.inBlock(byI.get(o))){px[y][x]='0';mat[y][x]='0';sh[y][x]='0';}}
 const X0=Math.round((b.box.x0-originX)*2),Y0=Math.round((b.box.y0-originY)*2);
 blk.rows.forEach((r,j)=>[...r].forEach((v,i)=>{if(v==='.')return;const X=X0+blk.x+i,Y=Y0+blk.y+j;if(X<0||Y<0||X>=W||Y>=H)return;const o=owner[Y][X],inTiles=o>=0&&b.inBlock(byI.get(o));
  if(!inTiles&&(o>=0||v==='0'))return;/* outside the block tiles: hair only, on the background */
  if(v==='n'&&hd)return;
  if(v==='n'){const ny=Y-PAD,nx=X-PAD;px[Y][X]=n.pixels[ny]?.[nx]??'0';mat[Y][X]=n.materials[ny]?.[nx]??'0';sh[Y][X]=n.shade[ny]?.[nx]??'0';own[Y][X]='0';return;}
  if(v==='0')return;const m=kitAt(blk).get(i+','+j);
  if(m){px[Y][X]='2';mat[Y][X]=String(m);sh[Y][X]='1';return;}/* kit: body palette, team colours */
  px[Y][X]=v;mat[Y][X]='0';sh[Y][X]='0';own[Y][X]='1';}));
 /* stitch the edge where block tiles meet body tiles (1 HD px): the original's lines run across it, so a gap there gets
  * the original pixel back and an outline that arrives from the body, but stops at the new drawing, is continued */
 if(headBlockOptions.stitch&&!hd){/* (on an HD body the native edge is not there to stitch to) */const blockAt=(x,y)=>{const o=owner[y]?.[x];return o>=0?b.inBlock(byI.get(o)):null;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(blockAt(x,y)!==true||op[y][x]==='0')continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const qx=x+dx,qy=y+dy;if(blockAt(qx,qy)!==false||op[qy][qx]==='0'||px[qy][qx]==='0')continue;
    if(px[y][x]==='0'){px[y][x]=op[y][x];mat[y][x]=om[y][x];sh[y][x]=os[y][x];own[y][x]='0';break;}
    const along=dx?[[x,y-1],[x,y+1]]:[[x-1,y],[x+1,y]];
    if(op[y][x]==='1'&&op[qy][qx]==='1'&&px[qy][qx]==='1'&&px[y][x]!=='1'&&along.every(([ax,ay])=>px[ay]?.[ax]!=='1')){px[y][x]='1';mat[y][x]='0';sh[y][x]='0';own[y][x]='0';break;}}}}
 /* holes: empty pixels the outside cannot reach (the edit moved an outline by a pixel) get the original pixel back */
 const out=Array.from({length:H},()=>new Uint8Array(W)),st=[];for(let x=0;x<W;x++)st.push([x,0],[x,H-1]);for(let y=0;y<H;y++)st.push([0,y],[W-1,y]);
 while(st.length){const [x,y]=st.pop();if(x<0||y<0||x>=W||y>=H||out[y][x]||px[y][x]!=='0')continue;out[y][x]=1;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
 let holes=0;if(!hd)for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(px[y][x]==='0'&&!out[y][x]&&op[y][x]!=='0'){px[y][x]=op[y][x];mat[y][x]=om[y][x];sh[y][x]=os[y][x];holes++;}
 /* stray strokes: small pieces of block pixels not connected to the figure (the edit drew on the background) */
 {const seen=new Uint8Array(W*H),comps=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(seen[y*W+x]||px[y][x]==='0')continue;const c=[],st=[[x,y]];seen[y*W+x]=1;
   while(st.length){const [cx,cy]=st.pop();c.push([cx,cy]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=W||ny>=H||seen[ny*W+nx]||px[ny][nx]==='0')continue;seen[ny*W+nx]=1;st.push([nx,ny]);}}comps.push(c);}
  const big=comps.reduce((m,c)=>c.length>m.length?c:m,[]);for(const c of comps)if(c!==big&&c.length<40&&c.every(([x,y])=>own[y][x]==='1'||mat[y][x]!=='0'))for(const [x,y] of c){px[y][x]='0';mat[y][x]='0';sh[y][x]='0';own[y][x]='0';}}
 let hx0=W,hy0=H,hx1=-1,hy1=-1;own.forEach((r,y)=>r.forEach((v,x)=>{if(v==='1'){hx0=Math.min(hx0,x);hy0=Math.min(hy0,y);hx1=Math.max(hx1,x);hy1=Math.max(hy1,y);}}));
 const {owner:_o,...art}=n;
 /* the per-pixel masks are on the native canvas: pad them like the pixels (unpadded they sat 4 native px up-left, and a
  * goalkeeper's long sleeves painted the new hair white); what the block itself draws is never a sleeve */
 const padMask=m=>m&&grid(m,'0').map((r,y)=>r.map((v,x)=>own[y][x]==='1'?'0':v).join(''));
 for(const k of ['sleeveMask','shortSleeveMask'])if(n[k])art[k]=padMask(n[k]);
 if(n.patternSourceMaterials)art.patternSourceMaterials=grid(n.patternSourceMaterials,'0').map(r=>r.join(''));
 return {...art,width:W,height:H,originX,originY,headRegion:hx1<0?n.headRegion:{x:originX+hx0/2,y:originY+hy0/2,width:(hx1-hx0+1)/2,height:(hy1-hy0+1)/2},patternFrom:skin.frames[f],
  pixels:px.map(r=>r.join('')),materials:mat.map(r=>r.join('')),shade:sh.map(r=>r.join('')),personPalettes:[data.skinTone?bodyPalette(skin,data.skinTone):skin.palette,data.palette],paletteOwners:own.map(r=>r.join('')),headBlock:{from:sf,derived:spec?.sources,source:data.source,holes}};}
