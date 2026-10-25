/** Head bank checks and repairs (2026-10-17). The head bank (art/nonmatch-heads.js) gives every character
 * one front (3/4), profile and back head. Review found the profile and back heads are often not those
 * directions at all: backs are the front face recoloured in hair colours (eyes and mouth still drawn),
 * profiles leave the back of the skull as bare skin, and a cap brim sticks out of a back view. A head bank
 * makes one bad head show in every frame, so heads are checked by what each direction must look like.
 *
 * Colour roles come from the character's own front head: skin = commonest colours in the middle of the
 * face, hair = commonest colours in the top rows (so blond hair is never mistaken for skin). */
import {capCutEdges} from './tsubasa-edge-caps.js';
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=h=>{const [r,g,b]=rgb(h);return .3*r+.59*g+.11*b;};
const DIRS=['front','profile','back'];
/* found by eye at 5x (2026-10-17), missed by the bald-back threshold: kaneda's profile is bare skin behind
 * the ear, honma's profile has no eye or face at all. Both use their 3/4 head until redrawn. */
export const PROFILE_FALLBACK_REVIEWED=new Set(['kaneda','honma']);
const grid=rows=>rows.map(r=>[...r]);
function count(g,y0,y1,x0,x1){const m=new Map();for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const v=g[y]?.[x];if(v&&v!=='0')m.set(v,(m.get(v)??0)+1);}return [...m].sort((a,b)=>b[1]-a[1]);}
/** {skin:Set, hair:Set, hairBase, outline} palette-index roles for one head */
export function headRoles(head){const F=grid(head.front),H=F.length,W=F[0].length,pal=head.palette;
 const outline=count(F,0,H,0,W).map(([v])=>v).sort((a,b)=>lum(pal[parseInt(a,16)])-lum(pal[parseInt(b,16)]))[0];
 const face=count(F,Math.round(H*.5),Math.round(H*.8),Math.round(W*.3),Math.round(W*.7)).filter(([v])=>v!==outline);
 const top=count(F,0,Math.round(H*.22),0,W).filter(([v])=>v!==outline);
 const tot=a=>a.reduce((s,[,n])=>s+n,0),share=(a,v)=>(a.find(([k])=>k===v)?.[1]??0)/Math.max(1,tot(a));
 const skin=new Set(face.filter(([v])=>share(face,v)>0.08&&share(top,v)<0.15).map(([v])=>v));
 const hair=new Set(top.filter(([v])=>share(top,v)>0.08&&!skin.has(v)).map(([v])=>v));
 /* black hair is drawn in the outline colour itself: then the outline is the base hair colour */
 const topAll=count(F,0,Math.round(H*.22),0,W),hairBase=topAll[0]?.[0]===outline?outline:top.find(([v])=>hair.has(v))?.[0]??outline;
 const skinBase=face.find(([v])=>skin.has(v))?.[0];
 return {skin,hair,hairBase,outline,skinBase};}
const interior=(g,y,x)=>g[y][x]!=='0'&&[[0,1],[0,-1],[1,0],[-1,0]].every(([a,b])=>(g[y+a]?.[x+b]??'0')!=='0');
/** interior detail pixels (a colour change inside the silhouette): eyes, brows, mouth, strands */
function features(g){const s=new Set(),H=g.length,W=g[0].length;for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){if(!interior(g,y,x))continue;const v=g[y][x],nb=[g[y][x-1],g[y][x+1],g[y-1][x],g[y+1][x]];if(nb.filter(n=>n!==v).length>=2)s.add(y*W+x);}return s;}
/** a cap brim / ledge: rows (≤3 tall) whose right or left edge juts out ≥3 px past the rows around them */
function ledges(g){const H=g.length,ext=g.map(r=>{const xs=r.map((v,x)=>v!=='0'?x:-1).filter(x=>x>=0);return xs.length?[xs[0],xs[xs.length-1]]:null;}),out=[];
 for(let y=0;y<H;y++){if(!ext[y])continue;for(const side of [0,1]){const around=[y-4,y-3,y+3,y+4].map(k=>ext[k]?.[side]).filter(v=>v!==undefined);if(around.length<2)continue;const ref=side?Math.max(...around):Math.min(...around),d=side?ext[y][1]-ref:ref-ext[y][0];if(d>=3)out.push({y,side,d});}}return out;}
/** what is wrong with one head, per direction; [] = fine */
export function checkTsubasaHead(head){const roles=headRoles(head),issues=[];const F=grid(head.front),P=grid(head.profile),B=grid(head.back),H=F.length,W=F[0].length;
 /* back: no bare face above the neck, no face drawn into the hair, no brim */
 let op=0,sk=0;for(let y=0;y<H-6;y++)for(let x=0;x<W;x++){if(B[y][x]==='0')continue;op++;if(roles.skin.has(B[y][x]))sk++;}
 if(sk/op>0.12)issues.push({dir:'back',kind:'bare-face',value:+(sk/op).toFixed(2)});
 const ff=features(F),fb=features(B);let hit=0;for(const p of fb)if(ff.has(p))hit++;const faceIn=ff.size?hit/ff.size:0;
 if(faceIn>0.35)issues.push({dir:'back',kind:'face-in-hair',value:+faceIn.toFixed(2)});
 const lb=ledges(B);if(lb.length)issues.push({dir:'back',kind:'brim',value:lb.length});
 /* profile (faces right): the back third of the skull is hair, not skin */
 /* (a profile that already is the front head is the documented fallback, not a profile to judge) */
 if(head.profile===head.front)issues.push({dir:'profile',kind:'front-fallback',value:1});else{let bo=0,bs=0;for(let y=2;y<H-6;y++){const xs=P[y].map((v,x)=>v!=='0'?x:-1).filter(x=>x>=0);if(!xs.length)continue;const l=xs[0],cut=l+Math.round((xs[xs.length-1]-l)*0.35);for(let x=l;x<=cut;x++){if(P[y][x]==='0')continue;bo++;if(roles.skin.has(P[y][x]))bs++;}}
 if(bs/Math.max(1,bo)>0.3)issues.push({dir:'profile',kind:'bald-back',value:+(bs/bo).toFixed(2)});}
 return issues;}

/** deterministic repairs, returning new heads (input untouched):
 *  back  - every pixel inside the silhouette (above the neck) becomes hair: the base hair colour, with the
 *          front head's own hair strands kept in the top rows; brims are cut back to the dome.
 *  profile - a bald profile is replaced by the front (3/4) head. */
export function repairTsubasaHead(head){const roles=headRoles(head),issues=checkTsubasaHead(head),out={...head};const H=head.front.length,W=head.front[0].length;
 const has=(dir,kind)=>issues.some(i=>i.dir===dir&&(!kind||i.kind===kind));
 if(has('back')){const B=grid(head.back),F=grid(head.front);
  for(const {y,side} of ledges(B)){const xs=B[y].map((v,x)=>v!=='0'?x:-1).filter(x=>x>=0),ref=[y-4,y-3,y+3,y+4].map(k=>{const r=B[k]?.map((v,x)=>v!=='0'?x:-1).filter(x=>x>=0);return r?.length?(side?r[r.length-1]:r[0]):undefined;}).filter(v=>v!==undefined);
   const lim=side?Math.max(...ref):Math.min(...ref);for(const x of xs)if(side?x>lim:x<lim)B[y][x]='0';}
  const neck=H-6;for(let y=0;y<neck;y++)for(let x=0;x<W;x++){if(B[y][x]==='0'||!interior(B,y,x))continue;const f=F[y][x];B[y][x]=y<Math.round(H*.22)&&f!=='0'&&roles.hair.has(f)?f:roles.hairBase;}
  /* the silhouette edge keeps (or gains) the outline */
  for(let y=0;y<neck;y++)for(let x=0;x<W;x++)if(B[y][x]!=='0'&&!interior(B,y,x))B[y][x]=roles.outline;
  out.back=B.map(r=>r.join(''));}
 /* a bald profile is almost always the front face moved over (painting hair onto it covers the face),
  * so it falls back to the 3/4 front head, which the native game also uses for many side poses */
 if(!head.redrawn?.includes('profile')&&(has('profile','bald-back')||PROFILE_FALLBACK_REVIEWED.has(head.id)))out.profile=head.front;
 out.repairs=issues.filter(i=>i.kind!=='front-fallback');return out;}
/** heads were drawn inside a 32x28 box and many are sliced flat by it (99 of 153): pad 3 px on the left,
 * right and top and round the cut runs back out. Sets head.pad so placement can shift by it. */
export function capTsubasaHead(head){const outline=headRoles(head).outline,out={...head,pad:{x:3,y:3}},cuts={};
 for(const d of DIRS){if(!head[d])continue;const r=capCutEdges({pixels:head[d]},{pad:{l:3,r:3,t:3,b:0},caps:['l','r','t'],outline});out[d]=r.layers.pixels;if(r.cut.length)cuts[d]=r.cut.length;}
 if(head.profile===head.front)out.profile=out.front;/* keep the documented 3/4 fallback recognisable */
 out.edgeCaps=cuts;return out;}
export function repairTsubasaHeads(heads){return Object.fromEntries(Object.entries(heads).map(([id,h])=>[id,DIRS.every(d=>h[d])?capTsubasaHead(repairTsubasaHead(h)):h]));}
