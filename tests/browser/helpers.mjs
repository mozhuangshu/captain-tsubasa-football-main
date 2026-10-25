// Selection tests start at a known menu; startup and boot are covered separately.
export async function resetMobileToPrimaryMenu(page){
 await page.evaluate(async()=>{const {prepareSession}=await import(new URL('../src/session.js',location.href));const app=recoveredApp;app.stop();while(app.busy)await new Promise(requestAnimationFrame);prepareSession(app,'solo');app.run();});
 await page.waitForFunction(()=>{const r=recoveredApp.r;return r[0x58]===2&&(r[0x59]&127)===1&&r[0x5c9]===1&&r[0x5ca]<128;});
}
