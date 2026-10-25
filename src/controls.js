import {BUTTONS} from '../engine/src/input-sprites.js';

export const ACTIONS=['Up','Down','Left','Right','A','B','Jump','Start','Select'];
export const LABELS={Up:'上',Down:'下',Left:'左',Right:'右',A:'A · 传球 / 确定',B:'B · 射门 / 返回',Jump:'跳跃 · A+B',Start:'开始 / 暂停',Select:'选择'};
const BITS={...BUTTONS,Jump:BUTTONS.A|BUTTONS.B};
export const STORAGE_KEY='tsubasa-web-v1-settings';
export function defaults(){return {keys:[
 {Up:'ArrowUp',Down:'ArrowDown',Left:'ArrowLeft',Right:'ArrowRight',A:'KeyZ',B:'KeyX',Jump:'KeyC',Start:'Enter',Select:'ShiftRight'},
 {Up:'KeyW',Down:'KeyS',Left:'KeyA',Right:'KeyD',A:'KeyG',B:'KeyH',Jump:'KeyJ',Start:'KeyT',Select:'KeyY'}
],buttons:Array.from({length:2},()=>({Up:12,Down:13,Left:14,Right:15,A:0,B:1,Jump:2,Start:9,Select:8})),deadzone:.35,display:'crisp'};}
export function loadSettings(storage){
 const base=defaults();try{const saved=JSON.parse(storage.getItem(STORAGE_KEY));if(!saved)return base;
 const used=new Set();for(let p=0;p<2;p++)for(const a of ACTIONS){const k=saved.keys?.[p]?.[a];if(typeof k!=='string'||!validKey(k)||used.has(k))throw Error('keys');used.add(k);base.keys[p][a]=k;const b=saved.buttons?.[p]?.[a];if(!Number.isInteger(b)||b<0||b>31)throw Error('buttons');base.buttons[p][a]=b;}
 if(Number.isFinite(saved.deadzone)&&saved.deadzone>=.15&&saved.deadzone<=.75)base.deadzone=saved.deadzone;
 if(['crisp','soft'].includes(saved.display))base.display=saved.display;return base;
 }catch{return defaults();}
}
export function validKey(code){return /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Enter|Shift(Left|Right)|Numpad([0-9]|Add|Subtract|Decimal|Enter|Multiply|Divide))$/.test(code);}
export const keyLabel=code=>({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'空格',ShiftRight:'右 Shift',ShiftLeft:'左 Shift'}[code]??code.replace(/^Key|^Digit/,'').replace('Numpad','小键盘 '));
export function padByte(pad,bindings,deadzone){
 if(!pad?.connected)return 0;let bits=0;
 for(const a of ACTIONS)if(pad.buttons?.[bindings[a]]?.pressed)bits|=BITS[a];
 const [x=0,y=0]=pad.axes??[];
 if(x<-deadzone)bits|=BUTTONS.Left;if(x>deadzone)bits|=BUTTONS.Right;
 if(y<-deadzone)bits|=BUTTONS.Up;if(y>deadzone)bits|=BUTTONS.Down;
 // Opposite directions cancel instead of reaching native action tables together.
 if((bits&3)===3)bits&=~3;if((bits&12)===12)bits&=~12;return bits;
}
export function createControls(app,{target=window,getGamepads=()=>navigator.getGamepads?.()??[],settings=defaults(),onChange=()=>{},onMessage=()=>{}}={}){
 const held=new Set(),assignments=[null,null],known=new Set();let enabled=false,capture=null,pads=[];
 const clear=()=>{held.clear();for(let p=0;p<2;p++){app.setControllerSource('web-keyboard',p,0);app.setControllerSource('web-gamepad',p,0);}};
 const keyboard=()=>{for(let p=0;p<2;p++){let bits=0;if(enabled)for(const a of ACTIONS)if(held.has(settings.keys[p][a]))bits|=BITS[a];if((bits&3)===3)bits&=~3;if((bits&12)===12)bits&=~12;app.setControllerSource('web-keyboard',p,bits);}};
 const commit=(value)=>{const {type,player,action}=capture;
  if(type==='keys')for(let p=0;p<2;p++)for(const a of ACTIONS)if(settings.keys[p][a]===value&&(p!==player||a!==action)){onMessage(`该按键已用于 ${p+1}P 的「${LABELS[a]}」，请选择其他按键。`);return;}
  if(type==='buttons')for(const a of ACTIONS)if(settings.buttons[player][a]===value&&a!==action){onMessage(`该按钮已用于「${LABELS[a]}」，请选择其他按钮。`);return;}
  settings[type][player][action]=value;capture=null;clear();onChange();onMessage('设置已更新。');
 };
 const down=e=>{
  if(capture){e.preventDefault();if(e.code==='Escape'){capture=null;onChange();onMessage('已取消改键。');}else if(capture.type==='keys'&&!e.repeat){if(validKey(e.code)&&!e.metaKey&&!e.ctrlKey&&!e.altKey)commit(e.code);else onMessage('请使用字母、数字、方向键、空格、Enter、Shift 或小键盘。');}return;}
  if(!enabled||e.metaKey||e.ctrlKey||e.altKey||/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target?.tagName))return;
  if(settings.keys.some(k=>Object.values(k).includes(e.code))){e.preventDefault();held.add(e.code);keyboard();}
 };
 const up=e=>{held.delete(e.code);keyboard();};
 const blur=()=>clear();
 function poll(){
  let available;try{available=getGamepads();}catch(error){if(error.name!=='SecurityError')throw error;available=[];}
  pads=Array.from(available).filter(p=>p?.connected);const present=new Set(pads.map(p=>p.index));let changed=false;
  for(let p=0;p<2;p++)if(assignments[p]!==null&&!present.has(assignments[p])){assignments[p]=null;changed=true;}
  for(const index of known)if(!present.has(index))known.delete(index);
  for(const pad of pads)if(!known.has(pad.index)){known.add(pad.index);const p=assignments.indexOf(null);if(p>=0)assignments[p]=pad.index;changed=true;}
  if(capture?.type==='buttons'){
   const pad=pads.find(p=>p.index===assignments[capture.player]);const b=pad?.buttons?.findIndex(b=>b.pressed)??-1;
   if(b<0)capture.armed=true;else if(capture.armed)commit(b);
  }
  for(let p=0;p<2;p++)app.setControllerSource('web-gamepad',p,enabled?padByte(pads.find(pad=>pad.index===assignments[p]),settings.buttons[p],settings.deadzone):0);
  if(changed)onChange();
 }
 const oldPoll=app.pollControllers;app.pollControllers=()=>{oldPoll?.();poll();};
 target.addEventListener('keydown',down);target.addEventListener('keyup',up);target.addEventListener('blur',blur);
 return {poll,clear,get settings(){return settings;},get pads(){return pads;},get assignments(){return [...assignments];},get capture(){return capture;},
  setEnabled(value){enabled=value;clear();},
  assign(player,index){const other=player^1;if(index!==null&&!pads.some(p=>p.index===index))return;if(index!==null&&assignments[other]===index)assignments[other]=assignments[player];assignments[player]=index;clear();onChange();},
  remap(type,player,action){clear();capture={type,player,action,armed:false};onChange();onMessage(type==='keys'?'按下新的键盘按键；Esc 取消。':'先松开手柄按钮，再按下新按钮；Esc 取消。');},
  cancel(){capture=null;clear();onChange();},
  reset(){settings=defaults();capture=null;clear();onChange();},
  dispose(){clear();app.pollControllers=oldPoll;target.removeEventListener('keydown',down);target.removeEventListener('keyup',up);target.removeEventListener('blur',blur);}
 };
}
