/** Authored multi-person, rotating and partial non-match poses.
 * Source animation, positions and live CHR pages are read-only. Each source
 * head has its own adaptation and palette; a detached slice never becomes an
 * extra whole head. The embedded teammate has no independent source identity
 * field, so its roster binding is explicitly an adaptation, not a ROM fact.
 */
import {SPRITE_KINDS} from '../src/sprite-kinds.js';
import {assembleMetaSprite,createHiddenOam} from '../src/input-sprites.js';
import {appearanceTile} from '../src/sprite-appearance.js';
import {getPlayerIdentity,getMatchKits,TSUBASA_ROSTERS,canonicalTeamId} from '../src/tsubasa-teams.js';
import {fallbackArtId,isUnverifiedArtwork} from '../src/tsubasa-identity.js';
import {CANONICAL_HEADS as NONMATCH_HEADS} from './canonical-heads.js';

export const NONMATCH_COMPOSITE_FRAMES=Object.freeze({4:Object.freeze([10,11,12,13]),5:Object.freeze([13]),7:Object.freeze([6,11,51,55,56,57,58,59,60,61,62])});
const H=(x,y,width=16,height=14,extra={})=>({x,y,width,height,view:'front',person:1,...extra});
// Independent heads and foreground limbs were traced against the source
// contact sheets. Coordinates stay relative to the original logical anchor.
export const NONMATCH_COMPOSITE_PLANS=Object.freeze({
 '4:10':{pose:'tucked-roll-left',heads:[H(-15,-22,14,16,{turn:3})],foreground:[[-3,-15,11,11]],roll:0},
 '4:11':{pose:'tucked-roll-up',heads:[H(-9,-22,16,14)],foreground:[[-12,-11,13,11]],roll:1},
 '4:12':{pose:'tucked-roll-right',heads:[H(-7,-16,14,16,{turn:1})],foreground:[[-16,-19,11,11]],roll:2},
 '4:13':{pose:'tucked-roll-down',heads:[H(-15,-14,16,14,{turn:2})],foreground:[[-9,-23,13,11]],roll:3},
 '5:13':{pose:'portrait-lower-right-slice',heads:[H(-16,-15)],clip:[-8,-7,8,8],partial:true,foreground:[]},
 '7:6':{pose:'paired-opposed-celebration-a',heads:[H(-23,-33,16,14,{person:2,mirror:true}),H(-5,-32)],foreground:[[-23,-22,16,11],[-5,-21,16,11]],split:-6.5},
 '7:11':{pose:'paired-opposed-celebration-b',heads:[H(-21,-32),H(-1,-33,16,14,{person:2,mirror:true})],foreground:[[-21,-21,16,11],[-1,-22,16,11]],split:-4,mainOnLeft:true},
 '7:51':{pose:'detached-lower-body',heads:[],foreground:[],lowerBody:true},
 '7:55':{pose:'two-person-pyramid-base-a',heads:[H(-17,-33,12,14,{person:2,mirror:true}),H(-3,-32)],foreground:[[-16,-22,8,8],[-9,-21,8,9],[7,-23,8,9]],split:-5},
 '7:56':{pose:'two-person-pyramid-base-b',heads:[H(-17,-34,12,14,{person:2,mirror:true}),H(-3,-33)],foreground:[[-16,-23,8,8],[-9,-22,8,9],[7,-24,8,9]],split:-5,bodyShift:-1},
 '7:57':{pose:'pyramid-upper-person-a',heads:[H(-7,-47,16,14,{erase:[-8,-47,17,15]})],foreground:[[-16,-39,10,8],[7,-47,9,15]],upperBody:true},
 '7:58':{pose:'pyramid-upper-person-b',heads:[H(-7,-48,16,14,{erase:[-8,-48,17,15]})],foreground:[[-16,-48,10,16],[7,-48,9,16]],upperBody:true},
 '7:59':{pose:'two-person-pyramid-base-a',heads:[H(-17,-33,12,14,{person:2,mirror:true}),H(-3,-32)],foreground:[[-16,-22,8,8],[-9,-21,8,9],[7,-23,8,9]],split:-5},
 '7:60':{pose:'two-person-pyramid-base-b',heads:[H(-17,-34,12,14,{person:2,mirror:true}),H(-3,-33)],foreground:[[-16,-23,8,8],[-9,-22,8,9],[7,-24,8,9]],split:-5,bodyShift:-1},
 '7:61':{pose:'pyramid-upper-person-a',heads:[H(-7,-47,16,14,{erase:[-8,-47,17,15]})],foreground:[[-16,-39,10,8],[7,-47,9,15]],upperBody:true},
 '7:62':{pose:'pyramid-upper-person-b',heads:[H(-7,-48,16,14,{erase:[-8,-48,17,15]})],foreground:[[-16,-48,10,16],[7,-48,9,16]],upperBody:true}
});
const inside=(x,y,a)=>x>=a[0]&&x<a[0]+a[2]&&y>=a[1]&&y<a[1]+a[3];
const get=(g,x,y)=>g[y]?.[x]??0;
const grid=(w,h,value=0)=>Array.from({length:h},()=>Array(w).fill(value));
const encode=g=>g.map(row=>row.map(v=>v.toString(16)).join(''));
function scale2(g){const out=grid(g[0].length*2,g.length*2);for(let y=0;y<g.length;y++)for(let x=0;x<g[0].length;x++){const E=g[y][x],B=get(g,x,y-1),D=get(g,x-1,y),F=get(g,x+1,y),H=get(g,x,y+1);out[y*2][x*2]=D===B&&B!==F&&D!==H?D:E;out[y*2][x*2+1]=B===F&&B!==D&&F!==H?F:E;out[y*2+1][x*2]=D===H&&D!==B&&H!==F?D:E;out[y*2+1][x*2+1]=H===F&&D!==H&&B!==F?F:E;}return out;}
function sourceArt(actor,r){const frame=actor.frame&127,f=SPRITE_KINDS[actor.kind]?.[frame];if(!f)return null;const oam=createHiddenOam(),{count}=assembleMetaSprite({x:128,y:144,groundY:144,frame,headVariant:actor.headVariant??0,entity:12,clipY:240,frames:SPRITE_KINDS[actor.kind]},oam),chrPages=Array.from(r.slice(0x5b8,0x5bc)),parts=[];for(let i=0;i<count;i++){const at=252-i*4,attr=oam[at+2];parts.push({x:oam[at+3]-128,y:oam[at]+1-144,flipX:!!(attr&64),flipY:!!(attr&128),tile:f.tiles[i],pixels:appearanceTile(oam[at+1],{chrPages})});}if(!parts.length)return null;const x=Math.min(...parts.map(p=>p.x)),y=Math.min(...parts.map(p=>p.y)),w=Math.max(...parts.map(p=>p.x+8))-x,h=Math.max(...parts.map(p=>p.y+8))-y,g=grid(w,h),owners=grid(w,h,-1);for(const p of parts.slice().reverse())for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){const v=p.pixels[(p.flipY?7-yy:yy)*8+(p.flipX?7-xx:xx)];if(v){g[p.y-y+yy][p.x-x+xx]=v;owners[p.y-y+yy][p.x-x+xx]=p.tile;}}return{x,y,w,h,g,owners,chrPages};}
function headPixels(character,p){let g=(character[p.view]??character.front).map(row=>Array.from(row,c=>parseInt(c,16)));if(p.mirror)g=g.map(row=>row.slice().reverse());for(let n=0;n<(p.turn??0);n++){const old=g;g=grid(old.length,old[0].length);for(let y=0;y<old.length;y++)for(let x=0;x<old[0].length;x++)g[x][old.length-1-y]=old[y][x];}const W=p.width*2,H=p.height*2;return Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>g[Math.min(g.length-1,Math.floor((y+.5)*g.length/H))][Math.min(g[0].length-1,Math.floor((x+.5)*g[0].length/W))]));}
function checkedHead(identity){const unverified=identity.identityStatus==='unverified_reference_mapping'||isUnverifiedArtwork(NONMATCH_HEADS[identity.characterId]),generic=unverified||!NONMATCH_HEADS[identity.characterId]||identity.characterId?.startsWith('generic');const id=generic?fallbackArtId(identity.characterId):identity.characterId;return{character:NONMATCH_HEADS[id],identity:{...identity,artCharacterId:id,genericAppearance:generic,identityBinding:generic?'explicit-neutral-adaptation':'same-team-active-roster-adaptation'}};}
function secondaryPerson(actor,r,identity){
 const side=identity.side??0,teamId=identity.teamId??(r[0x52c+side]&15),nums=[r[0x534+side],r[0x536+side],r[0x538+side],r[0x53a+side]];
 // Prefer the second selected field player, never replace a selected source
 // participant with an unrelated team's recognisable face.
 for(const n of nums){try{const p=getPlayerIdentity(teamId,n,'field');if(p.characterId!==identity.characterId&&p.canonicalRole!=='GK')return checkedHead({...p,side,teamId,role:'field',playerNumber:n});}catch{}}
 // Synthetic/ending states can omit the live line-up. The first distinct field
 // member is an explicit same-team roster adaptation and is labeled as such.
 const roster=TSUBASA_ROSTERS.rosters.find(p=>p.teamId===canonicalTeamId(teamId));
 for(const p of roster?.players??[])if(p.characterId!==identity.characterId&&p.canonicalRole!=='GK'){const q=checkedHead({...p,side,teamId,role:'field'});if(q.character){q.identity.identityBinding='same-team-roster-fallback-adaptation';return q;}}
 return null;
}
function sourceMaterial(p,x,y,v){if(v!==2)return 0;if(p.partial)return 0;if(p.upperBody)return 1;if(p.lowerBody)return y<-12?2:3;
 if(p.roll!==undefined){if(p.roll===0)return y<-15?3:y>-7?1:2;if(p.roll===1)return x<-7?1:y>-7?3:2;if(p.roll===2)return y>-7?3:y<-15?1:2;return x>0?1:y<-15?3:2;}
 const yy=y-(p.bodyShift??0);return yy<-12?1:yy<-6?2:3;
}
function bodyOwner(p,x){if(p.split===undefined)return 1;return p.mainOnLeft?(x<p.split?1:2):(x<p.split?2:1);}
const cache=new Map();
function compose(actor,r,identity,character,p,second){const source=sourceArt(actor,r);if(!source)return null;
 const heads=p.heads.map(h=>({...h,character:h.person===2?second?.character:character}));if(heads.some(h=>!h.character))return null;
 const clip=p.clip,extents=clip?[{x:clip[0],y:clip[1],width:clip[2],height:clip[3]}]:[{x:source.x,y:source.y,width:source.w,height:source.h},...heads];
 const X=Math.min(...extents.map(h=>h.x)),Y=Math.min(...extents.map(h=>h.y)),W=(Math.max(...extents.map(h=>h.x+h.width))-X)*2,H=(Math.max(...extents.map(h=>h.y+h.height))-Y)*2;
 const pixels=grid(W,H),materials=grid(W,H),shade=grid(W,H),paletteOwners=grid(W,H),kitOwners=grid(W,H),authoredMask=grid(W,H),protectedMask=grid(W,H),body=scale2(source.g);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const gx=X+(x+.5)/2,gy=Y+(y+.5)/2,sx=Math.floor((gx-source.x)*2),sy=Math.floor((gy-source.y)*2),v=get(body,sx,sy);if(!v)continue;pixels[y][x]=v===3?(get(body,sx+1,sy)===1?4:get(body,sx,sy-1)===1?5:3):v===2?(get(body,sx+1,sy)===1?6:get(body,sx,sy-1)===1?7:2):v;materials[y][x]=sourceMaterial(p,gx,gy,v);shade[y][x]=materials[y][x]?(pixels[y][x]===6?2:pixels[y][x]===7?3:1):0;paletteOwners[y][x]=kitOwners[y][x]=bodyOwner(p,gx);}
 const base=pixels.map(r=>r.slice()),baseMaterials=materials.map(r=>r.slice()),baseShade=shade.map(r=>r.slice()),baseOwners=paletteOwners.map(r=>r.slice());let erased=0;
 for(const h of heads){const a=h.erase??[h.x,h.y,h.width,h.height];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inside(X+(x+.5)/2,Y+(y+.5)/2,a)){if(pixels[y][x])erased++;pixels[y][x]=materials[y][x]=shade[y][x]=paletteOwners[y][x]=kitOwners[y][x]=0;}}
 for(const h of heads){const src=headPixels(h.character,h);for(let y=0;y<src.length;y++)for(let x=0;x<src[0].length;x++){const xx=(h.x-X)*2+x,yy=(h.y-Y)*2+y;if(xx<0||xx>=W||yy<0||yy>=H)continue;const v=src[y][x];if(v){pixels[yy][xx]=v;materials[yy][xx]=shade[yy][xx]=0;paletteOwners[yy][xx]=h.person+2;kitOwners[yy][xx]=h.person;authoredMask[yy][xx]=1;}}}
 let protectedPixels=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(base[y][x]&&!authoredMask[y][x]&&p.foreground.some(a=>inside(X+(x+.5)/2,Y+(y+.5)/2,a))){pixels[y][x]=base[y][x];materials[y][x]=baseMaterials[y][x];shade[y][x]=baseShade[y][x];paletteOwners[y][x]=kitOwners[y][x]=baseOwners[y][x];authoredMask[y][x]=0;protectedMask[y][x]=1;protectedPixels++;}
 const kits=getMatchKits(r[0x52c]&15,r[0x52d]&15),personKits=[null,kits[identity.side??0]?.[identity.role??'field'],second?kits[second.identity.side??0]?.[second.identity.role??'field']:null];
 const headRegions=heads.map(h=>({x:h.x,y:h.y,width:h.width,height:h.height,person:h.person,turn:h.turn??0,mirror:!!h.mirror,visiblePixels:authoredMask.reduce((n,row,yy)=>n+row.reduce((m,v,xx)=>m+(v&&kitOwners[yy][xx]===h.person?1:0),0),0)}));
 return {width:W,height:H,originX:X,originY:Y,pixels:encode(pixels),materials:encode(materials),shade:encode(shade),paletteOwners:encode(paletteOwners),personPalettes:[null,character.palette,second?.character?.palette??null,character.headPalette??character.palette,second?.character?.headPalette??second?.character?.palette??null],kitOwners:encode(kitOwners),personKits,authoredHeadMask:encode(authoredMask),foregroundMask:encode(protectedMask),headRegions,headRegion:headRegions.find(h=>h.person===1)??null,sourceHeadCount:heads.length,compositeIdentities:[{...identity,person:1,artCharacterId:character.id},...(second?[{...second.identity,person:2}]:[])],pose:p.pose,status:p.lowerBody?'nonmatch-body-component-local-review':p.partial?'nonmatch-partial-head-local-review':'nonmatch-multi-part-local-review',approved:false,requiresFrameReview:true,sourceMotionChanged:false,sourceKind:actor.kind,sourceFrame:actor.frame&127,sourceChrPages:source.chrPages,sourceBounds:{x:source.x,y:source.y,width:source.w,height:source.h},headErasedPixels:erased,foregroundProtectedPixels:protectedPixels,partialHead:!!p.partial,bodyComponent:!!p.lowerBody,identityBinding:second?'composite-roster-adaptation':'source-actor-identity'};
}
export function resolveNonmatchCompositeArt(actor,r,identity,character){const f=actor.frame&127,p=NONMATCH_COMPOSITE_PLANS[`${actor.kind}:${f}`];if(!p||!identity||!character)return null;if(isUnverifiedArtwork(character)||isUnverifiedArtwork(NONMATCH_HEADS[identity.characterId])||identity.identityStatus==='unverified_reference_mapping'){const safe=checkedHead(identity);character=safe.character;identity={...identity,artCharacterId:safe.identity.artCharacterId,genericAppearance:true};if(!character)return null;}let second=p.heads.some(h=>h.person===2)?secondaryPerson(actor,r,identity):null;if(p.heads.some(h=>h.person===2)&&!second?.character)return null;
 const key=[actor.kind,f,actor.headVariant??0,identity.characterId,character.id,identity.side,identity.role,second?.identity.characterId,second?.character?.id,r[0x52c],r[0x52d],...r.slice(0x5b8,0x5bc)].join(':');let art=cache.get(key);if(!art){art=compose(actor,r,identity,character,p,second);if(!art)return null;if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,art);}
 return{art,skin:{id:character.id,resolution:2,palette:character.palette,frames:{[f]:art}},artCharacterId:character.id,status:'source-composite-adaptation',compositeIdentities:art.compositeIdentities,headRegions:art.headRegions,genericAppearance:!!(identity.genericAppearance||second?.identity.genericAppearance),primaryGenericAppearance:!!identity.genericAppearance};
}
