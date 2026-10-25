/** Pure output equivalence, never skips logic, OAM assembly, audio or native ticks.
 * D15F maps every sprite color to $0F at brightness0. If every committed
 * background color is also $0F, every final pixel is that same color regardless
 * of pending CHR/screen transitions. This does not waive any non-black guard.
 */
export function isUniformBlackPresentation(r,palette){return r[0x5b4]===0&&palette?.length>=16&&Array.from(palette).slice(0,16).every(v=>(v&63)===15);}
