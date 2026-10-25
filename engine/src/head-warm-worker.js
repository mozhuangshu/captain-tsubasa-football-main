import './tsubasa-pose-repairs.js';
// The expensive head fitting stays off the animation/input thread.
import {installTsubasaHeads} from './tsubasa-heads.js';
import {getTsubasaLayeredArt} from './tsubasa-layered-sprites.js';
import {HD_CHARACTERS} from '../art/hd-runtime.js';
installTsubasaHeads({warm:false});
const skins=new Map(HD_CHARACTERS.map(c=>[c.skin.id,c.skin]));
self.onmessage=({data:{id,frames}})=>{const skin=skins.get(id);if(!skin)return;for(const frame of frames)postMessage({id,frame,art:getTsubasaLayeredArt(skin,frame)});};
