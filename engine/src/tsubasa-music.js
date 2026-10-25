/** Original fan-game music (tools/compose-tsubasa-music.mjs -> src/tsubasa-music-data.js), played by the original score
 * driver in place of the original scores of the same sound IDs: 1 (title / 南葛助威曲) and 7 (Nankatsu match theme).
 * Off unless a page turns it on, so tests and the ordinary baseline keep the original music. */
import {setScoreExtension} from './audio-driver.js';
import {TSUBASA_MUSIC_BASE,TSUBASA_MUSIC_DATA,TSUBASA_MUSIC_POINTERS,TSUBASA_MUSIC_NAMES} from './tsubasa-music-data.js';
export {TSUBASA_MUSIC_NAMES};
export function enableTsubasaMusic(on=true){setScoreExtension(on?{base:TSUBASA_MUSIC_BASE,data:TSUBASA_MUSIC_DATA,pointers:TSUBASA_MUSIC_POINTERS}:null);return on;}
