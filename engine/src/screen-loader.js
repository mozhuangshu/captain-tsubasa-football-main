import {createPixelBatch} from './platform/pixel-batch.js';
/** E828/E8E6 screen-resource conversion. Tiles are host graphic data;
 * no CPU, PPU, registers, instruction dispatch, or runtime ROM is present.
 */
import {SCREEN_DATA,SCREEN_CHR_PAGES} from './screen-data.js';
import {decodeMenuImage} from './sprite-mood-menu.js';
import {BACKGROUND_PALETTE_GROUPS} from './sprite-background-palettes.js';
import {decodeChrTile} from './input-sprites.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
export {SCREEN_DATA};
export function createScreenLayout(){return {panels:[new Uint8Array(1024),new Uint8Array(1024)],chrPages:[0,1,2,3],palette:new Uint8Array(16),mirroring:0,descriptor:null};}
/** Apply image bytes to two original visual panels. Decompression always
 * uses the original E941 vertical layout before applying final display mode.
 */
export function loadOriginalScreen(id,r,layout=createScreenLayout()){
  const data=SCREEN_DATA[id];if(!data)throw new RangeError('Unrecovered screen descriptor');
  const {pixels,consumed}=decodeMenuImage(data.compressed);
  if(consumed!==data.compressed.length)throw new Error('Unconsumed original image data');
  const start=data.destination-0x2000;
  if(start<0||start+pixels.length>2048)throw new RangeError('Unsupported original screen bounds');
  for(let i=0;i<pixels.length;i++){const at=start+i;layout.panels[at>>10][at&1023]=pixels[i];}
  r[0x4c]|=0x80;r[0x4d]|=0x18; // E828 final EE65/ECCB display-enable state
  r[0x5bc]=data.chrPages[0];r[0x5bd]=data.chrPages[2];r[0x5ac]=data.paletteIds[0];r[0x5ad]=data.paletteIds[1];
  layout.chrPages=[...data.chrPages];layout.mirroring=data.mirroring;layout.descriptor=id;layout.kind='menu';
  layout.palette=Uint8Array.from([...BACKGROUND_PALETTE_GROUPS[data.paletteIds[0]],...BACKGROUND_PALETTE_GROUPS[data.paletteIds[1]]]);
  for(let n=4;n<16;n+=4)layout.palette[n]=layout.palette[0];
  return layout;
}
/** Host tile patch API. Address is a documented original tile coordinate;
 * mirroring selects a visual panel, not a simulated hardware bus.
 */
export function applyMenuTileRun(layout,address,tiles,{vertical=false}={}){
  for(let i=0;i<tiles.length;i++){
    const logical=(address-0x2000+i*(vertical?32:1))&0xfff;
    const quadrant=logical>>10,panel=layout.mirroring===1?(quadrant>>1):(quadrant&1);
    layout.panels[panel][logical&1023]=tiles[i];
  }
  return layout;
}
const tileCache=new Map();
export function originalScreenTile(tile,layout){
  const page=layout.chrPages[tile>>6],key=page*64+(tile&63);
  if(!tileCache.has(key)){
    const hex=SCREEN_CHR_PAGES[page];if(!hex)throw new RangeError('Unextracted screen CHR page');
    const at=(tile&63)*32;tileCache.set(key,decodeChrTile(Array.from({length:16},(_,i)=>parseInt(hex.slice(at+i*2,at+i*2+2),16))));
  }
  return tileCache.get(key);
}
/** Direct Canvas rendering from original tiles + attribute quadrants.
 * Palette may be the recovered fade buffer's first16 bytes.
 */
export function drawOriginalScreen(ctx,layout,{panel=0,palette=layout.palette,scale=1,offsetX=0,offsetY=0}={}){
  const image=layout.panels[panel];if(!image)throw new RangeError('visual panel');
  const batch=createPixelBatch(ctx,256,240,{scale,offsetX,offsetY});
  for(let row=0;row<30;row++)for(let col=0;col<32;col++){
    const pixels=originalScreenTile(image[row*32+col],layout);
    const attr=image[960+(row>>2)*8+(col>>2)],shift=((row&2)<<1)|(col&2),pal=((attr>>shift)&3)*4;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      batch.pixel(col*8+x,row*8+y,DISPLAY_NES_RGB[palette[pal+pixels[y*8+x]]&63]);
    }
  }
  batch.flush();
}
