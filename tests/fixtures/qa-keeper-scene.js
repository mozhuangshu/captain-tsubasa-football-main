import {enterTestMatch,qaFrame} from './qa-throwin-scene.js';
import {configureRosterMemory,loadAttributeMemory} from '../../engine/src/platform/state-views.js';
import {beginTsubasaShot} from '../../engine/src/tsubasa-special-moves.js';
import {stepTsubasaMorisakiSave,applyTsubasaMorisakiSaveFrame,getTsubasaMorisakiSaveState} from '../../engine/src/tsubasa-morisaki-save.js';

const put=(r,lo,hi,v)=>{r[lo]=v&255;r[hi]=v>>>8;};
export function placeKeeperActor(r,slot,x,y,z=0){
 put(r,0x314+slot,0x327+slot,x);put(r,0x34d+slot,0x360+slot,y);put(r,0x386+slot,0x399+slot,z);
 for(const a of [0x301,0x33a,0x373,0x3e8,0x3f6,0x404,0x412,0x420,0x42e,0x43c,0x44a])r[a+slot]=0;
}
export function stepKeeperSave(r){stepTsubasaMorisakiSave(r);applyTsubasaMorisakiSaveFrame(r);}
// Resolve a real special-shot body block, with optional nearby Ishizaki header.
export async function buildKeeperSaveScene({side=0,ishizaki=false,armOnly=false,appOptions={}}={}){
 const app=await enterTestMatch(appOptions),r=app.r,keeper=10+side,shooter=side^1;
 r[0x52c+side]=side?0x80:0;r[0x52c+shooter]=side?1:0x81;
 for(let slot=0;slot<12;slot++){r[0x532+slot]=slot>>>1;placeKeeperActor(r,slot,512,192);}
 configureRosterMemory(r);loadAttributeMemory(r);
 r[0x5c]=0;r[0x4d6]=shooter;r[0x465]=133;r[0x492]=128;r[0x50f]=132;r[0x4f0]=64;
 placeKeeperActor(r,keeper,side?874:150,192);r[0x459+keeper]=129;
 placeKeeperActor(r,12,side?724:300,192,10);r[0x4af]=side?0:128;
 if(ishizaki)placeKeeperActor(r,8+side,side?844:180,192);
 beginTsubasaShot(r,4);stepKeeperSave(r);
 if(getTsubasaMorisakiSaveState(r)?.phase!=='s1')throw Error('keeper scene did not arm');
 if(!armOnly){placeKeeperActor(r,12,side?870:154,192,10);applyTsubasaMorisakiSaveFrame(r);}
 return {app,r,side,keeper,ishizaki:8+side};
}
export function writeKeeperBall(r,side,kind){
 const keeper=10+side;r[0x5c]=0;r[0x4d6]=side^1;r[0x465]=134;r[0x492]=0;
 r[0x4f0]=r[0x4c9]=r[0x510]=r[0x50d]=0;r[0x50f]=128;
 for(let slot=0;slot<10;slot++)placeKeeperActor(r,slot,512,192);
 placeKeeperActor(r,keeper,side?824:200,192);r[0x459+keeper]=1;r[0x486+keeper]=0;
 const x=kind==='shot'?240:130;
 placeKeeperActor(r,12,side?1024-x:x,kind==='shot'?192:128);
 put(r,0x3f4,0x402,side?512:-512);put(r,0xec,0xed,side?672:96);put(r,0xf0,0xf1,side?672:96);
}
export async function observeKeeperBall(app,side,kind){
 const r=app.r;writeKeeperBall(r,side,kind);let restarted=false;
 for(let frames=0;frames<300;frames++){
  await qaFrame(app);
  if(kind==='shot'&&r[0x4d6]===10+side)return {caught:true,frames};
  if(kind==='goalkick'){
   restarted||=(r[0x59]&127)===6;
   if(restarted&&(r[0x59]&127)===2)return {resumed:true,frames};
  }
 }
 return {caught:false,resumed:false,sub:r[0x59]&127,flags:r[0x5c]};
}

// Initialize a native high shot. The tested app itself selects the eagle shot,
// runs its flight, arms the keeper and resolves the block (no adapter state injection).
export async function launchNativeKeeperSave(app,side){
 const r=app.r,keeper=10+side,shooter=side^1;
 r[0x52c+side]=side?0x80:0;r[0x52c+shooter]=side?7:0x87;
 for(let slot=0;slot<12;slot++){r[0x532+slot]=slot>>>1;placeKeeperActor(r,slot,512,192);}
 configureRosterMemory(r);loadAttributeMemory(r);
 placeKeeperActor(r,keeper,side?874:150,192);r[0x459+keeper]=129;
 placeKeeperActor(r,shooter,side?724:300,192,60);r[0x459+shooter]=179;r[0x4a3+shooter]=side?0:128;r[0x4b0+shooter]=side?64:192;
 placeKeeperActor(r,12,side?724:300,192,60);r[0x4d6]=shooter;r[0x465]=5;r[0x492]=128;r[0x5c]=0;r[0x4f0]=0;
 put(r,0xec,0xed,side?672:96);put(r,0xf0,0xf1,side?672:96);
 let blocked=false;
 for(let i=0;i<30;i++){
  await qaFrame(app);
  if((r[0x459+keeper]&127)===89&&r[0x4d6]===keeper&&(r[0x465]&127)===6){blocked=true;break;}
 }
 if(!blocked)throw Error('native eagle shot did not trigger the body block');
 // Keep the ball away while the native knock-back recovers; no new shot clears the save.
 placeKeeperActor(r,12,512,100);r[0x465]=0;r[0x492]=0;
 for(let i=0;i<100;i++)await qaFrame(app);
 if((r[0x59]&127)!==2)throw Error('keeper recovery left active play');
 return {blocked,keeperAction:r[0x459+keeper]&127};
}
