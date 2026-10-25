import {createMotionPresentation} from './platform/motion-presentation.js';
import {isUniformBlackPresentation} from './platform/black-presentation.js';
import {lastPixelBatchFlush} from './platform/pixel-batch.js';
import {dialogueSnapshot} from './dialogue.js';
import {isHudNameHolding} from './localization-zh.js';
/** Captain Tsubasa presentation adapter. All state transitions, actor frame
 * selection, coordinates, physics and controller logic remain in the recovered
 * JavaScript game. This module never writes gameplay RAM or runs a ROM. */
import {computeTsubasaSkylabPlacements,forEachSkylabPosePixel,noteSkylabPlacementsDrawn} from './tsubasa-skylab-pose-render.js';
import {SKYLAB_LAUNCH_PALETTE} from './tsubasa-skylab-launch-art.js';
import {getTsubasaTrianglePoses,getTsubasaTrianglePostShake} from './tsubasa-triangle-shot.js';
import {TRIANGLE_ART} from './tsubasa-triangle-art.js';
import {getTsubasaMorisakiSavePose} from './tsubasa-morisaki-save.js';
import {MORISAKI_SAVE_ART} from './tsubasa-morisaki-save-art.js';
import {getTsubasaMisugiHeartPose,getTsubasaMisugiOverlay} from './tsubasa-misugi-heart.js';
import {MISUGI_HEART_ART} from './tsubasa-misugi-heart-art.js';
import {getTsubasaFireShotBodyPose,forEachFireShotBodyPixel} from './tsubasa-fire-shot.js';
import {getTsubasaNamedBodyPose} from './tsubasa-named-body.js';
import {createMenuGraphics} from './menu-graphics.js';
import {assembleMenuOam,menuAppearanceFromState} from './menu-objects.js';
import {appearanceTile,DISPLAY_NES_RGB} from './sprite-appearance.js';
import {drawScreenArt,fadeStep,fadeNes,SCREEN_ART_SIZE} from './tsubasa-screen-art.js';
import {SPRITE_PALETTES,paletteBrightness} from './input-sprites.js';
/** Must D-16 per-move palettes: one NES sprite palette [transparent, c1, c2, c3],
 * native indices only, <=3 visible colours (+transparent slot), anime source with version+episode. Single
 * switchable entry per move; delete the entry to fall back to the native palette. */
export const TSUBASA_NATIVE_ART_PALETTES=Object.freeze({'tiger-shot':Object.freeze([0x0f,0x0f,0x16,0x28]),'falcon-shot':Object.freeze([0x0f,0x0f,0x08,0x26]),'running-volley-falcon':Object.freeze([0x0f,0x0f,0x08,0x26]),'eagle-shot':Object.freeze([0x0f,0x0f,0x30,0x21])});
export const TSUBASA_NATIVE_ART_PALETTE_SOURCES=Object.freeze({'tiger-shot':'2018 第36集（火焰虎形，D-24）','falcon-shot':'1983 第61集','running-volley-falcon':'1983 第61集','eagle-shot':'2018 第40集'});
import {spriteScanlineRows} from './platform/sprite-scanlines.js';
import {TSUBASA_KEEPER_HD_POSES,TSUBASA_GENERIC_KEEPER_HD_POSES,TSUBASA_RAZOR_KEEPER_F15} from '../data/tsubasa-special-moves.js';
import {KEEPER_F15_HD_V11} from './tsubasa-keeper-f15-hd.js';
import {DRIVE_KEEPER_MISREAD_ART,DRIVE_KEEPER_MISREAD_PALETTE,DRIVE_WAKASHIMAZU_CHOP_ART} from './tsubasa-drive-keeper-art.js';
import {getTsubasaDriveKeeperLookUp as driveKeeperLookUp,getTsubasaDriveKeeperPunch as driveKeeperPunch} from './tsubasa-special-moves.js';
import {computeTsubasaSpriteRotation,noteTsubasaSpriteRotation} from './tsubasa-sprite-rotation.js';
import {isTsubasaSpecialShadowLocked} from './tsubasa-shadow-lock.js';
import {TSUBASA_AUTHORED_MOVE_ART} from './tsubasa-authored-move-art.js';
import './tsubasa-pose-repairs.js';
import {ORIGINAL_NTSC_FRAME_HZ} from './platform/native-frame-clock.js';import {getTsubasaLayeredArt,getTsubasaHeadComposeStats} from './tsubasa-layered-sprites.js';/* must run before any HD frame is read */
import {HD_CHARACTERS as DEFAULT_CHARACTERS} from '../art/hd-runtime.js';
import {ALL_PLAYER_FRAMES} from './sprite-frames.js';
import {drawTsubasaHud,isTsubasaHudHolding} from './tsubasa-hud.js';
import {fallbackArtId,getCharacterIdentity,isUnverifiedArtwork} from './tsubasa-identity.js';
import {getTsubasaRazorKeeperPose as razorKeeperPose,getTsubasaRazorKeeperF15Mode,getTsubasaRazorKickFrame,getTsubasaSpecialState,shouldReplaceTsubasaBallArtwork,tsubasaNativeColourBallShot,shouldReplaceTsubasaShockArtwork,getTsubasaPartnerState} from './tsubasa-special-moves.js';
import {getTsubasaShotImpactPixels} from './tsubasa-shot-impacts.js';
import {TSUBASA_BALL_EFFECTS,getSpecialBallReplacement,getTsubasaPlainBallState,drawTsubasaSpecialBall,getTsubasaDefensiveVisuals,drawTsubasaDefensiveEffect,getTsubasaPartnerVisuals,drawTsubasaPartnerEffect} from './tsubasa-special-effects.js';
import {getTsubasaDefensiveState} from './tsubasa-defensive-moves.js';

let characters=DEFAULT_CHARACTERS,byId=new Map(characters.map(c=>[c.id,c])),identityResolver=null,kitResolver=null,nonmatchResolver=null,nonmatchBackground=null,nonmatchClassifier=null;
const verifiedCharacter=id=>{const c=byId.get(id);return c&&!isUnverifiedArtwork(c)?c:undefined;};
const APPROVED_PREVIEW_FRAMES=[0,1,2,5,6,7,8,10,11,14,15,16,18,19,30,31,33,41,62,63];
export function configureTsubasaArtwork(list){
 if(!Array.isArray(list)||!list.length)throw TypeError('Character array required');
 for(const c of list){if(!c.id||!c.skin?.frames||!c.skin?.palette)throw TypeError('Each character needs an id, palette and frames');}
 characters=list;byId=new Map(list.map(c=>[c.id,c]));return getTsubasaCoverage();
}
export function configureTsubasaTeams({getPlayerIdentity,getMatchKits}={}){identityResolver=getPlayerIdentity??identityResolver;kitResolver=getMatchKits??kitResolver;}
export function configureTsubasaNonmatch({resolveNonmatchArt,drawNonmatchBackground,classifyNonmatchFrame}={}){nonmatchResolver=resolveNonmatchArt??null;nonmatchBackground=drawNonmatchBackground??null;nonmatchClassifier=classifyNonmatchFrame??null;}
/** Item 6 (docs/NEKKETSU_LEFTOVERS.md): screen 0 is the TECHNOS boot logo (and the closing logo after the ending, which
 * shares the routine). The Captain Tsubasa logo covers the whole frame after the sprites, so the native logo figure never
 * shows through; its credit line is the 12px pixel font baked to a bitmap (art/screen-art.js bootCredit: the boot screen comes before the web font
 * has loaded). Fade: palette entry 13 is 0x30 at full brightness. */
function drawTsubasaBootLogo(ctx,app){if(app.layout?.descriptor!==0)return;const p=app.palette??app.layout.palette;if(!p)return;
 const step=fadeStep(p[13]&63,0x30);ctx.save();ctx.scale(2,2);drawScreenArt(ctx,'bootLogo',{step});
 if(step<4){ctx.fillStyle=DISPLAY_NES_RGB[fadeNes(0x0f,step)];ctx.fillRect(0,146,256,20);const w=SCREEN_ART_SIZE.bootCredit.width;drawScreenArt(ctx,'bootCredit',{dx:Math.round((256-w)/2),dy:150,step});}
 ctx.restore();}
export function getTsubasaCoverage(){return {schemaVersion:1,scope:nonmatchResolver?'kind-0 and mapped nonmatch actors; see explicit coverage report':'kind-0 actors; other sprite kinds require separate replacement',expectedFrames:ALL_PLAYER_FRAMES.map(f=>f.id),approvedPreviewFrames:APPROVED_PREVIEW_FRAMES,characters:characters.map(c=>({id:c.id,frames:Object.keys(c.skin.frames).map(Number),missingFrames:ALL_PLAYER_FRAMES.filter(f=>!c.skin.frames[f.id]).map(f=>f.id),sourceIdentity:c.sourceIdentity??null,identityStatus:c.identityStatus??null,referenceMappingVerified:!isUnverifiedArtwork(c)})),identityDataConnected:!!identityResolver,kitDataConnected:!!kitResolver};}
const DEFAULT_KITS=[{field:{shirt:'#f3f1e7',shorts:'#224e8e',socks:'#f3f1e7',trim:'#224e8e'},keeper:{shirt:'#b74743',shorts:'#243745',socks:'#243745',trim:'#f3f1e7'}},{field:{shirt:'#243745',shorts:'#f3f1e7',socks:'#243745',trim:'#f3f1e7'},keeper:{shirt:'#eac348',shorts:'#243745',socks:'#eac348',trim:'#243745'}}];
const hexRGB=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const colorCache=new Map(),rgbaCache=new Map();
const littleEndian=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
function packedColor(color){if(typeof color==='number')return color;let packed=rgbaCache.get(color);if(packed===undefined){const [r,g,b]=hexRGB(color);packed=(littleEndian?r|g<<8|b<<16|0xff000000:r<<24|g<<16|b<<8|255)>>>0;rgbaCache.set(color,packed);}return packed;}
function unpackedColor(color){if(typeof color==='string')return color;const rgb=littleEndian?(color&255)<<16|(color&0xff00)|(color>>>16&255):color>>>8;return '#'+rgb.toString(16).padStart(6,'0');}
function shade(color,factor=1){const key=color+':'+factor;if(!colorCache.has(key)){colorCache.set(key,'#'+hexRGB(color).map(n=>Math.max(0,Math.min(255,Math.round(n*factor))).toString(16).padStart(2,'0')).join(''));}return colorCache.get(key);}
/** Frozen review artwork did not have fabric masks. Only cloth-colored cells
 * outside the authored head are classified. New assets supply explicit masks. */
function legacyFabric(art,frame,x,y,value){
 if(![2,6,7,8,10].includes(value))return 0;
 const h=art.headRegion;if(h&&x>=h.x&&x<h.x+h.width&&y>=h.y&&y<h.y+h.height)return 0;
 if(frame===7)return x>=-5?(x<=-1?2:3):1;
 if(frame===19)return y<=-27?3:y<=-23?2:1;
 const shortsTop=frame===18?-15:frame===41?-14:(h?.y??-32)+20;
 return y>=shortsTop+4?3:y>=shortsTop?2:1;
}
const shirtGeometry=new WeakMap();
/** art.patternFrom (head-edit frames on the original body, tsubasa-native-heads.js): the kit pattern is read off
 * the matching HD frame, each shirt pixel taking the (u,v) of the nearest HD shirt pixel, so stripes, collars and
 * shoulders sit where the HD pose puts them instead of being re-guessed from the blockier original body */
const patternUv=new WeakMap();
function borrowedShirtCoordinates(art,xx,yy){let m=patternUv.get(art);if(!m){const src=art.patternFrom,W=art.width,H=art.height,dx=Math.round((art.originX-src.originX)*2),dy=Math.round((art.originY-src.originY)*2),pts=[];
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if((src.patternSourceMaterials??src.materials)?.[y]?.[x]==='1')pts.push([x,y]);
  m=new Map();for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(art.materials?.[y]?.[x]!=='1')continue;const sx=x+dx,sy=y+dy;let best=null,bd=1e9;for(const p of pts){const d=(p[0]-sx)**2+(p[1]-sy)**2;if(d<bd){bd=d;best=p;}}m.set(y*W+x,best&&bd<=9?shirtCoordinates(src,best[0],best[1]):[.5,.5]);}/* no HD shirt within 3 px (the HD pose has hair there): plain shirt */
  patternUv.set(art,m);}
 return m.get(yy*art.width+xx)??[.5,.5];}
function shirtCoordinates(art,xx,yy){
 if(art.patternFrom)return borrowedShirtCoordinates(art,xx,yy);
 let g=shirtGeometry.get(art);if(!g){const points=[];for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++)if((art.patternSourceMaterials??art.materials)?.[y]?.[x]==='1')points.push([x,y]);
  if(!points.length)return [.5,.5];const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;
  const h=art.headRegion;let ax=0,ay=1;if(h){ax=cx-((h.x-art.originX)*2+h.width);ay=cy-((h.y-art.originY)*2+h.height);const length=Math.hypot(ax,ay)||1;ax/=length;ay/=length;}
  const projections=points.map(([x,y])=>[(x-cx)*ay-(y-cy)*ax,(x-cx)*ax+(y-cy)*ay]);g={cx,cy,ax,ay,u0:Math.min(...projections.map(p=>p[0])),u1:Math.max(...projections.map(p=>p[0])),v0:Math.min(...projections.map(p=>p[1])),v1:Math.max(...projections.map(p=>p[1]))};shirtGeometry.set(art,g);
 }
 return [((xx-g.cx)*g.ay-(yy-g.cy)*g.ax-g.u0)/Math.max(1,g.u1-g.u0),((xx-g.cx)*g.ax+(yy-g.cy)*g.ay-g.v0)/Math.max(1,g.v1-g.v0)];
}
function patternedShirt(kit,art,x,y){
 const [u,v]=shirtCoordinates(art,x,y),p=kit.pattern??'solid',trim=kit.trim??kit.shirt,accent=kit.accent??trim;let color=kit.shirt;
 if(p==='white_dark_vertical_split')return u>.52?trim:color;
 if(p==='sky_white_vertical_stripes')return Math.floor(u*6)%2===0?trim:color;
 if(p==='thin_white_horizontal_stripes')return Math.floor(v*13)%4===1?trim:color;
 if(p==='wide_white_shoulders')return v<.28?trim:color;
 if(p==='red_sleeves_white_torso')return u<.25||u>.75?accent:color;
 if(p==='red_white_chest_band')return v>.3&&v<.43?trim:v>=.43&&v<.5?accent:color;
 if(p==='gray_long_sleeve_navy_chest')return v>.2&&v<.43?trim:color;
 if(p==='blue_red_shoulder_bands')return v<.12?trim:v<.24?accent:color;
 if(p.includes('shoulder_lines')){if(v<.2&&(u<.3||u>.7))color=trim;}
 if(p.includes('collar')||p==='white_trim'){if(v<.18&&u>.3&&u<.7)color=trim;}
 if(p.includes('cuffs')&&v>.58&&(u<.15||u>.85))color=trim;
 return color;
}
function artColor(art,skin,kit,frame,xx,yy,value,brightness){
 kit=art.personKits?.[parseInt(art.kitOwners?.[yy]?.[xx]??'0',16)]??kit;
 let color=art.personPalettes?.[parseInt(art.paletteOwners?.[yy]?.[xx]??'0',16)]?.[value]??skin.palette[value]??'#101b27';const rawMaterial=art.materials?.[yy]?.[xx];
 let material=rawMaterial===undefined?legacyFabric(art,frame,art.originX+xx/2,art.originY+yy/2,value):parseInt(rawMaterial,16);
 const sleeve=(kit?.longSleeves?art.sleeveMask:kit?.shortSleeves===true?art.shortSleeveMask:null)?.[yy]?.[xx]==='1';if(sleeve)material=1;
 const key=({1:'shirt',2:'shorts',3:'socks',4:'trim',5:'gloves'})[material];
 if(key&&kit?.[key]){color=sleeve&&kit.pattern==='red_sleeves_white_torso'?(kit.accent??kit.trim):key==='shirt'?patternedShirt(kit,art,xx,yy):kit[key];const rawShade=(art.shade??art.shades)?.[yy]?.[xx];const factor=rawShade!==undefined?({0:1,1:1,2:.78,3:1.12}[parseInt(rawShade,16)]??1):value===6||value===10?.78:value===7?1.12:1;color=shade(color,factor);}
 return brightness>=64?color:shade(color,brightness===0?0:Math.max(.2,brightness/64));
}
/* the opaque pixels of a sprite with their final colours, [xx,yy,color,...] in row order (2026-10-23, phone heat): the
 * colour of a pixel depends only on the art, the character, the kit, the frame and the brightness, so each combination is
 * coloured once instead of on every paint. Colours are packed native-endian RGBA in a Uint32Array;
 * pixel order, priority, clipping and the non-buffer canvas fallback stay identical. */
const artColorCache=new WeakMap(),kitIds=new WeakMap();let nextKitId=1;
function artColors(art,skin,kit,frame,brightness){let byArt=artColorCache.get(art);if(!byArt){byArt=new Map();artColorCache.set(art,byArt);}
 let kid=kit&&typeof kit==='object'?kitIds.get(kit):0;if(kid===undefined){kid=nextKitId++;kitIds.set(kit,kid);}
 const key=skin.id+'|'+kid+'|'+frame+'|'+brightness;let cols=byArt.get(key);if(cols)return cols;cols=[];
 for(let yy=0;yy<art.height;yy++){const row=art.pixels[yy];for(let xx=0;xx<art.width;xx++){const value=parseInt(row[xx],16);if(!value)continue;cols.push(xx,yy,packedColor(artColor(art,skin,kit,frame,xx,yy,value,brightness)));}}
 if(byArt.size>24)byArt.delete(byArt.keys().next().value);/* fades walk the brightness: keep only the recent ones */
 cols=Uint32Array.from(cols);byArt.set(key,cols);return cols;}
function identity(actor){
 const resolved=identityResolver?.(actor.teamId,actor.playerNumber,actor.role);
 const fallback=actor.role==='keeper'?'wakabayashi':actor.entity&1?'hyuga':'tsubasa';
 const characterId=resolved?.characterId??fallback;
 return {...resolved,characterId,name:resolved?.name??characterId,temporaryIdentity:!resolved};
}
/** Compose at a genuine 2x backing resolution while preserving source OAM
 * object order, ordinary balls/effects, shadow priority and background occlusion.
 * A registered live Tsubasa move replaces its complete source-ball sprite at
 * that same OAM depth; the original special shape is never left underneath.
 * Authored sprites use half-logical-pixel cells, never a scaled old face. */
/** D-14: during a special transform frame only, the real ball-shadow OAM record
 * (entry 12|32 -> tile A1, attr 1 at groundY-8, x-4) wins its scanlines. */
export function tsubasaShadowPriority(r,oam){
 if(!isTsubasaSpecialShadowLocked(r))return [];
 // OAM is assembled from the PREVIOUS frame's list, so match the record itself
 // (tile A1 / attr 1 is only written for an entry|32 ground shadow), not live RAM.
 // Players also get A1 shadows when airborne: take the one nearest the ball's
 // ground point (one frame of ball travel, <=16px, separates them).
 const bx=(r[0x3af+12]-4)&255,by=(r[0x3d5+12]-8)&255;let best=-1,dist=33;
 for(let n=0;n<64;n++)if(oam[n*4+1]===0xa1&&(oam[n*4+2]&3)===1&&oam[n*4]<240){const d=Math.abs(oam[n*4+3]-bx)+Math.abs(oam[n*4]-by);if(d<dist){dist=d;best=n;}}
 return best<0?[]:[best];
}
/* P-4 sprite layer: one 512x480 canvas + RGBA buffer from the host's canvas factory (installTsubasaPresentation).
 * Every sprite pixel is opaque, so drawing the layer over the picture equals writing those pixels into it. */
let spriteLayerFactory=null,spriteLayer=null;const spriteClaims=new Uint8Array(512*480);
export function setTsubasaSpriteLayerFactory(factory){spriteLayerFactory=factory;spriteLayer=null;}
function spriteLayerFor(){if(!spriteLayerFactory)return null;if(!spriteLayer){const canvas=spriteLayerFactory(512,480),g=canvas?.getContext?.('2d');if(!g?.createImageData||!g.putImageData)return null;spriteLayer={canvas,g,image:g.createImageData(512,480),box:null};}return spriteLayer;}
function clearSpriteLayer(layer){const b=layer.box,d=layer.image.data;if(b)for(let y=b.y0;y<=b.y1;y++)d.fill(0,(y*512+b.x0)*4,(y*512+b.x1+1)*4);layer.box=null;return layer.image;}
function presentSpriteLayer(ctx,layer,box){layer.box=box;if(!box)return;const w=box.x1-box.x0+1,h=box.y1-box.y0+1;layer.g.putImageData(layer.image,0,0,box.x0,box.y0,w,h);
 ctx.save();ctx.setTransform?.(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;ctx.drawImage(layer.canvas,box.x0,box.y0,w,h,box.x0,box.y0,w,h);ctx.restore();}
export function drawTsubasaSprites(ctx,r,actors,{layout,scale=2,diagnostics}={}){
 if(!(r[0x4d]&16))return;
 const oam=r.subarray(0x200,0x300),appearance=menuAppearanceFromState(r),rows=spriteScanlineRows(oam,specialRowPriority(r,oam,actors)),claimed=spriteClaims.fill(0),actorAt=new Map(),owned=new Set(),leftClip=(r[0x4d]&4)?0:8,brightness=r[0x5b4],kits=kitResolver?.(r[0x52c]&15,r[0x52d]&15)??DEFAULT_KITS;
 const shake=getTsubasaTrianglePostShake(r),layer=scale===2&&!shake&&typeof ctx.drawImage==='function'?spriteLayerFor():null;let box=null;
 /* P-4: sprite pixels go to a transparent layer drawn over the picture (no read-back of the canvas); only the triangle
  * post shake, which moves background pixels, still reads the canvas back */
 const output=layer?clearSpriteLayer(layer):scale===2&&typeof ctx.getImageData==='function'&&typeof ctx.putImageData==='function'?ctx.getImageData(0,0,512,480):null;
 const output32=output?new Uint32Array(output.data.buffer,output.data.byteOffset,output.data.byteLength/4):null;
 triangleShake=null;if(shake&&output)triangleShake=shakeTrianglePost(output,shake,-(r[0xec]|r[0xed]<<8),-(r[0xee]|r[0xef]<<8));
 const observedSpecialState=getTsubasaSpecialState(r),specialState=(observedSpecialState&&!observedSpecialState.nativeArtwork&&TSUBASA_BALL_EFFECTS[observedSpecialState.effect]?observedSpecialState:null)??(!observedSpecialState?.nativeArtwork&&shouldReplaceTsubasaBallArtwork(r)?getTsubasaPlainBallState(r,{colourBall:tsubasaNativeColourBallShot(r)}):null);
 const specialBall=getSpecialBallReplacement(r,actors,specialState);let specialBallReport=null;
 // Must M-2/M-3: per-move palette for native creature art (falcon 黑/08/26).
 // Only OAM of the real ball actor (entity 12, kind 1); the shadow keeps its own.
 const movePalette=observedSpecialState?.nativeArtwork?TSUBASA_NATIVE_ART_PALETTES[observedSpecialState.moveId]:null,movePaletteOam=new Set(movePalette?actors.filter(a=>a.entity===12&&a.kind===1).flatMap(a=>a.oamIndices??[]):[]);
 if(specialBall)for(const index of specialBall.indices)owned.add(index);
 // nativeArt:false + authored frames (project shots-v2): hide the native ball OAM and
 // draw the authored frame for the SAME native frame id at the ball actor origin.
 let authored=null;if(observedSpecialState?.authoredArt){const ballActor=actors.find(a=>a.entity===12&&a.kind===1&&a.oamIndices?.length),art=ballActor&&TSUBASA_AUTHORED_MOVE_ART[observedSpecialState.moveId]?.[((ballActor.frame&127)).toString(16).padStart(2,'0')];
  if(art){const indices=ballActor.oamIndices.filter((index,j)=>ballActor.sourceRecords[j].every((v,k)=>v===oam[index*4+k]));if(indices.length){const attr=oam[indices[0]*4+2];authored={actor:ballActor,art,at:Math.min(...indices),palette:movePalette??SPRITE_PALETTES[appearance.paletteIds[attr&3]],priority:attr&32,mirrored:!!(attr&64),frameId:(ballActor.frame&127)};for(const i of indices)owned.add(i);}}}
 const active=[];actorFramesDrawn=[];razorF15Drawn=[];triangleDrawn=[];morisakiSaveDrawn=null;misugiHeartDrawn=null;fireShotDrawn=[];namedBodyDrawn=[];const fireState=getTsubasaSpecialState(r),/* 2026-10-23 (user: "some bodies are wrong too"): the hand-drawn special-pose frames predate the head swap and their bodies
  * (3-colour or HD) do not match the game's: keepers' Morisaki save s1-s3 / razor f15 / drive chop / shared misread, Misugi's M-10
  * chest pose, the M-8 triangle poses, the Skylab launch poses, Schneider's M-11 fire-shot body and the D-43 whole-match Schneider /
  * Misugi sets. Everyone now shows his own frames (native body + new head) in those moments too; moves, effects (flames, overlays)
  * and gameplay are unchanged. The passes stay for a redrawn set (were getTsubasaMorisakiSavePose / getTsubasaMisugiHeartPose /
  * getTsubasaTrianglePoses / the Skylab placements / getTsubasaFireShotBodyPose + getTsubasaNamedBodyPose) */
 m9=null,m10=null,m10o=getTsubasaMisugiOverlay(r);const triPoses=new Map();
 for(const actor of actors){
  if(actor===specialBall?.actor)continue;
  const nonmatch=actor.kind!==0||actor.entity>=12,custom=nonmatch?nonmatchResolver?.(actor,r):null;
  if(nonmatch&&!custom?.art){diagnostics?.sourceSprite(actor,custom);continue;}
  // Overflow sprites may overwrite reserved OAM slots after actor assembly.
  const valid=actor.oamIndices.filter((index,j)=>actor.sourceRecords[j].every((v,k)=>v===oam[index*4+k]));
  if(!valid.length)continue;
  const id=custom?{...getCharacterIdentity(custom.characterId),...custom,characterId:custom.characterId,name:custom.name??getCharacterIdentity(custom.characterId)?.name??custom.characterId}:identity(actor),selected=verifiedCharacter(id.characterId),genericId=fallbackArtId(id.characterId),fallback=byId.get(genericId)??byId.get(actor.role==='keeper'?'wakabayashi':'tsubasa')??characters[0],skin=custom?.skin??(selected??fallback).skin,requested=actor.frame&127,razorKick=!custom?getTsubasaRazorKickFrame(r,actor.entity,actor.frame):null,renderedFrame=razorKick??(!custom&&[36,37].includes(requested)&&shouldReplaceTsubasaShockArtwork(r,actor.entity)?38:requested),art=custom?.art??getTsubasaLayeredArt(skin,renderedFrame)??skin.frames[renderedFrame]??skin.frames[0],substituted=!custom&&!skin.frames[renderedFrame];
  if(!art)throw Error(`No authored art for ${id.characterId}/${requested}`);
  // D-37 razor keeper f15, per keeper locked for the match: 'native' = the original assembler's f15 tiles (this actor is left
  // to the native OAM path), 'hd' = project's approved HD f15 (drawn below as an HD pose).
  if(!custom&&(actor.entity===10||actor.entity===11)){const kp=razorKeeperPose(r);if(kp?.slot===actor.entity&&kp.pose==='f15'&&(actor.frame&127)===15/* the f15 display frame takes effect at the next assembly; until then the misread stays */){const mode=getTsubasaRazorKeeperF15Mode(r,razorF15Key(id.characterId,!selected),TSUBASA_RAZOR_KEEPER_F15);razorF15Drawn.push({entity:actor.entity,characterId:id.characterId,mode,frameByte:actor.frame,nativeFrame:actor.frame&127,flipBit:!!(actor.frame&128),x:actor.x,y:actor.y});if(mode==='native')continue;}}
  const side=custom?.side??(actor.entity&1),role=custom?.role??actor.role;
  const a={...actor,...custom?.presentation,teamId:custom?.teamId??actor.teamId,playerNumber:custom?.playerNumber??actor.playerNumber,role,identity:id,artCharacterId:custom?.artCharacterId??(selected??fallback).id,skin,art,requested,renderedFrame:custom?.renderedFrame??renderedFrame,transformationReplacement:renderedFrame!==requested&&razorKick==null,razorKick,substituted,identityMissing:custom?.genericAppearance??!selected,kit:custom?.kit??kits[side]?.[role]??DEFAULT_KITS[side][role]};
  actorFramesDrawn.push({entity:a.entity,characterId:id.characterId,requested,renderedFrame,razorKick,mirrored:!!(actor.frame&128),kitShirt:a.kit?.shirt??null,triangle:triPoses.get(a.entity)?.key??null,x:a.x,y:a.y,groundY:a.groundY});
  actorAt.set(Math.min(...valid),a);for(const i of valid)owned.add(i);active.push(a);
 }
 const defensiveByEntity=new Map(),defensiveReports=[],partnerByEntity=new Map(),partnerReports=[];
 for(const visual of getTsubasaDefensiveVisuals(active,getTsubasaDefensiveState(r))){if(!defensiveByEntity.has(visual.slot))defensiveByEntity.set(visual.slot,[]);defensiveByEntity.get(visual.slot).push(visual);}
 for(const visual of getTsubasaPartnerVisuals(active,getTsubasaPartnerState(r)))partnerByEntity.set(visual.slot,visual);
 const skylabPoses=new Map();/* no special-pose frames, see m9 above */
 // D-31: sprite rotation (special path only, only when a scanline holds more than 8 sprites).
 // Review evidence: every sprite row the compositor drops (native 8-per-line mask or D-31 rotation), per entity.
 keeperArtDrawn=[];keeperHdDrawn=[];lastSpecialBallVisibility=null;const cuts=[],ownerOf=new Map();for(const ac of actors)for(const i of ac.oamIndices??[])ownerOf.set(i,ac.entity);lastRowCuts=cuts;
 const motionByOam=new Map();for(const a of actors)if(a.renderOffsetX||a.renderOffsetY)for(const i of a.oamIndices??[])motionByOam.set(i,a);
 const rot=noteTsubasaSpriteRotation(computeTsubasaSpriteRotation(r,actors,[...skylabPoses.values()]));
 function pixel(x,y,color,priority,w=1,stats=null){
  const qx=Math.round(x*2),qy=Math.round(y*2);if(qx<leftClip*2||qx<0||qx>=512||qy<0||qy>=480)return;
  for(let dy=0;dy<w;dy++)for(let dx=0;dx<w;dx++){const sx=qx+dx,sy=qy+dy;if(sx>=512||sy>=480)continue;const at=sy*512+sx;if(claimed[at]){if(stats)stats.actorOccludedPixels++;continue;}claimed[at]=1;
   const bx=sx>>1,by=sy>>1;if(priority&&layout?.backgroundOpaque&&bx<(layout.backgroundMaskWidth??256)&&by<(layout.backgroundMaskHeight??240)&&layout.backgroundOpaque[by*(layout.backgroundMaskWidth??256)+bx]){if(stats)stats.backgroundOccludedPixels++;continue;}
   if(stats)stats.finalCanvasPixelCount++;
   if(output32){output32[at]=packedColor(color);if(layer){if(!box)box={x0:sx,y0:sy,x1:sx,y1:sy};else{if(sx<box.x0)box.x0=sx;if(sx>box.x1)box.x1=sx;if(sy<box.y0)box.y0=sy;if(sy>box.y1)box.y1=sy;}}}else{ctx.fillStyle=unpackedColor(color);ctx.fillRect(sx*scale/2,sy*scale/2,scale/2,scale/2);}
  }
 }
 /* Character pixels are already 1 HD pixel with packed colours. Avoid the general effect pixel's
  * nested width loops, colour lookup and repeated coordinate rounding for each of those pixels. */
 function characterPixel(sx,sy,color,priority){if(sx<leftClip*2||sx<0||sx>=512||sy<0||sy>=480)return;const at=sy*512+sx;if(claimed[at])return;claimed[at]=1;
  const bx=sx>>1,by=sy>>1;if(priority&&layout?.backgroundOpaque&&bx<(layout.backgroundMaskWidth??256)&&by<(layout.backgroundMaskHeight??240)&&layout.backgroundOpaque[by*(layout.backgroundMaskWidth??256)+bx])return;
  if(output32){output32[at]=color;if(layer){if(!box)box={x0:sx,y0:sy,x1:sx,y1:sy};else{if(sx<box.x0)box.x0=sx;if(sx>box.x1)box.x1=sx;if(sy<box.y0)box.y0=sy;if(sy>box.y1)box.y1=sy;}}}
  else{ctx.fillStyle=unpackedColor(color);ctx.fillRect(sx*scale/2,sy*scale/2,scale/2,scale/2);}}
 // M-10 D-41 UI overlays (o2 OFFSIDE, h1 countdown; project v1, 美术演绎、未核), native 1x grid, drawn FIRST so they stay on top.
 if(m10o){misugiOverlayDrawn={offside:null,countdown:null};if(m10o.offside){const a=MISUGI_HEART_ART.o2,x0=(256-a.width)>>1,y0=40;for(let yy=0;yy<a.height;yy++)for(let xx=0;xx<a.width;xx++){const c=a.rows[yy][xx];if(c!=='.')pixel(x0+xx,y0+yy,a.palette[c],0,2);}misugiOverlayDrawn.offside={x:x0,y:y0,width:a.width,height:a.height};}
  if(m10o.countdown!=null){const text=formatMisugiCountdown(m10o.countdown),b=misugiClockBitmap(text),x0=256-8-b[0].length,y0=40;for(let yy=0;yy<b.length;yy++)for(let xx=0;xx<b[yy].length;xx++)pixel(x0+xx,y0+yy,b[yy][xx]==='W'?'#FCFCFC':'#000000',0,2);misugiOverlayDrawn.countdown={text,x:x0,y:y0,width:b[0].length,height:b.length};}}else misugiOverlayDrawn=null;
 // An overwritten final slot can place a proven ball intent behind index 63.
 // D-14 follow-up: the protected ball records sit at the rear of OAM, so during a
 // special transform draw the ball body FIRST (front; claimed pixels win) and keep
 // the shadow at the rear. Ordinary play keeps native OAM order.
 // M-8 D-39: project's triangle f1/f2/f3 (美术演绎、未核), world-anchored (screen = world - displayed camera $EC/$EE, the
 // same transform as the BG goal posts), so the sole sits on the post outline whatever the OAM lag/flicker. Drawn first
 // (front). W = that player's team shirt (D-33, same kit every frame), O = his skin, K = outline.
 for(const tri of triPoses.values()){const t=TRIANGLE_ART[tri.key],s=tri.slot,a=active.find(q=>q.entity===s),side=s&1,
  kit=a?.kit??kits[side]?.field??DEFAULT_KITS[side].field,col=t.palette??{K:TRIANGLE_OUTLINE,W:kit.shirt,O:triangleSkin(a?.skin)}/* D-43: per-frame 3-colour palette */,
  wx=((r[0x314+s]|r[0x327+s]<<8)<<16>>16),wy=((r[0x34d+s]|r[0x360+s]<<8)<<16>>16),wz=((r[0x386+s]|r[0x399+s]<<8)<<16>>16),
  x=wx-(r[0xec]|r[0xed]<<8),y=wy-(r[0xee]|r[0xef]<<8)-wz;
  for(let yy=0;yy<t.height;yy++)for(let xx=0;xx<t.width;xx++){const c=t.rows[yy][xx];if(c==='.')continue;const dx=t.ox+xx;pixel(x+(tri.mirrored?-dx-1:dx),y+t.oy+yy,col[c],0,2);}
  triangleDrawn.push({entity:s,characterId:a?.identity?.characterId??null,key:tri.key,artId:t.id,mirrored:tri.mirrored,x,y,world:{x:wx,y:wy,z:wz},shirt:col.T??col.W,skin:col.S??col.O,nativeActorInOam:!!a});}
 /* 2026-10-21 shot impacts (src/tsubasa-shot-impacts.js): kick flash / keeper hit / net ripple, presentation only. Front pixels are
  claimed here, before every sprite; behind pixels go after them (n===64) */
 const impacts=getTsubasaShotImpactPixels(r,observedSpecialState),impactPriority=actors.find(a=>a.entity===12&&a.kind===1)?.priority??0;/* the ball's own priority: behind-background balls hide their effects too */for(const p of impacts.front)pixel(p.x,p.y,p.color,impactPriority,2);lastShotImpacts=impacts.effects;
 const frontDone=new Set();
 if(isTsubasaSpecialShadowLocked(r)){
  if(authored){const {actor,art,palette,priority,mirrored}=authored;for(let yy=0;yy<art.rows.length;yy++)for(let xx=0;xx<art.rows[yy].length;xx++){const v=+art.rows[yy][xx];if(!v)continue;const dx=art.ox+xx;pixel(actor.x+(mirrored?-dx-1:dx),actor.y+art.oy+yy,DISPLAY_NES_RGB[paletteBrightness(palette[v],brightness)&63],priority,2);}authored.at=-1;}
  else if(!specialBall){const b=actors.find(a=>a.entity===12&&a.kind===1);for(const n of (b?.oamIndices??[]).filter((index,j)=>b.sourceRecords[j].every((v,k)=>v===oam[index*4+k]))){const at=n*4,py=oam[at]+1;if(py>=240||!rows[n])continue;frontDone.add(n);
   const attr=oam[at+2],tile=appearanceTile(oam[at+1],appearance),palette=movePaletteOam.has(n)?movePalette:SPRITE_PALETTES[appearance.paletteIds[attr&3]];
   for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){if(!(rows[n]&(1<<yy))||rot?.recordHidden(n,py+yy)){if(xx===0)cuts.push({entity:ownerOf.get(n)??null,record:n,y:py+yy,by:rows[n]&(1<<yy)?'rotation':'native-8'});continue;}const value=tile[(attr&128?7-yy:yy)*8+(attr&64?7-xx:xx)];if(value)pixel(oam[at+3]+xx+(motionByOam.get(n)?.renderOffsetX??0),py+yy+(motionByOam.get(n)?.renderOffsetY??0),DISPLAY_NES_RGB[paletteBrightness(palette[value],brightness)&63],attr&32,2);}}}
 }
 // Team decision (D-33+): during the ドライブシュート flight the golden hawk is drawn first, so it stays above the
 // keeper (and every other sprite). Special path only; other specials and normal shots keep native layering.
 const hawkFirst=!!specialBall&&['drive-shot','razor-shot','cannon-shot'].includes(specialBall.state?.moveId);/* D-37: the razor ball, too, stays above the keeper it fools */let specialBallDrawn=false,deferredTrail=null;/* D-62: drive afterimages are plotted after all sprites = behind them */
 for(let n=0;n<=64;n++){
  if(!specialBallDrawn&&(hawkFirst?n===0:n===specialBall?.at)){specialBallDrawn=true;
   const a=specialBall.actor,visibility={finalCanvasPixelCount:0,actorOccludedPixels:0,backgroundOccludedPixels:0};
   specialBallReport=drawTsubasaSpecialBall(ctx,{r,state:specialBall.state,actor:a,scale,brightness,leftClip,plot:(x,y,color)=>pixel(x,y,color,a.priority,1,visibility),plotTrail:pts=>{deferredTrail={pts,a};}});
   if(specialBallReport){specialBallReport.hiddenOamIndices=[...specialBall.indices];specialBallReport.visibility=visibility;lastSpecialBallVisibility={...visibility,moveId:specialBall.state?.moveId??null,drawnFirst:hawkFirst};specialBallReport.renderIntent=a.renderIntent?a.reason:'source-oam';}
   diagnostics?.specialBall?.(specialBallReport);
  }
  if(n===authored?.at){const {actor,art,palette,priority,mirrored}=authored;for(let yy=0;yy<art.rows.length;yy++)for(let xx=0;xx<art.rows[yy].length;xx++){const v=+art.rows[yy][xx];if(!v)continue;const dx=art.ox+xx;pixel(actor.x+(mirrored?-dx-1:dx),actor.y+art.oy+yy,DISPLAY_NES_RGB[paletteBrightness(palette[v],brightness)&63],priority,2);}}
  if(n===64){if(deferredTrail)for(const p of deferredTrail.pts)pixel(p.x,p.y,p.color,deferredTrail.a.priority,1);for(const p of impacts.behind)pixel(p.x,p.y,p.color,impactPriority,2);break;}
  const actor=actorAt.get(n);
  if(actor){const {art,skin,kit,frame,x,y,groundY,clipY,priority}=actor,mirrored=!!(frame&128);
   const pose=skylabPoses.get(actor.entity),rk=razorKeeperPose(r),keeperPose=driveKeeperLookUp(r)===actor.entity||rk?.slot===actor.entity&&(rk.pose==='misread'||(frame&127)!==15)?'misread':driveKeeperPunch(r)===actor.entity?'chop':rk?.slot===actor.entity&&rk.pose==='f15'?'f15':null;
   // D-33: same character, same art. A keeper with HD art keeps it (hair, palette) in every scene: he gets the shared-base
   // misread/chop frame only when he has no HD art; with HD art he shows project's HD pose once delivered (hook
   // TSUBASA_KEEPER_HD_POSES), until then his own HD frames.
   const hdPose=null,misread=null;/* 2026-10-23: no special-pose frame, see m9 above */
   if(keeperPose)keeperArtDrawn.push({entity:actor.entity,characterId:actor.identity?.characterId??null,pose:keeperPose,art:hdPose?'hd-pose:'+hdPose.id:misread?'shared:'+misread.art.id:'hd-skin:'+actor.artCharacterId});
   // D-31/D-32: project's signed keeper-misread v2 / Wakashimazu chop v2 frame replaces the fooled keeper's native pose (special path only).
   const tri=triPoses.get(actor.entity);
   // M-11 D-42: project v1.4 ground / v1.6 volley Schneider fire-shot body frame (3 colours, native 1x grid, 美术演绎、未核) replaces his native/HD frame.
   const fire=null;/* no special-pose frames, see m9 above */
   if(fire){const colors=new Set();forEachFireShotBodyPixel(fire,x,y,(px,py,c)=>{if(py<0||py>=clipY+8||(groundY<y&&py>=groundY-5))return;colors.add(c);pixel(px,py,c,priority,2);});(fire.set==='d43'?namedBodyDrawn:fireShotDrawn).push({entity:actor.entity,characterId:actor.identity?.characterId,set:fire.set,artId:fire.art.id,label:fire.art.label,nativeFrame:fire.nativeFrame,mirrored:fire.mirrored,x,y,ox:fire.art.ox,oy:fire.art.oy,width:fire.art.width,height:fire.art.height,colors:[...colors]});}else
      // M-8: the triangle pose replaces this actor; it is drawn world-anchored in its own pass (see drawTrianglePoses).
   if(tri||m9?.slot===actor.entity||m10?.slot===actor.entity){/* M-8 triangle / M-9 morisaki pose: drawn world-anchored in their own pass */}else
   if(misread)forEachDriveKeeperMisreadPixel(misread,(px,py,c)=>{pixel(px,py,(misread.palette??DRIVE_KEEPER_MISREAD_PALETTE)[c],priority,2);});else
   if(pose)forEachSkylabPosePixel(pose,(px,py,c)=>{pixel(px,py,SKYLAB_LAUNCH_PALETTE[c],priority,2);});else
   if(actor.entity===10||actor.entity===11)keeperHdDrawn.push({entity:actor.entity,characterId:actor.identity?.characterId??null,artCharacterId:actor.artCharacterId??null,art:hdPose??actor.art,skin:actor.skin,pose:hdPose?.id??null,x:actor.x,y:actor.y,frame:actor.frame,groundY:actor.groundY,clipY:actor.clipY});
   if(!fire&&!tri&&m9?.slot!==actor.entity&&m10?.slot!==actor.entity){const art=hdPose??actor.art,cols=artColors(art,skin,kit,actor.substituted?0:actor.renderedFrame,brightness),baseX=Math.round((x+(mirrored?-art.originX-.5:art.originX))*2),baseY=Math.round((y+art.originY)*2);
    for(let i=0;i<cols.length;i+=3){const xx=cols[i],yy=cols[i+1],sy=y+art.originY+yy/2;
    // The recovered assembler clips tile origins at clipY. Keep those eight
    // logical rows and the below-ground cut without wrapping near y=0.
    if(sy<0||sy>=clipY+8||(groundY<y&&sy>=groundY-5))continue;
    /* 2026-10-17: whole HD bodies are never row-cut (D-31 rotation sliced them into floating limbs on still frames) */
    characterPixel(baseX+(mirrored?-xx:xx),baseY+yy,cols[i+2],priority);
   }}
   for(const visual of defensiveByEntity.get(actor.entity)??[]){const report=drawTsubasaDefensiveEffect(ctx,{r,visual,scale,brightness,leftClip,plot:(x,y,color)=>{if(groundY<actor.y&&y>=groundY-5)return;pixel(x,y,color,priority);}});if(report)defensiveReports.push(report);}
   if(partnerByEntity.has(actor.entity)){const report=drawTsubasaPartnerEffect(ctx,{r,visual:partnerByEntity.get(actor.entity),scale,brightness,leftClip,plot:(x,y,color)=>pixel(x,y,color,priority)});if(report)partnerReports.push(report);}
   diagnostics?.record(actor,appearance);
  }
  if(owned.has(n)||frontDone.has(n))continue;const at=n*4,py=oam[at]+1;if(py>=240||!rows[n])continue;
  const attr=oam[at+2],tile=appearanceTile(oam[at+1],appearance),palette=movePaletteOam.has(n)?movePalette:SPRITE_PALETTES[appearance.paletteIds[attr&3]];
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){if(!(rows[n]&(1<<yy))||rot?.recordHidden(n,py+yy)){if(xx===0)cuts.push({entity:ownerOf.get(n)??null,record:n,y:py+yy,by:rows[n]&(1<<yy)?'rotation':'native-8'});continue;}const value=tile[(attr&128?7-yy:yy)*8+(attr&64?7-xx:xx)];if(value)pixel(oam[at+3]+xx+(motionByOam.get(n)?.renderOffsetX??0),py+yy+(motionByOam.get(n)?.renderOffsetY??0),DISPLAY_NES_RGB[paletteBrightness(palette[value],brightness)&63],attr&32,2);}
 }
 // M-9 D-40: project's signed s1/s2/s3 (美术演绎、未核), HD only (D-33: Morisaki's own HD skin palette + his keeper kit), world-anchored
 // (screen = world - displayed camera $EC/$EE) and drawn LAST, so the ball (native F00) and every other sprite stay on top and
 // neither the keeper (no clipY / ground cut on this pass) nor the ball is ever cropped. Right goal = mirrored (project's flip rule).
 if(m9){const s=m9.slot,art=MORISAKI_SAVE_ART[m9.key],a=active.find(q=>q.entity===s),side=s&1,kit=a?.kit??kits[side]?.keeper??DEFAULT_KITS[side].keeper,
  skin=a?.skin??(verifiedCharacter('morisaki')??byId.get('morisaki')).skin,wx=((r[0x314+s]|r[0x327+s]<<8)<<16>>16),wy=((r[0x34d+s]|r[0x360+s]<<8)<<16>>16),wz=((r[0x386+s]|r[0x399+s]<<8)<<16>>16),
  x=wx-(r[0xec]|r[0xed]<<8),y=wy-(r[0xee]|r[0xef]<<8)-wz,stats={finalCanvasPixelCount:0,actorOccludedPixels:0,backgroundOccludedPixels:0},colors=new Set();
  for(let yy=0;yy<art.height;yy++)for(let xx=0;xx<art.width;xx++){const value=parseInt(art.pixels[yy][xx],16);if(!value)continue;const dx=art.originX+xx/2,c=artColor(art,skin,kit,15,xx,yy,value,brightness);colors.add(c);pixel(x+(m9.mirrored?-dx-.5:dx),y+art.originY+yy/2,c,0,1,stats);}
  const bx0=m9.mirrored?x-art.originX-art.width/2:x+art.originX,by0=y+art.originY;morisakiSaveDrawn={bounds:{left:bx0,top:by0,right:bx0+art.width/2,bottom:by0+art.height/2,onScreen:bx0>=leftClip&&by0>=0&&bx0+art.width/2<=256&&by0+art.height/2<=240},entity:s,characterId:a?.identity?.characterId??null,key:m9.key,artId:art.id,label:art.label,mirrored:m9.mirrored,x,y,world:{x:wx,y:wy,z:wz},kit:{shirt:kit.shirt,shorts:kit.shorts,socks:kit.socks},colors:[...colors],stats,nativeActorInOam:!!a};}
 // M-10 D-41: h2 (project v1.3, 美术演绎、未核) replaces 三杉 while it plays once; 1x native grid, 3 colours (#8A6448 hair+outline, #ECB4B0, #F4F4ED), mirrored by facing.
 if(m10){const s=m10.slot,a=MISUGI_HEART_ART.h2,x=X16(r,0x314+s)-(r[0xec]|r[0xed]<<8),y=X16(r,0x34d+s)-(r[0xee]|r[0xef]<<8)-X16(r,0x386+s),colors=new Set(),stats={finalCanvasPixelCount:0,actorOccludedPixels:0,backgroundOccludedPixels:0};
  for(let yy=0;yy<a.height;yy++)for(let xx=0;xx<a.width;xx++){const ch=a.rows[yy][xx];if(ch==='.')continue;const dx=a.originX+xx,c=a.palette[ch];colors.add(c);pixel(x+(m10.mirrored?-dx-1:dx),y+a.originY+yy,c,0,2,stats);}
  misugiHeartDrawn={entity:s,artId:a.id,label:a.label,mirrored:m10.mirrored,x,y,colors:[...colors],stats};}
 if(layer)presentSpriteLayer(ctx,layer,box);else if(output)ctx.putImageData(output,0,0);
 diagnostics?.defensiveMoves?.(defensiveReports);
 diagnostics?.partnerMoves?.(partnerReports);
 return {activeActors:active.length,specialBall:specialBallReport,defensiveMoves:defensiveReports,partnerMoves:partnerReports};
}
function makeDiagnostics(){
 const state={draws:0,renderedActors:0,legacyFallbacks:0,substitutedPoses:0,missingIdentities:0,temporaryIdentities:0},frames=new Set(),ids=new Set(),uncovered=new Set(),missing=new Set(),last=[],sourceKinds=new Map(),uncoveredNonmatch=new Map();let hudPortraits=[],backgroundCharacters=null,specialBall=null,defensiveMoves=[],partnerMoves=[];
 return {background(result){backgroundCharacters=result;},hud(portraits){hudPortraits=portraits;},specialBall(result){specialBall=result;},defensiveMoves(result){defensiveMoves=result;},partnerMoves(result){partnerMoves=result;},begin(){state.draws++;last.length=0;specialBall=null;defensiveMoves=[];partnerMoves=[];},sourceSprite(a){if(!sourceKinds.has(a.kind))sourceKinds.set(a.kind,new Set());sourceKinds.get(a.kind).add(a.frame&127);if([4,5,6,7,8,9].includes(a.kind)){const c=nonmatchClassifier?.(a.kind,a.frame)??{category:'unclassified'};if(c.category!=='non-person')uncoveredNonmatch.set(a.kind+':'+(a.frame&127),{kind:a.kind,frame:a.frame&127,teamId:a.teamId,playerNumber:a.playerNumber,...c});}},record(a,appearance){state.renderedActors++;frames.add(a.requested);ids.add(a.identity.characterId);if(a.substituted){state.substitutedPoses++;uncovered.add(a.identity.characterId+':'+a.requested);}if(a.identityMissing){state.missingIdentities++;const parts=a.art.compositeIdentities;if(parts?.length){for(const p of parts)if(p.genericAppearance)missing.add(p.characterId);}else missing.add(a.identity.characterId);}if(a.identity.temporaryIdentity)state.temporaryIdentities++;
  last.push({slot:a.entity,kind:a.kind,teamId:a.teamId,playerNumber:a.playerNumber,role:a.role,characterId:a.identity.characterId,artCharacterId:a.artCharacterId,genericAppearance:a.identityMissing,name:a.identity.name,frame:a.frame,renderedFrame:a.renderedFrame,transformationReplacement:a.transformationReplacement,position:[a.x,a.y,a.groundY],kit:a.kit,substitutedPose:a.substituted,compositeIdentities:a.art.compositeIdentities??null,celebrationFrame:a.art.celebrationFrame??null,artStatus:a.art.status??(APPROVED_PREVIEW_FRAMES.includes(a.requested)?'approved-preview':'unreviewed-extension'),chrPages:appearance.chrPages});},get(){return {...state,hudPortraits,backgroundCharacters,specialBall,defensiveMoves,partnerMoves,uncoveredNonmatch:[...uncoveredNonmatch.values()],frameIds:[...frames].sort((a,b)=>a-b),characterIds:[...ids],uncoveredFrames:[...uncovered],uncoveredIdentities:[...missing],sourceOnlyKinds:Object.fromEntries([...sourceKinds].map(([kind,frames])=>[kind,[...frames].sort((a,b)=>a-b)])),uncoveredCharacterKinds:[...new Set([...uncoveredNonmatch.values()].map(x=>x.kind))],lastActors:last.map(a=>({...a}))};}};
}
export function createTsubasaGraphics(){
 const api=createMenuGraphics(),actors=[],diagnostics=makeDiagnostics(),motion=createMotionPresentation();let packetSink=null;
 api.presentationCamera=r=>motion.background(r);
 api.beginFrame=r=>{assembleMenuOam(r,actors);motion.capture(r,actors);};
 api.draw=(ctx,r,options={})=>{diagnostics.begin();const draw=(target,scale)=>drawTsubasaSprites(target,r,motion.draw(r,actors),{...options,scale,diagnostics});if(packetSink)packetSink(draw);else draw(ctx,1);};
 api.getDiagnostics=()=>diagnostics.get();api.recordHudPortraits=p=>diagnostics.hud(p);api.recordNonmatchBackground=p=>diagnostics.background(p);api.getActorTrace=()=>{const trace=actors.map(a=>({...a}));trace.ballRenderIntent=actors.ballRenderIntent?{...actors.ballRenderIntent}:null;return trace;};api.setPresentationSink=fn=>{packetSink=fn;};
 return api;
}
/** P-1 (2026-10-22): the game logic advances at 20 Hz but the host paints every native frame (60 Hz), and two of three
 * paints drew the same picture again. paintKey hashes everything one paint reads: game RAM (PAINT_KEY_RAM), the tile / attribute panels, both palettes, the screen
 * projection, the actor-list generation (assembled once per step), the story layer and the original dialogue's
 * typewriter progress. An equal key means the same picture, so the paint is skipped. Presentation only. */
/* RAM ranges in the key: all but the per-native-frame machinery that never reaches the picture: scratch 00-03, 45-46,
 * the NMI flag 4C, the native frame counter 51, the PPU update queue 693-6DB (its result is in the panels) and the sound
 * driver 700-7FF */
const PAINT_KEY_RAM=[[0x04,0x45],[0x47,0x4c],[0x4d,0x51],[0x52,0x693],[0x6dc,0x700]];
function fnv(h,bytes,from=0,to=bytes.length){for(let i=from;i<to;i++){h^=bytes[i];h=Math.imul(h,16777619);}return h;}
function fnvText(h,text){for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h;}
export function tsubasaPaintKey(app,generation){const r=app.r,l=app.layout;let h=2166136261;
 for(const [from,to] of PAINT_KEY_RAM)h=fnv(h,r,from,to);
 if(r[0x58]===0&&!(r[0x5c]&128))h=fnv(h,r,0x51,0x52);
 for(const p of l.panels??[])h=fnv(h,p);if(l.palette)h=fnv(h,l.palette);if(app.palette)h=fnv(h,app.palette);if(l.chrPages)h=fnv(h,l.chrPages);
 const d=dialogueSnapshot(r).presentation;
 h=fnvText(h,`${l.descriptor}|${l.kind}|${l.mirroring}|${l.cameraAtLoad}|${l.screenProjection?JSON.stringify(l.screenProjection):''}|${app.presentationElided?1:0}|${generation}|${app.storyLayer?.renderKey??''}|${d?`${d.id}:${d.page}:${d.line}:${d.visible}:${d.counts}`:''}`);
 return h>>>0;}
/** Render the original field/UI once at 256x240, nearest-scale its background,
 * then paint HD actors at 512x480. No CSS/layout change and no game-clock change. */
export function installTsubasaPresentation(app,{canvas=app.canvas,createCanvas}={}){
 if(!canvas||!app.graphics?.setPresentationSink)throw TypeError('A canvas and Tsubasa graphics are required');
 const logical=createCanvas?.(256,240)??canvas.ownerDocument?.createElement('canvas')??(typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(256,240):null);
 if(!logical)throw Error('Provide createCanvas for a non-browser renderer');logical.width=256;logical.height=240;canvas.width=512;canvas.height=480;
 const clock=()=>globalThis.performance?.now?.()??Date.now(),metrics={nativeFrames:0,logicalSteps:0,paintCalls:0,skippedPaints:0,renderFps:0,sampleAt:clock(),samplePaints:0};
 const samples={paint:[],background:[],sprite:[],head:[],wait:[],raf:[]},sample=(kind,value)=>{const values=samples[kind];values.push(value);if(values.length>60)values.shift();},mean=kind=>{const values=samples[kind];return values.length?Math.round(values.reduce((n,v)=>n+v,0)/values.length*10)/10:0;};
 const times={native:[],drawn:[]},tick=kind=>{const t=times[kind];t.push(clock());if(t.length>240)t.shift();},perSecond=kind=>{const now=clock();return times[kind].filter(t=>now-t<=1000).length;};
 const frameWait=app.framePromise;app.framePromise=async()=>{const start=clock(),result=await frameWait();sample('wait',clock()-start);return result;};app.framePromise.reset=(...args)=>frameWait.reset?.(...args);
 let lastRaf=null,lastDrawRaf=null,rafHandle=null;if(typeof requestAnimationFrame==='function'){const observer=timestamp=>{if(lastRaf!==null)sample('raf',timestamp-lastRaf);lastRaf=timestamp;rafHandle=requestAnimationFrame(observer);};rafHandle=requestAnimationFrame(observer);}
 const nativeFrame=app.nextNativeFrame.bind(app),step=app.step.bind(app);
 app.nextNativeFrame=async(...args)=>{const result=await nativeFrame(...args);if(result!==false){metrics.nativeFrames++;tick('native');}return result;};
 app.step=async(...args)=>{const result=await step(...args);if(result!==false)metrics.logicalSteps++;return result;};
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;app.ctx=logical.getContext('2d',{willReadFrequently:true});app.ctx.imageSmoothingEnabled=false;app.ctx.shadowColor='rgba(0, 0, 0, 0)';let packet=null;
 app.graphics.setPresentationSink(fn=>{packet=fn;});const paint=app.paint.bind(app);
 setTsubasaSpriteLayerFactory(createCanvas?(w,h)=>createCanvas(w,h):canvas.ownerDocument?(w,h)=>{const c=canvas.ownerDocument.createElement('canvas');c.width=w;c.height=h;return c;}:typeof OffscreenCanvas!=='undefined'?(w,h)=>new OffscreenCanvas(w,h):null);
 let generation=0,lastKey=null;const beginFrame=app.graphics.beginFrame?.bind(app.graphics);if(beginFrame)app.graphics.beginFrame=(...args)=>{generation++;return beginFrame(...args);};
 /* D-59: original screen changes cut to an all-black frame for ~0.3-0.5s (first load, intro->title, menus). Presentation only: keep the last real picture up for a short black run; RAM, timing and logic untouched. A long black (ending, deliberate black screens) still shows black after HOLD frames. */let flushAtStart=null;/* the 256x240 background buffer this paint put on the logical canvas, if any */const thisPaintBackground=()=>{const f=lastPixelBatchFlush(app.ctx);return f&&f.count!==flushAtStart&&f.image.width===256&&f.image.height===240&&!f.offsetX&&!f.offsetY?f:null;};const allBlack=()=>{try{/* P-4: the background buffer of this paint already shows a lit sample: not black, no read-back */const f=thisPaintBackground();if(f){const b=f.image.data;for(let i=0;i<b.length;i+=4*37)if(b[i]>16||b[i+1]>16||b[i+2]>16)return false;}
 const d=app.ctx.getImageData(0,0,256,240).data;for(let i=0;i<d.length;i+=4*37)if(d[i]>16||d[i+1]>16||d[i+2]>16)return false;/* sprites/HUD live on the 2x canvas: confirm there too (30 thin strips) */for(let y=4;y<480;y+=16){const e=ctx.getImageData(0,y,512,1).data;for(let i=0;i<e.length;i+=4)if(e[i]>16||e[i+1]>16||e[i+2]>16)return false;}return true;}catch{return false;}};const HOLD=40;let held=null,blackRun=0,shown=false;if(canvas.style)canvas.style.visibility='hidden';const holdThroughBlack=()=>{const black=app.presentationElided||isUniformBlackPresentation(app.r,app.palette??app.layout?.palette)||(held||canvas.style?allBlack():false);/* D-62: a host with no held picture and no style (headless) gets nothing from the pixel scan, so skip it (napi getImageData leaks native memory per call) */if(black){blackRun++;if(held&&blackRun<=HOLD){ctx.drawImage(held,0,0);}else if(!held&&canvas.style)canvas.style.visibility='hidden';return;}blackRun=0;if(!shown&&canvas.style){canvas.style.visibility='';shown=true;}if(typeof document!=='undefined'&&document.createElement){if(!held){held=document.createElement('canvas');held.width=512;held.height=480;}const h=held.getContext('2d');h.clearRect(0,0,512,480);h.drawImage(canvas,0,0);}};app.paint=()=>{const start=clock();metrics.paintCalls++;/* P-1: same picture as the last paint (and not holding through black): keep it */const key=tsubasaPaintKey(app,generation);if(key===lastKey&&blackRun===0&&!isTsubasaHudHolding(app.r)&&!isHudNameHolding(app.r)){metrics.skippedPaints++;return;}lastKey=key;if(lastRaf===null||lastDrawRaf!==lastRaf){tick('drawn');lastDrawRaf=lastRaf;}const headStart=getTsubasaHeadComposeStats().ms;const now=start;if(now-metrics.sampleAt>=1000){metrics.renderFps=Math.round((metrics.paintCalls-metrics.samplePaints)*10000/(now-metrics.sampleAt))/10;metrics.sampleAt=now;metrics.samplePaints=metrics.paintCalls;}packet=null;flushAtStart=lastPixelBatchFlush(app.ctx)?.count??null;paint();sample('background',clock()-start);const foregroundStart=clock();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,512,480);ctx.drawImage(logical,0,0,512,480);if(packet){app.graphics.recordNonmatchBackground?.(nonmatchBackground?.(ctx,{r:app.r,layout:app.layout,scale:2})??null);app.graphics.recordHudPortraits?.(drawTsubasaHud(ctx,app.r,app.layout,{scale:2,palette:app.palette??app.layout?.palette,background:thisPaintBackground()}));}packet?.(ctx,2);drawTsubasaBootLogo(ctx,app);app.storyLayer?.draw(ctx,app,2);holdThroughBlack();sample('sprite',clock()-foregroundStart);sample('head',getTsubasaHeadComposeStats().ms-headStart);sample('paint',clock()-start);};
 app.presentation={canvas,context:ctx,logicalCanvas:logical,resolution:2,metrics,getMetrics:()=>({nativeFrames:metrics.nativeFrames,logicalSteps:metrics.logicalSteps,paintCalls:metrics.paintCalls,skippedPaints:metrics.skippedPaints,renderFps:perSecond('drawn'),paintMs:mean('paint'),backgroundMs:mean('background'),spriteMs:mean('sprite'),nativeWaitMs:mean('wait'),headMs:mean('head'),paintMaxMs:samples.paint.length?Math.round(Math.max(...samples.paint)*10)/10:0,nativeFps:perSecond('native'),gameSpeed:Math.round(perSecond('native')/ORIGINAL_NTSC_FRAME_HZ*100),drawnFps:perSecond('drawn'),rafIntervalMs:mean('raf'),rafHz:mean('raf')?Math.round(10000/mean('raf'))/10:0}),disposeDiagnostics:()=>{if(rafHandle!==null)cancelAnimationFrame(rafHandle);}};return app.presentation;
}
/** Same authored pixels and material recoloring as a live match, for team
 * catalogues. x/y are the logical foot anchor; scale is display pixels per
 * logical pixel. Callers clear their own background. */
export function resolveArtworkIdentity({characterId}={}){const character=verifiedCharacter(characterId)??byId.get(fallbackArtId(characterId));return {characterId,artCharacterId:character?.id??null,genericAppearance:!verifiedCharacter(characterId),referenceMappingPending:isUnverifiedArtwork(byId.get(characterId)),identityStatus:getCharacterIdentity(characterId)?.identityStatus??null};}
const rosterRasterCache=new WeakMap();
function rosterRaster(ctx,art,cols){let canvas=rosterRasterCache.get(cols);if(canvas)return canvas;
 canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(art.width,art.height):ctx.canvas?.ownerDocument?.createElement('canvas');if(!canvas)return null;
 canvas.width=art.width;canvas.height=art.height;const g=canvas.getContext('2d'),image=g.createImageData(art.width,art.height),pixels=new Uint32Array(image.data.buffer);
 for(let i=0;i<cols.length;i+=3)pixels[cols[i+1]*art.width+cols[i]]=cols[i+2];g.putImageData(image,0,0);rosterRasterCache.set(cols,canvas);return canvas;}
export function drawRosterPreview(ctx,{characterId,frame=0,kit,x=40,y=72,scale=2,flip=false}={}){
 const character=verifiedCharacter(characterId)??byId.get(fallbackArtId(characterId));if(!character)throw RangeError(`Unregistered character art: ${characterId}`);
 if(kit&&!('longSleeves' in kit)&&(getCharacterIdentity(characterId)?.canonicalRole==='GK'||/long_sleeve|sleeves/.test(kit.pattern??'')))kit={...kit,longSleeves:true};
 const skin=character.skin,art=getTsubasaLayeredArt(skin,frame)??skin.frames[frame&127];if(!art)throw RangeError(`Missing authored pose: ${characterId}/${frame&127}`);
 const mirrored=!!(frame&128)!==!!flip,raster=ctx.drawImage&&rosterRaster(ctx,art,artColors(art,skin,kit,frame&127,64));
 // Raster once at 1:1, then nearest-scale: fractional fillRect sizes left translucent seams between pixels.
 if(raster){ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);if(mirrored)ctx.scale(-1,1);ctx.drawImage(raster,art.originX*scale,art.originY*scale,art.width*scale/2,art.height*scale/2);ctx.restore();}
 else for(let yy=0;yy<art.height;yy++)for(let xx=0;xx<art.width;xx++){const value=parseInt(art.pixels[yy][xx],16);if(!value)continue;const dx=art.originX+xx/2,dy=art.originY+yy/2;ctx.fillStyle=artColor(art,skin,kit,frame&127,xx,yy,value,64);ctx.fillRect(x+(mirrored?-dx-.5:dx)*scale,y+dy*scale,scale/2,scale/2);}
 return {...resolveArtworkIdentity({characterId}),frame:frame&127,status:art.status??'approved-preview',bounds:{x:x+art.originX*scale,y:y+art.originY*scale,width:art.width*scale/2,height:art.height*scale/2}};
}

/** D-31 keeper misread placement: bottom-centre on the native keeper actor; mirrored with his facing. */
export function placeTsubasaDriveKeeperMisread(actor,art=DRIVE_KEEPER_MISREAD_ART){return {art,entity:actor.entity,left:Math.round(actor.x-art.width/2),top:actor.y-art.height+1,mirrored:!!(actor.frame&128)};}
export function forEachDriveKeeperMisreadPixel(pl,fn){const {art,left,top,mirrored}=pl;for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++){const c=art.rows[y][mirrored?art.width-1-x:x];if(c!=='.')fn(left+x,top+y,c);}}

const razorF15Key=(cid,generic)=>generic||!cid||/^generic/.test(cid)||!KEEPER_F15_HD_V11[cid]?'generic-keeper':cid;
function razorF15Art(key){return KEEPER_F15_HD_V11[key];}// project keeper-v1.1, all eight approved
let razorF15Drawn=[];export function getLastTsubasaRazorKeeperF15(){return razorF15Drawn;}
let lastShotImpacts=[];export function getLastTsubasaShotImpacts(){return lastShotImpacts;}
// M-8 D-39 triangle (美术演绎、未核): K outline, skin = the HD skin's skin tone; post shake moves the post bar's own columns.
const TRIANGLE_OUTLINE='#101b27';
function triangleSkin(skin){return skin?.palette?.[TRIANGLE_SKIN_INDEX]??'#ecb4b0';}
const TRIANGLE_SKIN_INDEX=3;
let morisakiSaveDrawn=null;export function getLastTsubasaMorisakiSaveDrawn(){return morisakiSaveDrawn;}
let triangleDrawn=[],triangleShake=null;export function getLastTsubasaTriangleDrawn(){return triangleDrawn;}export function getLastTsubasaTriangleShake(){return triangleShake;}
/** Shift the kicked post's bar (both 1 px outlines and its fill, plus one column each side) by dx native px for the rows
 * from the post foot up to the crossbar (0x2F) + 16 px. ox/oy: screen = world + o (displayed camera $EC/$EE, as the BG). */
function shakeTrianglePost(output,sh,ox,oy){const x0=Math.min(sh.edges.field,sh.edges.inner)-1+ox,x1=Math.max(sh.edges.field,sh.edges.inner)+1+ox,yb=sh.post.y+oy+2,yt=yb-0x2f-18,d=output.data,row=new Uint8ClampedArray((x1-x0+1)*8);
 for(let y=Math.max(0,yt);y<=Math.min(239,yb);y++)for(const sy of [y*2,y*2+1]){for(let x=x0;x<=x1;x++)for(const k of [0,1]){const p=(sy*512+x*2+k)*4;row.set(d.subarray(p,p+4),((x-x0)*2+k)*4);}
  for(let x=x0;x<=x1;x++){const src=x-sh.dx;if(src<x0||src>x1)continue;for(const k of [0,1]){const p=(sy*512+x*2+k)*4;d.set(row.subarray(((src-x0)*2+k)*4,((src-x0)*2+k)*4+4),p);}}}
 return {dx:sh.dx,post:{x:sh.post.x,y:sh.post.y,which:sh.post.which},screen:{x0,x1,yt,yb},edges:{...sh.edges}};}
let actorFramesDrawn=[],lastRowCuts=[],keeperArtDrawn=[],keeperHdDrawn=[],lastSpecialBallVisibility=null;
/** Special-ball (incl. hawk) pixel accounting of the last paint: drawn / under an actor drawn in front / behind background-priority tiles (net). */
export function getLastTsubasaSpecialBallVisibility(){return lastSpecialBallVisibility;}
/** Keeper D-31/D-32 pose art used by the most recent paint (review evidence, D-33 same-art rule). */
/** Per actor: native requested frame and the HD frame actually drawn (razor kick re-timing). */
export function getLastTsubasaActorFrames(){return actorFramesDrawn;}
export function getLastTsubasaKeeperArt(){return keeperArtDrawn;}
/** Keepers (slots 10/11) drawn through HD art in the last paint: the frame drawn and the skin (hair/palette) used. */
export function getLastTsubasaKeeperHdDrawn(){return keeperHdDrawn;}
/** Rows dropped by the most recent sprite paint: [{entity,record?,y,by:'native-8'|'rotation'}] (review evidence). */
export function getLastTsubasaRowCuts(){return lastRowCuts;}

/** D-33: during ANY special, the ball (incl. special balls) and both keepers are admitted first on every
 * scanline (then the D-14 shadow); ordinary play keeps the native order (only the D-14 shadow rule). */
function specialRowPriority(r,oam,actors){const base=tsubasaShadowPriority(r,oam),st=getTsubasaSpecialState(r);if(!st||st.nativeArtwork)return base;
 const pinned=actors.filter(a=>a.entity===12||(a.kind===0&&(a.entity===10||a.entity===11))).flatMap(a=>a.oamIndices??[]);return [...new Set([...pinned,...base])];}
let misugiHeartDrawn=null,misugiOverlayDrawn=null;export function getLastTsubasaMisugiHeartDrawn(){return misugiHeartDrawn;}export function getLastTsubasaMisugiOverlayDrawn(){return misugiOverlayDrawn;}
const X16=(r,l)=>((r[l]|r[l+19]<<8)<<16)>>16;
/** M-10 h1: remaining limit frames -> M:SS (20 logic frames = 1 displayed second, GROUNDWORK §1; ceil so 0:00 only at expiry). */
export function formatMisugiCountdown(frames){const t=Math.ceil(frames/20);return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;}
/** project v1 build.py hud_clock, reproduced: black box, 1px white border without corners, white 4x7 glyphs at (5,4). Rows of 'W'/'K'. */
export function misugiClockBitmap(text){const F=MISUGI_HEART_ART.h1.glyphs;let x=0;const pts=[];for(const ch of text){const g=F[ch];g.forEach((row,yy)=>[...row].forEach((v,i)=>{if(v==='1')pts.push([x+i,yy]);}));x+=g[0].length+1;}
 const W=x+2+2+8,H=11+6,b=[...Array(H)].map(()=>Array(W).fill('K'));for(let i=1;i<W-1;i++){b[1][i]=b[H-2][i]='W';}for(let j=1;j<H-1;j++){b[j][1]=b[j][W-2]='W';}for(const [i,j] of [[1,1],[W-2,1],[1,H-2],[W-2,H-2]])b[j][i]='K';
 for(const [a,c] of pts)b[c+4][a+5]='W';return b.map(r=>r.join(''));}
let fireShotDrawn=[],namedBodyDrawn=[];export function getLastTsubasaFireShotDrawn(){return fireShotDrawn;}
/** D-43: Schneider/Misugi whole-match 3-colour body frames drawn this paint. */export function getLastTsubasaNamedBodyDrawn(){return namedBodyDrawn;}
