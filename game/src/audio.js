// Tiny WebAudio blips: pick, chop, sizzle, ding, burn and expire. Everything
// is guarded: a browser with no AudioContext (or a muted game) simply stays
// silent and the game never breaks.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, seconds, kind, when = 0, gain = 0.08) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = kind;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, ctx.currentTime + when);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pick() {
      tone(660, 0.06, 'sine');
    },
    chop() {
      tone(220, 0.05, 'square', 0, 0.05);
      tone(220, 0.05, 'square', 0.09, 0.05);
      tone(220, 0.05, 'square', 0.18, 0.05);
    },
    sizzle() {
      tone(180, 0.25, 'sawtooth', 0, 0.04);
    },
    ding() {
      tone(880, 0.12, 'sine');
      tone(1318, 0.2, 'sine', 0.1);
    },
    burn() {
      tone(110, 0.3, 'sawtooth', 0, 0.06);
    },
    expire() {
      tone(392, 0.15, 'sine');
      tone(311, 0.2, 'sine', 0.14);
    },
    wrong() {
      tone(140, 0.12, 'square', 0, 0.05);
    },
  };
}
