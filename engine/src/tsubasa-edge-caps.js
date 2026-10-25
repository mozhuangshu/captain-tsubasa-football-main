/** Close art that was cut flat by its box (2026-10-17). The HD frames were drawn inside the native
 * sprite's bounds and every head inside a fixed 16x14 box, so hair, fists and feet that grew past the
 * box were sliced off in straight lines ("hands and heads cut off"). This pads the grid and rounds every
 * cut run back out: a short dome of the run's own colour, closed by the outline.
 *
 * A run on an edge counts as cut when it shows inside colour (not outline) on 2+ pixels, or when it is a
 * straight run of 5+ pixels; a 2-4 px outline touch is a normal contour meeting the bounding box. */
const SIDES=['l','r','t','b'];
/** layers: {pixels, materials?, shade?} as arrays of strings (or char arrays), all W x H.
 *  pad: {l,r,t,b} pixels to add; caps: sides to close (subset of l,r,t,b).
 *  returns {layers (strings), dx, dy, cut:[{side,from,to}]} where dx,dy is where the old (0,0) went */
export function capCutEdges(layers,{pad={l:3,r:3,t:3,b:0},caps=['l','r','t'],outline='1'}={}){
 const src=Object.fromEntries(Object.entries(layers).filter(([,v])=>v).map(([k,v])=>[k,v.map(r=>[...r])]));
 const H=src.pixels.length,W=src.pixels[0].length,W2=W+pad.l+pad.r,H2=H+pad.t+pad.b;
 const out=Object.fromEntries(Object.keys(src).map(k=>[k,Array.from({length:H2},()=>Array(W2).fill('0'))]));
 for(const k of Object.keys(src))for(let y=0;y<H;y++)for(let x=0;x<W;x++)out[k][y+pad.t][x+pad.l]=src[k][y][x];
 const P=out.pixels,fresh=new Set(),cut=[];
 /* walk one side: list (along, across) positions of the original edge and the outward direction */
 const edge=side=>side==='l'||side==='r'?{n:H,at:i=>({x:pad.l+(side==='l'?0:W-1),y:pad.t+i}),out:side==='l'?[-1,0]:[1,0],room:pad[side]}
  :{n:W,at:i=>({x:pad.l+i,y:pad.t+(side==='t'?0:H-1)}),out:side==='t'?[0,-1]:[0,1],room:pad[side]};
 for(const side of caps){if(!SIDES.includes(side))continue;const e=edge(side);if(!e.room)continue;let i=0;
  while(i<e.n){const p=e.at(i);if(P[p.y][p.x]==='0'){i++;continue;}let j=i;while(j+1<e.n&&P[e.at(j+1).y][e.at(j+1).x]!=='0')j++;
   const L=j-i+1;let inside=0;for(let k=i;k<=j;k++){const q=e.at(k);if(P[q.y][q.x]!==outline)inside++;}
   /* a flat top only bulges 1 px and only when long: short top runs became topknots */
   const top=side==='t'||side==='b';if(top?L>=6:(inside>=2||L>=5)){cut.push({side,from:i,to:j});const depth=top?1:Math.min(e.room-1,Math.max(1,Math.round(L/4))),mid=(i+j)/2,half=L/2+0.5;
    for(let k=i;k<=j;k++){const q=e.at(k),t=(k-mid)/half,ext=Math.round(depth*Math.sqrt(Math.max(0,1-t*t))),v=P[q.y][q.x];
     for(let s=1;s<=ext;s++){const x=q.x+e.out[0]*s,y=q.y+e.out[1]*s;for(const key of Object.keys(out))out[key][y][x]=key==='pixels'?v:out[key][q.y][q.x];fresh.add(y*W2+x);}
     if(!ext&&v!==outline){P[q.y][q.x]=outline;if(out.materials)out.materials[q.y][q.x]='0';}}}
   i=j+1;}}
 /* the new dome gets a 1 px outline wherever it meets empty space */
 const on=(x,y)=>x>=0&&y>=0&&x<W2&&y<H2&&P[y][x]!=='0';
 for(const p of fresh){const x=p%W2,y=(p/W2)|0;if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>!on(x+a,y+b))){P[y][x]=outline;if(out.materials)out.materials[y][x]='0';}}
 return {layers:Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.map(r=>r.join(''))])),dx:pad.l,dy:pad.t,cut};}
