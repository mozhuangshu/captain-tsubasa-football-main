/** Semantic bank01 scoreboard graphics, direct tile-coordinate writes.
 * No ROM, instruction runner or PPU emulation. ECA9 is an explicit host barrier.
 */
import {SCOREBOARD_GRAPHICS_DATA} from './scoreboard-graphics-data.js';
import {createScreenLayout,loadOriginalScreen,applyMenuTileRun} from './screen-loader.js';
import {BACKGROUND_PALETTE_GROUPS} from './sprite-background-palettes.js';
export {SCOREBOARD_GRAPHICS_DATA};
export function scoreboardByte(address){for(const range of SCOREBOARD_GRAPHICS_DATA)if(address>=range.base&&address<range.base+range.bytes.length)return range.bytes[address-range.base];throw new RangeError('Unrecovered scoreboard data '+address.toString(16));}
const word=a=>scoreboardByte(a)|(scoreboardByte(a+1)<<8),bytes=(a,n)=>Array.from({length:n},(_,i)=>scoreboardByte(a+i)),pair=(r,a,v)=>{r[a]=v&255;r[a+1]=v>>>8;};
function check(r,l){if(!(r instanceof Uint8Array)||r.length<2048)throw TypeError('Scoreboard requires full original RAM state');if(!l?.panels?.[1])throw TypeError('Scoreboard requires two visual panels');}
function write(layout,writes,address,tiles,vertical=false){applyMenuTileRun(layout,address,tiles,{vertical});writes.push({address,tiles:[...tiles],vertical});}
/** B5F3 normal team name / B858 halftime title. r2C=address high,r2D=low. */
export function drawScoreboardTeamName_B5F3(r,layout,writes=[]){check(r,layout);r[0x4c]&=0xfb;
 if(r[0x59]===7){const top=bytes(0xb899,8);write(layout,writes,0x24cc,top);write(layout,writes,0x24ec,top.map(v=>(v+16)&255));return writes;}
 const pointer=word(0xb650+r[0x1c]*2);pair(r,0x2e,pointer);const top=bytes(pointer,8),address=(r[0x2c]<<8)|r[0x2d];write(layout,writes,address,top);write(layout,writes,(r[0x2c]<<8)|((r[0x2d]+32)&255),top.map(v=>v===0x35?v:(v+16)&255));return writes;
}
/** B6D8 draws one original 4x6 score digit, in four vertical columns. */
export function drawScoreboardDigit_B6D8(r,layout,writes=[]){check(r,layout);if(r[0x1c]>9)throw RangeError('Original scoreboard digit outside 0..9');r[0x4c]|=4;const pointer=word(0xb754+r[0x1c]*2);pair(r,0x2e,pointer);for(let col=0;col<4;col++){write(layout,writes,(r[0x2c]<<8)|r[0x2d],bytes(pointer+col*6,6),true);if(col!==3)r[0x2d]++;}return writes;}
/** B55C: both original team slots and BCD score digits, then center separator. */
export function drawScoreboardNamesAndScores_B55C(r,layout,writes=[]){check(r,layout);layout.scoreboardTextSlots=[];
 for(let team=0;team<2;team++){r[0x2c]=0x24;r[0x2d]=scoreboardByte(0xb5eb+team);r[0x1c]=r[0x52c+team]&15;drawScoreboardTeamName_B5F3(r,layout,writes);layout.scoreboardTextSlots.push(r[0x59]===7?{kind:'halftime',panel:1,row:6,col:12,width:8,height:2}:{kind:'team',teamId:r[0x1c],panel:1,row:6,col:r[0x2d]&31,width:8,height:2});
  const score=r[0x52e+team];if(!(score&240)){r[0x2c]=0x25;r[0x2d]=scoreboardByte(0xb5ed+team);r[0x1c]=score;drawScoreboardDigit_B6D8(r,layout,writes);}else{r[0x2c]=0x25;r[0x2d]=scoreboardByte(0xb5ef+team);r[0x1c]=score>>>4;drawScoreboardDigit_B6D8(r,layout,writes);r[0x2c]=0x25;r[0x2d]=scoreboardByte(0xb5f1+team);r[0x1c]=score&15;drawScoreboardDigit_B6D8(r,layout,writes);}}
 write(layout,writes,0x256f,[0x36,0x46],true);write(layout,writes,0x2570,[0x36,0x46],true);return writes;
}
/** B955/B97D: six-row surface footer repeated across both screens. */
export function drawScoreboardSurface_B955(r,layout,writes=[]){check(r,layout);const surface=r[0x5fb]&15;if(surface>2)throw RangeError('Original scoreboard surface outside 0..2');const pointer=word(0xb9a8+surface*2);pair(r,0x2c,pointer);r[0x4c]|=4;for(const high of[0x23,0x27]){r[0x1c]=high;r[0x1d]=0;for(let column=0;column<32;column++){write(layout,writes,(high<<8)|column,bytes(pointer,6),true);r[0x1d]++;}}return writes;}
/** B8A1–B8C9. Host must await one native frame before calling finish. */
export function loadScoreboardGraphicsBegin_B8A1(r,layout=createScreenLayout(),{loadScreen=loadOriginalScreen}={}){check(r,layout);r[0x5e8]=r[0x5ec]=r[0x5e9]=r[0x5ed]=0;r[0x5eb]=0x24;r[0x5ea]=0x18;r[0x5f5]=255;const screenId=16+(r[0x630]&3);loadScreen(screenId,r,layout);r[0x4c]|=128;layout.kind='scoreboard';return {layout,screenId,waitNmi:true,continuation:'B8CC'};}
/** B8CC–B934. Display remains disabled until caller's original enable path. */
export function finishScoreboardGraphics_B8D2(r,layout){check(r,layout);r[0x4c]&=127;r[0x4d]&=0xe7;const writes=[];drawScoreboardNamesAndScores_B55C(r,layout,writes);drawScoreboardSurface_B955(r,layout,writes);
 if(r[0x630]&128){switch(r[0x630]&3){case 0:r[0x5ec]=1;break;case 1:r[0x5ec]=2;r.set(bytes(0xb935,16),0x620);break;default:r[0x5ec]=3;r.set(bytes(0xb945,16),0x620);}}
 r[0x5ac]=((r[0x5fb]&15)*2+0x3d)&255;r[0x5ad]=10;if((r[0x5fb]&240)>=0x30)r[0x5ac]++;
 layout.palette=Uint8Array.from([...BACKGROUND_PALETTE_GROUPS[r[0x5ac]],...BACKGROUND_PALETTE_GROUPS[r[0x5ad]]]);for(let i=4;i<16;i+=4)layout.palette[i]=layout.palette[0];layout.kind='scoreboard';return {layout,writes};
}
/** B0B9–B17F / B430–B4D1, called once on the original NMI path. */
export function updateScoreboardGraphics_B0B9(r,layout){check(r,layout);const writes=[];if((r[0x5c]&128)||!r[0x5e8])return {writes,skipped:true};
 if(r[0x5e8]===1){r[0x4c]|=4;do{const root=word(0xb180+(r[0x5ed]&1)*2);pair(r,0x40,root);const pointer=word(root+r[0x5e9]*2);pair(r,0x0c,pointer);const count=r[0x5eb]===0x24&&r[0x5ea]>=4&&r[0x5ea]<28?4:18;write(layout,writes,(r[0x5eb]<<8)|r[0x5ea],bytes(pointer,count),true);r[0x5e9]++;r[0x5ea]++;}while(r[0x5ea]&1);
  if(r[0x5ea]>=32){r[0x5ea]=0;r[0x5eb]=r[0x5eb]===0x20?0x24:0x20;}
  if(r[0x5e9]>=18){r[0x5e9]=0;r[0x5ed]++;const next=r[0x5ea]-20;r[0x5ea]=next<0?next&31:next;if(next<0)r[0x5eb]=r[0x5eb]===0x20?0x24:0x20;}
 }else{r[0x4c]&=0xfb;const phase=r[0x5e9]&127;if(phase>=13)throw RangeError('Original scoreboard patch phase outside 0..12');const pointer=word(0xb4d2+phase*2);pair(r,0x0c,pointer);
  for(let y=0;y<8;y++){let tileOffset=(r[0x5e9]&128)?8:0;const low=scoreboardByte(pointer+y);r[0x5eb]=scoreboardByte(0xb4ec+y);if(((low>>>5)^low)&2)tileOffset+=4;r[0x5ea]=low;write(layout,writes,(r[0x5eb]<<8)|r[0x5ea],[r[0x620+tileOffset],r[0x621+tileOffset]]);r[0x5ea]+=32;write(layout,writes,(r[0x5eb]<<8)|r[0x5ea],[r[0x622+tileOffset],r[0x623+tileOffset]]);}
  r[0x5e9]++;if((r[0x5e9]&127)>=13)r[0x5e9]&=128;r[0x5e9]^=128;
 }return {writes,skipped:false};
}
export function createScoreboardGraphics(){return {begin:loadScoreboardGraphicsBegin_B8A1,finish:finishScoreboardGraphics_B8D2,update:updateScoreboardGraphics_B0B9};}
