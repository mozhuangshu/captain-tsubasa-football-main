/** Conservative, text-source-backed partner choreography.
 * The ledger observes native launches and resolved collisions. Its one action
 * adapter may request a normal kick for Sano after an accepted native teammate
 * shooting command. It never writes ball state, schedules a pass, teleports a
 * player or changes possession. A roster entry alone is never a partnership.
 */
import {getPlayerIdentity} from './tsubasa-teams.js';

const sessions = new WeakMap();
const word = (r, lo, hi) => r[lo] | r[hi] << 8;
const signed = value => value & 32768 ? value - 65536 : value;
const position = (r, slot = 12) => ({
  x: signed(word(r, 0x314 + slot, 0x327 + slot)) + r[0x301 + slot] / 256,
  y: signed(word(r, 0x34d + slot, 0x360 + slot)) + r[0x33a + slot] / 256,
  z: signed(word(r, 0x386 + slot, 0x399 + slot)) + r[0x373 + slot] / 256,
});
const velocity = (r, slot = 12) => ({
  x: signed(word(r, 0x3e8 + slot, 0x3f6 + slot)) / 256,
  y: signed(word(r, 0x404 + slot, 0x412 + slot)) / 256,
  z: signed(word(r, 0x420 + slot, 0x42e + slot)) / 256,
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clone = value => value == null ? value : structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const inMatch = r => !r[0x58] && (r[0x59] & 127) === 2 && !(r[0x5c] & 0x4e);
const actor = (r, slot) => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 12) return null;
  // Actual field slots matter. A canonical field player used as a keeper cannot
  // participate in either of these field combinations.
  if (slot >= 10 && !(r[0x67c + slot] & 128)) return null;
  try {
    const identity = getPlayerIdentity(r[0x52c + (slot & 1)] & 15, r[0x532 + slot], 'field');
    return {slot, characterId: identity.characterId, teamId: identity.teamId};
  } catch { return null; }
};
const sameActor = (r, saved) => {
  const current = saved && actor(r, saved.slot);
  return !!current && current.characterId === saved.characterId && current.teamId === saved.teamId;
};
const sameTeam = (a, b) => a && b && a.slot !== b.slot && !((a.slot ^ b.slot) & 1) && a.teamId === b.teamId;
const pairIs = (a, b, first, second) => sameTeam(a, b) &&
  ((a.characterId === first && b.characterId === second) || (a.characterId === second && b.characterId === first));
const nearBall = (r, slot, ball = position(r)) => {
  const p = position(r, slot);
  return !!r[0xd9 + slot] && !!r[0xe5] && distance(p, ball) <= 36 && Math.abs(p.z - ball.z) <= 68;
};
function stamp(r, state) {
  // Called every gameplay tick as well as at hooks, so 8-bit wraps cannot revive
  // a stale chain. Repeated observers in a single tick do not advance the clock.
  const frame = r[0x300];
  state.tick += (frame - state.frame) & 255;
  state.frame = frame;
  return state.tick;
}
function emit(r, state, type, details) {
  state.events.push({type, frame: r[0x300], tick: state.tick, ...clone(details)});
}
function clearChain(r, state, key, reason) {
  const chain = state[key];
  if (!chain) return;
  emit(r, state, 'tsubasa-partner-end', {moveId: chain.moveId, reason});
  state[key] = null;
}

export function enableTsubasaPartnerChains(r, {enabled = true} = {}) {
  if (!(r instanceof Uint8Array) || r.length < 2048) throw new TypeError('Gameplay RAM required');
  if (!enabled) { sessions.delete(r); return false; }
  if (!sessions.has(r)) sessions.set(r, {frame: r[0x300], tick: 0, jito: null, eiffel: null, redirect: null, events: []});
  return true;
}
export function resetTsubasaPartnerChains(r) {
  const state = sessions.get(r);
  if (!state) return;
  state.frame = r[0x300]; state.tick = 0;
  state.jito = state.eiffel = state.redirect = null;
  state.events.length = 0;
}
export function syncTsubasaPartnerChains(r) {
  const state = sessions.get(r);
  if (!state) return;
  if (r[0x5c] & 128) { state.frame = r[0x300]; return; }
  const now = stamp(r, state);
  if (!inMatch(r)) {
    clearChain(r, state, 'jito', 'out-of-play');
    clearChain(r, state, 'eiffel', 'out-of-play');
    state.redirect = null;
    return;
  }
  if (state.jito && (now - state.jito.launchedAt > 110 || !sameActor(r, state.jito.from))) clearChain(r, state, 'jito', 'expired-or-roster-change');
  if (state.redirect && (now - state.redirect.touchedAt > 2 || r[0x4d6] !== state.redirect.owner || !sameActor(r, state.redirect.receiver))) state.redirect = null;
  const e = state.eiffel;
  if (e && (now - e.startedAt > 630 || now - e.updatedAt > (e.pending ? 180 : 120) || e.actors.some(a => !sameActor(r, a)))) clearChain(r, state, 'eiffel', 'expired-or-roster-change');
}

/** Called after the original selector/choice, before shot initialization. */
export function noteTsubasaPartnerShot(r, sourceSpecialId) {
  const state = sessions.get(r);
  if (!state) return;
  syncTsubasaPartnerChains(r);
  if (!inMatch(r) || r[0x5c] & 128) return;
  const from = actor(r, r[0x4d6]);
  clearChain(r, state, 'eiffel', 'shot-ended-passing');
  clearChain(r, state, 'jito', 'new-shot');
  state.redirect = null;
  if (from?.characterId !== 'jito' || (r[0x465] & 127) !== 5 || !nearBall(r, from.slot)) return;
  state.jito = {moveId: 'jito-sano-combination', from, launchedAt: state.tick, origin: position(r), launchFacing: r[0x4a3 + 12] & 128, sourceSpecialId};
  emit(r, state, 'tsubasa-partner-launch', {moveId: state.jito.moveId, from, origin: state.jito.origin, sourceSpecialId});
}

/** Called after native launchPass selects its actual target and sets velocity. */
export function noteTsubasaPartnerPass(r, {target} = {}) {
  const state = sessions.get(r);
  if (!state) return;
  syncTsubasaPartnerChains(r);
  if (!inMatch(r) || r[0x5c] & 128) return;
  clearChain(r, state, 'jito', 'pass-ended-shot');
  state.redirect = null;
  const from = actor(r, r[0x4d6]), to = actor(r, target);
  if (!pairIs(from, to, 'pierre', 'napoleon') || (r[0x465] & 127) !== 4 || !nearBall(r, from.slot)) {
    clearChain(r, state, 'eiffel', 'unrelated-pass'); return;
  }
  const origin = position(r), targetPosition = position(r, target), range = distance(origin, targetPosition);
  // Adaptation distances, not anime measurements. The native pass itself is
  // untouched. Real received short -> medium -> long legs are required.
  if (range < 16 || range > 384) { clearChain(r, state, 'eiffel', 'pass-distance'); return; }
  let chain = state.eiffel;
  const next = chain?.legs.length ?? 0;
  const continuation = chain && !chain.complete && !chain.pending && chain.holder === from.slot &&
    chain.legs.at(-1)?.from.slot === target && next < 3 &&
    range >= chain.legs.at(-1).range + 16 && (next !== 2 || range >= 96);
  if (!continuation) {
    clearChain(r, state, 'eiffel', 'new-passing-sequence');
    if (range > 112) return;
    chain = state.eiffel = {moveId: 'eiffel-attack', actors: [from, to], startedAt: state.tick,
      updatedAt: state.tick, holder: from.slot, legs: [], pending: null, complete: false};
  }
  chain.updatedAt = state.tick;
  chain.pending = {from, to, origin, targetPosition, range, launchedAt: state.tick, velocity: velocity(r)};
  emit(r, state, 'tsubasa-partner-pass', {moveId: chain.moveId, leg: chain.legs.length + 1, ...chain.pending});
}

/** Only the original resolved-contact path may call this observer. It cannot
 * turn a near miss, an unsuccessful block, or a selected recipient into a touch.
 */
export function recordTsubasaPartnerContact(r, slot, before) {
  const state = sessions.get(r);
  if (!state || !before) return;
  syncTsubasaPartnerChains(r);
  if (!inMatch(r) || r[0x5c] & 128) return;
  const receiver = actor(r, slot), resultAction = r[0x465] & 127;
  const acquired = before.owner !== slot && r[0x4d6] === slot;
  const ball = before.position;
  const validTouch = receiver && ball && nearBall(r, slot, ball) && acquired && !before.held;
  const j = state.jito;
  if (j && slot !== j.from.slot) {
    const normalizedX = j.launchFacing ? 1023 - ball.x : ball.x;
    const range = distance(j.origin, ball);
    const eligible = validTouch && receiver.characterId === 'sano' && sameTeam(j.from, receiver) &&
      sameActor(r, j.from) && before.owner === j.from.slot && before.source === 'jito' &&
      before.action === 5 && resultAction === 5 && state.tick - j.launchedAt <= 110 &&
      range >= 96 && normalizedX >= 656 && normalizedX <= 1008 && ball.y >= 112 && ball.y <= 272;
    if (eligible) {
      state.redirect = {moveId: j.moveId, preserveNativePhysics: true, owner: slot, receiver, partners: [j.from], touchedAt: state.tick,
        origin: {...ball}, incomingVelocity: clone(before.velocity ?? velocity(r)), firstOrigin: j.origin,
        firstSourceSpecialId: j.sourceSpecialId, range};
      emit(r, state, 'tsubasa-partner-touch', {moveId: j.moveId, slot, characterId: 'sano', from: j.from,
        position: ball, incomingVelocity: state.redirect.incomingVelocity, range, resultAction});
    }
    clearChain(r, state, 'jito', eligible ? 'real-second-touch' : 'interrupted-contact');
  }
  const e = state.eiffel;
  if (!e) return;
  const leg = e.pending;
  if (!leg) {
    if (slot !== e.holder) clearChain(r, state, 'eiffel', 'interrupted-contact');
    return;
  }
  if (slot === leg.from.slot) return;
  const traveled = ball ? distance(leg.origin, ball) : 0;
  const accepted = validTouch && slot === leg.to.slot && before.owner === leg.from.slot &&
    [4, 6, 7, 8].includes(before.action) && [3, 4, 5, 9, 10, 12, 15, 18, 21].includes(resultAction) &&
    sameActor(r, leg.from) && sameActor(r, leg.to) && state.tick - leg.launchedAt <= 180 && traveled >= 12;
  if (!accepted) { clearChain(r, state, 'eiffel', 'interrupted-contact'); return; }
  const completed = {...leg, touchedAt: state.tick, contactPosition: {...ball}, traveled, resultAction};
  e.legs.push(completed); e.pending = null; e.holder = slot; e.updatedAt = state.tick;
  e.complete = e.legs.length === 3;
  emit(r, state, 'tsubasa-partner-touch', {moveId: e.moveId, leg: e.legs.length, slot,
    characterId: receiver.characterId, position: ball, traveled, range: leg.range, resultAction});
  if (e.complete) emit(r, state, 'tsubasa-partner-complete', {moveId: e.moveId,
    partners: e.actors, holder: e.holder, legs: e.legs});
}

/** Consume once, during the native shot selector after a successful direct
 * second contact. Caller retains native shot eligibility, power and timing. */
export function consumeTsubasaPartnerShot(r, slot) {
  const state = sessions.get(r);
  if (!state) return null;
  syncTsubasaPartnerChains(r);
  const redirect = state.redirect;
  if (r[0x5c] & 128 || !redirect || redirect.owner !== slot || (r[0x465] & 127) !== 5) return null;
  state.redirect = null;
  const out = clone(redirect);
  emit(r, state, 'tsubasa-partner-complete', {moveId: out.moveId, owner: slot, position: out.origin,
    incomingVelocity: out.incomingVelocity, partners: out.partners, range: out.range});
  return out;
}

/** Pure snapshots: reading/rendering cannot advance clocks or change the ball. */
export function getTsubasaPartnerState(r) {
  const state = sessions.get(r);
  if (!state || !inMatch(r)) return null;
  const e = state.eiffel;
  if (e) return freeze({moveId: e.moveId, phase: e.complete ? 'complete' : e.pending ? 'in-flight' : 'received',
    clock: state.tick, completedAge: e.complete ? state.tick - e.legs.at(-1).touchedAt : null, age: state.tick - e.startedAt, owner: r[0x4d6], partners: clone(e.actors),
    completedLegs: e.legs.length, legs: clone(e.legs), pending: clone(e.pending),
    position: position(r), velocity: velocity(r), ballEntity: 12,
    evidence: 'official-animation-synopsis; conservative-adaptation-not-frame-exact'});
  const j = state.redirect ?? state.jito;
  if (!j) return null;
  return freeze({moveId: j.moveId, phase: state.redirect ? 'second-contact' : 'first-shot',
    owner: r[0x4d6], origin: clone(j.origin), position: position(r), velocity: velocity(r),
    partners: clone(j.partners ?? [j.from]), ballEntity: 12,
    evidence: 'production-committee-animation-recap; conservative-adaptation-not-frame-exact'});
}
export function drainTsubasaPartnerEvents(r) {
  const state = sessions.get(r);
  return state ? state.events.splice(0) : [];
}

/** Single-controller reception assist, bounded by a real accepted teammate
 * command. Native action admission, animation and collision remain authoritative.
 * The only writes are an ordinary player action request and the command's own
 * existing aim value; no ball, position, speed, power or possession writes. */
export function prepareTsubasaPartnerActions(r) {
  const state = sessions.get(r);
  if (!state) return null;
  syncTsubasaPartnerChains(r);
  const j = state.jito;
  if (!j || !inMatch(r) || r[0x5c] & 128 || (r[0x465] & 127) !== 5 ||
      r[0x4d6] !== j.from.slot || r[0x510] || r[0x492] & 64) return null;
  const side = j.from.slot & 1, slot = r[0x67a + side] & 15, receiver = actor(r, slot);
  if (r[0x678 + side] !== 1 || receiver?.characterId !== 'sano' || !sameTeam(j.from, receiver) ||
      !sameActor(r, j.from) || !(r[0x650 + slot] & 128) || !r[0xd9 + slot] ||
      !r[0x4e4 + slot] || (r[0x486 + slot] & 0xb1)) return null;
  const current = r[0x459 + slot] & 127, requested = r[0x479 + slot];
  if (![1, 0x20, 0x21].includes(current) || ![255, 1, 0x20, 0x21].includes(requested)) return null;
  const p = position(r, slot), ball = position(r), v = velocity(r);
  const normalizedX = j.launchFacing ? 1023 - p.x : p.x;
  if (normalizedX < 656 || normalizedX > 1008 || p.y < 112 || p.y > 272 ||
      ball.z < 0 || ball.z > 24 || p.z !== 0) return null;
  const speed2 = v.x * v.x + v.y * v.y;
  if (speed2 < 1) return null;
  const eta = ((p.x - ball.x) * v.x + (p.y - ball.y) * v.y) / speed2;
  if (eta < 0 || eta > 8 || Math.hypot(p.x - ball.x - eta * v.x, p.y - ball.y - eta * v.y) > 12) return null;
  r[0x479 + slot] = 7;
  r[0x4b0 + slot] = r[0x67c + side];
  const setup = {moveId: j.moveId, slot, characterId: 'sano', nativeCommand: 1, nativeAction: 7,
    position: p, ballPosition: ball, incomingVelocity: v, eta};
  emit(r, state, 'tsubasa-partner-setup', setup);
  return freeze(clone(setup));
}
