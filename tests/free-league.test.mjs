import {test} from 'node:test';import assert from 'node:assert/strict';
import {RecoveredApp,BUTTONS as B} from '../engine/src/app-runtime.js';
import {initializeTsubasaGame} from '../engine/src/tsubasa-bootstrap.js';
import {createTsubasaGraphics} from '../engine/src/tsubasa-runtime.js';
import {installLeagueStory,leagueStoryHooks} from '../engine/src/tsubasa-league-story.js';
import {leagueStateView} from '../engine/src/league-flow.js';
import {OPPONENT_MENU,settleLeagueMatch,encodeLeaguePassword,restoreLeaguePassword,routeCompletedMatch} from '../engine/src/league.js';
import {prepareSession} from '../src/session.js';
initializeTsubasaGame();
async function frame(a){await a.step();assert.equal(a.blocked,false,a.lastError?.message);do{await a.nextNativeFrame();}while(a.r[0x51]<a.r[0x5e6]);}
async function wait(a,n=16){for(let i=0;i<n;i++)await frame(a);}
async function press(a,bit){a.setController(0,bit);await frame(a);a.setController(0,0);await wait(a);}
async function create(){const a=new RecoveredApp({nextFrame:async()=>{},graphics:createTsubasaGraphics(),tsubasaSpecialMoves:true});prepareSession(a,'solo');installLeagueStory(a,{preload:false,loadImage:()=>null});await wait(a);await press(a,B.Start);for(let n=0;n<8&&a.storyLayer.dialogue;n++)await press(a,B.B);assert.equal(a.r[0x59]&127,2);return a;}
test('new single-player league can start with any of its twelve opponents',async()=>{
 for(let i=0;i<12;i++){const a=await create();a.r[0x5ca]=i;await press(a,B.A);assert.equal(a.r[0x59]&127,3,`opponent ${OPPONENT_MENU[i*2]&15} is locked`);assert.equal(a.r[0x52d]&15,OPPONENT_MENU[i*2]&15);
  for(let n=0;n<65&&!(a.r[0x58]===0&&(a.r[0x59]&127)===2);n++){await press(a,a.storyLayer.dialogue?B.B:n%3===2?B.A:B.Start);}
  assert.deepEqual([a.r[0x58],a.r[0x59]&127],[0,2]);assert.equal(a.r[0x52d]&15,OPPONENT_MENU[i*2]&15);assert.equal(a.r[0x569],255,'opponent must be CPU controlled');
 }
});
test('loss is recorded normally and never locks the player into a chapter retry',async()=>{
 const a=await create(),r=a.r;r[0x52d]=0xc1;r[0x52e]=0;r[0x52f]=1;r[0x52a]=1;const result=settleLeagueMatch(leagueStateView(r));leagueStoryHooks().afterSettle(r,result);
 assert.equal(r[0x53e]&3,1);assert.equal(r[0x557],1);for(let i=0;i<12;i++)assert.equal(leagueStoryHooks().allows(r,OPPONENT_MENU[i*2]&15),true);
 const saved=encodeLeaguePassword(leagueStateView(r),12),restored=leagueStateView(new Uint8Array(2048));assert.equal(restoreLeaguePassword(restored,saved),true);assert.equal(restored.losses,0,'native passwords retain victories and points, not losses');
 r[0x52e]=2;r[0x52f]=0;settleLeagueMatch(leagueStateView(r));const wins=encodeLeaguePassword(leagueStateView(r),4);assert.equal(restoreLeaguePassword(restored,wins),true);assert.equal(restored.records[0]&3,1);assert.equal(restored.points,r[0x555]);
});

for(const [outcome,home,away] of [['win',2,0],['loss',0,2],['draw',1,1]])test(`${outcome} returns to a freely selectable next league opponent`,async()=>{
 const a=await create(),r=a.r;r[0x5ca]=1;await press(a,B.A);
 for(let n=0;n<65&&!(r[0x58]===0&&(r[0x59]&127)===2);n++)await press(a,a.storyLayer.dialogue?B.B:n%3===2?B.A:B.Start);
 assert.deepEqual([r[0x58],r[0x59]&127],[0,2]);
 // Fixture: completed full-time scores; run the actual result routing and qualification settlement.
 r[0x52e]=home;r[0x52f]=away;r[0x52a]=1;r[0x52b]=1;routeCompletedMatch(leagueStateView(r));await wait(a,40);
 assert.equal(r[0x59]&127,2);assert.equal(r[0x556],1);assert.equal(r[0x53e+5]&3,1);assert.equal(r[0x557],outcome==='loss'?1:0);
 r[0x5ca]=10;await press(a,B.A);assert.equal(r[0x59]&127,3);assert.equal(r[0x52d]&15,15);
});
