/** The character heads, on by default (user, 2026-10-23): every character wears its repaired head on the original
 * Nekketsu body (head blocks, docs/HEAD_SWAP_STUDY.md; HUD/non-match screens use art/canonical-heads.js). The web page
 * (index.html) and the XHS mini-tool (xhs/tools/entry.js) both call installTsubasaHeads() right after
 * initializeTsubasaGame(). The old per-character HD heads, the ?heads=bank switch, the Tsubasa rig and the redrawn
 * bodies are gone (runtime-art-data). */
import {enableTsubasaHeadBank} from './tsubasa-layered-sprites.js';
import {CANONICAL_HEADS as NONMATCH_HEADS} from '../art/canonical-heads.js';
import {HD_CHARACTERS,HD_CHARACTER_BY_ID} from '../art/hd-runtime.js';
export function installTsubasaHeads({warm=true}={}){
 const skins=HD_CHARACTERS.filter(c=>!/placeholder/.test(c.identityStatus??'')).map(c=>c.skin);
 /* Warm common and celebration poses only for characters actually drawn, through one budget-aware idle queue. */
 enableTsubasaHeadBank({heads:NONMATCH_HEADS,template:HD_CHARACTER_BY_ID.tsubasa.skin,skins,warm,repair:false});
 return skins.length;}
