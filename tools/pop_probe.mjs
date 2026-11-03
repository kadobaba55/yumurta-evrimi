// Nüfusu ne sınırlıyor? Akıllı + büyüme botuyla bir oyun oynar, her 60 sn'de bir durumu yazar.
// Kullanım: node tools/pop_probe.mjs [tohum=101] [sınırSn=1800]
import { Sim, CARDS, DISASTERS, costOf, radiusOf } from '../js/sim.js';

const seed = +process.argv[2] || 101, LIMIT = +process.argv[3] || 1800;
const pref = ['bereket', 'toprak', 'dogurgan', 'omur', 'puan', 'kalici', 'genis', 'cep', 'evrim'];
const s = new Sim(seed);
let next = 60;
console.log('sn    nüfus  yem   ortBoy ortGider kalabalıkÇarpanı açlarınOranı  felaket');
while (!s.over && s.t < LIMIT) {
  if (s.offer) s.choose(pref.find((k) => s.offer.includes(k)) || s.offer[0]);
  if (s.active && s.stepCount % 10 === 0) for (const t of s.active.types) {
    const c = DISASTERS[t].card;
    if (!s.zones.some((z) => z.type === c && z.until - s.t > 2) && s.dp >= s.cardCost(c)) {
      const e = s.eggs[Math.floor(s.eggs.length / 2)];
      if (e) s.play(c, e.x, e.y);
    }
  }
  s.step();
  if (s.t >= next) {
    next += 60;
    const n = s.eggs.length || 1;
    let size = 0, cost = 0, crowdMul = 0, hungry = 0;
    for (const e of s.eggs) {
      size += e.g.size; cost += costOf(e.g);
      const nc = s.crowd[s._cellOf(e.x, e.y)];
      crowdMul += nc > s.cfg.crowdAt ? 1 + s.cfg.crowdK * (nc / s.cfg.crowdAt - 1) : 1;
      if (e.energy < 0.3 * 100 * Math.pow(e.g.size, 2.5)) hungry++;
    }
    console.log(`${String(Math.round(s.t)).padEnd(5)} ${String(s.eggs.length).padEnd(6)} ${String(s.foodCount).padEnd(5)} ${(size / n).toFixed(2).padEnd(6)} ${(cost / n).toFixed(2).padEnd(8)} ${(crowdMul / n).toFixed(2).padEnd(16)} ${(hungry / n).toFixed(2).padEnd(12)} ${s.active ? s.active.types.join('+') : '-'}  yem×${s.mods.food.toFixed(1)}`);
  }
}
