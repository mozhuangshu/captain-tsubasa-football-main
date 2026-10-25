import {test} from 'node:test';import assert from 'node:assert/strict';
import {RecoveredApp,BUTTONS as B} from '../engine/src/app-runtime.js';
import {initializeTsubasaGame} from '../engine/src/tsubasa-bootstrap.js';
import {createTsubasaGraphics} from '../engine/src/tsubasa-runtime.js';
import {installLeagueStory} from '../engine/src/tsubasa-league-story.js';
import {leagueStateView} from '../engine/src/league-flow.js';
import {routeCompletedMatch} from '../engine/src/league.js';
import {prepareSession} from '../src/session.js';
import {installLeagueSave,readLeagueSave,restoreLeagueSave,LEAGUE_SAVE_KEY,validLeagueSave} from '../src/league-save.js';
initializeTsubasaGame();
const storage=()=>({value:null,writes:0,getItem(){return this.value;},setItem(k,v){assert.equal(k,LEAGUE_SAVE_KEY);this.value=v;this.writes++;},removeItem(){this.value=null;}});
const app=()=>{const a=new RecoveredApp({nextFrame:async()=>{},graphics:createTsubasaGraphics(),tsubasaSpecialMoves:true});installLeagueStory(a,{preload:false,loadImage:()=>null});return a;};
async function frame(a,n=1){for(let i=0;i<n;i++){await a.step();assert.equal(a.blocked,false,a.lastError?.message);do{await a.nextNativeFrame();}while(a.r[0x51]<a.r[0x5e6]);}}
async function press(a,b){a.setController(0,b);await frame(a);a.setController(0,0);await frame(a,16);}
async function create(){const a=app(),s=storage(),save=installLeagueSave(a,{storage:s});prepareSession(a,'solo');await frame(a,16);await press(a,B.Start);assert.equal(a.r[0x59]&127,2);return{a,s,save};}
for(const [outcome,h,v]of [['win',2,0],['loss',0,2],['draw',1,1]])test(`local league ${outcome} survives reload exactly, without reapplying settlement`,async()=>{
 const {a,s}=await create(),r=a.r;r[0x52d]=0xc7;r[0x52e]=h;r[0x52f]=v;r[0x52a]=r[0x52b]=1;routeCompletedMatch(leagueStateView(r));await frame(a,40);
 const saved=readLeagueSave(s).save;assert(validLeagueSave(saved));assert.equal(saved.played,1);assert.equal(saved.wins,outcome==='win'?1:0);assert.equal(saved.losses,outcome==='loss'?1:0);assert.equal(saved.records[5]&3,1);
 const b=app();assert(restoreLeagueSave(b,saved));await frame(b,40);assert.equal(b.r[0x59]&127,2);for(const k of ['points','played','wins','losses'])assert.equal(leagueStateView(b.r)[k],saved[k]);assert.deepEqual([...leagueStateView(b.r).records],saved.records);
 b.r[0x5ca]=10;await press(b,B.A);assert.equal(b.r[0x52d]&15,15);for(let n=0;n<65&&!(b.r[0x58]===0&&b.r[0x59]===2);n++)await press(b,b.storyLayer.dialogue?B.B:n%3===2?B.A:B.Start);
 assert.deepEqual([b.r[0x58],b.r[0x59]],[0,2]);assert.equal(b.r[0x569],255);
});
test('no repeated writes while idle, no incomplete-match save, and versus preserves the league',async()=>{
 const {a,s}=await create(),saved=s.value,writes=s.writes;await frame(a,60);assert.equal(s.writes,writes);
 a.r[0x58]=0;a.r[0x59]=2;a.r[0x52e]=5;a.report();assert.equal(s.value,saved);
 prepareSession(a,'versus');await frame(a,40);assert.equal(s.value,saved);
});
test('corrupt or newer saves are preserved, storage refusal does not stop gameplay',async()=>{
 const {s}=await create(),saved=JSON.parse(s.value);for(const raw of ['{',JSON.stringify({...saved,version:2}),JSON.stringify({...saved,played:99})]){s.value=raw;assert.equal(readLeagueSave(s).save,null);assert.equal(s.value,raw);}
 const a=app(),messages=[];installLeagueSave(a,{storage:{getItem(){throw Error();},setItem(){throw Error();}},onChange:x=>messages.push(x)});prepareSession(a,'solo');await frame(a,16);await press(a,B.Start);await frame(a,50);assert.equal(a.blocked,false);assert.equal(messages.length,1);assert(messages[0].error);
});
test('resume paired bracket without generating a different opponent; explicit clear removes only own save',async()=>{
 const {a,s,save}=await create();a.r[0x54a]=0;a.r[0x59]=15;a.r[0x5b]=3;await frame(a,40);const stored=readLeagueSave(s).save;assert.equal(stored.screen,'bracket');const b=app();assert(restoreLeagueSave(b,stored));await frame(b,40);assert.deepEqual([...b.r.slice(0x54b,0x555)],stored.bracket);assert.equal(b.r[0x52d],stored.opponent);assert.equal(b.r[0x54a],stored.stage);save.clear();assert.equal(readLeagueSave(s).save,null);
});
test('resetting or entering another mode cannot overwrite a previous league without explicit new/continue',async()=>{
 const {a,s,save}=await create(),old=s.value;prepareSession(a,'versus');await frame(a,16);prepareSession(a,'solo');await frame(a,16);await press(a,B.Start);assert.equal(s.value,old);
 assert(save.restore());await frame(a,30);assert.equal(a.r[0x59]&127,2);save.clear();prepareSession(a,'solo');await frame(a,16);await press(a,B.Start);assert(readLeagueSave(s).save);
});
