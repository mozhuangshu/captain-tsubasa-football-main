import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CANONICAL_HEADS} from '../engine/art/canonical-heads.js';
import {resolveNonmatchArt,NONMATCH_PLANS} from '../engine/art/nonmatch-characters.js';
import {TSUBASA_ROSTERS} from '../engine/src/tsubasa-teams.js';
test('unchanged halftime foreground preserves canonical heads',()=>{
 let checked=0;
 for(const team of TSUBASA_ROSTERS.rosters)for(const person of team.players){
  const head=CANONICAL_HEADS[person.characterId];if(!head)continue;
  for(const kind of [4,7])for(const frame of Object.keys(NONMATCH_PLANS[kind]).map(Number)){
   const r=new Uint8Array(2048);r[0x58]=0;r[0x59]=8;r[0x52c]=team.teamId;r[0x532]=person.playerNumber;r.set([44,45,46,47],0x5b8);
   const resolved=resolveNonmatchArt({kind,frame,entity:0,playerNumber:person.playerNumber},r),a=resolved.art;
   if(resolved.artCharacterId!==person.characterId)continue;
   const rows=head[a.pose];for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]!=='0'){
    const ax=(a.headRegion.x-a.originX)*2+x,ay=(a.headRegion.y-a.originY)*2+y;
    assert.equal(a.paletteOwners[ay][ax],'1',`${person.characterId} pose ${frame}: legacy foreground overwrites head ${x},${y}`);
    assert.equal(a.pixels[ay][ax],rows[y][x]);checked++;
   }
  }
 }
 assert.ok(checked>10000);
});

test('unchanged halftime rolling and paired poses preserve every authored head pixel',()=>{
 const r=new Uint8Array(2048);r[0x59]=8;r[0x532]=0;r[0x534]=1;r.set([44,45,46,47],0x5b8);
 for(const [kind,frame] of [[4,10],[4,11],[4,12],[4,13],[7,6],[7,11]]){
  const {art}=resolveNonmatchArt({kind,frame,entity:0,playerNumber:0},r);
  for(const region of art.headRegions){const person=art.compositeIdentities.find(p=>p.person===region.person),head=CANONICAL_HEADS[person.artCharacterId];
   const expected=head.front.join('').replaceAll('0','').length;
   assert.equal(region.visiblePixels,expected,`${kind}:${frame} person ${region.person}: foreground removed face pixels`);
  }
 }
});
