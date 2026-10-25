import {resetMobileToPrimaryMenu} from './helpers.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/';
test('first click is acknowledged during asynchronous loading and automatically starts the chosen mode',async()=>{
 const b=await chromium.launch();let release;try{const p=await b.newPage(),gate=new Promise(r=>release=r);await p.route(/\/engine\/src\/web-game[^/]*\.js/,async r=>{await gate;await r.continue();});await p.goto(base,{waitUntil:'domcontentloaded'});const start=p.locator('[data-mode="versus"]');await p.locator('[data-mode="versus"]:enabled').waitFor({timeout:60000});assert.equal(await start.isEnabled(),true);await start.click();assert.match(await p.locator('#session-status').textContent(),/双人.*加载|加载.*双人/);release();await p.locator('#welcome').waitFor({state:'hidden',timeout:60000});}finally{release?.();await b.close();}
});
for(const mobile of [false,true])test(`${mobile?'phone':'desktop'} sound defaults on and first gesture unlocks audio`,async()=>{
 const b=await chromium.launch();try{const p=await b.newPage(mobile?devices['iPhone 13']:{});await p.goto(base+'?debug');await p.waitForFunction(mobile?()=>window.recoveredApp?.running:()=>!!window.webGame,{timeout:60000});assert.match(await p.locator(mobile?'#audio':'#sound').textContent(),/关闭声音/);await p.locator(mobile?'[data-button="Start"]':'[data-mode="versus"]').click();await p.waitForFunction(()=>window.footballAudioContext?.state==='running');assert.equal(await p.evaluate(()=>footballAudioContext.state),'running');await p.waitForFunction(()=>{const sink=(window.webGame?.app??window.recoveredApp).audioSink;return !sink.muted&&sink.context?.state==='running'&&sink.master.gain.value>0;});}finally{await b.close();}
});

test('phone independently taps both complete team lists, confirms, and reaches the chosen match',async()=>{
 const b=await chromium.launch();try{
 const p=await b.newPage({...devices['iPhone 13']}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>window.recoveredApp?.running,{timeout:60000});
 const state=()=>p.evaluate(()=>{const r=recoveredApp.r;return {main:r[0x58],sub:r[0x59]&127,phase:r[0x5c9],mode:r[0x57]&240,blocked:recoveredApp.blocked};});
 const tap=async name=>{await p.locator(`[data-button="${name}"]`).tap();await p.waitForTimeout(400);};
 await resetMobileToPrimaryMenu(p);
 assert.deepEqual(await state(),{main:2,sub:1,phase:1,mode:128,blocked:false});
 const stick=await p.locator('[data-dpad]').boundingBox();await p.touchscreen.tap(stick.x+stick.width/2,stick.y+stick.height-6);await p.waitForTimeout(300);assert.equal((await state()).mode,64);
 if(process.env.BROWSER_EVIDENCE_DIR)await p.screenshot({path:process.env.BROWSER_EVIDENCE_DIR+'/mobile-primary.png'});
 await tap('Start');await p.waitForFunction(()=>recoveredApp.r[0x5c9]===1&&(recoveredApp.r[0x59]&127)===5);
 const box=await p.locator('#game').boundingBox();const point=async(x,y)=>{await p.touchscreen.tap(box.x+x*box.width/256,box.y+y*box.height/240);await p.waitForTimeout(200);};
 await point(64,22+3*15+7);await point(192,22+12*15+7);
 assert.deepEqual(await p.evaluate(()=>[recoveredApp.r[0x52c]&15,recoveredApp.r[0x52d]&15]),[3,15]);
 if(process.env.BROWSER_EVIDENCE_DIR){const fs=await import('node:fs/promises');await fs.mkdir(process.env.BROWSER_EVIDENCE_DIR,{recursive:true});await p.screenshot({path:process.env.BROWSER_EVIDENCE_DIR+'/mobile-team-selection.png'});}
 await point(128,230);
 for(let i=0;i<60;i++){const s=await state();assert.equal(s.blocked,false);if(s.main===0&&s.sub===2)break;await tap(i%3===2?'A':'Start');}
 const s=await state();assert.equal(s.main,0);assert.equal(s.sub,2);assert.deepEqual(await p.evaluate(()=>[recoveredApp.r[0x52c]&15,recoveredApp.r[0x52d]&15,recoveredApp.r[0x5d]]),[3,15,2]);
 await p.locator('#settings>summary').tap();assert.deepEqual(await p.locator('#touch-port option').allTextContents(),['1P','2P']);assert.doesNotMatch(await p.locator('#handheld').textContent(),/3P|4P|1–4/);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});

for(const blockedScript of [/\/mobile\/game\.js/,/\/src\/mobile-entry\.js/])test(`mobile START acknowledges input while ${blockedScript} is still loading`,async()=>{
 const b=await chromium.launch();let release;try{const p=await b.newPage({...devices['Pixel 7']}),gate=new Promise(r=>release=r);await p.route(blockedScript,async r=>{await gate;await r.continue();});await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForURL('**/mobile/index.html');await p.locator('[data-button="Start"]:enabled').waitFor();await p.locator('[data-button="Start"]').tap();assert.match(await p.locator('#error-banner').textContent(),/已收到开始/);release();await p.waitForFunction(()=>window.recoveredApp?.running,{timeout:60000});await p.locator('#error-banner').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>footballAudioContext.state),'running');await p.waitForFunction(()=>{const sink=(window.webGame?.app??window.recoveredApp).audioSink;return !sink.muted&&sink.context?.state==='running'&&sink.master.gain.value>0;});}finally{release?.();await b.close();}
});
