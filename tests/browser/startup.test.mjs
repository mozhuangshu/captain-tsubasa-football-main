import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/';
const runtime=/\/(?:src\/main|engine\/src\/web-game[^/]*)\.js(?:\?|$)/;

test('cold startup never presents unbound controls as playable',async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage();let release;const gate=new Promise(r=>release=r);
 await page.route(runtime,async route=>{await gate;await route.continue();});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 try{
  await page.locator('[data-mode="versus"]:enabled').waitFor();await page.locator('[data-mode="versus"]').click();assert.match(await page.locator('#boot-status').textContent(),/已选择/);
  assert.match(await page.locator('#boot-status').textContent(),/加载/);
 }finally{release();}
 await page.locator('#welcome').waitFor({state:'hidden',timeout:60000});
 await page.locator('#home').click();await page.locator('#welcome').waitFor({state:'visible'});
 }finally{await browser.close();}
});

test('failed runtime download gives visible error and working retry',async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage();await page.route(runtime,r=>r.abort('failed'));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#boot-retry').waitFor({timeout:8000});
 assert.match(await page.locator('#boot-status').textContent(),/失败/);
 assert.equal(await page.locator('[data-mode="solo"]').isEnabled(),true);
 await page.unroute(runtime);await page.locator('#boot-retry').click();
 await page.locator('[data-mode="solo"]:enabled').waitFor({timeout:60000});
 await page.locator('[data-mode="solo"]').click();await page.locator('#welcome').waitFor({state:'hidden'});
 }finally{await browser.close();}
});

test('browser policy denying gamepads does not break keyboard play',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(url=>url.pathname===new URL(base).pathname,async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'permissions-policy':'gamepad=()'}});});
 await page.goto(base+'?debug');await page.waitForFunction(()=>!!window.webGame,{timeout:60000});await page.locator('[data-mode="versus"]').click();
 await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>webGame.app.blocked),false);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

for(const failedScript of ['mobile/game.js','src/mobile-entry.js'])test(`mobile failed ${failedScript} download shows working retry`,async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone)',isMobile:true,hasTouch:true});
 await page.route('**/'+failedScript+'*',r=>r.abort());await page.goto(base);await page.waitForURL('**/mobile/index.html');await page.locator('#mobile-retry').waitFor({timeout:6000});
 assert.match(await page.locator('#error-banner').textContent(),/加载失败/);await page.unroute('**/'+failedScript+'*');await page.locator('#mobile-retry').click();await page.waitForFunction(()=>window.recoveredApp?.running,{timeout:60000});
 }finally{await browser.close();}
});

test('loading status remains visible on a short desktop window',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:800,height:600}});let release;const gate=new Promise(r=>release=r);await p.route(runtime,async r=>{await gate;await r.continue();});await p.goto(base,{waitUntil:'domcontentloaded'});
 try{assert.equal(await p.locator('#boot-status').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);}),true,'loading guidance is clipped by the welcome overlay');}finally{release();}
 }finally{await b.close();}
});
