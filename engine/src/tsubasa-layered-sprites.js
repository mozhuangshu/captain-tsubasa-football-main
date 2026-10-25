/** Layered character sprites (2026-10-17, step 1 of the character rebuild).
 * A drawn player = one BODY pose (shared by every character of a body type) + that character's HEAD
 * + kit colours (the existing material recolour). The game logic still asks for a native frame
 * number; this module turns it into body + head art in the HD frame format, so the existing draw
 * path, materials, shading and mirroring keep working. Off by default: the game draws exactly what
 * it drew before until enableTsubasaLayeredSprites() is called.
 *
 * Step 1 proves the plumbing with the art we already have: bodies come from one template skin, heads
 * from each character's own frame (its headRegion). New art later replaces registerTsubasaBodyPose /
 * registerTsubasaHead inputs; nothing else changes. */
import {ALL_PLAYER_FRAMES} from './sprite-frames.js';
import {repairTsubasaHeads,headRoles} from './tsubasa-head-repairs.js';
import {capCutEdges} from './tsubasa-edge-caps.js';
import {cleanHeadSeams} from './tsubasa-head-seams.js';
import {composeEditedFrame} from './tsubasa-native-heads.js';
import {HEAD_BLOCKS} from '../art/head-blocks.js';
import {composeHeadBlockFrame,FITTED_OVER_BLOCK,bodyPalette} from './tsubasa-head-blocks.js';

/** Native frames by how often they are on screen (17 shot-review scenes x 145 frames, 11379 sprite
 * draws, 2026-10-17). The first 7 cover 92% of what players see: draw these first. */
export const TSUBASA_POSE_PRIORITY=Object.freeze([0,1,15,32,30,16,2,8,31,23,38,22,24,18,10,62,27,3,33,26,7,13,63,11,4,28,58]);
/* Once a player appears, prepare later celebrations too; a first goal must not fit a whole team in one paint. */
const WARM_FRAMES=Object.freeze([...TSUBASA_POSE_PRIORITY.slice(0,7),36,37,...Array.from({length:15},(_,i)=>65+i)]);

/* The native engine draws the head as its own tiles: 0/1 front, 2/3 side, 4/5 back, with h/v flips.
 * Frames with no head tiles have the head baked into body tiles (lying, cheering, effects). */
const HEAD_DIR_BY_TILES=Object.freeze({'0,1':'front','1,0':'front','6,0':'front','0,6':'front','2,3':'side','3,2':'side','4,5':'back','4h':'back','2':'lying','2hv':'lying-flipped','2v':'lying-flipped','3hv,2hv':'upside-down','2hv,3hv':'upside-down',none:'baked'});
function headTiles(f){return f.tiles.map((t,k)=>t<8?t+(f.attributes[k]&0x40?'h':'')+(f.attributes[k]&0x80?'v':''):null).filter(Boolean).join(',')||'none';}
/** native frame -> {frame, headTiles, headDir, priority (index in TSUBASA_POSE_PRIORITY or null)} */
export const TSUBASA_POSE_CATALOG=Object.freeze(Object.fromEntries(ALL_PLAYER_FRAMES.map(f=>{const tiles=headTiles(f);
 return [f.id,Object.freeze({frame:f.id,headTiles:tiles,headDir:HEAD_DIR_BY_TILES[tiles]??'baked',priority:TSUBASA_POSE_PRIORITY.includes(f.id)?TSUBASA_POSE_PRIORITY.indexOf(f.id):null})];})));

/* Enough for all 83 poses of the 12 match players. Old teams must not accumulate forever;
 * recoloured/raster caches use weak keys, so evicting art also lets those copies be collected. */
let config=null;const cache=new Map(),MAX_CACHED_FRAMES=1024;
/** enable with {template: skin used for every body}; heads always come from the drawn character */
export function enableTsubasaLayeredSprites({template}={}){if(!template?.frames)throw TypeError('layered sprites need a template skin');config={template};cache.clear();}
export function disableTsubasaLayeredSprites(){config=null;cache.clear();}
export const tsubasaLayeredSpritesEnabled=()=>!!config;

/* Head bank (2026-10-17): the native game's own method. Every player is ONE shared body plus ONE head
 * per character (front/profile/back, 32x28 at 2x = the native 16x14 head), placed in every frame at the
 * native head tiles' position and flips. No per-frame head drawing, so faces cannot drift.
 * body = template frame minus its head; the head pixels are found by consensus: all HD skins share the
 * body exactly, so a pixel whose colour differs between characters belongs to the old head. */
/* 53/56: the native kicking head (frames 15/38/50-53), same place as 0/1; drawn with the 3/4 head */
const HEAD_DIR=Object.freeze({0:'front',1:'front',6:'front',2:'profile',3:'profile',4:'back',5:'back',53:'front',56:'front'});
const HEAD_PAIR_ORDER=Object.freeze({53:0,56:1});/* left-to-right order of the default kicking head */
const s8=v=>v>127?v-256:v;
/** native frame -> {dir,x,y,flipH,flipV,inFront} in HD world coords, or null (no separate head) */
export function tsubasaHeadPlacement(frame){const n=ALL_PLAYER_FRAMES[frame&127];if(!n)return null;const hs=[];
 n.tiles.forEach((t,i)=>{if(t<8||(t in HEAD_PAIR_ORDER&&(n.attributes[i]&3)===0))hs.push({t,i,dx:s8(n.dx[i]),dy:s8(n.dy[i]),a:n.attributes[i]});});if(hs.length<2)return null;
 /* tile 6 is a head tile with the raised hand drawn in (frames 23/54/55/56/64): keep those frames as authored */
 if(hs.some(h=>h.t===6))return null;
 hs.sort((a,b)=>a.dx-b.dx);const main=hs.filter(h=>h.t!==6),x=hs[0].dx,y=Math.min(...hs.map(h=>h.dy));
 /* tiles stored left-to-right as 0,1 / 2,3 / 4,5 face the default way; a reversed pair is the mirror */
 const rank=t=>t in HEAD_PAIR_ORDER?HEAD_PAIR_ORDER[t]:t,reversed=main.length>1&&rank(main[0].t)>rank(main[1].t),flipH=!!(hs[0].a&64)!==reversed;
 const firstBody=n.tiles.findIndex((t,i)=>!hs.some(h=>h.i===i));
 /* HD art is mirrored against native coordinates: x = -16 - native x; y is one row lower */
 /* the native head tiles are the top 8 rows of a 14-row head (the chin sits in body tiles); flipped
  * upside down, the head therefore grows upward from those tiles */
 const flipV=!!(hs[0].a&128);
 return {dir:HEAD_DIR[main[0]?.t??0],x:-16-x,y:flipV?y+9-14:y+1,flipH,flipV,inFront:hs[0].i<firstBody||Math.min(...hs.map(h=>h.i))<firstBody};}
/* frames whose head is baked into body tiles but is a plain head turned on its side: frame 19 (tumbling,
 * back of the head, neck to the right) = the back head turned 90 degrees counter-clockwise, in the HD head box */
const BAKED_HEADS=Object.freeze({19:{dir:'back',rotate:'ccw'}});
const rotateCcw=rows=>{const H=rows.length,W=rows[0].length;return Array.from({length:W},(_,y)=>Array.from({length:H},(_,x)=>rows[x][W-1-y]).join(''));};
let headBank=null;
/* GPT redraws (art/head-redraws.js, via tools/ingest-heads.mjs) replace only the directions they cover */
function withRedraws(heads,redraws={}){return Object.fromEntries(Object.entries(heads).map(([id,h])=>{const r=redraws[id];if(!r)return [id,h];
 const dirs=['front','profile','back'].filter(d=>r[d]);return [id,{...h,...Object.fromEntries(dirs.map(d=>[d,r[d]])),redrawn:dirs,redrawSource:r.source}];}));}
/** enable with {heads (art/nonmatch-heads.js NONMATCH_HEADS), template skin, skins (all HD skins, for the consensus)} */
/* heads are checked and repaired on enable (src/tsubasa-head-repairs.js): back views become all hair,
 * brims are cut, bald profiles fall back to the 3/4 head */
export function enableTsubasaHeadBank({heads,template,skins,repair=true,edits=true,warm=false,redraws={},legacyEdits={}}={}){headBank=heads&&template?{edits,legacyEdits,warm,warmed:new Set(),heads:(h=>repair?repairTsubasaHeads(h):h)(withRedraws(heads,redraws)),template,skins:(skins??[]).filter(s=>s?.frames&&s.palette),masks:new Map()}:null;cache.clear();}
export const tsubasaHeadBankEnabled=()=>!!headBank;
// A browser host may supply a worker. No idle/timer composition on the input thread.
let headWarmup=null;
export function setTsubasaHeadWarmup(warmup){headWarmup=warmup;}
export function cacheTsubasaHeadArt(id,frame,art){
 const key=id+'/'+(frame&127);if(cache.has(key))return;
 cache.set(key,art);if(cache.size>MAX_CACHED_FRAMES)cache.delete(cache.keys().next().value);
}
export function warmTsubasaHeadBank(skins,{frames=WARM_FRAMES}={}){
 if(!headBank||!headWarmup)return 0;
 for(const skin of skins)headWarmup(skin.id,frames.filter(f=>!cache.has(skin.id+'/'+f)));
 return skins.length;
}
/* old-head mask per frame: near the head box, a pixel whose palette index is not shared by 90% of the
 * skins varies with the character, so it is head. Bodies are index-identical between characters
 * (99.4-100% measured), while skin tones live in each palette, so index votes are what to compare. */
function bankHeadMask(f){const hb=headBank;if(hb.masks.has(f))return hb.masks.get(f);const a=hb.template.frames[f],W=a.width,H=a.height,r=a.headRegion,m=Array.from({length:H},()=>new Uint8Array(W));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const wx=a.originX+x/2,wy=a.originY+y/2;if(!r||wx<r.x-2||wx>=r.x+r.width+2||wy<r.y-2||wy>=r.y+r.height+2)continue;
  const votes=new Map();let n=0;for(const sk of hb.skins){const fr=sk.frames[f];if(!fr||fr.width!==W)continue;const v=fr.pixels[y][x];votes.set(v,(votes.get(v)??0)+1);n++;}
  const top=Math.max(0,...votes.values());if(n&&top<n*0.9)m[y][x]=1;}
 hb.votes??=new Map();hb.votes.set(f,m.map(r=>Uint8Array.from(r)));
 /* the vote only finds pixels that differ between characters, i.e. hair: a face, ear or resting hand that every
  * character shares is never erased. Authored areas add the whole old head for frames where that leaves pieces */
 for(const poly of OLD_HEAD_AREAS[f]??[])for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inPolygon(x+.5,y+.5,poly))m[y][x]=1;
 /* rare frames fitted with the block head (2026-10-21): the vote missed the old head's shared core (hair index, outline),
  * which stayed beside the new head; every dark non-kit pixel (hair, outline) inside the head box is old head there (skin there
  * is the neck: erasing it cut the head off the body; white there is shirt the HD art left without kit, 45). Not 19 (tumbling, the hands hold the head) or 26/27/58 (upside down): the erase split the figure there */
 if(BOX_ERASE_FRAMES.has(f)){const g=BOX_ERASE_FRAMES.get(f);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const wx=a.originX+x/2,wy=a.originY+y/2;if(r&&wx>=r.x-g&&wx<r.x+r.width+g&&wy>=r.y-g&&wy<r.y+r.height+g&&a.pixels[y][x]!=='0'&&a.materials[y][x]==='0'&&colorClass(hb.template.palette[parseInt(a.pixels[y][x],16)])===1)m[y][x]=1;}}
 hb.masks.set(f,m);return m;}
/* template-frame pixel polygons (2 px per world px, origin top-left) covering the whole old head */
const OLD_HEAD_AREAS={
 /* raised hand: the head plus the hand resting on its right side (fingers poke over the hair), not the raised far arm (x<15);
  * 54/55/56/64 are the same pose with the frame origin 0 / 2 / 1 world px further left */
 23:[[[15,0],[46,0],[46,28],[15,28]]],36:[[[15,0],[46,0],[46,28],[15,28]]],37:[[[15,0],[46,0],[46,28],[15,28]]],
 54:[[[15,0],[46,0],[46,28],[15,28]]],56:[[[15,0],[46,0],[46,28],[15,28]]],55:[[[19,0],[50,0],[50,28],[19,28]]],64:[[[17,0],[50,0],[50,28],[17,28]]]};
/* frame -> world px the box grows by (41's old head is larger than its box) */
const BOX_ERASE_FRAMES=new Map([4,21,41,42,44,45,46,57,60].map(f=>[f,f===41?4:f===45?1:0]));
/* does the frame have an old head to replace (enough varying pixels near its head box) */
const bankHeadMaskSize=f=>{const tf=headBank.template.frames[f];if(!tf?.headRegion)return 0;let n=0;for(const r of bankHeadMask(f))for(const v of r)n+=v;return n;};
/* the raised-hand frames' resting right hand (2026-10-21): inside the authored old-head area, right of HAND_X, the
 * pixels every character shares (the vote found no difference: body, not head), top rows. It is erased with the old head and
 * drawn again over the new one, as the original draws its fist tile over the head */
const HAND_X={23:30,36:30,37:30,54:30,56:30,55:34,64:32},HAND_ROWS=10;/* only the fingers over the hair: the HD palm below is the right
 * edge of the old face and drew a seam line down the new one */
function oldHandMask(f){const hb=headBank;if(HAND_X[f]==null)return null;bankHeadMask(f);const k='hand'+f;if(hb.masks.has(k))return hb.masks.get(k);const a=hb.template.frames[f],v=hb.votes.get(f);
 const m=a.pixels.map((r,y)=>Uint8Array.from([...r],(p,x)=>p!=='0'&&x>=HAND_X[f]&&y<HAND_ROWS&&!v[y][x]&&OLD_HEAD_AREAS[f].some(poly=>inPolygon(x+.5,y+.5,poly))?1:0));hb.masks.set(k,m);return m;}
function inPolygon(x,y,p){let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins;}return ins;}
function headBankArt(skin,f,override=null){const hb=headBank,head=override?.head??hb.heads[skin.id],tf=hb.template.frames[f],own=skin.frames[f];let body=own&&tf&&own.width===tf.width&&own.height===tf.height&&own.originX===tf.originX?own:tf,pl=override?override.pl:tsubasaHeadPlacement(f);
 if(!pl&&!override&&BAKED_HEADS[f]&&tf?.headRegion)pl={...BAKED_HEADS[f],x:tf.headRegion.x,y:tf.headRegion.y,flipH:false,flipV:false,inFront:false};
 if(!head||!body||!pl||!head[pl.dir])return null;
 /* the character's own body frame and palette (keeps skin tone, sleeves, keeper gear); the template only when geometry differs */
 const bodyPal=body===own?skin.palette:hb.template.palette,mask0=bankHeadMask(f);
 /* the HD body was drawn inside the native sprite bounds and is sliced flat where it grew past them
  * (frame 10's hair on the right edge): pad 4 px left/right/top and round the cut runs out */
 {const PAD=override?.pad??4;var PADH=PAD;const c=capCutEdges({pixels:body.pixels,materials:body.materials,shade:body.shade},{pad:{l:PAD,r:PAD,t:PAD,b:PAD},caps:['l','r','t']});
  body={...body,width:body.width+2*PAD,height:body.height+2*PAD,originX:body.originX-PAD/2,originY:body.originY-PAD/2,pixels:c.layers.pixels,materials:c.layers.materials,...(c.layers.shade?{shade:c.layers.shade}:{}),edgeCaps:c.cut.length};
  /* the padding takes the mask of the nearest frame pixel: a cap rounding off old hair sliced at the frame edge is old head too */
  const cl=(v,n)=>Math.max(0,Math.min(n-1,v)),H0=mask0.length,W0=mask0[0]?.length??0;
  var hm=Array.from({length:body.height},(_,y)=>Uint8Array.from({length:body.width},(_,x)=>mask0[cl(y-PAD,H0)]?.[cl(x-PAD,W0)]??0));
  /* the per-pixel kit layers are padded with the frame (unpadded, a keeper's long sleeves / gloves painted the face) */
  var padRows=m=>m&&Array.from({length:body.height},(_,y)=>Array.from({length:body.width},(_,x)=>m[y-PAD]?.[x-PAD]??'0'));
  var kitLayers={sleeveMask:padRows(body.sleeveMask),shortSleeveMask:padRows(body.shortSleeveMask),patternSourceMaterials:padRows(body.patternSourceMaterials)};}
 const W=body.width,H=body.height,px=body.pixels.map(r=>[...r]),mat=body.materials.map(r=>[...r]),owner=Array.from({length:H},()=>Array(W).fill('0'));
 const rows=pl.rotate==='ccw'?rotateCcw(head[pl.dir]):head[pl.dir],hh=rows.length,hw=rows[0].length,hp0=head.pad??{x:0,y:0},hp=pl.rotate==='ccw'?{x:hp0.y,y:hp0.x}:hp0,ox=Math.round((pl.x-body.originX)*2)-hp.x,oy=Math.round((pl.y-body.originY)*2)-(pl.flipV?0:hp.y);
 /* chin zone (the head's lowest 4 rows and 2 rows under it): the old neck/collar pixels stay, and the new
  * head is drawn over them; clearing them left gaps that made shoulders float beside a narrower chin */
 const keep=Array.from({length:H},()=>new Uint8Array(W));if(!pl.flipV&&!pl.rotate){let last=-1;rows.forEach((r,y)=>{if(/[^0]/.test(r))last=y;});const hb=oy+last;
  /* authored areas (OLD_HEAD_AREAS) also cover the old hand beside the chin: keep only under the new chin's own columns */
  let cx0=0,cx1=W-1;if(OLD_HEAD_AREAS[f]){cx0=W;cx1=-1;for(let y=Math.max(0,last-3);y<=last;y++)[...rows[y]].forEach((v,x)=>{if(v!=='0'){cx0=Math.min(cx0,ox+x);cx1=Math.max(cx1,ox+x);}});}
  for(let y=Math.max(0,hb-3);y<=Math.min(H-1,hb+2);y++)for(let x=Math.max(0,cx0);x<=Math.min(W-1,cx1);x++)if(hm[y][x]&&px[y][x]!=='0')keep[y][x]=1;}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(hm[y][x]&&!keep[y][x])px[y][x]='0';
 /* shared body inside the old head box was never given kit materials (frame 10's raised far arm stays
  * white in every kit and reads as a shard): white body pixels there become shirt */
 const sh=body.shade?.map(r=>[...r]),isWhite=v=>{const c=bodyPal[parseInt(v,16)];if(!c)return false;const [r,g,b]=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return .3*r+.59*g+.11*b>185&&Math.abs(r-b)<30;};
 let clipped=0;for(let y=0;y<hh;y++)for(let x=0;x<hw;x++){const v=rows[pl.flipV?hh-1-y:y][pl.flipH?hw-1-x:x];if(v==='0')continue;const tx=ox+x,ty=oy+y;if(tx<0||ty<0||tx>=W||ty>=H){clipped++;continue;}
  if(!pl.inFront&&px[ty][tx]!=='0'&&!hm[ty][tx]&&!keep[ty][tx])continue;/* body tiles drawn in front of the head stay in front */px[ty][tx]=v;mat[ty][tx]='0';owner[ty][tx]='1';}
 /* close holes the old head leaves where the new head is smaller: empty pixels not reachable from the
  * outside of the sprite get their original body pixel back */
 const out=Array.from({length:H},()=>new Uint8Array(W)),st=[];for(let x=0;x<W;x++)st.push([x,0],[x,H-1]);for(let y=0;y<H;y++)st.push([0,y],[W-1,y]);
 while(st.length){const [x,y]=st.pop();if(x<0||y<0||x>=W||y>=H||out[y][x]||px[y][x]!=='0')continue;out[y][x]=1;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
 /* inside an authored old-head area a hole is the gap between the raised arm and the new head: it stays open (filling
  * it as neck made the neck look stretched, user 2026-10-21) */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(px[y][x]==='0'&&!out[y][x]&&body.pixels[y][x]!=='0'&&!(OLD_HEAD_AREAS[f]&&hm[y][x]&&!keep[y][x])){px[y][x]=body.pixels[y][x];mat[y][x]=body.materials[y][x];}
 /* the resting right hand goes back in front of the new head */
 {const hand=override?oldHandMask(f):null;if(hand)for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(hand[y-PADH]?.[x-PADH]&&body.pixels[y][x]!=='0'){px[y][x]=body.pixels[y][x];mat[y][x]=body.materials[y][x];owner[y][x]='0';}}
 /* seams where the swapped head meets the unchanged body (src/tsubasa-head-seams.js) */
 let seams={spurs:0,chin:0};{const r=body.headRegion;if(r){const x0=Math.round((r.x-body.originX)*2)-6,y0=Math.round((r.y-body.originY)*2)-6;
  /* globalThis.__NOSEAM: review tools only, renders without the clean-up for before/after sheets */
  seams=globalThis.__NOSEAM?seams:cleanHeadSeams({px,mat,owner,box:{x0,y0,x1:x0+r.width*2+12,y1:y0+r.height*2+12},ink:'1',orig:body.pixels,origMat:body.materials,mask:hm,skin:headRoles(head).skinBase,skinSet:headRoles(head).skin});}}
 {const r=body.headRegion;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const wx=body.originX+x/2,wy=body.originY+y/2;if(!r||owner[y][x]==='1'||mat[y][x]!=='0'||px[y][x]==='0'||wx<r.x||wx>=r.x+r.width||wy<r.y||wy>=r.y+r.height)continue;
  if(isWhite(px[y][x])){mat[y][x]='1';if(sh?.[y])sh[y][x]=bodyPal[parseInt(px[y][x],16)]&&['6','b'].includes(px[y][x])?'2':'1';}}}
 /* drop leftovers of the old head outline: small body-owned pieces (8-connected, < 60 px) cut off from
  * the figure near the head box */
 {const seen=new Uint8Array(W*H),r=body.headRegion;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(seen[y*W+x]||px[y][x]==='0')continue;const comp=[],st=[[x,y]];seen[y*W+x]=1;
  while(st.length){const [cx,cy]=st.pop();comp.push([cx,cy]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=W||ny>=H||seen[ny*W+nx]||px[ny][nx]==='0')continue;seen[ny*W+nx]=1;st.push([nx,ny]);}}
  const near=r&&comp.every(([cx,cy])=>{const wx=body.originX+cx/2,wy=body.originY+cy/2;return wx>=r.x-3&&wx<r.x+r.width+3&&wy>=r.y-3&&wy<r.y+r.height+3;});
  if(comp.length<60&&near&&comp.every(([cx,cy])=>owner[cy][cx]==='0')||OLD_HEAD_AREAS[f]&&comp.length<12||override&&comp.length<(BOX_ERASE_FRAMES.has(f)?24:16))for(const [cx,cy] of comp)px[cy][cx]='0';}}/* authored-area frames: also shards of the fitted head's cut-off shoulder; fitted frames: any crumb (a cut-off hair tip; on box-erased frames what the box left) */
 /* head pixels are never sleeve */
 for(const k of Object.keys(kitLayers)){const m=kitLayers[k];if(!m){delete kitLayers[k];continue;}kitLayers[k]=m.map((r,y)=>r.map((v,x)=>k!=='patternSourceMaterials'&&owner[y][x]==='1'?'0':v).join(''));}
 return {...body,...kitLayers,pixels:px.map(r=>r.join('')),materials:mat.map(r=>r.join('')),...(sh?{shade:sh.map(r=>r.join(''))}:{}),personPalettes:[bodyPal,head.palette],paletteOwners:owner.map(r=>r.join('')),headBank:{head:skin.id,dir:pl.dir,frame:f,clipped,seams,bodyCaps:body.edgeCaps,headCaps:head.edgeCaps?.[pl.dir]??0}};}

/* Frames the native-body paste cannot do (2026-10-20): the original draws these heads into body tiles (lying
 * 7/35/61, diving 18, tumbling 19, raised hand 23 = head tile 6 with the hand in it, tackle 38 = its face under
 * the kicking head), so pasting on the native tiles left the old eyes and mouth under the new face. Here the
 * character's own HD body is used instead: the old head is found by the bank consensus mask (pixels that differ
 * between characters), and the edited head (cut out of the image-model frames 0 / 16 / 10) is fitted onto that
 * mask: direction, quarter turn, mirror and a +-1 px nudge are tried, scored by overlap with the old head plus
 * agreement of skin vs hair/outline. Drawing then goes through headBankArt (chin keep, hole fill, seams). */
/* direction / quarter turns / mirror per frame: the majority of the 50 characters' free fits (2026-10-20), fixed so
 * every character lies, dives or raises a hand the same way; only the position is fitted per character */
export const TSUBASA_FITTED_HEAD_POSES=Object.freeze({4:['profile',3,false],7:['profile',1,true],12:['profile',0,true],18:['front',0,false],19:['back',3,false],23:['profile',0,false],28:['profile',0,true],34:['profile',0,true],35:['front',1,false],36:['profile',0,false],37:['profile',0,false],38:['profile',0,false],61:['profile',0,true],
 /* 2026-10-21, the rare frames now fitted with the block head (majority of the 50 free fits, checked by eye); 4/19/35/42/46/57
  * re-picked against the original HD frame on the user's per-frame notes (35 chosen by the user) */
 21:['back',0,false],33:['back',0,false],26:['profile',2,false],27:['profile',2,false],41:['back',3,false],42:['profile',0,true],44:['profile',0,false],45:['back',0,false],46:['front',1,false],
 54:['profile',0,false],55:['profile',0,false],56:['profile',0,false],57:['profile',3,false],58:['profile',2,false],60:['profile',0,false],64:['profile',0,false],
 /* 2026-10-23, frames that still drew the old per-character head (user: 67-71/73/74/77/79 do not match the new look):
  * back views 20/49 and the end-of-match poses 65-79 (cheer, kneel, hands on the head, fists at the face) */
 20:['back',0,false],49:['back',0,false],65:['front',0,false],66:['front',0,false],67:['front',0,false],68:['front',0,false],69:['front',0,false],70:['front',0,false],71:['front',0,false],
 72:['front',0,false],73:['front',0,false],74:['front',0,false],75:['front',0,false],76:['front',0,false],77:['front',0,false],78:['front',0,false],79:['front',0,false]});
export const TSUBASA_FITTED_HEAD_FRAMES=Object.freeze(new Set(Object.keys(TSUBASA_FITTED_HEAD_POSES).map(Number)));
const editHeadCache=new Map();
/* drawn over the body: 23/36/37 the resting hand is erased with the old head (OLD_HEAD_AREAS; its fingers are drawn
 * back on top, oldHandMask). 18 (diving header) stays behind the fist like the HD art: in front, the head's lower part
 * was trimmed to the old head and the fist's outline cut across the new face (user 2026-10-21). 4/57 (lying, head turned):
 * the HD fist overlaps the old face; behind it the turned new face read as broken, in front it reads clean */
const HEAD_IN_FRONT=new Set([23,36,37,4,57]);
export function getTsubasaEditHeadImages(skin,edit){return editHeadImages(skin,edit);}
/* the new head-block heads (art/head-blocks.js) as front / profile / back images for the fitted path: the block
 * pixels of frames 0 / 16 / 10, so frames without a block of their own get the same head as the rest (before, they
 * fell back to the older image-model edit and showed the previous hair and face) */
const blockHeadCache=new Map();
export function blockHeadImages(skin,data){if(blockHeadCache.has(skin.id))return blockHeadCache.get(skin.id);const out={id:skin.id,palette:data.palette,pad:{x:0,y:0}};
 for(const [dir,f] of [['front',0],['profile',16],['back',10]]){const art=composeHeadBlockFrame(skin,f,data);if(!art)continue;
  let x0=1e9,y0=1e9,x1=-1,y1=-1;art.paletteOwners.forEach((r,y)=>[...r].forEach((v,x)=>{if(v==='1'&&art.pixels[y][x]!=='0'){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}));if(x1<0)continue;
  const g=Array.from({length:y1-y0+1},(_,j)=>Array.from({length:x1-x0+1},(_,i)=>art.paletteOwners[y0+j][x0+i]==='1'?art.pixels[y0+j][x0+i]:'0'));
  /* holes inside the head (the model left the open mouth / jaw gap transparent, or the face row kept an original
   * pixel there): on the block frame the hole fill shows the body through them, cut out here they were see-through
   * gaps at the chin. Fill them with that body pixel in the head palette, or the nearest head pixel */
  const GH=g.length,GW=g[0].length,outside=g.map(r=>r.map(()=>0)),st=[];for(let x=0;x<GW;x++)st.push([x,0],[x,GH-1]);for(let y=0;y<GH;y++)st.push([0,y],[GW-1,y]);
  while(st.length){const [x,y]=st.pop();if(x<0||y<0||x>=GW||y>=GH||outside[y][x]||g[y][x]!=='0')continue;outside[y][x]=1;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}
  const toHead=c=>{let b='1',bd=1e9;data.palette.forEach((p,k)=>{if(!p||!k)return;const d=[1,3,5].reduce((n,q)=>n+(parseInt(p.slice(q,q+2),16)-parseInt(c.slice(q,q+2),16))**2,0);if(d<bd){bd=d;b=k.toString(16);}});return b;};
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){if(g[y][x]!=='0'||outside[y][x])continue;const v=art.pixels[y0+y][x0+x],c=v!=='0'&&art.personPalettes[0][parseInt(v,16)];
   g[y][x]=c?toHead(c):[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>g[y+b]?.[x+a]).find(u=>u&&u!=='0')??'1';}
  let rows=g.map(r=>r.join(''));
  if(tsubasaHeadPlacement(f)?.flipH)rows=rows.map(r=>[...r].reverse().join(''));out[dir]=rows;}
  const res=out.front?{...out,profile:out.profile??out.front,back:out.back??out.front,}:null;blockHeadCache.set(skin.id,res);return res;}
function editHeadImages(skin,edit){if(editHeadCache.has(skin.id))return editHeadCache.get(skin.id);const out={id:skin.id,palette:edit.headPalette,pad:{x:0,y:0}};
 for(const [dir,frames] of [['front',[0,1,2,30]],['profile',[16,32,22]],['back',[10]]]){const f=frames.find(n=>edit.heads[n]);if(f==null)continue;const art=composeEditedFrame(skin,f,edit);if(!art)continue;
  /* the whole head: the pasted head pixels plus the lower face, which the original draws in body tiles (skin and
   * outline, no kit) inside the HD frame's head box; body pixels keep their body colour (mapped into the head palette) */
  const hr=skin.frames[f].headRegion,inHR=(x,y)=>{if(!hr)return false;const wx=art.originX+x/2,wy=art.originY+y/2;return wx>=hr.x&&wx<hr.x+hr.width&&wy>=hr.y&&wy<hr.y+hr.height;};
  const near=(c,pal)=>{let b=1,bd=1e9;pal.forEach((p,i)=>{if(!p||i===0)return;const d=[1,3,5].reduce((n,k)=>n+(parseInt(p.slice(k,k+2),16)-parseInt(c.slice(k,k+2),16))**2,0);if(d<bd){bd=d;b=i;}});return b.toString(16);};
  /* only skin connected to the head (flooded from it, stopping at outlines) plus the outline around that skin: the
   * chin and neck come along, a shoulder that happens to sit inside the head box does not */
  const AW=art.width,AH=art.height,cand=(x,y)=>x>=0&&y>=0&&x<AW&&y<AH&&art.paletteOwners[y][x]!=='1'&&art.pixels[y][x]!=='0'&&art.materials[y][x]==='0'&&inHR(x,y);
  const isSk=(x,y)=>colorClass(skin.palette[parseInt(art.pixels[y][x],16)])===2,N4=[[1,0],[-1,0],[0,1],[0,-1]],lower=new Set(),st=[];
  for(let y=0;y<AH;y++)for(let x=0;x<AW;x++)if(cand(x,y)&&isSk(x,y)&&N4.some(([a,b])=>art.paletteOwners[y+b]?.[x+a]==='1'))st.push([x,y]);
  while(st.length){const [x,y]=st.pop(),k=x+','+y;if(lower.has(k))continue;lower.add(k);for(const [a,b] of N4)if(cand(x+a,y+b)&&isSk(x+a,y+b)&&!lower.has((x+a)+','+(y+b)))st.push([x+a,y+b]);}
  for(const k of [...lower]){const [x,y]=k.split(',').map(Number);for(const [a,b] of N4)if(cand(x+a,y+b)&&!isSk(x+a,y+b))lower.add((x+a)+','+(y+b));}
  const take=(x,y)=>art.paletteOwners[y][x]==='1'?art.pixels[y][x]:lower.has(x+','+y)?near(skin.palette[parseInt(art.pixels[y][x],16)]??'#101b27',edit.headPalette):'0';
  let x0=1e9,y0=1e9,x1=-1,y1=-1;for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++)if(take(x,y)!=='0'){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)continue;
  let rows=Array.from({length:y1-y0+1},(_,j)=>Array.from({length:x1-x0+1},(_,i)=>take(x0+i,y0+j)).join(''));
  if(tsubasaHeadPlacement(f)?.flipH)rows=rows.map(r=>[...r].reverse().join(''));out[dir]=rows;}
 if(!out.front){editHeadCache.set(skin.id,null);return null;}out.profile??=out.front;out.back??=out.front;editHeadCache.set(skin.id,out);return out;}
const turn=(rows,k)=>{let r=rows;for(let i=0;i<k;i++){const H=r.length,W=r[0].length;r=Array.from({length:W},(_,y)=>Array.from({length:H},(_,x)=>r[H-1-x][y]).join(''));}return r;};
const colorClass=h=>{if(!h)return 0;const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),l=.3*r+.59*g+.11*b;return l<90?1:r>150&&r>g+15&&g>=b-10?2:3;};/* 1 dark (hair/outline) 2 skin 3 other */
function fittedEditArt(skin,f,head){const tf=headBank.template.frames[f],own=skin.frames[f];if(!tf||!own||!head)return null;
 const body=own.width===tf.width&&own.height===tf.height&&own.originX===tf.originX?own:tf,pal=body===own?skin.palette:headBank.template.palette,mask=bankHeadMask(f),W=body.width,H=body.height,M=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(mask[y][x]&&body.pixels[y][x]!=='0')M.push([x,y,colorClass(pal[parseInt(body.pixels[y][x],16)])]);if(M.length<40)return null;
 const mx0=Math.min(...M.map(p=>p[0])),mx1=Math.max(...M.map(p=>p[0])),my0=Math.min(...M.map(p=>p[1])),my1=Math.max(...M.map(p=>p[1])),mset=new Int8Array(W*H).fill(-1);for(const [x,y,c] of M)mset[y*W+x]=c;
 const maskAt=(x,y)=>x>=0&&y>=0&&x<W&&y<H?mset[y*W+x]:-1;
 /* the old head's shape says whether the head lies on its side (quarter turns) or stands (upright / upside down) */
 const lying=(mx1-mx0)>(my1-my0)*1.15,turns=lying?[1,3]:[0,2],hp=head.palette;let best=null;
 const fixed=globalThis.__FREEFIT?null:globalThis.__POSE?.[f]??TSUBASA_FITTED_HEAD_POSES[f];/* __FREEFIT / __POSE: review tools only (re-derive the table, try a pose) */
 for(const dir of fixed?[fixed[0]]:['front','profile','back'])for(const k of fixed?[fixed[1]]:turns)for(const mirror of fixed?[fixed[2]]:[false,true]){let rows=turn(head[dir],k),low=turn(head[dir].map((r,y)=>(y>=head[dir].length*.6?'1':'0').repeat(r.length)),k);if(mirror){rows=rows.map(r=>[...r].reverse().join(''));low=low.map(r=>[...r].reverse().join(''));}const hh=rows.length,hw=rows[0].length;
  const bx=Math.round((mx0+mx1)/2-(hw-1)/2),by=Math.round((my0+my1)/2-(hh-1)/2);
  /* Classify the head once, not again for every candidate position. Integer mask lookups avoid pixel-key strings. */
  const points=[],classes=hp.map(colorClass);for(let y=0;y<hh;y++)for(let x=0;x<hw;x++)if(rows[y][x]!=='0')points.push(x,y,classes[parseInt(rows[y][x],16)]);
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){let inter=0,agree=0;const n=points.length/3;for(let i=0;i<points.length;i+=3){const m=maskAt(bx+dx+points[i],by+dy+points[i+1]);if(m<0)continue;inter++;if(m===points[i+2])agree++;}
   const score=inter/(n+M.length-inter)+(inter?agree/inter:0);if(!best||score>best.score)best={score,rows,low,k,dir,mirror,ox:bx+dx,oy:by+dy};}}
 /* the lower 40% of the head (neck, and the shoulder the image model repainted next to it) is kept only where the
  * old head was (2 px slack): the HD body draws its own shoulders */
 const near2=(x,y)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(maskAt(x+dx,y+dy)>=0)return true;return false;};
 best.rows=best.rows.map((r,y)=>[...r].map((v,x)=>v!=='0'&&best.low[y][x]==='1'&&!near2(best.ox+x,best.oy+y)?'0':v).join(''));
 const art=headBankArt(skin,f,{pad:f>=65&&f<=79?16:10/* tall hair over the fists at the top of the frame (Pierre, Napoleon) */,head:{...head,fit:best.rows},pl:{dir:'fit',x:body.originX+best.ox/2,y:body.originY+best.oy/2,flipH:false,flipV:false,inFront:HEAD_IN_FRONT.has(f),...(best.k?{rotate:'fit'}:{})}});
 return art?{...art,headFit:{score:Math.round(best.score*100)/100,dir:best.dir,turn:best.k,mirror:best.mirror}}:null;}

/** HD art for (character skin, native frame), or null when layering is off / not possible.
 * Body = template frame minus its head box; head = the character's pixels inside its own head box,
 * placed on the template's head box. Two palettes via personPalettes + paletteOwners. */
/* first-draw cost of a character frame (head assembly), outside the idle warm-up: the status panel shows it per paint */
const composeClock=()=>globalThis.performance?.now?.()??Date.now(),composeStats={ms:0,count:0};
export const getTsubasaHeadComposeStats=()=>({ms:composeStats.ms,count:composeStats.count});
export function getTsubasaLayeredArt(skin,frame){
 if(!skin?.frames||(!config&&!headBank))return null;
 if(headBank?.warm&&!headBank.warmed.has(skin.id)){headBank.warmed.add(skin.id);warmTsubasaHeadBank([skin]);}
 const key=skin.id+'/'+(frame&127);if(cache.has(key)){const art=cache.get(key);cache.delete(key);cache.set(key,art);return art;}
 const start=composeClock();try{return layeredArt(skin,frame);}finally{
  if(cache.size>MAX_CACHED_FRAMES)cache.delete(cache.keys().next().value);
  composeStats.ms+=composeClock()-start;composeStats.count++;}
}
function layeredArt(skin,frame){
 const f=frame&127,key=skin.id+'/'+f;
 /* image-model head edits (art/head-edits.js): the original Nekketsu body with the edited head put on its
  * head tile (src/tsubasa-native-heads.js); frames it cannot draw fall through to the head bank */
 /* head blocks (2026-10-20): head tiles + face row cut from the raw image-model edits, swapped as one block on the
  * frames built from the same tiles (src/tsubasa-head-blocks.js); frames without a block fall through */
 /* a likeness character's frames without a usable block get the block head fitted on the HD body, never the
  * older edit: 23/54/55/56/64 (the native fist covers the face; the HD body has it beside the head), 36 (the HD
  * body faces right, the block is the back of the head), 38 (the face was cut at the body tiles) and every rare frame without a block */
 const hbData=headBank?.edits?HEAD_BLOCKS[skin.id]:null;
 if(hbData&&!FITTED_OVER_BLOCK.has(f)){const art=composeHeadBlockFrame(skin,f,hbData);if(art){cache.set(key,art);return art;}}
 if(hbData?.likeness&&TSUBASA_FITTED_HEAD_FRAMES.has(f)&&bankHeadMaskSize(f)){let art=fittedEditArt(skin,f,blockHeadImages(skin,hbData));
  /* the body skin follows the new face (skinTone) as on the block frames */
  if(art&&hbData.skinTone&&art.personPalettes[0]===skin.palette)art={...art,personPalettes:[bodyPalette(skin,hbData.skinTone),art.personPalettes[1]]};if(art){cache.set(key,art);return art;}}
 if(headBank?.edits&&headBank.legacyEdits[skin.id]&&TSUBASA_FITTED_HEAD_FRAMES.has(f)){const art=fittedEditArt(skin,f,editHeadImages(skin,headBank.legacyEdits[skin.id]));if(art){cache.set(key,art);return art;}}
 if(headBank?.edits&&headBank.legacyEdits[skin.id]){const art=composeEditedFrame(skin,f,headBank.legacyEdits[skin.id]);if(art){cache.set(key,art);return art;}}
 if(headBank){const art=headBankArt(skin,f);if(art||!config){cache.set(key,art);return art;}}
 if(!config){cache.set(key,null);return null;}
 const body=config.template.frames[f],own=skin.frames[f];let art=null;
 if(body&&own&&body.headRegion&&own.headRegion&&TSUBASA_POSE_CATALOG[f]?.headDir!=='baked'){
  if(skin===config.template){art=own;}else{
  const W=body.width,H=body.height,px=body.pixels.map(r=>[...r]),mat=body.materials.map(r=>[...r]),owner=Array.from({length:H},()=>Array(W).fill('0'));
  const inBox=(a,x,y)=>{const wx=a.originX+x/2,wy=a.originY+y/2,b=a.headRegion;return wx>=b.x&&wx<b.x+b.width&&wy>=b.y&&wy<b.y+b.height;};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inBox(body,x,y)&&mat[y][x]==='0'){px[y][x]='0';}/* clear the template's head (skin/hair, not kit) */
  const dx=Math.round((body.headRegion.x-own.headRegion.x)*2-(body.originX-own.originX)*2),dy=Math.round((body.headRegion.y-own.headRegion.y)*2-(body.originY-own.originY)*2);
  for(let y=0;y<own.height;y++)for(let x=0;x<own.width;x++){if(own.pixels[y][x]==='0'||!inBox(own,x,y)||own.materials[y][x]!=='0')continue;const tx=x+dx,ty=y+dy;if(tx<0||ty<0||tx>=W||ty>=H)continue;
   px[ty][tx]=own.pixels[y][x];mat[ty][tx]='0';owner[ty][tx]='1';}
  art={...body,pixels:px.map(r=>r.join('')),materials:mat.map(r=>r.join('')),personPalettes:[config.template.palette,skin.palette],paletteOwners:owner.map(r=>r.join('')),layered:{body:config.template.id,head:skin.id,frame:f}};}}
 cache.set(key,art);return art;
}
