/** Fixed E170/F166 native frame commits. Semantic tile runs, no hardware interpreter. */
import {FIELD_EVENTS as D} from './field-events-data.js';
import {applyMenuTileRun} from './screen-loader.js';
const ptr=(r,a)=>{r[12]=a&255;r[13]=a>>>8;};
export function commitStatusBanner_E170(r,layout){
 if(!(r[0x5f8]&128))return [];
 r[0x4c]&=251;const patches=[];
 if(!r[0x5f9]){patches.push({address:0x2bf0,bytes:Array(8).fill(170),vertical:false});r[0x5f9]++;}
 else{const index=r[0x5f8]&127,data=D.banners[index];if(!data)throw new RangeError('Original status banner index');ptr(r,data.address);
  // The middle original loop ends at29hex:20 tiles, not21. Last row21.
  patches.push({address:0x2b06,bytes:data.tiles.slice(0,21)},{address:0x2b26,bytes:data.tiles.slice(21,41)},{address:0x2b46,bytes:data.tiles.slice(41,62)});
  r[0x5f8]&=127;if(index===1||index===2)r[0x5fa]=r[0x5f7]=0;
 }
 for(const p of patches)applyMenuTileRun(layout,p.address,p.bytes);return patches;
}
export function commitGoalDecoration_F166(r,layout){
 const flag=r[0x5f5];if(flag===255)return [];
 r[0x4c]|=4;const patches=[];
 if((flag&127)<2){const left=!!(flag&128),index=(left?0:2)+(flag&1),data=D.goals[index];ptr(r,data.address);const addresses=left?[0x228b,0x220c,0x21cd]:[0x2294,0x2213,0x21d2];let i=0;for(let k=0;k<3;k++){const n=k===1?11:6;patches.push({address:addresses[k],bytes:data.tiles.slice(i,i+n),vertical:true});i+=n;}}
 else{const left=!!(flag&128),data=D.goalEnds[left?1:0],addresses=left?[0x21ce,0x21cd]:[0x21d1,0x21d2];patches.push({address:addresses[0],bytes:data.slice(0,4),vertical:true},{address:addresses[1],bytes:data.slice(4,9),vertical:true});}
 for(const p of patches)applyMenuTileRun(layout,p.address,p.bytes,{vertical:true});r[0x5f5]=255;return patches;
}
/** EFAD first-delay-tick selection, preserving scroll > goal > banner priority. */
export function commitFieldFirstTick(r,layout,commitScroll){
 if(r[0x5ab]&128){commitScroll(r,layout);return 'scroll';}
 if(r[0x5f5]!==255){commitGoalDecoration_F166(r,layout);return 'goal';}
 if(r[0x5f8]&128){commitStatusBanner_E170(r,layout);return 'banner';}return 'none';
}
/** F350..F3A4 after general graphics queues have all drained. */
export function commitFieldHud_F350(r,layout){
 if(r[0x59]!==r[0x5a])return;
 if(r[0x59]===2||r[0x59]===6){r[0x4c]&=251;applyMenuTileRun(layout,0x2a2d,[...r.slice(0x5a5,0x5ab)].reverse());}
 const n=r[0x5f0];if(n>4)throw new RangeError('Original footprint queue capacity');for(let x=n-1;x>=0;x--)applyMenuTileRun(layout,r[0x5e8+x]*256+r[0x5ec+x],[255]);if(n)r[0x5f0]=0;
}
/** D61A..D6E6: second native frame tick commits the two teams' command-HUD buffers. */
export function commitCommandHud_D61A(r,layout){
 if(r[0x59]!==r[0x5a]||![2,6].includes(r[0x59]))return [];
 r[0x4c]&=251;const patches=[];
 for(const [flag,base,first,rows] of [[32,0x696,0x2a61,[0x2a81,0x2a07,0x2a27,0x2a47,0x2a67,0x2a87]],[16,0x6b9,0x2a74,[0x2a94,0x2a1a,0x2a3a,0x2a5a,0x2a7a,0x2a9a]]]){
  if(!(r[0x5ab]&flag))continue;patches.push({address:first,bytes:[r[base]]});let offset=1;for(const address of rows){patches.push({address,bytes:[...r.slice(base+offset,base+offset+5)]});offset+=5;}
 }
 for(const p of patches)applyMenuTileRun(layout,p.address,p.bytes);r[0x5ab]&=207;return patches;
}
