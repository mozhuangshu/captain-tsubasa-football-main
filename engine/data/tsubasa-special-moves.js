/** Captain Tsubasa canon catalogue. Trajectory numbers are a six-a-side game
 * adaptation, never animation measurements. A named move is enabled only after
 * its identity is source-backed and its real gameplay gate is implemented. */
import {TSUBASA_ROSTERS} from './tsubasa-team-data.js';
import {WAKASHIMAZU_CHOP_HD_V3,KEEPER_MISREAD_HD_FINAL} from './tsubasa-keeper-hd-poses.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const tv='https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/episodes/index_2.html';
const move=(id,name,kind,trajectory,effect,trigger,sourceUrls,extra={})=>({id,name,kind,trajectory,effect,trigger,status:'implemented',sourceUrls,partners:[],...extra});
/** Must v1 M-1..M-5 / REPO-AUDIT §5B: per-move native 热血 entry (state id at
 * $050F) whose original animation root/art the move borrows. Only applied when
 * Tsubasa special moves are enabled for the session; the plain engine and the
 * 2940-frame ordinary-ball baseline never see these ids. */
/** D-24: native physics subtype override per move (index into SPECIAL_PHYSICS). */
export const TSUBASA_NATIVE_SUBTYPE_BY_MOVE=Object.freeze({});/* 2026-10-18: per-state subtypes now live in TSUBASA_NATIVE_CHAIN_OVERRIDES */
/** D-29 (MOVE-MAPPING-v1 §3): moves that finish with native state 07's first half (subtype 1
 * dive, Vz -8 from SPECIAL_PHYSICS). The dive starts when the remaining distance to the goal
 * line equals the height, so the -8 dive bottoms out at the goal mouth. endAtBottom: the 07->10
 * ground-skim transition is replaced by the native "no next state" end (Skylab). */
/** Art slot for later authored frames (MOVE-SOURCES-drive-skylab.md): drive-shot will become
 * project's golden hawk, drawn on native bird states 1B/25/26/29. Until the frames land in
 * TSUBASA_AUTHORED_MOVE_ART the existing ball placeholder renders; adding them there plus a
 * native entry here is the only wiring needed. */
export const TSUBASA_PENDING_AUTHORED_ART=Object.freeze({'drive-shot':Object.freeze({form:'golden-hawk',nativeBasis:Object.freeze([0x1b,0x25,0x26,0x29]),status:'wired',deliverable:true,frames:Object.freeze(['F39','F3A','F3B']),palette:Object.freeze([0x0f,0x28,0x38]),mirrored:false,note:'src/tsubasa-drive-hawk-art.js; appears mid-flight, loops the wing flap'}),
 'skylab-hurricane':Object.freeze({form:'skylab-launch',source:'shots-v2/skylab-launch/v4/',status:'wired-v4',deliverable:true,
  // D-29 mandatory pose sequence; each phase takes per-twin authored frames when project delivers them.
  phases:Object.freeze(['springboard','launch','peak-shot','dive'])}),
 // D-31: the keeper fooled by the ドライブシュート looks up at empty air: project's signed keeper-misread v2
 // (reuses existing keeper frame 3), src/tsubasa-drive-keeper-art.js.
 // Runtime: getTsubasaDriveKeeperLookUp(r) gives the keeper slot while he looks up.
 // D-32: Wakashimazu's hand-chop punch, project's signed wakashimazu-chop v2 (reuses keeper frame 13). Runtime: getTsubasaDriveKeeperPunch(r).
 'drive-keeper-punch':Object.freeze({form:'wakashimazu-punch',source:'shots-v2/drive-hawk/wakashimazu-chop/v2/',status:'wired',deliverable:true,frames:Object.freeze(['wakashimazu-chop-v2'])}),
 'drive-keeper-look-up':Object.freeze({form:'keeper-look-up',source:'shots-v2/drive-hawk/keeper-misread/v2/',status:'wired',deliverable:true,frames:Object.freeze(['keeper-misread-v2'])})});
/** D-29 shooting distance for Skylab (oriented x, i.e. toward the attacked goal): the native
 * selectShotSpecial zone just outside the goal-mouth band, group 4 = [0x290,0x350), "in front of
 * the box". It lies inside the zone where tiger's native per-player special can fire (groups 2..4,
 * [0x160,0x350)); that wider tiger zone also covers midfield. */
/** D-33 hook: HD keeper poses from project (same character, same art: hair and palette of the character's HD
 * art in art/hd-runtime.js). Each entry is an HD frame in art/hd-runtime.js format (pixels/materials/shade, half-pixel), drawn through the
 * keeper's own HD skin so hair and palette match his other frames.
 * null = not delivered yet: the keeper keeps his own HD frames instead of the shared-base frame. */
export const TSUBASA_KEEPER_HD_POSES=Object.freeze(Object.fromEntries(['morisaki','wakabayashi','kato','wakashimazu','muller','amoros','hernandez'].map(id=>[id,Object.freeze({misread:KEEPER_MISREAD_HD_FINAL[id]??null/* hd/v6-final; kato, amoros: hd/v6-extra-final */,chop:id==='wakashimazu'?WAKASHIMAZU_CHOP_HD_V3/* signed hd/v3 */:null})])));// every keeper with HD art (art/hd-runtime.js)
/** D-33: unnamed/generic keepers' HD misread (hd/v6-final generic-keeper). */
export const TSUBASA_GENERIC_KEEPER_HD_POSES=Object.freeze({misread:KEEPER_MISREAD_HD_FINAL.generic,chop:null});
/** D-36 razor shot path (project ball-final): straight ticks, then heading 0->25->45 deg and hold. Curve direction: no default. */
/* D-62 (project): sharp, large-angle lateral bend. Built on the Nekketsu curve-type special (ばななわにしゅーと 弯曲射门) mechanism:
 * at a special-state transition the native code re-aims the ball on its 16-direction table in ONE frame (no gradual arc).
 * Razor: straight ticks, then a single-tick snap of 3 table steps (3 x 22.5 = 67.5 deg) toward the curve side, hold to the far
 * post line, straighten into the net. The banana's exact state record is not decoded: angle = table-step count is a team call (未核). */
export const TSUBASA_RAZOR_STRAIGHT_TICKS=8,TSUBASA_RAZOR_TURN_DEG=Object.freeze([0,67.5]);
export const TSUBASA_RAZOR_KICK=Object.freeze([[10,3],[33,1],[11,2],[13,4]]);// kick-v1: reuses the original shot motion, not claimed to match the anime
/** D-37 (team call, unconfirmed; not claimed to match the anime). Default curve: bend away from the keeper: keeper standing
 * high (world y < goal centre) -> curve down, low -> curve up. Goal mouth from the native goal-frame routine (goal.js $BAB6):
 * posts at y 0xA4 / 0xE4. The ball holds 45 deg only until it is lined up with the inside of the far post, then straightens
 * into the net. Goal line: the native field boundary for the ball (goal.js $B7BA: x 864+(y-48)>>3 right, 160-(y-48)>>3 left). */
export const TSUBASA_RAZOR_GOAL=Object.freeze({centerY:0xc4,topPostY:0xa4,bottomPostY:0xe4,postInset:8,maxFramesToGoalLine:40});
/** D-37 razor keeper f15 per keeper: 'hd' = project's HD f15 keeper-v1.1 (src/tsubasa-keeper-f15-hd.js), 'native' = the original
 * assembler's f15 tiles. One mode per keeper for the whole match (locked on first use). project approved all eight v1.1 frames
 * (2026-10-13): every keeper, generic ones via 'generic-keeper', is HD - HD misread then HD f15, no native frames on the razor. */
export const TSUBASA_RAZOR_KEEPER_F15=Object.freeze(Object.fromEntries(['wakabayashi','morisaki','muller','wakashimazu','generic-keeper','hernandez','kato','amoros'].map(id=>[id,'hd'])));
export const TSUBASA_SHOOTING_RANGE=Object.freeze({from:0x290,to:0x350});
export const TSUBASA_NATIVE_DIVE_BY_MOVE=Object.freeze({});/* drive and skylab: own native chains (TSUBASA_NATIVE_CHAIN_OVERRIDES) */
/** D-25: special moves that keep their power at the goal. A goalkeeper whose native keeper
 * score (HP before this contact's damage + native def bonus [20,15,12,8] + defensive-move
 * resistance) is >= threshold saves normally (native path); below it the keeper takes the
 * native 0x59 knock-back and the ball goes on (no frame-parity block). 95 = D-10 top-3
 * keepers (Hernandez 100, Wakabayashi 100, Wakashimazu 95; Muller 85/90 is 4th). N-3 balance. */
export const TSUBASA_KEEPER_SAVE_THRESHOLD_BY_MOVE=Object.freeze({'tiger-shot':95,'drive-shot':95,'cannon-shot':95,/* batch D: a keeper below 95 who meets it is carried into the net with the ball (canon: キーパーごとゴールに押し込む) */'jito-power-shot':95});
/* D-38 (project, team call, unverified): M-5 cannon (拿破仑) reuses the D-25 threshold: below 95 the keeper takes native 0x59 and
 * concedes; at/above it the native shot-20 ending (native save path). Only 'used vs England, ep.12' is verified. */
/** M-5/D-38: canvas-drawn ball art keyed by MOVE (never by native shot id: fire-shot M-11 shares 0x20 and keeps native art). */
export const TSUBASA_CANVAS_BALL_ART_BY_MOVE=Object.freeze({'cannon-shot':'cannon-v2.1'});
export const TSUBASA_CANNON_FIREBALL_TICKS=4;
/** M-8 / Must D-39 (revised 2026-10-13 19:00, team call): triangle shot. Distances from the post point, Euclidean px.
 * Timings in native logic frames. Art/shake = 美术演绎、未核. header/volley strike delays = RAM-measured frame-13 offsets
 * of native actions 0x34 / 0x38 after the action is set fresh (notes shots/triangle-v1/README.md). */
// M-8 D-39. approachSpeed (<=4 px push-off approach), volleyAdvance (48 px run-in), the lift/pass path timings and the 石崎 snap
// are 美术演绎、未核; the down/stunned set lives in src/tsubasa-triangle-shot.js (团队拍板、未核).
export const TSUBASA_TRIANGLE=Object.freeze({postReach:0x30,ishizakiReach:0x40,approachSpeed:4,kickFrames:3,shakeFrames:3,shakePattern:Object.freeze([1,-1,1]),shakenFrames:4,
 headerStrikeDelay:8,volleyStrikeDelay:8,headZ:34,headZOffset:16,headReach:Object.freeze({planar:20,z:20}),volleyAdvance:48,volleyReachX:8,volleyZ:22,volleyZOffset:4,volleyReach:Object.freeze({planar:22,z:22}),
 gravity:0x80,f3Offset:30,f3Lift:14,art:Object.freeze({f1SoleX:15,f2SoleX:18})});
/* D-33: ドライブシュート save threshold 95, base ability only (D-28). In the middle-school arc only Wakashimazu (95)
 * reaches it, and D-32 governs him (first drive scores, later ones are chopped); every other keeper is fooled. */
/* D-32/D-33: Wakashimazu's chop threshold from his second ドライブシュート on = the D-33 save threshold 95 (base ability). */
export const TSUBASA_DRIVE_PUNCH_THRESHOLD=95;
/* native entry per move (docs/SPECIAL_SHOT_NATIVE_MAPPING.md). Falcon = 04 (Japan #0: subtype 4 level
 * straight), eagle = 07->10 (subtype 1 press down -> subtype 4 skim; 10's own art is the thin ground line),
 * cannon = 20 (Italy: subtype 4 straight). Was falcon 1B (Senegal bird) and eagle 29 (bird successor). */
export const TSUBASA_NATIVE_ENTRY_BY_MOVE=Object.freeze({'drive-shot':0x0f/* Japan #11 かるろす: 0F rise -> 12 dive */,'slider-shot':0x11,'skylab-hurricane':0x11/* Japan #5 げんえい's 09 chain from its level leg: 11 -> 12 */,'tiger-shot':0x1a/* Guinea: 1A press down -> 28 */,'falcon-shot':0x04,'running-volley-falcon':0x04,'eagle-shot':0x07,'razor-shot':0x05/* Japan #1 よりつね: 05 level leg, then the re-aim (batch B) */,'cannon-shot':0x20,'jito-power-shot':0x08/* batch D: Japan #4 いわかべ (the big rock-wall defender): 08 hover -> 04 level */,'margus-power-header':0x1a/* batch D: Guinea 1A press down -> 28, sped up to 16 like the tiger (TSUBASA_NATIVE_CHAIN_OVERRIDES) */,'fire-shot':0x20/* West Germany sits in Italy's native slot */,
 /* 2026-10-21: the 22 signature shots of the former no-move roster (docs/SHOT_LOOK_CARDS.md section 6) */
 'taki-compact-shot':0x0b,'kisugi-scorer-shot':0x06,'izawa-surprise-shot':0x0e,'takasugi-power-shot':0x0a,'urabe-sliding-shot':0x1e,'kishida-shark-shot':0x1d,'nakayama-long-shot':0x0c,'nishio-quartet-shot':0x21,'narita-captain-shot':0x1f,'sawaki-quick-shot':0x13,'oda-dosanko-shot':0x09,'kaneda-snowfield-shot':0x0c,'wakamatsu-quick-shot':0x06,'sawada-solid-shot':0x0b,'sorimachi-shadow-shot':0x19,'ichinose-bullet-shot':0x03,'sanada-header-smash':0x01,'honma-precise-shot':0x04,'schester-gyro-shot':0x16,'bossis-wild-shot':0x17,'pascal-slide-step-shot':0x1c,'galvan-canon':0x21});
/** per-shot parameter overrides of a native chain (the native tables stay untouched; applied only while that
 * Tsubasa move is in flight):
 *  timerReference: {state: x} - the distance timer of that state (subtypes 2/7, 04:BC7F) counts to x instead of
 *                  the native 688 (mirrored 1024-x when shooting left), i.e. where the phase ends
 *  endAfter: [state]          - that state's successor becomes END (native: clear subtype and ball power)
 *  diveState: state           - the state that is the dive (keeper look-up D-31, dive afterimages D-62)
 *  subtype / vz: {state: n}   - that state flies native subtype n / starts with vertical speed n
 *  next: {state: s}           - that state's successor is s instead of the native one
 *  razorBend                  - batch B razor: the entry leg is aimed outside the post on the side away from the curve
 *                               and its distance timer ends at the bend point (launch + ahead, clamped to [min, max]);
 *                               the switch to turnState re-aims natively (04:BB1E aimShot) at the goal: the sharp turn
 * Drive (2026-10-18, docs/SPECIAL_SHOT_NATIVE_MAPPING.md section 8): かるろす' 0F ramps up until x=820, about 70
 * in front of the goal line, then 12 dives at the native -8; no 13 rebound after it lands. */
export const TSUBASA_NATIVE_CHAIN_OVERRIDES=Object.freeze({
 'drive-shot':Object.freeze({timerReference:Object.freeze({0x0f:820}),endAfter:Object.freeze([0x12]),diveState:0x12}),
 /* batch A (section 9). slider / skylab: げんえい's 11 (level) -> 12 (dive) with the drive's dive point; they differ by launch height */
 /* slider: dive point 820 like the drive; from launch height (~46) the dip lands just short of the line and rolls in
  * (measured: 3/3 goals; at 856 the keeper takes it high, 0/3) */
 'slider-shot':Object.freeze({timerReference:Object.freeze({0x11:820}),endAfter:Object.freeze([0x12]),diveState:0x12}),
 'skylab-hurricane':Object.freeze({timerReference:Object.freeze({0x11:820}),endAfter:Object.freeze([0x12]),diveState:0x12}),
 /*  subtype: {state: subtype} - that state flies another native subtype; vz: {state: v} - and starts with vertical speed v.
  * tiger: Guinea 1A presses to the grass, 28 then runs subtype 3 (planar 16, the only uncapped one) level on the grass;
  * fire: Italy 20 at subtype 3 speed, level at launch height (cannon flies the same 20 at the native 8) */
 'tiger-shot':Object.freeze({subtype:Object.freeze({0x28:3}),vz:Object.freeze({0x28:0})}),
 'fire-shot':Object.freeze({subtype:Object.freeze({0x20:3}),vz:Object.freeze({0x20:0})}),
 /* batch D (user 2026-10-19): Margus' header runs tiger's chain the tiger way, 1A presses to the grass, 28 at subtype 3 (16) level on it */
 'margus-power-header':Object.freeze({subtype:Object.freeze({0x28:3}),vz:Object.freeze({0x28:0})}),
 /* batch B: よりつね' 05 (subtype 7, level) -> Argentina's 1C (subtype 4, level) instead of 05's native 2A (stop and rise) */
/* 2026-10-21 roster: Takasugi's 0A is the native slow shot (subtype 8, planar 4): flown at the normal level 4;
  * Galvan's canon flies Germany's 21 at subtype 3 (16) level like the fire shot */
 'takasugi-power-shot':Object.freeze({subtype:Object.freeze({0x0a:4})}),
 'galvan-canon':Object.freeze({subtype:Object.freeze({0x21:3}),vz:Object.freeze({0x21:0})}),
 'razor-shot':Object.freeze({next:Object.freeze({0x05:0x1c}),razorBend:Object.freeze({entry:0x05,turnState:0x1c,ahead:80,min:760,max:860,outside:12})}),
});
/** moves that fly exactly the native chain of their entry: no adapted velocity/gravity at all */
export const TSUBASA_NATIVE_PHYSICS_MOVES=Object.freeze(new Set(['falcon-shot','running-volley-falcon','eagle-shot','cannon-shot','drive-shot','slider-shot','skylab-hurricane','tiger-shot','fire-shot','razor-shot',/* batch C: the move is the player action; the ball flies the generic native chain the game chose (01/02 -> 03) */'overhead-kick','diaz-backflip-shot',/* batch D */'jito-power-shot','margus-power-header',/* 2026-10-21 roster */'taki-compact-shot','kisugi-scorer-shot','izawa-surprise-shot','takasugi-power-shot','urabe-sliding-shot','kishida-shark-shot','nakayama-long-shot','nishio-quartet-shot','narita-captain-shot','sawaki-quick-shot','oda-dosanko-shot','kaneda-snowfield-shot','wakamatsu-quick-shot','sawada-solid-shot','sorimachi-shadow-shot','ichinose-bullet-shot','sanada-header-smash','honma-precise-shot','schester-gyro-shot','bossis-wild-shot','pascal-slide-step-shot','galvan-canon']));
export const TSUBASA_MOVE_CATALOG=freeze({
 'basic-shot':move('basic-shot','基础射门','shot','按原瞄准方向的常规弹道','basic','原射门资格；不冠以专属招式名称',[],{status:'basic'}),
 'drive-shot':move('drive-shot','ドライブシュート（ドライブシュート）','shot','上旋高弧线；真实高度先升后急降，不左右蛇形','drive','沿用原高空特殊射门资格',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/','https://www.soccer-king.jp/news/japan/japan_other/20190123/896168.html']),
 'tiger-shot':move('tiger-shot','猛虎射门','shot','强劲近直线；无火焰、无自动追踪','tiger','沿用原高空特殊射门资格',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/episodes/']),
 'razor-shot':move('razor-shot','剃刀射门','shot','平面侧旋单弯；与纵向下坠区分','razor','沿用原高空特殊射门资格',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/','https://www.soccer-king.jp/news/japan/20181206/872555.html']),
 'falcon-shot':move('falcon-shot','隼射门','shot','快速近直线射门','falcon','沿用原高空特殊射门资格',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/episodes/index_3.html']),
 'running-volley-falcon':move('running-volley-falcon','不停球跑动凌空隼射门','shot','原碰撞确认跑动迎来球，不停球快射','falcon','真实同队来球、跑速≥1、低空球、原碰撞直接请求射门且原特殊资格通过',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/episodes/index_3.html'],{requiresContext:true,evidence:'A1; real full-host run/jump/one-touch volley controller chain verified'}),
 'fire-shot':move('fire-shot','火焰射门','shot','高速旋转直射；火星为外观，碰撞位置只有真实球','fire','沿用原高空特殊射门资格',['https://ball-ha-tomodachi.com/jryouth/story/32.html']),
 'drive-tiger':move('drive-tiger','曲线猛虎联合射门','combination','同一点两人射门，前段上旋后向下坠','drive-tiger','翼和日向同队在场、在球旁同时处于射门动作；主射手满足原资格',['https://ball-ha-tomodachi.com/jryouth/story/15.html'],{partners:['tsubasa','hyuga'],status:'pending',availability:'unavailable-roster',reason:'已有同帧触球适配代码，但当前球队未提供翼和日向同队的实际阵容，不计可玩技能'}),
 'skylab-hurricane':move('skylab-hurricane','空中飓风','combination','立花兄弟实际搭档助跳后的高空向下头球','skylab','真实同队双胞胎叠人→搭档起跳助推→头球34/38且原强射1/2资格；不同步不触发',[tv],{partners:['tachibana_masao','tachibana_kazuo'],evidence:'A1/A2; real full-host stack-lift-header controller chain verified'}),
 'eiffel-attack':move('eiffel-attack','埃菲尔攻击（配合识别）','pass','真实短中长传递进完成后显示合作标记；无加力和自动配合','combination','皮埃尔与拿破仑同队在场，三次交替原生传球实际接到且距离递增；可用原队友回传指令',['https://ball-ha-tomodachi.com/jryouth/story/23.html'],{partners:['pierre','napoleon'],requiresContext:true,evidence:'A1; conservative three-pass recognition; single-controller native-AI full-host chain verified; no power bonus'}),
 'eagle-shot':move('eagle-shot','老鹰射门','shot','迅速压低贴草皮飞行，末段抬起；与隼射门直线区分','eagle','沿用原特殊资格；高空触发会先压低球，保持原碰撞',['https://10.tsubasa.shop/categories/6217253','https://www.soccer-king.jp/news/game/20220507/1644203.html'],{evidence:'official-animation-merchandise-name; licensed-game-low-trajectory; adaptation-not-frame-exact'}),
 'cannon-shot':move('cannon-shot','加农射门（保守适配）','shot','强旋转近直线重炮，无无依据横弯','cannon','沿用原特殊射门资格',['https://ball-ha-tomodachi.com/special/comment.html','https://captaintsubasa-csgame.bn-ent.net/character/index02.html']),
 'slider-shot':move('slider-shot','滑翔射门（保守适配）','shot','门将手前小幅急落；尚待更强动画轨迹证据','slider','沿用原特殊射门资格；细节未声称逐帧还原',['https://ball-ha-tomodachi.com/jryouth/story/20.html','https://plaza.rakuten.co.jp/bleachfan25tk/diary/202403060000/'],{evidence:'B+C; conservative-canon-adaptation'}),
 'overhead-kick':move('overhead-kick','倒挂金钩','shot','真实倒挂动作后射门；基础足球技术，不冠独创必杀名','overhead','仅翼/三杉/佐野真实倒挂0x32/0x46、原通用强射1/2或专属门槛通过',['https://www.soccer-king.jp/news/others/20181113/856834.html'],{requiresContext:true,isNamedCanonMove:false,evidence:'A2 production-committee animation recap; ordinary football technique'}),
 'jito-power-shot':move('jito-power-shot','强力射门（次藤）','shot','巨体蓄力重炮：原版岩壁08先停球蓄力再平射；门将正面接住也会连人带球被推进门','jito-power','沿用原特殊射门资格',['https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/episodes/index_2.html','https://ja.wikipedia.org/wiki/%E3%82%AD%E3%83%A3%E3%83%97%E3%83%86%E3%83%B3%E7%BF%BC%E3%81%AE%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9'],{isNamedCanonMove:false,evidence:'A2 official episode 41 summary (dump-truck charge) + B ja.wikipedia (キーパーごとゴールに押し込むシュート); descriptive name'}),
 'margus-power-header':move('margus-power-header','强力头球（马加斯）','shot','长身前锋的砸地头球：原版几内亚1A下压到草地后28平飞','header','马加斯真实头球0x34且原通用强射1/2资格通过',['https://ja.wikipedia.org/wiki/%E3%82%AD%E3%83%A3%E3%83%97%E3%83%86%E3%83%B3%E7%BF%BC%E3%81%AE%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9'],{requiresContext:true,isNamedCanonMove:false,evidence:'B ja.wikipedia (ドイツの核弾頭, 長身を活かしたヘディング); no named anime technique, Tecmo ブラストヘッド is game-only and not used; descriptive name'}),
 'jito-sano-combination':move('jito-sano-combination','次藤—佐野配合（保守适配）','combination','次藤远射飞行至少96像素，佐野门前原生碰撞二触改向；保留原球速度、重力和威力计算','combination','同队实际在场、次藤来球与佐野原合法射门碰撞；已接受的原队友射门指令可在近门低球窗口有限辅助请求原踢球动作',['https://www.soccer-king.jp/news/japan/japan_other/20190123/896168.html'],{partners:['jito','sano'],requiresContext:true,evidence:'A2; conservative adaptation; native accepted teammate-shot command action-request assistance; single-controller full-host second contact verified'}),
 'diaz-backflip-shot':move('diaz-backflip-shot','后空翻射门（动作简化）','shot','真实原生后空翻姿态与触球；只实现完整杂技连段的后空翻收尾','acrobat','迪亚斯原32/46连续2→3→4→26姿态后真实脚部碰撞/出脚事件，且原射门资格通过',['https://ball-ha-tomodachi.com/jryouth/story/14.html'],{requiresContext:true,evidence:'A1; existing backflip final segment retained; new full acrobatic poses excluded by user'}),
 'acrobat-shot':move('acrobat-shot','杂技射门','shot','侧翻、后手翻、后空翻之后射门；没有虚构蛇形球','acrobat','沿用现有后空翻，不再新增侧翻/后手翻姿态',['https://ball-ha-tomodachi.com/jryouth/story/14.html'],{status:'out-of-scope',reason:'用户取消新增人物动作；沿用现有后空翻，不再新增侧翻/后手翻姿态',availability:'excluded-by-user'}),
 "karate-save":move("karate-save","空手道扑救","keeper",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"karate-reach",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://ball-ha-tomodachi.com/jryouth/chara/06.html"],{evidence:"official-animation-character",isNamedCanonMove:false}),
 'triangle-jump':move('triangle-jump','三角跳（保守适配）','keeper','身体实际触柱后真实Y反向跨门与有限跳高，不瞬移、不必扑','post-rebound-jump','真实GK若岛津、原跳扑30/52/54、向柱移动且原柱几何接触、对侧高球与体力门槛',['https://www.takaratomy.co.jp/products/tsubasa_fcg/howto/faq_card.html?card=CT-01','https://emira-t.jp/fantasy/25782/'],{evidence:'B/C licensed-name + secondary original-manga action; conservative-adaptation-not-animation-frame-reproduction',isNamedCanonMove:true}),
 "sggk-guard":move("sggk-guard","SGGK门前封堵","keeper",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"front-catch",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://ball-ha-tomodachi.com/jryouth/story/29.html"],{evidence:"official-animation-episode; title-style-not-named-technique",isNamedCanonMove:false}),
 "power-catch":move("power-catch","强力接球","keeper",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"power-catch",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://ball-ha-tomodachi.com/jryouth/story/31.html"],{evidence:"official-animation-episode; descriptive-adaptation-name",isNamedCanonMove:false}),
 "face-block":move("face-block","脸部挡球","defense",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"face-block",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://prtimes.jp/main/html/rd/p/000000601.000099047.html", "https://www.soccer-king.jp/news/japan/japan_other/20181225/872448.html"],{evidence:"licensed-animation-promotion; animation-frame-check-pending",isNamedCanonMove:true}),
 "marking-slide":move("marking-slide","盯防铲断（早田特色）","defense",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"low-slide",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://www.soccer-king.jp/news/world/wc/20221118/1706524.html", "https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/"],{evidence:"official-animation-character; conservative-canon-adaptation; descriptive-name",isNamedCanonMove:false}),
 "power-block":move("power-block","身体拦截","defense",'保留原碰撞、体力与扑救成败；仅有限范围或对抗修正',"body-block",'真实对应防守/门将动作、球近身、体力和冷却条件',["https://www.tv-tokyo.co.jp/anime/captaintsubasa2018/chara/middle/"],{evidence:"official-animation-character; descriptive-adaptation-name",isNamedCanonMove:false}),
 'perfect-save':move('perfect-save','稳健扑救（埃尔南德斯特色）','keeper','原门区扑救有限对抗与范围修正；允许失手和强球击穿','precision-catch','实际GK且门前敌方近身来球、原扑救窗口',['https://ball-ha-tomodachi.com/jryouth/chara/12.html','https://ball-ha-tomodachi.com/jryouth/story/11.html'],{isNamedCanonMove:false}),
 'aerial-tackle':move('aerial-tackle','空中铲断（卡尔茨特色）','defense','本人和敌持球者都在空中时真实碰撞；弱对强仍会反弹','aerial-slide','原空中动作3B/42、高度与距离通过且对手真实持球',['https://ball-ha-tomodachi.com/jryouth/story/35.html','https://ball-ha-tomodachi.com/jryouth/chara/10.html'],{isNamedCanonMove:false}),
 'taki-compact-shot':move('taki-compact-shot','技巧短射（泷）','shot','边路盘带后的紧凑快射：原版日本 7 号 0B 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=132'],{isNamedCanonMove:false,evidence:'DT skill: Technical Compact Shot (also Silver Duo with Kisugi)'}),
 'kisugi-scorer-shot':move('kisugi-scorer-shot','射手嗅觉射门（来生）','shot','抢点射手的果断一脚：原版日本 2 号 06 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=134'],{isNamedCanonMove:false,evidence:"DT skill: The Scorer's Sense"}),
 'izawa-surprise-shot':move('izawa-surprise-shot','出其不意射门（井泽）','shot','中场突然插上：原版日本 10 号 0E 平射→14 悬停→再出','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=130'],{isNamedCanonMove:false,evidence:'DT skill: Unexpected Attack'}),
 'takasugi-power-shot':move('takasugi-power-shot','力量射门（高杉）','shot','后卫大力远射：原版日本 6 号 0A，改成正常速度的平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=126'],{isNamedCanonMove:false,evidence:'DT skills: Power Shot / Wild Shot'}),
 'urabe-sliding-shot':move('urabe-sliding-shot','滑铲射门（浦边）','shot','铲着地把球捅出去的低平射：原版墨西哥 1E 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=7'],{isNamedCanonMove:false,evidence:'DT skill: Sliding Shot'}),
 'kishida-shark-shot':move('kishida-shark-shot','鲨鱼射门（岸田）','shot','像鲨鱼窜出水面一样弹跳前进：原版巴西 1D 弹跳链','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=6'],{isNamedCanonMove:false,evidence:'DT skill series: Shark Tackle / Shark Dribble (creative shot from the series name)'}),
 'nakayama-long-shot':move('nakayama-long-shot','远射重炮（中山）','shot','大友后卫的长距离平射：原版日本 8 号 0C','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=3'],{isNamedCanonMove:false,evidence:'creative: DT lists only Strong Tackle'}),
 'nishio-quartet-shot':move('nishio-quartet-shot','大友四重奏射门（西尾）','shot','大友四人组压上后的远射：原版德国 21 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=2'],{isNamedCanonMove:false,evidence:'creative: Otomo Quartet'}),
 'narita-captain-shot':move('narita-captain-shot','明和东队长重射（成田）','shot','明和东 10 号的中场重射：原版英格兰 1F 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=96'],{isNamedCanonMove:false,evidence:'creative: no DT skill'}),
 'sawaki-quick-shot':move('sawaki-quick-shot','明和东急射（泽木）','shot','前锋的抢点急射：原版 13 高速段（速度 16）','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=101'],{isNamedCanonMove:false,evidence:'creative: no DT skill'}),
 'oda-dosanko-shot':move('oda-dosanko-shot','道产子射门（小田）','shot','北海道少年的射门：原版日本 5 号 09 停球缓升→平飞→下坠→高速','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=112'],{isNamedCanonMove:false,evidence:'DT skill: Dosanko Shot'}),
 'kaneda-snowfield-shot':move('kaneda-snowfield-shot','雪原远射（金田）','shot','富良野中场远射：原版日本 8 号 0C 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=107'],{isNamedCanonMove:false,evidence:'creative: no DT skill'}),
 'wakamatsu-quick-shot':move('wakamatsu-quick-shot','若松快射','shot','富良野中场快射：原版日本 2 号 06 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://captaintsubasa.fandom.com/wiki/Koichi_Wakamatsu'],{isNamedCanonMove:false,evidence:'creative: not in DT'}),
 'sawada-solid-shot':move('sawada-solid-shot','扎实射门（泽田）','shot','东邦传球手的稳准射门：原版日本 7 号 0B 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=121'],{isNamedCanonMove:false,evidence:'DT skills: Solid Shot / Precise Shot (also Toho Twin Shot with Hyuga)'}),
 'sorimachi-shadow-shot':move('sorimachi-shadow-shot','影子射门（反町）','shot','球藏在影子里：原版喀麦隆 19 平飞→隐身→爆闪→重现','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=122'],{isNamedCanonMove:false,evidence:'DT skill: Shadow Shot'}),
 'ichinose-bullet-shot':move('ichinose-bullet-shot','子弹射门（一之濑）','shot','子弹一样的快射：原版 03 高速（速度 16）','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=43'],{isNamedCanonMove:false,evidence:'DT skill: Bullet Shot'}),
 'sanada-header-smash':move('sanada-header-smash','冲顶扣射（真田）','shot','跳起往下扣：原版 01 下压→03 高速','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=45'],{isNamedCanonMove:false,evidence:'DT skills: Jumping Header / Diving Header'}),
 'honma-precise-shot':move('honma-precise-shot','精准射门（本间）','shot','眯眼一脚精准射：原版日本 0 号 04 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=44'],{isNamedCanonMove:false,evidence:'DT skill: Precise Shot'}),
 'schester-gyro-shot':move('schester-gyro-shot','陀螺射门（舒斯特）','shot','高速自转的射门：原版韩国 16 平射（阴阳旋转）','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=205'],{isNamedCanonMove:false,evidence:'DT skill: Gyro Shot (also Loop Shot)'}),
 'bossis-wild-shot':move('bossis-wild-shot','野性射门（博西）','shot','狂野乱跳的射门：原版泰国 17 弹跳→22 平飞','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=192'],{isNamedCanonMove:false,evidence:'DT skill: Wild Shot'}),
 'pascal-slide-step-shot':move('pascal-slide-step-shot','滑步射门（帕斯卡尔）','shot','横向滑步晃开后射门：原版阿根廷 1C 平射','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=160'],{isNamedCanonMove:false,evidence:'DT skill: Slide Step Shot (also Invisible Volley Shot)'}),
 'galvan-canon':move('galvan-canon','加尔万加农炮','shot','后卫的重炮：原版德国 21 改成速度 16 平飞','signature','沿用原特殊射门资格（2026-10-21：原来没有专属招式的人，名字取自梦幻队伍技能或按人物设定创作，球走最接近的原版特殊球链）',['https://tsubasa.im/global/en/character/skills/?id=151'],{isNamedCanonMove:false,evidence:'DT skill: Galvan Canon'}),
 'takasugi-body-block':move('takasugi-body-block','无敌身体拦截（高杉）','defense','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','body-block-wide','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=126'],{isNamedCanonMove:false,evidence:'DT skill: Invincible Body Block'}),
 'urabe-hot-block':move('urabe-hot-block','热血封堵（浦边）','defense','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','hot-block','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=7'],{isNamedCanonMove:false,evidence:'DT skill: Hot-Blooded Block'}),
 'kishida-shark-tackle':move('kishida-shark-tackle','鲨鱼铲断（岸田）','defense','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','shark-tackle','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=6'],{isNamedCanonMove:false,evidence:'DT skill: Shark Tackle'}),
 'nakayama-strong-tackle':move('nakayama-strong-tackle','强力铲断（中山）','defense','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','strong-tackle','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=3'],{isNamedCanonMove:false,evidence:'DT skill: Strong Tackle'}),
 'galvan-rush-tackle':move('galvan-rush-tackle','加尔万冲撞铲断','defense','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','rush-tackle','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=151'],{isNamedCanonMove:false,evidence:'DT skill: Galvan Rush Tackle'}),
 'kato-headband-save':move('kato-headband-save','头带扑救（加藤）','keeper','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','headband-save','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=102'],{isNamedCanonMove:false,evidence:'creative: no DT skill; his white headband'}),
 'amoros-power-punch':move('amoros-power-punch','强力拳击（阿莫罗）','keeper','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','power-punch','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=183'],{isNamedCanonMove:false,evidence:'DT skill: Power Punch (also Powerful Diving Save)'}),
 'morisaki-save':move('morisaki-save','拼命扑救（森崎）','keeper','保留原碰撞、体力与扑救成败；仅有限范围或对抗修正','gutsy-save','真实对应防守/门将动作、球近身、体力和冷却条件',['https://tsubasa.im/global/en/character/skills/?id=124'],{isNamedCanonMove:false,evidence:'DT skills: SG (Super Gutsy) GK Catch / "Hit me somewhere, please!"; the existing M-9 body save (src/tsubasa-morisaki-save.js)'}),
 'twin-shot':move('twin-shot','双人射门','combination','翼与岬同时踢球','twin','当前可用名单无岬太郎，不能触发',[],{partners:['tsubasa','misaki'],status:'pending'}),
});
const assignments={taki:['taki-compact-shot'],kisugi:['kisugi-scorer-shot'],izawa:['izawa-surprise-shot'],takasugi:['takasugi-power-shot', 'takasugi-body-block'],urabe:['urabe-sliding-shot', 'urabe-hot-block'],kishida:['kishida-shark-shot', 'kishida-shark-tackle'],nakayama:['nakayama-long-shot', 'nakayama-strong-tackle'],nishio:['nishio-quartet-shot'],narita:['narita-captain-shot'],sawaki:['sawaki-quick-shot'],oda:['oda-dosanko-shot'],kaneda:['kaneda-snowfield-shot'],wakamatsu:['wakamatsu-quick-shot'],sawada:['sawada-solid-shot'],sorimachi:['sorimachi-shadow-shot'],ichinose:['ichinose-bullet-shot'],sanada:['sanada-header-smash'],honma:['honma-precise-shot'],schester:['schester-gyro-shot'],bossis:['bossis-wild-shot'],pascal:['pascal-slide-step-shot'],galvan:['galvan-canon', 'galvan-rush-tackle'],kato:['kato-headband-save'],amoros:['amoros-power-punch'],morisaki:['morisaki-save'],tsubasa:['drive-shot','overhead-kick','drive-tiger','twin-shot'],hyuga:['tiger-shot','drive-tiger'],soda:['razor-shot','marking-slide'],nitta:['falcon-shot','running-volley-falcon'],schneider:['fire-shot'],tachibana_masao:['skylab-hurricane'],tachibana_kazuo:['skylab-hurricane'],pierre:['slider-shot','eiffel-attack'],napoleon:['cannon-shot','eiffel-attack'],matsuyama:['eagle-shot'],misugi:['overhead-kick'],diaz:['diaz-backflip-shot','acrobat-shot'],jito:['jito-power-shot','power-block','jito-sano-combination'],sano:['overhead-kick','jito-sano-combination'],margus:['margus-power-header'],ishizaki:['face-block'],wakashimazu:['karate-save','triangle-jump'],wakabayashi:['sggk-guard'],muller:['power-catch'],hernandez:['perfect-save'],kaltz:['aerial-tackle']};
const pending=new Set(['matsuyama','misugi','jito','sano','wakabayashi','wakashimazu','ishizaki','muller','hernandez','diaz','margus','kaltz']);
const people=[...new Map(TSUBASA_ROSTERS.rosters.flatMap(t=>t.players.filter(p=>p.identityStatus==='confirmed_named_character').map(p=>[p.characterId,p]))).values()];
export const TSUBASA_CHARACTER_MOVES=freeze(people.map(p=>{const moves=(assignments[p.characterId]??[]).map(id=>TSUBASA_MOVE_CATALOG[id]),implemented=moves.some(m=>m.status==='implemented'),status=implemented?'implemented':moves.length||pending.has(p.characterId)?'pending':'no-signature';return {id:p.characterId,name:p.name,role:p.canonicalRole,moves,status,reason:status==='implemented'?'至少一项已接入，未完成或不可用内容以各招式状态为准；数值与触发为六人制机制改编':status==='pending'?'原作技能或对应触发机制仍在核验；目前使用基础动作':'当前资料未确认专属必杀；保留基础足球动作，不杜撰招式',sourceUrls:[...new Set(moves.flatMap(m=>m.sourceUrls))]};}));
export const getTsubasaCharacterMoves=id=>TSUBASA_CHARACTER_MOVES.find(p=>p.id===id)??null;
/** M-9 / Must D-40 (2026-10-14, team call): 森崎 拼命扑救. ishizakiReach 0x40 = D-40 (planar, from the ball at the rebound).
 * headerStrikeDelay 8 = RAM-measured frame-13 offset of native 0x34 (as M-8). 团队拍板、未核: inGoal (keeper oriented x >= 0x350
 * i.e. past the shooting range, y within the posts +-16, on the ground); exemptMoves = the keeper-fooled shots whose Must already fixes the
 * keeper's reaction (project D-40 narrowed 2026-10-14: D-31/D-32 drive, D-37 razor, D-25 tiger, D-38 cannon).
 * 团队拍板、未核 (poteto numbers): body plane/reach (s2 is 39 px tall), the
 * 4-frame s2 hold, s3 display cap, rebound and deflection velocities. */
export const TSUBASA_MORISAKI_SAVE=Object.freeze({ishizakiReach:0x40,inGoal:Object.freeze({minOrientedX:0x350,minY:0xa4-16,maxY:0xe4+16,maxZ:4}),
 chestDX:4,bodyReach:Object.freeze({y:14,z:40}),exemptMoves:Object.freeze(['drive-shot','razor-shot','tiger-shot','cannon-shot',/* batch D: canon, Morisaki is pushed into the net with Jito's shot */'jito-power-shot']),blockFrames:4,s3MaxFrames:50,reboundIgnoreFrames:6,gravity:0x80,rebound:Object.freeze({vx:3,vz:2}),
 headerStrikeDelay:8,headZ:16,headReach:Object.freeze({planar:20,z:20}),deflect:Object.freeze({vx:2,vy:2,vz:2})});
