import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecoveredApp,BUTTONS as B} from '../engine/src/app-runtime.js';
import {initializeTsubasaGame} from '../engine/src/tsubasa-bootstrap.js';
import {createTsubasaGraphics} from '../engine/src/tsubasa-runtime.js';
import {chineseLocalization} from '../engine/src/localization-zh.js';
import {prepareSession} from '../src/session.js';
import {createControls} from '../src/controls.js';
initializeTsubasaGame();
async function frame(app){await app.step();assert.equal(app.blocked,false,app.lastError?.message);do{await app.nextNativeFrame();}while(app.r[0x51]<app.r[0x5e6]);}
async function wait(app,n=16){for(let i=0;i<n;i++)await frame(app);}
async function press(app,port,bit){app.setController(port,bit);await frame(app);app.setController(port,0);await wait(app,16);}
function create(mode){const a=new RecoveredApp({nextFrame:async()=>{},tsubasaSpecialMoves:true,graphics:createTsubasaGraphics(),localization:chineseLocalization});prepareSession(a,mode);return a;}
test('two-player session reaches native match and routes each keyboard to opposite teams',async()=>{
 const a=create('versus'),r=a.r;await wait(a);assert.equal(r[0x57]&240,64);assert.equal(r[0x5d],2);
 await press(a,0,B.Start);assert.equal(r[0x59]&127,5);
 const before=[r[0x5ca],r[0x5cb]];await press(a,1,B.Down);assert.equal(r[0x5ca],before[0]);assert.notEqual(r[0x5cb],before[1]);
 await press(a,0,B.A);await press(a,1,B.A);
 const route=[];
 for(let i=0;i<80&&!(r[0x58]===0&&(r[0x59]&127)===2);i++){
  route.push([r[0x58],r[0x59]&127,r[0x5c9],r[0x5cc]]);
  await press(a,0,i%3===2?B.A:B.Start);await press(a,1,B.A);
 }
 assert.equal(r[0x58],0,JSON.stringify(route));assert.equal(r[0x59]&127,2,JSON.stringify(route));
 assert.equal(r[0x568]%2,0);assert.equal(r[0x569]%2,1);assert.equal(r[0x56a],255);assert.equal(r[0x56b],255);
 await wait(a,100);let pads=[];const target=new EventTarget(),c=createControls(a,{target,getGamepads:()=>pads});c.setEnabled(true);
 function key(type,code){const e=new Event(type,{cancelable:true});Object.assign(e,{code});target.dispatchEvent(e);}
 key('keydown','ArrowRight');key('keydown','KeyW');await frame(a);
 assert.equal(r[4],B.Right);assert.equal(r[5],B.Up);assert.equal(r[6],0);assert.equal(r[7],0);
 key('keyup','ArrowRight');key('keyup','KeyW');await frame(a);assert.equal(r[4]|r[5],0);
 const position=slot=>[r[0x314+slot]|r[0x327+slot]<<8,r[0x34d+slot]|r[0x360+slot]<<8];
 const slots=[r[0x568],r[0x569]],positions=slots.map(position);
 pads=[0,1].map(index=>({index,connected:true,mapping:'standard',buttons:[],axes:index?[0,-1]:[1,0]}));
 await wait(a,30);assert.equal(r[4],B.Right);assert.equal(r[5],B.Up);
 for(let i=0;i<2;i++)assert.notDeepEqual(position(slots[i]),positions[i],`gamepad ${i+1} failed to move its player`);
 pads=[];await frame(a);assert.equal(r[4]|r[5],0);c.dispose();
 console.log('versus route',JSON.stringify(route),'teams',r[0x52c]&15,r[0x52d]&15,'controller slots',r[0x568],r[0x569]);
});
test('single-player session preserves league routing',async()=>{const a=create('solo');await wait(a);assert.equal(a.r[0x57]&240,128);assert.equal(a.r[0x5d],1);await press(a,0,B.Start);assert.equal(a.r[0x58],2);assert.equal(a.r[0x59]&127,2);assert.equal(a.r[0x57]&240,128);});
test('all 169 home/away combinations survive prematch and reach kickoff unchanged',async()=>{
 const teams=[0,1,2,3,5,6,7,9,10,11,13,14,15];
 for(let home=0;home<13;home++)for(let away=0;away<13;away++){
  const a=create('versus'),r=a.r;await wait(a);await press(a,0,B.Start);r[0x5ca]=home|128;r[0x5cb]=(away+13)|128;await wait(a);
  for(let i=0;i<60&&!(r[0x58]===0&&(r[0x59]&127)===2);i++){await press(a,0,i%3===2?B.A:B.Start);await press(a,1,B.A);}
  assert.deepEqual([r[0x58],r[0x59]&127],[0,2],`cannot start ${teams[home]} vs ${teams[away]}`);
  assert.deepEqual([r[0x52c]&15,r[0x52d]&15],[teams[home],teams[away]]);assert.deepEqual([r[0x56a],r[0x56b]],[255,255]);
 }
});
