/** Explicit, opt-in measured-transfer approximation. These coefficients are
 * not cartridge data or proof of a particular console's analog output.
 * https://www.nesdev.org/wiki/APU_Mixer; docs/DEVELOPMENT.md
 */
export const TND_WEIGHT_MAX=15/8227+15/12241+127/22638;
export const FILTER_PROFILES=Object.freeze({none:[], 'famicom-37hz':[{kind:'highpass',hz:37}], 'nes-reference':[{kind:'highpass',hz:90},{kind:'highpass',hz:440},{kind:'lowpass',hz:14000}]});
export const pulseTransfer=sum=>sum<=0?0:95.88*sum/(8128+100*sum);
export const tndTransfer=weighted=>weighted<=0?0:159.79*weighted/(1+100*weighted);
export function mixDacLevels(pulse1,pulse2,triangle,noise,dmc){return pulseTransfer(pulse1+pulse2)+tndTransfer(triangle/8227+noise/12241+dmc/22638);}
export function makeTransferCurve(group,size=65537){if(!['pulse','tnd'].includes(group))throw Error('Unknown transfer group');return Float32Array.from({length:size},(_,i)=>{const x=Math.max(0,2*i/(size-1)-1);return group==='pulse'?pulseTransfer(x*30):tndTransfer(x*TND_WEIGHT_MAX);});}
/** Prewarped bilinear transform of a first-order RC response. This is a chosen
 * transfer profile, never an assertion about the user's console/RF chain. */
export function firstOrderFilter(kind,hz,sampleRate){if(!['lowpass','highpass'].includes(kind)||!(hz>0&&hz<sampleRate/2))throw RangeError('Invalid first-order filter');const k=Math.tan(Math.PI*hz/sampleRate),a=(k-1)/(k+1),b=(kind==='lowpass'?k:1)/(1+k);return {feedforward:[b,kind==='lowpass'?b:-b],feedback:[1,a]};}
export function createCharacterizedMixer(context,destination,{filterProfile='none'}={}){
 if(!Object.hasOwn(FILTER_PROFILES,filterProfile))throw Error('Unknown analog transfer profile');
 if(!context.createWaveShaper||!context.createConstantSource)throw Error('Characterized mixer requires WaveShaperNode and ConstantSourceNode');
 const output=context.createGain();let tail=output;const filters=[];for(const spec of FILTER_PROFILES[filterProfile]){const coefficients=firstOrderFilter(spec.kind,spec.hz,context.sampleRate),filter=context.createIIRFilter(coefficients.feedforward,coefficients.feedback);tail.connect(filter);tail=filter;filters.push(filter);}tail.connect(destination);
 const pulse=context.createWaveShaper(),tnd=context.createWaveShaper();pulse.curve=makeTransferCurve('pulse');tnd.curve=makeTransferCurve('tnd');pulse.connect(output);tnd.connect(output);
 const inputs=Array.from({length:5},(_,i)=>{const input=context.createGain();input.gain.value=i<2?1/30:i===2?1/8227/TND_WEIGHT_MAX:i===3?1/12241/TND_WEIGHT_MAX:1/22638/TND_WEIGHT_MAX;input.connect(i<2?pulse:tnd);return input;});
 return {inputs,output,filters,profile:filterProfile,connectWave(source,index){const half=context.createGain(),offset=context.createConstantSource(),level=context.createGain(),clamp=context.createWaveShaper();half.gain.value=.5;offset.offset.value=.5;level.gain.value=0;clamp.curve=new Float32Array([0,0,1]);source.connect(half);half.connect(clamp);offset.connect(clamp);clamp.connect(level);level.connect(inputs[index]);offset.start();return{gain:level,offset};}};
}
