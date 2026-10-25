/** Head/body seam clean-up for the head bank (2026-10-18). The shared body is not redrawn; only the few
 * pixels where a swapped head meets it are touched:
 *  - spurs: body pixels near the head that are at most 2 px thick (a fist-top outline, a collar tip, an
 *    old hair corner) were hidden by the old, differently shaped head and now stick out as hooks. A pixel
 *    with no solid (eroded) body pixel within 1 px is a spur and is removed. Real arms are thicker.
 *  - chin line: where the new head's face touches body colour directly the face melts into the body;
 *    those head pixels become outline, giving the jaw and neck a line like the original sprites.
 * Works in place on char-grid layers; returns counts. */
export function cleanHeadSeams({px,mat,owner,box,ink,orig,origMat,mask,skin,skinSet}){const H=px.length,W=px[0].length;let spurs=0,chin=0,gaps=0;
 const on=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&px[y][x]!=='0',body=(x,y)=>on(x,y)&&owner[y][x]==='0',head=(x,y)=>on(x,y)&&owner[y][x]==='1';
 const inBox=(x,y)=>x>=box.x0&&x<=box.x1&&y>=box.y0&&y<=box.y1;
 /* solid body: a body pixel whose 4 neighbours are all opaque (body or head) */
 const solid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>body(x,y)&&on(x-1,y)&&on(x+1,y)&&on(x,y-1)&&on(x,y+1)));
 const nearSolid=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(solid[y+dy]?.[x+dx])return true;return false;};
 const touchesHead=(x,y)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(head(x+dx,y+dy))return true;return false;};
 /* thin ink (outline / black hair) anywhere in the head box is old-head hair too: black hair shares the
  * outline colour, so the cross-character vote kept a lock of frame 15's old hair that ran down-left behind
  * the guard hand; the new upright head does not cover it */
 const kill=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(body(x,y)&&inBox(x,y)&&!nearSolid(x,y)&&(touchesHead(x,y)||px[y][x]===ink))kill.push([x,y]);
 for(const [x,y] of kill){px[y][x]='0';mat[y][x]='0';spurs++;}
 /* neck gaps: in the chin zone (the head's lowest 6 rows and the 3 rows under it), an emptied old-head
  * pixel that sits between the new head and the body (both within 3 px on the same row) gets the body's
  * original pixel back, so a shoulder the old head used to meet does not float beside the narrower chin */
 if(orig&&mask){let hb=-1;for(let y=H-1;y>=0&&hb<0;y--)for(let x=0;x<W;x++)if(head(x,y)){hb=y;break;}
  for(let pass=0;pass<3&&hb>=0;pass++){const fill=[];for(let y=Math.max(0,hb-6);y<=Math.min(H-1,hb+3);y++)for(let x=0;x<W;x++){if(on(x,y)||!mask[y]?.[x]||orig[y][x]==='0')continue;
    const near=k=>{for(let d=1;d<=3;d++)for(const s of [-1,1]){if(k(x+s*d,y))return s;}return 0;};const hs=near(head),bs=near(body);if(hs&&bs&&hs!==bs)fill.push([x,y]);}
   if(!fill.length)break;for(const [x,y] of fill){px[y][x]=orig[y][x];mat[y][x]=origMat[y][x];gaps++;}}}
 /* face gaps: from mid-face down to just under the chin, an empty pixel inside the head box that touches
  * the new face (skin, not hair) while a body pixel sits within 3 px on the same row is filled with the
  * character's skin. The old faces were drawn to meet a raised hand or a collar there (frame 15's guard
  * hand beside the cheek, frame 0's collar under the chin); the new narrower faces left a gap that made
  * those body parts read as loose hooks. The body itself is not changed. */
 if(skin){let ht=-1,hb=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(head(x,y)){if(ht<0)ht=y;hb=y;}
  const isSkin=v=>skinSet?skinSet.has(v):v===skin;
  for(let pass=0;pass<4&&hb>=0;pass++){const fill=[];for(let y=Math.max(0,Math.round(ht+(hb-ht)*0.4));y<=Math.min(H-1,hb+1);y++)for(let x=0;x<W;x++){if(on(x,y)||!inBox(x,y))continue;
    const nb=[[1,0],[-1,0],[0,1],[0,-1]];if(!nb.some(([dx,dy])=>head(x+dx,y+dy)&&isSkin(px[y+dy][x+dx])))continue;
    let bodyNear=false;for(let d=1;d<=3&&!bodyNear;d++)for(const sg of [-1,1])if(body(x+sg*d,y))bodyNear=true;if(bodyNear)fill.push([x,y]);}
   if(!fill.length)break;for(const [x,y] of fill){px[y][x]=skin;mat[y][x]='0';owner[y][x]='1';gaps++;}}}
 /* chin / jaw line */
 const line=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!head(x,y)||px[y][x]===ink)continue;if([[0,1],[1,0],[-1,0],[0,-1]].some(([dx,dy])=>body(x+dx,y+dy)&&px[y+dy][x+dx]!==ink))line.push([x,y]);}
 for(const [x,y] of line){px[y][x]=ink;chin++;}
 return {spurs,chin,gaps};}
/** count seam defects without changing anything (for audits): spurs left and face-on-body contacts */
export function measureHeadSeams(art,box,ink='1'){const px=art.pixels.map(r=>[...r]),mat=art.materials.map(r=>[...r]),owner=art.paletteOwners.map(r=>[...r]);return cleanHeadSeams({px,mat,owner,box,ink});}
