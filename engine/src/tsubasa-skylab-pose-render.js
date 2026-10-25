/** D-29 Skylab launch poses: screen placement of project's authored frames for the two twins.
 * Pure (reads RAM + assembled actors). Art faces left; mirrored when the twin faces right.
 * Board twin: S1 lying on the grass (bottom row on its ground/shadow line, even while the native
 * board hops). Both authored poses only while the jumper is airborne (else native poses). Jumper: S2 with its shoe soles
 * one row above S1's upturned soles (soles aligned) while still on the board (SOLE_CONTACT), then at its own
 * position once higher; shooter: S3 at its own position. 'dive' keeps the native pose. */
import {getTsubasaSkylabPoses} from './tsubasa-special-moves.js';
/** Push-off contact: S1's upturned soles stand 33 px above the grass while the native stack
 * puts the jumper's feet ~24..36 px up (the board itself hops 4..7 px on the boost), so the
 * jumper counts as still on the board while its feet are within 4 px above the soles. */
export const SOLE_CONTACT=4;
let lastDrawn=[];
/** Placements used by the most recent sprite paint (read-only, for review/tests). */
export function getLastSkylabPlacements(){return lastDrawn;}
export function noteSkylabPlacementsDrawn(list){lastDrawn=list;return list;}
export function computeTsubasaSkylabPlacements(r,actors){
 const poses=getTsubasaSkylabPoses(r);if(!poses.length)return [];const out=[];
 const actorOf=slot=>actors.find(a=>a.entity===slot&&a.kind===0);
 const place=(art,actor,mirrored)=>({left:Math.round(actor.x-art.width/2),top:actor.y-art.height+1});
 const soleX=(art,m)=>m?art.width-1-art.sole.x:art.sole.x;
 let board=null;const jumperActor=actorOf(poses.find(p=>p.role==='jumper')?.slot);if(!jumperActor||jumperActor.groundY-jumperActor.y<=0)return [];
 for(const p of poses){const art=p.authored?.[0],actor=actorOf(p.slot);if(!art||!actor)continue;const mirrored=p.facing==='right';let {left,top}=place(art,actor,mirrored);if(p.role==='board')top=actor.groundY-art.height+1;
  if(p.role==='board')board={art,left,top,mirrored};
  else if(p.phase==='launch'&&board&&board.art.stack){/* v4: S2 top = S1 top - 32, same left origin (equal widths, so mirroring keeps it) */const t=board.top+board.art.stack.s2Top,l=board.left+board.art.stack.s2Left;if(top>=t-SOLE_CONTACT){top=t;left=l;}}
  else if(p.phase==='launch'&&board&&art.sole&&board.art.sole){const soleTop=board.top+board.art.sole.row-1-art.sole.row,soleLeft=Math.round(board.left+soleX(board.art,board.mirrored)-soleX(art,mirrored));if(top>=soleTop-SOLE_CONTACT){top=soleTop;left=soleLeft;}}
  out.push({entity:p.slot,characterId:p.characterId,phase:p.phase,role:p.role,art,left,top,mirrored});}
 return out;}
/** Iterate the native pixels of a placement: fn(x,y,letter). */
export function forEachSkylabPosePixel(pl,fn){const {art,left,top,mirrored}=pl;for(let y=0;y<art.height;y++)for(let x=0;x<art.width;x++){const c=art.rows[y][mirrored?art.width-1-x:x];if(c!=='.')fn(left+x,top+y,c);}}
