/** D-60 (match canvas sizing). Source = 256x240 native pixels (backing canvas 512x480, 2 per native px).
 * k = device px per native px. Prefer the largest integer k whose CSS width fits the slot (D-54-style
 * pixel-exact, nearest-neighbour). D-60 hard floor: at least 300 CSS px; when the integer size would be
 * narrower than that, keep the slot width (nearest-neighbour, no smoothing; some rows/cols 1 device px
 * thicker = logged debt) instead of shrinking under the floor. */
export const MATCH_CANVAS_MIN_CSS=300;
/** D-63: only at DPR 3, widen the 320-css slot to 1024/3 = 341.33 css so k=4 exactly (side frames give up the
 * ~21 css: .screen-frame inline padding 10->0, .handheld 16->15). Other DPRs keep the D-60 rule. */
export const MATCH_CANVAS_DPR3_CSS=1024/3;
export function isDpr3Wide(slotCss,dpr){return Math.abs(dpr-3)<0.01&&slotCss>=318;}
export function matchCanvasLayout(slotCss,dpr=1,{min=MATCH_CANVAS_MIN_CSS,source=256,wide=false}={}){
 if(wide&&isDpr3Wide(320,dpr)&&source===256)return {mode:'integer',k:4,cssWidth:MATCH_CANVAS_DPR3_CSS,cssHeight:4*240/3,deviceWidth:1024,exact:true,dpr3Wide:true};
 const d=Number.isFinite(dpr)&&dpr>0?dpr:1,k=Math.floor(slotCss*d/source+1e-6),css=k*source/d;
 if(k>=1&&css>=min-1e-6)return {mode:'integer',k,cssWidth:css,cssHeight:k*240/d,deviceWidth:k*source,exact:true};
 return {mode:'floor-nonint',k:slotCss*d/source,cssWidth:slotCss,cssHeight:slotCss*240/source,deviceWidth:slotCss*d,exact:false};
}
export function installMatchCanvasScale(canvas,win=globalThis){
 if(!canvas||!win?.document)return {apply(){},uninstall(){}};let busy=false,last=null;
 const apply=()=>{if(busy||canvas.hidden)return;busy=true;try{canvas.style.width='';canvas.style.height='';canvas.style.translate='';const slot=canvas.getBoundingClientRect().width;if(!slot){return;}const dpr=win.devicePixelRatio||1,wide=isDpr3Wide(slot,dpr);if(win.document.body?.classList.contains('dpr3-wide')!==wide){win.document.body?.classList.toggle('dpr3-wide',wide);canvas.style.width='';busy=false;return apply();}const L=matchCanvasLayout(slot,dpr,{wide});
  canvas.style.width=L.cssWidth+'px';canvas.style.height=L.cssHeight+'px';
  {const r=canvas.getBoundingClientRect(),fx=r.left*dpr-Math.round(r.left*dpr),fy=r.top*dpr-Math.round(r.top*dpr);if(Math.abs(fx)>1e-3||Math.abs(fy)>1e-3)canvas.style.translate=`${-fx/dpr}px ${-fy/dpr}px`;}
  canvas.dataset.scaleMode=L.mode;canvas.dataset.k=String(Math.round(L.k*1000)/1000);canvas.dataset.cssWidth=String(Math.round(L.cssWidth*1000)/1000);last=L;}finally{busy=false;}};
 const ro=typeof win.ResizeObserver==='function'?new win.ResizeObserver(()=>apply()):null;ro?.observe(canvas.parentElement??canvas);
 win.addEventListener('resize',apply);const mo=typeof win.MutationObserver==='function'?new win.MutationObserver(()=>apply()):null;mo?.observe(canvas,{attributes:true,attributeFilter:['hidden']});apply();
 return {apply,get layout(){return last;},uninstall(){ro?.disconnect();mo?.disconnect();win.removeEventListener('resize',apply);}};
}
