// Scale the authored 512 × 480 surface, not the 256 × 240 logical background.
export function screenSize(width,height,dpr=1,mode='crisp'){
 const fit=Math.max(.1,Math.min(width/512,height/480));
 const integer=Math.floor(fit*dpr)/dpr;
 // Avoid a 512px step shrinking a nearly fitting game to half the available
 // area. Prefer integer pixels when that uses at least 85% of the slot.
 const scale=mode==='crisp'&&integer/fit>=.85?integer:fit;
 return {width:512*scale,height:480*scale,scale,integer:Math.abs(scale*dpr-Math.round(scale*dpr))<1e-6};
}
export function installDisplay(canvas,slot,getMode){
 function resize(){const r=slot.getBoundingClientRect(),mode=getMode(),size=screenSize(r.width-24,r.height-24,devicePixelRatio||1,mode);canvas.style.width=`${size.width}px`;canvas.style.height=`${size.height}px`;canvas.style.imageRendering=mode==='crisp'?'pixelated':'auto';canvas.dataset.integerScale=String(size.integer);}
 const observer=new ResizeObserver(resize);observer.observe(slot);window.addEventListener('resize',resize);resize();
 return {resize,dispose(){observer.disconnect();window.removeEventListener('resize',resize);}};
}
