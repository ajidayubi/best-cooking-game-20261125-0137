// A small seeded random generator (mulberry32), so ?seed=N always plays the
// same orders. The world takes one of these at boot and never touches
// Math.random, which keeps replays and screenshots deterministic.

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one of `items` with the seeded generator. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
