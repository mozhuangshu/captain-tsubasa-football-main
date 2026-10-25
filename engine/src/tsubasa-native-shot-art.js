/** Canon-informed ball identities expressed as authored native-grid accents.
 * Source IDs below are ONLY original-game style references, not manga panels.
 * Every phase retains the exact native F00–03 football; accents are adaptations.
 * Dots are transparent; K/W/O are the original dry-ball palette 0F/30/26.
 * No image imports, history ribbons, antialiasing, random values, or RAM writes.
 * Each filled cell is ONE native pixel. Reflection and quarter-turns remain
 * integer-grid operations; the camera/physics owns the sprite's world anchor.
 */
import {ALL_BALL_FRAMES} from './sprite-frames.js';
import {appearanceTile,DISPLAY_NES_RGB} from './sprite-appearance.js';
export const NATIVE_SHOT_PALETTE=Object.freeze({K:DISPLAY_NES_RGB[0x0f],W:DISPLAY_NES_RGB[0x30],O:DISPLAY_NES_RGB[0x26]});
const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return o;};
export const TSUBASA_NATIVE_SHOT_ADAPTATIONS=freeze({
 drive:{name:'ドライブシュート',sourceStates:['0F','12','13'],sourceFrames:['18','0D','19','8D','8B','8C','0B','0C'],cycleTicks:4,introTicks:1,description:'原生普通足球；急降段带热血式残影（同帧、渐小渐暗、在人物后），无鸟身。'},
 tiger:{name:'猛虎射门',sourceStates:['17','22'],sourceFrames:['2D','31','32','33'],cycleTicks:4,introTicks:2,description:'飞行中画虎形（D-24 火焰虎形配色）。'},
 fire:{name:'火焰射门',sourceStates:['20'],sourceFrames:['40','41'],cycleTicks:2,introTicks:1,description:'持续黑白足球核；外部两拍橙白短火舌，不吞球、不留火迹。'},
 razor:{name:'剃刀射门',sourceStates:['1C'],sourceFrames:['29','2A','2B','2C'],cycleTicks:4,introTicks:1,description:'原生普通足球；一帧大角度横向急弯后对准远门柱，无刀刃球图。'},
 falcon:{name:'隼射门',sourceStates:['1B','29'],sourceFrames:['39','3A','3B'],cycleTicks:2,introTicks:1,description:'飞行中画隼形鸟身。'},
 eagle:{name:'秃鹰低平球',sourceStates:['04','11'],sourceFrames:['08','09','0A'],cycleTicks:3,introTicks:1,description:'飞行中画白色鹰形鸟身；低空时贴地前进。'},
 cannon:{name:'加农旋转球',sourceStates:['16'],sourceFrames:['25','26','27','28'],cycleTicks:4,introTicks:1,description:'出脚火球外壳后转原生足球（债务：本轮未改）。'},
 slider:{name:'滑翔下沉球',sourceStates:['09','11'],sourceFrames:['00','0D','0A','08','09'],cycleTicks:3,introTicks:1,description:'原生足球；实际 dipped 后下沉（债务：本轮未改）。'},
 skylab:{name:'空中飓风凌空脚射',sourceStates:['06','13'],sourceFrames:['0B','0C','0D'],cycleTicks:3,introTicks:1,description:'原生足球；人物用原版蹲伏/跳跃/倒挂出脚帧，用脚凌空射门。'},
 'drive-tiger':{name:'曲线猛虎联合球（阵容待接入）',sourceStates:['0F','17'],sourceFrames:['18','0D','32','33'],cycleTicks:4,introTicks:1,previewOnly:true,description:'仅预览：足球核＋短旋转与冲力线；未接入当前阵容，不计可玩。'},
 basic:{name:'基础射门',sourceStates:['00'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'原生普通足球四帧；无杜撰专属招式。'},
 overhead:{name:'倒挂金钩足球',sourceStates:['00'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'保留倒挂人物动作；球使用原生普通足球，不伪造必杀。'},
 acrobat:{name:'后空翻足球',sourceStates:['00'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'保留既有后空翻收尾；没有新增迪亚斯人物姿态。'},
 /* batch D: the football itself stays the native plain ball; Jito's 08 swelling rim is a companion (tsubasa-shot-companions.js) */
 'jito-power':{name:'次藤强力射门足球',sourceStates:['08','04'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'原生普通足球；岩壁08的橙色涨缩外圈作伴飞层画在球外。'},
 header:{name:'马加斯头球足球',sourceStates:['1A','28'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'原生普通足球；几内亚1A下压后28贴地平飞，不画1A的橙色椭球。'},
 combination:{name:'真实二触配合足球',sourceStates:['00'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'原生普通足球，保留实际二触；埃菲尔传球仍不替换球体。'},
 signature:{name:'个人招牌射门足球',sourceStates:['00'],sourceFrames:['00','01','02','03'],cycleTicks:4,introTicks:0,ordinary:true,description:'原生普通足球；2026-10-21 名单里原来没有专属招式的人的招牌射门，外观在 src/tsubasa-shot-impacts.js。'}
});

const CANON_SOURCES=freeze({
 drive:['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/'],
 tiger:['https://www.s-manga.net/items/contents.html?isbn=4-08-851871-3'],
 fire:['https://45th.captain-tsubasa.world/special/interview-01/'],
 razor:['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/'],
 falcon:['https://captaintsubasa.fandom.com/wiki/Peregrine_Falcon_Shot'],
 eagle:['https://captaintsubasa.fandom.com/wiki/Eagle_Shot'],
 cannon:['https://captaintsubasa.fandom.com/wiki/Louis_Napoleon/Techniques'],
 slider:['https://www.s-manga.net/items/contents.html?isbn=4-08-851882-9'],
 skylab:['https://captaintsubasa.fandom.com/wiki/Skylab_Hurricane'],
 'drive-tiger':['https://captaintsubasa.fandom.com/wiki/Kojiro_Hyuga/Techniques']
});
const ageOf=s=>Math.max(0,Math.floor(s.age)-3);
/** Gameplay age only: initial three integrations correspond to visible tick 0.
 * Repainting, pausing, history and wall time never advance this animation.
 * Bounds are at most 28×24 native pixels, including the unchanged football.
 */
export function getTsubasaNativeShotFrame(state){
 const spec=TSUBASA_NATIVE_SHOT_ADAPTATIONS[state?.effect];if(!spec||!Number.isFinite(state.age))return null;
 const tick=ageOf(state),direction=(state.velocity?.x??1)<0?-1:1;
 const stage=spec.ordinary?'ordinary':tick<spec.introTicks?'intro':'cycle';
 const index=spec.ordinary?tick%4:Math.max(0,tick-spec.introTicks)%spec.cycleTicks;
 const entry=getTsubasaNativePlainBallFrame((index%4)|(direction>0?128:0));
 const bodyPixels=entry.pixels,accentPixels=[],used=new Set();
 // Reserve the entire 16×16 body box, including its transparent corners.
 // This stronger-than-overlap rule keeps accent silhouettes outside the core.
 const dot=(x,y,c='W')=>{
  if(x>=-8&&x<=7&&y>=-8&&y<=7)return;
  if(direction<0)x=-x-1;
  if(x< -14||x>13||y< -12||y>11)throw new Error('Native accent exceeded bounds');
  const key=`${x},${y}`;if(used.has(key))return;used.add(key);
  accentPixels.push({x,y,color:NATIVE_SHOT_PALETTE[c]});
 };
 const line=(x,y,dx,dy,n,c='W')=>{for(let i=0;i<n;i++)dot(x+i*dx,y+i*dy,c);};
 const patch=(x,y,rows)=>rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(c!=='.')dot(x+i,y+j,c);}));
 const power=()=>{
  patch(-13,-7,['KK...','KOWK.','.KOWK','..KK.']);
  patch(-13,4,['..KK.','.KOWK','KOWK.','KK...']);
  line(-14,-1,1,0,5,'K');line(-14,0,1,0,5,'W');line(-14,1,1,0,5,'O');
 };
 // Disconnected balanced marks do not claim an unverified physical spin sign.
 const neutralSpin=()=>{line(-5,-10,1,0,3);line(3,9,1,0,3);};
 const downLines=()=>{line(-9,-11,0,1,3);line(8,-10,0,1,3,'O');};
 let accentMode='none';
 if(!spec.ordinary&&(stage==='cycle'||(state.effect==='tiger'&&tick===1))){
  const odd=index%2;
  switch(state.effect){
   case 'drive':
    accentMode=(state.velocity?.z??0)>0?'upspin-rising':'upspin-descending';
    line(-5+odd,-10,1,0,4);line(2-odd,9,1,0,4,'O');
    // Rearward short diagonal follows vertical movement; body never shifts.
    line(-12,(state.velocity?.z??0)>0?8:-10,1,(state.velocity?.z??0)>0?-1:1,3);break;
   case 'tiger':
    accentMode='compact-power';power();if(index>=2)line(-11,-1,0,1,3,'O');break;
   case 'falcon':
    accentMode='short-speed';line(-13+odd,-5,1,0,4);line(-14+odd,0,1,0,5);line(-12+odd,5,1,0,3);break;
   case 'fire':
    accentMode='external-flame';
    // Connected tapered tongues behind the ball: an exterior flame bank,
    // never a replacement fireball or a history-dependent trail.
    patch(-14,-8,odd?[
     '.....O','....OO','..OOWO','...OWO','..OWWO','OOOWWO',
     '.OWWWO','..WWWO','OOWWWO','.OWWWO','..OWWO','OOOWWO',
     '..OWWO','...OWO','..OOWO','....OO','.....O'
    ]:[
     '.....O','...OOO','....WO','..OOWO','...WWO','.OOWWO',
     'OOOWWO','.OWWWO','..WWWO','OOOWWO','.OWWWO','..OWWO',
     '...WWO','..OOWO','....WO','...OOO','.....O'
    ]);
    patch(-8,-11,odd?['O....','OOO..','.OWOO']:['.O...','.OO..','OOWOO']);
    patch(-8,9,odd?['.OWOO','OOO..','O....']:['OOWOO','.OO..','.O...']);break;
   case 'razor':
    accentMode='neutral-cut';
    // Two separated quarter-arcs, never a complete crescent or weapon.
    patch(-12,-11,odd?['....WWW','..WW...','.WW....','WW.....','W......']:['...WWW.','..WW...','.WW....','WW.....','W......']);
    patch(7,7,odd?['.....W.','....WW.','...WW..','.WW....','WWW....']:['.....W.','....WW.','...WW..','..WW...','.WWW...']);break;
   case 'eagle':
    accentMode=Number.isFinite(state.position?.z)&&state.position.z<=16?'low-ground-speed':'airborne-core';
    if(accentMode==='low-ground-speed'){line(-13+index,5,1,0,3);line(-11+index,9,1,0,4,'O');}break;
   case 'cannon':
    accentMode='compact-neutral-spin';
    if(index%2===0)neutralSpin();else{line(-10,-4,0,1,3);line(9,2,0,1,3,'O');}
    line(-13,0,1,0,3);break;
   case 'slider':
    accentMode=state.dipped===true?'actual-dip':'neutral-longitudinal-spin';
    if(state.dipped===true)downLines();else{line(-4+index,-9,1,0,3);line(1-index,9,1,0,3,'O');}break;
   case 'skylab':
    accentMode=(state.velocity?.z??0)<0?'headed-downward':'headed-core';
    if((state.velocity?.z??0)<0)downLines();break;
   case 'drive-tiger':accentMode='preview-only-drive-power';neutralSpin();power();break;
  }
 }
 const pixels=[...bodyPixels,...accentPixels];
 const bounds={minX:Math.min(...pixels.map(p=>p.x)),maxX:Math.max(...pixels.map(p=>p.x)),minY:Math.min(...pixels.map(p=>p.y)),maxY:Math.max(...pixels.map(p=>p.y))};
 return {...entry,frameId:spec.ordinary?entry.frameId:`${state.effect}-${accentMode}-${index}`,animationTick:tick,frameIndex:index,bodyFrameIndex:index%4,stage,direction,bodyPixels,accentPixels,pixels,bounds,width:bounds.maxX-bounds.minX+1,height:bounds.maxY-bounds.minY+1,palette:NATIVE_SHOT_PALETTE,accentMode,
  sourceStates:spec.sourceStates,sourceFrames:spec.sourceFrames,cycleTicks:spec.cycleTicks,introTicks:spec.introTicks,
  artEvidence:{canonSources:CANON_SOURCES[state.effect]??[],nativeStyleReference:{sourceStates:spec.sourceStates,sourceFrames:spec.sourceFrames},interpretation:'Authored native-grid adaptation; colors, accent geometry and timing are not traced manga/anime frames.',previewOnly:spec.previewOnly===true}};
}
/** Exact existing ordinary F00–03 dry-palette body for lifecycle fallback.
 * Decodes existing native data; this does NOT redraw or change the old 2x art.
 * The original tile anchor is the foot at y=0; public offsets are ball-centred.
 */
export function getTsubasaNativePlainBallFrame(frame=0){
 const index=frame&3,f=ALL_BALL_FRAMES[index],pixels=[],direction=frame&128?1:-1;
 const signed=n=>n&128?n-256:n;
 for(let i=0;i<f.tiles.length;i++){
  const tile=appearanceTile(f.tiles[i],{chrPages:[8,20,32,9]}),attr=f.attributes[i];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const color=tile[(attr&128?7-y:y)*8+(attr&64?7-x:x)];if(!color)continue;
   const localX=signed(f.dx[i])+x;
   pixels.push({x:direction<0?-localX-1:localX,y:signed(f.dy[i])+y+9,color:[null,NATIVE_SHOT_PALETTE.K,NATIVE_SHOT_PALETTE.W,NATIVE_SHOT_PALETTE.O][color]});
  }
 }
 return {frameId:`native-plain-${index}`,animationTick:index,frameIndex:index,stage:'plain',direction,grid:1,sourceStates:['00'],sourceFrames:[`0${index}`],cycleTicks:4,introTicks:0,width:16,height:16,pixels};
}
