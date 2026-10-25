// These are the original primary menu defaults. Team selection, kickoff and
// controller-to-player assignment continue through the original game flow.
export function prepareSession(app,mode){
 if(!['solo','versus'].includes(mode))throw new RangeError('Unknown mode');
 app.boot=false;app.reset();app.r[0x57]=mode==='versus'?0x41:0x81;app.r[0x5d]=mode==='versus'?2:1;
}
