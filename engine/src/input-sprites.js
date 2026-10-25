// Direct, bounded translation of identified game routines. No ROM loader or CPU interpreter.
// Evidence: docs/DEVELOPMENT.md and sprite-data.json.
export const BUTTONS = Object.freeze({A:128,B:64,Select:32,Start:16,Up:8,Down:4,Left:2,Right:1});
export function decodeSerialPorts(port4016, port4017) {
  if(port4016.length !== 8 || port4017.length !== 8) throw new RangeError('Eight serial reads required');
  const r=[0,0,0,0];
  for(let i=0;i<8;i++) { r[0]=((r[0]<<1)|(port4016[i]&1))&255; r[2]=((r[2]<<1)|((port4016[i]>>1)&1))&255; r[1]=((r[1]<<1)|(port4017[i]&1))&255; r[3]=((r[3]<<1)|((port4017[i]>>1)&1))&255; }
  return r;
}
export function inputEdges(previous, current) {
  if(previous.length!==4 || current.length!==4) throw new RangeError('Four controller bytes required');
  return {held:current.map(x=>x&255), pressed:current.map((x,i)=>(x^previous[i])&x&255)};
}
// $EDCD compares consecutive complete reads, not independent read pairs or timed debounce.
// Original can retry forever. A finite host-provided trace returns pending when exhausted.
export function stableFourControllers(previous, samples) {
  for(let i=1;i<samples.length;i++) if(samples[i].length===4 && samples[i].every((v,j)=>v===samples[i-1][j])) return {...inputEdges(previous,samples[i]), reads:i+1, pending:false};
  return {pending:true, reads:samples.length};
}
export function mergeExpansionInputs(sample) { return [sample[0]|sample[2],sample[1]|sample[3]]; }
import { ALL_PLAYER_FRAMES } from './sprite-frames.js';
export const PLAYER_FRAMES = ALL_PLAYER_FRAMES;
export const HEAD_TILES = [0, 1, 2, 3, 4, 5, 155, 156, 187, 188, 4, 254, 171, 172, 186, 3, 4, 5, 173, 174, 191, 3, 4, 5, 205, 206, 237, 238, 189, 190, 141, 142, 159, 3, 4, 5, 221, 222, 223, 3, 4, 5, 235, 236, 255, 3, 4, 5, 203, 204, 239, 3, 4, 5, 219, 220, 207, 3, 4, 5, 157, 158, 175, 3, 4, 5, 139, 140, 143, 3, 4, 5, 139, 140, 143, 188, 189, 190, 141, 142, 159, 188, 189, 190, 155, 156, 187, 188, 189, 190, 157, 158, 175, 188, 189, 190, 171, 172, 186, 188, 189, 190, 173, 174, 191, 188, 189, 190, 75, 76, 79, 124, 125, 126, 77, 78, 95, 124, 125, 126, 91, 92, 123, 124, 125, 126, 93, 94, 111, 124, 125, 126, 107, 108, 122, 124, 125, 126, 109, 110, 127, 124, 125, 126, 132, 133, 134, 135, 4, 5, 136, 137, 138, 139, 4, 5, 140, 141, 142, 143, 4, 5, 176, 177, 178, 179, 4, 5, 152, 153, 154, 155, 4, 5, 156, 157, 158, 159, 4, 5, 164, 165, 166, 167, 4, 5, 168, 169, 170, 171, 4, 5, 172, 173, 174, 175, 4, 5, 180, 181, 182, 183, 4, 5, 184, 185, 186, 187, 4, 5, 188, 189, 190, 191, 4, 5, 202, 203, 204, 205, 206, 207, 218, 219, 220, 221, 222, 223, 234, 235, 236, 237, 238, 239, 250, 251, 252, 253, 254, 255, 204, 205, 252, 253, 254, 255];
export const PLAYER_PALETTE_SLOTS = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 0, 0];
export const FRAME0_CHR_PAGE8 = {"0":[127,255,255,255,127,63,30,30,0,0,0,1,7,30,45,45],"1":[240,248,248,248,248,56,56,56,0,64,224,224,32,224,224,232],"16":[63,63,63,127,255,255,240,248,63,63,63,33,95,96,15,119],"17":[252,252,254,255,255,255,127,255,248,224,220,190,190,62,135,123],"32":[251,251,251,255,241,128,176,144,245,245,245,224,14,127,79,111],"33":[255,255,255,255,254,252,124,4,246,246,246,246,12,120,128,248],"48":[72,127,63,36,36,18,63,63,55,0,19,27,27,13,0,0],"49":[9,255,252,12,4,4,252,248,246,8,248,240,248,248,0,0]};

// Translation of bank08:$8088-$8188 for one ordinary type-0 character.
// object.x/y/groundY are already projected bytes ($03AF/$03C2/$03D5), not invented world coordinates.
// frame bit7 selects orientation exactly as $0074; priority is original $25 (0 or $20).
export function assemblePlayer({x,y,groundY,frame=0,headVariant=0,entity=0,priority=0,clipY=177,frames=PLAYER_FRAMES}, oam=createHiddenOam(), cursor=252) {
 const f=frames[frame&127];
 if(!f || (f.tiles.some(t=>t<6)&&(headVariant<0 || headVariant>=41)) || entity<0 || entity>=18) throw new RangeError('Outside recovered frame/head/entity data');
 x&=255;y&=255;groundY&=255;
 let limit=groundY-y; limit=limit<0?(limit-6)&255:255;
 const flip=((frame&128)^128)>>1, mask=flip|priority;
 let count=0;
 for(let i=0;i<f.tiles.length;i++) {
  if(f.dy[i]>=limit) continue;
  const sy=(f.dy[i]+y)&255; if(sy>=clipY) continue;
  oam[cursor]=sy;
  const tile=f.tiles[i]; oam[cursor+1]=tile<6?HEAD_TILES[headVariant*6+tile]:tile;
  oam[cursor+2]=(f.attributes[i]^mask)|PLAYER_PALETTE_SLOTS[entity];
  const dx=frame&128?f.dx[i]:(~f.dx[i]-7)&255;
  const sx=(dx+x)&255; oam[cursor+3]=sx;
  // Exact signed branch clipping. A skipped component leaves its writes in the current slot.
  if(dx&128) { if((sx&128)&&!(x&128)) continue; }
  else if(!(sx&128)&&(x&128)) continue;
  count++; cursor=(cursor-4)&255;
  if(cursor===252) return {oam,cursor,count,full:true};
 }
 return {oam,cursor,count,full:false};
}
// Hardware submission replacement: caller draws these records on Canvas, no emulated PPU.
// Native NES OAM Y denotes top minus one; retain it and add one only at the drawing boundary.
export function decodeChrTile(bytes) {
 if(bytes.length!==16) throw new RangeError('A 2bpp tile is 16 bytes');
 return Array.from({length:64},(_,i)=>((bytes[i>>3]>>(7-(i&7)))&1)|(((bytes[8+(i>>3)]>>(7-(i&7)))&1)<<1));
}

// 54 original palette records. Team/mode palette-ID selection is translated in sprite-appearance.js.
export const SPRITE_PALETTES = [[15, 15, 15, 15], [15, 15, 48, 38], [15, 28, 48, 44], [15, 28, 60, 44], [15, 15, 48, 38], [15, 15, 48, 23], [15, 7, 48, 39], [15, 15, 48, 39], [15, 15, 22, 38], [15, 15, 24, 38], [15, 15, 20, 38], [15, 15, 33, 38], [15, 15, 35, 23], [15, 15, 41, 23], [15, 15, 44, 23], [15, 7, 26, 39], [15, 7, 18, 39], [15, 7, 22, 39], [15, 15, 25, 39], [15, 15, 60, 39], [15, 15, 36, 39], [15, 48, 18, 22], [15, 48, 26, 22], [15, 15, 26, 22], [15, 48, 44, 22], [15, 48, 26, 18], [15, 15, 48, 22], [15, 15, 48, 16], [15, 15, 48, 18], [12, 7, 48, 38], [48, 7, 48, 38], [12, 15, 7, 38], [48, 15, 7, 38], [12, 15, 48, 38], [48, 15, 48, 38], [15, 15, 48, 40], [15, 15, 48, 44], [15, 15, 48, 39], [15, 15, 26, 39], [15, 15, 48, 38], [15, 15, 41, 38], [15, 15, 41, 48], [15, 15, 48, 21], [7, 7, 55, 38], [7, 7, 23, 38], [7, 7, 39, 38], [7, 7, 48, 23], [7, 7, 39, 23], [7, 7, 48, 39], [7, 7, 23, 39], [7, 6, 48, 39], [7, 7, 23, 39], [7, 7, 48, 38], [7, 7, 38, 39]];
// $D15F: original brightness clipping (normal fully bright is $40).
export function paletteBrightness(color, brightness, x=0, exemptBefore=0) {
 if(brightness===0) return 15;
 if(x<exemptBefore || color<brightness) return color;
 return (((color&15)|brightness)-16)&255;
}

// Standalone buffer initialization corresponding to the original unused-slot Y=$F8 clear.
export function createHiddenOam(){const oam=new Uint8Array(256);for(let i=0;i<256;i+=4)oam[i]=248;return oam;}

// Same ordinary assembly routine with an explicitly supplied original kind frame array.
export const assembleMetaSprite = assemblePlayer;
