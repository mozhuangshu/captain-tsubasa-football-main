import {CELEBRATION_DATA as data} from './celebration-data.js';
// Only the goal and final-result boards. Menus, halftime, title/ending and pitch
// actions retain their existing art and animation.
export const isSharedCelebration=(actor,r)=>(actor.mainState??r[0x58])===0&&[5,10].includes(actor.subState??(r[0x59]&127))&&[4,7].includes(actor.kind);
const cache=new Map(),LIMIT=24,grid=()=>Array.from({length:104},()=>Array(96).fill('0')),encode=g=>g.map(r=>r.join(''));
function compose(character,index){const frame=data.frames[index],head=character.heads[data.expressions[index]],pixels=grid(),materials=grid(),shade=grid(),owners=grid();let shirtBottom=0;
 frame.pixels.forEach((row,y)=>{if(/[23]/.test(row))shirtBottom=y;});
 frame.pixels.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='0')return;const xx=frame.x+x,yy=frame.y+y,n=parseInt(v,16);let value=1,material=0,shadow=1;
  if(n>=2&&n<=9){material=n<=3?1:n<=5?2:n<=7?3:y>shirtBottom+5?3:4;shadow=n%2?2:1;}
  else if(n>=10&&n<=12)value=n-8;
  else if(n===13)owners[yy][xx]='1';
  pixels[yy][xx]=value.toString(16);materials[yy][xx]=material.toString(16);shade[yy][xx]=shadow.toString(16);
 }));
 const hx=frame.neck.x-head.anchor.x,hy=frame.neck.y-head.anchor.y;
 head.pixels.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='0')return;pixels[hy+y][hx+x]=v;materials[hy+y][hx+x]=shade[hy+y][hx+x]=owners[hy+y][hx+x]='0';}));
 return {width:96,height:104,originX:-24,originY:-44,pixels:encode(pixels),materials:encode(materials),shade:encode(shade),paletteOwners:encode(owners),personPalettes:[character.palette,[null,'#607582']],headRegion:{x:(hx-48)/2,y:(hy-88)/2,width:head.pixels[0].length/2,height:head.pixels.length/2},status:'shared-celebration-f',bodyId:data.bodyId,celebrationFrame:index,sourceMotionChanged:true};
}
export function resolveSharedCelebration(actor,r,identity){const id=data.aliases[identity.artCharacterId]??identity.artCharacterId,character=data.heads[id];if(!character)return null;
 // The result timer advances with the simulation: pause/save/resume need no
 // extra animation timer, and a full cycle is six 200 ms poses at 20 Hz.
 const index=Math.floor(r[0x5e2]/4)%6,key=id+':'+index;let art=cache.get(key);if(!art){art=compose(character,index);if(cache.size>=LIMIT)cache.delete(cache.keys().next().value);cache.set(key,art);}
 // Composite source frames can contain two half-bodies. Each real actor now
 // owns one complete body, on its own side of the celebration board.
 const right=actor.entity>=2;return {...identity,status:art.status,skin:{id:'celebration:'+id,resolution:2,palette:character.palette,frames:{}},art,presentation:{x:right?160:96,y:216,groundY:216,frame:index|(right?128:0)},renderedFrame:index};
}
export function getCelebrationCacheStats(){return {size:cache.size,limit:LIMIT,bodyFrames:data.frames.length,uniqueHeadPairs:Object.keys(data.heads).length};}
