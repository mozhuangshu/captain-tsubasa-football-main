/** Bounded presentation-only dead-output elimination.
 * See docs/DEVELOPMENT.md and audio/ending2-logo-read-audit.json.
 * This is NOT equivalent RAM/CPU-bus emulation. It never changes an actor/timer.
 */
export function canElideEndingBlackFrame(r,audio){
 if(r[0x58]!==3||r[0x59]!==9||r[0x61f]!==2||r[0x4f]!==128||r[0x6d]!==8)return false;
 if(r[0x58b]!==128||r[0x465]!==42||r[0xf4]!==1||r[0xa1]!==12||r[0x5b8]!==112||r[0x5b9]!==113)return false;
 if(r[0x5b4]!==0||r[0x5b2]!==0||r[0x5b3]!==4||r[0x5b6]!==0)return false;
 if(![0x90,0xa6].includes(r[0x80])||r[0x93]<1||r[0x93]>4||![0,255].includes(r[0xa0]))return false;
 if(!audio||audio.musicId!==14||audio.delayedId||audio.paused||audio.voices.length!==9)return false;
 if(audio.voices.some((v,i)=>i>=4&&i!==7&&v.active))return false;
 const noise=audio.voices[7];
 if(noise.active&&!(noise.priority===0x2f&&noise.scale===0x3f&&((noise.active===1&&noise.position===0x93d4&&noise.wait===1)||(noise.active===0x81&&noise.position===0x93d9&&[1,2].includes(noise.wait)))))return false;
 return audio.voices[0].envelope===0x92a7&&audio.voices[1].envelope===0x92e9&&[3,0x82].includes(audio.voices[0].envelopePhase)&&[3,0x82].includes(audio.voices[1].envelopePhase);
}
export function elideEndingBlackFrame(r,audio){if(!canElideEndingBlackFrame(r,audio))return false;r[0xf4]=0;return true;}
