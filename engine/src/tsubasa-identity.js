/** Stable visual fallback for explicitly unfinished/generic roster identities.
 * Shared by gameplay, HUD and the catalogue so no surface changes a player's
 * appearance simply because their engine slot or field position changed. */
import {TSUBASA_ROSTERS} from '../data/tsubasa-team-data.js';
const people=new Map(TSUBASA_ROSTERS.rosters.flatMap(r=>r.players.map(p=>[p.characterId,p])));
export const getCharacterIdentity=id=>people.get(id)??null;
export function fallbackArtId(id){const p=people.get(id);if(p?.canonicalRole==='GK')return 'generic-keeper';const n=[...id].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);return ['generic-short','generic-crop','generic-wave'][n%3];}

export const isUnverifiedArtwork=art=>art?.identityStatus==='unverified_reference_mapping'||String(art?.status??art?.skin?.frames?.[0]?.status??'').includes('unverified-reference-mapping');
