import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER_MENU_DATA as D} from '../engine/src/roster-menus-data.js';
import {commitTeamSelection,initializeTeamSelectionObjects} from '../engine/src/roster-menus.js';
import {PRIMARY_MENU_PHASE_DATA,commitParticipantMenuOption,restoreParticipantMenuOption,navigateMenuOption} from '../engine/src/state-dispatch.js';
const teams=[0,1,2,3,5,6,7,9,10,11,13,14,15];
test('both players can independently select all 13 teams including mirror matches',()=>{
 const r=new Uint8Array(2048);initializeTeamSelectionObjects(r);
 for(let side=0;side<2;side++){const seen=new Set();for(let n=0;n<13;n++){commitTeamSelection(r);seen.add(r[0x52c+side]);r[0x5cd]=6;navigateMenuOption(r,side+2,D.neighbors5);}assert.deepEqual([...seen].sort((a,b)=>a-b),teams);}
 for(let i=0;i<13;i++)for(let j=0;j<13;j++){r[0x5ca]=i|128;r[0x5cb]=(j+13)|128;commitTeamSelection(r);assert.deepEqual([r[0x52c],r[0x52d]],[teams[i],teams[j]]);}
});
test('participant navigation cannot enter 3P or 4P including restored old choices',()=>{
 const r=new Uint8Array(2048);r[0x57]=64;
 for(const old of [2,3,4]){r[0x5d]=old;restoreParticipantMenuOption(r);for(let n=0;n<10;n++){commitParticipantMenuOption(r);assert.equal(r[0x5d],2);r[0x5cd]=8;navigateMenuOption(r,2,PRIMARY_MENU_PHASE_DATA[2].neighbors);}}
});
