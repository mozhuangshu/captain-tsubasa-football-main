/** D-43 step 4: Schneider and Misugi use project's native-size 3-colour frames for the WHOLE match (every situation, not only their
 * specials), never the HD skin (D-33: one person, one art set). Presentation only; gameplay RAM untouched. Only with Tsubasa special
 * moves enabled (the ordinary/legacy path — 2940 baseline — keeps the HD skin). A frame id project has not drawn falls back to the HD skin
 * and is reported by the census as off-colour (never silently substituted). M-11 fire-shot poses (same frames) take precedence. */
import {D43_BODY_ART,D43_PALETTES} from './tsubasa-named-body-art.js';
import {isTsubasaSpecialMovesEnabled} from './tsubasa-gameplay-context.js';
export const D43_CHARACTERS=Object.freeze(Object.keys(D43_BODY_ART));
export function getTsubasaNamedBodyPose(r,entity,frameByte,characterId){
 if(entity>=10||!D43_BODY_ART[characterId]||!isTsubasaSpecialMovesEnabled(r))return null;
 const art=D43_BODY_ART[characterId][String(frameByte&127)];if(!art)return null;
 return {art,set:'d43',characterId,mirrored:!!(frameByte&128),nativeFrame:frameByte&127,palette:D43_PALETTES[characterId]};}
