// Yumurta Evrimi · alçak sesli efektler (Web Audio ile üretilir, ses dosyası yok)
let ac = null, master = null, noiseBuf = null;

// tarayıcılar sesi ancak ilk dokunuştan sonra açar
export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.16;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ac = null; }
}

function env(g, t, dur, vol) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(freq, dur, { type = 'sine', to = null, at = 0, vol = 1 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, dur, vol);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { at = 0, vol = 0.5, freq = 400 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf;
  f.type = 'lowpass'; f.frequency.value = freq;
  env(g, t, dur, vol);
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + dur + 0.02);
}

let lastSpecies = 0;
export const sfx = {
  tap: () => tone(520, 0.05, { type: 'triangle', vol: 0.35 }),
  start: () => tone(392, 0.16, { to: 784, type: 'triangle', vol: 0.5 }),
  drop: () => { tone(180, 0.18, { to: 70, vol: 0.9 }); noise(0.08, { vol: 0.2, freq: 1200 }); },
  warn: () => { tone(880, 0.08, { type: 'square', vol: 0.18 }); tone(880, 0.08, { type: 'square', vol: 0.18, at: 0.15 }); },
  disaster: () => { noise(0.7, { vol: 0.55, freq: 300 }); tone(110, 0.6, { to: 60, type: 'sawtooth', vol: 0.18 }); },
  survived: () => [523, 659, 784].forEach((f, i) => tone(f, 0.18, { type: 'triangle', at: i * 0.09, vol: 0.5 })),
  species: () => {
    const now = performance.now();
    if (now - lastSpecies < 1200) return;   // art arda türlerde tekrarlamasın
    lastSpecies = now;
    tone(600, 0.12, { to: 1100, vol: 0.3 });
  },
  caught: () => { tone(1200, 0.05, { type: 'square', vol: 0.22 }); noise(0.06, { vol: 0.25, freq: 3000 }); },
  upgrade: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.22, { at: i * 0.07, vol: 0.4 })),
  over: () => [440, 349, 262].forEach((f, i) => tone(f, 0.35, { type: 'triangle', at: i * 0.22, vol: 0.5 })),
};
