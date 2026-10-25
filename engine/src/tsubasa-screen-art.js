/** Replacement screen art (docs/NEKKETSU_LEFTOVERS.md items 6-8): the boot / closing logo, the title picture and the
 * scoreboard crowd, from art/screen-art.js (NES palette indices, one base-36 character per pixel).
 * Presentation only: never reads or writes gameplay RAM beyond the frame counter and palette the caller passes in.
 * Fades follow the screen's own palette: each NES fade step is -0x10 on every index, black below 0x00. */
import {TSUBASA_SCREEN_ART} from '../art/screen-art.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
const decoded=new Map(),runs=new Map(),bitmaps=new Map();
function pixels(id){if(!decoded.has(id)){const a=TSUBASA_SCREEN_ART[id],out=new Uint8Array(a.width*a.height);for(let i=0;i<out.length;i++)out[i]=a.colors[parseInt(a.data[i],36)];decoded.set(id,out);}return decoded.get(id);}
/** NES index after `step` fade steps (0 = full brightness, 4 = black) */
export const fadeNes=(v,step)=>{if(step<=0)return v;if(step>=4)return 0x0f;const f=v-0x10*step;return f<0?0x0f:f;};
/** fade step of a palette entry that is `full` at full brightness (0x0F = fully faded) */
export function fadeStep(now,full){if(now===0x0f||now===0x0d)return 4;return Math.max(0,Math.min(4,(full>>4)-(now>>4)));}
function scratch(w,h){if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);if(typeof document!=='undefined'&&document.createElement){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}return null;}
/* horizontal runs per row for hosts without a scratch canvas (headless) */
function rowRuns(id){if(!runs.has(id)){const a=TSUBASA_SCREEN_ART[id],p=pixels(id),rows=[];for(let y=0;y<a.height;y++){const row=[];let x=0;while(x<a.width){const v=p[y*a.width+x];let e=x+1;while(e<a.width&&p[y*a.width+e]===v)e++;row.push([x,e-x,v]);x=e;}rows.push(row);}runs.set(id,rows);}return runs.get(id);}
function bitmap(id,step){const key=id+':'+step;if(!bitmaps.has(key)){const a=TSUBASA_SCREEN_ART[id],c=scratch(a.width,a.height),g=c?.getContext?.('2d');if(!g){bitmaps.set(key,null);return null;}
 for(const [y,row] of rowRuns(id).entries())for(const [x,w,v] of row){g.fillStyle=DISPLAY_NES_RGB[fadeNes(v,step)];g.fillRect(x,y,w,1);}bitmaps.set(key,c);}return bitmaps.get(key);}
/** draw the source rectangle (sx,sy,sw,sh) of art `id` at (dx,dy), faded by `step`; `skip` (NES index) leaves those pixels out */
export function drawScreenArt(ctx,id,{dx=0,dy=0,sx=0,sy=0,sw,sh,step=0,skip=null}={}){
 const a=TSUBASA_SCREEN_ART[id];sw??=a.width;sh??=a.height;
 const b=skip===null?bitmap(id,step):null;if(b&&ctx.drawImage){ctx.drawImage(b,sx,sy,sw,sh,dx,dy,sw,sh);return;}
 const rows=rowRuns(id);for(let y=sy;y<sy+sh;y++)for(const [x,w,v] of rows[y]){if(v===skip)continue;const x0=Math.max(x,sx),x1=Math.min(x+w,sx+sw);if(x1<=x0)continue;ctx.fillStyle=DISPLAY_NES_RGB[fadeNes(v,step)];ctx.fillRect(dx+x0-sx,dy+y-sy,x1-x0,1);}
}
/** a tiling art (the crowd) drawn into one 8x8 background cell at panel position (cx,cy) */
export function drawScreenArtCell(ctx,id,cx,cy,step){const a=TSUBASA_SCREEN_ART[id],sx=((cx*8)%a.width+a.width)%a.width,sy=((cy*8)%a.height+a.height)%a.height;
 drawScreenArt(ctx,id,{dx:cx*8,dy:cy*8,sx,sy,sw:Math.min(8,a.width-sx),sh:Math.min(8,a.height-sy),step});}
export const SCREEN_ART_SIZE=Object.freeze(Object.fromEntries(Object.entries(TSUBASA_SCREEN_ART).map(([k,v])=>[k,Object.freeze({width:v.width,height:v.height})])));
