/** Pulse pitch-curve mathematics for this game's D4/instrument parameters.
 * No register bus, CPU stepping, APU instance or arbitrary program execution.
 * Timing origin is the audio sink origin, not a proved original boot/NMI phase.
 * Sources and limits: docs/DEVELOPMENT.md
 */
export const SWEEP_CLOCK=1789773;
export function sweepTarget(period,setting,channel){const change=period>>>(setting&7);return Math.max(0,period+((setting&8)?-change-(channel===0?1:0):change));}
export function sweepMuted(period,setting,channel){return period<8||sweepTarget(period,setting,channel)>2047;}
export function newSweepCurve(channel){return {channel,period:0,setting:0,divider:0,reload:false};}
export function changeSweepCurve(curve,change){if(change.kind==='sweep'){curve.setting=change.value&255;curve.reload=true;}else if(change.kind==='period'){curve.period=change.full?(change.value&2047):((curve.period&1792)|(change.value&255));}else throw Error('Unknown semantic pulse pitch change');}
export function stepSweepCurve(curve){const zero=curve.divider===0;if(zero&&(curve.setting&128)&&(curve.setting&7)&&!sweepMuted(curve.period,curve.setting,curve.channel))curve.period=sweepTarget(curve.period,curve.setting,curve.channel);if(zero||curve.reload){curve.divider=(curve.setting>>>4)&7;curve.reload=false;}else curve.divider--;return curve;}
// The original selects four-step timing. Closed-form event times avoid a clock
// interpreter. Index n runs across the two half-frame landmarks each period.
export function sweepTime(index,clock=SWEEP_CLOCK){return (Math.floor(index/2)*29830+(index%2?29829:14913))/clock;}
export function sweepPoint(curve,at,clock=SWEEP_CLOCK){return {at,period:curve.period,frequency:clock/(16*(curve.period+1)),muted:sweepMuted(curve.period,curve.setting,curve.channel)};}
/** Schedule only points in [start,end), preserving an independent pitch curve
 * between explicit original driver changes, including identical-value writes. */
export class OriginalPulsePitchCurves {
 constructor({clock=SWEEP_CLOCK}={}){this.clock=clock;this.curves=[newSweepCurve(0),newSweepCurve(1)];this.index=0;}
 segment(start,end,changes=[]){const points=[[],[]];while(sweepTime(this.index,this.clock)<start){for(const c of this.curves)stepSweepCurve(c);this.index++;}for(const e of changes)changeSweepCurve(this.curves[e.channel],e);for(let i=0;i<2;i++)points[i].push(sweepPoint(this.curves[i],start,this.clock));while(sweepTime(this.index,this.clock)<end){const at=sweepTime(this.index++,this.clock);for(let i=0;i<2;i++){stepSweepCurve(this.curves[i]);points[i].push(sweepPoint(this.curves[i],at,this.clock));}}return points;}
}
