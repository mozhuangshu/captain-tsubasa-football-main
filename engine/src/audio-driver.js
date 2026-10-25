/** Semantic translation of the game's score driver (bank 00:8006–897A).
 * Reads ONLY statically extracted score/instrument data, never CPU instructions.
 * Hardware output is expressed as voices; WebAudio is a separate synthesis sink.
 */
import {createCharacterizedMixer} from './platform/audio-mixer.js';
import {OriginalPulsePitchCurves} from './platform/audio-sweep.js';
import {AUDIO_DATA,AUDIO_DATA_BASE,DPCM_DATA} from './audio-data.js';
const u8=v=>v&255, signed=v=>v&128?v-256:v;
// 836E/838E declarative handler addresses, used only for original scratch values.
const SCORE_COMMAND_TARGETS=[0x83ae,0x83b3,0x83bb,0x83bf,0x83e3,0x83e7,0x83fa,0x8401,0x840c,0x8413,0x841c,0x8425,0x8442,0x8449,0x84fb,0x850e,0x8521,0x852f,0x854c,0x8559,0x84e4,0x84d6,0x842e,0x8438,0x84cf,0x84b5,0x85c0,0x85d0,0x85ec,0x85f6,0x8600,0x84a9];
export const AUDIO_COVERAGE=Object.freeze({scoreDriver:'translated, static-reference tested; no emulator differential oracle',synthesis:'WebAudio waveforms; direct pulse sweep pitch curves; measured nonlinear transfer and Famicom 37Hz profile; exact sweep phase and analog response unproved',dpcm:'385 original bytes, differential PCM decoded',completeOriginalAudio:false});
/* Optional replacement scores (src/tsubasa-music.js): extra score bytes at their own base address and the sound IDs that
 * start there instead of the original pointer table. Off by default: with no extension every read is the original data. */
let scoreExtension=null;
export function setScoreExtension(ext){scoreExtension=ext?{base:ext.base,data:ext.data,pointers:{...ext.pointers}}:null;}
const scorePointer=id=>scoreExtension?.pointers[id]??word(0x89fd+(id-1)*2);
export function audioByte(address){if(scoreExtension&&address>=scoreExtension.base&&address<scoreExtension.base+scoreExtension.data.length)return scoreExtension.data[address-scoreExtension.base];const i=address-AUDIO_DATA_BASE;if(i<0||i>=AUDIO_DATA.length)throw new RangeError(`Audio data address ${address.toString(16)}`);return AUDIO_DATA[i];}
const word=a=>audioByte(a)|(audioByte(a+1)<<8);
export const SOUND_CATALOG=Object.freeze(Array.from({length:80},(_,i)=>({id:i+1,address:word(0x89fd+i*2),music:audioByte(word(0x89fd+i*2))>=128})));
export const scaleAudioByte=(a,b)=>a?Math.floor(a*(b||256)/256):0; // 8963
const newVoice=index=>({index,active:0,dirty:0,position:0,returnPosition:0,wait:0,note:0,fraction:0,volume:0,priority:0,scale:0,loop1:0,loop2:0,repeat:0,duration:0,gate:0,gateTimer:0,gateScale:0,gateMax:0,transpose:0,extraVolume:0,envelope:0,envelopePhase:0,envelopeValue:0,envelopeCount:0,vibrato:0,vibratoStep:0,vibratoDelay:0,vibratoTimer:0,vibratoExtent:0,control:0,sweep:0,period:0});
export class OriginalAudioDriver {
 constructor({sink=null,onEvent=null,ram=new Uint8Array(2048)}={}){this.bindRAM(ram);this.sink=sink;this.onEvent=onEvent;this.frame=0;this.events=[];this.reset();}
 bindRAM(r){if(!(r instanceof Uint8Array)||r.length<2048)throw TypeError('Audio requires full original RAM state');this.ram=r;return this;}
 scratchWord(offset,value){this.ram[offset]=value&255;this.ram[offset+1]=value>>>8;}
 scaleScratch(a,b){this.ram[2]=a;this.ram[3]=b;if(a){this.ram[3]=u8(b-1);this.ram[2]=scaleAudioByte(a,b);}return this.ram[2];}
 envelopeByte(address){if(address>=0&&address<2048)return this.ram[address];return audioByte(address);}
 reset(){this.ram.fill(0,0x700,0x7e6);this.voices=Array.from({length:9},(_,i)=>newVoice(i));this.enabled=true;this.outputEnabled=true;this.paused=false;this.musicId=0;this.savedMusic=0;this.tempo=0;this.tempoAccumulator=0;this.delayedId=0;this.delay=0;this.drumTable=0;this.dpcm={start:0,length:0,rate:0};this.outputs=Array.from({length:4},()=>({control:0,sweep:0,period:0,source:null}));this.emit({type:'silence'});}
 get statusFlags(){return (this.enabled?128:0)|(this.paused?64:0)|(this.delayedId?32:0)|(this.voices.slice(0,4).some(v=>v.active)?2:0);}
 syncRAM(r=this.ram){r[0x7e5]=this.statusFlags;r[0x700]=this.musicId;r[0x701]=this.savedMusic;r[0x702]=this.delay;r[0x703]=this.delayedId;r[0x705]=this.tempo;r[0x706]=this.tempoAccumulator;
  const fields=[[0x70c,'dirty'],[0x715,'active'],[0x730,'wait'],[0x739,'note'],[0x742,'fraction'],[0x74b,'volume'],[0x754,'loop1'],[0x75d,'loop2'],[0x778,'repeat'],[0x781,'scale']];
  for(const v of this.voices){const i=v.index;for(const[a,k]of fields)r[a+i]=v[k];r[0x71e+i]=v.position&255;r[0x727+i]=v.position>>>8;r[0x766+i]=v.returnPosition&255;r[0x76f+i]=v.returnPosition>>>8;if(i>=4)r[0x703+i]=v.priority;
   if(i<4)for(const[a,k]of [[0x78a,'duration'],[0x78e,'extraVolume'],[0x792,'gate'],[0x796,'gateTimer'],[0x79a,'gateMax'],[0x79e,'gateScale'],[0x7a2,'transpose']])r[a+i]=v[k];
   if(i<3)for(const[a,k]of [[0x7b0,'vibrato'],[0x7b3,'vibratoStep'],[0x7b6,'vibratoDelay'],[0x7b9,'vibratoTimer'],[0x7bc,'vibratoExtent']])r[a+i]=v[k];
   if(i<2){r[0x7a8+i]=v.envelope&255;r[0x7aa+i]=v.envelope>>>8;r[0x7a6+i]=v.envelopeValue;r[0x7ac+i]=v.envelopePhase;r[0x7ae+i]=v.envelopeCount;}
   if(i<8){r[0x7c1+i*4]=v.control;r[0x7c2+i*4]=v.sweep;r[0x7c3+i*4]=v.period&255;r[0x7c4+i*4]=v.period>>>8;}}
  r[0x7bf]=this.drumTable&255;r[0x7c0]=this.drumTable>>>8;r[0x741]=this.dpcm.start;r[0x753]=this.dpcm.length;r[0x74a]=this.dpcm.rate;return this.statusFlags;}
 emit(event){const e={frame:this.frame,...event};this.events.push(e);this.onEvent?.(e);this.sink?.event?.(e);}
 requestSound(id,{demoFlags=0}={}){
  id&=255;if((demoFlags&64)||((demoFlags&128)&&id<32))return false;this.ram[0x1b]=id;this.ram[0x7ff]=id;this.ram[0x7e6]=id;
  if(id===0){this.reset();return true;}
  if(id>=128){
   if(id===0xfb){this.delayedId=0;this.delay=0;return true;}
   if(id===0xfc){const saved=this.savedMusic;this.reset();this.savedMusic=saved;return true;}
   if(id===0xfd){this.outputEnabled=false;this.paused=true;this.savedMusic=this.musicId;this.emit({type:'silence'});return true;}
   if(id===0xfe){this.outputEnabled=false;this.savedMusic=this.musicId;this.emit({type:'silence'});return true;}
   if(id===0xff){this.outputEnabled=true;this.paused=false;if(this.savedMusic&&this.savedMusic!==this.musicId)return this.requestSound(this.savedMusic);for(let i=7;i>=4;i--)this.stopVoice(this.voices[i]);return true;}
   this.reset();return true;
  }
  if(id>80)throw new RangeError(`Undefined original sound ID ${id}`);
  this.outputEnabled=true;const accepted=this.startScore(scorePointer(id),128,id);
  this.emit({type:'request',id,accepted});return accepted;
 }
 startScore(address,scale,id=this.musicId){
  const priority=audioByte(address);this.scratchWord(0,address);this.ram[3]=scale;let p=address+1;
  if(priority<128){this.ram[2]=priority;
   if(audioByte(p)&128){this.delay=audioByte(p+1);this.delayedId=id;p+=2;}
   for(let q=p;audioByte(q)<128;q+=3){const i=audioByte(q);if(i>8)throw Error('Invalid score channel');if(priority<this.voices[i].priority)return false;}
  }else{this.musicId=id;this.tempo=this.tempoAccumulator=255;this.paused=false;}
  while(audioByte(p)<128){const i=audioByte(p++),v=this.voices[i];v.position=word(p);p+=2;
   if(i>=4&&i!==8)v.priority=priority;
   if(i<3){v.vibratoStep=30;v.vibratoExtent=150;}
   if(i<3){v.gateScale=250;v.transpose=0;}
   if(i!==3){if(i!==8){v.scale=scale;v.fraction=0;}v.dirty=128;}
   v.loop1=v.loop2=0;v.wait=1;v.active=1;
  }return true;
 }
 stopVoice(v){v.dirty=128;v.active=0;if(v.index>=4){v.priority=0;if(!this.paused&&v.index!==7&&v.index!==8&&this.voices[v.index&3].active){const bg=this.voices[v.index&3];this.outputs[v.index&3]={control:bg.control,sweep:bg.sweep,period:bg.period,source:bg.index};this.pulsePitchChange(bg,'sweep');this.pulsePitchChange(bg,'period');v.dirty=0;}}}
 read(v){return audioByte(v.position++);}
 readWord(v){const a=this.read(v);return a|(this.read(v)<<8);}
 gateLength(v){v.gate=this.scaleScratch(v.duration,v.gateScale)||1;}
 advance(v,music=false){if(!v.active)return;if(music){v.gateTimer=u8(v.gateTimer-1);if(!v.gateTimer)v.dirty|=128;}
  v.wait=u8(v.wait-1);if(v.wait)return;if(music)v.active&=251;
  for(let safety=0;safety<2048;safety++){const p=v.position,repeat=!!(v.active&2);const yieldTick=this.scoreStep(v);if(repeat){v.repeat=u8(v.repeat-1);if(v.repeat)v.position=p;else v.active&=253;}if(yieldTick){this.scratchWord(0,v.position);return;}}
  throw Error(`Non-yielding original score at ${v.position.toString(16)}`);
 }
 scoreStep(v){const op=this.read(v),i=v.index;
  if(op<64){if(i>=4){v.wait=op;return true;}v.duration=op;this.gateLength(v);return false;}
  if(op<192){if(i>=4){v.note=op;v.dirty|=32;return false;}
   if(i===3){const address=word(this.drumTable+(op&63)*2),scale=u8(v.volume+1+((op&128)?v.extraVolume:0));this.startScore(address,scale);v.wait=v.duration;return true;}
   v.note=(op+v.transpose)&63;v.gateTimer=(v.active&8)?255:v.gate;v.wait=v.duration;
   if(op&128){const flags=this.read(v);this.ram[2]=flags;if(flags&64)v.gateTimer=Math.min(v.duration,v.gateMax);if(flags&128)v.gateTimer=255;if(flags&32)v.active|=4;}
   if(!(v.active&128)){v.vibratoTimer=v.vibratoDelay;v.vibrato=0;if(v.vibratoStep&128){v.vibratoStep=u8(-v.vibratoStep);v.dirty|=32;}}
   v.dirty|=48;return true;
  }
  if(op>=192&&op<224)this.scratchWord(2,SCORE_COMMAND_TARGETS[op-192]);
  switch(op){
   case 0xc0:v.note=this.read(v);v.dirty|=32;break;
   case 0xc1:v.note=u8(v.note+this.read(v));v.dirty|=32;break;
   case 0xc2:v.fraction=this.read(v);v.dirty|=32;break;
   case 0xc3:{const delta=this.read(v),sum=v.fraction+delta;v.note=u8(v.note+(delta<128?(sum>255?1:0):(sum<256?-1:0)));v.fraction=u8(sum);v.dirty|=32;break;}
   case 0xc4:v.volume=this.read(v);v.dirty|=8;break;
   case 0xc5:v.volume=u8(v.volume+this.read(v));v.dirty|=8;break;
   case 0xc6:v.extraVolume=this.read(v);break;
   case 0xc7:v.gateScale=this.read(v);this.gateLength(v);break;
   case 0xc8:v.gateMax=this.read(v);break;
   case 0xc9:v.wait=v.duration;v.dirty|=128;return true;
   case 0xca:v.dirty|=16;break;
   case 0xcb:v.dirty|=128;break;
   case 0xcc:this.tempo=this.read(v);break;
   case 0xcd:{const p=this.readWord(v);if(i===3){this.drumTable=p;break;}if((i&3)===2)break;this.scratchWord(2,p);if(i<4)v.envelope=word(p);v.control=audioByte(p+2)|48;v.sweep=audioByte(p+3);v.dirty|=64;break;}
   case 0xce:case 0xcf:{const key=op===0xce?'loop1':'loop2',count=this.read(v),p=this.readWord(v);if(!v[key])v[key]=count;v[key]=u8(v[key]-1);if(v[key])v.position=p;break;}
   case 0xd0:v.position=this.readWord(v);break;
   case 0xd1:{const p=this.readWord(v);v.returnPosition=v.position;v.position=p;break;}
   case 0xd2:v.position=v.returnPosition;break;
   case 0xd3:this.stopVoice(v);return true;
   case 0xd4:v.sweep=this.read(v);v.dirty|=4;break;
   case 0xd5:this.paused=true;this.emit({type:'silence'});break;
   case 0xd6:v.active|=8;v.dirty|=128;break;
   case 0xd7:v.active&=247;v.dirty|=128;break;
   case 0xd8:v.transpose=this.read(v);break;
   case 0xd9:this.requestSound(this.read(v));break;
   case 0xda:v.repeat=this.read(v);v.active|=2;break;
   case 0xdb:v.vibratoDelay=this.read(v);v.vibratoStep=this.read(v);v.vibratoExtent=this.read(v);v.active|=16;break;
   case 0xdc:v.active|=16;break;
   case 0xdd:v.active&=239;break;
   case 0xde:this.dpcm={start:this.read(v),length:this.read(v),rate:this.read(v)};break;
   default:throw Error(`Unsupported original score command ${op.toString(16)}`);
  }return false;
 }
 updateVibrato(v){if(!(v.active&16))return;v.vibratoTimer=u8(v.vibratoTimer-1);if(v.vibratoTimer<128)return;v.vibratoTimer=0;const half=v.vibratoExtent>>>1,base=u8(half+v.vibrato);this.ram[3]=half;this.ram[2]=base;let n=v.vibratoStep<128?u8(base+v.vibratoStep):base+signed(v.vibratoStep);if(v.vibratoStep<128&&n>=v.vibratoExtent){v.vibratoStep=u8(-v.vibratoStep);n=v.vibratoExtent;}else if(v.vibratoStep>=128&&n<0){v.vibratoStep=u8(-v.vibratoStep);n=0;}v.vibrato=u8(n-half);v.dirty|=32;}
 pulsePitchChange(v,kind,full=true){if((v.index&3)>1||(v.index<4&&this.voices[v.index+4].active))return;this.emit({type:'pulsePitch',channel:v.index&3,kind,value:kind==='sweep'?v.sweep:v.period,full});}
 writeVoice(v){if(v.index<4&&this.voices[v.index+4].active)return;this.outputs[v.index&3]={control:v.control,sweep:v.sweep,period:v.period,source:v.index};}
 updateVolume(v,value){this.ram[2]=value;if(v.scale<128){value=this.scaleScratch(value,v.scale)>>>2;this.ram[2]=value;}else value>>>=3;this.ram[2]=value|48;v.control=(v.control&240)|(value|48);this.writeVoice(v);}
 updatePeriod(v){const oldPeriod=v.period;if((v.index&3)===3)v.period=v.note;else{let n=v.note,f=v.fraction;if(v.index<4){const sum=f+signed(v.vibrato);f=u8(sum);n+=Math.floor(sum/256);}n&=63;this.ram[2]=f;let p=audioByte(0x897b+n)|(audioByte(0x89bc+n)<<8);this.scratchWord(0,p);if(f)p-=this.scaleScratch(f,u8(audioByte(0x897b+n)-audioByte(0x897c+n)));this.scratchWord(0,p);v.period=p;}this.writeVoice(v);this.pulsePitchChange(v,'period',!!(v.sweep&128)||(oldPeriod>>>8)!==(v.period>>>8));}
 flush(v){const flags=v.dirty;if(!flags)return;
  if(v.index===8){if(flags&128)this.emit({type:'dpcmStop'});if(flags&16){this.outputEnabled=true;this.emit({type:'dpcm',...this.dpcm});}v.dirty=0;return;}
  if(flags&128){v.active&=127;if((v.index&3)===2){v.control=128;this.writeVoice(v);}else if(v.index<4){if(v.index<2)v.envelopePhase=2;}else{v.control&=240;this.writeVoice(v);}}
  if(flags&64){this.writeVoice(v);this.pulsePitchChange(v,'sweep');}
  if(flags&32)this.updatePeriod(v);
  if((flags&8)&&v.index>=4&&(v.index&3)!==2&&(v.active&128))this.updateVolume(v,v.volume);
  if(flags&4){this.writeVoice(v);this.pulsePitchChange(v,'sweep');}
  if((flags&16)&&!(v.active&128)){this.pulsePitchChange(v,'period');v.active|=128;if((v.index&3)===2){v.control=129;this.writeVoice(v);}else if(v.index>=4)this.updateVolume(v,v.volume);else if(v.index<2)v.envelopePhase=1;}
  v.dirty=0;
 }
 updateEnvelope(v){let p=v.envelopePhase;if(!p)return;this.scratchWord(0,v.envelope);const read=o=>this.envelopeByte(v.envelope+o);let next=false;
  if(p>=128){p&=127;const delta=read(p),n=v.envelopeValue+signed(delta);if(n<0||n>255){v.envelopeValue=Math.max(0,Math.min(255,n));v.envelopePhase=0;}else{v.envelopeValue=n;if(delta<128)next=true;}}
  else if(p===2){v.envelopeValue=Math.min(read(1),v.envelopeValue);v.envelopePhase=130;}
  else if(p===1){v.envelopeValue=read(0);p=3;next=true;}
  else{v.envelopeValue=u8(v.envelopeValue+read(p));v.envelopeCount=u8(v.envelopeCount-1);if(!v.envelopeCount){p=u8(p+2);next=true;}}
  if(next){v.envelopePhase=p;v.envelopeCount=read(p+1);if(!v.envelopeCount)v.envelopePhase=read(p)?p|128:0;}
  const factor=u8(((v.active&4)?v.extraVolume:0)+v.volume+1);this.updateVolume(v,this.scaleScratch(v.envelopeValue,factor));
 }
 tick(){this.events=[];this.frame++;if(!this.enabled)return {frame:this.frame,voices:this.outputs,events:[]};
  if(this.delayedId&&!this.paused){this.delay=u8(this.delay-1);if(!this.delay)this.requestSound(this.delayedId);}
  for(let i=8;i>=4;i--){this.advance(this.voices[i]);this.flush(this.voices[i]);}
  if(!this.paused){for(let i=2;i>=0;i--){const v=this.voices[i];this.updateVibrato(v);this.flush(v);if(i<2)this.updateEnvelope(v);}
   const sum=this.tempoAccumulator+this.tempo;this.tempoAccumulator=u8(sum);if(sum>255){this.advance(this.voices[3]);for(let i=2;i>=0;i--)this.advance(this.voices[i],true);}
  }
  const result={frame:this.frame,voices:this.outputs.map(v=>this.outputEnabled?({...v}):({...v,control:0})),events:[...this.events]};this.sink?.renderFrame?.(result);return result;
 }
}
export function createOriginalAudioDriver(options){return new OriginalAudioDriver(options);}
// Static DPCM-to-PCM conversion, no CPU/APU instance. Native DAC starts at zero (8679).
export function decodeOriginalDpcm({start=0xf9,length=8}={}){const offset=(0xc000+start*64)-0xfe40,count=length*16+1;if(offset<0||offset+count>DPCM_DATA.length)throw RangeError('DPCM range outside extracted sample');const out=new Float32Array(count*8);let level=0,n=0;for(const byte of DPCM_DATA.subarray(offset,offset+count))for(let b=0;b<8;b++){if(byte&(1<<b)){if(level<=125)level+=2;}else if(level>=2)level-=2;out[n++]=level/64-1;}return out;}

const NTSC_CLOCK=1789773;
const NOISE_PERIODS=[4,8,16,32,64,96,128,160,202,254,380,508,762,1016,2034,4068];
const DPCM_PERIODS=[428,380,340,320,286,254,226,214,190,160,142,128,106,85,72,54];
/** User-gesture-unlocked WebAudio sink. This is waveform synthesis, not an APU
 * register or CPU emulator. Sweep timing origin and analog responses remain uncovered. */
export class OriginalWebAudioSink {
 constructor({volume=0.18,frameRate=60.0988,clock=NTSC_CLOCK,onPitchPoint=null,mixerMode='measured-nonlinear',filterProfile='famicom-37hz',contextFactory=null}={}){if(!['linear','measured-nonlinear'].includes(mixerMode))throw Error('Unknown audio mixer mode');this.mixerMode=mixerMode;this.filterProfile=filterProfile;this.onPitchPoint=onPitchPoint;this.volume=volume;this.frameRate=frameRate;this.clock=clock;this.contextFactory=contextFactory;this.context=null;this.nodes=[];this.pending=[];this.pitchPending=[];this.pitchCurves=new OriginalPulsePitchCurves({clock});this.pitchTime=0;this.nextTime=0;this.muted=false;}
 async unlock(){if(!this.context){const Factory=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Factory&&!this.contextFactory)return false;this.context=this.contextFactory?this.contextFactory():new Factory();const c=this.context;this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume;this.master.connect(c.destination);this.characterized=this.mixerMode==='measured-nonlinear'?createCharacterizedMixer(c,this.master,{filterProfile:this.filterProfile}):null;
   this.waves=[.125,.25,.5,.75].map(duty=>{const real=new Float32Array(65),imag=new Float32Array(65);for(let n=1;n<65;n++){real[n]=2*Math.sin(2*Math.PI*n*duty)/(Math.PI*n);imag[n]=2*(1-Math.cos(2*Math.PI*n*duty))/(Math.PI*n);}return c.createPeriodicWave(real,imag,{disableNormalization:true});});
   for(let i=0;i<3;i++){const oscillator=c.createOscillator();let gain,offset;if(this.characterized){({gain,offset}=this.characterized.connectWave(oscillator,i));if(i<2)offset.offset.value=.125;}else{gain=c.createGain();gain.gain.value=0;oscillator.connect(gain);gain.connect(this.master);}if(i===2)oscillator.type='triangle';else oscillator.setPeriodicWave(this.waves[0]);oscillator.start();this.nodes.push({oscillator,gain,offset,duty:0});}
   let gain,offset,input;if(this.characterized){input=c.createGain();({gain,offset}=this.characterized.connectWave(input,3));this.dpcmHold=c.createConstantSource();this.dpcmHold.offset.value=0;this.dpcmHold.connect(this.characterized.inputs[4]);this.dpcmHold.start();}else{gain=c.createGain();gain.gain.value=0;gain.connect(this.master);}this.nodes.push({gain,offset,input,mode:-1,source:null});this.noiseBuffers=[this.makeNoise(false),this.makeNoise(true)];
  }if(!this.context.startRendering)await this.context.resume();this.nextTime=this.context.currentTime+.015;return true;}
 makeNoise(short){const length=short?93:32767,b=this.context.createBuffer(1,length,32000),samples=b.getChannelData(0);let shift=1;for(let i=0;i<length;i++){samples[i]=(shift&1)?-1:1;shift=(shift>>>1)|(((shift^(shift>>>(short?6:1)))&1)<<14);}return b;}
 setMuted(muted){this.muted=!!muted;if(this.master)this.master.gain.setValueAtTime(this.muted?0:this.volume,this.context.currentTime);}
 event(event){if(event.type==='pulsePitch'){if(this.context)this.pitchPending.push(event);return;}if(event.type==='silence'){this.pending=[];if(this.context){for(const n of this.nodes){n.gain.gain.cancelScheduledValues(this.context.currentTime);n.gain.gain.setValueAtTime(0,this.context.currentTime);}this.holdDpcmAt(this.context.currentTime);this.dpcmNode?.stop();this.dpcmNode=null;}}else if(event.type==='dpcm'||event.type==='dpcmStop')this.pending.push(event);}
 renderFrame(frame){if(!this.context){this.pending=[];return;}const c=this.context,canRender=c.state==='running'||!!c.startRendering,t=canRender?Math.max(this.nextTime,c.currentTime+.005):0;if(canRender)this.nextTime=t+1/this.frameRate;const pitchStart=this.pitchTime,pitchEnd=pitchStart+1/this.frameRate,pitch=this.pitchCurves.segment(pitchStart,pitchEnd,this.pitchPending);this.pitchPending=[];this.pitchTime=pitchEnd;
  // Keep the bounded pitch state current while suspended; do not retain a history
  // of writes or schedule inaudible frames to replay when output resumes.
  if(!canRender){this.pending=[];return;}
  for(let i=0;i<4;i++){const v=frame.voices[i],n=this.nodes[i];if(i===3){const mode=(v.period>>>7)&1;if(n.mode!==mode){n.source?.stop(t);const source=c.createBufferSource();source.buffer=this.noiseBuffers[mode];source.loop=true;source.connect(n.input||n.gain);source.start(t);n.source=source;n.mode=mode;}n.source.playbackRate.setValueAtTime(this.clock/NOISE_PERIODS[v.period&15]/32000,t);n.gain.gain.setValueAtTime(this.characterized?(v.control&15):(v.control&15)/15*.5,t);}
   else{const divisor=i===2?32:16,f=this.clock/(divisor*((v.period&2047)+1));if(i<2){const duty=v.control>>>6;if(n.duty!==duty){n.oscillator.setPeriodicWave(this.waves[duty]);n.duty=duty;}n.offset?.offset.setValueAtTime([.125,.25,.5,.75][duty],t);}if(i<2){for(const p of pitch[i]){const when=t+p.at-pitchStart;this.onPitchPoint?.({channel:i,...p});n.oscillator.frequency.setValueAtTime(p.frequency,when);n.gain.gain.setValueAtTime(p.muted?0:(v.control&15)/(this.characterized?1:15),when);}}else{n.oscillator.frequency.setValueAtTime(f,t);n.gain.gain.setValueAtTime((v.control&127)?(this.characterized?15:0.65):0,t);}}}
  for(const event of this.pending){if(event.type==='dpcmStop'){this.holdDpcmAt(t);this.dpcmNode?.stop(t);this.dpcmNode=null;continue;}const samples=decodeOriginalDpcm(event),rate=this.clock/DPCM_PERIODS[event.rate&15],buffer=c.createBuffer(1,samples.length,32000);const values=this.characterized?Float32Array.from(samples,x=>(x+1)*64):samples;buffer.copyToChannel(values,0);this.dpcmNode?.stop(t);if(this.characterized){this.dpcmHold.offset.cancelScheduledValues(t);this.dpcmHold.offset.setValueAtTime(0,t);if(!(event.rate&64))this.dpcmHold.offset.setValueAtTime(values[values.length-1],t+values.length/rate);this.dpcmPlaying={values,rate,start:t,loop:!!(event.rate&64)};}const source=c.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate/32000;source.loop=!!(event.rate&64);source.connect(this.characterized?this.characterized.inputs[4]:this.master);source.start(t);this.dpcmNode=source;}this.pending=[];
 }
 holdDpcmAt(t){if(!this.characterized||!this.dpcmPlaying)return;const p=this.dpcmPlaying,position=Math.max(0,Math.floor((t-p.start)*p.rate)),index=p.loop?position%p.values.length:Math.min(position,p.values.length-1);this.dpcmHold.offset.cancelScheduledValues(t);this.dpcmHold.offset.setValueAtTime(p.values[index],t);this.dpcmPlaying=null;}
 dispose(){for(const n of this.nodes)for(const source of[n.oscillator,n.source,n.offset]){try{source?.stop();}catch{}}for(const source of[this.dpcmNode,this.dpcmHold]){try{source?.stop();}catch{}}try{this.context?.close?.()?.catch?.(()=>{});}catch{}this.context=null;this.nodes=[];this.pending=[];this.pitchPending=[];this.master=null;this.characterized=null;this.waves=null;this.noiseBuffers=null;this.dpcmNode=null;this.dpcmHold=null;this.dpcmPlaying=null;}
}
export function createOriginalWebAudioSink(options){return new OriginalWebAudioSink(options);}
