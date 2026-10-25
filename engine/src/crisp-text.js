/** D-59 (art-fix): Chinese labels are drawn on the 1x logical canvas and then
 * enlarged 2x/3x with nearest-neighbour, so anti-aliased fillText edges turned into
 * grey fuzz ("blurry pixel text"). Draw the glyphs once into a scratch bitmap,
 * snap every pixel to fully on/off (alpha >= CUT), and stamp that bitmap instead.
 * Presentation only: never reads or writes RAM. Hosts without a scratch canvas
 * (node tests) fall back to plain fillText, so headless pixel fixtures are unchanged. */
const CUT=110,cache=new Map();
function scratch(w,h){if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);if(typeof document!=='undefined'&&document.createElement){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}return null;}
export function crispFillText(ctx,text,x,y,maxWidth){
 text=String(text);/* D-63: 'top' is engine-dependent (Chrome em-top vs napi-rs ascent); for the 12px pixel font draw on the alphabetic baseline (ascent 10) so ink starts at y+1 everywhere */
 if(ctx.textBaseline==='top'&&/Fusion Pixel/.test(ctx.font)){const b=ctx.textBaseline;ctx.textBaseline='alphabetic';try{return crispFillText(ctx,text,x,y+10,maxWidth);}finally{ctx.textBaseline=b;}}const font=ctx.font,base=ctx.textBaseline,align=ctx.textAlign,color=ctx.fillStyle;
 if(typeof color!=='string'||!ctx.drawImage){return maxWidth===undefined?ctx.fillText(text,x,y):ctx.fillText(text,x,y,maxWidth);}
 const key=`${font}|${base}|${align}|${color}|${maxWidth}|${text}`;let hit=cache.get(key);
 if(!hit){const px=Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1]??10),pad=Math.ceil(px*1.5),w=Math.ceil(Math.min(maxWidth??Infinity,(ctx.measureText?.(text).width??text.length*px)))+pad*2,h=Math.ceil(px*2)+pad*2;
  const c=scratch(Math.max(1,w),Math.max(1,h)),g=c?.getContext?.('2d');if(!g){return maxWidth===undefined?ctx.fillText(text,x,y):ctx.fillText(text,x,y,maxWidth);}
  g.font=font;g.textBaseline=base;g.textAlign=align;g.fillStyle=color;const ox=align==='right'||align==='end'?w-pad:align==='center'?w/2:pad;
  if(maxWidth===undefined)g.fillText(text,ox,pad);else g.fillText(text,ox,pad,maxWidth);
  const d=g.getImageData(0,0,c.width,c.height);for(let i=3;i<d.data.length;i+=4)d.data[i]=d.data[i]>=CUT?255:0;g.putImageData(d,0,0);
  hit={c,ox,oy:pad};if(cache.size>600)cache.delete(cache.keys().next().value);cache.set(key,hit);}
 const smooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;ctx.drawImage(hit.c,Math.round(x-hit.ox),Math.round(y-hit.oy));ctx.imageSmoothingEnabled=smooth;
}

export function clearCrispTextCache(){cache.clear();}
