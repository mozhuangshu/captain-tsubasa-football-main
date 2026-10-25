/** D-50 story-only match rules. Inactive by default (null): every original path,
 * the 2940 baseline and the cannon replay are untouched. Installed only by the
 * story bridge for the duration of a story match.
 *  noExtraTime: after the 2nd half a tie ends the match (route 9) instead of route 11.
 *  onHalfTime:  called once when the original half-time route (C91A case 8) fires. */
let rules=null;
export function setTsubasaStoryMatchRules(next){rules=next?Object.freeze({noExtraTime:!!next.noExtraTime,onHalfTime:typeof next.onHalfTime==='function'?next.onHalfTime:null}):null;}
export function getTsubasaStoryMatchRules(){return rules;}
export function storyNoExtraTime(){return !!rules?.noExtraTime;}
export function notifyStoryHalfTime(r){rules?.onHalfTime?.(r);}
