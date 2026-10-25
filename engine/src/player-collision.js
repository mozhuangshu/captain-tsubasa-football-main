import {noteTsubasaMisugiKnockdown} from './tsubasa-misugi-heart.js';
import {resolveCollisionShape,intersectCollisionShapes} from './ball-collision.js';
// 06:B151/B19A: first matching opposing / same-side object in ascending slot order.
export function findPlayerCollision(r,x,sameSide=false){
 r[0x43]=x;r[0x44]=(x&1)^(sameSide?0:1);const a=resolveCollisionShape(r,x,'player',1);if(!a)return null;
 for(let y=r[0x44];y<(sameSide?10:12);y+=2){r[0x44]=y;if(y===x||(!sameSide&&!(r[0x486+x]&128)&&(r[0x486+y]&128)))continue;const b=resolveCollisionShape(r,y,'player',1);if(b&&intersectCollisionShapes(r,x,y,a,b))return y;}
 r[0x44]=sameSide?10+(x&1):12+((x&1)^1);return null;
}
function sound(r,events,id){r[0x1b]=r[0x7ff]=id;events.push({type:'sound',soundId:id});}
function action(r,y,a){r[0x459+y]=a;r[0x94+y]=r[0x87+y]=r[0x46c+y]=0;}
function recoil(r,y){action(r,y,r[0x486+y]&128?0x3c:0x2d);}
// 06:9D65..9EB4. Exposed target response enables arithmetic branch testing without geometry guesses.
export function resolvePlayerAttackContact(r,x,target){
 const events=[];let y=target;r[0x1c]=x;r[0x1d]=y;let defense=r[0x4e4+y];
 if(y>=10&&!(r[0x67c+y]&128))defense=Math.min(255,defense+[20,15,12,8][r[0x4fd+y]&3]);r[0x20]=defense;
 const movement=r[0x459+x]&127;
 if(movement===0x23){if(!(r[0x486+y]&8))return events;sound(r,events,0x36);action(r,y,0x2d);}
 else{
  const group=[0x22,0x3b,0x42].includes(movement)?0:1;r[0x1e]=group*4;sound(r,events,group?0x37:0x36);
  const attack=Math.min(255,r[0x4e4+x]+(group?18:8));r[0x1f]=attack;r[0x21]=group;r[0x4e4+x]=Math.max(0,r[0x4e4+x]-group);r[0x21]=2;r[0x4e4+y]=Math.max(0,r[0x4e4+y]-2);
  if(attack>=defense){
   const side=y&1;r[0x1e]=side;
   if(x<10&&r[0x327+y]===[3,0][side]&&y!==r[0x4d6]&&!(r[0x486+y]&64)&&!(r[0x5c]&64)){
    const formation=r[0x360+x]!==0?1:r[0x34d+x]&128?3:2;r[0x55b]=formation;r[0x52a+(side^1)]|=1;r[0x5c]|=96;sound(r,events,0x2d);
   }
   action(r,y,0x3c);noteTsubasaMisugiKnockdown(r,x,y);/* M-10 */
  }else{recoil(r,x);if(y>=10)return events;recoil(r,y);}
 }
 if(!((r[0x4a3+x]^r[0x4a3+y])&128))r[0x459+y]++;
 const mood=Math.max(0,(r[0x650+y]&15)-1);r[0x1c]=mood;r[0x650+y]=(r[0x650+y]&240)|mood;
 return events;
}
export function collidePlayers(r,x){const y=findPlayerCollision(r,x);return y===null?[]:resolvePlayerAttackContact(r,x,y);}
// 06:9EBF..9F6F: descending-player same-team contact, piggyback/jump-on state.
export function collideAirPlayers(r,x){
 if((r[0x5c]&64)||x>=10||(r[0x650+x]&128)||!(r[0x42e+x]&128)||(r[0x399+x]&128)||(r[0x486+x]&64))return [];
 const y=findPlayerCollision(r,x,true);if(y===null)return [];
 return resolveAirPlayerContact(r,x,y);
}
export function resolveAirPlayerContact(r,x,y){
 let next=0x56;
 if(y<10&&((x^y)&1)===0){
  if(!(r[0x650+y]&128)||(r[0x486+y]&129)||(r[0x459+y]&127)===0x14)return [];
  r[0x4ca+x]=y;const dz=(r[0x386+x]-r[0x386+y])&255;if(dz&128)return [];
  if(dz<24)for(const a of [0x3f6,0x3e8,0x412,0x404])r[a+x]=r[a+y];
  if(r[0x486+x]&64){r[0x4d6]=y;r[0x465]=9;r[0x459+y]=11;}
  else if(dz>=24){r[0x486+y]|=1;next=0x14;}
 }
 r[0x459+x]=next;r[0x94+x]=r[0x87+x]=0;return [];
}
