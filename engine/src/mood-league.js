import {MOOD_POSITION_LOOKUP} from './mood-position-data.js';
/** Direct algorithm translations, not a CPU/ROM runner. See docs/DEVELOPMENT.md
 * Addresses in names denote fields whose game-language meaning is unverified.
 * All inputs are validated at the recovered routine's supported domain boundary.
 */
export const MOOD_ACTION_ROWS = Object.freeze([
  0x401400, 0x481002, 0x484008, 0x400142,
  0x610016, 0x401000, 0x442400, 0x520001,
  0x614802, 0x400680, 0x448000, 0x512800,
]); // 0B:B084..B0A7, file 017094..0170B7
export const MOOD_DELTAS = Object.freeze([1, 2, -2, -1, 3, -3, 4, -4]); // 0B:B07C
export const PLAYER_TRAITS_BF1F = Object.freeze([
  0x00, 0x43, 0x41, 0x82, 0x81, 0xc2, 0x83, 0x01, 0x02, 0x02, 0x40, 0xc0,
]); // 01:BF1F..BF2A
export const SLOT_PREFERENCES_BF98 = Object.freeze([
  0x00, 0x00, 0x00, 0x40, 0x40, 0x40, 0x40, 0x40, 0x00,
  0x80, 0x00, 0x80, 0x80, 0x80, 0x80, 0xc0, 0xc0, 0xc0,
]); // 01:BF98..BFA9
function integer(value, low, high, name) {
  if (!Number.isInteger(value) || value < low || value > high)
    throw new RangeError(`${name} must be an integer in ${low}..${high}`);
  return value;
}
function byte(value, name) { return integer(value, 0, 255, name); }
function playerIndex(value) { return integer(value, 0, 11, 'playerIndex'); }
function validateMoods(state) {
  if (!state.moods || state.moods.length !== 12) throw new RangeError('moods must contain 12 bytes ($05D5..$05E0)');
  for (const value of state.moods) byte(value, 'mood byte');
}
function clampMood(value) { return Math.max(0, Math.min(15, value)); }

/** 0F:EE35..EE59, called through 0E:C005. Mutates exactly the two persistent RNG bytes.
 * $45 is the FIRST byte shifted, so it is the HIGH byte of this shift register.
 * Original also overwrites scratch $0C with old $45 & 2; returned for auditability.
 */
export function advanceRandom(state) {
  const first = byte(state.rng45, 'rng45');
  const second = byte(state.rng46, 'rng46');
  const feedback = ((first ^ second) >>> 1) & 1;
  state.rng45 = (first >>> 1) | (feedback << 7);
  state.rng46 = (second >>> 1) | ((first & 1) << 7);
  return { value: state.rng45, scratch0c: first & 2 };
}

/** Packed 12 x 12 two-bit effects, exactly the table selection at 0B:B009..B041. */
export function decodeMoodAction(player, action) {
  playerIndex(player); integer(action, 0, 11, 'action');
  return (MOOD_ACTION_ROWS[player] >>> (2 * (11 - action))) & 3;
}
function applyDelta(state, player, delta) {
  const previous = state.moods[player];
  state.moods[player] = (previous & 0xf0) | clampMood((previous & 15) + delta);
  return state.moods[player];
}
/** 0B:B009..B076. Mode 0 returns without writing mood or advancing RNG;
 * mode 1 -> +2, mode 2 -> -2, mode 3 -> the RNG-indexed signed delta table.
 */
export function applyMoodAction(state, player, action) {
  validateMoods(state);
  const mode = decodeMoodAction(player, action);
  if (mode === 0) return state.moods[player];
  const index = mode === 3 ? advanceRandom(state).value & 7 : mode;
  return applyDelta(state, player, MOOD_DELTAS[index]);
}
/** Independent entry 0B:B077: STY $1D; JMP $B043. Always draws RNG;
 * it bypasses $20/mode testing, unlike the table-driven entry.
 */
export function applyRandomMood(state, player) {
  validateMoods(state); playerIndex(player);
  return applyDelta(state, player, MOOD_DELTAS[advanceRandom(state).value & 7]);
}

/** 01:BFE6..BFF2. Six entries at $0532,$0534,...,$053C are supplied in this order.
 * Search is descending. Returns the ORIGINAL even Y offset, or $FE for absent.
 */
export function findRosterOffset(rosterEven0532, player) {
  playerIndex(player);
  if (!rosterEven0532 || rosterEven0532.length !== 6) throw new RangeError('rosterEven0532 must contain 6 bytes');
  for (const value of rosterEven0532) byte(value, 'roster entry');
  for (let slot = 5; slot >= 0; slot--) if (rosterEven0532[slot] === player) return slot * 2;
  return 0xfe;
}

/** 01:BF06..BFF2 complete twelve-player update with local helpers inlined.
 * Inputs: moods[12], rosterEven0532[6], value052e/value052f bytes,
 * value0530 in 0..2, and rng45/rng46. No guessed labels for these three values.
 * Per-step saturation is intentional: combining increments into a net delta
 * changes results at 0 or 15. Players are processed from 11 down to 0.
 */
export function settleRosterMood(state) {
  validateMoods(state);
  byte(state.value052e, 'value052e'); byte(state.value052f, 'value052f');
  byte(state.value0530, 'value0530');
  byte(state.rng45, 'rng45'); byte(state.rng46, 'rng46');
  // Validate before any mutation, including the roster data used by all helpers.
  findRosterOffset(state.rosterEven0532, 0);
  for (let player = 11; player >= 0; player--) {
    const trait = PLAYER_TRAITS_BF1F[player];
    const presentOffset = findRosterOffset(state.rosterEven0532, player);
    const isPresent = presentOffset < 0x80;
    let mood = state.moods[player] & 15;
    const increase = () => { mood = Math.min(15, mood + 1); };
    const decrease = () => { mood = Math.max(0, mood - 1); };
    const comparePosition = () => {
      if (!isPresent) return;
      const index = (presentOffset + (presentOffset >>> 1) + state.value0530) & 255;
      if ((trait & 0xf0) === MOOD_POSITION_LOOKUP[index]) increase();
      else decrease();
    };
    switch (trait & 3) {
      case 0: // BF39: BF7C, BFAA, BFBA
        comparePosition();
        if (!isPresent) decrease();
        if (state.value052e < state.value052f) increase();
        break;
      case 1: // BF45: BF7C, BFC6, BFAA, BFD2 (order matters)
        comparePosition();
        if (state.value052e < state.value052f) decrease();
        if (!isPresent) decrease();
        if (state.value052e > state.value052f) increase();
        break;
      case 2: // BF54: BFBA, BFB2
        if (state.value052e < state.value052f) increase();
        if (isPresent) increase();
        break;
      case 3: // BF5D: BFDE; RNG sign chooses saturated increment/decrement
        if (advanceRandom(state).value < 0x80) increase(); else decrease();
        break;
    }
    state.moods[player] = (state.moods[player] & 0xf0) | mood;
  }
  return state.moods;
}

/** 0B:AF75..AFBB persistent-state portion of AF5F (UI text setup is excluded).
 * Option <5 sets the literal original flags. Option >=5 leaves them unchanged.
 * Option numbers remain unlabelled until the original text/CHR is decoded.
 */
export function applyMenuBoostFlags(state, player, option) {
  validateMoods(state); playerIndex(player); byte(option, 'option');
  const previous = state.moods[player];
  switch (option) {
    case 0: state.moods[player] = previous | 0x80; break;
    case 1: state.moods[player] = (previous & 0xcf) | 0x10; break;
    case 2: state.moods[player] = (previous & 0xcf) | 0x20; break;
    case 3: state.moods[player] = previous | 0x40; break;
    case 4: state.moods[player] = (previous & 0xcf) | 0x30; break;
  }
  return state.moods[player];
}

export const HP_BOOSTS_BCFC = Object.freeze([0, 0x14, 0x0f, 0x0a]);
/** 03:BCBA..BCFB complete function; the caller passes mood high bits in $1C.
 * Additional odd-slot +16 is gated by bit7 of $054A. All HP addition wraps,
 * unlike the separately saturated low-four-bit mood math.
 * Names HP/speed/skill are source annotations corroborated by the BC1F record
 * loading sequence; their exact in-match effects remain another subsystem.
 */
export function applyAttributeBoosts(attributes, slotIndex, flags1c, value054a) {
  integer(slotIndex, 0, 11, 'slotIndex'); byte(flags1c, 'flags1c'); byte(value054a, 'value054a');
  byte(attributes.hp04e4, 'hp04e4'); byte(attributes.speed04d7, 'speed04d7'); byte(attributes.skill04f1, 'skill04f1');
  if (value054a < 0x80 && (slotIndex & 1)) attributes.hp04e4 = (attributes.hp04e4 + 0x10) & 255;
  if (flags1c === 0) return attributes;
  if (flags1c & 0x80) attributes.speed04d7 |= 0x80;
  if (flags1c & 0x40) attributes.skill04f1 |= 1;
  attributes.hp04e4 = (attributes.hp04e4 + HP_BOOSTS_BCFC[(flags1c >>> 4) & 3]) & 255;
  return attributes;
}

export const PLAYER_TEXT_C0A0 = Object.freeze([
  Object.freeze([0xa9, 0xb7, 0xa6, 0xff, 0xff]),
  Object.freeze([0xc7, 0xc9, 0xb3, 0xb9, 0xff]),
  Object.freeze([0xac, 0x2d, 0xff, 0xff, 0xff]),
  Object.freeze([0xbf, 0xc9, 0x3b, 0xb1, 0xff]),
  Object.freeze([0xa3, 0xcd, 0xa7, 0x3e, 0xff]),
  Object.freeze([0x2a, 0xcf, 0xa5, 0xa3, 0xff]),
  Object.freeze([0xa4, 0x27, 0x2d, 0xcf, 0xff]),
  Object.freeze([0xa6, 0xb7, 0xb1, 0xaa, 0xff]),
  Object.freeze([0xa9, 0xc4, 0xcf, 0xff, 0xff]),
  Object.freeze([0xa7, 0xa3, 0x2e, 0xa8, 0xff]),
  Object.freeze([0xb3, 0xb9, 0xce, 0xff, 0xff]),
  Object.freeze([0xa7, 0xca, 0xcc, 0xae, 0xff]),
]);

export const OPTION_TEXT_ADC2 = Object.freeze([
  Object.freeze([0x90, 0xae, 0x6e, 0xe2, 0xad, 0xd2, 0xd9, 0x2e]),
  Object.freeze([0x91, 0xae, 0x6e, 0xe2, 0xac, 0x6f, 0xd9, 0xb1]),
  Object.freeze([0x92, 0xae, 0x6e, 0xe2, 0x35, 0xc9, 0xcf, 0xa9]),
  Object.freeze([0x93, 0x2b, 0xc2, 0xe2, 0xb6, 0x27, 0x29, 0xb3]),
  Object.freeze([0x94, 0xa6, 0xb7, 0xd2, 0xa4, 0xb1, 0xa6, 0xca]),
  Object.freeze([0x95, 0xc0, 0xca, 0xbc, 0xe2, 0x3c, 0x34, 0xa6]),
  Object.freeze([0x96, 0xa2, 0xa3, 0x35, 0xca, 0xe2, 0x3f, 0xcf]),
  Object.freeze([0x97, 0xb4, 0xd5, 0x34, 0xd5, 0xe2, 0x3e, 0xa2]),
  Object.freeze([0x98, 0xa2, 0xb7, 0xc3, 0xe2, 0x3c, 0x34, 0xa6]),
  Object.freeze([0x99, 0xa4, 0xc3, 0x3f, 0xad, 0xff, 0xff, 0xff]),
  Object.freeze([0x9a, 0xad, 0xd1, 0xaa, 0xba, 0xbc, 0xc4, 0xba]),
  Object.freeze([0x9b, 0xc1, 0xac, 0xab, 0xba, 0x02, 0xa2, 0xa3]),
]);

/** 0B:AF5F..AFBB complete persistent/text-buffer behavior, including B233/B24C.
 * Text is original encoded glyph data, not guessed Unicode translations.
 * state.text0611 is six bytes ($0611..$0616); text0617 is eight ($0617..$061E).
 * Written prefixes end with F8; bytes after the terminator retain old contents.
 * effectByte20 is the original caller's $20. This routine does NOT apply B009.
 */
export function preparePlayerOptionResponse(state, player, option, effectByte20) {
  validateMoods(state); playerIndex(player); integer(option, 0, 11, 'option'); byte(effectByte20, 'effectByte20');
  for (const [name, length] of [['text0611', 6], ['text0617', 8]]) {
    if (!state[name] || state[name].length !== length) throw new RangeError(`${name} must contain ${length} bytes`);
    for (const value of state[name]) byte(value, name);
  }
  let offset = 0;
  while (offset < 5 && PLAYER_TEXT_C0A0[player][offset] !== 0xff) {
    state.text0611[offset] = PLAYER_TEXT_C0A0[player][offset]; offset++;
  }
  state.text0611[offset] = 0xf8;
  offset = 0;
  while (offset < 7 && OPTION_TEXT_ADC2[option][offset + 1] !== 0xff) {
    state.text0617[offset] = OPTION_TEXT_ADC2[option][offset + 1]; offset++;
  }
  state.text0617[offset] = 0xf8;
  state.message0606 = 0x24 + (effectByte20 & 3);
  applyMenuBoostFlags(state, player, option);
  return state.message0606;
}

// Physical page 06:9FF3..9FFF continues into paired page 07:A000..A002.
export const COMMAND_MASKS_9FF3 = Object.freeze([
  0x0e, 0x01, 0x02, 0x04, 0, 0, 0, 0,
  0x09, 0x04, 0x02, 0x01, 0x01, 0x01, 0, 0x01,
]);
/** Complete 06:9E4A..9E93. Caller resolves RAM indexes exactly as follows:
 * behavior = RAM[$04FD + (RAM[$067A+X]&15)] (uses Y target)
 * packed0650 = RAM[$0650+X]; hp04e4 = RAM[$04E4+X] (uses X, NOT target Y).
 * Return value is A and scratch $1D, a four-command rejection bit mask.
 * No RNG or probabilistic substitute is used by the original routine.
 */
export function getCommandRejectionMask(mode0057, behaviorAtTarget, packed0650AtX, hp04e4AtX) {
  byte(mode0057,'mode0057'); byte(behaviorAtTarget,'behaviorAtTarget');
  byte(packed0650AtX,'packed0650AtX'); byte(hp04e4AtX,'hp04e4AtX');
  if ((mode0057 & 3) === 0) return 0;
  const adjustedMood = clampMood((packed0650AtX & 15) + (hp04e4AtX & 7) - 3);
  const index = ((behaviorAtTarget & 0xc0) >>> 4) | (adjustedMood >>> 2);
  return COMMAND_MASKS_9FF3[index];
}
/** Complete 06:9F31..9F52, operating on RAM[$0650+Y].
 * deltaByte is original scratch $2C, not a signed JS number. Preserve the ADC
 * modulo-256 BEFORE checking N, including unusual byte inputs outside +/-4.
 */
export function changeMatchMood(packed0650, deltaByte) {
  byte(packed0650,'packed0650'); byte(deltaByte,'deltaByte');
  const wrapped = ((packed0650 & 15) + deltaByte) & 255;
  const low = wrapped & 0x80 ? 0 : Math.min(15, wrapped);
  return (packed0650 & 0xf0) | low;
}

export const COMMAND_REQUEST_TEXT_9F53 = Object.freeze([0x06, 0x22, 0x08, 0x03, 0x15, 0x1c, 0x01, 0x06, 0x23, 0x33, 0x34, 0x06, 0x0e, 0x27, 0x33, 0x17, 0x07, 0x08, 0x16, 0x07, 0x00, 0x01, 0x03, 0x02, 0x12, 0x13, 0x17, 0x12, 0x0d, 0x11, 0x0e, 0x0d, 0x08, 0x0c, 0x2c, 0x07, 0x15, 0x02, 0x01, 0x07, 0x16, 0x17, 0x15, 0x12, 0x0d, 0x10, 0x0f, 0x15, 0x07, 0x08, 0x16, 0x0b, 0x00, 0x01, 0x03, 0x02, 0x12, 0x09, 0x11, 0x13, 0x0d, 0x10, 0x0f, 0x0e, 0x23, 0x21, 0x15, 0x06, 0x15, 0x17, 0x11, 0x03, 0x23, 0x33, 0x0e, 0x06, 0x0f, 0x2a, 0x31, 0x16, 0x07, 0x08, 0x16, 0x07, 0x04, 0x05, 0x07, 0x04, 0x12, 0x14, 0x17, 0x12, 0x11, 0x10, 0x0e, 0x11, 0x08, 0x0c, 0x2c, 0x07, 0x07, 0x05, 0x06, 0x15, 0x12, 0x16, 0x17, 0x12, 0x11, 0x0f, 0x2d, 0x15, 0x07, 0x08, 0x16, 0x0b, 0x04, 0x05, 0x17, 0x03, 0x02, 0x13, 0x08, 0x11, 0x10, 0x14, 0x0f, 0x0e]);

export const COMMAND_REPLY_TEXT_9FD3 = Object.freeze([0x21, 0x3c, 0x25, 0x23, 0x18, 0x18, 0x18, 0x22, 0x18, 0x1a, 0x31, 0x1c, 0x19, 0x1b, 0x39, 0x27, 0x1f, 0x1d, 0x23, 0x26, 0x21, 0x23, 0x24, 0x3b, 0x1f, 0x20, 0x2c, 0x26, 0x1d, 0x1e, 0x3a, 0x24]);

export const COMMAND_CALL_TEXT_A003 = Object.freeze([0x0b, 0x07, 0x09, 0x0a]);

export const COMMAND_DIRECTIONS_A007 = Object.freeze([0xff, 0x40, 0xc0, 0xff, 0x80, 0x60, 0xa0, 0xff, 0x00, 0x20, 0xe0, 0xff, 0xff, 0xff, 0xff, 0xff]);

function commandRam(r, side) {
  if (!(r instanceof Uint8Array) || r.length < 0x800) throw new TypeError('Expected original gameplay Uint8Array with 2048 bytes');
  integer(side, 0, 1, 'side');
}
function readCoordinate(r, low, high, slot) { return r[low + slot] | (r[high + slot] << 8); }

/** Fixed 0F:F564..F59A, direct shift/add multiplication with original EARLY
 * overflow exit. Prediction uses the partial result even when overflow occurs.
 * This is arithmetic, not instruction interpretation; no machine code is read.
 */
export function multiplyPredictionWords(multiplicand, multiplier) {
  integer(multiplicand,0,65535,'multiplicand');integer(multiplier,0,65535,'multiplier');
  let product=0;
  while(multiplicand!==0) {
    const add=multiplicand&1; multiplicand>>>=1;
    if(add) { const sum=product+multiplier; product=sum&65535; if(sum>65535)return {product,overflow:true}; }
    const doubled=multiplier*2; multiplier=doubled&65535;
    if(doubled>65535)return {product,overflow:true};
  }
  return {product,overflow:false};
}
/** 06:98D0..99B4 position prediction. Fractional velocity magnitude times timer
 * contributes ONLY the product high byte. Y timer halves when Z velocity is zero.
 */
export function predictCommandPosition(r,slot,timer) {
  commandRam(r,0);integer(slot,0,18,'slot');byte(timer,'timer');
  const axis=(lo,hi,vlo,vhi,frames)=>{
    const coordinate=readCoordinate(r,lo,hi,slot), velocity=readCoordinate(r,vlo,vhi,slot);
    if(velocity===0)return coordinate;
    const negative=!!(velocity&32768), magnitude=negative?(-velocity)&65535:velocity;
    const displacement=multiplyPredictionWords(magnitude,frames).product>>>8;
    return (coordinate+(negative?-displacement:displacement))&65535;
  };
  const yTimer=(r[0x420+slot]|r[0x42e+slot])===0?timer>>>1:timer;
  return {x:axis(0x314,0x327,0x3e8,0x3f6,timer),y:axis(0x34d,0x360,0x404,0x412,yTimer)};
}
/** Fixed 0F:FA6D..FAED: exact original capped approximate planar distance.
 * It is NOT Euclidean distance. -256 is mapped to FF; larger differences fail.
 */
export function commandDistance(r,origin,candidate) {
  commandRam(r,0);integer(origin,0,255,'origin');integer(candidate,0,255,'candidate');
  const component=(lo,hi)=>{
    const d=(readCoordinate(r,lo,hi,candidate)-readCoordinate(r,lo,hi,origin))&65535;
    if((d>>>8)===0)return d&255;
    if((d>>>8)===255)return (d&255)===0?255:(-d)&255;
    return null;
  };
  const x=component(0x314,0x327);if(x===null)return 255;
  const y=component(0x34d,0x360);if(y===null)return 255;
  const high=Math.max(x,y),low=Math.min(x,y);
  return Math.min(255,high+(high>>>(1+((high-low)>>>5))));
}
/** F9DE..FA6C specialization used by 9D86/9E03: candidates side..9 step2.
 * Original <= insertion means LATER equal-distance candidates precede earlier.
 * A bit0 state/height condition may then swap the closest two entries.
 */
export function rankCommandTargets(r,side,origin) {
  commandRam(r,side);integer(origin,0,18,'origin');
  const ranked=[];
  for(let slot=side;slot<=9;slot+=2) {
    const distance=commandDistance(r,origin,slot);
    let index=0;while(index<ranked.length&&ranked[index].distance<distance)index++;
    ranked.splice(index,0,{slot,distance});
  }
  const first=ranked[0].slot,second=ranked[1].slot;
  const zDifference=(readCoordinate(r,0x386,0x399,first)-readCoordinate(r,0x386,0x399,second))&65535;
  if((r[0x486+first]&1)&&(zDifference&32768)) [ranked[0],ranked[1]]=[ranked[1],ranked[0]];
  return ranked;
}
function commandTargetNearObject(r,side,origin) {
  const controlled=r[0x568+side]; // Original indexed RAM permits CPU sentinel FF; never replace it with a player.
  return commandDistance(r,controlled,origin)<0x40?side:rankCommandTargets(r,side,origin)[0].slot;
}
/** Full 06:9BE4 target-refresh portion through 9C50, with 9D86/9E03 dependencies.
 * Returns false when frame/input gating retains the old target.
 */
export function refreshCommandTarget(r,side) {
  commandRam(r,side);
  if(((side^r[0x300])&1)&&!(r[0x570+side]&0x60))return false;
  let candidate;
  if(r[0x492]&0x40) {
    const holder=r[0x4d6];integer(holder,0,11,'ball holder');
    if((side^holder)&1)candidate=commandTargetNearObject(r,side,holder);
    else candidate=holder>=10&&!(r[0x67c+holder]&128)?15:holder;
  } else {
    const oldX=readCoordinate(r,0x314,0x327,12),oldY=readCoordinate(r,0x34d,0x360,12);
    if(r[0x524]!==0) {
      const predicted=predictCommandPosition(r,12,r[0x524]);
      r[0x320]=predicted.x&255;r[0x333]=predicted.x>>>8;r[0x359]=predicted.y&255;r[0x36c]=predicted.y>>>8;
    }
    try {candidate=commandTargetNearObject(r,side,12);}
    finally {r[0x320]=oldX&255;r[0x333]=oldX>>>8;r[0x359]=oldY&255;r[0x36c]=oldY>>>8;}
  }
  if(candidate!==15) {
    if(!(r[0x650+candidate]&128)||((r[0x57]&240)===0&&candidate<2)||((r[0x52c+side]&128)&&candidate===1))candidate=15;
  }
  r[0x67a+side]=((r[0x67a+side]<<4)|candidate)&255;
  return true;
}
function setCommandRequestText(r,side,command,target) {
  const controlled=r[0x568+side]; // Original indexed RAM permits CPU sentinel FF; never replace it with a player.
  const trait=r[0x4fd+controlled]&0xc0;
  if(command===0&&r[0x67c+side]===255)r[0x680+side]=COMMAND_CALL_TEXT_A003[trait>>>6]|128;
  else {
    const nearHalf=side===1?r[0x327+target]>=2:r[0x327+target]<2;
    const index=(r[0x45]&3)|(command<<2)|(trait>>>2)|(nearHalf?64:0);
    r[0x680+side]=COMMAND_REQUEST_TEXT_9F53[index]|128;
  }
}
function setCommandReplyText(r,side,target,rejected) {
  const index=((r[0x4fd+target]&0xc0)>>>4)|(r[0x46]&3)|(rejected?16:0);
  r[0x682+side]=COMMAND_REPLY_TEXT_9FD3[index]|128;
}
/** Full 06:9CB4..9D85 receiving a numeric command 0..3, closing 9E94,9E4A,
 * 9F02,9F09,9F31. Side effects update original RAM. Sound is an explicit
 * original sound-ID platform event; no invented audio is synthesized here.
 */
export function issueTeammateCommand(r,side,command) {
  commandRam(r,side);integer(command,0,3,'command');
  const target=r[0x67a+side]&15;integer(target,0,11,'command target');
  if(r[0x678+side]===command)r[0x650+target]=changeMatchMood(r[0x650+target],254);
  if(command===1)r[0x650+target]=changeMatchMood(r[0x650+target],2);
  setCommandRequestText(r,side,command,target);
  const mask=getCommandRejectionMask(r[0x57],r[0x4fd+target],r[0x650+side],r[0x4e4+side]);
  const rejected=!!(mask&(1<<command));
  setCommandReplyText(r,side,target,rejected);
  if(!rejected) {
    r[0x678+side]=command;
    if(command===0&&r[0x67c+side]===255) {
      if(r[0x327+target]===[3,0][side])r[0x650+target]=changeMatchMood(r[0x650+target],252);
      r[0x67e+side]=r[0x568+side]|16;
    } else r[0x67e+side]=r[0x67c+side];
  }
  return {side,target,command,accepted:!rejected,events:[{type:'sound',soundId:rejected?0x34:0x33,source:'06:9CB4/C002'}]};
}
/** 06:9C53..9CB3 input gateway, after target refresh. The RAM0570 fields are
 * already processed gameplay buttons, NOT raw NES controller bit masks.
 */
export function processTeammateCommandInput(r,side) {
  commandRam(r,side);const target=r[0x67a+side]&15,buttons=r[0x570+side];
  if(target===15||(buttons&128)||!(buttons&0x60))return null;
  r[0x67c+side]=COMMAND_DIRECTIONS_A007[r[0x04+side]&15];
  const opponentHolding=!!((r[0x492]&0x40)&&((side^r[0x4d6])&1));
  const command=(buttons&0x40?0:1)+(opponentHolding?2:0);
  return issueTeammateCommand(r,side,command);
}
/** 06:9BD2..9BE3 full two-side command acquisition frame gate. */
export function updateTeammateCommands(r) {
  commandRam(r,0);const results=[];if(r[0x59]!==2)return results;
  for(let side=0;side<2;side++){refreshCommandTarget(r,side);const result=processTeammateCommandInput(r,side);if(result)results.push(result);}
  return results;
}
/** Full 07:A022..A105 consumer. Commands become original bot state $065C;
 * this function does not substitute its own action physics for those states.
 * A034 intentionally reads $0686 without indexing, just like the original.
 */
export function applyTeammateCommand(r,side) {
  commandRam(r,side);
  if((r[0x492]&64)&&r[0x4d6]>=10&&!(r[0x686]&128))r[0x678+side]=255;
  const command=r[0x678+side];if(command===255)return null;
  integer(command,0,3,'stored command');const target=r[0x67a+side]&15; // A075/A096 retain nibble15: pending command may outlive target refresh.
  const held=!!(r[0x492]&64);
  if(command<2) {
    if(held&&target!==r[0x4d6]){r[0x678+side]=255;return null;}
    r[0x65c+target]=command===0?(held?2:6):(held?0x23:0x25);
    if(command===1)r[0x668+target]=(r[0x668+target]&240)|1;
  } else {
    if(!held||!((side^r[0x4d6])&1)){r[0x678+side]=255;return null;}
    r[0x65c+target]=command===2?8:9;
  }
  return {target,botState:r[0x65c+target]};
}
/** 07:A017..A021, once per two-side command-consumption pass. */
export function applyBothTeammateCommands(r) {commandRam(r,0);return [applyTeammateCommand(r,0),applyTeammateCommand(r,1)];}
