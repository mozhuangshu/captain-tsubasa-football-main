import {installAudioGesture} from './audio.js';
import {prefersHandheld} from './device.js';
if(prefersHandheld()){
 installAudioGesture();
 const banner=document.querySelector('#error-banner'),script=document.createElement('script');
 script.onerror=()=>{
  document.querySelector('[data-button="Start"]').disabled=true;
  banner.textContent='游戏加载失败，请检查网络后重试。';banner.hidden=false;
  const retry=document.createElement('button');retry.id='mobile-retry';retry.textContent='重新加载';retry.onclick=()=>location.reload();banner.append(retry);
 };
 script.type='module';script.src=new URL('./mobile-main.js',import.meta.url).href;
 document.body.append(script);
}else{
 // A desktop refreshing an old mobile URL must return to keyboard guidance.
 location.replace(new URL('../index.html',import.meta.url));
}
