/** Display-independent pacing, not a CPU/PPU clock or instruction scheduler.
 * NTSC vertical rate reference: https://www.nesdev.org/wiki/Cycle_reference_chart
 */
export const ORIGINAL_NTSC_FRAME_HZ=60.0988;
export function createNativeFrameWait({now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),hz=ORIGINAL_NTSC_FRAME_HZ}={}){
 const period=1000/hz;let deadline=null;
 const wait=async()=>{
  const time=now();if(deadline===null||time-deadline>period*2)deadline=time;deadline+=period;
  // rAF wakes presentation; a high-refresh monitor does not create game ticks.
  while(true){const timestamp=await new Promise(requestFrame);if(timestamp+0.001>=deadline)return timestamp;}
 };
 wait.reset=()=>{deadline=null;};return wait;
}
