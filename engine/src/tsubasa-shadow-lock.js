/** Must D-11: while a Tsubasa per-move special transforms the whole ball into
 * native 热血 creature/crescent art, the ground shadow stays on every frame.
 * Only RAM objects registered by an enabled Tsubasa session are affected, so the
 * plain engine and the 2940-frame ordinary-ball baseline never see this lock. */
const locked=new WeakSet();
export function setTsubasaSpecialShadowLock(r,on){if(on)locked.add(r);else locked.delete(r);}
export function isTsubasaSpecialShadowLocked(r){return locked.has(r);}
