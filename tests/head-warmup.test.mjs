import {test} from 'node:test';import assert from 'node:assert/strict';
import {installTsubasaHeads} from '../engine/src/tsubasa-heads.js';import {getTsubasaLayeredArt,setTsubasaHeadWarmup,cacheTsubasaHeadArt} from '../engine/src/tsubasa-layered-sprites.js';import {HD_CHARACTER_BY_ID} from '../engine/art/hd-runtime.js';
test('head warm-up queues worker work without scheduling main-thread idle tasks',()=>{
 const original=globalThis.requestIdleCallback,jobs=[];let idle=0;globalThis.requestIdleCallback=()=>idle++;
 try{installTsubasaHeads();setTsubasaHeadWarmup((id,frames)=>jobs.push({id,frames}));const skin=HD_CHARACTER_BY_ID.tsubasa.skin,a=getTsubasaLayeredArt(skin,0);assert.ok(a);assert.equal(idle,0);assert.equal(jobs.length,1);getTsubasaLayeredArt(skin,0);assert.equal(jobs.length,1);
 // A delayed worker answer must not replace a frame already composed for display.
 cacheTsubasaHeadArt(skin.id,0,{unexpected:true});assert.equal(getTsubasaLayeredArt(skin,0),a);
 setTsubasaHeadWarmup(null);installTsubasaHeads();assert.ok(getTsubasaLayeredArt(skin,0));assert.equal(idle,0);
 }finally{setTsubasaHeadWarmup(null);if(original)globalThis.requestIdleCallback=original;else delete globalThis.requestIdleCallback;}
});
