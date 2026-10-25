/** HD pose repairs (2026-10-17). Some authored HD poses are broken in every skin: 35/61 (lying
 * face-down) split the body into a separate head and a limbless block, and 36/37 (hit by an
 * electric shot) are scrambled noise. Each broken pose is replaced by the same character's own
 * intact pose with the same reading, so all 50 skins are fixed at once in their own style:
 *   35, 61 <- 12 (lying flat)      36, 37 <- 23 (arms thrown up, stiff)
 * Pose 19 (curled roll) has the right shape but, in 21 skins, its head piece floats one or two pixels
 * off the body; bridgeDetachedPieces closes such hairline gaps with outline pixels.
 * The native frame numbers, animation timing and RAM are unchanged; only the drawn picture moves.
 * art/hd-runtime.js stays byte-identical (its hash is checked); the swap happens once at load. */
import {HD_CHARACTERS} from '../art/hd-runtime.js';
import {POSE_REPAIR_PATCHES} from '../art/pose-repair-patches.js';
export const TSUBASA_POSE_REPAIRS=Object.freeze({35:12,61:12,36:23,37:23});
/* 65 = cheer with separate motion marks: its pieces are intended */
export const TSUBASA_POSE_PIECES_INTENDED=Object.freeze([65]);
const OUTLINE='1',MIN_PIECE=8,MAX_GAP=3;
/** Joins every opaque piece of >= MIN_PIECE pixels that lies within MAX_GAP pixels of the main body,
 * drawing outline pixels along the shortest link. Returns a new frame (or the same one if whole). */
export function bridgeDetachedPieces(frame){
 const W=frame.width,H=frame.height,px=frame.pixels.map(r=>[...r]),mat=frame.materials?.map(r=>[...r]),on=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&px[y][x]!=='0';
 const label=new Int32Array(W*H).fill(-1),groups=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!on(x,y)||label[y*W+x]>=0)continue;const g=[],st=[[x,y]];label[y*W+x]=groups.length;
  while(st.length){const [cx,cy]=st.pop();g.push([cx,cy]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(on(nx,ny)&&label[ny*W+nx]<0){label[ny*W+nx]=groups.length;st.push([nx,ny]);}}}groups.push(g);}
 if(groups.length<2)return frame;
 const main=groups.reduce((a,b)=>b.length>a.length?b:a);let changed=false;
 for(const g of groups){if(g===main||g.length<MIN_PIECE)continue;let best=null;
  for(const [ax,ay] of g)for(const [bx,by] of main){const d=Math.max(Math.abs(ax-bx),Math.abs(ay-by));if(!best||d<best.d)best={d,ax,ay,bx,by};}
  if(!best||best.d>MAX_GAP)continue;
  for(let t=1;t<best.d;t++){const x=Math.round(best.ax+(best.bx-best.ax)*t/best.d),y=Math.round(best.ay+(best.by-best.ay)*t/best.d);if(px[y][x]==='0'){px[y][x]=OUTLINE;if(mat)mat[y][x]='0';changed=true;}}}
 return changed?{...frame,pixels:px.map(r=>r.join('')),...(mat?{materials:mat.map(r=>r.join(''))}:{})}:frame;
}
let applied=false;
export function applyTsubasaPoseRepairs(characters=HD_CHARACTERS){
 if(characters===HD_CHARACTERS&&applied)return characters;
 for(const c of characters){const frames=c.skin?.frames;if(!frames)continue;
  for(const [to,from] of Object.entries(TSUBASA_POSE_REPAIRS))if(frames[from])frames[to]=frames[from];
  if(characters===HD_CHARACTERS){for(const [f,points] of Object.entries(POSE_REPAIR_PATCHES[c.id]??{})){const a=frames[f],pixels=a.pixels.slice(),materials=a.materials?.slice();
   for(const p of points){const y=Math.floor(p/a.width),x=p%a.width;pixels[y]=pixels[y].slice(0,x)+OUTLINE+pixels[y].slice(x+1);if(materials)materials[y]=materials[y].slice(0,x)+'0'+materials[y].slice(x+1);}
   frames[f]={...a,pixels,...(materials?{materials}:{})};}}
  else for(const f of Object.keys(frames))if(!frames[f].effectPose&&!TSUBASA_POSE_PIECES_INTENDED.includes(+f))frames[f]=bridgeDetachedPieces(frames[f]);}
 if(characters===HD_CHARACTERS)applied=true;
 return characters;
}
applyTsubasaPoseRepairs();
