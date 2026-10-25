import {RecoveredApp,BUTTONS} from '../../engine/src/app-runtime.js';
import {releaseCarriedBall} from '../../engine/src/player-actions.js';
import {configureRosterMemory,loadAttributeMemory} from '../../engine/src/platform/state-views.js';
import {enableTsubasaSpecialMoves} from '../../engine/src/tsubasa-special-moves.js';
import {createTsubasaGraphics} from '../../engine/src/tsubasa-runtime.js';
import {renderMatchHud_Bank03_A995} from '../../engine/src/field-render.js';
import {chineseLocalization} from '../../engine/src/localization-zh.js';
import {initializeTsubasaGame} from '../../engine/src/tsubasa-bootstrap.js';
export const QA_THROWIN_SCENE=Object.freeze({id:'throw-in',label:'界外球（测试）',description:'测试入口：开球时把球写到边线内侧并给出界速度，触发原生界外球',teams:{home:11,away:10}});

export const THROWIN_EDGES=Object.freeze({top:{y:50,vy:-1536},bottom:{y:342,vy:1536}});
const put=(r,lo,hi,v)=>{v&=65535;r[lo]=v&255;r[hi]=v>>>8;};
async function frame(app){await app.step();if(app.blocked)throw app.lastError??new Error('blocked');do{await app.nextNativeFrame();}while(app.r[0x51]<app.r[0x5e6]);if(app.blocked)throw app.lastError;}
async function hold(app,b,n=1){for(let i=0;i<n;i++){app.setController(0,b);await frame(app);}app.setController(0,0);}

export function writeThrowInBall(r,{edge='top',x}={}){const e=THROWIN_EDGES[edge];if(!e)throw new RangeError('edge must be top or bottom');
 const p=r[0x4d6];if(p<12&&(r[0x486+p]&64)){releaseCarriedBall(r,p);r[0x486+p]&=~64;}
 if(x!==undefined)put(r,0x320,0x333,x);put(r,0x359,0x36c,e.y);put(r,0x392,0x3a5,0);
 r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;r[0x465]=6|128;r[0x492]=0;
 put(r,0x3e8+12,0x3f6+12,0);put(r,0x404+12,0x412+12,e.vy);for(const a of [0x420,0x42e,0x43c,0x44a])r[a+12]=0;return {edge,y:e.y,lastCarrier:p};}

export function placeNearBall(r,slots,dy=24){const bx=r[0x320]|r[0x333]<<8,by=r[0x359]|r[0x36c]<<8;slots.forEach((s,i)=>{put(r,0x314+s,0x327+s,bx+(i?20:-20));put(r,0x34d+s,0x360+s,by<0xc0?by+dy:by-dy);});}
export const isThrowInRestart=r=>r[0x58]===0&&(r[0x59]&127)===6&&!!(r[0x5c]&4);


export async function enterTestMatch(appOptions={}){
 initializeTsubasaGame();const app=appOptions.app??new RecoveredApp({graphics:createTsubasaGraphics(),localization:chineseLocalization,nextFrame:async()=>{},tsubasaSpecialMoves:true,...appOptions}),r=app.r,B=BUTTONS;
 await hold(app,0,14);await hold(app,B.Start);await hold(app,0,1);await hold(app,0,13);await hold(app,B.A);await hold(app,0,1);await hold(app,0,14);
 for(let i=0;i<13;i++){app.setController(0,B.Start);await frame(app);}await hold(app,0,14);await hold(app,B.Start);await hold(app,0,1);await hold(app,0,100);await hold(app,B.A);await hold(app,0,1);await hold(app,0,5);
 if(r[0x58]!==0||(r[0x59]&127)!==2)throw new Error('test scene: menu route did not reach the match');
 r[0x52c]=QA_THROWIN_SCENE.teams.home;r[0x52d]=QA_THROWIN_SCENE.teams.away;for(let i=0;i<6;i++){r[0x532+i*2]=i;r[0x532+i*2+1]=i;}configureRosterMemory(r);loadAttributeMemory(r);enableTsubasaSpecialMoves(r,{nativeArt:'authored'});
 // The menu route has already drawn the previous teams. Refresh the fixed names and faces
 // on scratch RAM so this test-only team swap does not alter native timing/state.
 renderMatchHud_Bank03_A995(r.slice(),app.layout);
 return app;}
export const qaFrame=frame;

export async function buildThrowInScene(options={}){const {edge='top',near=true,...appOptions}=options;const app=await enterTestMatch(appOptions),r=app.r;
 for(let i=0;i<60&&!(r[0x4d6]<12&&(r[0x486+r[0x4d6]]&64));i++)await frame(app);
 const shot=writeThrowInBall(r,{edge});if(near)placeNearBall(r,[0,1]);return {app,...shot};}
