import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMotionPresentation} from '../engine/src/platform/motion-presentation.js';
test('three native ticks draw intermediate motion without changing actor coordinates or RAM',()=>{
 const m=createMotionPresentation(),r=new Uint8Array(2048);r[0x59]=2;r[0x5e6]=3;
 const a={entity:0,kind:0,teamId:0,playerNumber:0,x:10,y:20,groundY:20};m.capture(r,[a]);const b={...a,x:16,y:26,groundY:26};m.capture(r,[b]);
 const positions=[];for(let i=1;i<=3;i++){r[0x51]=i;const before=r.slice();positions.push(m.draw(r,[b])[0].x);assert.deepEqual(r,before);}
 assert.deepEqual(positions,[12,14,16]);assert.equal(b.x,16);
 r[0x5c]=128;assert.equal(m.draw(r,[b])[0],b);
 r[0x5c]=0;r[0x51]=0;r[0x59]=5;m.capture(r,[b]);assert.equal(m.draw(r,[b])[0],b);
 const c={...b,x:200};m.capture(r,[c]);assert.equal(m.draw(r,[c])[0],c);
 m.capture(r.slice(),[c]);assert.equal(m.draw(r,[c])[0],c);
});

test('camera interpolation is read-only and resets on cuts',()=>{
 const m=createMotionPresentation(),r=new Uint8Array(2048);r[0x59]=2;r[0x5e6]=3;r[0xec]=10;m.capture(r,[]);r[0xec]=16;m.capture(r,[]);
 for(let i=1;i<=3;i++){r[0x51]=i;const before=r.slice();assert.equal(m.background(r)[0xec],10+2*i);assert.deepEqual(r,before);}
 r[0xec]=200;m.capture(r,[]);assert.equal(m.background(r),r);
 r[0x59]=5;assert.equal(m.background(r),r);
});
