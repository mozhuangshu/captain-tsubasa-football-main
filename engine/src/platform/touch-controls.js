/** Touch-only browser adapter. Preserves the original eight button bits and port mix. */
import {BUTTONS} from '../input-sprites.js';
export const MIN_TAP_SAMPLES=4;
const directions=BUTTONS.Up|BUTTONS.Down|BUTTONS.Left|BUTTONS.Right;
export function touchDirectionAt(x,y,rect){
 if(!rect.width||!rect.height)return 0;
 const dx=(x-rect.left-rect.width/2)/(rect.width/2),dy=(y-rect.top-rect.height/2)/(rect.height/2);
 if(Math.max(Math.abs(dx),Math.abs(dy))<.19||Math.max(Math.abs(dx),Math.abs(dy))>1.6)return 0;
 const octant=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
 return [BUTTONS.Right,BUTTONS.Right|BUTTONS.Down,BUTTONS.Down,BUTTONS.Down|BUTTONS.Left,BUTTONS.Left,BUTTONS.Left|BUTTONS.Up,BUTTONS.Up,BUTTONS.Up|BUTTONS.Right][octant];
}
/** Joystick (2026-10-22, replaces the cross pad): the same eight native directions as touchDirectionAt, from the
 * finger's offset to the stick centre in half-widths; a centre dead zone, and no outer cut-off (a thumb pushed past the
 * base keeps its direction). */
export function touchStickDirection(dx,dy){if(Math.max(Math.abs(dx),Math.abs(dy))<.19)return 0;
 const octant=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
 return [BUTTONS.Right,BUTTONS.Right|BUTTONS.Down,BUTTONS.Down,BUTTONS.Down|BUTTONS.Left,BUTTONS.Left,BUTTONS.Left|BUTTONS.Up,BUTTONS.Up,BUTTONS.Up|BUTTONS.Right][octant];}
/** Touch buttons that press several original buttons at once: 跳 = A+B (the native jump combination) */
export const TOUCH_COMBO_BUTTONS=Object.freeze({AB:BUTTONS.A|BUTTONS.B});
/** Pointer identity, rather than one shared bitmask, owns each press. */
export function createTouchState(write,{port=0,onChange=()=>{},latch=false}={}){
 if(!Number.isInteger(port)||port<0||port>3)throw new RangeError('Touch controller port0..3');
 const pointers=new Map(),observed=new Map(),released=new Map();let current=port,gap=0;
 /* D-59 razor/touch: a re-tap of a button whose previous short tap is still latched (MIN_TAP_SAMPLES) used to merge into one long press, so A+B,release,A+B never showed the release and the native jump never started. The re-tap now ends that latch and forces those bits up for one input sample (a real release edge), then reports the new press. */
 const emit=()=>{let bits=0;for(const value of pointers.values())bits|=value;for(const value of released.values())bits|=value.bits;bits&=~gap;write(current,bits);onChange(bits);return bits;};
 const clear=()=>{gap=0;pointers.clear();observed.clear();released.clear();for(let p=0;p<4;p++)write(p,0);onChange(0);};
 return {press(id,bits){released.delete(id);const was=pointers.get(id);if(was!==(bits&255)){let latched=0;for(const[k,v]of [...released])if(v.bits&bits){latched|=v.bits&bits;released.delete(k);}if(latched&&latch)gap|=latched;}pointers.set(id,bits&255);return emit();},
  release(id,{cancel=false}={}){if(cancel)released.delete(id);if(pointers.has(id)){const bits=pointers.get(id),seen=observed.get(id);/* D-59 item 8: a short tap must stay down for MIN_TAP_SAMPLES input samples; one sample was often skipped by menus/logic that read input on alternate frames */const need=typeof id==='string'&&id.startsWith('keyboard:')?1:MIN_TAP_SAMPLES,left=!seen||seen.bits!==bits?need:need-seen.count;if(latch&&!cancel&&bits&&left>0)released.set(id,{bits,left});pointers.delete(id);observed.delete(id);return emit();}if(cancel)return emit();},
  // Called immediately before the original inputEdges sample, never from a timer.
  // A completed unsampled tap survives exactly one sample, with no repeat pulses.
  sample(){const bits=emit(),masked=gap;gap=0;for(const[id,v]of [...released])if(--v.left<=0)released.delete(id);for(const[id,value]of pointers){if(value&masked)continue;/* not seen yet: it was forced up this sample */const o=observed.get(id);observed.set(id,o&&o.bits===value?{bits:value,count:o.count+1}:{bits:value,count:1});}return bits;},clear,
  setPort(port){if(!Number.isInteger(port)||port<0||port>3)throw new RangeError('Touch controller port0..3');clear();current=port;},
  get port(){return current;},get size(){return pointers.size;}};
}
export function installTouchControls(app,{root,portSelect=null,target=window,documentTarget=document}={}){
 if(!root)throw new TypeError('Touch controller element required');
 let clickId=0,lastVisual=-1;const listeners=[],captures=new Map(),timers=new Set(),buttons=[...root.querySelectorAll('[data-button]')],pad=root.querySelector('[data-dpad]'),knob=pad?.querySelector?.('[data-stick-knob]')??null;
 /* the stick head follows the thumb up to a third of the base width; presentation only */
 const moveKnob=(dx,dy,rect)=>{if(!knob?.style)return;if(dx===null){knob.style.transform='';pad.classList?.toggle('is-active',false);return;}const max=rect.width*.32,len=Math.hypot(dx,dy),k=len>max?max/len:1;knob.style.transform=`translate(${Math.round(dx*k)}px,${Math.round(dy*k)}px)`;pad.classList?.toggle('is-active',true);};
 const on=(node,name,fn,options)=>{node?.addEventListener(name,fn,options);listeners.push(()=>node?.removeEventListener(name,fn,options));};
 const state=createTouchState((p,b)=>app.setControllerSource('touch',p,b),{port:Number(portSelect?.value??0),latch:true,onChange:bits=>{if(bits===lastVisual)return;lastVisual=bits;for(const b of buttons){const bit=BUTTONS[b.dataset.button]??TOUCH_COMBO_BUTTONS[b.dataset.button],pressed=!!bit&&(bits&bit)===bit;b.classList.toggle('is-pressed',pressed);b.setAttribute('aria-pressed',String(pressed));}pad?.classList.toggle('is-pressed',!!(bits&directions));}});
 function release(id,cancel=false){const held=captures.get(id);if(!held)return;captures.delete(id);if(held.pad)moveKnob(null);state.release(id,{cancel});try{if(held?.node.hasPointerCapture?.(id))held.node.releasePointerCapture(id);}catch{}}
 function clear(){for(const id of [...captures.keys()])release(id,true);for(const t of timers)clearTimeout(t);timers.clear();state.clear();}
 function move(e){const held=captures.get(e.pointerId);if(!held)return;e.preventDefault();const rect=held.node.getBoundingClientRect();let bits;
  if(held.pad){const dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;bits=rect.width&&rect.height?touchStickDirection(dx/(rect.width/2),dy/(rect.height/2)):0;moveKnob(dx,dy,rect);}
  else bits=e.clientX>=rect.left-10&&e.clientX<=rect.right+10&&e.clientY>=rect.top-10&&e.clientY<=rect.bottom+10?held.bits:0;
  state.press(e.pointerId,bits);
 }
 function down(e,node,isPad,bits){if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();captures.set(e.pointerId,{node,pad:isPad,bits});try{node.setPointerCapture(e.pointerId);}catch{}move(e);}
 if(pad)on(pad,'pointerdown',e=>down(e,pad,true,0),{passive:false});
 for(const button of buttons){
  const bits=BUTTONS[button.dataset.button]??TOUCH_COMBO_BUTTONS[button.dataset.button];if(!bits)throw new RangeError('Unknown touch button');
  if(!button.closest('[data-dpad]'))on(button,'pointerdown',e=>down(e,button,false,bits),{passive:false});
  const keyboardId=`keyboard:${button.dataset.button}`;
  on(button,'keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();state.press(keyboardId,bits);}});
  on(button,'keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();state.release(keyboardId);}});
  on(button,'blur',()=>state.release(keyboardId,{cancel:true}));
  on(button,'click',e=>{if(e.detail!==0)return;const id=`click:${clickId++}`;state.press(id,bits);const timer=setTimeout(()=>{timers.delete(timer);state.release(id);},120);timers.add(timer);});
 }
 on(root,'contextmenu',e=>e.preventDefault());on(target,'pointermove',move,{passive:false});
 on(target,'pointerup',e=>release(e.pointerId));for(const event of ['pointercancel','lostpointercapture'])on(target,event,e=>release(e.pointerId,true));
 on(target,'blur',clear);on(target,'pagehide',clear);on(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)clear();});
 on(portSelect,'change',()=>{clear();state.setPort(Number(portSelect.value));});
 const previousPoll=app.pollControllers;app.pollControllers=()=>{previousPoll?.();state.sample();};
 return {clear,setPort(port){clear();state.setPort(port);if(portSelect)portSelect.value=String(port);},destroy(){clear();app.pollControllers=previousPoll;listeners.forEach(off=>off());},state};
}
