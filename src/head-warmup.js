import {setTsubasaHeadWarmup,cacheTsubasaHeadArt} from '../engine/src/tsubasa-layered-sprites.js';
export function installBackgroundHeadWarmup(url){
 // Unsupported workers fall back to on-demand composition, never timer work during play.
 let worker;try{worker=new Worker(url,{type:'module'});}catch{return;}
 worker.onmessage=({data})=>cacheTsubasaHeadArt(data.id,data.frame,data.art);
 worker.onerror=()=>{worker.terminate();setTsubasaHeadWarmup(null);};
 setTsubasaHeadWarmup((id,frames)=>worker.postMessage({id,frames}));
}
