import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4180/dist/';
for(const mobile of [false,true])test(`${mobile?'phone':'desktop'} built keeper recovers collision and restarts after substitution`,async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(mobile?devices['iPhone 13']:{}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/__keeper-fixture.js',route=>route.fulfill({path:new URL('../../test-results/fixtures/keeper.js',import.meta.url).pathname,contentType:'text/javascript'}));
  await page.goto(base+'?debug');await page.waitForFunction(()=>window.webGame||window.recoveredApp,null,{timeout:60000});
  const results=await page.evaluate(async()=>{
   const app=window.webGame?.app??window.recoveredApp;app.stop();while(app.busy)await new Promise(requestAnimationFrame);
   app.storyLayer=null;app.boot=false;app.framePromise=async()=>{};
   const fixture=await import(new URL('__keeper-fixture.js',location.href)),results=[];
   for(const side of [0,1])for(const kind of ['shot','goalkick']){
    app.reset();await fixture.enterTestMatch({app});
    const save=await fixture.launchNativeKeeperSave(app,side);app.r[0x532+10+side]=11;
    const recovery=await fixture.observeKeeperBall(app,side,kind);
    results.push({side,kind,save,recovery,blocked:app.blocked,score:[app.r[0x52e],app.r[0x52f]]});
   }
   return results;
  });
  for(const row of results){assert.equal(row.save.blocked,true);assert.equal(row.kind==='shot'?row.recovery.caught:row.recovery.resumed,true,JSON.stringify(row));assert.equal(row.blocked,false);assert.deepEqual(row.score,[0,0]);}
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
