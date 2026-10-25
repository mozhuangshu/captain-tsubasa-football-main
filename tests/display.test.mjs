import {test} from 'node:test';import assert from 'node:assert/strict';import {screenSize} from '../src/display.js';
test('large and small screens preserve aspect ratio without overflow or wasteful integer jumps',()=>{
 for(const [w,h]of [[1920,1080],[1440,900],[900,650],[820,432],[340,320],[2560,1440]])for(const d of [1,1.25,1.5,2,3])for(const mode of ['crisp','soft']){const s=screenSize(w,h,d,mode);assert.ok(s.width<=w+.001&&s.height<=h+.001);assert.ok(Math.abs(s.width/s.height-512/480)<1e-9);assert.ok(s.scale/Math.min(w/512,h/480)>=.85);}
 assert.equal(screenSize(1024,960,1).integer,true);assert.equal(screenSize(1024,960,1).scale,2);
});
