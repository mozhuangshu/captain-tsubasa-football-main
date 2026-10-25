import {SELECTABLE_TEAMS} from './roster-menus-data.js';
import {teamNameZh,zhFont} from './localization-zh.js';
import {crispFillText} from './crisp-text.js';
export const isTeamSelection=r=>r[0x58]===2&&(r[0x59]&127)===5;
export function drawTeamSelection(ctx,r){
 if(!isTeamSelection(r))return false;
 ctx.save();ctx.fillStyle='#112633';ctx.fillRect(0,0,256,240);ctx.font=zhFont();ctx.textBaseline='top';
 for(let side=0;side<2;side++){
  const x=side*128,choice=r[0x5ca+side],selected=(choice&127)%13;
  ctx.fillStyle=side?'#ffce78':'#8ce5ff';crispFillText(ctx,`${side+1}P ${choice&128?'已确认':'选择球队'}`,x+10,4);
  SELECTABLE_TEAMS.forEach((id,i)=>{const y=22+i*15;ctx.fillStyle=i===selected?'#2f6574':'#112633';ctx.fillRect(x+5,y-1,118,15);ctx.fillStyle=i===selected?'#ffffff':'#b8cbd2';crispFillText(ctx,teamNameZh(id),x+12,y);});
 }
 ctx.fillStyle='#efc768';ctx.fillRect(5,220,246,18);ctx.fillStyle='#112633';crispFillText(ctx,'开始 / 点此确认双方球队',48,223);ctx.restore();return true;
}
export function installTeamSelectionTap(app,canvas){
 canvas.addEventListener('pointerup',event=>{
  const r=app.r;if(!isTeamSelection(r)||r[0x5c9]!==1)return;
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*256/rect.width,y=(event.clientY-rect.top)*240/rect.height;
  if(y>=220&&y<240){r[0x5ca]|=128;r[0x5cb]|=128;}
  else if(y>=21&&y<217){const side=x<128?0:1,index=Math.min(12,Math.floor((y-21)/15));r[0x5ca+side]=index+side*13;}
 });
}
