// Yumurta Evrimi · çizim
// Masa + petri kabı + yumurtalar dünya koordinatında; video yazıları ekran koordinatında.
import { radiusOf, visionOf } from './sim.js';

const TABLE_HALF = 1400;   // masanın dünya ölçüsündeki yarı genişliği
const TABLE_SCALE = 1.4;   // dünya birimi / masa pikseli

export const FONT_BIG = '"Shantell Sans", "Comic Sans MS", sans-serif';
export const FONT_HAND = '"Caveat", "Segoe Print", cursive';

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 1 };
    this.table = null;
    this.R = 500;
  }

  // ---------- masa (bir kez çizilir) ----------
  bake(sim) {
    this.R = sim.cfg.R;
    const px = Math.round((2 * TABLE_HALF) / TABLE_SCALE);
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d');
    const rng = mulberry(7);
    g.scale(1 / TABLE_SCALE, 1 / TABLE_SCALE);
    g.translate(TABLE_HALF, TABLE_HALF);

    // tahta: dikey kalaslar + damar
    const planks = 5, pw = (2 * TABLE_HALF) / planks;
    for (let i = 0; i < planks; i++) {
      const x0 = -TABLE_HALF + i * pw;
      const base = 28 + rng() * 6, light = 38 + rng() * 8;
      g.fillStyle = `hsl(${base}, 48%, ${light}%)`;
      g.fillRect(x0, -TABLE_HALF, pw, 2 * TABLE_HALF);
      for (let k = 0; k < 70; k++) {
        const gx = x0 + rng() * pw, amp = 4 + rng() * 14, freq = 0.002 + rng() * 0.006, ph = rng() * 6;
        g.strokeStyle = `hsla(${base - 4}, 45%, ${light - 10 - rng() * 8}%, ${0.12 + rng() * 0.2})`;
        g.lineWidth = 1 + rng() * 3;
        g.beginPath();
        for (let y = -TABLE_HALF; y <= TABLE_HALF; y += 20) {
          const xx = gx + Math.sin(y * freq + ph) * amp;
          y === -TABLE_HALF ? g.moveTo(xx, y) : g.lineTo(xx, y);
        }
        g.stroke();
      }
      if (rng() < 0.8) { // budak
        const kx = x0 + pw * (0.2 + rng() * 0.6), ky = -TABLE_HALF + rng() * 2 * TABLE_HALF;
        for (let r = 30; r > 4; r -= 5) {
          g.strokeStyle = `hsla(${base - 6}, 50%, ${light - 18}%, 0.35)`;
          g.lineWidth = 2;
          g.beginPath(); g.ellipse(kx, ky, r * 0.6, r * 1.6, 0, 0, Math.PI * 2); g.stroke();
        }
      }
      g.fillStyle = 'rgba(40,20,5,0.55)';
      g.fillRect(x0 - 2, -TABLE_HALF, 4, 2 * TABLE_HALF);
    }

    // petri kabının gölgesi
    g.save();
    g.shadowColor = 'rgba(30,15,0,0.55)'; g.shadowBlur = 60; g.shadowOffsetX = 30; g.shadowOffsetY = 40;
    g.fillStyle = 'rgba(30,15,0,0.35)';
    g.beginPath(); g.arc(0, 0, this.R + 16, 0, Math.PI * 2); g.fill();
    g.restore();

    drawTea(g, this.R + 260, -this.R + 120);
    drawPencil(g, -this.R - 170, this.R - 160, -1.15);
    drawNote(g, -this.R - 230, -this.R + 30, rng);

    this.table = c;
  }

  // ---------- kamera ----------
  fit(w, h, cy = h / 2) {
    return { x: 0, y: 0, z: Math.min(w, h) / (2 * this.R * 1.12), cy };
  }
  worldToScreen(x, y, w, h) {
    const { cam } = this;
    return [(x - cam.x) * cam.z + w / 2, (y - cam.y) * cam.z + (cam.cy ?? h / 2)];
  }
  screenToWorld(sx, sy, w, h) {
    const { cam } = this;
    return [(sx - w / 2) / cam.z + cam.x, (sy - (cam.cy ?? h / 2)) / cam.z + cam.y];
  }

  // ---------- kare ----------
  draw(sim, w, h, dpr, opts = {}) {
    const ctx = this.ctx, cam = this.cam, R = this.R;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#3b2412';
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, (w / 2 - cam.x * cam.z) * dpr, ((cam.cy ?? h / 2) - cam.y * cam.z) * dpr);

    if (this.table) ctx.drawImage(this.table, -TABLE_HALF, -TABLE_HALF, 2 * TABLE_HALF, 2 * TABLE_HALF);

    // agar
    const ag = ctx.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R);
    ag.addColorStop(0, '#f6ecc6');
    ag.addColorStop(0.75, '#ead9a4');
    ag.addColorStop(1, '#d9c182');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    for (const p of sim.patches) {
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.3);
      pg.addColorStop(0, 'rgba(150,170,70,0.22)');
      pg.addColorStop(1, 'rgba(150,170,70,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.3, 0, Math.PI * 2); ctx.fill();
    }

    // yiyecek
    ctx.fillStyle = '#5f9a3a';
    ctx.beginPath();
    const seeds = [];
    for (const f of sim.foods()) {
      if (f.big) { seeds.push(f); continue; }
      ctx.moveTo(f.x + 3.4, f.y); ctx.arc(f.x, f.y, 3.4, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = '#c98f2c';
    ctx.beginPath();
    for (const f of seeds) { ctx.moveTo(f.x + 6.5, f.y); ctx.ellipse(f.x, f.y, 6.5, 4.4, (f.x * 13) % 3, 0, Math.PI * 2); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,0.7)';
    ctx.beginPath();
    for (const f of seeds) { ctx.moveTo(f.x - 0.8, f.y - 1); ctx.arc(f.x - 1.8, f.y - 1, 1, 0, Math.PI * 2); }
    ctx.fill();

    // felaket rengi
    const A = sim.active;
    if (A) {
      for (const type of A.types) {
        ctx.fillStyle = TINT[type];
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      }
    }

    // kart alanları
    const now = sim.t;
    for (const z of sim.zones) drawZone(ctx, z, Math.min(1, (z.until - now) / 3), z.until - now);

    // yumurtalar
    const S = opts.S || 1;
    const look = new Map();
    const detail = cam.z * dpr * S > 0.55;
    for (const e of sim.eggs) {
      let L = look.get(e.sp);
      if (!L) { const d = sim.displaySpecies(e.sp); L = { hue: d.hue, lin: d.lineage }; look.set(e.sp, L); }
      drawEgg(ctx, e, L, detail, S);
    }

    // avcılar
    for (const p of sim.predators) drawPredator(ctx, p, S);

    // meteorlar: düşmeden 1,5 sn önce hedef halkası, sonra krater
    for (const m of sim.meteors) {
      const dtm = m.t - now;
      if (dtm > 1.5 || dtm < -1.5) continue;
      if (dtm > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 20);
        ctx.strokeStyle = `rgba(220,40,20,${0.5 + 0.4 * pulse})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (0.4 + 0.6 * (1 - dtm / 1.5)), 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
      } else {
        const a = 1 + dtm / 1.5;
        const cg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        cg.addColorStop(0, `rgba(255,220,120,${a})`); cg.addColorStop(0.35, `rgba(240,90,20,${a * 0.8})`);
        cg.addColorStop(1, `rgba(60,30,10,${a * 0.5})`);
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // kart nişanı
    const aim = opts.aim;
    if (aim) drawZone(ctx, { ...aim, until: 0 }, 0.6 + 0.3 * Math.sin(performance.now() / 120), null);

    // seçili yumurta
    const sel = opts.selected;
    if (sel && !sel.dead) {
      const r = radiusOf(sel.g);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(40,40,40,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, visionOf(sel.g), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#e8402a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, r * 1.6 + 4, 0, Math.PI * 2); ctx.stroke();
    }

    // cam kenar
    ctx.lineWidth = 16;
    ctx.strokeStyle = 'rgba(235,245,250,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(0, 0, R + 13, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R - 2, Math.PI * 0.1, Math.PI * 0.3); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(90,110,120,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, R + 14, 0, Math.PI * 2); ctx.stroke();

    // kenar kararması (minyatür hissi)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = this.cv.width, H = this.cv.height;
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,5,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- parçalar ----------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINT = {
  buzul: 'rgba(170,215,255,0.38)',
  sicak: 'rgba(255,120,30,0.22)',
  kitlik: 'rgba(150,100,40,0.22)',
  meteor: 'rgba(60,20,10,0.12)',
  avci: 'rgba(80,0,40,0.1)',
};

// kart alanı: [dolgu, çizgi, simge]
const ZONE = {
  yagmur: ['rgba(95,154,58,0.16)', 'rgba(60,120,30,0.9)', '🍞'],
  isitici: ['rgba(255,140,40,0.2)', 'rgba(220,90,20,0.9)', '🔥'],
  golge: ['rgba(40,70,110,0.2)', 'rgba(30,60,110,0.9)', '⛱️'],
  kalkan: ['rgba(90,170,255,0.18)', 'rgba(40,110,220,0.9)', '🛡️'],
  tuzak: ['rgba(120,70,30,0.16)', 'rgba(110,60,20,0.95)', '🪤'],
};

// a: saydamlık; left: kalan süre (null = önizleme)
function drawZone(ctx, z, a, left) {
  const [fill, line, icon] = ZONE[z.type];
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  if (z.type === 'isitici') {
    const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
    g.addColorStop(0, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,120,30,0.05)');
    ctx.fillStyle = g;
  } else ctx.fillStyle = fill;
  ctx.strokeStyle = line; ctx.lineWidth = 6;
  ctx.setLineDash(z.type === 'tuzak' ? [6, 10] : [16, 10]);
  ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  if (z.type === 'tuzak') {
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(z.x + Math.cos(t) * z.r, z.y + Math.sin(t) * z.r);
      ctx.lineTo(z.x + Math.cos(t) * (z.r - 18), z.y + Math.sin(t) * (z.r - 18));
      ctx.stroke();
    }
  }
  ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(icon, z.x, z.y - z.r + 34);
  if (left !== null) {
    ctx.strokeStyle = line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(z.x, z.y - z.r + 34, 30, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * left) / 30); ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function drawPredator(ctx, p, S) {
  const r = 5 * p.size * S;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(p.h);
  ctx.fillStyle = 'rgba(40,10,10,0.3)';
  ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.4, r * 1.4, r * 1.05, 0, 0, Math.PI * 2); ctx.fill();
  // dikenli sırt
  ctx.fillStyle = '#3f1d4f';
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, rr = i % 2 ? r * 1.0 : r * 1.35;
    ctx.lineTo(Math.cos(a) * rr * 1.15, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7b2d8f';
  eggPath(ctx, r * 0.95); ctx.fill();
  // gözler + dişler
  ctx.fillStyle = '#ffe14a';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.55, s * r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#111';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.6, s * r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) { ctx.moveTo(r * 1.15, i * r * 0.14); ctx.lineTo(r * 1.4, i * r * 0.14 + r * 0.06); ctx.lineTo(r * 1.15, i * r * 0.14 + r * 0.12); }
  ctx.fill();
  ctx.restore();
}

function drawEgg(ctx, e, L, detail, S = 1) {
  const r = radiusOf(e.g) * S;
  const shade = 54 + ((e.id * 7919) % 13);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.h);
  ctx.fillStyle = 'rgba(60,35,5,0.28)';
  ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.4, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsl(${L.hue},62%,${shade}%)`;
  eggPath(ctx, r);
  ctx.fill();
  if (detail) {
    ctx.lineWidth = Math.max(0.6, r * 0.12);
    ctx.strokeStyle = `hsl(${L.hue},45%,${shade - 22}%)`;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.42, r * 0.5, r * 0.24, -0.2, 0, Math.PI * 2); ctx.fill();
    if (L.lin === 'Çatlak') {
      ctx.strokeStyle = 'rgba(30,25,20,0.75)';
      ctx.lineWidth = Math.max(0.6, r * 0.13);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0.1 * r); ctx.lineTo(-r * 0.35, -r * 0.25); ctx.lineTo(0, r * 0.15);
      ctx.lineTo(r * 0.35, -r * 0.2); ctx.lineTo(r * 0.6, r * 0.05);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(25,20,18,0.85)';
      ctx.beginPath(); ctx.arc(r * 0.05, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(90,30,25,0.95)';
      ctx.beginPath(); ctx.arc(r * 0.05, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
    if (e.g.speed > 1.7) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(0.5, r * 0.12);
      ctx.beginPath();
      for (const o of [-0.4, 0.4]) { ctx.moveTo(-r * 1.6, o * r); ctx.lineTo(-r * (1.6 + e.g.speed * 0.5), o * r); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function eggPath(ctx, r) {
  // ön tarafı (hareket yönü) sivri yumurta
  ctx.beginPath();
  ctx.moveTo(r * 1.35, 0);
  ctx.bezierCurveTo(r * 1.3, r * 0.75, r * 0.4, r * 1.0, -r * 0.3, r * 1.0);
  ctx.bezierCurveTo(-r * 1.0, r * 1.0, -r * 1.15, r * 0.45, -r * 1.15, 0);
  ctx.bezierCurveTo(-r * 1.15, -r * 0.45, -r * 1.0, -r * 1.0, -r * 0.3, -r * 1.0);
  ctx.bezierCurveTo(r * 0.4, -r * 1.0, r * 1.3, -r * 0.75, r * 1.35, 0);
  ctx.closePath();
}

function drawTea(g, x, y) {
  g.save();
  g.translate(x, y);
  g.shadowColor = 'rgba(30,15,0,0.5)'; g.shadowBlur = 40; g.shadowOffsetX = 22; g.shadowOffsetY = 28;
  // tabak
  g.fillStyle = '#f4f1ea';
  g.beginPath(); g.arc(0, 0, 175, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = '#c8202a'; g.lineWidth = 10;
  g.beginPath(); g.arc(0, 0, 160, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#d9a640'; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, 148, 0, Math.PI * 2); g.stroke();
  // ince belli bardak (üstten)
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.fill();
  const tg = g.createRadialGradient(-25, -30, 10, 0, 0, 100);
  tg.addColorStop(0, '#d0461c'); tg.addColorStop(0.6, '#9c2a0d'); tg.addColorStop(1, '#5e1505');
  g.fillStyle = tg;
  g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 8;
  g.beginPath(); g.arc(0, 0, 90, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  // kaşık
  g.fillStyle = '#c9ccd1';
  g.beginPath(); g.ellipse(150, 110, 22, 13, 0.62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#b5b8bd'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(130, 96); g.lineTo(-10, -5); g.stroke();
  g.restore();
}

function drawPencil(g, x, y, a) {
  g.save();
  g.translate(x, y); g.rotate(a);
  g.shadowColor = 'rgba(30,15,0,0.5)'; g.shadowBlur = 20; g.shadowOffsetX = 14; g.shadowOffsetY = 18;
  const L = 640, Wd = 38;
  g.fillStyle = '#f2b51d';
  g.fillRect(-L / 2, -Wd / 2, L, Wd);
  g.shadowColor = 'transparent';
  g.fillStyle = '#d99a0f'; g.fillRect(-L / 2, Wd / 6, L, Wd / 3);
  g.fillStyle = '#ffd35a'; g.fillRect(-L / 2, -Wd / 2, L, Wd / 5);
  g.fillStyle = '#e9c79a';
  g.beginPath(); g.moveTo(L / 2, -Wd / 2); g.lineTo(L / 2 + 90, 0); g.lineTo(L / 2, Wd / 2); g.fill();
  g.fillStyle = '#2b2b2b';
  g.beginPath(); g.moveTo(L / 2 + 62, -6); g.lineTo(L / 2 + 90, 0); g.lineTo(L / 2 + 62, 6); g.fill();
  g.fillStyle = '#b9bcc0'; g.fillRect(-L / 2 - 50, -Wd / 2, 50, Wd);
  g.fillStyle = '#e88b9a'; g.fillRect(-L / 2 - 100, -Wd / 2, 52, Wd);
  g.restore();
}

function drawNote(g, x, y, rng) {
  g.save();
  g.translate(x, y); g.rotate(-0.12);
  g.shadowColor = 'rgba(30,15,0,0.4)'; g.shadowBlur = 18; g.shadowOffsetX = 10; g.shadowOffsetY = 14;
  g.fillStyle = '#fbf6e4';
  g.fillRect(-150, -110, 300, 220);
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(80,120,190,0.35)'; g.lineWidth = 2;
  for (let yy = -60; yy < 110; yy += 30) { g.beginPath(); g.moveTo(-140, yy); g.lineTo(140, yy); g.stroke(); }
  g.fillStyle = '#2c3a6b';
  g.font = `700 40px ${FONT_HAND}`;
  g.fillText('Gün 1:', -130, -20);
  g.fillText('20 yumurta.', -130, 15);
  g.fillText('Ne olacak?', -130, 50);
  g.restore();
}

export function tapeRect(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= 6; i++) ctx.lineTo(x + (i % 2 ? 6 : 0), y + (h * i) / 6);
  ctx.lineTo(x + w, y + h);
  for (let i = 5; i >= 0; i--) ctx.lineTo(x + w - (i % 2 ? 6 : 0), y + (h * i) / 6);
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function outlined(ctx, text, x, y, lw, fill = '#fff') {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#111';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// beyaz metin + sarı sayı (+ isteğe bağlı beyaz kuyruk), ortalı
export function outlinedPair(ctx, pre, num, cx, y, font, lw, post = '') {
  ctx.font = font;
  ctx.textAlign = 'left';
  const a = ctx.measureText(pre).width, b = ctx.measureText(num).width, c = ctx.measureText(post).width;
  let x = cx - (a + b + c) / 2;
  if (pre) outlined(ctx, pre, x, y, lw);
  outlined(ctx, num, x + a, y, lw, '#ffd23a');
  if (post) outlined(ctx, post, x + a + b, y, lw);
}

export function wrapOutlined(ctx, text, cx, y, maxW, font, lh) {
  ctx.font = font;
  ctx.textAlign = 'center';
  const words = text.split(/\s+/);
  let line = '', lines = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    // sayılar sarı
    const parts = l.split(/(\d[\d.,%]*)/);
    const total = parts.reduce((a, p) => a + ctx.measureText(p).width, 0);
    let x = cx - total / 2;
    ctx.textAlign = 'left';
    for (const p of parts) {
      if (!p) continue;
      outlined(ctx, p, x, y + i * lh, 12, /^\d/.test(p) ? '#ffd23a' : '#fff');
      x += ctx.measureText(p).width;
    }
  });
}

export function drawToast(ctx, toast, age, W) {
  const pop = Math.min(1, age / 220);
  const s = 0.6 + 0.4 * easeOutBack(pop);
  const fade = age > 2800 ? 1 - (age - 2800) / 400 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(W / 2, toast.y || 1460);
  ctx.rotate(-0.04);
  ctx.scale(s, s);
  const w = 900, h = 200;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fbf6e4';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  const isNew = toast.type === 'new';
  ctx.fillStyle = `hsl(${toast.hue},62%,58%)`;
  ctx.beginPath(); ctx.ellipse(-w / 2 + 100, 0, 58, 44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = `hsl(${toast.hue},45%,32%)`; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `800 52px ${FONT_BIG}`;
  ctx.fillStyle = isNew ? '#d8331f' : '#555';
  ctx.fillText(isNew ? 'YENİ TÜR!' : 'SOYU TÜKENDİ', -w / 2 + 190, -40);
  ctx.font = `800 ${toast.text.length > 22 ? 44 : 54}px ${FONT_BIG}`;
  ctx.fillStyle = '#1d1d1d';
  ctx.fillText(toast.text, -w / 2 + 190, 32, w - 220);
  if (!isNew) {
    const tw = Math.min(ctx.measureText(toast.text).width, w - 220);
    ctx.fillRect(-w / 2 + 186, 34, tw + 8, 6);
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
