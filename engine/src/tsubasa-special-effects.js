import {RAZOR_BALL_ART,RAZOR_BALL_NES,RAZOR_BALL_ORIGIN} from './tsubasa-razor-ball-art.js';
import {CANNON_BALL_ART,CANNON_BALL_NES,CANNON_BALL_ORIGIN} from './tsubasa-cannon-ball-art.js';
import {TSUBASA_CANVAS_BALL_ART_BY_MOVE,TSUBASA_CANNON_FIREBALL_TICKS} from '../data/tsubasa-special-moves.js';
import {DISPLAY_NES_RGB} from './sprite-appearance.js';
import {DRIVE_HAWK_ART,DRIVE_HAWK_NES,DRIVE_HAWK_FLAP,DRIVE_HAWK_TICKS} from './tsubasa-drive-hawk-art.js';
import {getTsubasaFireBallFrame} from './tsubasa-fire-shot.js';
import {getTsubasaNativeShotFrame,getTsubasaNativePlainBallFrame,NATIVE_SHOT_PALETTE} from './tsubasa-native-shot-art.js';
import {getTsubasaShotCompanion,getTsubasaNativeColourBallFrame,nativeBallFramePixels} from './tsubasa-shot-companions.js';
/** Code-drawn, read-only Captain Tsubasa ball presentation.
 * Every supported shot uses integer native pixels and short logic-tick loops.
 * Generic techniques use exact ordinary ball pixels, without invented signatures.
 *
 * Every trail point is a previously integrated world position from the special
 * move runtime. This module has no clock, random source, physics or RAM writes.
 * The football is drawn once, using the CURRENT world state and camera. The
 * recovered OAM actor supplies ordering/ownership only; its cached screen
 * coordinates can precede the latest integration by a native frame.
 * Colors and line treatments are original pixel-art visualizations of the
 * evidenced move mechanics, not a claim of frame-for-frame anime reproduction.
 */
export const TSUBASA_BALL_EFFECTS=Object.freeze({
 basic:Object.freeze({name:'基础强化球',edge:'#8fa6ac',mid:'#cfdee0',light:'#f8ffff',kind:'basic'}),
 overhead:Object.freeze({name:'倒挂金钩基础射门',edge:'#8fa6ac',mid:'#cfdee0',light:'#f8ffff',kind:'basic'}),
 acrobat:Object.freeze({name:'真实后空翻后的基础射门',edge:'#8fa6ac',mid:'#cfdee0',light:'#f8ffff',kind:'basic'}),
 drive:Object.freeze({name:'上旋下坠',edge:'#2678ce',mid:'#66c7ff',light:'#d3f5ff',kind:'spin'}),
 tiger:Object.freeze({name:'猛虎直射',edge:'#be7733',mid:'#efbe60',light:'#fff4ce',kind:'power'}),
 razor:Object.freeze({name:'剃刀侧旋',edge:'#318d93',mid:'#87ede5',light:'#e6ffef',kind:'cut'}),
 falcon:Object.freeze({name:'隼式快射',edge:'#7296b1',mid:'#bcdfed',light:'#f7ffff',kind:'speed'}),
 skylab:Object.freeze({name:'双人高空头槌',edge:'#6664b9',mid:'#b3b7ff',light:'#f0efff',kind:'pair'}),
 fire:Object.freeze({name:'火焰射门',edge:'#d64a2c',mid:'#ff9b3d',light:'#fff1ac',kind:'fire'}),
 eagle:Object.freeze({name:'低平射门（保守适配）',edge:'#9f9151',mid:'#d8d69b',light:'#f6f5dd',kind:'low'}),
 cannon:Object.freeze({name:'强旋转直射（保守适配）',edge:'#7775b8',mid:'#b5b5ed',light:'#f5efff',kind:'rotation'}),
 slider:Object.freeze({name:'下沉直射（保守适配）',edge:'#448783',mid:'#a8c7c1',light:'#e4f3ed',kind:'slider'}),
 'drive-tiger':Object.freeze({name:'翼与日向配合射门',edge:'#437cb0',mid:'#e8ba60',light:'#f0f7de',kind:'combined'}),
 /* batch D */
 'jito-power':Object.freeze({name:'巨体蓄力重炮',edge:'#b0582a',mid:'#f09a50',light:'#ffe8c8',kind:'power'}),
 header:Object.freeze({name:'砸地头球',edge:'#8fa6ac',mid:'#cfdee0',light:'#f8ffff',kind:'basic'}),
 combination:Object.freeze({name:'真实二次触球配合',edge:'#708eaa',mid:'#aecedb',light:'#f2faff',kind:'pair'}),
 /* 2026-10-21: the roster's signature shots; the look per move is TSUBASA_SHOT_LOOKS (src/tsubasa-shot-impacts.js) */
 signature:Object.freeze({name:'个人招牌射门',edge:'#8fa6ac',mid:'#cfdee0',light:'#f8ffff',kind:'basic'})
});

const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
const roundHalf=n=>Math.round(n*2)/2;
const worldWord=(r,lo,hi)=>r[lo]|r[hi]<<8;
const usableState=state=>state&&TSUBASA_BALL_EFFECTS[state.effect]&&finitePoint(state.position)&&Number.isFinite(state.age);

/** A read-only normal-ball presentation after an adapted special has ended but
 * an inherited charge/timer remains. The caller must establish provenance via
 * shouldReplaceTsubasaBallArtwork; this helper does not activate a special. */
export function getTsubasaPlainBallState(r,{colourBall=true}={}){
 const signed=n=>n&32768?n-65536:n;
 const position=Object.freeze({x:signed(worldWord(r,0x320,0x333))+r[0x30d]/256,y:signed(worldWord(r,0x359,0x36c))+r[0x346]/256,z:signed(worldWord(r,0x392,0x3a5))+r[0x37f]/256});
 /* nativeSpecialId: the native special state while a native special shot is live (drawn as the native colour-changing ball) */
 const nativeSpecialId=colourBall&&(r[0x459+12]&127)===5&&r[0x4f0]>0?r[0x50f]&127:null;
 return Object.freeze({id:0,moveId:'basic-shot',name:null,owner:r[0x4d6],effect:'basic',phase:'residual-native-rule',age:0,clock:r[0x300],nativeSpecialId,position,path:Object.freeze([]),presentationOnly:true});
}

/** Matches updateSpriteVisibility's F0/F2 projected camera, including its
 * vertical-page offset. y is the center of the native 16x16 ball, not its foot
 * anchor. No screen wrapping is used: an offscreen ball stays offscreen. */
export function projectTsubasaSpecialPoint(r,point){
 if(!finitePoint(point))return null;
 const cameraX=worldWord(r,0xf0,0xf1),cameraY=worldWord(r,0xf2,0xf3),pageOffset=r[0xf3]?16:0;
 return {x:point.x-cameraX,y:point.y+pageOffset-cameraY-point.z-8};
}

/** Identify exact source records owned by the live ball. Matching the complete
 * OAM record prevents suppression of weather/overflow records which reused a
 * slot. Ordinary balls and unknown moves are byte-for-byte original draws. */
export function getSpecialBallReplacement(r,actors,state){
 if(!usableState(state))return null;
 const actual=actors.find(a=>a.entity===12&&a.kind===1),intent=actors.ballRenderIntent;
 const actor=actual??(intent?.entity===12&&intent.kind===1&&intent.renderIntent?intent:null);
 if(!actor)return null;
 const oam=r.subarray(0x200,0x300),indices=(actor.oamIndices??[]).filter((index,j)=>actor.sourceRecords[j]?.every((v,k)=>v===oam[index*4+k]));
 if(!indices.length){
  if(intent?.entity===12&&intent.kind===1&&intent.renderIntent&&
     (intent.reason==='oam-exhausted'||intent.reason==='oam-overwritten'&&actual?.oamIndices?.every(index=>intent.overwrittenOamIndices?.includes(index))))return {actor:intent,state,indices:[],at:intent.insertionAt??0};
  return null;
 }
 return {actor,state,indices,at:Math.min(...indices)};
}

/** Short observed path, transformed using the CURRENT camera. This avoids
 * dragging a screen-space trail when the camera scrolls. Each vertex comes
 * from state.path or the current state.position; no Bezier control point or
 * extra moving ball is synthesized. */
export function getTsubasaSpecialTrail(r,state,{maxPoints=14,maxAge=16}={}){
 if(!usableState(state))return [];
 const age=state.age,limit=Math.max(1,Math.min(24,maxPoints)),source=(state.path??[]).filter(p=>finitePoint(p)&&Number.isFinite(p.age)&&p.age<=age&&p.age>=age-maxAge).slice(-limit);
 const last=source.at(-1),p=state.position;
 if(!last||Math.hypot(last.x-p.x,last.y-p.y,last.z-p.z)>.01)source.push({...p,age});
 let start=0;for(let i=1;i<source.length;i++)if(source[i].age-source[i-1].age>4||Math.hypot(source[i].x-source[i-1].x,source[i].y-source[i-1].y,source[i].z-source[i-1].z)>96)start=i;
 return source.slice(start).slice(-limit).map(p=>({...projectTsubasaSpecialPoint(r,p),age:p.age,world:{x:p.x,y:p.y,z:p.z}}));
}

function rasterLine(put,a,b,color,width=.5,dither=0){
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),steps=Math.min(512,Math.max(1,Math.ceil(length*2))),radius=Math.max(.25,width/2);
 for(let i=0;i<=steps;i++){
  if(dither&&i%dither===0)continue;
  const x=a.x+dx*i/steps,y=a.y+dy*i/steps;
  for(let oy=-radius;oy<=radius;oy+=.5)for(let ox=-radius;ox<=radius;ox+=.5)if(ox*ox+oy*oy<=radius*radius+.08)put(x+ox,y+oy,color);
 }
}

function arc(put,center,rx,ry,rotation,start,end,color){
 const c=Math.cos(rotation),s=Math.sin(rotation),n=32;let previous=null;
 for(let i=0;i<=n;i++){
  const a=start+(end-start)*i/n,dx=Math.cos(a)*rx,dy=Math.sin(a)*ry,p={x:center.x+dx*c-dy*s,y:center.y+dx*s+dy*c};
  if(previous)rasterLine(put,previous,p,color,.55);previous=p;
 }
}

/** Defensive accents are deliberately small and descriptive. They do not
 * replace any limb/head pixels or manufacture a save, dive or contact. Only
 * techniques actually activated by the defensive runtime are accepted. */
export const TSUBASA_DEFENSIVE_EFFECTS=Object.freeze({
 'karate-save':Object.freeze({color:'#e8d8a0',light:'#fff9df',kind:'karate'}),
 'triangle-jump':Object.freeze({color:'#a9d0d9',light:'#f1ffff',kind:'post-jump'}),
 'sggk-guard':Object.freeze({color:'#80bfd8',light:'#e2fbff',kind:'guard'}),
 'power-catch':Object.freeze({color:'#d3bf7d',light:'#fff5c3',kind:'catch'}),
 'perfect-save':Object.freeze({color:'#92bcd1',light:'#f1fbff',kind:'precision'}),
 'face-block':Object.freeze({color:'#f0bb95',light:'#fff1d9',kind:'face'}),
 'marking-slide':Object.freeze({color:'#87c8bb',light:'#dcffec',kind:'slide'}),
 'power-block':Object.freeze({color:'#b2b8d4',light:'#f1f1ff',kind:'body'}),
 'aerial-tackle':Object.freeze({color:'#ada6d0',light:'#f4edff',kind:'air-slide'}),
 /* 2026-10-21 roster defenders and keepers (docs/SHOT_LOOK_CARDS.md section 6) */
 'takasugi-body-block':Object.freeze({color:'#c8a070',light:'#fff0d0',kind:'body'}),
 'urabe-hot-block':Object.freeze({color:'#f07050',light:'#ffe4d8',kind:'body'}),
 'kishida-shark-tackle':Object.freeze({color:'#5a8ad8',light:'#dceaff',kind:'slide'}),
 'nakayama-strong-tackle':Object.freeze({color:'#a8b0b8',light:'#f4f6f8',kind:'slide'}),
 'galvan-rush-tackle':Object.freeze({color:'#c07848',light:'#ffe8d4',kind:'slide'}),
 'kato-headband-save':Object.freeze({color:'#e8e8e8',light:'#ffffff',kind:'catch'}),
 'amoros-power-punch':Object.freeze({color:'#e0c060',light:'#fff6cc',kind:'precision'})
});

/** No event is inferred from ball proximity. Events must have been emitted by
 * a real contact resolver. The runtime clock, rather than render count, ages
 * the finite contact indication. */
export function getTsubasaDefensiveVisuals(actors,state){
 if(!state)return [];
 const out=[];
 const add=(source,phase,remaining)=>{
  if(!TSUBASA_DEFENSIVE_EFFECTS[source.moveId]||!Number.isFinite(remaining)||remaining<=0)return;
  const actor=actors.find(a=>a.entity===source.slot&&a.kind===0&&a.identity?.characterId===source.characterId);
  if(!actor)return;
  out.push({source,actor,phase,remaining,moveId:source.moveId,characterId:source.characterId,slot:source.slot,id:source.id});
 };
 for(const a of state.active??[]){
  if(a.moveId==='triangle-jump'){
   if(a.phase==='post-jump'&&finitePoint(a.postContact)&&a.velocityAfter)add(a,'post-jump',a.remaining);
  }else add(a,'ready',a.remaining);
 }
 for(const event of state.events??[])if(event.type==='tsubasa-special-contact'&&event.category==='defense'&&['caught','blocked','parried','tackled','failed'].includes(event.outcome)){
  const remaining=Number.isFinite(event.age)?10-event.age:Number.isFinite(state.clock)&&Number.isFinite(event.clock)?10-(state.clock-event.clock):Math.min(10,event.remaining??0);
  // No contact coordinates means no invented hit at the current ball position.
  if(finitePoint(event.contactPosition??event.ballPosition))add(event,event.outcome,remaining);
 }
 return out;
}

export function drawTsubasaDefensiveEffect(ctx,{r,visual,scale=2,plot,brightness=r?.[0x5b4]??64,leftClip=0}={}){
 const style=TSUBASA_DEFENSIVE_EFFECTS[visual?.moveId];if(!r||!style||visual.remaining<=0)return null;
 const actor=visual.actor;if(!actor||actor.kind!==0)return null;
 const pixels=new Map(),cache=new Map(),clipBottom=Math.min(240,(actor.clipY??177)+8),fade=Math.max(0,Math.min(1,brightness/64));
 const put=(x,y,color)=>{
  x=roundHalf(x);y=roundHalf(y);if(x<leftClip||x<0||x>=256||y<0||y>=clipBottom)return;
  const key=y*1024+x*2;if(pixels.has(key))return;
  if(fade<1){if(!cache.has(color))cache.set(color,'#'+[1,3,5].map(n=>Math.round(parseInt(color.slice(n,n+2),16)*fade).toString(16).padStart(2,'0')).join(''));color=cache.get(color);}
  pixels.set(key,{x,y,color});
 };
 const window=visual.phase==='ready'||visual.phase==='post-jump';
 const nativeContact=!window&&visual.source.contactAnchor!=='target-feet';
 const contactFrame=Math.max(0,10-Math.ceil(visual.remaining))%2;
 const nativePut=(x,y,color)=>{x=Math.round(x);y=Math.round(y);for(const oy of [0,.5])for(const ox of [0,.5])put(x+ox,y+oy,color);};
 let center={x:actor.x,y:actor.y-18},postContactScreen=null;
 if(!window){
  const world=visual.source.contactPosition??visual.source.ballPosition;if(!finitePoint(world))return null;
  center=projectTsubasaSpecialPoint(r,world);
  if(visual.source.contactAnchor==='target-feet')center.y+=8;
  if(nativeContact){
   // Two finite integer-grid contact frames around the actual collision anchor.
   // No ball, extra trajectory or player pose is generated here.
   const radius=7+contactFrame,color=visual.phase==='failed'?NATIVE_SHOT_PALETTE.O:NATIVE_SHOT_PALETTE.W;
   if(visual.phase==='caught'){
    for(const sx of [-1,1])for(const sy of [-1,1])for(let n=0;n<3;n++){
     nativePut(center.x+sx*(radius-n),center.y+sy*radius,color);
     nativePut(center.x+sx*radius,center.y+sy*(radius-n),color);
    }
   }else{
    const directions=visual.phase==='failed'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for(const [dx,dy]of directions)for(let n=0;n<3;n++)nativePut(center.x+dx*(radius+n),center.y+dy*(radius+n),n===2?NATIVE_SHOT_PALETTE.O:color);
   }
  }else{
  const progress=1-Math.min(10,visual.remaining)/10,radius=6+progress*4;
  const color=visual.phase==='failed'?'#eeac9e':style.light;
  if(visual.phase==='caught'){
   for(const sx of[-1,1])for(const sy of[-1,1]){
    const x=center.x+sx*radius,y=center.y+sy*radius;
    rasterLine(put,{x,y},{x:x-sx*2.5,y},color,.55);rasterLine(put,{x,y},{x,y:y-sy*2.5},color,.55);
   }
  }else for(let i=0;i<6;i++){
   if(visual.phase==='failed'&&i%2)continue;
   const angle=i*Math.PI/3+progress*.3,dx=Math.cos(angle),dy=Math.sin(angle),inner=radius,outer=radius+(visual.phase==='failed'?2:4);
   rasterLine(put,{x:center.x+dx*inner,y:center.y+dy*inner},{x:center.x+dx*outer,y:center.y+dy*outer},color,.55,visual.phase==='failed'?2:0);
  }
  }
 }else{
  const facing=actor.frame&128?-1:1;
  if(style.kind==='post-jump'){
   const post=visual.source.postContact;if(!finitePoint(post)||!visual.source.velocityAfter)return null;
   postContactScreen=projectTsubasaSpecialPoint(r,post);postContactScreen.y+=8;
   center=projectTsubasaSpecialPoint(r,visual.source.position);center.y+=8;
   const v=visual.source.velocityAfter,dx=v.x??0,dy=(v.y??0)-(v.z??0),length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
   for(const side of[-1,1])rasterLine(put,{x:center.x-ux*4-uy*side*4,y:center.y-uy*4+ux*side*4},{x:center.x-ux*9-uy*side*4,y:center.y-uy*9+ux*side*4},style.color,.55);
   if(visual.remaining>10)for(let i=0;i<4;i++){
    const angle=i*Math.PI/2+.4;
    rasterLine(put,{x:postContactScreen.x+Math.cos(angle)*4,y:postContactScreen.y+Math.sin(angle)*4},{x:postContactScreen.x+Math.cos(angle)*6,y:postContactScreen.y+Math.sin(angle)*6},style.light,.55);
   }
  }else if(style.kind==='face'){
   const h=actor.art?.headRegion??{x:-8,y:-31,width:16,height:14},offset=h.x+h.width/2;
   center={x:actor.x+(facing===-1?-offset-.5:offset),y:actor.y+h.y+h.height/2};
   arc(put,center,10,8,0,.3,1.1,style.light);arc(put,center,10,8,0,2.1,2.8,style.color);arc(put,center,10,8,0,3.6,4.3,style.light);arc(put,center,10,8,0,5.3,6,style.color);
  }else if(style.kind==='slide'){
   center={x:actor.x,y:actor.y+2};
   for(let n=0;n<3;n++)rasterLine(put,{x:center.x-facing*(7+n*2),y:center.y+n*1.5},{x:center.x-facing*(14+n*2),y:center.y+n*1.5},n===0?style.light:style.color,.55);
  }else if(style.kind==='air-slide'){
   center={x:actor.x,y:actor.y-5};
   for(let n=0;n<3;n++)rasterLine(put,{x:center.x-facing*(15+n*2),y:center.y+n*2},{x:center.x-facing*(21+n*2),y:center.y+n*2+3},n===1?style.light:style.color,.55);
  }else if(style.kind==='precision'){
   for(const side of[-1,1]){
    rasterLine(put,{x:center.x+side*12,y:center.y-8},{x:center.x+side*12,y:center.y+3},style.color,.55);
    rasterLine(put,{x:center.x+side*12,y:center.y-8},{x:center.x+side*8,y:center.y-11},style.light,.55);
   }
  }else if(style.kind==='karate'){
   for(let n=0;n<3;n++)rasterLine(put,{x:center.x+facing*(10+n*2),y:center.y-6+n*3},{x:center.x+facing*(14+n*2),y:center.y-10+n*3},n===1?style.light:style.color,.55);
  }else if(style.kind==='guard'){
   arc(put,center,11.5,12,0,-.6,.6,style.light);arc(put,center,11.5,12,0,Math.PI-.6,Math.PI+.6,style.color);
  }else{
   const width=style.kind==='body'?13:11;
   for(const side of[-1,1]){
    rasterLine(put,{x:center.x+side*width,y:center.y-7},{x:center.x+side*width,y:center.y+6},style.color,.55);
    rasterLine(put,{x:center.x+side*width,y:center.y-7},{x:center.x+side*(width-3),y:center.y-7},style.light,.55);
    rasterLine(put,{x:center.x+side*width,y:center.y+6},{x:center.x+side*(width-3),y:center.y+6},style.light,.55);
   }
  }
 }
 for(const p of pixels.values())if(plot)plot(p.x,p.y,p.color);else{ctx.fillStyle=p.color;ctx.fillRect(p.x*scale,p.y*scale,scale/2,scale/2);}
 return {id:visual.id,moveId:visual.moveId,slot:visual.slot,characterId:visual.characterId,name:visual.source.name,phase:visual.phase,remaining:visual.remaining,screen:center,world:window?{...visual.source.position}:{...(visual.source.contactPosition??visual.source.ballPosition)},postContactScreen,contactAnchor:visual.source.contactAnchor??(window?'actor':'ball-center'),pixelCount:pixels.size,nativeArtwork:nativeContact?{grid:1,cycleTicks:2,frameIndex:contactFrame,palette:NATIVE_SHOT_PALETTE}:null,source:window?'activated-defensive-window':'resolved-native-contact',readOnly:true};
}

/** A completed three-leg passing chain gets a brief paired-player marker.
 * It is never a ball effect: ordinary pass positions and artwork are untouched.
 * No success mark is shown on the first/second pass or an unreceived third. */
export function getTsubasaPartnerVisuals(actors,state){
 if(state?.moveId!=='eiffel-attack'||state.phase!=='complete'||state.completedLegs!==3||!Number.isFinite(state.completedAge)||state.completedAge<0||state.completedAge>=10)return [];
 if(!Array.isArray(state.partners)||state.partners.length!==2)return [];
 if(!state.partners.some(p=>p.characterId==='pierre')||!state.partners.some(p=>p.characterId==='napoleon'))return [];
 return state.partners.flatMap(p=>{const actor=actors.find(a=>a.entity===p.slot&&a.kind===0&&a.identity?.characterId===p.characterId);return actor?[{actor,state,slot:p.slot,characterId:p.characterId}]:[];});
}

export function drawTsubasaPartnerEffect(ctx,{r,visual,scale=2,plot,brightness=r?.[0x5b4]??64,leftClip=0}={}){
 if(!r||!visual?.actor||visual.state?.moveId!=='eiffel-attack'||visual.state.phase!=='complete'||visual.state.completedLegs!==3||!Number.isFinite(visual.state.completedAge)||visual.state.completedAge<0||visual.state.completedAge>=10)return null;
 const {actor,state}=visual,center={x:actor.x,y:actor.y+4},pixels=new Map(),fade=Math.max(0,Math.min(1,brightness/64))*(1-state.completedAge*.035),cache=new Map();
 const put=(x,y,color)=>{x=roundHalf(x);y=roundHalf(y);if(x<leftClip||x<0||x>=256||y<0||y>=Math.min(240,(actor.clipY??177)+8))return;const key=y*1024+x*2;if(pixels.has(key))return;if(!cache.has(color))cache.set(color,'#'+[1,3,5].map(n=>Math.round(parseInt(color.slice(n,n+2),16)*fade).toString(16).padStart(2,'0')).join(''));pixels.set(key,{x,y,color:cache.get(color)});};
 for(const side of[-1,1]){
  const x=center.x+side*3,points=[{x,y:center.y-2},{x:x+2,y:center.y},{x,y:center.y+2},{x:x-2,y:center.y},{x,y:center.y-2}];
  for(let i=1;i<points.length;i++)rasterLine(put,points[i-1],points[i],side===1?'#eaf9ff':'#9bc9dc',.55);
 }
 rasterLine(put,{x:center.x-1,y:center.y},{x:center.x+1,y:center.y},'#eaf9ff',.55);
 for(const p of pixels.values())if(plot)plot(p.x,p.y,p.color);else{ctx.fillStyle=p.color;ctx.fillRect(p.x*scale,p.y*scale,scale/2,scale/2);}
 return {moveId:state.moveId,name:'埃菲尔配合（三段完成）',phase:state.phase,completedLegs:3,age:state.completedAge,slot:visual.slot,characterId:visual.characterId,screen:center,pixelCount:pixels.size,source:'resolved-native-pass-chain',readOnly:true};
}

/** Draw through the same compositor as the players, or
 * directly onto a real Canvas for a local gallery/QA. Native artwork expands
 * each whole cell into four matching half-cell compositor writes, preserving
 * one-native-pixel geometry. plot(x,y,color) must be
 * first-hit-wins if it participates in an existing OAM compositor.
 *
 * actor is optional only for a standalone preview. In matches it is the exact
 * entity-12 actor produced by assembleMenuOam; only its clipping/order metadata
 * is used. Mixing its cached x/y with current path samples creates a false ball
 * position, especially on fast shots or after a camera update.
 */
export function drawTsubasaSpecialBall(ctx,{state,r,actor,scale=2,plot,brightness=r?.[0x5b4]??64,clipBottom=actor?Math.min(240,actor.clipY+8):184,leftClip=0,plotTrail=null}={}){
 if(!r||!usableState(state))return null;let ghosts=null,companionPixels=0;
 const projected=projectTsubasaSpecialPoint(r,state.position),center=projected;
 const points=getTsubasaSpecialTrail(r,state);
 const pixels=new Map(),fadeCache=new Map(),fade=Math.max(0,Math.min(1,brightness/64));
 const put=(x,y,color)=>{
  x=roundHalf(x);y=roundHalf(y);if(x<leftClip||x<0||x>=256||y<0||y>=clipBottom)return;
  if(state.position.z<0&&y>=center.y+state.position.z+3)return;
  const key=y*1024+x*2;if(pixels.has(key))return;
  if(fade<1){if(!fadeCache.has(color))fadeCache.set(color,'#'+[1,3,5].map(n=>Math.round(parseInt(color.slice(n,n+2),16)*fade).toString(16).padStart(2,'0')).join(''));color=fadeCache.get(color);}
  pixels.set(key,{x,y,color});
 };
 const nativeFrame=getTsubasaRazorBallFrame(state,r)??getTsubasaCannonBallFrame(state,r)??getTsubasaFireBallFrame(state)/* M-11 D-42: Schneider's fire-shot only */??getTsubasaDriveDiveFrame(state,r)??(state.presentationOnly?(state.nativeSpecialId?getTsubasaNativeColourBallFrame(r[0x300],r[0x80])/* a live native special without an own move: the native colour-changing ball */:getTsubasaNativePlainBallFrame((r[0x80]&127)<=3?r[0x80]:r[0x300])):getTsubasaNativeShotFrame(state));
 let hawkX=null;
 if(nativeFrame){
  // Four compositor samples are one solid native pixel, never four art cells.
  // Keep the public screen/world position exact; only raster placement snaps.
  // M-6 fix: the native OAM (ball record, players, keepers) is built from the previous frame's ball x / camera, so once the
  // camera stops scrolling (right edge 704) the live projection runs one frame (8 px) ahead of every native sprite. The
  // drive hawk takes x from the ball record it replaces (same frame as the rest of the OAM); y stays the projected special
  // height (trajectory unchanged). Other special balls keep the projected anchor.
  hawkX=(nativeFrame.animation==='drive-hawk'||nativeFrame.animation==='drive-dive')&&actor?.entity===12&&actor.kind===1&&Number.isFinite(actor.x)?actor.x:null;
  const anchor={x:hawkX??Math.round(center.x),y:Math.round(center.y)};
  for(const p of nativeFrame.pixels)for(const oy of [0,.5])for(const ox of [0,.5])put(anchor.x+p.x+ox,anchor.y+p.y+oy,p.color);
  /* D-62: drive dive = original-style afterimages: the same native ball frame repeated at earlier path points (no new art) */
  if(nativeFrame.trail){/* D-62 (project): ghosts sit ALONG the fall path (back along the current velocity, i.e. behind/above the
   falling ball), each further one dimmer and SMALLER (same native frame pixels pulled toward the centre, outer ring dropped; 2nd/3rd also checkerboard-thinned of the same native frame, no new art), and
   behind every sprite (plotted last via plotTrail). At a glance: one ball falling with a fading streak. */
   const main=new Map(pixels);pixels.clear();const dx=anchor.x-Math.round(center.x),v=state.velocity??{x:0,y:0,z:0};
   const dimHex=(c,f)=>'#'+[1,3,5].map(n=>Math.round(parseInt(c.slice(n,n+2),16)*f).toString(16).padStart(2,'0')).join('');
   const xs=nativeFrame.pixels.map(p=>p.x),ys=nativeFrame.pixels.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,R=Math.max(...nativeFrame.pixels.map(p=>Math.hypot(p.x-cx,p.y-cy)));
   nativeFrame.trail.forEach((back,i)=>{const q=projectTsubasaSpecialPoint(r,{x:state.position.x-v.x*back,y:state.position.y-v.y*back,z:state.position.z-v.z*back}),f=[0.5,0.34,0.22][i]??0.22,shrink=[0.75,0.55,0.4][i]??0.4,src=nativeFrame.trailFrames?.[i]??nativeFrame.pixels,/* a spin frame is cut and shrunk around its OWN centre, so it keeps its slant at the old ghost size */
     sx=src.map(p=>p.x),sy=src.map(p=>p.y),gx=src===nativeFrame.pixels?cx:(Math.min(...sx)+Math.max(...sx))/2,gy=src===nativeFrame.pixels?cy:(Math.min(...sy)+Math.max(...sy))/2,gR=src===nativeFrame.pixels?R:Math.max(...src.map(p=>Math.hypot(p.x-gx,p.y-gy))),
     keep=(x,y)=>Math.hypot(x-gx,y-gy)<=gR*shrink&&(i===0||((x+y)&1)===0);for(const p of src){if(!keep(p.x,p.y))continue;const c=dimHex(p.color,f);for(const oy of [0,.5])for(const ox of [0,.5])put(Math.round(q.x)+dx+Math.round(gx+(p.x-gx)*shrink)+ox,Math.round(q.y)+Math.round(gy+(p.y-gy)*shrink)+oy,c);}});
   ghosts=[...pixels].filter(([k])=>!main.has(k)).map(([,v])=>v);pixels.clear();for(const [k,v] of main)pixels.set(k,v);}
  /* Drive aura: blue flame hugging the ball. It joins the ghosts behind every sprite (keepers and players stay intact);
   the ball is already in pixels, so put() never lets the flame cover it */
  const aura=nativeFrame.animation==='drive-dive'?getTsubasaDriveAura(state):null;
  if(aura){const xs=nativeFrame.pixels.map(p=>p.x),ys=nativeFrame.pixels.map(p=>p.y),bx=anchor.x+(Math.min(...xs)+Math.max(...xs)+1)/2,by=anchor.y+(Math.min(...ys)+Math.max(...ys)+1)/2;
   const main=new Map(pixels);for(const p of aura.pixels)for(const oy of [0,.5])for(const ox of [0,.5])put(Math.round(bx+p.x)+ox,Math.round(by+p.y)+oy,p.color);
   const flame=[...pixels].filter(([k])=>!main.has(k)).map(([,v])=>v);pixels.clear();for(const [k,v] of main)pixels.set(k,v);if(flame.length)ghosts=[...(ghosts??[]),...flame];}
  /* shot companions (src/tsubasa-shot-companions.js): the native element beside the football, behind every sprite like the aura */
  {const v=state.velocity,travel=v&&Math.abs(v.x)>0.01?Math.sign(v.x):r[0x4a3+12]&128?-1:1,ground=projectTsubasaSpecialPoint(r,{...state.position,z:0});
   const fxs=nativeFrame.pixels.map(p=>p.x),fys=nativeFrame.pixels.map(p=>p.y),mate=getTsubasaShotCompanion(state,{travel,ball:{x:anchor.x,y:anchor.y},centre:{x:anchor.x+(Math.min(...fxs)+Math.max(...fxs)+1)/2,y:anchor.y+(Math.min(...fys)+Math.max(...fys)+1)/2}/* the drawn ball's own centre (the cannon art sits off the anchor) */,ground:ground&&{x:anchor.x+Math.round(ground.x-center.x),y:Math.round(ground.y)}});
   if(mate?.length){const main=new Map(pixels);for(const p of mate)for(const oy of [0,.5])for(const ox of [0,.5])put(p.x+ox,p.y+oy,p.color);
    const extra=[...pixels].filter(([k])=>!main.has(k)).map(([,v])=>v);pixels.clear();for(const [k,v] of main)pixels.set(k,v);if(extra.length){ghosts=[...(ghosts??[]),...extra];companionPixels=extra.length;}}}
 }else return null; // Unknown artwork never falls back to analytical half-grid art.
 for(const p of pixels.values()){
  if(plot)plot(p.x,p.y,p.color);
  else {ctx.fillStyle=p.color;ctx.fillRect(p.x*scale,p.y*scale,scale/2,scale/2);}
 }
 const deferredTrail=ghosts&&plotTrail?ghosts:null;if(ghosts&&!plotTrail)for(const p of ghosts){if(plot)plot(p.x,p.y,p.color);else{ctx.fillStyle=p.color;ctx.fillRect(p.x*scale,p.y*scale,scale/2,scale/2);}}
 if(deferredTrail)plotTrail(deferredTrail);
 return {trailPixelCount:ghosts?.length??0,companionPixels,id:state.id,moveId:state.moveId,owner:state.owner,characterId:state.characterId,name:state.effect==='basic'?null:state.name,effect:state.effect,phase:state.phase,age:state.age,world:{...state.position},screen:{...center},projected:{...projected},path:points.map(p=>({x:p.x,y:p.y,age:p.age,world:p.world})),pixelCount:pixels.size,nativeArtwork:nativeFrame?{frameId:nativeFrame.frameId,animationTick:nativeFrame.animationTick,frameIndex:nativeFrame.frameIndex,stage:nativeFrame.stage,grid:1,nativePixelCount:nativeFrame.pixels.length,bodyFrameIndex:nativeFrame.bodyFrameIndex??nativeFrame.frameIndex,bodyPixelCount:(nativeFrame.bodyPixels??nativeFrame.pixels).length,accentPixelCount:nativeFrame.accentPixels?.length??0,accentMode:nativeFrame.accentMode??'none',bounds:nativeFrame.bounds,artEvidence:nativeFrame.artEvidence,rasterAnchor:{x:hawkX??Math.round(center.x),y:Math.round(center.y)},hawkAnchorSource:hawkX!==null?'native-ball-record-x':'projected',sourceStates:nativeFrame.sourceStates,sourceFrames:nativeFrame.sourceFrames,key:nativeFrame.key??null,mirrored:!!nativeFrame.mirrored,cycleTicks:nativeFrame.cycleTicks,introTicks:nativeFrame.introTicks}:null,source:state.presentationOnly?'native-ball-position':'integrated-world-history',readOnly:true};
}

/** D-62 (project): the golden hawk is removed. Drive keeps its native trajectory (rise, then sharp dive)
 * and shows the plain native ball; from the dive (vertical velocity < 0 after mid-flight) it carries
 * 3 afterimages = the same native ball frame at earlier observed path points (2/4/6 frames back),
 * as the original 热血 super-shot afterimage. No new art. */
export const TSUBASA_DRIVE_TRAIL=Object.freeze([1.5,3,4.5]);/* frames back along the current velocity */
/** native state 12's animation ($BE8D): the slanted squashed ball turning, F8B/F8C/F8D */
export const TSUBASA_DRIVE_TRAIL_FRAMES=Object.freeze([0x8b,0x8c,0x8d]);
export function getTsubasaDriveDiveFrame(state,r){
 if(state?.moveId!=='drive-shot')return null;
 const f=getTsubasaNativePlainBallFrame((r?.[0x80]&127)<=3?r[0x80]:(r?.[0x300]??state.age??0));
 /* 2026-10-18: the drive flies かるろす' native chain 0F -> 12; the dive is native state 12 (state.diveState) */
 const diving=state.diveState==='diving'||Number.isFinite(state.age)&&Number.isFinite(state.flightTime)&&state.age>=Math.ceil(state.flightTime/2)&&(state.velocity?.z??0)<0;
 /* afterimages = state 12's own slanted spinning ball (F8B -> F8C -> F8D, bit7 = the frame's built-in mirror,
  * XOR the shot direction like the native ball), one frame further on per ghost: the top-spin of the dip */
 const tick=r?.[0x300]??state.age??0,left=!!((r?.[0x4a3+12]??0)&128),colours=[null,NATIVE_SHOT_PALETTE.K,NATIVE_SHOT_PALETTE.W,NATIVE_SHOT_PALETTE.O];
 const spin=k=>{const fr=TSUBASA_DRIVE_TRAIL_FRAMES[((tick%3)+k)%3],mirror=!!(fr&128)!==left;return nativeBallFramePixels(fr&127).map(p=>({x:mirror?-p.x-1:p.x,y:p.y,color:colours[p.c]}));};
 return {...f,frameId:`drive-dive-${f.frameId??f.frameIndex??0}`,animation:'drive-dive',trail:diving?TSUBASA_DRIVE_TRAIL:null,trailFrames:diving?TSUBASA_DRIVE_TRAIL.map((_,k)=>spin(k)):null,stage:diving?'dive':'flight'};
}
/** Drive Shot aura (2026-10-17, user call): the trajectory stays the native rise-then-dive and the ball
 * stays a football; the only addition is a blue flame that wraps the ball for the whole flight, not a
 * trail. A thin ring hugs the ball and short tongues flicker round it, leaning up like fire.
 * Presentation only: native-pixel offsets from the ball centre, from the special state's age. */
export const TSUBASA_DRIVE_AURA=Object.freeze({fromAge:2,ringInner:7.5,ringOuter:9.5,tongueAngles:[-146,-118,-90,-62,-34],tongueMin:2,tongueMax:4});
export function getTsubasaDriveAura(state){
 if(state?.moveId!=='drive-shot'||!Number.isFinite(state.age)||state.age<TSUBASA_DRIVE_AURA.fromAge)return null;
 const A=TSUBASA_DRIVE_AURA,{edge,mid,light}=TSUBASA_BALL_EFFECTS.drive,age=Math.floor(state.age),seen=new Set(),pixels=[];
 const add=(x,y,color)=>{x=Math.round(x);y=Math.round(y);const k=x+','+y;if(!seen.has(k)){seen.add(k);pixels.push({x,y,color});}};
 for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){const d=Math.hypot(x+.5,y+.5);if(d<A.ringInner||d>=A.ringOuter)continue;
  const outer=d>=8.5;if(outer&&((x*7+y*13+age)&3)===0)continue;/* shimmer: the outer half drops a few pixels per tick */
  add(x,y,outer?mid:light);}
 /* flame tongues on the upper half, rising: each flickers between tongueMin..tongueMax and wobbles a few degrees per tick */
 A.tongueAngles.forEach((deg,i)=>{const a=(deg+(((age+i)%3)-1)*7)*Math.PI/180,len=A.tongueMin+(i*3+age)%(A.tongueMax-A.tongueMin+1),px=-Math.sin(a),py=Math.cos(a);
  for(let t=1;t<=len;t++){const r=A.ringOuter-0.5+t,x=Math.cos(a)*r-.5,y=Math.sin(a)*r-.5,color=t===len?edge:t===1?light:mid;add(x,y,color);if(t<=Math.ceil(len/2))add(x+px,y+py,mid);}});
 return {stage:state.phase==='dive'||state.phase==='descending'?'dive':'flight',pixels};
}
/** (retired by D-62) D-29 golden hawk (project, shots-v2/drive-hawk): drive-shot shows the plain ball until mid-flight
 * (age >= half the planned flight), then loops the wing flap F39 > F3A > F3B > F3A, DRIVE_HAWK_TICKS
 * frames each. Frontal art: never mirrored. Pixels centred on the ball (x -8..7, y -h/2..). */
export function getTsubasaDriveHawkFrame(state){
 if(state?.moveId!=='drive-shot'||!Number.isFinite(state.age)||!Number.isFinite(state.flightTime))return null;
 const from=Math.ceil(state.flightTime/2);if(state.age<from)return null;
 const frameId=DRIVE_HAWK_FLAP[Math.floor((state.age-from)/DRIVE_HAWK_TICKS)%DRIVE_HAWK_FLAP.length],art=DRIVE_HAWK_ART[frameId],pixels=[];
 const ox=-art.width/2,oy=-Math.floor(art.height/2);
 for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++){const c=art.rows[y][x];if(c!=='.')pixels.push({x:ox+x,y:oy+y,color:DISPLAY_NES_RGB[DRIVE_HAWK_NES[c]],letter:c});}
 return {frameId,animation:'drive-hawk',pixels,mirrored:false,from};
}

/** M-5 cannon (拿破仑, project v2.1 signed; D-38 team call): keyed by move id, never by native shot 0x20 (fire-shot shares it).
 * Frame a (orange muzzle fireball + F00 on top) for displayed flight frames 1..TSUBASA_CANNON_FIREBALL_TICKS (state.flightTick,
 * counted from the first frame the ball is off the foot; native launch may integrate several times in that frame), then frame b (plain F00) for the rest of the flight, no alternation. Art is authored flying left; mirrored
 * when the native flip bit ($4A3+12 bit7) is clear (the native assembler's rule). */
export function getTsubasaCannonBallFrame(state,r){
 if(!state||TSUBASA_CANVAS_BALL_ART_BY_MOVE[state.moveId]!=='cannon-v2.1'||!Number.isFinite(state.flightTick))return null;
 const key=state.flightTick>=1&&state.flightTick<=TSUBASA_CANNON_FIREBALL_TICKS?'a':'b',art=CANNON_BALL_ART[key];
 const flipBit=r?!!(r[0x4a3+12]&128):(state.velocity?.x??-1)<0,mirrored=!flipBit,pixels=[];
 for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++){const c=art.rows[y][mirrored?art.width-1-x:x];if(c!=='.')pixels.push({x:(mirrored?-CANNON_BALL_ORIGIN.x-art.width:CANNON_BALL_ORIGIN.x)+x/* mirror about the ball centre x=-0.5 */,y:CANNON_BALL_ORIGIN.y+y,color:DISPLAY_NES_RGB[CANNON_BALL_NES[c]],letter:c});}
 return {frameId:art.id,key,animation:'cannon-ball',pixels,mirrored,flipBit,stage:key==='a'?'muzzle':'flight'};
}

/** D-36 razor ball (project ball-final, signed): frame by heading stage (S / 25 / 45) and curve side (D = screen +y,
 * U = screen -y), spin phase a/b alternating each tick. The blade is fixed on the trailing side (never orbits):
 * art faces flight +x and is mirrored left-right for flight -x. Box (-15,-22)-(15,5) around the ball anchor. */
export function getTsubasaRazorBallFrame(state,r){
 /* D-62: project's shots-v2/razor ball art is WITHDRAWN; the razor flies as the plain native ball (bend = path only). */
 if(state?.moveId!=='razor-shot'||!state.razor||!Number.isFinite(state.age))return null;
 const f=getTsubasaNativePlainBallFrame((r?.[0x80]&127)<=3?r[0x80]:(r?.[0x300]??state.age));
 const stage=state.razor.stage??0,key=stage===0||state.razor.straightened?'S':(state.razor.curve>0?'D':'U')+'bend';
 return {...f,frameId:`razor-native-${f.frameId??f.frameIndex??0}`,key,animation:'razor-native',mirrored:false,stage,headingDeg:state.razor.headingDeg};
}
