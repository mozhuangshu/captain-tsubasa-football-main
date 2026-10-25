import {installAudioGesture} from './audio.js';
import {prefersHandheld} from './device.js';
export async function start(){
 if(prefersHandheld()){
  location.replace(new URL('./mobile/index.html',document.baseURI));
 }else{
  installAudioGesture();
  const status=document.querySelector('#session-status');
  for(const button of document.querySelectorAll('[data-mode]')){button.disabled=false;button.onclick=()=>{window.footballPendingMode=button.dataset.mode;status.textContent=`已选择${button.dataset.mode==='versus'?'双人对战':'单人联赛'}，素材加载后自动开始…`;};}
  await import('./main.js');
  if(window.footballPendingMode)document.querySelector(`[data-mode="${window.footballPendingMode}"]`).click();
 }
}
