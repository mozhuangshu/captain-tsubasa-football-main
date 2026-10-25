// Interpolate drawing only. The original simulation, input and collisions keep their cadence.
export function createMotionPresentation(){
 let previous=null,current=null,ram=null,scene='';
 const camera=r=>[r[0xec]|r[0xed]<<8,r[0xee]|r[0xef]<<8];
 const key=a=>`${a.entity}:${a.kind}:${a.teamId}:${a.playerNumber}`;
 return {
  capture(r,actors){
   const nextScene=`${r[0x58]}:${r[0x59]}:${r[0x52c]}:${r[0x52d]}`;
   previous=r===ram&&scene===nextScene?current:null;ram=r;scene=nextScene;
   current=new Map(actors.map(a=>[key(a),{x:a.x,y:a.y,groundY:a.groundY}]));current.camera=camera(r);
  },
  background(r){
   if(!previous||r[0x58]!==0||(r[0x59]&127)!==2||(r[0x5c]&128)||r[0x5e6]<2)return r;
   const alpha=Math.min(1,Math.max(0,r[0x51]/r[0x5e6])),out=r.slice();
   for(let i=0;i<2;i++){
    if(Math.abs(current.camera[i]-previous.camera[i])>24)return r;
    const v=Math.round(previous.camera[i]+(current.camera[i]-previous.camera[i])*alpha),at=0xec+i*2;
    out[at]=v&255;out[at+1]=v>>>8;
   }
   return out;
  },
  draw(r,actors){
   if(!previous||r[0x58]!==0||(r[0x5c]&128)||r[0x5e6]<2)return actors;
   const alpha=Math.min(1,Math.max(0,r[0x51]/r[0x5e6]));
   if(alpha===1)return actors;
   const result=actors.map(a=>{
    const p=previous.get(key(a));if(!p||Math.abs(a.x-p.x)>24||Math.abs(a.y-p.y)>24)return a;
    const x=p.x+(a.x-p.x)*alpha,y=p.y+(a.y-p.y)*alpha;
    return {...a,x,y,groundY:p.groundY+(a.groundY-p.groundY)*alpha,renderOffsetX:x-a.x,renderOffsetY:y-a.y};
   });
   result.ballRenderIntent=actors.ballRenderIntent;return result;
  }
 };
}
