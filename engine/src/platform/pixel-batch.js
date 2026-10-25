/** Opaque host-background output only. No game state, timing or tile interpretation.
 * Flush before text/foreground drawing. Callers own an unclipped background context.
 * Unit-scale integer placement uses reusable RGBA ImageData; other canvas states
 * and minimal Node mocks preserve the original fillRect path.
 */
const buffers=new WeakMap(),colors=new Map(),flushes=new WeakMap();
/** P-4: the last RGBA buffer put on ctx and how many puts so far, so a host can look at the background it just drew */
export function lastPixelBatchFlush(ctx){return flushes.get(ctx)??null;}
function rgba(color){let value=colors.get(color);if(!value){if(!/^#[0-9a-f]{6}$/i.test(color))throw new TypeError('Opaque #RRGGBB background required');value=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),255];colors.set(color,value);}return value;}
function canBatch(ctx,scale,x,y){
 if(scale!==1||!Number.isInteger(x)||!Number.isInteger(y)||typeof ctx.createImageData!=='function'||typeof ctx.putImageData!=='function')return false;
 if(ctx.globalAlpha!==undefined&&ctx.globalAlpha!==1)return false;
 if(ctx.globalCompositeOperation!==undefined&&ctx.globalCompositeOperation!=='source-over')return false;
 if(ctx.filter!==undefined&&ctx.filter!=='none')return false;
 if(ctx.shadowBlur||ctx.shadowOffsetX||ctx.shadowOffsetY)return false;
 if(ctx.shadowColor&&ctx.shadowColor!=='rgba(0, 0, 0, 0)'&&ctx.shadowColor!=='transparent')return false;
 const m=ctx.getTransform?.();return !m||(m.a===1&&m.b===0&&m.c===0&&m.d===1&&m.e===0&&m.f===0);
}
export function createPixelBatch(ctx,width,height,{scale=1,offsetX=0,offsetY=0}={}){
 let lastColor;
 if(!canBatch(ctx,scale,offsetX,offsetY))return {batched:false,
  fill(color){ctx.fillStyle=color;ctx.fillRect(offsetX,offsetY,width*scale,height*scale);},
  pixel(x,y,color){ctx.fillStyle=color;ctx.fillRect(offsetX+x*scale,offsetY+y*scale,scale,scale);},flush(){}};
 let image=buffers.get(ctx);if(!image||image.width!==width||image.height!==height){image=ctx.createImageData(width,height);buffers.set(ctx,image);}
 const data=image.data;
 return {batched:true,
  fill(color){lastColor=color;const c=rgba(color);for(let at=0;at<data.length;at+=4){data[at]=c[0];data[at+1]=c[1];data[at+2]=c[2];data[at+3]=255;}},
  pixel(x,y,color){lastColor=color;const c=rgba(color),at=(y*width+x)*4;data[at]=c[0];data[at+1]=c[1];data[at+2]=c[2];data[at+3]=255;},
  /* P-2: callers that write data themselves (one RGBA per pixel) name the last colour they wrote, as pixel() would have */
  data,rgba,last(color){lastColor=color;},
  flush(){ctx.putImageData(image,offsetX,offsetY);if(lastColor!==undefined)ctx.fillStyle=lastColor;const f=flushes.get(ctx);flushes.set(ctx,{count:(f?.count??0)+1,image,offsetX,offsetY});}};
}
