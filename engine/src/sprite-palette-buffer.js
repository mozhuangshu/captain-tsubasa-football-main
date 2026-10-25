// Direct semantic conversion of fixed bank14:$D0D5-$D186.
import {BACKGROUND_PALETTE_GROUPS} from './sprite-background-palettes.js';
import {SPRITE_PALETTES,paletteBrightness} from './input-sprites.js';
export function updatePaletteForFade(r) {
 r[0x6da]=0;r[0x6db]=16;r[0x1c]=0;
 for(let group=0;group<2;group++){
  const colors=BACKGROUND_PALETTE_GROUPS[r[0x5ac+group]];
  if(!colors)throw new RangeError('Background palette ID outside recovered table');
  for(let i=0;i<8;i++)r[0x6dc+group*8+i]=paletteBrightness(colors[i],r[0x5b4],group*8+i,0);
 }
 if(!(r[0x5b2]&1)){
  r[0x6db]+=16;
  for(let slot=0;slot<4;slot++){
   const colors=SPRITE_PALETTES[r[0x5ae+slot]];
   if(!colors)throw new RangeError('Sprite palette ID outside recovered table');
   for(let i=0;i<4;i++)r[0x6dc+16+slot*4+i]=paletteBrightness(colors[i],r[0x5b4],16+slot*4+i,0);
  }
 }
 // The original rewrites universal-color positions even in the skipped-sprite branch.
 for(let i=4;i<32;i+=4)r[0x6dc+i]=r[0x6dc];
 return r.slice(0x6dc,0x6dc+r[0x6db]);
}
