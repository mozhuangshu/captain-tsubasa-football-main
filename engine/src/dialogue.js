/** Semantic conversion of bank00 AE86..B117. No opcode execution or ROM access. */
import {DIALOGUE_MESSAGES} from './localization-data.js';
export {DIALOGUE_MESSAGES};
const U=v=>v&255;
const events=new WeakMap(),presentations=new WeakMap();
export function isDialogueBusy(r){return !!((r[0x604]|r[0x605])&128);}
export function requestDialogue(r,id){if(!DIALOGUE_MESSAGES[id])throw new RangeError('Original dialogue ID');r[0x606]=id;r[0x604]=128;}
export function dialogueSnapshot(r){return {id:r[0x606],busy:isDialogueBusy(r),waiting:!!(r[0x605]&32),offset:r[0x609]|r[0x60a]<<8,events:events.get(r)||[],presentation:presentations.has(r)?{...presentations.get(r),counts:[...presentations.get(r).counts]}:null};}
function xy(r){return r[0x608]|r[0x607]<<8;}
function setxy(r,n){r[0x608]=n;r[0x607]=n>>>8;}
function accelerated(r){return r[0x58]>0&&r[0x58]<7&&((r[4]|r[5])&240);}
function emit(r,s,e){let es=events.get(r);if(!es)events.set(r,es=[]);es.push(e);
 // Presentation progress survives skipped paint calls; it never writes RAM or drives timing.
 if(e.type==='start')presentations.set(r,{id:e.id,page:-1,line:0,counts:[],visible:false});const p=presentations.get(r);
 if(p){if(e.type==='clear'){p.page++;p.line=0;p.counts=[];p.visible=false;}else if(e.type==='character'){p.visible=true;p.counts[p.line]=(p.counts[p.line]||0)+1;}else if(e.type==='control'&&e.code===247)p.line++;}
 s.onDialogueEvent?.(e,r);}
function patch(r,s,address,tiles){s.drawTiles?.(address,tiles);emit(r,s,{type:'tiles',address,tiles:[...tiles]});}
function clearRows(r,s){const p=xy(r);r[0x695]=r[0x6b8]=27;for(let i=27;i>=0;i--)r[0x696+i]=r[0x6b9+i]=255;r[0x694]=p;r[0x693]=p>>>8;r[0x6b7]=p+32;r[0x6b6]=(p+32)>>>8;patch(r,s,p,Array(27).fill(255));patch(r,s,p+32,Array(27).fill(255));}
function renderCharacter(r,s,code,source){let base=code,mark=255;if(!code){base=255;r[0x60c]=1;}else if(code>=32&&code<80){base=code|128;mark=218;}else if(code>=80&&code<128){base=code+80;mark=219;}
 r[0x2a]=r[0x6b9]=base;r[0x29]=r[0x696]=mark;r[0x695]=r[0x6b8]=1;const p=xy(r);r[0x694]=p;r[0x693]=p>>>8;r[0x6b7]=p+32;r[0x6b6]=(p+32)>>>8;setxy(r,p+1);patch(r,s,p,[mark]);patch(r,s,p+32,[base]);emit(r,s,{type:'character',code,address:p,source});if(base!==255)s.sound?.(0x35);}
function control(r,s,c){emit(r,s,{type:'control',code:c});switch(c){
 case 0xf0:r[0x605]=0x84;r[0x60b]=255;break;
 case 0xf1:r[0x605]=0x88;r[0x60b]=255;break;
 case 0xf2:r[0x605]|=32;break;
 case 0xf3:case 0xf9:r[0x60d]=c===0xf3?15:74;r[0x605]|=64;break;
 case 0xf4:r[0x605]|=16;setxy(r,0x2302);clearRows(r,s);break;
 case 0xf5:r[0x605]=0;emit(r,s,{type:'complete',id:r[0x606]});break;
 case 0xf6:break;
 case 0xf7:{const p=(r[0x60f]|r[0x610]<<8)+64;setxy(r,p);r[0x60f]=p;r[0x610]=p>>>8;break;}
 case 0xf8:r[0x605]&=0xf3;break;
 default:throw new RangeError('Unrecovered dialogue control '+c.toString(16));
}}
function next(r,s){r[0x60c]=accelerated(r)?1:r[0x60e];let code,source;
 if(r[0x605]&12){r[0x32]=r[0x605]&8?0x17:0x11;r[0x33]=6;r[0x60b]++;source={kind:'dynamic',address:(r[0x605]&8?0x617:0x611)+r[0x60b]};code=r[source.address];}
 else{r[0x28]=0;r[0x29]=255;let n=U(r[0x609]+1);r[0x609]=n;if(!n)r[0x60a]++;const offset=r[0x609]|r[0x60a]<<8;const msg=DIALOGUE_MESSAGES[r[0x606]];r[0x32]=msg?.address;r[0x33]=(msg?.address>>>8)+r[0x60a];code=msg?.bytes[offset];source={kind:'message',id:r[0x606],offset,address:msg?.address+offset};if(code===undefined)throw new RangeError('Dialogue read outside recovered message');}
 if(code>=240)control(r,s,code);else renderCharacter(r,s,code,source);
}
/** One original call per frame. Services drawTiles/sound are host presentation only. */
export function stepDialogue(r,s={}){events.set(r,[]);const state=r[0x605];
 if(!(state&128)){if(!(r[0x604]&128))return dialogueSnapshot(r);r[0x604]=0;r[0x609]=r[0x60a]=255;r[0x60e]=r[0x58]>0&&r[0x58]<7?2:5;r[0x605]|=128;emit(r,s,{type:'start',id:r[0x606]});next(r,s);}
 else if(state&64){if(accelerated(r))r[0x60d]=1;r[0x60d]--;if(!r[0x60d])r[0x605]&=0x9f;}
 else if(state&32){r[0x60c]++;let marker=221;if(r[8]&240){r[0x605]&=0x9f;r[0x60c]=1;marker=255;}else if(!(r[0x60c]&28))marker=255;r[0x696]=marker;r[0x695]=1;r[0x694]=0x90;r[0x693]=0x23;patch(r,s,0x2390,[marker]);}
 else if(state&16){setxy(r,xy(r)+64);if(r[0x608]&128){setxy(r,0x2302);r[0x60f]=2;r[0x610]=0x23;r[0x605]&=0xef;emit(r,s,{type:'clear'});}else clearRows(r,s);}
 else{r[0x60c]--;if(!r[0x60c])next(r,s);}
 return dialogueSnapshot(r);
}
