import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {CELEBRATION_DATA as data} from '../engine/art/celebration-data.js';
import {resolveNonmatchArt,NONPERSON_FRAMES,NONMATCH_PLANS} from '../engine/art/nonmatch-characters.js';
import {isSharedCelebration,getCelebrationCacheStats} from '../engine/art/celebration.js';
import {TSUBASA_ROSTERS} from '../engine/src/tsubasa-teams.js';import {SPRITE_KINDS} from '../engine/src/sprite-kinds.js';
test('shipped celebration keeps one reviewed body and 49 unique head pairs',()=>{
 assert.equal(data.frames.length,6);assert.equal(Object.keys(data.heads).length,49);assert.deepEqual(data.aliases,{tachibana_kazuo:'tachibana_masao'});
 // Fixed hashes cover reviewed pixel data without requiring the unpublished art lab.
 assert.equal(createHash('sha256').update(JSON.stringify(data.frames)).digest('hex'),'e4ab7a000e090e57258ca5bcc86e0ea80cf733067d403f5de97f8b7127194226');
 assert.equal(createHash('sha256').update(JSON.stringify(data.heads)).digest('hex'),'17b2308fba19bcb10b0fb85211efd5dc486f752b74f79701d0642b1df4212516');
 assert.doesNotMatch(JSON.stringify(data),/original|raw\/|source|reference|kit/);
});
test('only goal and final celebration actors opt in',()=>{
 const r=new Uint8Array(2048);for(const main of [0,1,2,3])for(let sub=0;sub<14;sub++)for(let kind=0;kind<10;kind++){r[0x58]=main;r[0x59]=sub;assert.equal(isSharedCelebration({kind},r),main===0&&[5,10].includes(sub)&&[4,7].includes(kind));}
});
test('all lineups use the right new head in all six poses without writing game state',()=>{
 let checks=0;for(const team of TSUBASA_ROSTERS.rosters)for(const p of team.players)for(const side of [0,1])for(const index of [0,1,2,3,4,5]){
  const r=new Uint8Array(2048);r[0x59]=5;r[0x52c+side]=team.teamId;r[0x532+side]=p.playerNumber;r[0x5e2]=index*4;r.set([44,45,46,47],0x5b8);const before=r.slice(),actor={kind:4,frame:10,entity:side,playerNumber:p.playerNumber},result=resolveNonmatchArt(actor,r);assert.deepEqual(r,before);assert.equal(result.characterId,p.characterId);assert.equal(result.art.status,'shared-celebration-f');assert.equal(result.art.celebrationFrame,index);
  const id=data.aliases[result.artCharacterId]??result.artCharacterId,c=data.heads[id],head=c.heads[data.expressions[index]],f=data.frames[index],hx=f.neck.x-head.anchor.x,hy=f.neck.y-head.anchor.y;
  head.pixels.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='0')return;assert.equal(result.art.pixels[hy+y][hx+x],v);assert.equal(result.art.materials[hy+y][hx+x],'0');assert.equal(result.art.paletteOwners[hy+y][hx+x],'0');}));checks++;
 }assert.equal(checks,84*2*6);assert(getCelebrationCacheStats().size<=24);
});
test('old composite and rolling pieces cannot leak into result-board people; flags/effects stay untouched',()=>{
 const r=new Uint8Array(2048);r[0x59]=10;r[0x532]=0;r[0x53c]=11;r.set([44,45,46,47],0x5b8);
 for(const kind of [4,7])for(let frame=0;frame<SPRITE_KINDS[kind].length;frame++){const result=resolveNonmatchArt({kind,frame,entity:1,playerNumber:0},r);if(NONPERSON_FRAMES[kind].includes(frame)&&!(kind===7&&[43,44,45].includes(frame)))assert.equal(result,null);else assert.equal(result.art.status,'shared-celebration-f',`${kind}:${frame}`);}
 const captain=resolveNonmatchArt({kind:7,frame:55,entity:1},r),keeper=resolveNonmatchArt({kind:7,frame:57,entity:3},r);assert.notEqual(captain.presentation.x,keeper.presentation.x);assert.equal(captain.characterId,'tsubasa');assert.equal(keeper.role,'keeper');
 r[0x59]=8;for(const kind of [4,7])for(const frame of Object.keys(NONMATCH_PLANS[kind]).map(Number))assert.notEqual(resolveNonmatchArt({kind,frame,entity:0,playerNumber:0},r)?.art.status,'shared-celebration-f');
});
