import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/';
async function screenshot(page,name){if(!process.env.BROWSER_EVIDENCE_DIR)return;await fs.mkdir(process.env.BROWSER_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BROWSER_EVIDENCE_DIR,name+'.png')});}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(page){await page.goto(base+'?debug');await page.waitForFunction(()=>!!window.webGame,{timeout:60000});}
async function press(page,key){await page.keyboard.down(key);await wait(100);await page.keyboard.up(key);await wait(270);}
async function state(page){return page.evaluate(()=>{const a=webGame.app,r=a.r;return {family:r[0x58],step:r[0x59]&127,mode:r[0x57]&240,blocked:a.blocked,error:a.lastError?.message,teams:[r[0x5ca],r[0x5cb]],held:[r[4],r[5]],slots:[r[0x568],r[0x569]]};});}
async function desktop(fn){const b=await chromium.launch();try{const c=await b.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await fn(p,c);assert.deepEqual(errors,[],'uncaught browser exceptions');}finally{await b.close();}}

test('desktop cold loads, refresh, both home modes and saved-mobile redirect',()=>desktop(async p=>{
 for(let i=0;i<3;i++){await ready(p);assert.equal(await p.locator('#keys-0 kbd').count(),8);await p.locator(`[data-mode="${i%2?'solo':'versus'}"]`).click();await p.locator('#welcome').waitFor({state:'hidden'});await p.locator('#home').click();await p.locator('#welcome').waitFor({state:'visible'});}
 await p.goto(base+'mobile/index.html');await p.waitForURL('**/index.html');await p.locator('#keys-0 kbd').first().waitFor();assert.equal(await p.locator('#handheld').count(),0);
 await p.setViewportSize({width:390,height:844});await p.reload();await p.locator('#keys-0 kbd').first().waitFor();assert.equal(await p.locator('#handheld').count(),0);
}));

test('all desktop settings: remap, conflict, cancel, deadzone, reset, display and persistence',()=>desktop(async p=>{
 await ready(p);await p.locator('#settings-open').click();await p.locator('#settings[open]').waitFor();
 await p.locator('[data-binding="0-A-keys"]').click();await p.keyboard.press('q');assert.equal(await p.locator('[data-binding="0-A-keys"]').textContent(),'Q');
 await p.locator('[data-binding="1-A-keys"]').click();await p.keyboard.press('q');assert.match(await p.locator('#mapping-message').textContent(),/已用于/);await p.keyboard.press('Escape');assert.equal(await p.locator('#settings').evaluate(e=>e.open),true);
 await p.locator('#deadzone').fill('55');assert.equal(await p.locator('#deadzone-value').textContent(),'55%');await p.locator('#settings-done').click();
 await p.locator('#display').selectOption('soft');assert.equal(await p.locator('#game').evaluate(e=>e.style.imageRendering),'auto');
 await ready(p);await p.locator('#settings-open').click();assert.equal(await p.locator('[data-binding="0-A-keys"]').textContent(),'Q');assert.equal(await p.locator('#deadzone').inputValue(),'55');
 await p.locator('#reset-settings').click();assert.equal(await p.locator('[data-binding="0-A-keys"]').textContent(),'Z');assert.equal(await p.locator('#deadzone').inputValue(),'35');await p.locator('#settings-close').click();assert.equal(await p.locator('#display').inputValue(),'crisp');
}));

test('desktop play controls: sound, fullscreen, pause, escape, settings, blur, home and restart',()=>desktop(async p=>{
 await ready(p);await p.locator('#sound').click();assert.equal(await p.locator('#sound').textContent(),'开启声音');await p.locator('#sound').click();
 await p.locator('#fullscreen').click();await p.waitForFunction(()=>!!document.fullscreenElement);await p.locator('#fullscreen').click();await p.waitForFunction(()=>!document.fullscreenElement);
 await p.locator('[data-mode="solo"]').click();await p.locator('#pause').click();await p.locator('#paused').waitFor({state:'visible'});await p.locator('#resume').click();await p.locator('#paused').waitFor({state:'hidden'});
 await p.keyboard.press('Escape');await p.locator('#paused').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.locator('#paused').waitFor({state:'hidden'});
 await p.locator('#settings-open').click();await p.locator('#settings-close').click();await p.locator('#paused').waitFor({state:'visible'});await p.locator('#resume').click();
 await p.keyboard.down('ArrowRight');await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.keyboard.up('ArrowRight');await p.locator('#paused').waitFor({state:'visible'});assert.deepEqual(await p.evaluate(()=>webGame.app.controllers),[0,0,0,0]);
 await p.locator('#resume').click();await p.locator('#home').click();await p.locator('[data-mode="versus"]').click();assert.equal((await state(p)).blocked,false);
}));

test('two real keyboard players select teams, start match and move independently',()=>desktop(async p=>{
 await ready(p);await p.locator('[data-mode="versus"]').click();await wait(500);await press(p,'Enter');assert.equal((await state(p)).step,5);
 const teams=(await state(p)).teams;await press(p,'s');const after=(await state(p)).teams;assert.equal(after[0],teams[0]);assert.notEqual(after[1],teams[1]);
 await press(p,'z');await press(p,'g');
 for(let i=0;i<24;i++){const s=await state(p);assert.equal(s.blocked,false,s.error);if(s.family===0&&s.step===2)break;await press(p,i%3===2?'z':'Enter');await press(p,'g');}
 const s=await state(p);assert.equal(s.family,0);assert.equal(s.step,2);await wait(1500);
 const position=()=>p.evaluate(()=>{const r=webGame.app.r;return [r[0x568],r[0x569]].map(i=>[r[0x314+i]|r[0x327+i]<<8,r[0x34d+i]|r[0x360+i]<<8]);});const before=await position();
 await p.keyboard.down('ArrowRight');await p.keyboard.down('w');await wait(600);const moved=await position();for(let i=0;i<2;i++)assert.notDeepEqual(moved[i],before[i]);await p.keyboard.up('ArrowRight');await p.keyboard.up('w');
 for(const key of ['z','x','c','g','h','j']){await press(p,key);assert.equal((await state(p)).blocked,false);}
 await screenshot(p,'desktop-match');
 await p.locator('#pause').click();await p.locator('#resume').click();await p.locator('#home').click();await p.locator('#welcome').waitFor({state:'visible'});
}));

test('solo league enters its original flow and returns safely to lobby',()=>desktop(async p=>{
 await ready(p);await p.locator('[data-mode="solo"]').click();await wait(500);await press(p,'Enter');const s=await state(p);assert.equal(s.mode,128);assert.equal(s.family,2);assert.equal(s.step,2);
 for(const key of ['z','Enter','z','x'])await press(p,key);assert.equal((await state(p)).blocked,false);await p.locator('#home').click();await p.locator('#welcome').waitFor({state:'visible'});
}));

for(const device of ['iPhone 13','Pixel 7'])test(`${device}: reused mobile shell, touch, settings, fullscreen, restart and rotation`,async()=>{
 const b=await chromium.launch();try{const c=await b.newContext({...devices[device]}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForURL('**/mobile/index.html');await p.waitForFunction(()=>window.recoveredApp?.running,{timeout:60000});await p.locator('#game').waitFor({state:'visible'});
 const requestScripts=await p.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.endsWith('.js')).map(x=>x.name));assert.equal(requestScripts.some(x=>x.includes('/src/main.js')||x.includes('/web-game-')),false);
 for(const name of ['A','B','AB','Start','Select']){const el=p.locator(`[data-button="${name}"]`),rect=await el.boundingBox();await el.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2,bubbles:true});await wait(120);assert.notEqual(await p.evaluate(()=>recoveredApp.controllers[0]),0,`${name} touch delivered`);await el.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',bubbles:true});await wait(150);assert.equal(await p.evaluate(()=>recoveredApp.controllers[0]),0);}
 const stick=p.locator('[data-dpad]'),box=await stick.boundingBox();await stick.dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',clientX:box.x+box.width-8,clientY:box.y+box.height/2,bubbles:true});await wait(150);assert.notEqual(await p.evaluate(()=>recoveredApp.controllers[0]),0);await stick.dispatchEvent('pointercancel',{pointerId:2,pointerType:'touch',bubbles:true});await wait(150);assert.equal(await p.evaluate(()=>recoveredApp.controllers[0]),0);
 await p.locator('#settings>summary').tap();await p.locator('#touch-port').selectOption('1');await p.locator('#audio').tap();assert.match(await p.locator('#audio').textContent(),/开启/);await p.locator('#audio').tap();
 await p.locator('#fullscreen').tap();assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('is-immersive')),true);await p.locator('#exit-fullscreen').tap();
 await p.locator('#settings>summary').tap();await p.locator('#restart').tap();assert.equal(await p.evaluate(()=>recoveredApp.blocked),false);
 for(const size of [{width:844,height:390},{width:320,height:568}]){await p.setViewportSize(size);const fits=await p.evaluate(()=>{const r=document.querySelector('#handheld').getBoundingClientRect();return {right:r.right,width:innerWidth};});assert.ok(fits.right<=fits.width+1);}
 await p.reload();await p.waitForFunction(()=>window.recoveredApp?.running);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});

test('phone virtual START and A reach a league match; joystick moves the player',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage({...devices['iPhone 13']});await p.goto(base);await p.waitForFunction(()=>window.recoveredApp?.running,{timeout:60000});
 async function touch(name){await p.locator(`[data-button="${name}"]`).tap();await wait(400);}
 const route=[];
 for(let i=0;i<100;i++){
  const s=await p.evaluate(()=>{const a=recoveredApp,r=a.r;return {family:r[0x58],step:r[0x59]&127,phase:r[0x5c9],blocked:a.blocked,error:a.lastError?.message};});route.push(s);assert.equal(s.blocked,false,s.error);
  if(s.family===0&&s.step===2)break;
  await touch(s.family===1||s.step===0||i%3===0?'Start':'A');
 }
 const active=await p.evaluate(()=>{const r=recoveredApp.r;return [r[0x58],r[0x59]&127];});assert.deepEqual(active,[0,2],JSON.stringify(route));await wait(1200);
 const position=()=>p.evaluate(()=>{const r=recoveredApp.r,i=r[0x568];return [r[0x314+i]|r[0x327+i]<<8,r[0x34d+i]|r[0x360+i]<<8];});const before=await position();
 const stick=p.locator('[data-dpad]'),box=await stick.boundingBox();const client=await p.context().newCDPSession(p);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-8,y:box.y+box.height/2,id:1}]});await wait(650);const after=await position();await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notDeepEqual(after,before,'virtual joystick moves controlled player in a real match');await screenshot(p,'mobile-match');
 assert.equal(await p.evaluate(()=>recoveredApp.blocked),false);
 }finally{await b.close();}
});

test('published build loads two main scripts plus one worker, valid pixel font, and keeps the canvas in bounds',()=>desktop(async p=>{
 const failed=[];p.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});await ready(p);await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');
 const scripts=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.js')).map(r=>r.name));assert.equal(scripts.filter(s=>!s.includes("head-warm-worker-")).length,2,JSON.stringify(scripts));assert.equal(scripts.filter(s=>s.includes("head-warm-worker-")).length,1);
 assert.equal(await p.evaluate(()=>[...document.fonts].every(f=>f.status==='loaded')),true);assert.deepEqual(failed,[]);
 for(const size of [{width:1920,height:1080},{width:800,height:600},{width:390,height:844}]){await p.setViewportSize(size);await wait(100);const dims=await p.locator('#game').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.parentElement.getBoundingClientRect();return {width:r.width,height:r.height,fits:r.width<=s.width&&r.height<=s.height};});assert.equal(dims.fits,true);assert.ok(Math.abs(dims.width/dims.height-16/15)<.001);}
}));
