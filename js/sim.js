// Yumurta Evrimi · simülasyon çekirdeği
// DOM'a dokunmaz: tarayıcıda ve node'da aynı çalışır. Aynı tohum = aynı sonuç.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CFG = {
  R: 500,               // petri kabı yarıçapı
  dt: 1 / 30,           // sabit adım (saniye)
  foodMax: 1100,
  foodRate: 40,         // saniyede ortalama yiyecek
  foodEnergy: 16,      // kırıntı
  bigEnergy: 75,       // tohum: sadece iri yumurtalar yutabilir
  bigShare: 0.55,      // zengin bölgelerde çıkanların tohum olma oranı
  bigMouth: 1.25,      // tohumu yutmak için gereken boy
  seasonPeriod: 160,    // bolluk/kıtlık döngüsü (sn)
  seasonAmp: 0.2,
  patches: 4,           // zengin yiyecek bölgeleri
  patchShare: 0.5,
  startCount: 20,
  maxEggs: 20000,       // yalnızca acil durum emniyeti; nüfusu kalabalık stresi frenler
  crowdAt: 8,           // 40×40'lık karede bundan fazla yumurta varsa gider artar
  crowdK: 0.3,          // her 'bir kat daha kalabalık' için gider artışı
  mut: 0.085,           // gen başına log-normal mutasyon
  speciesDist: 0.7,    // log-gen uzayında yeni tür eşiği
  nameAt: 25,           // isim için en az birey (ayrıca nüfusun %3'ü)
  gridCell: 40,
  team: 'Çatlak',
  dpStart: 6, dpMax: 10, dpEvery: 6,   // deney puanı: her 6 sn +1
  warn: 40,             // felaket kaç sn önceden haber verilir
};

export const GENES = ['speed', 'size', 'vision'];
const RANGE = { speed: [0.25, 3.2], size: [0.4, 2.6], vision: [0.25, 3.2] };

const ADJ = {
  speed: [['Hızlı', 'Çevik', 'Şimşek'], ['Ağır', 'Uyuşuk', 'Kaplumbağa']],
  size: [['Koca', 'Tombul', 'Dev'], ['Minik', 'Ufak', 'Cüce']],
  vision: [['Gözlü', 'Keskingöz', 'Kartalgöz'], ['Miyop', 'Şaşı', 'Kör']],
};

export const radiusOf = (g) => 5 * g.size;
export const speedOf = (g) => 45 * g.speed;
export const visionOf = (g) => 30 + 45 * g.vision;
export const emaxOf = (g) => 100 * Math.pow(g.size, 2.5);
// saniyelik enerji gideri: bazal + hareket (kütle × hız²) + görüş
export const costOf = (g) => g.size * g.size * (0.9 + 0.7 * g.speed * g.speed) + 0.45 * g.vision;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Her kart bir felaketin karşılığıdır: kendi alanının içinde o felaketi tamamen durdurur
export const CARDS = {
  yagmur: { name: 'Tohum yağmuru', icon: '🍞', cost: 3, r: 165, dur: 30, counters: 'kitlik', tip: 'Alana sürekli yem yağar' },
  isitici: { name: 'Isıtıcı', icon: '🔥', cost: 3, r: 165, dur: 30, counters: 'buzul', tip: 'Alanın içi donmaz' },
  golge: { name: 'Gölgelik', icon: '⛱️', cost: 3, r: 165, dur: 30, counters: 'sicak', tip: 'Alanın içi serin kalır' },
  kalkan: { name: 'Kalkan', icon: '🛡️', cost: 3, r: 165, dur: 30, counters: 'meteor', tip: 'Meteorlar alana işlemez' },
  tuzak: { name: 'Tuzak', icon: '🪤', cost: 3, r: 120, dur: 30, counters: 'avci', tip: 'Alana giren avcı yakalanır' },
};

export const DISASTERS = {
  kitlik: { name: 'KITLIK', icon: '🌵', card: 'yagmur', hint: 'Dışarıda minikler dayanır' },
  buzul: { name: 'BUZUL ÇAĞI', icon: '❄️', card: 'isitici', hint: 'Dışarıda iriler dayanır' },
  sicak: { name: 'SICAK DALGASI', icon: '☀️', card: 'golge', hint: 'Dışarıda minikler dayanır' },
  meteor: { name: 'METEOR YAĞMURU', icon: '☄️', card: 'kalkan', hint: 'Kaba dağılan soy şanslıdır' },
  avci: { name: 'AVCI İSTİLASI', icon: '🦖', card: 'tuzak', hint: 'Dışarıda hızlılar ve devler kaçar' },
};

// Her atlatılan felaketten sonra 3 tanesinden biri seçilir; seçimler üst üste biner
export const UPGRADES = {
  bereket: { name: 'Bereket', icon: '🌾', tip: 'Yem %50 artar (üst üste katlanır)', max: 5 },
  toprak: { name: 'Verimli toprak', icon: '🌱', tip: 'Yeni zengin bölge, yem %15 artar', max: 4 },
  dogurgan: { name: 'Doğurganlık', icon: '🥚', tip: 'Yumurtalar daha erken ürer', max: 3 },
  omur: { name: 'Uzun ömür', icon: '⏳', tip: 'Yaşam süresi %25 uzar', max: 3 },
  genis: { name: 'Geniş alan', icon: '⭕', tip: 'Kart alanları %15 büyür', max: 3 },
  kalici: { name: 'Kalıcı kartlar', icon: '⌛', tip: 'Kartlar 8 sn uzun sürer', max: 3 },
  puan: { name: 'Hızlı puan', icon: '⚡', tip: 'Deney puanı %25 hızlı dolar', max: 3 },
  cep: { name: 'Büyük cep', icon: '👝', tip: 'En fazla puan +2', max: 2 },
  evrim: { name: 'Hızlı evrim', icon: '🧬', tip: 'Mutasyonlar %40 artar', max: 3 },
};

function randDisk(rng, r) {
  const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r;
  return [Math.cos(a) * d, Math.sin(a) * d];
}
// Hamle listesini baştan oynatıp skoru hesaplar (sunucu doğrulaması için)
export function replay(seed, team, actions, maxSteps = 2e6) {
  const s = new Sim(seed, { team });
  let i = 0;
  while (!s.over && s.stepCount < maxSteps) {
    while (i < actions.length && actions[i].s === s.stepCount) { const a = actions[i++]; a.c === 'up' ? s.choose(a.x) : s.play(a.c, a.x, a.y); }
    s.step();
  }
  return s.maxGen;
}

export class Sim {
  constructor(seed = 1, cfg = {}) {
    this.cfg = { ...CFG, ...cfg };
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.t = 0;
    this.nextId = 1;
    this.eggs = [];
    this.species = new Map();
    this.events = [];
    this.history = [];
    this.maxGen = 0;
    this.foodAcc = 0;
    this.statT = 0;
    this.over = false;
    this.stepCount = 0;
    this.dp = this.cfg.dpStart; this.dpT = 0;
    this.actions = [];
    this.zones = []; this.predators = []; this.meteors = [];
    this.active = null;
    this.mods = { food: 1, repro: 0.75, life: 1, area: 1, dur: 0, mut: 1, dpEvery: this.cfg.dpEvery, dpMax: this.cfg.dpMax };
    this.ups = {}; this.offer = null; this.peakPop = 0;
    this.drng = mulberry32((this.seed ^ 0x9e3779b9) >>> 0);
    this._schedule();
    this._initFood();
    this._initEggs();
    this._stats();
  }

  // ---------- rastgelelik ----------
  gauss() {
    let u = 0, v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  randInDisk(r) {
    const a = this.rng() * Math.PI * 2, d = Math.sqrt(this.rng()) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  // ---------- yiyecek ----------
  _initFood() {
    const { R, gridCell } = this.cfg;
    this.gn = Math.ceil((2 * R) / gridCell);
    this.grid = Array.from({ length: this.gn * this.gn }, () => []);
    this.foodCount = 0;
    this.patches = [];
    for (let i = 0; i < this.cfg.patches; i++) {
      const [x, y] = this.randInDisk(R * 0.65);
      this.patches.push({ x, y, r: 70 + this.rng() * 50 });
    }
    for (let i = 0; i < this.cfg.foodMax * 0.6; i++) this._spawnFood();
  }
  _cellOf(x, y) {
    const { R, gridCell } = this.cfg, n = this.gn;
    const cx = clamp(Math.floor((x + R) / gridCell), 0, n - 1);
    const cy = clamp(Math.floor((y + R) / gridCell), 0, n - 1);
    return cy * n + cx;
  }
  _spawnFood() {
    const { R, patchShare } = this.cfg;
    let x, y, big = false;
    if (this.rng() < patchShare) {
      big = this.rng() < this.cfg.bigShare;
      const p = this.patches[Math.floor(this.rng() * this.patches.length)];
      [x, y] = this.randInDisk(p.r);
      x += p.x; y += p.y;
      if (x * x + y * y > (R - 6) * (R - 6)) return;
    } else {
      [x, y] = this.randInDisk(R - 6);
    }
    this._addFood(x, y, big);
  }
  _addFood(x, y, big) {
    const cell = this.grid[this._cellOf(x, y)];
    const f = { x, y, big, alive: true, cell, i: cell.length };
    cell.push(f);
    this.foodCount++;
  }
  _eatFood(f) {
    const cell = f.cell, last = cell.pop();
    if (last !== f) { cell[f.i] = last; last.i = f.i; }
    f.alive = false;
    this.foodCount--;
  }
  nearestFood(x, y, rad, canBig) {
    const { R, gridCell } = this.cfg, n = this.gn;
    const x0 = clamp(Math.floor((x - rad + R) / gridCell), 0, n - 1);
    const x1 = clamp(Math.floor((x + rad + R) / gridCell), 0, n - 1);
    const y0 = clamp(Math.floor((y - rad + R) / gridCell), 0, n - 1);
    const y1 = clamp(Math.floor((y + rad + R) / gridCell), 0, n - 1);
    let best = null, bd = rad * rad;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.grid[cy * n + cx];
        for (let k = 0; k < cell.length; k++) {
          const f = cell[k];
          if (f.big && !canBig) continue;
          const dx = f.x - x, dy = f.y - y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = f; }
        }
      }
    }
    return best;
  }
  *foods() {
    for (const cell of this.grid) for (const f of cell) yield f;
  }
  season() {
    const { seasonPeriod, seasonAmp } = this.cfg;
    return 1 + seasonAmp * Math.sin((2 * Math.PI * this.t) / seasonPeriod);
  }

  // ---------- yumurtalar ve türler ----------
  _initEggs() {
    const team = this.cfg.team === 'Patlak' ? 'Patlak' : 'Çatlak';
    const sp = this._newSpecies(null, team, team === 'Çatlak' ? 212 : 4, { speed: 1, size: 1, vision: 1 });
    sp.named = true; sp.name = team + 'giller'; this.usedNames.add(sp.name);
    for (let i = 0; i < this.cfg.startCount; i++) {
      const [x, y] = this.randInDisk(this.cfg.R * 0.5);
      const g = { speed: 1, size: 1, vision: 1 };
      this.eggs.push(this._makeEgg(x, y, g, sp, 0, emaxOf(g) * 0.6));
    }
  }
  get usedNames() { return (this._usedNames ??= new Set()); }

  _newSpecies(parent, lineage, hue, genes) {
    const id = this.species.size + 1;
    const sp = {
      id, parent: parent ? parent.id : null, lineage, hue,
      named: false, name: null, born: this.t, namedAt: null, died: null,
      count: 0, peak: 0, mean: { ...genes }, logMean: GENES.map((k) => Math.log(genes[k])),
    };
    this.species.set(id, sp);
    return sp;
  }

  _makeEgg(x, y, g, sp, gen, energy) {
    sp.count++;
    return {
      id: this.nextId++, x, y, h: this.rng() * Math.PI * 2,
      g, sp: sp.id, gen, energy, age: 0, maxAge: (70 + this.rng() * 40) * this.mods.life,
      tf: null, st: 0, dead: false, born: this.t,
    };
  }

  _mutate(g) {
    const m = this.cfg.mut * this.mods.mut, c = {};
    for (const k of GENES) c[k] = clamp(g[k] * Math.exp(this.gauss() * m), RANGE[k][0], RANGE[k][1]);
    return c;
  }

  _reproduce(e, births) {
    const sp = this.species.get(e.sp);
    const g = this._mutate(e.g);
    let csp = sp;
    const d = Math.hypot(...GENES.map((k, i) => Math.log(g[k]) - sp.logMean[i]));
    if (d > this.cfg.speciesDist) csp = this._newSpecies(sp, sp.lineage, sp.hue, g);
    const share = e.energy * 0.45;
    e.energy = share;
    const a = this.rng() * Math.PI * 2, r = radiusOf(e.g) * 2;
    births.push(this._makeEgg(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, g, csp, e.gen + 1, share));
  }

  _pickHue(base) {
    const alive = [...this.species.values()].filter((s) => s.named && s.count > 0).map((s) => s.hue);
    let best = base, bestD = -1;
    for (let i = 0; i < 24; i++) {
      const h = (base + 40 + i * 12 + this.rng() * 8) % 360;
      let md = 360;
      for (const a of alive) { const dd = Math.abs(((h - a + 540) % 360) - 180); md = Math.min(md, dd); }
      if (md > bestD) { bestD = md; best = h; }
    }
    return best;
  }

  nameFor(sp) {
    const traits = GENES.map((k) => ({ k, v: Math.log(sp.mean[k]) }))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    const word = ({ k, v }) => {
      const lvl = Math.abs(v) > 0.95 ? 2 : Math.abs(v) > 0.55 ? 1 : 0;
      return ADJ[k][v >= 0 ? 0 : 1][lvl];
    };
    let parts = [word(traits[0])];
    if (Math.abs(traits[1].v) > 0.4) parts.push(word(traits[1]));
    let name = parts.join(' ') + ' ' + sp.lineage + 'giller';
    if (this.usedNames.has(name)) {
      const roman = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      for (const r of roman) if (!this.usedNames.has(name + ' ' + r)) { name = name + ' ' + r; break; }
    }
    this.usedNames.add(name);
    return name;
  }

  // ---------- oyuncu kartları: her kart bir felaketi kendi alanında durdurur ----------
  play(c, x = 0, y = 0) {
    const C = CARDS[c], R = this.cfg.R;
    const cost = this.cardCost(c);
    if (!C || this.over || this.dp < cost) return false;
    x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10;
    if (x * x + y * y > R * R) return false;
    this.dp -= cost;
    this.actions.push({ s: this.stepCount, c, x, y });
    this.zones.push({ type: c, x, y, r: C.r * this.mods.area, until: this.t + C.dur + this.mods.dur, dur: C.dur + this.mods.dur, acc: 0 });
    this.events.push({ t: this.t, type: 'card', card: c, x, y });
    return true;
  }
  cardCost(c) { return CARDS[c].cost + Math.floor(this.dzi / 8); }

  // ---------- evrim yükseltmeleri ----------
  _offer() {
    const pool = Object.keys(UPGRADES).filter((k) => (this.ups[k] || 0) < UPGRADES[k].max);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.drng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.offer = pool.slice(0, 3);
    if (this.offer.length) this.events.push({ t: this.t, type: 'offer' });
    else this.offer = null;
  }
  choose(id) {
    if (!this.offer || !this.offer.includes(id) || this.over) return false;
    const M = this.mods;
    this.ups[id] = (this.ups[id] || 0) + 1;
    if (id === 'bereket') M.food *= 1.5;
    else if (id === 'toprak') {
      const [x, y] = randDisk(this.drng, this.cfg.R * 0.65);
      this.patches.push({ x, y, r: 80 + this.drng() * 40 });
      M.food *= 1.15;
    } else if (id === 'dogurgan') M.repro = Math.max(0.6, M.repro - 0.05);
    else if (id === 'omur') M.life += 0.25;
    else if (id === 'genis') M.area += 0.15;
    else if (id === 'kalici') M.dur += 8;
    else if (id === 'puan') M.dpEvery *= 0.8;
    else if (id === 'cep') M.dpMax += 2;
    else if (id === 'evrim') M.mut += 0.4;
    this.offer = null;
    this.actions.push({ s: this.stepCount, c: 'up', x: id, y: 0 });
    this.events.push({ t: this.t, type: 'upgrade', id });
    return true;
  }

  inZone(type, x, y) {
    for (const z of this.zones) if (z.type === type && (z.x - x) ** 2 + (z.y - y) ** 2 < z.r * z.r) return true;
    return false;
  }
  has(type) { return !!this.active && this.active.types.includes(type); }

  // ---------- felaketler ----------
  _schedule() {
    const d = this.drng, list = [];
    const first = ['kitlik', 'buzul', 'meteor', 'sicak', 'avci'];
    const all = Object.keys(DISASTERS);
    let t = 70, k = 0, prev = [];
    const pick = (not) => { let x; do x = all[Math.floor(d() * all.length)]; while (not.includes(x)); return x; };
    while (t < 60000) {
      const types = [first[k] || pick(prev)];
      // 6. felaketten sonra her ikincisi çifte gelir
      // 6'dan sonra her ikincisi çifte, 16'dan sonra hepsi çifte, 24'ten sonra her üçüncüsü üçlü
      if ((k >= 6 && k % 2 === 0) || k >= 16) types.push(pick([...types, ...prev]));
      if (k >= 24 && k % 3 === 0) types.push(pick([...types, ...prev]));
      const dur = 35 + Math.min(25, k * 2);
      list.push({ types, k, pow: 1.3 + 0.35 * k, warnAt: t - this.cfg.warn, start: t, end: t + dur, warned: false, started: false });
      prev = types;
      t += dur + Math.max(22, 70 - k * 3);
      k++;
    }
    this.schedule = list;
    this.dzi = 0;
  }
  get next() { return this.schedule[this.dzi]; }
  _disasterTick() {
    const D = this.schedule[this.dzi];
    if (!D) return;
    if (!D.warned && this.t >= D.warnAt) { D.warned = true; this.events.push({ t: this.t, type: 'warn', dz: D.types }); }
    if (!D.started && this.t >= D.start) {
      D.started = true; this.active = D;
      this.events.push({ t: this.t, type: 'dz', dz: D.types });
      if (D.types.includes('meteor')) {
        const n = Math.round((D.end - D.start) * Math.min(1.2, 0.45 + 0.05 * D.k));
        for (let i = 0; i < n; i++) {
          const [x, y] = randDisk(this.drng, this.cfg.R);
          this.meteors.push({ x, y, r: Math.min(110, 55 + 3 * D.k), t: D.start + 2 + this.drng() * (D.end - D.start - 2), hit: false });
        }
      }
      if (D.types.includes('avci')) {
        const n = Math.min(18, 3 + D.k);
        for (let i = 0; i < n; i++) {
          const a = this.drng() * Math.PI * 2, R = this.cfg.R - 20;
          this.predators.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, h: a + Math.PI, spd: 52 + 3 * Math.min(15, D.k),
            vis: 160, size: 2 + 0.08 * D.k, cd: 0, prey: null, dead: false });
        }
      }
    }
    if (D.started && this.t >= D.end) {
      this.active = null; this.predators = []; this.meteors = [];
      this.events.push({ t: this.t, type: 'survived', dz: D.types });
      this.dzi++;
      this._offer();
    }
  }
  _predators(dt) {
    const R = this.cfg.R;
    for (const p of this.predators) {
      p.cd -= dt;
      if (p.prey && p.prey.dead) p.prey = null;
      if (!p.prey || this.rng() < 0.02) {
        let best = null, bd = p.vis * p.vis;
        for (const e of this.eggs) {
          if (e.dead || e.g.size >= p.size) continue;
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        p.prey = best;
      }
      if (p.prey) {
        const want = Math.atan2(p.prey.y - p.y, p.prey.x - p.x);
        const dh = ((want - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        p.h += clamp(dh, -5 * dt, 5 * dt);
      } else p.h += (this.rng() * 2 - 1) * 3 * dt;
      p.x += Math.cos(p.h) * p.spd * dt; p.y += Math.sin(p.h) * p.spd * dt;
      const d = Math.hypot(p.x, p.y);
      if (d > R - 12) { p.x *= (R - 12) / d; p.y *= (R - 12) / d; p.h = Math.atan2(-p.y, -p.x); }
      if (this.inZone('tuzak', p.x, p.y)) {
        p.dead = true;
        this.events.push({ t: this.t, type: 'caught', x: p.x, y: p.y });
        continue;
      }
      if (p.prey && p.cd <= 0) {
        const e = p.prey, rr = 5 * p.size + radiusOf(e.g);
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) { e.dead = true; p.prey = null; p.cd = 0.5; }
      }
    }
    if (this.predators.some((p) => p.dead)) this.predators = this.predators.filter((p) => !p.dead);
  }
  _zones(dt) {
    const R = this.cfg.R;
    this.zones = this.zones.filter((z) => z.until > this.t);
    for (const z of this.zones) {
      if (z.type !== 'yagmur') continue;
      z.acc += 6 * dt;
      while (z.acc >= 1) {
        z.acc -= 1;
        if (this.foodCount >= this.cfg.foodMax * this.mods.food * 1.3) continue;
        const [dx, dy] = this.randInDisk(z.r);
        if ((z.x + dx) ** 2 + (z.y + dy) ** 2 < (R - 6) ** 2) this._addFood(z.x + dx, z.y + dy, this.rng() < 0.3);
      }
    }
  }

  // ---------- adım ----------
  step() {
    const c = this.cfg, dt = c.dt, R = c.R;
    this.t += dt;
    this.stepCount++;
    this._disasterTick();
    const A = this.active;

    this.dpT += dt;
    const M = this.mods;
    if (this.dpT >= M.dpEvery) { this.dpT -= M.dpEvery; this.dp = Math.min(M.dpMax, this.dp + 1); }
    if (this.zones.length) this._zones(dt);

    let foodMul = this.season();
    if (this.has('kitlik')) foodMul *= Math.max(0.05, 0.3 - 0.025 * A.k);
    if (this.has('buzul')) foodMul *= 0.8;
    this.foodAcc += c.foodRate * foodMul * M.food * dt;
    while (this.foodAcc >= 1) {
      this.foodAcc -= 1;
      if (this.foodCount < c.foodMax * M.food) this._spawnFood();
    }

    for (const m of this.meteors) {
      if (m.hit || this.t < m.t) continue;
      m.hit = true;
      for (const e of this.eggs) {
        if (!e.dead && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < m.r * m.r && !this.inZone('kalkan', e.x, e.y)) e.dead = true;
      }
    }
    if (this.predators.length) this._predators(dt);

    // kalabalık: her karedeki yumurta sayısı (sıkışanlar daha çok enerji harcar)
    const crowd = (this.crowd ??= new Uint16Array(this.gn * this.gn));
    crowd.fill(0);
    for (const e of this.eggs) if (!e.dead) crowd[this._cellOf(e.x, e.y)]++;

    const births = [];
    for (const e of this.eggs) {
      if (e.dead) continue;
      const g = e.g, r = radiusOf(g), vmax = speedOf(g), vis = visionOf(g);
      if (e.tf && !e.tf.alive) e.tf = null;
      e.st -= dt;
      if (!e.tf && e.st <= 0) { e.tf = this.nearestFood(e.x, e.y, vis, g.size >= c.bigMouth); e.st = 0.25; }

      if (e.tf) {
        const want = Math.atan2(e.tf.y - e.y, e.tf.x - e.x);
        let dh = ((want - e.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const maxTurn = 7 * dt;
        e.h += clamp(dh, -maxTurn, maxTurn);
      } else {
        e.h += (this.rng() * 2 - 1) * 4 * dt;
      }
      e.x += Math.cos(e.h) * vmax * dt;
      e.y += Math.sin(e.h) * vmax * dt;
      const d = Math.hypot(e.x, e.y);
      if (d > R - r - 2) {
        const k = (R - r - 2) / d;
        e.x *= k; e.y *= k;
        e.h = Math.atan2(-e.y, -e.x) + (this.rng() - 0.5) * 1.6;
        e.tf = null;
      }

      if (e.tf) {
        const dx = e.tf.x - e.x, dy = e.tf.y - e.y;
        if (dx * dx + dy * dy < (r + 3) * (r + 3)) {
          const gain = e.tf.big ? c.bigEnergy : c.foodEnergy;
          this._eatFood(e.tf);
          e.tf = null; e.st = 0;
          e.energy = Math.min(emaxOf(g), e.energy + gain);
        }
      }

      let cost = costOf(g);
      const nc = crowd[this._cellOf(e.x, e.y)];
      if (nc > c.crowdAt) cost *= 1 + c.crowdK * (nc / c.crowdAt - 1);
      // soğuk herkesi yorar, iriler daha az; sıcak herkesi yorar, minikler daha az
      if (this.has('buzul') && !this.inZone('isitici', e.x, e.y)) cost += A.pow * 1.6 / g.size;
      if (this.has('sicak') && !this.inZone('golge', e.x, e.y)) cost += A.pow * 1.1 * g.size;
      e.energy -= cost * dt;
      e.age += dt;
      if (e.energy <= 0 || e.age > e.maxAge) { e.dead = true; continue; }
      if (e.energy >= M.repro * emaxOf(g) && e.age > 4 && this.eggs.length + births.length < c.maxEggs) {
        this._reproduce(e, births);
      }
    }

    let alive = this.eggs;
    if (alive.some((e) => e.dead)) {
      alive = [];
      for (const e of this.eggs) {
        if (e.dead) this.species.get(e.sp).count--;
        else alive.push(e);
      }
    }
    this.eggs = births.length ? alive.concat(births) : alive;
    for (const b of births) if (b.gen > this.maxGen) this.maxGen = b.gen;

    if (!this.over && this.eggs.length === 0) {
      this.over = true;
      this.events.push({ t: this.t, type: 'over', score: this.maxGen });
    }
    this.statT += dt;
    if (this.statT >= 1) { this.statT = 0; this._stats(); }
  }

  _stats() {
    const sums = new Map();
    for (const e of this.eggs) {
      let s = sums.get(e.sp);
      if (!s) sums.set(e.sp, (s = { n: 0, l: [0, 0, 0] }));
      s.n++;
      for (let i = 0; i < 3; i++) s.l[i] += Math.log(e.g[GENES[i]]);
    }
    for (const [id, s] of sums) {
      const sp = this.species.get(id);
      sp.logMean = s.l.map((v) => v / s.n);
      GENES.forEach((k, i) => (sp.mean[k] = Math.exp(sp.logMean[i])));
      sp.peak = Math.max(sp.peak, sp.count);
      if (!sp.named && sp.count >= Math.max(this.cfg.nameAt, this.eggs.length * 0.03)) {
        sp.named = true;
        sp.namedAt = this.t;
        sp.hue = this._pickHue(sp.hue);
        sp.name = this.nameFor(sp);
        this.events.push({ t: this.t, type: 'new', sp: sp.id, text: sp.name });
      }
    }
    for (const sp of this.species.values()) {
      if (sp.count <= 0 && sp.died === null) {
        sp.died = this.t;
        if (sp.named) this.events.push({ t: this.t, type: 'extinct', sp: sp.id, text: sp.name });
      }
    }

    this.gen = this.eggs.reduce((a, e) => Math.max(a, e.gen), 0);
    if (this.eggs.length > this.peakPop) this.peakPop = this.eggs.length;
    const n = this.eggs.length || 1;
    const mean = {};
    for (const k of GENES) mean[k] = this.eggs.reduce((a, e) => a + e.g[k], 0) / n;
    const counts = {};
    for (const sp of this.liveSpecies()) counts[sp.id] = sp.count;
    this.history.push({ t: this.t, pop: this.eggs.length, food: this.foodCount, gen: this.gen, mean, counts });
    if (this.history.length > 1800) this.history = this.history.filter((_, i) => i % 2 === 0);
  }

  // Görünen tür: isimsiz adaylar en yakın isimli atasının rengini taşır
  displaySpecies(id) {
    let sp = this.species.get(id);
    while (sp && !sp.named) sp = this.species.get(sp.parent);
    return sp;
  }
  liveSpecies() {
    const m = new Map();
    for (const sp of this.species.values()) {
      if (sp.count <= 0) continue;
      const d = this.displaySpecies(sp.id);
      if (!m.has(d.id)) m.set(d.id, { ...d, count: 0 });
      m.get(d.id).count += sp.count;
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }
  namedCount() {
    let n = 0;
    for (const sp of this.species.values()) if (sp.named) n++;
    return n;
  }
}
