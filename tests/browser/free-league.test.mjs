import {test} from 'node:test';import assert from 'node:assert/strict';import {chromium,devices} from 'playwright';import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/';
for(const mobile of [false,true])test(`${mobile?'phone':'desktop'} single league starts against a freely chosen later opponent`,async()=>{
 const b=await chromium.launch();try{
 const p=await b.newPage(mobile?devices['iPhone 13']:{viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?debug');await p.waitForFunction(mobile?()=>window.recoveredApp?.running:()=>!!window.webGame,{timeout:60000});
 const state=()=>p.evaluate(()=>{const a=window.webGame?.app??window.recoveredApp,r=a.r;return{main:r[0x58],sub:r[0x59]&127,phase:r[0x5c9],opponent:r[0x52d]&15,choice:r[0x5ca],dialogue:!!a.storyLayer?.dialogue,blocked:a.blocked};});
 const press=async name=>{if(mobile)await p.locator(`[data-button="${name}"]`).tap();else{await p.keyboard.down(name==='Start'?'Enter':name==='A'?'z':'x');await p.waitForTimeout(80);await p.keyboard.up(name==='Start'?'Enter':name==='A'?'z':'x');}await p.waitForTimeout(400);};
 if(!mobile)await p.locator('[data-mode="solo"]').click();
 for(let n=0;n<30;n++){const s=await state();assert.equal(s.blocked,false);if(s.main===2&&s.sub===2&&s.phase===1)break;await press(s.dialogue?'B':'Start');}
 assert.equal((await state()).sub,2);assert.equal((await state()).dialogue,false,'no mandatory ordered prologue');
 if(mobile){const box=await p.locator('[data-dpad]').boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height-6);}else{await p.keyboard.down('ArrowDown');await p.waitForTimeout(80);await p.keyboard.up('ArrowDown');}
 await p.waitForTimeout(300);assert.equal((await state()).choice,1,'choose Furano, not the first chapter Otomo');
 if(process.env.BROWSER_EVIDENCE_DIR){await fs.mkdir(process.env.BROWSER_EVIDENCE_DIR,{recursive:true});await p.screenshot({path:process.env.BROWSER_EVIDENCE_DIR+`/${mobile?'phone':'desktop'}-free-league.png`});}
 await press('A');assert.equal((await state()).sub,3,'later chapter opponent must be accepted');assert.equal((await state()).opponent,7);
 for(let n=0;n<60;n++){const s=await state();assert.equal(s.blocked,false);if(s.main===0&&s.sub===2)break;await press(s.dialogue?'B':n%3===2?'A':'Start');}
 const s=await state();assert.equal(s.main,0);assert.equal(s.sub,2);assert.equal(s.opponent,7);
 assert.deepEqual(await p.evaluate(()=>{const r=(window.webGame?.app??window.recoveredApp).r;return[r[0x5d],r[0x569]];}),[1,255]);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
