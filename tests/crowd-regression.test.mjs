import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadCanvas} from './helpers/canvas-loader.mjs';
import {loadOriginalScreen,createScreenLayout,originalScreenTile} from '../engine/src/screen-loader.js';
import {chineseLocalization} from '../engine/src/localization-zh.js';
import {drawScreenArtCell,fadeStep} from '../engine/src/tsubasa-screen-art.js';
const {createCanvas}=loadCanvas();
for(const descriptor of [16,17,18])for(const frame of [0,16])test(`celebration ${descriptor} frame ${frame} uses exact new crowd pixels`,()=>{
 const r=new Uint8Array(2048),layout=createScreenLayout();r[0x300]=frame;loadOriginalScreen(descriptor,r,layout);
 const tiles=new Set([96,97,98,99,112,113,114,115,233,234,235,236,249,250,251,252,225,226,227,228,229,230,231,232,241,242,243,244,245,246,247,248]);let count=0;
 for(let panel=0;panel<2;panel++){
  const image=layout.panels[panel],actual=createCanvas(256,240).getContext('2d'),expected=createCanvas(256,240).getContext('2d');
  actual.fillStyle='#ff00ff';actual.fillRect(0,0,256,240);chineseLocalization.drawOverlay(actual,{screenId:descriptor,ram:r,layout,panel});
  const attr=image[960+(19>>2)*8+(8>>2)],shift=((19&2)<<1)|(8&2),pal=((attr>>shift)&3)*4,now=layout.palette[pal+originalScreenTile(image[19*32+8],layout)[0]]&63;
  for(let i=0;i<960;i++)if(tiles.has(image[i])){count++;const x=i%32,y=i/32|0;drawScreenArtCell(expected,frame?'crowdB':'crowdA',x,y,fadeStep(now,0x1a));assert.deepEqual(actual.getImageData(x*8,y*8,8,8).data,expected.getImageData(x*8,y*8,8,8).data,`wrong crowd pixels in panel ${panel}, ${x},${y}`);}
 }
 assert.ok(count>0,'fixture has no crowd');
});
