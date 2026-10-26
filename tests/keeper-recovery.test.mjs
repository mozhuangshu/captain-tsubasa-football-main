import test from 'node:test';
import assert from 'node:assert/strict';
import {buildKeeperSaveScene,stepKeeperSave,observeKeeperBall} from './fixtures/qa-keeper-scene.js';
import {getTsubasaMorisakiSaveState,applyTsubasaMorisakiSaveFrame,tsubasaMorisakiSaveIgnores,getTsubasaMorisakiSavePose} from '../engine/src/tsubasa-morisaki-save.js';
import {syncTsubasaSpecialMoves,enableTsubasaSpecialMoves} from '../engine/src/tsubasa-special-moves.js';
import {TSUBASA_MORISAKI_SAVE as M} from '../engine/data/tsubasa-special-moves.js';

for(const side of [0,1]){
 test(`keeper ${side}: rebound immunity expires after a completed body block`,async()=>{
  const {r,keeper}=await buildKeeperSaveScene({side});
  for(let i=0;i<M.blockFrames;i++)stepKeeperSave(r);
  assert.equal(getTsubasaMorisakiSaveState(r).done,true);
  for(let i=0;i<M.reboundIgnoreFrames;i++){
   assert.equal(tsubasaMorisakiSaveIgnores(r,keeper),true);stepKeeperSave(r);
  }
  assert.equal(tsubasaMorisakiSaveIgnores(r,keeper),false);
  for(let i=0;i<300;i++){r[0x300]=(r[0x300]+1)&255;stepKeeperSave(r);assert.equal(tsubasaMorisakiSaveIgnores(r,keeper),false);}
  assert.equal(getTsubasaMorisakiSavePose(r),null);
 });
 for(const number of [5,6,11])for(const kind of ['shot','goalkick'])test(`keeper ${side}, roster ${number}: ${kind} works after a save and substitution`,async()=>{
  const {app,r,keeper}=await buildKeeperSaveScene({side});
  for(let i=0;i<80;i++)stepKeeperSave(r);
  r[0x532+keeper]=number;
  const result=await observeKeeperBall(app,side,kind);
  assert.equal(kind==='shot'?result.caught:result.resumed,true,JSON.stringify(result));
  assert.equal(r[0x52e]+r[0x52f],0);
 });
}
for(const headed of [false,true])test(`Ishizaki ${headed?'completed':'interrupted'} header releases collision`,async()=>{
 const {r,keeper,ishizaki}=await buildKeeperSaveScene({ishizaki:true});
 for(let i=0;i<M.blockFrames;i++)stepKeeperSave(r);
 assert.equal(getTsubasaMorisakiSaveState(r).ishizaki,ishizaki);
 if(headed){r[0x4d6]=ishizaki;r[0x465]=133;applyTsubasaMorisakiSaveFrame(r);}else{r[0x459+ishizaki]=1;stepKeeperSave(r);}
 assert.equal(getTsubasaMorisakiSaveState(r).done,true);
 for(let i=0;i<M.reboundIgnoreFrames;i++)stepKeeperSave(r);
 assert.equal(tsubasaMorisakiSaveIgnores(r,keeper),false);
 assert.equal(tsubasaMorisakiSaveIgnores(r,ishizaki),false);
});
for(const phase of ['s1','s2','s3'])for(const change of ['menu','restart','substitute','team','disabled'])test(`${phase}: clear save on ${change}`,async()=>{
 const {r,keeper}=await buildKeeperSaveScene({armOnly:phase==='s1'});
 if(phase==='s3')for(let i=0;i<M.blockFrames;i++)stepKeeperSave(r);
 if(change==='menu'){r[0x58]=2;r[0x59]=7;}
 if(change==='restart'){r[0x59]=6;r[0x5c]=72;}
 if(change==='substitute')r[0x532+keeper]=11;
 if(change==='team')r[0x52c]=4;
 if(change==='disabled')enableTsubasaSpecialMoves(r,{enabled:false});
 syncTsubasaSpecialMoves(r);
 assert.equal(tsubasaMorisakiSaveIgnores(r,keeper),false);
 assert.equal(getTsubasaMorisakiSavePose(r),null);
 assert.equal(getTsubasaMorisakiSaveState(r),null);
});
