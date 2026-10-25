import {ENDING_SPRITE_CHR_HEX} from './ending-sprite-chr.js';
import {spriteScanlineRows} from './platform/sprite-scanlines.js';
// Direct translation of physical PRG bank11:$BD38-$BDD5. ROM never runs here.
import {MENU_SPRITE_CHR_HEX} from './sprite-menu-chr.js';
import {TEAM_PALETTE_PAIRS,TEAM_CHR_PAIRS,TEAM_HEAD_TABLES,CHR_PAGE_HEX} from './sprite-appearance-data.js';
import {SPRITE_PALETTES,decodeChrTile,paletteBrightness} from './input-sprites.js';
export function teamAppearance(team0,team1,playerNumbers) {
 if(playerNumbers.length!==12)throw new RangeError('Twelve interleaved player numbers required');
 const teams=[team0&15,team1&15];
 const first=(teams[1]&3)===0?1:0, second=first^1;
 const headTableIndices=[(teams[0]&3)===0?2:first,(teams[1]&3)===0?2:second];
 const heads=playerNumbers.map((n,i)=>{
  const t=TEAM_HEAD_TABLES[headTableIndices[i&1]];
  if(!Number.isInteger(n)||n<0||n>=t.length)throw new RangeError('Player number outside recovered team roster table');
  return t[n];
 });
 return {teams,headTableIndices,heads,chrPages:[8,TEAM_CHR_PAIRS[teams[second]][1],TEAM_CHR_PAIRS[teams[first]][0],9],paletteIds:[1,TEAM_PALETTE_PAIRS[teams[0]][0],TEAM_PALETTE_PAIRS[teams[1]][0],TEAM_PALETTE_PAIRS[teams[1]][1]]};
}
const pixelCache=new Map();
export function appearanceTile(tile,appearance) {
 const page=appearance.chrPages[tile>>6], key=page*64+(tile&63);
 if(pixelCache.has(key))return pixelCache.get(key);
 const hex=CHR_PAGE_HEX[page]??MENU_SPRITE_CHR_HEX[page]??ENDING_SPRITE_CHR_HEX[page];if(!hex)throw new RangeError('CHR page is outside extracted gameplay resources');
 const at=(tile&63)*32;
 const bytes=Array.from({length:16},(_,i)=>parseInt(hex.slice(at+i*2,at+i*2+2),16));
 const pixels=decodeChrTile(bytes);pixelCache.set(key,pixels);return pixels;
}
// RGB is a fixed display convention: NES palette IDs are exact game data, analog RGB is not in ROM.
export const DISPLAY_NES_RGB = [
 '#7c7c7c','#0000fc','#0000bc','#4428bc','#940084','#a80020','#a81000','#881400','#503000','#007800','#006800','#005800','#004058','#000000','#000000','#000000',
 '#bcbcbc','#0078f8','#0058f8','#6844fc','#d800cc','#e40058','#f83800','#e45c10','#ac7c00','#00b800','#00a800','#00a844','#008888','#000000','#000000','#000000',
 '#f8f8f8','#3cbcfc','#6888fc','#9878f8','#f878f8','#f85898','#f87858','#fca044','#f8b800','#b8f818','#58d854','#58f898','#00e8d8','#787878','#000000','#000000',
 '#fcfcfc','#a4e4fc','#b8b8f8','#d8b8f8','#f8b8f8','#f8a4c0','#f0d0b0','#fce0a8','#f8d878','#d8f878','#b8f8b8','#b8f8d8','#00fcfc','#f8d8f8','#000000','#000000'];
// Canvas adapter: no PPU state, raster timing, ROM mapper, CPU, or emulator.
// Preserve lower OAM index priority, including a behind-background sprite blocking later sprites.
export function drawOriginalOam(ctx,oam,appearance,{scale=1,brightness=64,offsetX=0,offsetY=0,leftClip=0,backgroundOpaque=null,maskWidth=256,maskHeight=240}={}) {
 const claimed=new Uint8Array(256*240);
 const admittedRows=spriteScanlineRows(oam);
 for(let a=0;a<256;a+=4){
  const y=oam[a]+1;if(!admittedRows[a>>2])continue;
  const pixels=appearanceTile(oam[a+1],appearance),attr=oam[a+2],x=oam[a+3];
  const palette=SPRITE_PALETTES[appearance.paletteIds[attr&3]];
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
   if(!(admittedRows[a>>2]&(1<<yy)))continue;
   const ix=attr&64?7-xx:xx, iy=attr&128?7-yy:yy;
   const value=pixels[iy*8+ix];if(value===0||x+xx<leftClip||x+xx>=256||y+yy>=240)continue;
   const sx=x+xx,sy=y+yy,at=sy*256+sx;if(claimed[at])continue;claimed[at]=1;
   if((attr&32)&&backgroundOpaque&&sx<maskWidth&&sy<maskHeight&&backgroundOpaque[sy*maskWidth+sx])continue;
   const color=paletteBrightness(palette[value],brightness);
   ctx.fillStyle=DISPLAY_NES_RGB[color&63];ctx.fillRect(offsetX+(x+xx)*scale,offsetY+(y+yy)*scale,scale,scale);
  }
 }
}
