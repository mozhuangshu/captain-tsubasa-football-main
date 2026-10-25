import {WEATHER_SPRITE_DATA as D} from './match-weather-sprites-data.js';
const u=v=>v&255;
function sprite(r,i,y,tile,attribute,x){const a=0x200+i*4;r[a]=y;r[a+1]=tile;r[a+2]=attribute;r[a+3]=x;}
// D891..D992. Original deterministic rain byte reads were transformed statically into seeds.
export function updateRainSprites(r){
 if(r[0x466]===130){for(let i=0;i<12;i++){r[0x10c+i]=i>>>1;r[0x100+i]=D.rainInitialX[i];r[0x118+i]=D.rainInitialLife[i];}r[0x466]=2;}
 else if(r[0x466]!==2)return;
 const wind=r[0x140];r[0xc]=wind>=3&&wind<254?116:115;r[0xd]=wind>=3&&wind<128?65:1;
 for(let i=0;i<12;i++){
  r[0x100+i]+=128;r[0x118+i]--;
  if(r[0x118+i]&128){r[0x10c+i]+=4;r[0x100+i]+=wind;}
  else if(r[0x118+i]<119){r[0x5e4]++;r[0x118+i]=D.rainRespawn[r[0x5e4]];r[0x10c+i]=0;r[0x100+i]+=88;}
 }
 for(let i=0;i<Math.min(12,r[0x5e3]);i++)sprite(r,i,i<r[0x3ac]?r[0x10c+i]:249,r[0x118+i]&128?r[0xc]:118,r[0xd],r[0x100+i]);
}
// D993..DA45. Lightning always owns12 OAM records, independent of05E3.
export function updateLightningSprites(r){
 if(r[0x466]===129){r[0xc]=0;for(let i=0;i<12;i++){r[0x10c+i]=D.lightningY[i];r[0x100+i]=D.lightningX[i]+r[0x13d];sprite(r,i,r[0x10c+i],D.lightningTiles[i],1,r[0x100+i]);r[0xc]++;}r[0x466]=1;return;}
 if(r[0x466]!==1)return;
 for(let i=0;i<12;i++){r[0x3ae]++;if(r[0x3ae]>=11)r[0x3ae]=0;let y=u(r[0x10c+i]+64);if(y>=189)y-=189;r[0x10c+i]=y;r[0x100+i]=r[0x100+(i===0?11:i-1)]+D.lightningDx[i]+D.lightningSway[r[0x3ae]];}
 for(let i=0;i<12;i++)sprite(r,i,r[0x10c+i]<r[0x13e]?r[0x10c+i]:248,D.lightningTiles[i],0,r[0x100+i]);
}
// DA81..DB77. The age increment includes carry from the vertical-boundary CMP.
export function updateWindLeafSprites(r){
 if(r[0x466]===132){r[0xc]=r[0x45];r[0xd]=r[0x46];let x=r[0xc]&7;
  for(const y of [11,9,7,5,3,1,10,8,6,4,2,0]){r[0x100+x]=r[0xc];r[0x118+x]=r[0xc]^r[0xd];r[0x10c+x]=y<<4;r[0xd]^=r[0xc];r[0xc]+=r[0xd];if(--x<0)x=11;}r[0x466]=4;
 }else if(r[0x466]!==4)return;
 r[0xc]=r[0x140];r[0xd]=r[0x141];
 for(let x=11;x>=0;x--){r[0x100+x]+=r[0xc]+128;r[0x10c+x]+=r[0xd];if(r[0x118+x]&64){r[0x100+x]+=r[0x140];r[0x10c+x]+=r[0x141];}
  const boundary=r[0x10c+x]>=178;if(boundary)r[0x10c+x]=r[0x141]&128?(r[0x118+x]&3)|176:r[0x118+x]&7;
  r[0x118+x]+=boundary?2:1;
 }
 for(let i=0;i<Math.min(12,r[0x5e3]);i++)sprite(r,i,i<r[0x3ac]?r[0x10c+i]:249,7,(r[0x118+i]&192)|1,r[0x100+i]);
}
// DB78..DCA4. Sign-bit CMP behavior, not signed-coordinate ordering.
export function updateTornadoSprites(r){
 if(r[0x466]===131){r[0x13d]=r[0x13e]=128;r[0xc]=r[0x45];r[0xd]=r[0x46];let carry=1;
  for(let x=11;x>=0;x--){r[0xd]^=r[0xc];const sum=r[0xd]+r[0xc]+carry;r[0xc]=sum;carry=sum>255?1:0;r[0x124+x]=0;r[0x118+x]=D.tornadoPhases[x];r[0x100+x]=r[0xc];}r[0x466]=3;
 }else if(r[0x466]!==3)return;
 if(!(r[0x5c]&128))for(let x=11;x>=0;x--){
  r[0x118+x]++;if(r[0x118+x]>=110){r[0x118+x]=r[0x124+x]=0;r[0x100+x]=(r[0x45]&30)-15+r[0x13d];}
  const y=r[0x13e]-r[0x118+x];r[0x10c+x]=y>=0&&y<192?y:249;
  r[0xd]=r[0x118+x]>=20?1:0;r[0xc]=r[0x118+x]>=40?1:0;
  if(!(u(r[0x13d]-r[0x100+x])&128)){r[0x124+x]++;if(!(r[0x124+x]&128))r[0x100+x]-=r[0xc];}
  else {r[0x124+x]--;if(r[0x124+x]&128)r[0x100+x]+=r[0xd];}
  r[0x100+x]+=r[0x124+x];
 }
 for(let i=0;i<12;i++)sprite(r,i,i<r[0x3ac]&&r[0x10c+i]<r[0x56]?r[0x10c+i]:249,7,r[0x124+i]&128?65:1,r[0x100+i]);
}
// DCB1..DDDA: effect5/6 edge dust. Initial Y subtraction deliberately chains carry for5.
export function updateEdgeDustSprites(r){
 const kind=r[0x466]&127;if(kind!==5&&kind!==6)return;
 if(r[0x466]&128){let carry=1;for(let i=11;i>=0;i--){if(kind===5)r[0x100+i]=D.dustX[i];else{const difference=(D.dustX[i]^255)-7;r[0x100+i]=difference;carry=difference>=0?1:0;}
   const difference=D.dustY[i]-r[0xee]-(1-carry);r[0x10c+i]=r[0x118+i]=difference;carry=difference>=0?1:0;r[0x124+i]=D.dustVelocity[i];}
  r[0x466]=kind;r[0x13f]=0;
 }
 if(!(r[0x5c]&128)){
  r[0x13f]++;r[0xc]=r[0x13f]&3;
  for(let i=0;i<12;i++){r[0xd]=i&3;if(r[0xd]>=r[0xc])r[0x100+i]=kind===5?Math.min(255,r[0x100+i]+2):Math.max(0,r[0x100+i]-2);
   if(r[0xd]===r[0xc]){r[0x124+i]--;r[0x10c+i]-=r[0x124+i];}
   r[0x118+i]--;if(r[0x118+i]&128){r[0x124+i]=5;r[0x118+i]=112;}
  }
 }
 for(let i=0;i<12;i++){const old=r[0x202+i*4],attr=i<9&&(r[0x118+i]&7)===0?u(old+64):old&193;sprite(r,i,r[0x10c+i],D.dustTiles[i],attr|1,r[0x100+i]);}
 if(r[0x13f]>=56)r[0x466]=0;
}
// Original FCAF..FCBB NMI call order. Call once per presented frame AFTER normal OAM.
export function updateWeatherSprites(r){updateLightningSprites(r);updateRainSprites(r);updateTornadoSprites(r);updateWindLeafSprites(r);updateEdgeDustSprites(r);return r.subarray(0x200,0x230);}
