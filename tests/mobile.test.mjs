import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prefersHandheld} from '../src/device.js';

test('mobile keeps two touch ports and shares the web source entry',()=>{
 const html=fs.readFileSync(new URL('../mobile/index.html',import.meta.url),'utf8');
 assert.match(html,/data-dpad/);assert.match(html,/data-button="AB"/);assert.doesNotMatch(html,/>3P<|>4P</);
 assert.match(html,/<dialog id="league-resume">/);assert.match(html,/>关闭声音</);
 const entry=fs.readFileSync(new URL('../src/mobile-entry.js',import.meta.url),'utf8');assert.match(entry,/mobile-main\.js/);
});

test('desktop, narrow desktop and touch laptops retain keyboard UI; phones and iPad use handheld',()=>{
 const cases=[
  {name:'desktop',userAgent:'Mozilla/5.0 (Windows NT 10.0)',platform:'Win32',maxTouchPoints:0,coarse:false,mobile:false},
  {name:'narrow desktop',userAgent:'Mozilla/5.0 (Macintosh)',platform:'MacIntel',maxTouchPoints:0,coarse:false,mobile:false},
  {name:'touch laptop with mouse',userAgent:'Mozilla/5.0 (Windows NT 10.0)',platform:'Win32',maxTouchPoints:10,coarse:false,mobile:false},
  {name:'iPhone',userAgent:'Mozilla/5.0 (iPhone)',platform:'iPhone',maxTouchPoints:5,coarse:true,mobile:true},
  {name:'Android with mouse',userAgent:'Mozilla/5.0 (Linux; Android 14)',platform:'Linux',maxTouchPoints:5,coarse:false,mobile:true},
  {name:'iPad desktop UA',userAgent:'Mozilla/5.0 (Macintosh)',platform:'MacIntel',maxTouchPoints:5,coarse:true,mobile:true},
 ];
 for(const c of cases)assert.equal(prefersHandheld(c,q=>{assert.equal(q,'(pointer: coarse) and (hover: none)');return {matches:c.coarse};}),c.mobile,c.name);
});
