/** Integration adapters between recovered semantic modules.
 * No CPU, ROM bus, opcodes or mapper. Address keys retain traceability of game state.
 * Arrays are copied because roster algorithms use ordinary Array.map returning objects.
 */
import {initializeRosterState,configureRosterControls,loadMatchAttributes,playerAttributes} from '../rosters.js';
import {applyTsubasaStoryStats} from '../tsubasa-story-stats.js';
const scalar={mode57:0x57,playersAmount:0x5d,value054a:0x54a,value06fc:0x6fc};
const arrays={teams:[0x52c,2],formations:[0x530,2],playerNumbers:[0x532,12],positionControl:[0x650,12],moods:[0x5d5,12],tactics:[0x5d3,2],goalkeeperControl:[0x68c,2],possessionFlags:[0x52a,2]};
function validate(r){if(!(r instanceof Uint8Array)||r.length<2048)throw new TypeError('2048-byte game state required');}
export function readRosterState(r){validate(r);const s={};for(const [k,a] of Object.entries(scalar))s[k]=r[a];for(const [k,[a,n]]of Object.entries(arrays))s[k]=Array.from(r.subarray(a,a+n));return s;}
export function writeRosterState(r,s){validate(r);for(const[k,a]of Object.entries(scalar))if(k in s)r[a]=s[k];for(const[k,[a,n]]of Object.entries(arrays))if(k in s){if(s[k].length!==n)throw new RangeError(k);r.set(s[k],a);}
 if(s.attributes){if(s.attributes.length!==12)throw new RangeError('attributes');for(let i=0;i<12;i++)for(const[k,a]of Object.entries({hp04e4:0x4e4,speed04d7:0x4d7,defense04fd:0x4fd,skill04f1:0x4f1}))r[a+i]=s.attributes[i][k];}return s;}
export function initializeRosterMemory(r){const s=readRosterState(r);initializeRosterState(s);return writeRosterState(r,s);}
export function configureRosterMemory(r){const s=readRosterState(r);configureRosterControls(s);return writeRosterState(r,s);}
export function loadAttributeMemory(r){const s=readRosterState(r);loadMatchAttributes(s);applyTsubasaStoryStats(s.attributes,s.teams,s.playerNumbers,playerAttributes);writeRosterState(r,s);return s.attributes;}
