// Yumurta Evrimi · toplu bot testi
// Kullanım: node tools/bot_test.mjs [tohumSayısı=6] [sınırSn=2400] [tarzlar=hepsi]
// Örnek:    node tools/bot_test.mjs 4 1800 akilli-buyume,pasif-rastgele
import { Sim, CARDS, DISASTERS, UPGRADES, replay } from '../js/sim.js';

const SEEDS = +process.argv[2] || 6;
const LIMIT = +process.argv[3] || 2400;
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;

const PREFS = {
  buyume: ['bereket', 'toprak', 'dogurgan', 'omur', 'puan', 'kalici', 'genis', 'cep', 'evrim'],
  savunma: ['genis', 'kalici', 'puan', 'cep', 'omur', 'evrim', 'bereket', 'dogurgan', 'toprak'],
  rastgele: null,
};

// en kalabalık noktayı örnekleyerek bul
function densest(s, rng) {
  let best = [0, 0], bn = -1;
  const N = s.eggs.length, stride = Math.max(1, Math.floor(N / 400));
  for (let i = 0; i < 24 && N; i++) {
    const e = s.eggs[Math.floor(rng() * N)];
    let n = 0;
    for (let j = 0; j < N; j += stride) {
      const o = s.eggs[j];
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 140 * 140) n++;
    }
    if (n > bn) { bn = n; best = [e.x, e.y]; }
  }
  return best;
}

function run(seed, play, prefName) {
  const s = new Sim(seed, { team: seed % 2 ? 'Patlak' : 'Çatlak' });
  let r = seed * 7919 + 1;
  const rng = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const pref = PREFS[prefName];
  let capped = 0, ev = 0, cause = 'zaman doldu', lastPeakT = 0;
  const popAt = {};
  const covered = (card, minLeft) => s.zones.some((z) => z.type === card && z.until - s.t > minLeft);

  while (!s.over && s.t < LIMIT) {
    if (s.offer) {
      const pick = pref ? pref.find((k) => s.offer.includes(k)) || s.offer[0] : s.offer[Math.floor(rng() * s.offer.length)];
      s.choose(pick);
    }
    if (s.stepCount % 10 === 0 && play !== 'pasif') {
      let types = null;
      if (s.active) types = s.active.types;
      else if (play === 'akilli' && s.next && s.next.warned && s.next.start - s.t < 2) types = s.next.types;
      if (types) {
        for (const t of types) {
          const card = DISASTERS[t].card;
          const need = play === 'akilli' ? !covered(card, s.active ? 2 : 25) : !covered(card, 0);
          if (need && s.dp >= s.cardCost(card)) s.play(card, ...densest(s, rng));
        }
      }
    }
    s.step();
    if (s.dp >= s.mods.dpMax) capped += s.cfg.dt;
    for (const m of [300, 600, 900, 1200, 1800]) if (s.t >= m && popAt[m] === undefined) popAt[m] = s.eggs.length;
    while (ev < s.events.length) {
      const e = s.events[ev++];
      if (e.type === 'over') cause = s.active ? s.active.types.join('+') : 'sakin dönem';
    }
  }
  return {
    seed, play, pref: prefName, t: Math.round(s.t), score: s.maxGen, peak: s.peakPop, evo: s.namedCount() - 1,
    disasters: s.dzi, cause, capped: Math.round(capped), cards: s.actions.filter((a) => a.c !== 'up').length,
    ups: s.ups, popAt, actions: s.actions, team: s.cfg.team, steps: s.stepCount,
  };
}

const styles = [];
for (const play of ['pasif', 'telasli', 'akilli']) for (const pref of Object.keys(PREFS)) styles.push(`${play}-${pref}`);
const results = [];
const t0 = Date.now();
for (const st of styles) {
  if (ONLY && !ONLY.includes(st)) continue;
  const [play, pref] = st.split('-');
  for (let i = 1; i <= SEEDS; i++) {
    const r = run(i * 101, play, pref);
    results.push(r);
    process.stdout.write(`${st} #${i}: ${Math.round(r.t / 60)}dk nesil=${r.score} zirve=${r.peak} evrim=${r.evo} felaket=${r.disasters} ölüm=${r.cause} puanTavanda=${r.capped}sn\n`);
  }
}

// özet
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
console.log('\n=== ÖZET (ortalama) ===');
console.log('tarz'.padEnd(20), 'süre(dk)', 'nesil', 'zirve', 'evrim', 'felaket', 'tavanda(sn)', 'zamanı dolan');
for (const st of styles) {
  const rs = results.filter((r) => `${r.play}-${r.pref}` === st);
  if (!rs.length) continue;
  console.log(st.padEnd(20), String(avg(rs.map((r) => r.t / 60))).padEnd(8), String(avg(rs.map((r) => r.score))).padEnd(5),
    String(avg(rs.map((r) => r.peak))).padEnd(5), String(avg(rs.map((r) => r.evo))).padEnd(5), String(avg(rs.map((r) => r.disasters))).padEnd(7),
    String(avg(rs.map((r) => r.capped))).padEnd(11), rs.filter((r) => r.cause === 'zaman doldu').length + '/' + rs.length);
}
const causes = {};
for (const r of results) causes[r.cause] = (causes[r.cause] || 0) + 1;
console.log('\nÖlüm sebepleri:', causes);

// yükseltme etkisi: seçildiği oyunların ortalama skoru (yalnızca rastgele seçenler)
const rnd = results.filter((r) => r.pref === 'rastgele' && r.play !== 'pasif');
if (rnd.length) {
  console.log('\nRastgele seçen botlarda yükseltme başına ortalama nesil (seçilen / seçilmeyen):');
  for (const k of Object.keys(UPGRADES)) {
    const w = rnd.filter((r) => r.ups[k]), wo = rnd.filter((r) => !r.ups[k]);
    console.log(`  ${k.padEnd(9)} ${String(avg(w.map((r) => r.score))).padStart(4)} / ${String(avg(wo.map((r) => r.score))).padStart(4)}  (${w.length}/${rnd.length} oyun)`);
  }
}

// determinizm: bir oyunu hamleleriyle baştan oynat
const chk = results.find((r) => r.play !== 'pasif');
if (chk) console.log(`\nTekrar oynatma: ${chk.score} → ${replay(chk.seed, chk.team, chk.actions, chk.steps)} (aynı olmalı)`);
console.log(`Toplam süre: ${Math.round((Date.now() - t0) / 1000)} sn`);
