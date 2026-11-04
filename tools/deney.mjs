// Yumurta Evrimi · ölçümlü deneyler
// Simülasyonu aynı anda çatallayıp (fork) yalnızca tek şeyi değiştirerek karşılaştırır.
// Kullanım:
//   node tools/deney.mjs yerlesim [tohum=6]      tek felakette kart yerleşimi
//   node tools/deney.mjs oyun     [tohum=8]      felaket başına kayıp, elenme, puan, karar aralığı
//   node tools/deney.mjs yukseltme [tohum=6]     aynı anda her yükseltmeyi zorla, 15 dk sonrasını ölç
//   node tools/deney.mjs sade     [tohum=8]      zorluk sadeleştirme: sabit fiyat / sabit süre
// Not: deney rng'si oyununkiyle aynı algoritma ama farklı tohum akışıdır; sonuçlar
// gerçek oyundaki tohumlarla birebir aynı değil, yalnızca kendi içinde karşılaştırılabilir.
import { pathToFileURL } from 'node:url';
import { Sim, CARDS, DISASTERS, UPGRADES } from '../js/sim.js';

// ---------- çatallanabilir rng ----------
function rngState(a) {
  const f = () => {
    f.a = (f.a + 0x6d2b79f5) | 0;
    let t = Math.imul(f.a ^ (f.a >>> 15), 1 | f.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.a = a | 0;
  return f;
}
function newSim(seed, Cls = Sim) {
  const s = new Cls(seed, { team: 'Çatlak' });
  s.rng = rngState(seed * 7 + 1);
  s.drng = rngState(seed * 13 + 5);
  s._b = seed * 7919 + 1; // bot rng durumu
  return s;
}
function fork(s) {
  const { rng, drng, ...rest } = s;
  const c = structuredClone(rest);
  Object.setPrototypeOf(c, Object.getPrototypeOf(s));
  c.rng = rngState(rng.a);
  c.drng = rngState(drng.a);
  return c;
}
const brng = (s) => ((s._b = (s._b * 16807) % 2147483647) / 2147483647);

// ---------- bot ----------
const PREFS = {
  buyume: ['bereket', 'toprak', 'dogurgan', 'omur', 'puan', 'kalici', 'genis', 'cep', 'evrim'],
  rastgele: null,
};
function densest(s) {
  let best = [0, 0], bn = -1;
  const N = s.eggs.length, stride = Math.max(1, Math.floor(N / 400));
  for (let i = 0; i < 24 && N; i++) {
    const e = s.eggs[Math.floor(brng(s) * N)];
    let n = 0;
    for (let j = 0; j < N; j += stride) {
      const o = s.eggs[j];
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 140 * 140) n++;
    }
    if (n > bn) { bn = n; best = [e.x, e.y]; }
  }
  return best;
}
const covered = (s, card, minLeft) => s.zones.some((z) => z.type === card && z.until - s.t > minLeft);
// play: pasif | telasli | akilli ; skipK: bu sıradaki felakete kart atma
function botStep(s, play, pref, skipK = -1) {
  if (s.offer) {
    const P = PREFS[pref];
    s.choose(P ? P.find((k) => s.offer.includes(k)) || s.offer[0] : s.offer[Math.floor(brng(s) * s.offer.length)]);
  }
  if (s.stepCount % 10 !== 0 || play === 'pasif') return;
  let D = null;
  if (s.active) D = s.active;
  else if (play === 'akilli' && s.next && s.next.warned && s.next.start - s.t < 2) D = s.next;
  if (!D || D.k === skipK) return;
  for (const t of D.types) {
    const card = DISASTERS[t].card;
    const need = play === 'akilli' ? !covered(s, card, s.active ? 2 : 25) : !covered(s, card, 0);
    if (need && s.dp >= s.cardCost(card)) s.play(card, ...densest(s));
  }
}

// ---------- ölçümlü oyun ----------
// act(s): her adımdan önce oyuncunun/botun hamlesi. starvedCheck: puansız an sayılsın mı
export function runInstrumented(s, act, limit, starvedCheck = true) {
  const dz = [];          // felaket başına kayıt
  const decisions = [];   // anlamlı karar anları (kart, yükseltme)
  let capped = 0, starved = 0, ev = 0, death = null;
  const recs = {};
  let lastActions = 0;
  while (!s.over && s.t < limit) {
    const D = s.next;
    if (D && D.warned && !recs[D.k]) {
      recs[D.k] = { k: D.k, types: D.types.join('+'), popWarn: s.eggs.length, dpWarn: s.dp,
        need: D.types.reduce((a, t) => a + s.cardCost(DISASTERS[t].card), 0) };
    }
    act(s);
    s.step();
    if (s.actions.length > lastActions) { for (let i = lastActions; i < s.actions.length; i++) decisions.push(s.t); lastActions = s.actions.length; }
    if (s.dp >= s.mods.dpMax) capped += s.cfg.dt;
    const cur = s.active && recs[s.active.k];
    if (cur) {
      if (cur.popStart === undefined) { cur.popStart = s.eggs.length; cur.dpStart = s.dp; cur.min = s.eggs.length; }
      cur.min = Math.min(cur.min, s.eggs.length);
      // kritik an: felaket sürerken karşı kartın yok ve parası da yok
      if (starvedCheck && s.active.types.some((t) => { const c = DISASTERS[t].card; return !covered(s, c, 0) && s.dp < s.cardCost(c); })) starved += s.cfg.dt;
    }
    while (ev < s.events.length) {
      const e = s.events[ev++];
      if (e.type === 'survived' && recs[s.dzi - 1]) { recs[s.dzi - 1].popEnd = s.eggs.length; dz.push(recs[s.dzi - 1]); }
      if (e.type === 'over') death = s.active ? { k: s.active.k, types: s.active.types.join('+') } : { k: s.dzi, types: 'sakin' };
    }
  }
  if (s.active && recs[s.active.k] && recs[s.active.k].popStart !== undefined) { recs[s.active.k].popEnd = 0; dz.push(recs[s.active.k]); }
  const gaps = [];
  for (let i = 1; i < decisions.length; i++) gaps.push(decisions[i] - decisions[i - 1]);
  return { t: s.t, score: s.maxGen, peak: s.peakPop, dz, death, capped, starved, decisions, gaps, over: s.over, ups: { ...s.ups } };
}

// ---------- yardımcılar ----------
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const med = (a) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (x) => (isNaN(x) ? '  -' : `${Math.round(x * 100)}%`.padStart(4));
const f1 = (x) => (isNaN(x) ? '-' : x.toFixed(1));
function runFor(s, seconds, policy) {
  const end = s.t + seconds;
  while (!s.over && s.t < end) { if (policy) policy(s); else if (s.offer) s.choose(s.offer[0]); s.step(); }
  return s;
}
function corr(xs, ys) {
  const mx = avg(xs), my = avg(ys);
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < xs.length; i++) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; c += (ys[i] - my) ** 2; }
  return a / Math.sqrt(b * c || 1);
}

// ---------- 1) tek felakette yerleşim ----------
function deneyYerlesim(N) {
  console.log('DENEY 1 · Tek felakette kart yerleşimi');
  console.log('Akıllı bot o felakete kadar oynar; felaketten 0,5 sn önce oyun çatallanır.');
  console.log('Her dalda tek fark kartın konumu; felaket bitince hayatta kalan oranı ölçülür.\n');
  const rows = {};
  for (let i = 1; i <= N; i++) {
    const seed = i * 101;
    const base = newSim(seed);
    for (let k = 0; k < 5; k++) {
      const D = base.schedule[k];
      while (!base.over && base.t < D.start - 0.5) { botStep(base, 'akilli', 'buyume', k); base.step(); }
      if (base.over) break;
      const type = D.types[0], card = DISASTERS[type].card;
      const branch = (xy, c = card) => {
        const s = fork(base);
        s.dp = Math.max(s.dp, s.cardCost(c));
        const p0 = s.eggs.length;
        if (xy) s.play(c, xy[0], xy[1]);
        while (!s.over && s.t < D.end) { s.step(); }
        return s.eggs.length / p0;
      };
      const coverage = (x, y) => { const r = CARDS[card].r * base.mods.area; let n = 0; for (const e of base.eggs) if ((e.x - x) ** 2 + (e.y - y) ** 2 < r * r) n++; return n / base.eggs.length; };
      const none = branch(null);
      // plasebo: bu felaketle ilgisiz bir kart (etkisiz). kartsız ile farkı = kaotik sapma (gürültü)
      const placebo = branch(densest(fork(base)), type === 'buzul' ? 'golge' : 'isitici');
      const bot = branch(densest(fork(base)));
      const grid = [], cov = [];
      for (let x = -400; x <= 400; x += 100) for (let y = -400; y <= 400; y += 100) {
        if (x * x + y * y > 430 * 430) continue;
        grid.push(branch([x, y])); cov.push(coverage(x, y));
      }
      const r = (rows[type] ??= { none: [], placebo: [], bot: [], best: [], worst: [], mid: [], corr: [], pop: [], bestCov: [] });
      r.none.push(none); r.placebo.push(placebo); r.bot.push(bot); r.best.push(Math.max(...grid)); r.worst.push(Math.min(...grid));
      r.mid.push(med(grid)); r.corr.push(corr(cov, grid)); r.pop.push(base.eggs.length);
      r.bestCov.push(cov[grid.indexOf(Math.max(...grid))]);
      // bu felaketin kartını şimdi gerçekten oyna ki sonraki felaketler normal başlasın
      base.dp = Math.max(base.dp, base.cardCost(card));
      base.play(card, ...densest(base));
    }
    process.stdout.write('.');
  }
  console.log('\n\nHayatta kalan oran (felaket başı nüfusa göre), tohum ortalaması:');
  console.log('felaket (sıra)  nüfus  kartsız  plasebo  bot(kalabalık)  ızgara-en-kötü  ızgara-medyan  ızgara-en-iyi   kapsama↔sonuç korelasyonu');
  for (const [t, r] of Object.entries(rows)) {
    console.log(`${DISASTERS[t].name.padEnd(15)} ${String(Math.round(avg(r.pop))).padStart(5)}  ${pct(avg(r.none))}     ${pct(avg(r.placebo))}    ${pct(avg(r.bot))}            ${pct(avg(r.worst))}            ${pct(avg(r.mid))}           ${pct(avg(r.best))}          ${f1(avg(r.corr))}`);
  }
  console.log('\nTohum başına |kartsız − plasebo| (gürültü):', Object.entries(rows).map(([t, r]) => `${t} ${pct(avg(r.none.map((x, i) => Math.abs(x - r.placebo[i]))))}`).join(' · '));
  console.log('Tohum başına (en-iyi − en-kötü):', Object.entries(rows).map(([t, r]) => `${t} ${pct(avg(r.best.map((x, i) => x - r.worst[i])))}`).join(' · '));
  console.log('\nOkuma: (en-iyi − en-kötü) = konum becerisinin etkisi; (bot − kartsız) = kartın etkisi;');
  console.log('korelasyon ~1 ise "en kalabalık yere koy" tek doğru cevaptır (karar otomatik).');
}

// ---------- 2) ölçümlü tam oyunlar ----------
export function report(label, results) {
  const R = results;
  console.log(`\n## ${label}  (${R.length} oyun)`);
  console.log(`süre ort ${f1(avg(R.map((r) => r.t / 60)))} oyun-dk · nesil ${Math.round(avg(R.map((r) => r.score)))} · zirve ${Math.round(avg(R.map((r) => r.peak)))}`);
  // felaket sırasına göre kayıp ve elenme
  const byK = {};
  for (const r of R) {
    for (const d of r.dz) (byK[d.k] ??= { loss: [], dead: 0, n: 0, types: {} }).loss.push(d.popStart ? 1 - d.min / d.popStart : NaN);
    for (const d of r.dz) byK[d.k].n++;
    if (r.death) { (byK[r.death.k] ??= { loss: [], dead: 0, n: 0, types: {} }).dead++; }
  }
  const ks = Object.keys(byK).map(Number).sort((a, b) => a - b);
  const line = (k) => `${String(k + 1).padStart(2)}: kayıp ${pct(avg(byK[k].loss.filter((x) => !isNaN(x))))} elenme ${byK[k].dead}/${byK[k].n}`;
  const buckets = [[0, 4], [5, 9], [10, 15], [16, 23], [24, 99]];
  console.log('felaket sırası → ortalama en büyük kayıp, o felakette elenen/ulaşan');
  for (const [a, b] of buckets) {
    const inB = ks.filter((k) => k >= a && k <= b);
    if (!inB.length) continue;
    const loss = inB.flatMap((k) => byK[k].loss.filter((x) => !isNaN(x)));
    const dead = inB.reduce((x, k) => x + byK[k].dead, 0), reach = R.filter((r) => r.dz.some((d) => d.k >= a) || (r.death && r.death.k >= a)).length;
    console.log(`  ${a + 1}–${b + 1}. felaket: kayıp ${pct(avg(loss))} · elenen ${dead} (bu aralığa ulaşan ${reach})`);
  }
  // türe göre
  const byT = {};
  for (const r of R) for (const d of r.dz) (byT[d.types] ??= []).push(d.popStart ? 1 - d.min / d.popStart : NaN);
  const deathT = {};
  for (const r of R) if (r.death) deathT[r.death.types] = (deathT[r.death.types] || 0) + 1;
  console.log('felaket türü → ortalama kayıp (tekliler):', Object.entries(byT).filter(([t]) => !t.includes('+')).map(([t, l]) => `${t} ${pct(avg(l.filter((x) => !isNaN(x))))}`).join(' · '));
  console.log('ölüm anındaki felaket:', JSON.stringify(deathT));
  // çöküş keskinliği: son 3 felaketten önceki kayıp ortalaması vs son felaket
  const pre = R.flatMap((r) => r.dz.slice(-4, -1).map((d) => (d.popStart ? 1 - d.min / d.popStart : NaN))).filter((x) => !isNaN(x));
  console.log(`ölümden önceki 3 felakette ortalama kayıp: ${pct(avg(pre))}  (düşükse ölüm "birden" geliyor)`);
  // puan
  const T = avg(R.map((r) => r.t));
  console.log(`puan tavanda: ort ${Math.round(avg(R.map((r) => r.capped)))} sn (sürenin ${pct(avg(R.map((r) => r.capped / r.t)))}) · felakette kart lazım ama puan yok: ort ${Math.round(avg(R.map((r) => r.starved)))} sn`);
  const afford = R.flatMap((r) => r.dz.map((d) => d.dpStart >= d.need));
  console.log(`felaket başladığında gereken kartların parası vardı: ${pct(avg(afford.map(Number)))}`);
  // karar aralığı
  const gaps = R.flatMap((r) => r.gaps);
  if (gaps.length) console.log(`anlamlı kararlar arası (kart+yükseltme): medyan ${f1(med(gaps))} oyun-sn, %90'lık ${f1([...gaps].sort((a, b) => a - b)[Math.floor(gaps.length * 0.9)])} sn, en uzun ${f1(Math.max(...gaps))} sn · 4× hızda ÷4`);
  const perMin = avg(R.map((r) => r.decisions.length / (r.t / 60)));
  console.log(`dakikada karar: ${f1(perMin)} (oyun-dk) ≈ ${f1(perMin * 4)} (4× gerçek dk)`);
  return { T };
}
function deneyOyun(N) {
  console.log('DENEY 2 · Ölçümlü tam oyunlar (aynı tohumlar, oyun-saniyesi)');
  const all = {};
  for (const play of ['pasif', 'telasli', 'akilli']) {
    all[play] = [];
    for (let i = 1; i <= N; i++) all[play].push(runInstrumented(newSim(i * 101), (x) => botStep(x, play, 'buyume'), 7200, play !== 'pasif'));
    report(`${play} + büyüme`, all[play]);
  }
  console.log('\n## Aynı tohumda kartlı / kartsız');
  for (let i = 0; i < N; i++) {
    const p = all.pasif[i], a = all.akilli[i];
    console.log(`tohum ${(i + 1) * 101}: kartsız ${f1(p.t / 60)} dk nesil ${p.score} · akıllı ${f1(a.t / 60)} dk nesil ${a.score}`);
  }
}

// ---------- 3) yükseltme faydası ----------
function deneyYukseltme(N) {
  console.log('DENEY 3 · Yükseltme faydası (aynı an, aynı tohum, tek fark seçilen yükseltme)');
  console.log('Akıllı bot k. felakete kadar oynar; teklif anında oyun çatallanır, her dalda farklı yükseltme zorlanır,');
  console.log('sonra hepsi aynı bot (rastgele yükseltme tercihi, aynı rng) ile 15 oyun-dk oynar.\n');
  const ids = Object.keys(UPGRADES);
  const res = {};
  for (const atK of [1, 6]) {
    for (let i = 1; i <= N; i++) {
      const base = newSim(i * 101);
      while (!base.over && !(base.offer && base.dzi === atK + 1)) { if (base.offer) base.choose(base.offer[0]); else botStep(base, 'akilli', 'rastgele'); base.step(); }
      if (base.over) continue;
      const out = {};
      for (const id of ids) {
        const s = fork(base);
        s.offer = [id]; s.choose(id);
        runFor(s, 900, (x) => botStep(x, 'akilli', 'rastgele'));
        out[id] = { gen: s.maxGen - base.maxGen, pop: s.eggs.length, dead: s.over };
      }
      const g = ids.map((id) => out[id].gen), m = avg(g);
      for (const id of ids) {
        const r = ((res[atK] ??= {})[id] ??= { rel: [], pop: [], dead: 0 });
        r.rel.push(m ? out[id].gen / m : 1); r.pop.push(out[id].pop); r.dead += out[id].dead;
      }
      process.stdout.write('.');
    }
    console.log(`\n\n${atK + 1}. felaketten sonraki teklifte: 15 dk içinde kazanılan nesil (dalların ortalamasına göre), 15. dk nüfusu, ölen dal`);
    for (const id of ids.sort((a, b) => avg(res[atK][b].rel) - avg(res[atK][a].rel))) {
      const r = res[atK][id];
      console.log(`  ${id.padEnd(9)} ${f1(avg(r.rel) * 100).padStart(5)}%   nüfus ${String(Math.round(avg(r.pop))).padStart(5)}   ölen ${r.dead}/${r.rel.length}`);
    }
  }
}

// ---------- 4) zorluk sadeleştirme ----------
function variant({ fixedCost, fixedDur }) {
  return class extends Sim {
    cardCost(c) { return fixedCost ? CARDS[c].cost : super.cardCost(c); }
    _schedule() {
      super._schedule();
      if (!fixedDur) return;
      // aynı felaket sırası ve türleri; yalnızca süre sabit, aralar aynı formülle yeniden dizilir
      let t = 70;
      for (const D of this.schedule) {
        const dur = fixedDur;
        D.start = t; D.warnAt = t - this.cfg.warn; D.end = t + dur;
        t += dur + Math.max(22, 70 - D.k * 3);
      }
    }
  };
}
function deneySade(N) {
  console.log('DENEY 4 · Zorluk sadeleştirme: her seferde tek değişiklik (akıllı + büyüme, aynı tohumlar)');
  const V = {
    'mevcut': {},
    'sabit fiyat (3)': { fixedCost: true },
    'sabit süre (45 sn)': { fixedDur: 45 },
  };
  for (const [name, o] of Object.entries(V)) {
    const Cls = variant(o);
    const R = [];
    for (let i = 1; i <= N; i++) R.push(runInstrumented(newSim(i * 101, Cls), (x) => botStep(x, 'akilli', 'buyume'), 7200));
    report(name, R);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
function main() {
  const [cmd, n] = process.argv.slice(2);
  const t0 = Date.now();
  ({ yerlesim: deneyYerlesim, oyun: deneyOyun, yukseltme: deneyYukseltme, sade: deneySade }[cmd] || (() => console.log('komut: yerlesim | oyun | yukseltme | sade')))(+n || 6);
  console.log(`\n(${Math.round((Date.now() - t0) / 1000)} sn)`);
}
