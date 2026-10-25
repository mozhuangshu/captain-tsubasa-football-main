/** Output-only selection for the recovered 8x8 sprite mode. No registers, timing,
 * overflow flag, or secondary OAM emulation. A set bit admits one output row.
 * Count by Y alone, before transparency, X clipping or background priority.
 * See docs/DEVELOPMENT.md for hardware sources and scope.
 */
// priority (Must D-14): OAM indices admitted first, e.g. the ball shadow during a
// Tsubasa special transform. Empty by default, so ordinary play is unchanged.
export function spriteScanlineRows(oam, priority=[]) {
 if(oam.length!==256)throw new RangeError('Expected recovered 64-record OAM data');
 const counts=new Uint8Array(240),rows=new Uint8Array(64);
 const order=priority.length?[...priority,...Array.from({length:64},(_,n)=>n).filter(n=>!priority.includes(n))]:null;
 for(let k=0;k<64;k++){const n=order?order[k]:k;
  const top=oam[n*4]+1;
  for(let row=0;row<8&&top+row<240;row++){
   const sy=top+row;
   if(counts[sy]<8){counts[sy]++;rows[n]|=1<<row;}
  }
 }
 return rows;
}
