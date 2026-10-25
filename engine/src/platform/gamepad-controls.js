/** Standard browser gamepads -> four original button-byte ports. */
import {BUTTONS} from '../input-sprites.js';
export function gamepadButtonByte(pad,{deadzone=.5}={}){
 if(!pad?.connected||pad.mapping!=='standard')return 0;
 const pressed=i=>!!pad.buttons?.[i]?.pressed;let value=0;
 for(const[i,bit]of [[0,BUTTONS.A],[1,BUTTONS.B],[8,BUTTONS.Select],[9,BUTTONS.Start],[12,BUTTONS.Up],[13,BUTTONS.Down],[14,BUTTONS.Left],[15,BUTTONS.Right]])if(pressed(i))value|=bit;
 const [x=0,y=0]=pad.axes??[];if(x<-deadzone)value|=BUTTONS.Left;if(x>deadzone)value|=BUTTONS.Right;if(y<-deadzone)value|=BUTTONS.Up;if(y>deadzone)value|=BUTTONS.Down;
 return value;
}
export function installGamepadControls(app,{target=window,getGamepads=()=>navigator.getGamepads?.()??[],focused=()=>document.hasFocus()}={}){
 const assigned=new Map();let active=true;
 const write=(port,value)=>app.setControllerSource('gamepad',port,value);
 const clear=()=>{for(let port=0;port<4;port++)write(port,0);};
 const poll=()=>{
  if(!active||!focused()){clear();return;}
  const pads=Array.from(getGamepads()).filter(p=>p?.connected&&p.mapping==='standard'),present=new Set(pads.map(p=>p.index));
  for(const[index,port]of assigned)if(!present.has(index)){write(port,0);assigned.delete(index);}
  for(const pad of pads){if(!assigned.has(pad.index)){const used=new Set(assigned.values());const port=[0,1,2,3].find(p=>!used.has(p));if(port===undefined)continue;assigned.set(pad.index,port);}write(assigned.get(pad.index),gamepadButtonByte(pad));}
 };
 const blur=()=>{active=false;clear();},focus=()=>{active=true;},disconnect=e=>{const port=assigned.get(e.gamepad?.index);if(port!==undefined){write(port,0);assigned.delete(e.gamepad.index);}};
 const old=app.pollControllers;app.pollControllers=()=>{old?.();poll();};
 for(const[n,f]of [['blur',blur],['focus',focus],['gamepaddisconnected',disconnect]])target.addEventListener(n,f);
 return ()=>{clear();app.pollControllers=old;for(const[n,f]of [['blur',blur],['focus',focus],['gamepaddisconnected',disconnect]])target.removeEventListener(n,f);};
}
