import {initializeBootLogo,stepBootLogo} from './boot-flow.js';
/** Source02 BB5D ending scenes, explicit gameplay/UI control flow. */
import {ENDING_DATA as D} from './ending-data.js';
import {beginPaletteFade,advancePaletteFade,waitForPaletteFade} from './state-dispatch.js';
import {submitObjectForDisplay} from './object-display-list.js';
const need=(s,n,...args)=>{if(!s[n])throw new Error(`MissingTranslation: ${n}`);return s[n](...args);};
export function setEndingTimer(r,ticks){r[0x589]=ticks;r[0x58a]=1;}
export function endingTimeout_AE7C(r){r[0x1c]=0;if(r[8]&48)r[0x1c]=128;else{r[0x589]--;if(!r[0x589]){r[0x58a]--;if(!r[0x58a])r[0x1c]=64;}}return !!(r[0x1c]&64);}
export function initializeEndingActors_BA66(r){
 const ending=r[0x61f];if(ending>2)throw new RangeError('Original ending selection');r.set([7,4,4,4],0x5ae);r[0x61]=r[0x62]=r[0x6d]=4;r.set([44,45,46,47],0x5b8);r[0x568]=0;r.fill(255,0x569,0x56c);
 r[0x55c]=D.faces[r[0x532]];r[0x55d]=D.faces[r[0x53c]];r[0x4a3]=r[0x4a4]=128;r[0x4af]=0;
 for(let i=2;i>=0;i--){r[0x1c]=i;const x=[0,1,12][i],entry=ending*3+i;for(const base of [0x3f6,0x3e8,0x412,0x404,0x42e,0x420,0x360,0x386,0x399,0x44a,0x43c,0x486])r[base+x]=0;r[0x479+x]=255;r[0x459+x]=D.actions[entry];r[0x314+x]=D.positions[entry*2];r[0x34d+x]=D.positions[entry*2+1];r[0x327+x]=1;}r[0x1c]=255;
}
export function projectEndingObjects_BED4(r,s,hideMiddle=false){if(hideMiddle)r.fill(255,0x39b,0x3a5);r[0x50e]=255;for(let x=0;x<13;x++)if(!r[0x399+x])submitObjectForDisplay(r,x);need(s,'updateSpriteVisibility',r);}
async function endingFadeOut(r,s){beginPaletteFade(r,'out');await waitForPaletteFade(r,rr=>s.updatePalette(rr),s.nextFrame);for(let i=0;i<8;i++)await s.nextFrame();}
function copySavedActors(r,restore=false){for(const [src,dst] of [[0,8],[1,9],[12,10]])for(const base of [0x74,0x314,0x34d,0x386])r[base+(restore?src:dst)]=r[base+(restore?dst:src)];r[0x486+(restore?0:8)]=r[0x486+(restore?8:0)];}
export async function stepEndingState(r,s){
 if(r[0x58]!==3)throw new RangeError('Not ending main state');
 const fade=()=>advancePaletteFade(r,rr=>s.updatePalette(rr));
 switch(r[0x59]&127){
 case 0:r[0x4d]|=2;r[0x56]=240;r[0x4f]=128;r[0x5e6]=3;for(const a of [0xec,0xee,0xef,0xf0,0xf2,0xf3])r[a]=0;r[0xed]=r[0xf1]=1;initializeEndingActors_BA66(r);need(s,'commitGraphicsBanks',r);await need(s,'updateEndingActors_Bank02_BB3C',r);need(s,'updateSpriteVisibility',r);beginPaletteFade(r,'in');s.requestSound(11);r[0x59]++;return;
 case 1:fade();await need(s,'updateEndingActors_Bank02_BB3C',r);need(s,'updateSpriteVisibility',r);if(r[0x7e5]&2)return;s.requestSound(68);setEndingTimer(r,16);r[0x59]++;return;
 case 2:projectEndingObjects_BED4(r,s,true);if(!endingTimeout_AE7C(r))return;await endingFadeOut(r,s);s.loadScreen(28,r);{
  const ending=r[0x61f];r.set(D.titles.slice(ending*16,ending*16+16),0x696);r[0x695]=16;r[0x694]=169;r[0x693]=32;
  if(ending){r[0x6b9]=218;r[0x6b8]=1;r[0x6b7]=ending*3+136;r[0x6b6]=32;}
  for(const x of [0,1,12]){r[0x34d+x]-=56;r[0x327+x]=0;}r[0xf1]=r[0xed]=0;r.set([29,43,43,43],0x5ae);copySavedActors(r);r[0x58c]=255;setEndingTimer(r,44);r[0x58a]++;projectEndingObjects_BED4(r,s);beginPaletteFade(r,'in');s.requestSound(14);r[0x58b]=128;r[0x59]++;return;}
 case 3:projectEndingObjects_BED4(r,s);fade();if(!endingTimeout_AE7C(r))return;await endingFadeOut(r,s);r[0x58c]++;if(r[0x58c]>=7){r[0x59]++;return;}{
  const d=D.scenes[r[0x58c]];s.loadScreen(29+r[0x58c],r);r[0x2c]=d.address&255;r[0x2d]=d.address>>>8;setEndingTimer(r,d.timer);if(d.timer<64)r[0x58a]++;r.set([8,d.chr1,32,d.chr3],0x5b8);need(s,'commitGraphicsBanks',r);r[0x5b0]=d.palette2;r[0x5b1]=d.palette3;
  for(const o of d.objects){const x=o.slot;r[0x399+x]=255;r[0x486+x]=r[0x61+x]=r[0x327+x]=r[0x360+x]=0;if(o.hidden)continue;r[0x74+x]=o.frame;r[0x399+x]=0;r[0x314+x]=o.x;r[0x34d+x]=o.y;r[0x386+x]=o.z;if(o.z)r[0x486+x]=128;r[0x55c+x]=o.head;}r[0x6d]++;projectEndingObjects_BED4(r,s);beginPaletteFade(r,'in');return;}
 case 4:initializeEndingActors_BA66(r);need(s,'commitGraphicsBanks',r);copySavedActors(r,true);for(const a of [0x327,0x328,0x333,0x3a5])r[a]=0;r.set([29,43,43,43],0x5ae);projectEndingObjects_BED4(r,s,true);s.loadScreen(36,r);setEndingTimer(r,0);r[0x58a]+=2;beginPaletteFade(r,'in');r[0x59]++;return;
 case 5:projectEndingObjects_BED4(r,s,true);fade();if(endingTimeout_AE7C(r)){setEndingTimer(r,1);r[0x58c]=0;r[0x59]++;}return;
 case 6:projectEndingObjects_BED4(r,s,true);if(!endingTimeout_AE7C(r))return;r[0x58c]++;if(r[0x58c]<4){setEndingTimer(r,64);s.requestSound(76);return;}r[0x606]=r[0x61f]+54;r[0x604]=128;r[0x5e6]=2;r[0x59]++;return;
 case 7:await need(s,'stepDialogue',r);projectEndingObjects_BED4(r,s,true);if(r[0x605]&128)return;await endingFadeOut(r,s);r[0x5e6]=0;r[0x392]=0;r[0x59]++;return;
 case 8:return initializeBootLogo(r,s);
 case 9:return stepBootLogo(r,s);
 case 10:submitObjectForDisplay(r,12);return;
 default:throw new RangeError('Original ending substate');
 }
}
