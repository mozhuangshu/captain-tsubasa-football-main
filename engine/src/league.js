/** Static semantic conversion. No ROM loading, instruction execution, or emulation.
 * See docs/DEVELOPMENT.md for original boundaries and field contracts. */
export const WIN_BITS = Object.freeze([0, 128, 64, 32]); // file $017475
export const POINT_MASKS = Object.freeze([3, 3, 7]); // file $017479
export const POINT_PACKED = Object.freeze([0, 0, 0, 0, 0, 0, 21, 41, 0, 58, 57, 78, 0, 78, 41, 21]); // file $01747C
export const BRACKET_SEEDS = Object.freeze([11, 9, 13, 14, 7, 0, 11, 9, 13, 0, 14, 7, 11, 9, 0, 13, 14, 7]); // file $0175E4
export const PASSWORD_WIN_BITS = Object.freeze([0, 128, 192, 224]); // file $017999
export const PASSWORD_SALT = Object.freeze([173, 45, 5, 41, 15, 74, 74, 168, 185, 142, 186, 141, 41, 5, 32, 5, 192, 41, 3, 133, 28, 173, 74, 5, 48, 4, 169, 11, 208, 3, 173, 45]); // file $0179D4
export const OPPONENT_MENU = Object.freeze([65, 0, 7, 5, 14, 10, 74, 7, 67, 2, 69, 3, 13, 9, 11, 8, 2, 1, 70, 4, 79, 11, 9, 6]); // file $014A09
function integer(v, max, name) {
  if (!Number.isInteger(v) || v < 0 || v > max) throw new RangeError(`${name}: expected 0..${max}`);
  return v;
}
const byte = (v, name) => integer(v, 255, name);
function bytes(a, length, name) {
  if (!a || a.length !== length) throw new RangeError(`${name}: expected ${length} bytes`);
  for (const v of a) byte(v, name);
  return a;
}
function records(s) { return bytes(s.records, 12, 'records ($053E..$0549)'); }
export class MissingTranslation extends Error {
  constructor(boundary) { super(`MissingTranslation: ${boundary}`); this.name = 'MissingTranslation'; }
}
/** $8838 search / $884F menu mapping / $8868 exhausted-opponent test. */
export function opponentMenuIndex(teamByte) {
  const team = byte(teamByte, 'team') & 15;
  for (let i=0;i<12;i++) if ((OPPONENT_MENU[i*2]&15)===team) return i;
  return 0;
}
export function selectLeagueOpponent(state, menuIndex) {
  integer(menuIndex,11,'menuIndex'); records(state);
  const team = OPPONENT_MENU[menuIndex*2] | 128;
  const recordIndex = OPPONENT_MENU[menuIndex*2+1];
  return {team, recordIndex, available:(state.records[recordIndex]&3)!==3};
}
/** $B3DE..B464. Caller must only invoke once per completed match.
 * flag052a/flag052b bit 0 gates bookkeeping; original reads these flags,
 * not an inferred comparison of scores. Opponent IDs 1..15 excluding 4,8,12.
 */
export function settleLeagueMatch(s) {
  records(s);
  for (const k of ['flag052a','flag052b','opponent','scoreHome','scoreAway','played','losses','wins','points','mode']) byte(s[k],k);
  if (((s.flag052a|s.flag052b)&1)===0) return {recorded:false};
  const team=s.opponent&15;
  if (team===0 || team%4===0) throw new RangeError('opponent has no league record');
  const difficulty=s.mode&3;
  if (difficulty===3) throw new MissingTranslation('B442: difficulty 3 overlaps following data, unsupported menu domain');
  // CLC; SBC group subtracts one extra: team - floor(team/4) - 1.
  const index=team-(team>>>2)-1;
  s.records[index]=(s.records[index]+1)&255;
  s.played=(s.played+1)&255;
  if (s.scoreHome===s.scoreAway) return {recorded:true,result:'draw',index,pointsAdded:0};
  if (s.scoreHome<s.scoreAway) {
    if (s.losses!==255) s.losses++;
    return {recorded:true,result:'loss',index,pointsAdded:0};
  }
  s.records[index]|=WIN_BITS[s.records[index]&3];
  s.wins=(s.wins+1)&255;
  const award=((POINT_PACKED[team] >>> (difficulty*2)) & POINT_MASKS[difficulty])+2+difficulty;
  const previous=s.points;
  s.points=Math.min(255,s.points+award);
  return {recorded:true,result:'win',index,pointsAdded:s.points-previous,award};
}
/** Decision-only slice $B2B6..B2DD; does not reapply settlement or UI calls. */
export function leagueQualification(s) {
  byte(s.stage,'stage'); byte(s.points,'points'); byte(s.wins,'wins');
  if (s.stage<128) return 'bracket';
  if (s.points<0x46 || s.wins<0x10) return 'league';
  return s.wins>=0x24 ? 'forced-bracket' : 'offer-bracket';
}
/** State writes $B3BD..B3D6, excluding unrelated BB47 match setup. */
export function enterBracket(s) {
  byte(s.mode,'mode'); s.stage=0; s.returnScreen=3;
  if ((s.mode&3)===0) s.mode|=1;
  s.screenSubtype=15;
}
/** $B588 finds the pairing containing team 0; $B5A6 settles earlier pairings.
 * Other-team results depend on frame parity, NOT RNG or team strength.
 * $B50A..B585 starts at stage 0..3 and deliberately falls through stages.
 */
export function prepareBracketMatch(s) {
  integer(s.stage,3,'stage'); byte(s.points,'points'); byte(s.frame,'frame');
  bytes(s.bracket,10,'bracket ($054B..$0554)');
  const b=s.bracket;
  const pairing=(x,y)=>{
    if (b[x]!==0 && b[y]!==0) return false;
    s.opponent=(b[x]===0 ? b[y] : b[x])|128; s.homeTeam=0;
    return true;
  };
  const resolve=(x,y)=>{
    if (b[x]===0) {b[x]=128;return 0;}
    if (b[y]===0) {b[y]=128;return 0;}
    const chosen=(s.frame&1) ? y : x;
    b[chosen]|=128;
    return b[chosen]&127;
  };
  if (s.stage===0) {
    const offset=s.points<0x5a ? 0 : s.points<0x78 ? 6 : 12;
    for(let i=0;i<6;i++) b[i]=BRACKET_SEEDS[offset+i];
    if(pairing(4,5)) return {stage:s.stage,opponent:s.opponent};
    s.stage++;
  }
  if(s.stage===1) {
    b[6]=resolve(4,5);
    if(pairing(1,2)||pairing(3,6)) return {stage:s.stage,opponent:s.opponent};
    s.stage++;
  }
  if(s.stage===2) {
    b[8]=resolve(1,2); b[7]=resolve(3,6);
    if(pairing(7,8)) return {stage:s.stage,opponent:s.opponent};
    s.stage++;
  }
  b[9]=resolve(8,7);
  pairing(0,9);
  return {stage:s.stage,opponent:s.opponent};
}
/** Exact league/bracket result routing at fixed bank 07:$C9AD..C9F8.
 * Excludes subsequent roster-mood copy $C9FA..CA11, a separate subsystem.
 */
export function routeCompletedMatch(s) {
  byte(s.mode,'mode');byte(s.stage,'stage');byte(s.flag052a,'flag052a');
  if(s.mode<128) {s.screen=2;s.screenSubtype=1;return 'versus-menu';}
  if(s.stage<128) {
    if(s.stage===3 || !(s.flag052a&1)) {
      s.ending=s.stage===3 ? ((s.flag052a&1)?0:1) : 2;
      s.screen=3;s.screenSubtype=0;return 'ending';
    }
    s.stage=(s.stage+1)&255;
  }
  s.screen=2;s.screenSubtype=14;s.returnScreen=3;return 'league-results';
}
function checksum(n) {let sum=0;for(let i=0;i<8;i++) sum=(sum+n[i])&63;return sum;}
/** $B8A5..B912. randomByte is the byte RETURNED by original C005 RNG call.
 * API exposes that boundary so the shared RNG advances exactly once upstream.
 * The 10 nibbles are original glyph indices, not a made-up ASCII alphabet.
 */
export function encodeLeaguePassword(s,randomByte) {
  records(s);byte(s.points,'points');byte(randomByte,'randomByte');
  const n=Array(10).fill(0);
  for(let i=0;i<12;i++) {
    const v=s.records[i];const count=((v>>>7)&1)+((v>>>6)&1)+((v>>>5)&1);
    n[i>>>1]|=count<<((i&1)*2);
  }
  n[6]=s.points>>>4;n[7]=s.points&15;
  const sum=checksum(n);n[8]=(sum&3)|(randomByte&12);n[9]=sum>>>2;
  const salt=(randomByte&12)<<1;
  for(let x=7;x>=0;x--) n[x]=(n[x]+PASSWORD_SALT[(x&7)|salt])&15;
  n[9]=(n[9]+PASSWORD_SALT[1|salt])&15;
  return n;
}
/** $B913..B988. Invalid input clears counters before checksum, as original.
 * Only victories and points persist; losses/played reset. Restored entries
 * canonicalize victories to the high consecutive bits AND low match count.
 */
export function restoreLeaguePassword(s,password) {
  records(s);bytes(password,10,'password');
  for(const n of password) integer(n,15,'password glyph');
  const n=Array.from(password);s.points=0;s.played=0;s.wins=0;s.losses=0;
  const salt=(n[8]&12)<<1;
  for(let x=7;x>=0;x--) n[x]=(n[x]-PASSWORD_SALT[(x&7)|salt])&15;
  n[9]=(n[9]-PASSWORD_SALT[1|salt])&15;
  if(((n[9]<<2)|(n[8]&3))!==checksum(n)) return false;
  s.points=((n[6]<<4)|n[7])&255;
  for(let i=0;i<12;i++) {
    const wins=(n[i>>>1]>>>((i&1)*2))&3;
    s.records[i]=wins|PASSWORD_WIN_BITS[wins];s.wins=(s.wins+wins)&255;
  }
  return true;
}
/** $8A79..8ABD writes 3-3-4 glyphs and FF separators. */
export function passwordDisplayTiles(password) {
  bytes(password,10,'password');for(const n of password) integer(n,15,'password glyph');
  return [...password.slice(0,3).map(n=>n|128),255,...password.slice(3,6).map(n=>n|128),255,...password.slice(6).map(n=>n|128)];
}
