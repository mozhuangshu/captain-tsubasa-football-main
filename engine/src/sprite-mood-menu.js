import {MOOD_MENUS,MOOD_CHR_PAGE_HEX,MOOD_FACE_TABLE,MOOD_SYMBOL_TABLE,MOOD_POSITIONS} from './sprite-mood-data.js';
import {BACKGROUND_PALETTE_GROUPS} from './sprite-background-palettes.js';
import {decodeChrTile} from './input-sprites.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
// $E941 data format decoder, not an instruction interpreter. Input is a small image stream.
export function decodeMenuImage(bytes){
 let at=0;const out=[];
 const read=()=>{if(at>=bytes.length)throw new RangeError('Truncated image stream');return bytes[at++];};
 while(true){
  const command=read();if(command===0)return {pixels:Uint8Array.from(out),consumed:at};
  const mode=command>>6,count=(command&63)||256;
  if(mode===0){const v=read();for(let i=0;i<count;i++)out.push(v);}
  else if(mode===1){for(let i=0;i<count;i++)out.push(read());}
  else if(mode===2){const count2=read()||256,v=read();for(let i=0;i<count+count2;i++)out.push(v);}
  else {const length=read()||256,block=Array.from({length},read);for(let i=0;i<count;i++)out.push(...block);}
  if(out.length>65536)throw new RangeError('Host image-size guard exceeded');
 }
}
// $B0A8 produces three 3-byte vertical tile columns. Named hardware buffers are reused for tiles here.
export function moodTilePatch(player,mood){
 if(!Number.isInteger(player)||player<0||player>=12)throw new RangeError('Twelve original portrait slots');
 const face=player*8+((mood>>1)&6),symbol=(mood&14)*3,address=MOOD_POSITIONS[player];
 return {player,address,columns:[
  [MOOD_SYMBOL_TABLE[symbol+2],MOOD_SYMBOL_TABLE[symbol+3],MOOD_SYMBOL_TABLE[symbol+4]],
  [MOOD_FACE_TABLE[face],MOOD_SYMBOL_TABLE[symbol],MOOD_SYMBOL_TABLE[symbol+5]],
  [MOOD_FACE_TABLE[face+1],MOOD_SYMBOL_TABLE[symbol+1],31]
 ]};
}
// Host commit replaces original NMI transfer and busy-wait; no PPU is instantiated.
export function applyMoodTilePatch(image,patch){
 for(let x=0;x<3;x++)for(let y=0;y<3;y++)image[patch.address-0x2000+x+y*32]=patch.columns[x][y];return image;
}
export function buildMoodMenu(moods,descriptor=10){
 const menu=MOOD_MENUS.find(m=>m.descriptor===descriptor);if(descriptor!==10 || !menu)throw new RangeError('Unrecovered menu descriptor');
 if(moods.length!==12)throw new RangeError('Twelve mood bytes required');
 const image=decodeMenuImage(menu.compressed).pixels;
 for(let i=0;i<12;i++)applyMoodTilePatch(image,moodTilePatch(i,moods[i]));
 const palette=[...BACKGROUND_PALETTE_GROUPS[menu.paletteIds[0]],...BACKGROUND_PALETTE_GROUPS[menu.paletteIds[1]]];
 for(let i=4;i<16;i+=4)palette[i]=palette[0];
 return {image,chrPages:menu.chrPages,palette,descriptor};
}
const cache=new Map();
export function moodMenuTile(tile,menu){
 const page=menu.chrPages[tile>>6],key=page*64+(tile&63);
 if(!cache.has(key)){const hex=MOOD_CHR_PAGE_HEX[page],at=(tile&63)*32;cache.set(key,decodeChrTile(Array.from({length:16},(_,i)=>parseInt(hex.slice(at+2*i,at+2*i+2),16))));}return cache.get(key);
}
export function drawMoodMenu(ctx,menu,{scale=1,offsetX=0,offsetY=0}={}){
 for(let row=0;row<30;row++)for(let col=0;col<32;col++){
  const tile=menu.image[row*32+col],pixels=moodMenuTile(tile,menu);
  const attr=menu.image[960+(row>>2)*8+(col>>2)],shift=((row&2)<<1)|(col&2),palette=((attr>>shift)&3)*4;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   ctx.fillStyle=DISPLAY_NES_RGB[menu.palette[palette+pixels[y*8+x]]&63];
   ctx.fillRect(offsetX+(col*8+x)*scale,offsetY+(row*8+y)*scale,scale,scale);
  }
 }
}
