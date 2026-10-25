/** HUD cells use the same compiled heads as the pitch/menu, without per-frame fitting. */
import {CANONICAL_HEADS} from './canonical-heads.js';
export const HD_PORTRAITS=Object.fromEntries(Object.values(CANONICAL_HEADS).filter(h=>h.id!=='sanae').map(h=>[h.id,{id:h.id,name:h.name,identityStatus:h.identityStatus,width:32,height:28,front:h.front,pixels:h.front,palette:h.headPalette??h.palette}]));
