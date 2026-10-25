import {enterTestMatch,qaFrame} from './qa-throwin-scene.js';
import {releaseCarriedBall} from '../../engine/src/player-actions.js';

export const GOAL_SHOTS=Object.freeze({away:{x:150,vx:-1536,scorer:1},home:{x:860,vx:1536,scorer:0}});
const put=(r,lo,hi,v)=>{v&=65535;r[lo]=v&255;r[hi]=v>>>8;};

export function writeGoalBall(r,{team='away',scorer,jumpers=[],delay=0}={}){const g=GOAL_SHOTS[team];if(!g)throw new RangeError('team must be home or away');const s=scorer??g.scorer;
 const p=r[0x4d6];if(p<12&&(r[0x486+p]&64)){releaseCarriedBall(r,p);r[0x486+p]&=~64;}r[0x4d6]=s;
 put(r,0x320,0x333,g.x);put(r,0x359,0x36c,192);put(r,0x392,0x3a5,0);r[0x4f0]=r[0x4c9]=r[0x510]=0;r[0x50f]=128;r[0x465]=6|128;r[0x492]=0;
 put(r,0x3e8+12,0x3f6+12,g.vx);put(r,0x404+12,0x412+12,0);for(const a of [0x420,0x42e,0x43c,0x44a])r[a+12]=0;
 put(r,0x314+s,0x327+s,g.x-24-delay*(g.vx<0?-6:6));put(r,0x34d+s,0x360+s,192);put(r,0x320,0x333,g.x-delay*(g.vx<0?-6:6));
 for(const j of jumpers)r[0x459+j]=0x30;return {team,scorer:s,jumpers};}
export async function buildGoalScene(options={}){const {team='away',scorer,jumpers,delay,...appOptions}=options;const app=await enterTestMatch(appOptions),r=app.r;
 for(let i=0;i<60&&!(r[0x4d6]<12&&(r[0x486+r[0x4d6]]&64));i++)await qaFrame(app);return {app,...writeGoalBall(r,{team,scorer,jumpers,delay})};}
