// Yumurta Evrimi · oyun döngüsü, dokunma, rekor, paylaşım ve kayıt
import { Sim, CARDS, DISASTERS } from './sim.js';
import { Renderer } from './render.js';
import * as HUD from './hud.js';
import * as NET from './net.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const { W, H, DISH } = HUD;
const SPEEDS = [2, 4, 8];
const GAME_URL = 'https://kadobaba55.github.io/yumurta-evrimi/';

const canvas = $('world');
canvas.width = W; canvas.height = H;
const R = new Renderer(canvas);
const homeCam = () => ({ x: 0, y: 0, z: DISH.z, cy: DISH.cy });

const st = {
  sim: null, mode: 'start', paused: false, speed: 4, acc: 0,
  sel: null, aim: null, drag: null, toast: null, flash: null, now: 0,
  best: +load('yumurta_rekor') || 0, newBest: false, survived: 0, shareMsg: '', team: 'Çatlak',
  name: load('yumurta_isim') || '', nameNeeded: false, tutor: !load('yumurta_ogrendi'),
  online: NET.enabled(), rank: null, rankMsg: '', board: null, boardPeriod: 'all', boardMsg: '', boardFrom: 'start',
};

function load(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function save(k, v) {
  try { localStorage.setItem(k, String(v)); } catch { /* gizli sekme */ }
}

// isim kutusu: başlangıç ekranında tuvalin üstüne oturan gerçek input
const nameInput = $('name');
nameInput.value = st.name;
nameInput.oninput = () => {
  st.name = nameInput.value.replace(/[^\p{L}\p{N}_.@ -]/gu, '').slice(0, 20);
  if (st.name !== nameInput.value) nameInput.value = st.name;
  st.nameNeeded = false;
  save('yumurta_isim', st.name.trim());
};
nameInput.onkeydown = (ev) => { if (ev.key === 'Enter') nameInput.blur(); };
nameInput.onfocus = () => (st.nameFocus = true);
nameInput.onblur = () => { st.nameFocus = false; window.scrollTo(0, 0); };
function placeName() {
  const show = st.mode === 'start';
  nameInput.hidden = !show;
  if (!show || st.nameFocus) return;   // yazarken yerini oynatma
  const r = canvas.getBoundingClientRect(), k = r.width / W, b = HUD.NAME_BOX;
  Object.assign(nameInput.style, {
    left: `${r.left + b.x * k}px`, top: `${r.top + b.y * k}px`,
    width: `${b.w * k}px`, height: `${b.h * k}px`,
  });
}
const newSeed = () => +params.get('seed') || 1 + Math.floor(Math.random() * 999999);

// ---------- akış ----------
function showStart() {
  st.mode = 'start';
  st.sim = new Sim(newSeed(), { team: Math.random() < 0.5 ? 'Çatlak' : 'Patlak' }); // arkada akan vitrin
  R.bake(st.sim);
  st.evIdx = st.sim.events.length;
}
function startGame(team) {
  st.name = st.name.trim();
  if (!st.name) {
    st.nameNeeded = true;
    st.flash = { text: 'Önce adını yaz ✍️', at: st.now, size: 80 };
    nameInput.focus();
    return;
  }
  nameInput.blur();
  st.team = team;
  st.sim = new Sim(newSeed(), { team });
  R.bake(st.sim);
  Object.assign(R.cam, homeCam());
  st.mode = 'play'; st.paused = false; st.sel = null; st.aim = null;
  st.toast = null; st.flash = { text: 'BAŞLA!', at: st.now, color: '#ffd23a' };
  st.survived = 0; st.newBest = false; st.shareMsg = ''; st.acc = 0; st.evIdx = 0;
}
function endGame() {
  st.mode = 'over'; st.sel = null; st.aim = null; st.drag = null;
  const score = st.sim.maxGen;
  st.newBest = score > st.best;
  if (st.newBest) { st.best = score; save('yumurta_rekor', score); }
  st.rank = null; st.rankMsg = '';
  if (!st.online) return;
  const s = st.sim;
  st.rankMsg = 'Skor gönderiliyor…';
  NET.submitScore({ name: st.name, team: s.cfg.team, score, seed: s.seed, simt: Math.round(s.t), cards: s.actions.length })
    .then((r) => { st.rank = r; })
    .catch(() => { st.rankMsg = 'Skor gönderilemedi'; });
}

function openBoard(from) {
  st.mode = 'board'; st.boardFrom = from;
  loadBoard(st.boardPeriod);
}
function loadBoard(period) {
  st.boardPeriod = period; st.board = null; st.boardMsg = '';
  NET.fetchBoard(period).then((b) => { st.board = b; }).catch(() => { st.boardMsg = 'Sıralama yüklenemedi'; });
}

async function share() {
  const s = st.sim;
  const text = `Yumurta Evrimi'nde ${s.cfg.team} soyum ${s.maxGen} nesil yaşadı 🥚 ` +
    `${st.survived} felaket atlattım. Rekorum ${st.best}. Sen geçebilir misin? ${GAME_URL}`;
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
  } catch { /* iptal ya da izin yok */ }
  try { await navigator.clipboard.writeText(text); st.shareMsg = 'Kopyalandı ✓'; }
  catch { st.shareMsg = 'Paylaşılamadı'; }
  setTimeout(() => (st.shareMsg = ''), 2000);
}

// ---------- olaylar ----------
function onEvent(ev) {
  if (st.mode !== 'play') return;
  const sim = st.sim;
  if (ev.type === 'new') {
    const sp = sim.species.get(ev.sp);
    st.toast = { type: 'new', text: ev.text, hue: sp.hue, at: st.now };
  } else if (ev.type === 'dz') {
    st.flash = { text: ev.dz.map((t) => `${DISASTERS[t].icon} ${DISASTERS[t].name}`).join(' + ') + '!', at: st.now, size: ev.dz.length > 1 ? 64 : 92 };
    navigator.vibrate?.(120);
  } else if (ev.type === 'warn') {
    navigator.vibrate?.([40, 60, 40]);
  } else if (ev.type === 'survived') {
    st.survived++;
    st.flash = { text: 'ATLATILDI ✓', at: st.now, color: '#9be36b' };
  } else if (ev.type === 'caught') {
    st.flash = { text: '🪤 YAKALANDI!', at: st.now, size: 76, color: '#9be36b' };
  } else if (ev.type === 'over') {
    endGame();
  }
}

// ---------- döngü ----------
let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.1, (now - last) / 1000);
  last = now; st.now = now;
  const sim = st.sim;
  const running = st.mode === 'start' || (st.mode === 'play' && !st.paused);
  if (running && !sim.over) {
    st.acc += rdt * (st.mode === 'start' ? 3 : st.speed);
    let n = 0;
    while (st.acc >= sim.cfg.dt && n < 60) { sim.step(); st.acc -= sim.cfg.dt; n++; }
    if (n >= 60) st.acc = 0;
  }
  while (st.evIdx < sim.events.length) onEvent(sim.events[st.evIdx++]);
  if (st.mode === 'start' && (sim.over || sim.t > 600)) showStart();

  if (st.mode !== 'play') {
    const k = Math.min(1, rdt * 3), t = homeCam();
    for (const key in t) R.cam[key] += (t[key] - R.cam[key]) * k;
  }
  R.draw(sim, W, H, 1, { S: 1.45, aim: st.aim });
  if (st.mode === 'play') {
    HUD.drawHUD(R.ctx, sim, st);
    if (st.tutor) HUD.drawTutorial(R.ctx, sim, st);
  } else if (st.mode === 'start') HUD.drawStart(R.ctx, st);
  else if (st.mode === 'board') HUD.drawBoard(R.ctx, st);
  else HUD.drawOver(R.ctx, sim, st);
  placeName();
  requestAnimationFrame(frame);
}

// ---------- dokunma ----------
function toCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  return [((ev.clientX - r.left) * W) / r.width, ((ev.clientY - r.top) * H) / r.height];
}
const inDish = (x, y) => y > DISH.top && y < DISH.bottom;
function aimAt(key, x, y) {
  const C = CARDS[key];
  if (!C || !inDish(x, y)) { st.aim = null; return null; }
  const [wx, wy] = R.screenToWorld(x, y, W, H);
  st.aim = { type: key, x: wx, y: wy, r: C.r };
  return st.aim;
}
function cardAt(x, y) {
  for (let i = 0; i < HUD.CARD_KEYS.length; i++) {
    const r = HUD.cardRect(i);
    if (HUD.hit({ ...r, y: r.y - 30, h: r.h + 30 }, x, y)) return HUD.CARD_KEYS[i];
  }
  return null;
}
function tryPlay(key, x, y) {
  const C = CARDS[key];
  if (st.sim.dp < C.cost) { st.flash = { text: `${C.cost} puan gerek`, at: st.now, size: 80 }; return false; }
  const a = aimAt(key, x, y);
  st.aim = null;
  const ok = !!(a && st.sim.play(key, a.x, a.y));
  if (ok && st.tutor) { st.tutor = false; save('yumurta_ogrendi', 1); }
  return ok;
}

const touches = new Map();
let pinch = null, drag = null, lastTap = 0;
canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const [x, y] = toCanvas(ev);
  touches.set(ev.pointerId, [x, y]);
  if (touches.size === 2 && st.mode === 'play' && !st.drag) {
    const [a, b] = [...touches.values()];
    pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: R.cam.z,
      w: R.screenToWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, W, H) };
    drag = null;
    return;
  }
  drag = { x, y, cx: R.cam.x, cy: R.cam.y, moved: false };
  // karttan başlayan sürükleme kartı taşır
  const key = st.mode === 'play' ? cardAt(x, y) : null;
  if (key) st.drag = { key, x, y, moved: false };
  else if (st.sel) aimAt(st.sel, x, y);
});
canvas.addEventListener('pointermove', (ev) => {
  const [x, y] = toCanvas(ev);
  if (touches.has(ev.pointerId)) touches.set(ev.pointerId, [x, y]);
  if (st.drag) {
    const d = st.drag;
    if (Math.abs(x - d.x) + Math.abs(y - d.y) > 20) d.moved = true;
    if (d.moved) { st.sel = null; d.x = x; d.y = y; aimAt(d.key, x, y - HUD.DRAG_LIFT); }
    return;
  }
  if (pinch && touches.size === 2) {
    const [a, b] = [...touches.values()];
    const z = Math.max(0.6, Math.min(4, (pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1])) / pinch.d));
    R.cam.z = z;
    R.cam.x = pinch.w[0] - ((a[0] + b[0]) / 2 - W / 2) / z;
    R.cam.y = pinch.w[1] - ((a[1] + b[1]) / 2 - R.cam.cy) / z;
    return;
  }
  if (st.sel && st.mode === 'play') { aimAt(st.sel, x, y); return; }
  if (!drag || st.mode !== 'play' || !inDish(drag.x, drag.y)) return;
  if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 14) drag.moved = true;
  if (drag.moved && R.cam.z > DISH.z * 1.05) {
    R.cam.x = drag.cx - (x - drag.x) / R.cam.z;
    R.cam.y = drag.cy - (y - drag.y) / R.cam.z;
  }
});
canvas.addEventListener('pointercancel', (ev) => {
  touches.delete(ev.pointerId); pinch = null; drag = null; st.drag = null; st.aim = null;
});
canvas.addEventListener('pointerup', (ev) => {
  touches.delete(ev.pointerId);
  const [x, y] = toCanvas(ev);
  if (st.drag) {
    const d = st.drag; st.drag = null; drag = null;
    if (d.moved) { tryPlay(d.key, x, y - HUD.DRAG_LIFT); st.aim = null; }
    else tapCard(d.key);
    return;
  }
  if (pinch) { if (!touches.size) pinch = null; drag = null; return; }
  const d = drag; drag = null;
  if (!d || d.moved) return;
  tap(x, y);
});

// karta dokunmak: seç / bırak (sonra kaba dokunarak da oynanabilir)
function tapCard(key) {
  const C = CARDS[key];
  if (st.sim.dp < C.cost) { st.flash = { text: `${C.cost} puan gerek`, at: st.now, size: 80 }; return; }
  st.sel = st.sel === key ? null : key;
  st.aim = null;
}

function tap(x, y) {
  if (st.mode === 'start') {
    if (HUD.hit(HUD.NAME_BOX, x, y)) { nameInput.focus(); return; }
    if (st.nameFocus) nameInput.blur();
    for (const team of ['Çatlak', 'Patlak']) if (HUD.hit(HUD.START_BTN[team], x, y)) startGame(team);
    if (st.online && HUD.hit(HUD.START_BOARD, x, y)) openBoard('start');
    return;
  }
  if (st.mode === 'over') {
    if (HUD.hit(HUD.OVER_BTN.again, x, y)) startGame(st.team);
    else if (HUD.hit(HUD.OVER_BTN.share, x, y)) share();
    else if (st.online && HUD.hit(HUD.OVER_BTN.board, x, y)) openBoard('over');
    return;
  }
  if (st.mode === 'board') {
    if (HUD.hit(HUD.BOARD_BTN.all, x, y)) loadBoard('all');
    else if (HUD.hit(HUD.BOARD_BTN.week, x, y)) loadBoard('week');
    else if (HUD.hit(HUD.BOARD_BTN.back, x, y)) st.mode = st.boardFrom;
    return;
  }
  if (HUD.hit(HUD.BTN.pause, x, y)) { st.paused = !st.paused; return; }
  if (HUD.hit(HUD.BTN.speed, x, y)) { st.speed = SPEEDS[(SPEEDS.indexOf(st.speed) + 1) % SPEEDS.length]; return; }
  if (st.sel && inDish(x, y)) {
    if (tryPlay(st.sel, x, y)) st.sel = null;
    return;
  }
  // çift dokunma: kamerayı sıfırla
  if (inDish(x, y)) {
    if (st.now - lastTap < 350) Object.assign(R.cam, homeCam());
    lastTap = st.now;
  }
}

addEventListener('keydown', (ev) => {
  if (ev.code === 'Space') { ev.preventDefault(); if (st.mode === 'play') st.paused = !st.paused; }
  else if (ev.key === 'r' || ev.key === 'R') toggleRec();
  else if (ev.key === 'Escape') { st.sel = null; st.aim = null; }
  else if (st.mode === 'play' && ev.key >= '1' && ev.key <= '5') tapCard(HUD.CARD_KEYS[+ev.key - 1]);
});

// ---------- kayıt (masaüstü: R tuşu ya da düğme) ----------
let rec = null;
function toggleRec() {
  if (rec) { rec.stop(); return; }
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!mimeType) { alert('Bu tarayıcı tuval kaydını desteklemiyor. Chrome ile dene.'); return; }
  const chunks = [];
  rec = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 14_000_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = `yumurta_evrimi_${st.sim.seed}_${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    rec = null;
    $('rec').classList.remove('on'); $('rec').textContent = '● Kaydet';
  };
  rec.start(1000);
  $('rec').classList.add('on'); $('rec').textContent = '■ Durdur';
}
$('rec').onclick = toggleRec;

// ---------- başlat ----------
Object.assign(R.cam, homeCam());
showStart();
if (params.get('team')) startGame(params.get('team') === 'Patlak' ? 'Patlak' : 'Çatlak');
document.fonts?.load('800 40px "Shantell Sans"').then(() => document.fonts.load('700 40px "Caveat"')).then(() => R.bake(st.sim));
requestAnimationFrame(frame);
