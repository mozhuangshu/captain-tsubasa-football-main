// Capture the first gesture before the large game bundle finishes downloading.
export function installAudioGesture(){
 window.footballSoundOn=true;
 const unlock=()=>{if(!window.footballSoundOn)return;try{const Factory=window.AudioContext||window.webkitAudioContext;if(!Factory)return;window.footballAudioContext??=new Factory();window.footballAudioContext.resume().catch(()=>{});}catch{}};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
}
export function audioContext(){return window.footballAudioContext??=new (window.AudioContext||window.webkitAudioContext)();}
export function connectAudio(sink){
 const unlock=()=>{if(window.footballSoundOn)sink.unlock().catch(()=>{});};
 if(window.footballAudioContext)unlock();document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
}
