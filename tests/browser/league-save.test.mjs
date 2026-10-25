import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/',key='tsubasa-web-league-v1';
const evidence=process.env.LEAGUE_SAVE_EVIDENCE_DIR||new URL('../../test-results/league-save/',import.meta.url).pathname;fs.mkdirSync(evidence,{recursive:true});
for(const mobile of [false,true])test(`${mobile?'phone':'desktop'} league autosave survives reload, continues freely, and protects existing progress`,async()=>{
 const b=await chromium.launch();try{const context=await b.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?debug');await p.waitForFunction(()=>window.webGame||window.recoveredApp,null,{timeout:60000});
 if(!mobile)await p.locator('[data-mode="solo"]').click();
 const press=async()=>{if(mobile)await p.locator('[data-button="Start"]').tap();else await p.keyboard.press('Enter',{delay:100});await p.waitForTimeout(400);};
 for(let i=0;i<25;i++){if(await p.evaluate(()=>!!localStorage.getItem('tsubasa-web-league-v1')))break;await press();}
 await p.waitForFunction(()=>!!localStorage.getItem('tsubasa-web-league-v1'));
 // Fixture: final whistle state. The real qualification handler settles a win, loss, then draw.
 for(const [home,away]of [[2,0],[0,1],[1,1]])await p.evaluate(async({home,away})=>{const a=window.webGame?.app??recoveredApp;a.stop();while(a.busy)await new Promise(requestAnimationFrame);const r=a.r;r[0x52d]=0xc7;r[0x52e]=home;r[0x52f]=away;r[0x52a]=r[0x52b]=1;r[0x58]=2;r[0x59]=14;r[0x5b]=3;await a.step();a.run();},{home,away});
 const before=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key));assert.equal(before.played,3);assert.equal(before.wins,1);assert.equal(before.losses,1);assert.equal(before.records[5]&3,3);
 await p.reload();await p.waitForFunction(()=>window.webGame||window.recoveredApp,null,{timeout:60000});await p.locator('#league-continue').waitFor({state:'visible'});await p.screenshot({path:evidence+`/${mobile?'phone':'desktop'}-continue.png`});
 await p.locator('#league-continue').click();await p.waitForFunction(()=>{const r=(window.webGame?.app??recoveredApp).r;return r[0x58]===2&&(r[0x59]&127)===2&&r[0x5c9]===1;});
 const restored=await p.evaluate(()=>{const r=(window.webGame?.app??recoveredApp).r;return{points:r[0x555],played:r[0x556],losses:r[0x557],wins:r[0x558],records:[...r.slice(0x53e,0x54a)]};});for(const [k,v]of Object.entries(restored))assert.deepEqual(v,before[k]);
 // Resume selection still permits a different opponent; a half-played score must not replace the checkpoint.
 await p.evaluate(()=>{const a=window.webGame?.app??recoveredApp;a.r[0x5ca]=10;a.setController(0,128);});await p.waitForTimeout(150);await p.evaluate(()=>(window.webGame?.app??recoveredApp).setController(0,0));
 await p.waitForFunction(()=>{const r=(window.webGame?.app??recoveredApp).r;return (r[0x52d]&15)===15&&(r[0x59]&127)===3;});
 await p.reload();await p.waitForFunction(()=>window.webGame||window.recoveredApp,null,{timeout:60000});
 const stored=await p.evaluate(k=>localStorage.getItem(k),key);assert.equal(JSON.parse(stored).played,3);
 if(!mobile){await p.locator('[data-mode="versus"]').click();await p.locator('#home').click();assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),stored);}
 else{await p.locator('#league-versus').tap();assert.equal(await p.evaluate(()=>recoveredApp.r[0x57]&240),64);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),stored);await p.reload();await p.locator('#league-continue').waitFor({state:'visible'});}
 p.once('dialog',d=>d.dismiss());await p.locator(mobile?'#league-new':'[data-mode="solo"]').click();assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),stored);
 p.once('dialog',d=>d.accept());await p.locator(mobile?'#league-new':'[data-mode="solo"]').click();for(let i=0;i<25;i++){if(await p.evaluate(k=>!!localStorage.getItem(k),key))break;await press();}
 const fresh=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key));assert.equal(fresh.played,0);assert.equal(fresh.points,0);assert.deepEqual(errors,[]);
 fs.writeFileSync(evidence+`/${mobile?'phone':'desktop'}-save.json`,JSON.stringify({before,restored,fresh,errors},null,2));
 }finally{await b.close();}
});
test('storage refusal leaves desktop and phone playable with an honest save notice',async()=>{
 const b=await chromium.launch();try{for(const mobile of [false,true]){const p=await b.newPage(mobile?devices['iPhone 13']:{});await p.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=()=>{throw Error('storage denied');};});await p.goto(base+'?debug');await p.waitForFunction(()=>window.webGame||window.recoveredApp,null,{timeout:60000});if(!mobile)await p.locator('[data-mode="solo"]').click();assert.equal(await p.evaluate(()=>(window.webGame?.app??recoveredApp).blocked),false);assert.match(await p.locator('#league-save-status').textContent(),/存档|保存/);await p.close();}}finally{await b.close();}
});
