/** D-31 sprite rotation (NOT in the original: D-30 measured that the native engine never rotates or
 * flickers; it drops the rear-most sprites on an overfull scanline every frame).
 * Presentation only, special path only: active only while a Tsubasa special move is active AND a
 * scanline holds more than 8 sprites (D-33: any scanline, any special) (native OAM records actually on screen, minus the twins' records
 * replaced by authored poses, plus the poses tiled 8x8). On each overfull scanline, units are admitted
 * whole, in this order, until 8 sprites are used:
 *   1. the ball (any ball record, incl. special balls) and the goalkeepers: never rotated;
 *   2. Skylab poses: S1/S2 swap first place every frame, so each leads at least once in any
 *      2 consecutive frames (S3 follows them);
 *   3. everything else (other players, shadows), rotated by the frame counter: rotated out first.
 * Units that do not fit are hidden on that scanline only. No RAM is written. */
import {getTsubasaSpecialState} from './tsubasa-special-moves.js';
import {forEachSkylabPosePixel} from './tsubasa-skylab-pose-render.js';
const LIMIT=8;
export function computeTsubasaSpriteRotation(r,actors,placements=[]){
 // the special is active from the Skylab springboard on (authored poses placed) or while a special shot is in flight
 const st=getTsubasaSpecialState(r);if((!st||st.nativeArtwork)&&!placements.length)return null;
 const oam=r.subarray(0x200,0x300),owner=new Map(),replaced=new Set();
 for(const a of actors)for(const i of a.oamIndices??[])if(a.sourceRecords?.[a.oamIndices.indexOf(i)]?.every((v,k)=>v===oam[i*4+k])??true)owner.set(i,a);
 for(const p of placements){const a=actors.find(q=>q.entity===p.entity&&q.kind===0);for(const i of a?.oamIndices??[])replaced.add(i);}
 const units=new Map(),unit=(key,cls,extra)=>{let u=units.get(key);if(!u){u={key,cls,rows:new Uint8Array(240),...extra};units.set(key,u);}return u;};
 for(let n=0;n<64;n++){if(replaced.has(n)||oam[n*4]>=239)continue;const a=owner.get(n);
  const u=!a?unit(`rec${n}`,'other',{records:[n]}):a.entity===12?unit('ball','pinned',{entity:12}):a.kind===0&&(a.entity===10||a.entity===11)?unit(`k${a.entity}`,'pinned',{entity:a.entity}):unit(`e${a.entity}`,'other',{entity:a.entity});
  if(!a&&!u.records.includes(n))u.records.push(n);const y=oam[n*4]+1;for(let k=0;k<8;k++)if(y+k<240)u.rows[y+k]++;}
 for(const p of placements){const id=p.art.id.slice(0,2),u=unit(id,'pose',{entity:p.entity,art:p.art.id}),tiles=new Set();
  forEachSkylabPosePixel(p,(x,y)=>tiles.add(`${Math.floor((x-p.left)/8)},${Math.floor((y-p.top)/8)}`));u.left=p.left;u.cols=new Map();
  for(const t of tiles){const [tx,ty]=t.split(',').map(Number);for(let k=0;k<8;k++){const y=p.top+ty*8+k;if(y>=0&&y<240){u.rows[y]++;if(!u.cols.has(y))u.cols.set(y,[]);u.cols.get(y).push(tx);}}}}
 const all=[...units.values()],total=new Uint8Array(240);for(const u of all)for(let y=0;y<240;y++)total[y]+=u.rows[y];
 // D-33: during any special every scanline over 8 rotates (ball and keepers pinned); ordinary play never rotates.
 const overRows=[];for(let y=0;y<240;y++)if(total[y]>LIMIT)overRows.push(y);
 if(!overRows.length)return null;
 const frame=r[0x300],poses=all.filter(u=>u.cls==='pose').sort((a,b)=>a.key.localeCompare(b.key));
 const s12=poses.filter(u=>u.key==='S1'||u.key==='S2');if(frame&1)s12.reverse();
 const others=all.filter(u=>u.cls==='other').sort((a,b)=>a.key.localeCompare(b.key));const off=others.length?frame%others.length:0;
 const order=[...all.filter(u=>u.cls==='pinned'),...s12,...poses.filter(u=>!s12.includes(u)),...others.slice(off),...others.slice(0,off)];
 const hidden=new Map();// unit key -> Set(scanline)
 const tileHidden=new Map();// pose unit -> Map(scanline -> Set(tile column))
 const after=Array.from(total);
 for(const y of overRows){let used=0;for(const u of order){const c=u.rows[y];if(!c)continue;if(u.cls==='pinned'||used+c<=LIMIT){used+=c;continue;}
  if(u.cls==='pose'){// a pose is admitted tile by tile; the dropped tiles rotate with the frame counter,
   // so every tile of S1/S2 is shown at least once in any 2 consecutive frames whenever one slot is left.
   const free=Math.max(0,LIMIT-used),cols=[...u.cols.get(y)].sort((a,b)=>a-b),n=cols.length,drop=n-free,start=(frame*Math.max(1,drop))%n,gone=new Set();for(let i=0;i<drop;i++)gone.add(cols[(start+i)%n]);used+=free;
   if(!tileHidden.has(u.art))tileHidden.set(u.art,new Map());tileHidden.get(u.art).set(y,gone);if(!hidden.has(u.key))hidden.set(u.key,new Set());hidden.get(u.key).add(y);continue;}
  if(!hidden.has(u.key))hidden.set(u.key,new Set());hidden.get(u.key).add(y);}after[y]=used;}
 const byEntity=new Map(),byRecord=new Map(),byPose=new Map();
 for(const [key,set] of hidden){const u=units.get(key);if(u.cls==='pose')continue;else if(u.records)for(const n of u.records)byRecord.set(n,set);else byEntity.set(u.entity,set);}
 return {active:true,frame,overRows,afterMax:Math.max(...after),hidden:Object.fromEntries([...hidden].map(([k,s])=>[k,[...s]])),units:all.map(u=>({key:u.key,cls:u.cls,entity:u.entity??null})),
  entityHidden:(e,y)=>!!byEntity.get(e)?.has(Math.floor(y)),poseHidden:(artId,y,x)=>{const m=tileHidden.get(artId)?.get(Math.floor(y));if(!m)return false;const u=poses.find(q=>q.art===artId);return m.has(Math.floor((Math.floor(x)-u.left)/8));},
  hiddenPoseTiles:Object.fromEntries([...tileHidden].map(([a,m])=>{const u=poses.find(q=>q.art===a);return [a,{top:u.top,rows:Object.fromEntries([...m].map(([y,g])=>[y-u.top,[...g]]))}];})),
  poseTilesHidden:Object.fromEntries([...tileHidden].map(([a,m])=>[a,[...m].reduce((s,[,g])=>s+g.size,0)])),recordHidden:(n,y)=>!!byRecord.get(n)?.has(Math.floor(y)),
  pinnedOver:overRows.filter(y=>order.filter(u=>u.cls==='pinned').reduce((s,u)=>s+u.rows[y],0)>LIMIT)};
}
let last=null;
/** The rotation used by the most recent sprite paint (null when inactive). */
export function getLastTsubasaSpriteRotation(){return last;}
export function noteTsubasaSpriteRotation(v){last=v;return v;}
