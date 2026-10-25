/** Native menu rendering services. Real recovered object routines only;
 * absent action handlers throw from the original call site, never no-op.
 */
import {updateMenuActors,updateSpriteVisibility,submitMenuCursor,assembleMenuOam,menuAppearanceFromState} from './menu-objects.js';
import {submitObjectForDisplay} from './object-display-list.js';
import {updateBallAction} from './ball-runtime.js';
import {drawOriginalOam} from './sprite-appearance.js';
export function createMenuGraphics(actionHandlers={}){
 let oam=null;
 const api={
  actionHandlers:{updateBallActionBody:updateBallAction,...actionHandlers},
  beginFrame(r){oam=assembleMenuOam(r);},
  updateMenuActors(r){const result=updateMenuActors(r,api.actionHandlers);return result;},
  updateSpriteVisibility(r){return updateSpriteVisibility(r);},
  submitMenuCursor(r,x=2){const result=submitObjectForDisplay(r,x);return result;},
  configureChrBanks(r){return [...r.slice(0x5b8,0x5bc)];},
  flushMenuSprites(r){return updateSpriteVisibility(r);},
  draw(ctx,r,{layout}={}){if(!(r[0x4d]&16))return;const records=r.subarray(0x200,0x300);drawOriginalOam(ctx,records,menuAppearanceFromState(r),{brightness:r[0x5b4],leftClip:(r[0x4d]&4)?0:8,backgroundOpaque:layout?.backgroundOpaque,maskWidth:layout?.backgroundMaskWidth??256,maskHeight:layout?.backgroundMaskHeight??240});},
 };
 return api;
}
