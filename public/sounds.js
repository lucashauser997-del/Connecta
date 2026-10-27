// Connecta – Soundboard & Benachrichtigungstöne
// Alle Sounds werden live im Browser erzeugt (Web Audio) – keine Dateien, keine Lizenzprobleme.
(function () {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const noiseBuf = (c, dur) => {
    const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  function tone(c, out, { type = 'sine', f, f2, t, dur, vol = 0.3, a = 0.01, glide = 'exp' }) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) glide === 'lin' ? o.frequency.linearRampToValueAtTime(f2, t + dur) : o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(c, out, { t, dur, vol = 0.3, type = 'highpass', freq = 1000, freq2, a = 0.003, q = 1 }) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf(c, dur + 0.05);
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t); s.stop(t + dur + 0.05);
  }
  const lowpass = (c, out, freq) => { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.connect(out); return f; };

  const SOUNDS = [
    { key: 'airhorn', emoji: '📯', name: 'Airhorn', play(c, out, t) {
      const lp = lowpass(c, out, 3200);
      [0, 0.26, 0.52].forEach((dt, i) => [415, 523, 622, 830].forEach((f) => tone(c, lp, { type: 'sawtooth', f, f2: f * 0.985, t: t + dt, dur: i === 2 ? 0.9 : 0.2, vol: 0.09, a: 0.015 })));
    } },
    { key: 'badumtss', emoji: '🥁', name: 'Ba Dum Tss', play(c, out, t) {
      tone(c, out, { f: 190, f2: 60, t, dur: 0.2, vol: 0.8, a: 0.003 });
      tone(c, out, { f: 150, f2: 50, t: t + 0.2, dur: 0.22, vol: 0.8, a: 0.003 });
      noise(c, out, { t: t + 0.44, dur: 1.3, vol: 0.4, type: 'highpass', freq: 6500 });
    } },
    { key: 'applause', emoji: '👏', name: 'Applaus', play(c, out, t) {
      for (let i = 0; i < 110; i++) noise(c, out, { t: t + Math.random() * 2.4 * Math.sqrt(Math.random()), dur: 0.05 + Math.random() * 0.04, vol: 0.12 + Math.random() * 0.25, type: 'bandpass', freq: 900 + Math.random() * 2200, q: 0.8 });
    } },
    { key: 'trombone', emoji: '🎺', name: 'Sad Trombone', play(c, out, t) {
      const lp = lowpass(c, out, 1400);
      [[392, 0.42], [370, 0.42], [349, 0.42], [330, 1.4]].forEach(([f, d], i) => {
        const o = tone(c, lp, { type: 'sawtooth', f, f2: f * 0.96, t: t + i * 0.47, dur: d, vol: 0.2, a: 0.04 });
        if (i === 3) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = 9; l.connect(lg).connect(o.frequency); l.start(t + i * 0.47 + 0.3); l.stop(t + i * 0.47 + d); }
      });
    } },
    { key: 'tada', emoji: '🎉', name: 'Tada!', play(c, out, t) {
      [523, 659, 784, 1047].forEach((f, i) => tone(c, out, { type: 'triangle', f, t: t + i * 0.08, dur: 0.35, vol: 0.22 }));
      [523, 659, 784, 1047].forEach((f) => tone(c, out, { type: 'square', f, t: t + 0.42, dur: 1.1, vol: 0.045, a: 0.02 }));
      noise(c, out, { t: t + 0.42, dur: 0.9, vol: 0.1, type: 'highpass', freq: 8000 });
    } },
    { key: 'crickets', emoji: '🦗', name: 'Grillen', play(c, out, t) {
      for (let k = 0; k < 7; k++) for (let j = 0; j < 4; j++) tone(c, out, { f: 4400 + (k % 2) * 300, t: t + k * 0.36 + j * 0.045, dur: 0.035, vol: 0.12, a: 0.004 });
    } },
    { key: 'ding', emoji: '🔔', name: 'Ding', play(c, out, t) {
      tone(c, out, { f: 1318, t, dur: 1.8, vol: 0.35, a: 0.004 });
      tone(c, out, { f: 2636, t, dur: 0.9, vol: 0.1, a: 0.004 });
      tone(c, out, { f: 3954, t, dur: 0.4, vol: 0.05, a: 0.004 });
    } },
    { key: 'laser', emoji: '🔫', name: 'Pew Pew', play(c, out, t) {
      [0, 0.17, 0.34].forEach((dt) => tone(c, out, { type: 'square', f: 1900, f2: 110, t: t + dt, dur: 0.15, vol: 0.12, a: 0.003 }));
    } },
    { key: 'boing', emoji: '🌀', name: 'Boing', play(c, out, t) {
      const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.frequency.setValueAtTime(320, t); o.frequency.linearRampToValueAtTime(200, t + 0.8);
      l.frequency.value = 13; lg.gain.setValueAtTime(160, t); lg.gain.exponentialRampToValueAtTime(2, t + 0.8);
      l.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      o.connect(g).connect(out);
      [o, l].forEach((x) => { x.start(t); x.stop(t + 0.9); });
    } },
    { key: 'drama', emoji: '😱', name: 'Dun Dun Duuun', play(c, out, t) {
      const lp = lowpass(c, out, 1100);
      [[294, 0.22, 0], [294, 0.22, 0.32], [247, 1.6, 0.64]].forEach(([f, d, dt]) => [f, f / 2, f * 1.5].forEach((ff, i) => tone(c, lp, { type: 'sawtooth', f: ff, t: t + dt, dur: d, vol: i ? 0.08 : 0.16, a: 0.02 })));
    } },
    { key: 'boom', emoji: '💥', name: 'Explosion', play(c, out, t) {
      noise(c, out, { t, dur: 2, vol: 0.9, type: 'lowpass', freq: 1200, freq2: 80, a: 0.004 });
      tone(c, out, { f: 90, f2: 28, t, dur: 1.2, vol: 0.7, a: 0.004 });
    } },
    { key: 'honk', emoji: '🤡', name: 'Clown Hupe', play(c, out, t) {
      [0, 0.32].forEach((dt) => [300, 307, 450].forEach((f) => tone(c, out, { type: 'square', f, f2: f * 1.05, t: t + dt, dur: 0.24, vol: 0.06, a: 0.01 })));
    } },
  ];

  // Spielt einen eingebauten Sound (key) oder einen eigenen Sound (media-ID)
  function playSound(sound, volume = 0.7) {
    if (sound.media) {
      const a = new Audio('/media/' + encodeURIComponent(sound.media));
      a.volume = Math.max(0, Math.min(1, volume));
      a.play().catch(() => {});
      return;
    }
    const s = SOUNDS.find((x) => x.key === sound.key);
    if (!s) return;
    const c = getCtx();
    const g = c.createGain();
    g.gain.value = volume;
    g.connect(c.destination);
    s.play(c, g, c.currentTime + 0.02);
  }

  // Kurzer Ton für neue Nachrichten / Erwähnungen
  function ping(mention) {
    try {
      const c = getCtx(), t = c.currentTime + 0.01, g = c.createGain();
      g.gain.value = 0.6; g.connect(c.destination);
      if (mention) [880, 1175, 1568].forEach((f, i) => tone(c, g, { f, t: t + i * 0.09, dur: 0.28, vol: 0.18, a: 0.005 }));
      else { tone(c, g, { f: 988, t, dur: 0.18, vol: 0.16, a: 0.005 }); tone(c, g, { f: 1319, t: t + 0.08, dur: 0.3, vol: 0.16, a: 0.005 }); }
    } catch {}
  }

  // Klingelton für Anrufe
  let ringI = null;
  function ring(on) {
    clearInterval(ringI); ringI = null;
    if (!on) return;
    const beep = () => { try { const c = getCtx(), t = c.currentTime; [0, 0.25].forEach((dt) => tone(c, c.destination, { f: 680, t: t + dt, dur: 0.22, vol: 0.12, a: 0.01 })); } catch {} };
    beep(); ringI = setInterval(beep, 1800);
  }

  window.Sounds = { SOUNDS, playSound, ping, ring, unlock: getCtx };
})();
