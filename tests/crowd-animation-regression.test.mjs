import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadCanvas} from './helpers/canvas-loader.mjs';
import {createScreenLayout,originalScreenTile} from '../engine/src/screen-loader.js';
import {loadScoreboardGraphicsBegin_B8A1,finishScoreboardGraphics_B8D2,updateScoreboardGraphics_B0B9} from '../engine/src/scoreboard-graphics.js';
import {chineseLocalization} from '../engine/src/localization-zh.js';
import {drawScreenArtCell,fadeStep} from '../engine/src/tsubasa-screen-art.js';
const {createCanvas}=loadCanvas();
for(let variant=0;variant<3;variant++)test(`live crowd rewrites variant ${variant}: no old tiles uncovered`,()=>{
 const r=new Uint8Array(2048),l=createScreenLayout();r[0x630]=128|variant;r[0x59]=5;
 loadScoreboardGraphicsBegin_B8A1(r,l);finishScoreboardGraphics_B8D2(r,l);r[0x5e8]=r[0x5ec];
 const ctx=createCanvas(256,240).getContext('2d');
 for(let frame=0;frame<80;frame++){updateScoreboardGraphics_B0B9(r,l);r[0x300]=frame;
  for(let panel=0;panel<2;panel++){
   ctx.fillStyle='#ff00ff';ctx.fillRect(0,0,256,240);chineseLocalization.drawOverlay(ctx,{screenId:l.descriptor,ram:r,layout:l,panel});
   const px=ctx.getImageData(0,0,256,144).data,expected=createCanvas(256,144).getContext('2d'),im=l.panels[panel],attr=im[960+(19>>2)*8+(8>>2)],shift=((19&2)<<1)|(8&2),pal=((attr>>shift)&3)*4,step=fadeStep(l.palette[pal+originalScreenTile(im[19*32+8],l)[0]]&63,0x1a);
   for(let y=0;y<18;y++)for(let x=0;x<32;x++)drawScreenArtCell(expected,(frame>>4)&1?'crowdB':'crowdA',x,y,step);
   const reference=expected.getImageData(0,0,256,144).data;
   for(let row=0;row<18;row++)for(let col=0;col<32;col++)if(panel===0||row<4||col<4||col>=28){
    const i=(row*8*256+col*8)*4;
    for(let y=0;y<8;y++){const at=i+y*256*4;assert.deepEqual(px.subarray(at,at+32),reference.subarray(at,at+32),`variant ${variant}, frame ${frame}, panel ${panel}: crowd pixels`);}
    assert.ok(!(px[i]===255&&px[i+1]===0&&px[i+2]===255),`frame ${frame} panel ${panel} cell ${col},${row}: uncovered tile ${l.panels[panel][row*32+col]}`);
   }
  }
 }
});
