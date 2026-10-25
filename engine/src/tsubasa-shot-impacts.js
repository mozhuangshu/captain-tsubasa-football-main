/** Shot impacts (2026-10-21, user: no cut-in, no pause; effects only once the ball is off the foot).
 * Presentation only: watches the live Tsubasa special (getTsubasaSpecialState) and the ball / keeper positions in
 * RAM, never writes RAM, never touches physics or timing. Effects live in world space and are projected with the
 * current camera every paint, so they stay where they happened while the camera moves.
 *  kick    - a short star burst where the shot left the foot (all named shots except the cannon, which has its muzzle)
 *  release - Jito: a ring bursting off the ball when the hover (native 08) turns into the 04 flight
 *  keeper  - the native F41 flash on the contact point for two frames, then shock lines flying off it
 *  net     - the F41 flash where the ball meets the net, then a ripple of dotted rings
 * 2026-10-21 anime looks (docs/SHOT_LOOK_CARDS.md; 2018 anime + RISE OF NEW CHAMPIONS on-field layer), per move in
 * TSUBASA_SHOT_LOOKS: a comet trail along the ball's own world path (recorded once per logic frame), drawn back from the
 * ball and tapering; drive: vertical speed lines on the dip + a flash where it starts; tiger: an orange fireball at
 * the kick, a white-hot glow round the ball and a torn net hole where it goes in; razor: a thin blue arc band from the
 * foot and a blade glint left at the bend; eagle: a low blue-white beam and a turf groove ploughed along the ground.
 * State is per RAM buffer and advances once per logic frame ($300), so extra paints of the same frame change nothing. */
import {nativeBallFramePixels} from './tsubasa-shot-companions.js';
import {projectTsubasaSpecialPoint,TSUBASA_BALL_EFFECTS} from './tsubasa-special-effects.js';
import {tsubasaRazorGoalLineX} from './tsubasa-special-moves.js';
export const TSUBASA_SHOT_IMPACT=Object.freeze({kickTicks:6,releaseTicks:6,keeperTicks:10,netTicks:12,flashTicks:2,
 keeperReach:Object.freeze({x:14,y:10,z:34}),netWatchTicks:48,goalMouth:Object.freeze({y0:40,y1:200}),log:32});
const FLASH='#fcfcfc',memory=new WeakMap();
/* trail: len (native px back from the ball), w (half width at the ball), cols [core, mid, edge]; fx: kick / keeper / net colours */
export const TSUBASA_SHOT_LOOKS=Object.freeze({
 'drive-shot':Object.freeze({trail:Object.freeze({len:46,w:3.5,cols:['#f8fcff','#9ad8ff','#3a7cf0']}),fx:['#f8fcff','#9ad8ff','#3a7cf0'],speedLines:true,dipFlash:true}),
 'tiger-shot':Object.freeze({trail:Object.freeze({len:52,w:5.5,cols:['#fffbe0','#ffc23a','#e8641a'],flames:true}),fx:['#fffbe0','#ffc23a','#e8641a'],fireball:true,glow:['#fffbe0','#ffd860','#f08a20'],tearNet:true}),
 'razor-shot':Object.freeze({trail:Object.freeze({len:64,w:2,cols:['#ffffff','#8ccaff','#3a5ae8'],fromFoot:true}),fx:['#ffffff','#8ccaff','#3a5ae8'],bendGlint:true}),
 'eagle-shot':Object.freeze({trail:Object.freeze({len:56,w:3,cols:['#ffffff','#c6ecff','#5aa0ec']}),fx:['#ffffff','#c6ecff','#5aa0ec'],groove:Object.freeze({belowZ:8,ticks:24,cols:['#4a2c14','#6e4622','#8a6034']})}),
 /* the rest of the roster (2026-10-21, docs/SHOT_LOOK_CARDS.md section 5+) */
 /* falcon (2018 ep30: arms spread like wings, feathers flying; RONC: pink-violet light): a short sharp trail shedding feathers */
 'falcon-shot':Object.freeze({trail:Object.freeze({len:34,w:2,cols:['#fff4ff','#f0a8ff','#b048e0']}),fx:['#fff4ff','#f0a8ff','#b048e0'],feathers:true}),
 'running-volley-falcon':Object.freeze({trail:Object.freeze({len:34,w:2,cols:['#fff4ff','#f0a8ff','#b048e0']}),fx:['#fff4ff','#f0a8ff','#b048e0'],feathers:true}),
 /* fire (the ball wrapped in an orange flame ring; the name is the burnt smell in the net, smoke round the ball): red flame trail, smoke */
 'fire-shot':Object.freeze({trail:Object.freeze({len:50,w:4.5,cols:['#fff2c0','#ff7a30','#c81e10'],flames:true}),fx:['#fff2c0','#ff7a30','#c81e10'],glow:['#fff2c0','#ff8a3a','#d02a14'],smoke:true,netSmoke:true}),
 /* cannon (strong spin, straight; the cannon is the power): violet trail and shock rings left behind the ball (the muzzle flash at the kick is its own art) */
 'cannon-shot':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#ffffff','#d8c8ff','#7a60e0']}),fx:['#ffffff','#d8c8ff','#7a60e0'],noKick:true,shockRings:true,yOffset:-8/* the cannon ball art sits 8 px above the native anchor */}),
 /* slider (straight, then drops as the keeper reaches; blue speed lines): cyan trail, flash + speed lines on the drop */
 'slider-shot':Object.freeze({trail:Object.freeze({len:44,w:3,cols:['#ffffff','#a0f0ff','#28a4d4']}),fx:['#ffffff','#a0f0ff','#28a4d4'],speedLines:'dipped',dipFlash:'dipped'}),
 /* skylab (2018 ep37: red radial lines; height): red trail down from the top and red rays round the ball */
 'skylab-hurricane':Object.freeze({trail:Object.freeze({len:40,w:3.5,cols:['#fff0e0','#ff9a80','#e03030']}),fx:['#fff0e0','#ff9a80','#e03030'],radial:true}),
 /* Jito (a dump truck: the keeper pushed into the net with the ball): a pulsing charge round the hovering ball, then a wide heavy trail */
 'jito-power-shot':Object.freeze({trail:Object.freeze({len:48,w:6,cols:['#fff8d0','#ffb040','#c05810'],state:0x04}),fx:['#fff8d0','#ffb040','#c05810'],charge:0x08}),
 /* Margus (190 cm, header slammed into the grass): white trail, dust thrown up where it lands, a short groove */
 'margus-power-header':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#ffffff','#e4ecf4','#90a4b8']}),fx:['#ffffff','#e4ecf4','#90a4b8'],slamDust:true,groove:Object.freeze({belowZ:6,ticks:12,cols:['#4a2c14','#6e4622','#8a6034']})}),
 /* overhead / backflip: basic techniques, no element (core-shots.md): a short white trail */
 'overhead-kick':Object.freeze({trail:Object.freeze({len:28,w:2,cols:['#ffffff','#eef4ff','#a8bcd4']}),fx:['#ffffff','#eef4ff','#a8bcd4']}),
 /* 2026-10-21 the former no-move roster (names: Dream Team skill list on tsubasa.im, or made up from the character; docs/SHOT_LOOK_CARDS.md section 6) and the Jito -> Sano combination */
 'taki-compact-shot':Object.freeze({trail:Object.freeze({len:36,w:2,cols:['#ffffff', '#e0e8f0', '#9aa8b8']}),fx:['#ffffff', '#e0e8f0', '#9aa8b8'],sparkle:true}),
 'kisugi-scorer-shot':Object.freeze({trail:Object.freeze({len:40,w:2.5,cols:['#fffbe0', '#ffe070', '#d09820']}),fx:['#fffbe0', '#ffe070', '#d09820'],reticle:true}),
 'izawa-surprise-shot':Object.freeze({trail:Object.freeze({len:40,w:2.5,cols:['#f0fff0', '#a0f0a0', '#40a850']}),fx:['#f0fff0', '#a0f0a0', '#40a850'],hoverSpark:0x14}),
 'takasugi-power-shot':Object.freeze({trail:Object.freeze({len:46,w:5,cols:['#fff0dc', '#e0a060', '#9a5a28']}),fx:['#fff0dc', '#e0a060', '#9a5a28'],slamDust:true}),
 'urabe-sliding-shot':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#fff0f0', '#ff9a90', '#d03838']}),fx:['#fff0f0', '#ff9a90', '#d03838'],kickDust:true}),
 'kishida-shark-shot':Object.freeze({trail:Object.freeze({len:44,w:3,cols:['#eef6ff', '#7ab0f0', '#284c9c']}),fx:['#eef6ff', '#7ab0f0', '#284c9c'],splash:true}),
 'nakayama-long-shot':Object.freeze({trail:Object.freeze({len:48,w:4,cols:['#ffffff', '#d8dce0', '#8a929a']}),fx:['#ffffff', '#d8dce0', '#8a929a']}),
 'nishio-quartet-shot':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#fff0ff', '#d8a0e0', '#8a4a9c']}),fx:['#fff0ff', '#d8a0e0', '#8a4a9c'],orbit:4}),
 'narita-captain-shot':Object.freeze({trail:Object.freeze({len:46,w:4,cols:['#ffffff', '#a8c0f0', '#2c4a9c']}),fx:['#ffffff', '#a8c0f0', '#2c4a9c']}),
 'sawaki-quick-shot':Object.freeze({trail:Object.freeze({len:50,w:2.5,cols:['#fff4e8', '#e0b088', '#8a5a34']}),fx:['#fff4e8', '#e0b088', '#8a5a34'],hLines:true}),
 'oda-dosanko-shot':Object.freeze({trail:Object.freeze({len:42,w:3,cols:['#ffffff', '#d4f0ff', '#78b8e8']}),fx:['#ffffff', '#d4f0ff', '#78b8e8'],snow:true}),
 'kaneda-snowfield-shot':Object.freeze({trail:Object.freeze({len:42,w:3,cols:['#ffffff', '#e0f4ff', '#90c0e0']}),fx:['#ffffff', '#e0f4ff', '#90c0e0'],snow:true}),
 'wakamatsu-quick-shot':Object.freeze({trail:Object.freeze({len:36,w:2.5,cols:['#ffffff', '#c0e4ff', '#5aa0dc']}),fx:['#ffffff', '#c0e4ff', '#5aa0dc'],sparkle:true}),
 'sawada-solid-shot':Object.freeze({trail:Object.freeze({len:38,w:2,cols:['#fffbe0', '#ffe890', '#c0a030']}),fx:['#fffbe0', '#ffe890', '#c0a030'],crosshair:true}),
 'sorimachi-shadow-shot':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#e8e0f0', '#8a78a8', '#3a2c4e']}),fx:['#e8e0f0', '#8a78a8', '#3a2c4e'],shadow:true}),
 'ichinose-bullet-shot':Object.freeze({trail:Object.freeze({len:64,w:1.5,cols:['#ffffff', '#fff0a0', '#e0b030']}),fx:['#ffffff', '#fff0a0', '#e0b030'],kickSparks:true}),
 'sanada-header-smash':Object.freeze({trail:Object.freeze({len:40,w:3,cols:['#f8f0ff', '#c0a0f0', '#6a40b0']}),fx:['#f8f0ff', '#c0a0f0', '#6a40b0']}),
 'honma-precise-shot':Object.freeze({trail:Object.freeze({len:32,w:1.5,cols:['#ffffff', '#f0f0f0', '#b0b8c0']}),fx:['#ffffff', '#f0f0f0', '#b0b8c0'],sparkle:true}),
 'schester-gyro-shot':Object.freeze({trail:Object.freeze({len:38,w:2.5,cols:['#fffbe8', '#f0e0a0', '#b0a060']}),fx:['#fffbe8', '#f0e0a0', '#b0a060'],gyro:true}),
 'bossis-wild-shot':Object.freeze({trail:Object.freeze({len:44,w:3.5,cols:['#fff4e0', '#ffb050', '#d06010'],zigzag:3}),fx:['#fff4e0', '#ffb050', '#d06010']}),
 'pascal-slide-step-shot':Object.freeze({trail:Object.freeze({len:40,w:2.5,cols:['#ffffff', '#b8e4ff', '#4aa0e8']}),fx:['#ffffff', '#b8e4ff', '#4aa0e8'],sideGhosts:true}),
 'galvan-canon':Object.freeze({trail:Object.freeze({len:50,w:5,cols:['#fff0dc', '#d89858', '#7a4420']}),fx:['#fff0dc', '#d89858', '#7a4420'],shockRings:true}),
 'jito-sano-combination':Object.freeze({trail:Object.freeze({len:46,w:4,cols:['#fffbe0', '#ffc860', '#3a6ad8']}),fx:['#fffbe0', '#ffc860', '#3a6ad8']}),
 'diaz-backflip-shot':Object.freeze({trail:Object.freeze({len:28,w:2,cols:['#ffffff','#c4eaff','#5eb0f0']}),fx:['#ffffff','#c4eaff','#5eb0f0']}),
});
const looks=id=>TSUBASA_SHOT_LOOKS[id]??null,PART_TICKS={feather:10,smoke:14,shock:8,dust:10,spark:6,snow:16,splash:8};
const signed=n=>n&32768?n-65536:n,w=(r,lo,hi)=>r[lo]|r[hi]<<8;
const pos=(r,s)=>({x:signed(w(r,0x314+s,0x327+s))+r[0x301+s]/256,y:signed(w(r,0x34d+s,0x360+s))+r[0x33a+s]/256,z:signed(w(r,0x386+s,0x399+s))+r[0x373+s]/256});
const colours=(effect,moveId)=>{const l=looks(moveId)?.fx;if(l)return l;const e=TSUBASA_BALL_EFFECTS[effect]??TSUBASA_BALL_EFFECTS.basic;return [e.light,e.mid,e.edge];};
function near(ball,k){const R=TSUBASA_SHOT_IMPACT.keeperReach;return Math.abs(ball.x-k.x)<=R.x&&Math.abs(ball.y-k.y)<=R.y&&ball.z>=k.z-4&&ball.z<=k.z+R.z;}
/** the defending keeper (slot 10 / 11, the other side from the shooter) the ball is touching, or null */
function keeperAt(r,ball,owner){for(const k of [10,11]){if(!((k^owner)&1))continue;if(near(ball,pos(r,k)))return k;}return null;}
function inNet(ball){const left=ball.x<512,line=tsubasaRazorGoalLineX(ball.y,left),M=TSUBASA_SHOT_IMPACT.goalMouth;return (left?ball.x<=line:ball.x>=line)&&ball.y>=M.y0&&ball.y<=M.y1&&ball.z<48;}
function push(m,fx){m.fx.push(fx);m.log.push({kind:fx.kind,frame:fx.frame,moveId:fx.moveId,world:{...fx.world}});if(m.log.length>TSUBASA_SHOT_IMPACT.log)m.log.shift();}
/** advance the impact state for this logic frame (idempotent within a frame) */
export function observeTsubasaShotImpacts(r,state){
 let m=memory.get(r);if(!m){m={frame:-1,shot:null,watch:null,fx:[],log:[],grooves:[],parts:[]};memory.set(r,m);}
 const frame=r[0x300];if(m.frame===frame)return m;m.frame=frame;
 const T=TSUBASA_SHOT_IMPACT,ticks={kick:T.kickTicks,release:T.releaseTicks,keeper:T.keeperTicks,net:T.netTicks,dip:3,bend:5,tear:24,reticle:10};
 m.fx=m.fx.filter(f=>((frame-f.frame)&255)<ticks[f.kind]);m.parts=m.parts.filter(q=>((frame-q.frame)&255)<PART_TICKS[q.kind]);m.grooves=m.grooves.filter(g=>((frame-g.frame)&255)<(looks(g.moveId)?.groove?.ticks??0));
 const live=state&&state.id&&!state.presentationOnly?state:null;
 const finish=()=>{const s=m.shot;m.shot=null;if(!s)return;const ball=pos(r,12);
  if(!s.touched.size){const k=keeperAt(r,ball,s.owner)??(s.last?keeperAt(r,s.last,s.owner):null);if(k!=null){s.touched.add(k);push(m,{kind:'keeper',frame,world:{...ball},moveId:s.moveId,effect:s.effect});}}
  m.watch={from:frame,moveId:s.moveId,effect:s.effect,netDone:s.netDone};};
 if(live&&m.shot&&m.shot.id!==live.id)finish();
 if(live){
  if(!m.shot){m.shot={id:live.id,moveId:live.moveId,effect:live.effect,owner:live.owner,touched:new Set(),nativeState:live.nativeState,last:null,path:live.origin?[{...live.origin,frame}]:[],diving:false,bent:false};m.watch=null;
   if(!looks(live.moveId)?.noKick&&live.origin)push(m,{kind:'kick',frame,world:{...live.origin},moveId:live.moveId,effect:live.effect});}
  const s=m.shot,ball=live.position;
  if(s.moveId==='jito-power-shot'&&s.nativeState===0x08&&live.nativeState===0x04)push(m,{kind:'release',frame,world:{...ball},moveId:s.moveId,effect:s.effect});
  s.nativeState=live.nativeState;
  /* the world path for the trail, one point per logic frame */s.path.push({...ball,frame});if(s.path.length>24)s.path.shift();
  const L=looks(s.moveId);
  const dipping=L?.dipFlash==='dipped'?!!live.dipped:live.diveState==='diving';
  if(L?.dipFlash&&!s.diving&&dipping){s.diving=true;push(m,{kind:'dip',frame,world:{...ball},moveId:s.moveId,effect:s.effect});}
  if(L?.bendGlint&&!s.bent&&live.razor?.bendAge!=null){s.bent=true;const v=live.velocity??{x:1,y:0,z:0};push(m,{kind:'bend',frame,world:{...ball},moveId:s.moveId,effect:s.effect,dir:{x:v.x,y:v.y-v.z}});}
  if(L?.groove&&s.last&&ball.z<L.groove.belowZ&&s.last.z<L.groove.belowZ+4)m.grooves.push({a:{x:s.last.x,y:s.last.y,z:0},b:{x:ball.x,y:ball.y,z:0},frame,moveId:s.moveId});
  /* particles, in world space */const n=s.path.length,back=s.path[Math.max(0,n-2)],seed=hash(frame,n),side=(seed&1?1:-1);
  if(L?.feathers&&n>2)m.parts.push({kind:'feather',world:{...back,y:back.y+side*(5+seed%4)}/* off to one side of the trail */,frame,seed,moveId:s.moveId});
  if(L?.smoke&&n>2)m.parts.push({kind:'smoke',world:{...back,z:back.z+7+seed%3}/* just above the flame */,frame,seed,moveId:s.moveId});
  if(L?.shockRings&&n>2&&frame%4===0)m.parts.push({kind:'shock',world:{...ball},frame,seed,moveId:s.moveId,dir:live.velocity?{x:live.velocity.x,y:live.velocity.y-live.velocity.z}:{x:1,y:0}});
  if(L?.sparkle&&n>2&&(frame&1))m.parts.push({kind:'spark',world:{...back,y:back.y+side*(3+seed%5)},frame,seed,moveId:s.moveId});
  if(L?.snow&&n>2)m.parts.push({kind:'snow',world:{...back,y:back.y+side*(2+seed%6),z:back.z+(seed>>4)%6},frame,seed,moveId:s.moveId});
  if(L?.splash&&s.last&&ball.z<5&&n>2)for(let i=0;i<3;i++)m.parts.push({kind:'splash',world:{...ball,z:0},frame,seed:hash(i,frame,3),moveId:s.moveId});
  if((L?.kickDust||L?.kickSparks)&&n===2&&live.origin)for(let i=0;i<10;i++)m.parts.push({kind:L.kickDust?'dust':'spark',world:{...live.origin,z:L.kickDust?0:live.origin.z},frame,seed:hash(i,frame,5),moveId:s.moveId});
  if(L?.reticle&&n===2)push(m,{kind:'reticle',frame,world:{x:ball.x+(live.velocity?.x??1)>=0?864:160,y:112,z:12},moveId:s.moveId,effect:s.effect});
  if(L?.slamDust&&!s.slammed&&s.last&&ball.z<6&&s.last.z>=6){s.slammed=true;for(let i=0;i<12;i++)m.parts.push({kind:'dust',world:{...ball,z:0},frame,seed:hash(i,frame),moveId:s.moveId});}
  s.last={...ball};
  const k=keeperAt(r,ball,s.owner);if(k!=null&&!s.touched.has(k)){s.touched.add(k);push(m,{kind:'keeper',frame,world:{...ball},moveId:s.moveId,effect:s.effect});}
 }else if(m.shot)finish();
 /* the shot may end before the ball reaches the net (keeper knocked back, native stop): keep watching the loose ball */
 if(m.watch&&((frame-m.watch.from)&255)>=T.netWatchTicks)m.watch=null;
 const ball=pos(r,12),s=m.shot??m.watch;if(s&&!s.netDone&&inNet(ball)){s.netDone=true;push(m,{kind:'net',frame,world:{...ball},moveId:s.moveId,effect:s.effect});if(looks(s.moveId)?.netSmoke)for(let i=0;i<6;i++)m.parts.push({kind:'smoke',world:{...ball,x:ball.x+(ball.x<512?-1:1)*(4+i*2),y:ball.y+(i%3-1)*5},frame,seed:hash(i,frame,7),moveId:s.moveId});if(looks(s.moveId)?.tearNet)push(m,{kind:'tear',frame,world:{...ball,x:ball.x+(ball.x<512?-18:18)}/* deeper in the goal, on the net behind the keeper */,moveId:s.moveId,effect:s.effect});}
 return m;}
/** every impact so far for this RAM (newest last, at most TSUBASA_SHOT_IMPACT.log) — review and tests */
export function getTsubasaShotImpactLog(r){return (memory.get(r)?.log??[]).map(e=>({...e,world:{...e.world}}));}
export function resetTsubasaShotImpacts(r){memory.delete(r);}
const flashPixels=(cx,cy,radius=99)=>{const ps=nativeBallFramePixels(0x41),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y),ox=(Math.min(...xs)+Math.max(...xs))/2,oy=(Math.min(...ys)+Math.max(...ys))/2;
 return ps.filter(p=>Math.hypot(p.x-ox,p.y-oy)<=radius).map(p=>({x:Math.round(cx+p.x-ox),y:Math.round(cy+p.y-oy),color:FLASH}));};
function rays(cx,cy,n,r0,len,cols,phase=0){const out=[];for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+phase,ux=Math.cos(a),uy=Math.sin(a)*0.75;for(let t=0;t<len;t++){const d=r0+t;out.push({x:Math.round(cx+ux*d),y:Math.round(cy+uy*d),color:cols[t===0?0:t<len-1?1:2]});}}return out;}
function ring(cx,cy,rad,cols,dotted){const out=[],n=Math.max(12,Math.round(rad*6));for(let i=0;i<n;i++){if(dotted&&(i&1))continue;const a=i/n*Math.PI*2;out.push({x:Math.round(cx+Math.cos(a)*rad),y:Math.round(cy+Math.sin(a)*rad*0.75),color:cols[i%3===0?0:1]});}return out;}
const hash=(x,y,t=0)=>((x*73856093)^(y*19349663)^(t*83492791))>>>0;
/** comet trail: back from the ball along the screen polyline pts (newest first), tapering; cols core/mid/edge */
function comet(out,pts,spec,tick){if(pts.length<2)return;const seen=new Set(),add=(x,y,c)=>{x=Math.round(x);y=Math.round(y);const k=x+','+y;if(!seen.has(k)){seen.add(k);out.push({x,y,color:c});}};
 let d=0;for(let i=1;i<pts.length&&d<spec.len;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<0.01)continue;const ux=dx/L,uy=dy/L,px=-uy,py=ux;
  for(let t=0;t<L&&d<spec.len;t+=0.5,d+=0.5){const f=d/spec.len,w=spec.w*(1-f)+0.5,zz=spec.zigzag?((Math.floor((d+tick*2)/4)&1)?1:-1)*spec.zigzag*Math.min(1,d/6):0/* Bossis: a wild zigzag */,x=a.x+ux*t+px*zz,y=a.y+uy*t+py*zz;
   for(let o=-w;o<=w;o+=0.5){const q=Math.abs(o)/w,c=q<0.35?spec.cols[0]:q<0.7?spec.cols[1]:spec.cols[2],X=x+px*o,Y=y+py*o;if(f>0.6&&(hash(Math.round(X),Math.round(Y),tick)&1))continue;add(X,Y,f>0.8?spec.cols[2]:c);}
   /* tiger: flame tongues licking out of the edge, moving back along the trail */
   if(spec.flames&&f<0.85&&((Math.round(d)+tick*3)%7===0))for(const side of [-1,1]){const n=1+hash(Math.round(d),side,tick)%3;for(let k=1;k<=n;k++)add(x+px*side*(w+k)-ux*k,y+py*side*(w+k)-uy*k,k===n?spec.cols[2]:spec.cols[1]);}}}}
function disc(out,cx,cy,R,cols,tick,ragged=true){for(let y=-Math.ceil(R);y<=R;y++)for(let x=-Math.ceil(R);x<=R;x++){const d=Math.hypot(x,y*1.15);if(d>R)continue;if(ragged&&d>R-1.5&&(hash(x,y,tick)&1))continue;out.push({x:Math.round(cx+x),y:Math.round(cy+y),color:d<R*0.45?cols[0]:d<R*0.75?cols[1]:cols[2]});}}
function line(out,x0,y0,x1,y1,c){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*2)||1;for(let i=0;i<=n;i++)out.push({x:Math.round(x0+(x1-x0)*i/n),y:Math.round(y0+(y1-y0)*i/n),color:c});}
/** screen pixels (native 256x240 px) of the live impacts and move looks: front = over every sprite, behind = under them */
export function getTsubasaShotImpactPixels(r,state){
 const m=observeTsubasaShotImpacts(r,state),front=[],behind=[],T=TSUBASA_SHOT_IMPACT,tick=m.frame;
 /* the live move look: trail, glow, speed lines (behind every sprite, so the ball and players stay whole) */
 const live=state&&state.id&&!state.presentationOnly&&m.shot?.id===state.id?state:null,L=live?looks(live.moveId):null;
 if(L){const ball0=projectTsubasaSpecialPoint(r,live.position),ball=ball0&&{x:ball0.x,y:ball0.y+(L.yOffset??0)},v=live.velocity??{x:0,y:0,z:0},vx=v.x,vy=v.y-v.z;
  /* only points behind the ball along its screen velocity (the kick frame's origin can sit just ahead of it) */
  const pts=[ball,...[...m.shot.path].reverse().map(p=>{const q=projectTsubasaSpecialPoint(r,p);return q&&{x:q.x,y:q.y+(L.yOffset??0)};})].filter((q,i)=>q&&(i===0||(q.x-ball.x)*vx+(q.y-ball.y)*vy<=0.5));
  if(L.trail&&(L.trail.state==null||live.nativeState===L.trail.state))comet(behind,pts,L.trail,tick);
  if(L.charge!=null&&live.nativeState===L.charge){/* Jito: the hovering ball charging up, a pulsing 2-px ring */const R=9+(tick&1)*2;for(let i=0;i<40;i++){const a=i/40*Math.PI*2;for(const d of [R,R+1])behind.push({x:Math.round(ball.x+Math.cos(a)*d),y:Math.round(ball.y+Math.sin(a)*d),color:d===R?L.fx[0]:L.fx[1]});}}
  const flown=(m.frame-m.shot.path[0].frame)&255;
  const pathBack=k=>{const q=m.shot.path[m.shot.path.length-1-k];if(!q)return null;const p=projectTsubasaSpecialPoint(r,q);return p&&{x:p.x,y:p.y+(L.yOffset??0)};};
  if(L.hoverSpark!=null&&live.nativeState===L.hoverSpark)for(const [dx,dy] of [[0,-13],[10,-8],[-10,-8]]){const x=Math.round(ball.x+dx),y=Math.round(ball.y+dy),l=2+(tick&1);for(let t=-l;t<=l;t++)behind.push({x:x+t,y,color:L.fx[1]},{x,y:y+t,color:L.fx[1]});behind.push({x,y,color:'#ffffff'});}
  if(L.orbit)for(let i=0;i<L.orbit;i++){const a=tick*0.5+i*Math.PI*2/L.orbit;const x=Math.round(ball.x+Math.cos(a)*11),y=Math.round(ball.y+Math.sin(a)*7);for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]])behind.push({x:x+dx,y:y+dy,color:dx+dy?L.fx[1]:L.fx[0]});}
  if(L.gyro)for(const tilt of [0.6,-0.6])for(let i=0;i<40;i++){const a=i/40*Math.PI*2+tick*0.7,u=Math.cos(a)*11,v=Math.sin(a)*4,x=Math.round(ball.x+u*Math.cos(tilt)-v*Math.sin(tilt)),y=Math.round(ball.y+u*Math.sin(tilt)+v*Math.cos(tilt));if((i+tick)%5===0)continue;behind.push({x,y,color:i%3?L.fx[2]:'#ffffff'});}
  /* Sorimachi: the ball's shadow double trailing it, a dithered dark ball a little below the path (the ball slips out of its own shadow) */
  if(L.shadow){const g=pathBack(3);if(g)for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){const d=Math.hypot(x+.5,y+.5);if(d>7.5||((x+y+tick)&1))continue;behind.push({x:Math.round(g.x)+x,y:Math.round(g.y)+y+4,color:d>6.5?L.fx[2]:L.fx[1]});}}
  if(L.sideGhosts&&flown<8)for(const sd of [-1,1]){const n=Math.hypot(vx,vy)||1,ox=-vy/n*sd*(6+flown),oy=vx/n*sd*(6+flown);for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){if(Math.hypot(x,y)>6.5||((x+y+flown)&1))continue;behind.push({x:Math.round(ball.x+ox)+x,y:Math.round(ball.y+oy)+y,color:Math.hypot(x,y)>5.5?L.fx[2]:L.fx[1]});}}
  if(L.crosshair&&flown<6){const R=10-flown;for(let t=-3;t<=3;t++){if(Math.abs(t)<2)continue;behind.push({x:Math.round(ball.x)+t*3,y:Math.round(ball.y),color:L.fx[1]},{x:Math.round(ball.x),y:Math.round(ball.y)+t*3,color:L.fx[1]});}for(let i=0;i<32;i++){if(i%8>5)continue;const a=i/32*Math.PI*2;behind.push({x:Math.round(ball.x+Math.cos(a)*R),y:Math.round(ball.y+Math.sin(a)*R),color:L.fx[0]});}}
  if(L.hLines)for(const [oy,len] of [[-6,10],[6,10],[-10,6],[10,6]]){const l=len+((tick+oy)&3);for(let t=0;t<l;t++)behind.push({x:Math.round(ball.x-Math.sign(vx||1)*(10+t)),y:Math.round(ball.y)+oy,color:t<2?L.fx[0]:L.fx[1]});}
  if(L.radial)for(let i=0;i<10;i++){const a=i/10*Math.PI*2+tick*0.35,len=4+hash(i,tick)%4;for(let t=0;t<len;t++)behind.push({x:Math.round(ball.x+Math.cos(a)*(11+t)),y:Math.round(ball.y+Math.sin(a)*(11+t)*0.85),color:t===0?L.fx[0]:t<len-1?L.fx[1]:L.fx[2]});}
  /* tiger (2018 anime): for the first frames the ball flies engulfed in an orange fireball, then the white-hot glow */
  if(L.fireball&&flown<6){const R=[13,16,16,14,12,10][flown];/* yellow-white body, red rim and a dark outline: reads on the orange and the green pitch */disc(behind,ball.x,ball.y,R,['#fffbe0','#ffe060','#e03a10'],tick);for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(hash(i,0,tick)%3===0)continue;behind.push({x:Math.round(ball.x+Math.cos(a)*(R+1)),y:Math.round(ball.y+Math.sin(a)*(R+1)/1.15),color:'#7a1808'});}behind.push(...rays(ball.x,ball.y,10,R+1,flown<3?4:2,[L.fx[1],L.fx[1],L.fx[2]],flown&1?Math.PI/10:0));}
  else if(L.glow)for(let y=-11;y<=11;y++)for(let x=-11;x<=11;x++){const d=Math.hypot(x+.5,y+.5);if(d<7.5||d>=10.5)continue;if(d>=9.5&&(hash(x,y,tick)&1))continue;behind.push({x:Math.round(ball.x)+x,y:Math.round(ball.y)+y,color:d<8.5?L.glow[0]:d<9.5?L.glow[1]:L.glow[2]});}
  if(L.speedLines&&(L.speedLines==='dipped'?live.dipped:live.diveState==='diving'))for(const [ox,len] of [[-10,9],[-14,6],[10,9],[14,6]]){const l=len+((tick+ox)&3),x=Math.round(ball.x)+ox;line(behind,x,Math.round(ball.y)-3,x,Math.round(ball.y)-3-l,L.trail.cols[1]);behind.push({x,y:Math.round(ball.y)-3,color:L.trail.cols[0]});}}
 /* eagle: the turf groove ploughed along the ground, fading out at the end */
 for(const g of m.grooves){const G=looks(g.moveId)?.groove,age=(m.frame-g.frame)&255,a=projectTsubasaSpecialPoint(r,g.a),b=projectTsubasaSpecialPoint(r,g.b);if(!G||!a||!b)continue;const fade=age>G.ticks-8;
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y))||1;for(let i=0;i<=n;i++){const x=Math.round(a.x+(b.x-a.x)*i/n),y=Math.round(a.y+(b.y-a.y)*i/n)+8/* the ball centre sits 8 above its ground point */;
   if(fade&&(hash(x,y,age)&1))continue;behind.push({x,y:y-1,color:G.cols[1]},{x,y,color:G.cols[0]},{x,y:y+1,color:G.cols[0]},{x,y:y+2,color:G.cols[1]});const h=hash(x,y);if(h%5===0)behind.push({x:x+(h&1?1:-1),y:y-1-(h>>3&1),color:G.cols[2]});}}
 /* particles: falcon feathers drifting off the trail, fire smoke rising, cannon shock rings, Margus' dust */
 for(const q of m.parts){const age=(m.frame-q.frame)&255,p=projectTsubasaSpecialPoint(r,q.world),Q=looks(q.moveId);if(!p||!Q)continue;const h=q.seed,old=age>PART_TICKS[q.kind]-4;
  if(q.kind==='feather'){const x=Math.round(p.x+((h%5)-2)*age*0.5),y=Math.round(p.y+((h>>3)%7-3)+age*0.7),tilt=(age+h)&1;if(old&&(age&1))continue;
   /* a 5-px feather: white vane, the move's light tone, a dark quill tip so it reads on any pitch */
   for(const [dx,dy,c] of tilt?[[0,0,'#ffffff'],[1,0,'#ffffff'],[2,1,Q.fx[1]],[-1,-1,Q.fx[1]],[3,1,Q.fx[2]],[0,1,'#ffffff']]:[[0,0,'#ffffff'],[1,-1,'#ffffff'],[2,-1,Q.fx[1]],[-1,1,Q.fx[1]],[3,-2,Q.fx[2]],[1,0,'#ffffff']])behind.push({x:x+dx,y:y+dy,color:c});}
  else if(q.kind==='smoke'){const R=2.5+age*0.45,cx=p.x+((h%5)-2)*0.6*age,cy=p.y-age*1.0+((h>>2)%5-2);for(let y=-Math.ceil(R);y<=R;y++)for(let x=-Math.ceil(R);x<=R;x++){const d=Math.hypot(x,y);if(d>R)continue;if((old||d>R-1)&&(hash(x,y,age+h)&1))continue;behind.push({x:Math.round(cx+x),y:Math.round(cy+y),color:d<R*0.45?'#e8e4de':d<R*0.8?'#b4aea6':'#6e6862'});}}
  else if(q.kind==='shock'){/* a ring across the line of flight, growing and thinning */const n=Math.hypot(q.dir.x,q.dir.y)||1,ux=q.dir.x/n,uy=q.dir.y/n,R=6+age*1.8;for(let i=0;i<40;i++){if(age>5&&(i&1))continue;const a=i/36*Math.PI*2,u=Math.cos(a)*R*0.35,v=Math.sin(a)*R;const X=Math.round(p.x+ux*u-uy*v),Y=Math.round(p.y+uy*u+ux*v)+(Q.yOffset??0);behind.push({x:X,y:Y,color:i%3?Q.fx[1]:Q.fx[0]},{x:X-Math.round(ux),y:Y-Math.round(uy),color:Q.fx[2]});}}
  else if(q.kind==='spark'){/* a 4-ray glint */const x=Math.round(p.x+((h%5)-2)*age*0.6),y=Math.round(p.y+((h>>3)%5-2)*age*0.6),l=age<2?2:1;if(old&&(age&1))continue;for(let t=-l;t<=l;t++)behind.push({x:x+t,y,color:Q.fx[1]},{x,y:y+t,color:Q.fx[1]});behind.push({x,y,color:'#ffffff'});}
  else if(q.kind==='snow'){/* a snowflake drifting down */const x=Math.round(p.x+Math.sin((age+h)*0.6)*2),y=Math.round(p.y+age*0.6);if(old&&(age&1))continue;behind.push({x,y,color:'#ffffff'},{x:x+1,y,color:'#e8f4ff'},{x,y:y+1,color:'#e8f4ff'},{x:x-1,y,color:Q.fx[2]});}
  else if(q.kind==='splash'){/* water thrown up where the shark breaks the surface */const a=Math.PI*(0.15+0.7*((h%100)/100)),d=2+age*1.6,x=Math.round(p.x+Math.cos(a)*d*(h&1?1:-1)),y=Math.round(p.y+8-Math.sin(a)*d+age*age*0.12);if(old&&(age&1))continue;behind.push({x,y,color:'#ffffff'},{x,y:y+1,color:Q.fx[1]});}
  else if(q.kind==='dust'){const a=(h%360)*Math.PI/180,d=3+age*2.2,R=1.5+age*0.35,cx=p.x+Math.cos(a)*d,cy=p.y+8-Math.abs(Math.sin(a))*d*0.6-age*0.4;for(let y=-Math.ceil(R);y<=R;y++)for(let x=-Math.ceil(R);x<=R;x++){if(Math.hypot(x,y)>R)continue;if(old&&(hash(x,y,age)&1))continue;behind.push({x:Math.round(cx+x),y:Math.round(cy+y),color:Math.hypot(x,y)<R*0.5?'#f0e4c8':(x+y)&1?'#a07848':'#d8c09a'});}}}
 for(const f of m.fx){const age=(m.frame-f.frame)&255,p=projectTsubasaSpecialPoint(r,f.world);if(!p)continue;const [light,mid,edge]=colours(f.effect,f.moveId),rayCols=[FLASH,light,mid],ringCols=[FLASH,light];
  /* colours: white and the move's light tone lead (the move's mid tone alone vanishes on the orange and green pitches) */
  if(f.kind==='kick'){/* star burst at the foot: small core flash 2 frames, rays flying out */const k=[];if(age<T.flashTicks)k.push(...flashPixels(p.x,p.y,5));k.push(...rays(p.x,p.y,8,5+age*2,age<3?4:3,rayCols,age&1?Math.PI/8:0));for(const q of k)q.kick=true;front.push(...k);}
  else if(f.kind==='release'){front.push(...ring(p.x,p.y,8+age*3,ringCols,age>3));}
  else if(f.kind==='keeper'){/* the flash is cut to radius 9 so the keeper still shows round it */if(age<T.flashTicks)front.push(...flashPixels(p.x,p.y,9));front.push(...rays(p.x,p.y,10,9+age*2,age<6?4:3,rayCols,0.2));}
  else if(f.kind==='net'){if(age<T.flashTicks)front.push(...flashPixels(p.x,p.y));front.push(...ring(p.x,p.y,6+age*2,ringCols,age>6));if(age>=3)front.push(...ring(p.x,p.y,age*2-1,ringCols,true));}
  else if(f.kind==='reticle'){/* Kisugi: the scorer has already picked his spot - brackets on the goal mouth */const R=16-Math.min(age,6),c=age&1?light:FLASH;for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])for(let t=0;t<5;t++){front.push({x:Math.round(p.x+sx*R-sx*t),y:Math.round(p.y+sy*R*0.8),color:c},{x:Math.round(p.x+sx*R),y:Math.round(p.y+sy*R*0.8-sy*t),color:c});}}
  else if(f.kind==='dip'){/* drive: a flash where the dive starts */disc(front,p.x,p.y,[6,8,5][age]??0,[FLASH,light,mid],tick);}
  else if(f.kind==='bend'){/* razor: the blade glint left at the bend, across the new heading */const n=Math.hypot(f.dir.x,f.dir.y)||1,ux=-f.dir.y/n,uy=f.dir.x/n,len=[7,8,7,5,3][age]??0;line(front,p.x-ux*len,p.y-uy*len,p.x+ux*len,p.y+uy*len,FLASH);line(front,p.x-ux*len+1,p.y-uy*len,p.x+ux*len+1,p.y+uy*len,light);}
  else if(f.kind==='tear'){/* tiger: the net torn open where the ball went through (1983 / 2018: the shot breaks the net) */const fade=age>16,D='#2a1e14';
   for(let y=-4;y<=4;y++)for(let x=-5;x<=5;x++){if(Math.hypot(x/5,y/4)>1)continue;if(fade&&(hash(x,y,age)&1))continue;front.push({x:Math.round(p.x)+x,y:Math.round(p.y)+y,color:D});}
   for(let i=0;i<10;i++){const a=i/10*Math.PI*2+0.3,c=Math.cos(a),sn=Math.sin(a)*0.8,len=3+(hash(i,0)%3);for(let t=0;t<len;t++){if(fade&&(t&1))continue;const bend=t>=len-1?(i&1?1:-1):0;front.push({x:Math.round(p.x+c*(6+t)+(-sn)*bend),y:Math.round(p.y+sn*(6+t)+c*bend),color:FLASH});}}}}
 /* 2026-10-21: everything goes behind the sprites (keeper poses, the ball and its shadow stay exact) except the kick flash,
  which sits on the shooter's foot and would vanish behind him */
 const kickFront=front.filter(q=>q.kick);behind.push(...front.filter(q=>!q.kick));front.length=0;front.push(...kickFront);
 return {front,behind,effects:m.fx.map(f=>({kind:f.kind,moveId:f.moveId,age:(m.frame-f.frame)&255})),look:L?live.moveId:null,grooves:m.grooves.length};}
