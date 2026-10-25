/** Shared initialization for the shipped game, roster catalogue and QA. */
import {HD_CHARACTERS} from '../art/hd-runtime.js';
import {configureTsubasaArtwork,configureTsubasaTeams,configureTsubasaNonmatch,getTsubasaCoverage} from './tsubasa-runtime.js';
import {getPlayerIdentity,getMatchKits} from './tsubasa-teams.js';
import {resolveNonmatchArt,drawNonmatchBackground,getNonmatchCoverage,classifyNonmatchFrame} from '../art/nonmatch-characters.js';
let initialized=false;
export function initializeTsubasaGame(){if(!initialized){configureTsubasaArtwork(HD_CHARACTERS);configureTsubasaTeams({getPlayerIdentity,getMatchKits});configureTsubasaNonmatch({resolveNonmatchArt,drawNonmatchBackground,classifyNonmatchFrame});initialized=true;}return getTsubasaCoverage();}
export {getPlayerIdentity,getMatchKits,getNonmatchCoverage};

/** Explicit gameplay opt-in; presentation-only/faithful apps stay untouched. */
export function enableTsubasaGameMechanics(app){if(typeof app?.setTsubasaSpecialMoves!=='function')throw TypeError('RecoveredApp required');app.setTsubasaSpecialMoves(true);return app;}
