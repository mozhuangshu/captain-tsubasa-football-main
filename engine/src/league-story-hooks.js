/** League story hooks (2026-10-19). Inactive by default (null): the original league selector and
 * settlement run unchanged, so the 2940 baseline and every league test keep original behaviour.
 * Installed only by tsubasa-league-story.js on the playable page.
 *  allows(r, team)      false = this opponent is locked (original "exhausted" buzz, no selection)
 *  cursor(r)            menu index the selector cursor starts on, or undefined for the original rule
 *  afterSettle(r, res)  called once right after the original settlement with its result */
let hooks=null;
export function setLeagueStoryHooks(next){hooks=next||null;}
export const leagueStoryAllows=(r,team)=>hooks?.allows?hooks.allows(r,team)!==false:true;
export function leagueStoryCursor(r,fallback){const i=hooks?.cursor?.(r);return Number.isInteger(i)?i:fallback;}
export function leagueStoryAfterSettle(r,result){hooks?.afterSettle?.(r,result);}
