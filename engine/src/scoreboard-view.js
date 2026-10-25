import {createPixelBatch} from './platform/pixel-batch.js';
/** Direct non-field camera presentation from fixed-bank NMI camera values.
 * Score scenes disable IRQ at C73F (SEI); menus select ordinary NMI at 4F=80.
 * This module draws visual panels; it is not an interrupt/PPU/CPU interpreter.
 */
import {originalScreenTile} from './screen-loader.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
export const NONFIELD_VIEW_SOURCE=Object.freeze({camera:'07:FC0F–FC32 / FC78–FC99',scoreboardInit:'07:CA1F–CA49',scoreboardIrqDisabled:'07:C73F SEI',fieldIrqRestored:'07:D01D CLI',rosterScroll:'05:9C05 (240-row wrap)',timing:'Native frame camera projection; no cycle or sub-scanline equivalence claim'});
/** Each segment is a visible rectangular section of one original visual panel. */
export function createOriginalScreenProjection(r,layout,{width=256,height=240,cropTop=0}={}){
 if(!(r instanceof Uint8Array)||r.length<2048)throw TypeError('Native camera RAM required');
 if(!layout?.panels?.[1])throw TypeError('Two original visual panels required');
 if(layout.kind==='field')throw RangeError('Field IRQ split requires field-render.js');
 if(r[0xee]>=240)throw RangeError('Non-field camera entered the original 240–255 row gap');
 if(width<1||width>256||height<1||cropTop<0||height+cropTop>240)throw RangeError('Original 256x240 visible window');
 const cameraX=((r[0xed]&1)*256+r[0xec])%512,cameraY=((r[0xef]&1)*240+r[0xee])%480;
 const projection={width,height,cropTop,cameraX,cameraY,mirroring:layout.mirroring,backgroundEnabled:!!(r[0x4d]&8),leftClip:(r[0x4d]&2)?0:8,irqSplit:false,source:NONFIELD_VIEW_SOURCE,segments:[]};
 for(let sy=0;sy<height;){const worldY=(cameraY+cropTop+sy)%480,qy=Math.floor(worldY/240),sourceY=worldY%240,h=Math.min(height-sy,240-sourceY);
  for(let sx=0;sx<width;){const worldX=(cameraX+sx)%512,qx=Math.floor(worldX/256),sourceX=worldX%256,w=Math.min(width-sx,256-sourceX);projection.segments.push({panel:layout.mirroring===1?qy:qx,sourceX,sourceY,screenX:sx,screenY:sy,width:w,height:h});sx+=w;}sy+=h;
 }return projection;
}
/** Project a source tile rectangle without inventing screen coordinates.
 * screenX/Y are the full label origin (may be negative). clip* are its visible
 * intersection. Paint under that clip, then draw foreground sprites afterward.
 */
export function projectOriginalScreenRect(layoutOrProjection,{panel=0,row=0,col=0,width=1,height=1}={}){
 const p=layoutOrProjection.screenProjection??layoutOrProjection;if(!p?.segments||!p.backgroundEnabled)return [];
 const x=col*8,y=row*8,w=width*8,h=height*8,out=[];
 for(const s of p.segments){if(s.panel!==panel)continue;const sx=s.screenX+x-s.sourceX,sy=s.screenY+y-s.sourceY;const x0=Math.max(sx,s.screenX,p.leftClip),y0=Math.max(sy,s.screenY,0),x1=Math.min(sx+w,s.screenX+s.width,p.width),y1=Math.min(sy+h,s.screenY+s.height,p.height);if(x1>x0&&y1>y0)out.push({panel,screenX:sx,screenY:sy,offsetX:sx-x,offsetY:sy-y,width:w,height:h,clipX:x0,clipY:y0,clipWidth:x1-x0,clipHeight:y1-y0,sourceX:x+(x0-sx),sourceY:y+(y0-sy)});}
 return out;
}
function sampleScreenColorAndIndex(layout,panel,x,y,palette){const image=layout.panels[panel],row=y>>>3,col=x>>>3,tile=originalScreenTile(image[row*32+col],layout),attribute=image[960+(row>>>2)*8+(col>>>2)],shift=((row&2)<<1)|(col&2),index=tile[(y&7)*8+(x&7)],paletteIndex=index?((attribute>>>shift)&3)*4+index:0;return (palette[paletteIndex]&63)|(index<<8);}
export function sampleOriginalScreenPixel(layout,panel,x,y,palette=layout.palette){return sampleScreenColorAndIndex(layout,panel,x,y,palette)&63;}
/* Resolve a tile/palette once per visible tile row, instead of looking it up for every pixel.
 * This path writes the existing pixel batch; transformed/mock canvases keep the scalar reference. */
function paintScreenSegments(batch,p,layout,palette,mask,width){
 const data=batch.data,colors=Array.from(palette,v=>batch.rgba(DISPLAY_NES_RGB[v&63]));let last=0;
 for(const s of p.segments){const image=layout.panels[s.panel];
  for(let dy=0;dy<s.height;dy++){const sy=s.sourceY+dy,row=sy>>>3,screenY=s.screenY+dy;
   for(let dx=Math.max(0,p.leftClip-s.screenX);dx<s.width;){
    const sx=s.sourceX+dx,col=sx>>>3,tile=originalScreenTile(image[row*32+col],layout),attribute=image[960+(row>>>2)*8+(col>>>2)],pal=((attribute>>>(((row&2)<<1)|(col&2)))&3)*4;
    const end=Math.min(s.width,dx+8-(sx&7)),at=(sy&7)*8;
    for(;dx<end;dx++){const index=tile[at+((s.sourceX+dx)&7)],i=screenY*width+s.screenX+dx;last=index?pal+index:0;const c=colors[last],o=i*4;
     data[o]=c[0];data[o+1]=c[1];data[o+2]=c[2];data[o+3]=255;mask[i]=index?1:0;}
   }
  }
 }
 batch.last(DISPLAY_NES_RGB[palette[last]&63]);
}
/** Works for score scenes and ordinary/scrolled menus, never the field IRQ HUD. */
export function drawOriginalScrolledScreen(ctx,r,layout,{palette=layout.palette,width=256,height=240,cropTop=0,scale=1,offsetX=0,offsetY=0}={}){
 const p=createOriginalScreenProjection(r,layout,{width,height,cropTop});layout.screenProjection=p;
 const mask=layout.backgroundOpaque?.length===width*height?layout.backgroundOpaque:new Uint8Array(width*height);mask.fill(0);layout.backgroundOpaque=mask;layout.backgroundMaskWidth=width;layout.backgroundMaskHeight=height;
 const batch=createPixelBatch(ctx,width,height,{scale,offsetX,offsetY});batch.fill(DISPLAY_NES_RGB[palette[0]&63]);
 if(p.backgroundEnabled){if(batch.data)paintScreenSegments(batch,p,layout,palette,mask,width);
  else for(const s of p.segments)for(let dy=0;dy<s.height;dy++)for(let dx=0;dx<s.width;dx++){const screenX=s.screenX+dx;if(screenX<p.leftClip)continue;const screenY=s.screenY+dy,sample=sampleScreenColorAndIndex(layout,s.panel,s.sourceX+dx,s.sourceY+dy,palette);mask[screenY*width+screenX]=(sample>>>8)!==0?1:0;batch.pixel(screenX,screenY,DISPLAY_NES_RGB[sample&63]);}}
 batch.flush();
 return layout;
}
export const drawScoreboardScreen=drawOriginalScrolledScreen;
