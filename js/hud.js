// Yumurta Evrimi · oyun ekranı (1080×1920 tuval üstüne çizilir, kayda da girer)
import { CARDS, DISASTERS, GENES } from './sim.js';
import { FONT_BIG, FONT_HAND, outlined, outlinedPair, roundRect, tapeRect, drawToast, eggPath } from './render.js';

export const W = 1080, H = 1920;
export const DISH = { cy: 945, z: 0.97, top: 460, bottom: 1460 };
export const CARD_KEYS = Object.keys(CARDS);
const CW = 196, CH = 236, GAP = 10, CX0 = (W - (5 * CW + 4 * GAP)) / 2, CY = 1656;
export const cardRect = (i) => ({ x: CX0 + i * (CW + GAP), y: CY, w: CW, h: CH });
export const BTN = { pause: { x: 24, y: 24, w: 110, h: 84 }, speed: { x: W - 134, y: 24, w: 110, h: 84 } };
export const START_BTN = { Çatlak: { x: 130, y: 790, w: 340, h: 400 }, Patlak: { x: 610, y: 790, w: 340, h: 400 } };
export const OVER_BTN = {
  again: { x: 140, y: 1290, w: 800, h: 140 }, share: { x: 140, y: 1460, w: 800, h: 140 },
  board: { x: 140, y: 1630, w: 800, h: 140 },
};
export const NAME_BOX = { x: 160, y: 565, w: 760, h: 100 };   // isim kutusu (DOM input buraya oturur)
export const START_BOARD = { x: 290, y: 1650, w: 500, h: 110 };
export const BOARD_BTN = {
  all: { x: 90, y: 250, w: 440, h: 96 }, week: { x: 550, y: 250, w: 440, h: 96 },
  back: { x: 240, y: 1730, w: 600, h: 130 },
};
export const DRAG_LIFT = 150;   // sürüklerken alan parmağın bu kadar üstüne düşer
export const hit = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const DZ_COL = { kitlik: '#a5762d', buzul: '#2f7fd6', sicak: '#e0602a', meteor: '#b8321f', avci: '#6b2d8f' };
const GENE_UI = { speed: ['🏃', 'hız', '#e0602a'], size: ['🥚', 'boy', '#2f6fd0'], vision: ['👁', 'görüş', '#3a9a4a'] };
const TEAM_HUE = { Çatlak: 212, Patlak: 4 };

function paperButton(ctx, r, label, dark = false, size = 46) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = dark ? '#23232b' : '#fbf6e4';
  roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = '#23232b';
  roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.stroke();
  ctx.fillStyle = dark ? '#fff' : '#23232b';
  ctx.font = `800 ${size}px ${FONT_BIG}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 3);
  ctx.textBaseline = 'alphabetic';
}

function bigEgg(ctx, x, y, r, team) {
  const hue = TEAM_HUE[team];
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(-r * 0.15, r * 0.25, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsl(${hue},62%,60%)`;
  eggPath(ctx, r); ctx.fill();
  ctx.lineWidth = r * 0.08; ctx.strokeStyle = `hsl(${hue},45%,30%)`; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(r * 0.3, -r * 0.45, r * 0.45, r * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (team === 'Çatlak') {
    ctx.strokeStyle = '#1e1a16'; ctx.lineWidth = r * 0.09; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.75, y - r * 0.1); ctx.lineTo(x - r * 0.4, y - r * 0.4); ctx.lineTo(x - r * 0.05, y - r * 0.05);
    ctx.lineTo(x + r * 0.3, y - r * 0.35); ctx.lineTo(x + r * 0.7, y - r * 0.15);
    ctx.stroke();
    // bıyık
    ctx.fillStyle = '#2a1d14';
    ctx.beginPath(); ctx.ellipse(x - r * 0.22, y + r * 0.3, r * 0.26, r * 0.1, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.22, y + r * 0.3, r * 0.26, r * 0.1, -0.25, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#231a18';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.95, r * 0.9, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, x - r * 0.55, y - r * 1.55, r * 1.1, r * 0.65, r * 0.2); ctx.fill();
    ctx.fillStyle = '#8a2a20'; ctx.fillRect(x - r * 0.55, y - r * 1.08, r * 1.1, r * 0.13);
  }
  // gözler
  ctx.fillStyle = '#111';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.28, y - r * 0.05, r * 0.08, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- oyun sırasında ----------
export function drawHUD(ctx, sim, ui) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const A = sim.active, N = sim.next;

  paperButton(ctx, BTN.pause, ui.paused ? '▶' : '⏸');
  paperButton(ctx, BTN.speed, `${ui.speed}×`, false, 40);

  ctx.save();
  ctx.translate(W / 2, 66); ctx.rotate(-0.025);
  ctx.font = `700 46px ${FONT_HAND}`;
  const tag = `YUMURTA EVRİMİ · ${sim.cfg.team.toLocaleUpperCase('tr')} TAKIMI`;
  const tw = ctx.measureText(tag).width + 60;
  ctx.fillStyle = 'rgba(244,226,150,0.94)';
  tapeRect(ctx, -tw / 2, -34, tw, 68);
  ctx.fillStyle = '#2b2116'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 2);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  outlinedPair(ctx, 'NESİL ', String(sim.maxGen), W / 2, 236, `800 124px ${FONT_BIG}`, 14);
  outlinedPair(ctx, 'REKOR ', String(Math.max(ui.best, sim.maxGen)), W / 2, 310, `800 44px ${FONT_BIG}`, 8,
    ` · ${sim.eggs.length} yumurta · ${sim.liveSpecies().length} tür`);

  // felaket şeridi
  const bx = 40, by = 340, bw = W - 80, bh = 108;
  const title = (D) => D.types.map((t) => `${DISASTERS[t].icon} ${DISASTERS[t].name}`).join(' + ');
  const answer = (D) => D.types.map((t) => { const C = CARDS[DISASTERS[t].card]; return `${C.icon} ${C.name}`; }).join(' + ');
  if (A) {
    if (A.types.length > 1) {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, DZ_COL[A.types[0]]); g.addColorStop(1, DZ_COL[A.types[1]]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = DZ_COL[A.types[0]];
    roundRect(ctx, bx, by, bw, bh, 20); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx + 20, by + bh - 14, (bw - 40) * Math.max(0, (A.end - sim.t) / (A.end - A.start)), 6);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = `800 ${A.types.length > 1 ? 36 : 48}px ${FONT_BIG}`;
    ctx.fillText(title(A), bx + 26, by + 56, bw - 200);
    ctx.font = `500 30px ${FONT_BIG}`;
    ctx.fillText(`Karşı kart: ${answer(A)}`, bx + 26, by + 92, bw - 52);
    ctx.textAlign = 'right'; ctx.font = `800 48px ${FONT_BIG}`;
    ctx.fillText(`${Math.ceil((A.end - sim.t) / ui.speed)} sn`, bx + bw - 26, by + 56);
  } else if (N && N.warned) {
    const pulse = 0.5 + 0.5 * Math.sin(ui.now / 160);
    ctx.fillStyle = '#fbf6e4';
    roundRect(ctx, bx, by, bw, bh, 20); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = `rgba(216,51,31,${0.5 + 0.5 * pulse})`;
    roundRect(ctx, bx, by, bw, bh, 20); ctx.stroke();
    ctx.fillStyle = '#23232b'; ctx.textAlign = 'left';
    ctx.font = `800 ${N.types.length > 1 ? 34 : 44}px ${FONT_BIG}`;
    ctx.fillText(`⚠ ${Math.ceil((N.start - sim.t) / ui.speed)} sn sonra: ${title(N)}`, bx + 26, by + 54, bw - 52);
    ctx.font = `500 30px ${FONT_BIG}`; ctx.fillStyle = '#7a2a1a';
    ctx.fillText(`Hazırla: ${answer(N)}`, bx + 26, by + 92, bw - 52);
  } else {
    ctx.font = `700 46px ${FONT_HAND}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Sakin dönem · soyunu hazırla', W / 2, by + 66);
  }

  // genler ya da kart ipucu
  const gy = 1478;
  if (ui.sel) {
    const C = CARDS[ui.sel];
    ctx.font = `800 44px ${FONT_BIG}`; ctx.textAlign = 'center';
    outlined(ctx, `${C.icon} ${C.name}: kaba sürükle ya da dokun`, W / 2, gy + 40, 9, '#ffd23a');
    ctx.font = `500 32px ${FONT_BIG}`;
    outlined(ctx, C.tip, W / 2, gy + 86, 7);
  } else {
    const n = sim.eggs.length || 1;
    GENES.forEach((k, i) => {
      const x = 40 + i * 340, [icon, label, col] = GENE_UI[k];
      let sum = 0, lo = 9, hi = 0;
      for (const e of sim.eggs) { const v = e.g[k]; sum += v; if (v < lo) lo = v; if (v > hi) hi = v; }
      const mean = sum / n;
      ctx.font = `800 34px ${FONT_BIG}`; ctx.textAlign = 'left';
      outlined(ctx, `${icon} ${label} ${sim.eggs.length ? mean.toFixed(2) : '-'}`, x, gy + 38, 7);
      const bw2 = 300, X = (v) => x + (Math.min(3.2, v) / 3.2) * bw2;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, x, gy + 58, bw2, 18, 9); ctx.fill();
      if (sim.eggs.length) {
        ctx.fillStyle = col; ctx.globalAlpha = 0.55;
        roundRect(ctx, X(lo), gy + 58, Math.max(10, X(hi) - X(lo)), 18, 9); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
        ctx.fillRect(X(mean) - 3, gy + 52, 6, 30);
      }
    });
  }

  // deney puanı
  const dy = 1612;
  ctx.font = `700 44px ${FONT_HAND}`; ctx.textAlign = 'left';
  outlined(ctx, 'Deney puanı', 40, dy + 14, 6);
  for (let i = 0; i < sim.cfg.dpMax; i++) {
    const cx = 300 + i * 74;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(cx, dy, 24, 0, Math.PI * 2); ctx.fill();
    let f = i < sim.dp ? 1 : i === sim.dp ? sim.dpT / sim.cfg.dpEvery : 0;
    if (f > 0) {
      ctx.fillStyle = f === 1 ? '#ffd23a' : 'rgba(255,210,58,0.45)';
      ctx.beginPath(); ctx.moveTo(cx, dy); ctx.arc(cx, dy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, dy, 24, 0, Math.PI * 2); ctx.stroke();
  }

  // kartlar
  const need = new Set([...(A ? A.types : []), ...(N && N.warned ? N.types : [])].map((t) => DISASTERS[t].card));
  CARD_KEYS.forEach((key, i) => {
    const C = CARDS[key], r = cardRect(i), sel = ui.sel === key;
    const poor = sim.dp < C.cost, wanted = need.has(key);
    const y = r.y - (sel ? 26 : wanted ? 10 + 8 * Math.sin(ui.now / 140) : 0);
    ctx.save();
    if (wanted && !sel) {
      ctx.fillStyle = `rgba(255,210,58,${0.45 + 0.3 * Math.sin(ui.now / 140)})`;
      roundRect(ctx, r.x - 10, y - 10, r.w + 20, r.h + 20, 24); ctx.fill();
    }
    ctx.globalAlpha = poor && !sel ? 0.55 : 1;
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fbf6e4';
    roundRect(ctx, r.x, y, r.w, r.h, 18); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = sel ? 8 : 5; ctx.strokeStyle = sel ? '#d8331f' : '#23232b';
    roundRect(ctx, r.x, y, r.w, r.h, 18); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `86px ${FONT_BIG}`;
    ctx.fillStyle = '#000';
    ctx.fillText(C.icon, r.x + r.w / 2, y + 108);
    ctx.font = `800 ${C.name.length > 8 ? 25 : 30}px ${FONT_BIG}`;
    ctx.fillStyle = '#23232b';
    ctx.fillText(C.name, r.x + r.w / 2, y + 166, r.w - 18);
    const D = DISASTERS[C.counters];
    ctx.font = `500 24px ${FONT_BIG}`; ctx.fillStyle = '#7a2a1a';
    ctx.fillText(`${D.icon} karşı`, r.x + r.w / 2, y + 208, r.w - 18);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(r.x + r.w - 26, y + 28, 26, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#23232b'; ctx.stroke();
    ctx.fillStyle = '#23232b'; ctx.font = `800 32px ${FONT_BIG}`;
    ctx.fillText(C.cost, r.x + r.w - 26, y + 40);
    ctx.restore();
  });

  // sürüklenen kart parmağın biraz üstünde durur, alan oraya düşer
  if (ui.drag && ui.drag.moved) {
    const C = CARDS[ui.drag.key];
    ctx.save();
    ctx.translate(ui.drag.x, ui.drag.y - DRAG_LIFT);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(251,246,228,0.92)';
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 5; ctx.strokeStyle = '#d8331f'; ctx.stroke();
    ctx.font = `70px ${FONT_BIG}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(C.icon, 0, 4);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  if (ui.toast) {
    if (ui.now - ui.toast.at > 3200) ui.toast = null;
    else drawToast(ctx, { ...ui.toast, y: 1290 }, ui.now - ui.toast.at, W);
  }
  drawFlash(ctx, ui);
}

function drawFlash(ctx, ui) {
  const f = ui.flash;
  if (!f) return;
  const age = ui.now - f.at;
  if (age > 1800) { ui.flash = null; return; }
  const s = 0.7 + 0.3 * Math.min(1, age / 180);
  ctx.save();
  ctx.globalAlpha = age > 1400 ? 1 - (age - 1400) / 400 : 1;
  ctx.translate(W / 2, 780); ctx.rotate(-0.05); ctx.scale(s, s);
  ctx.font = `800 ${f.size || 104}px ${FONT_BIG}`; ctx.textAlign = 'center';
  outlined(ctx, f.text, 0, 0, 18, f.color || '#fff');
  ctx.restore();
}

// ---------- başlangıç ----------
export function drawStart(ctx, ui) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20,10,4,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = `800 128px ${FONT_BIG}`;
  outlined(ctx, 'YUMURTA', W / 2, 260, 18);
  outlined(ctx, 'EVRİMİ', W / 2, 390, 18, '#ffd23a');
  ctx.font = `700 60px ${FONT_HAND}`;
  outlined(ctx, 'Soyunu kaç nesil yaşatabilirsin?', W / 2, 500, 8);
  ctx.font = `800 46px ${FONT_BIG}`;
  outlined(ctx, 'Takımını seç', W / 2, 760, 8);

  const bob = Math.sin(ui.now / 300) * 10;
  for (const team of ['Çatlak', 'Patlak']) {
    const r = START_BTN[team];
    ctx.fillStyle = 'rgba(251,246,228,0.12)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 30); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 30); ctx.stroke();
    bigEgg(ctx, r.x + r.w / 2, r.y + 190 + (team === 'Çatlak' ? bob : -bob), 100, team);
    ctx.font = `800 62px ${FONT_BIG}`;
    outlined(ctx, team.toLocaleUpperCase('tr'), r.x + r.w / 2, r.y + r.h - 40, 10, `hsl(${TEAM_HUE[team]},70%,70%)`);
  }

  // isim kutusunun kâğıdı (içine DOM input oturur)
  ctx.fillStyle = '#fbf6e4';
  roundRect(ctx, NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h, 18); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = ui.nameNeeded ? '#d8331f' : '#23232b';
  roundRect(ctx, NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h, 18); ctx.stroke();
  ctx.textAlign = 'center';
  if (ui.best) outlinedPair(ctx, 'Rekorun: ', `${ui.best}`, W / 2, 1275, `800 46px ${FONT_BIG}`, 8, ' nesil');
  const lines = ['🃏 Her felaketin bir karşı kartı var', '👆 Kartı kaba sürükle, alanı korusun', '🏆 Skorun: ulaştığın nesil'];
  ctx.font = `700 48px ${FONT_HAND}`; ctx.textAlign = 'left';
  lines.forEach((l, i) => outlined(ctx, l, 170, 1375 + i * 72, 7));
  if (ui.online) paperButton(ctx, START_BOARD, '🏆 Sıralama', false, 46);
  ctx.textAlign = 'center'; ctx.font = `700 40px ${FONT_HAND}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('kadomakesgames', W / 2, H - 60);
}

// ---------- oyun sonu ----------
export function drawOver(ctx, sim, ui) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20,10,4,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = `800 92px ${FONT_BIG}`;
  outlined(ctx, 'SOYUN TÜKENDİ', W / 2, 300, 14, '#ff7a5c');
  outlinedPair(ctx, 'NESİL ', String(sim.maxGen), W / 2, 560, `800 190px ${FONT_BIG}`, 20);
  if (ui.newBest) {
    ctx.save();
    ctx.translate(W / 2, 700); ctx.rotate(-0.06);
    ctx.font = `800 72px ${FONT_BIG}`; ctx.textAlign = 'center';
    const sw = ctx.measureText('YENİ REKOR!').width + 70;
    ctx.lineWidth = 8; ctx.strokeStyle = '#d8331f';
    roundRect(ctx, -sw / 2, -62, sw, 110, 14); ctx.stroke();
    ctx.fillStyle = '#ff5a3c';
    ctx.fillText('YENİ REKOR!', 0, 18);
    ctx.restore();
  } else {
    outlinedPair(ctx, 'Rekorun: ', `${ui.best}`, W / 2, 700, `800 56px ${FONT_BIG}`, 9);
  }
  const m = Math.floor(sim.t / 60), s = Math.floor(sim.t % 60);
  const stats = [
    `Atlatılan felaket: ${ui.survived}`,
    `Ortaya çıkan tür: ${sim.namedCount()}`,
    `Kullanılan kart: ${sim.actions.length}`,
    `Deney süresi: ${m}:${String(s).padStart(2, '0')}`,
  ];
  ctx.font = `700 54px ${FONT_HAND}`; ctx.textAlign = 'center';
  stats.forEach((l, i) => outlined(ctx, l, W / 2, 870 + i * 82, 7));
  if (ui.online) {
    ctx.font = `800 46px ${FONT_BIG}`; ctx.textAlign = 'center';
    const msg = ui.rank ? `🏆 Sıralamada ${ui.rank.rank}. oldun (${ui.rank.players} oyuncu)` : ui.rankMsg || '';
    if (msg) outlined(ctx, msg, W / 2, 1220, 8, '#ffd23a');
    paperButton(ctx, OVER_BTN.board, '🏆 Sıralama', false, 56);
  }
  paperButton(ctx, OVER_BTN.again, 'Tekrar oyna', true, 56);
  paperButton(ctx, OVER_BTN.share, ui.shareMsg || 'Skorunu paylaş', false, 56);
}

// ---------- sıralama ----------
export function drawBoard(ctx, ui) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20,10,4,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = `800 96px ${FONT_BIG}`;
  outlined(ctx, '🏆 SIRALAMA', W / 2, 180, 14, '#ffd23a');
  paperButton(ctx, BOARD_BTN.all, 'Tüm zamanlar', ui.boardPeriod === 'all', 40);
  paperButton(ctx, BOARD_BTN.week, 'Bu hafta', ui.boardPeriod === 'week', 40);

  const b = ui.board;
  if (!b) {
    ctx.font = `700 56px ${FONT_HAND}`;
    outlined(ctx, ui.boardMsg || 'Yükleniyor…', W / 2, 700, 7);
  } else {
    // takım savaşı: her oyuncunun en iyi skoru takımına eklenir
    const c = b.teams?.Çatlak?.total || 0, p = b.teams?.Patlak?.total || 0;
    const share = c + p ? c / (c + p) : 0.5;   // skor yokken çubuk ortada
    const tx = 90, ty = 400, tw = 900;
    ctx.save();
    roundRect(ctx, tx, ty, tw, 70, 35); ctx.clip();
    ctx.fillStyle = `hsl(${TEAM_HUE.Patlak},62%,55%)`; ctx.fillRect(tx, ty, tw, 70);
    ctx.fillStyle = `hsl(${TEAM_HUE.Çatlak},62%,55%)`; ctx.fillRect(tx, ty, tw * share, 70);
    ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; roundRect(ctx, tx, ty, tw, 70, 35); ctx.stroke();
    ctx.font = `800 38px ${FONT_BIG}`;
    ctx.textAlign = 'left'; outlined(ctx, `ÇATLAK ${c}`, tx + 24, ty + 49, 7);
    ctx.textAlign = 'right'; outlined(ctx, `${p} PATLAK`, tx + tw - 24, ty + 49, 7);

    ctx.font = `800 44px ${FONT_BIG}`;
    if (!b.top.length) { ctx.textAlign = 'center'; outlined(ctx, 'Henüz skor yok. İlk sen ol!', W / 2, 700, 8); }
    b.top.slice(0, 13).forEach((row, i) => {
      const y = 580 + i * 86, me = ui.name && row.name.toLowerCase() === ui.name.toLowerCase();
      ctx.fillStyle = me ? 'rgba(255,210,58,0.28)' : i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
      roundRect(ctx, 70, y - 58, W - 140, 78, 16); ctx.fill();
      ctx.textAlign = 'left';
      outlined(ctx, `${i + 1}.`, 95, y, 7, i < 3 ? '#ffd23a' : '#fff');
      ctx.fillStyle = `hsl(${TEAM_HUE[row.team] ?? 40},62%,60%)`;
      ctx.beginPath(); ctx.ellipse(215, y - 16, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
      outlined(ctx, row.name, 260, y, 7);
      ctx.textAlign = 'right';
      outlined(ctx, String(row.score), W - 95, y, 7, '#ffd23a');
    });
  }
  paperButton(ctx, BOARD_BTN.back, 'Geri', true, 52);
}

// ---------- ilk oyun rehberi: gereken kartı kaba sürükleyen el ----------
export function drawTutorial(ctx, sim, ui) {
  const A = sim.active, N = sim.next;
  const types = A ? A.types : N && N.warned ? N.types : null;
  if (!types || ui.drag || ui.sel) return;
  const key = DISASTERS[types[0]].card, i = CARD_KEYS.indexOf(key), r = cardRect(i);
  const t = (ui.now % 1800) / 1800, e = t < 0.75 ? t / 0.75 : 1;
  const ease = e * e * (3 - 2 * e);
  const x0 = r.x + r.w / 2, y0 = r.y + r.h / 2, x1 = W / 2, y1 = DISH.cy;
  const x = x0 + (x1 - x0) * ease, y = y0 + (y1 - y0) * ease;
  ctx.save();
  ctx.globalAlpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
  ctx.font = `800 52px ${FONT_BIG}`; ctx.textAlign = 'center';
  outlined(ctx, `${CARDS[key].icon} kartını kaba sürükle!`, W / 2, 560, 10, '#ffd23a');
  ctx.font = `120px ${FONT_BIG}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('👆', x + 20, y + 40);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}
