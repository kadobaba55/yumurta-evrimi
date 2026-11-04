// Yumurta Evrimi · gerçek oyuncuların oyunlarını tekrar oynatıp ölçer
// Sıralamaya kaydedilen hamleler (actions) aynı sürümde birebir aynı oyunu verir;
// botlar için kullanılan ölçümler (tools/deney.mjs) burada gerçek oyunlara uygulanır.
// Kullanım:
//   node tools/oyuncu.mjs              canlı veritabanından çeker (wrangler girişi gerekir)
//   node tools/oyuncu.mjs kayit.json   wrangler d1 execute --json çıktısından okur
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { Sim, UPGRADES, VERSION } from '../js/sim.js';
import { runInstrumented, report } from './deney.mjs';

const SQL = 'SELECT id, name, team, score, seed, simt, ver, steps, actions, cause, after, created FROM scores WHERE actions IS NOT NULL ORDER BY id';
const raw = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : execSync(`npx wrangler d1 execute yumurta-skor --remote --json --command "${SQL}"`, { cwd: new URL('../worker', import.meta.url), encoding: 'utf8' });
const rows = JSON.parse(raw)[0].results;

const same = rows.filter((r) => r.ver === VERSION);
console.log(`${rows.length} kayıtlı oyun, ${same.length} tanesi bu sürümde (${VERSION}); diğerleri tekrar oynatılamaz.\n`);
if (!same.length) process.exit(0);

const results = [], offered = {}, picked = {}, bad = [];
for (const r of same) {
  const actions = JSON.parse(r.actions);
  const s = new Sim(r.seed, { team: r.team });
  let i = 0, lastOffer = null;
  const act = (x) => {
    if (x.offer && x.offer !== lastOffer) { lastOffer = x.offer; for (const k of x.offer) offered[k] = (offered[k] || 0) + 1; }
    while (i < actions.length && actions[i].s === x.stepCount) {
      const a = actions[i++];
      if (a.c === 'up') { x.choose(a.x); picked[a.x] = (picked[a.x] || 0) + 1; } else x.play(a.c, a.x, a.y);
    }
  };
  const res = runInstrumented(s, act, (r.steps + 2) * s.cfg.dt);
  if (s.maxGen !== r.score) bad.push(`#${r.id} ${r.name}: kayıt ${r.score}, tekrar ${s.maxGen}`);
  results.push({ ...res, cause: s.cause, after: r.after });
}

report('gerçek oyuncular', results);

console.log('\nYükseltme: teklif edildiğinde seçilme oranı');
for (const k of Object.keys(UPGRADES).sort((a, b) => (picked[b] || 0) / (offered[b] || 1) - (picked[a] || 0) / (offered[a] || 1)))
  console.log(`  ${k.padEnd(9)} ${String(Math.round((100 * (picked[k] || 0)) / (offered[k] || 1))).padStart(3)}%  (${picked[k] || 0}/${offered[k] || 0})`);

const why = {};
for (const r of results) if (r.cause) why[r.cause.why] = (why[r.cause.why] || 0) + 1;
console.log('\nÖlüm sebebi (bitiş ekranında gösterilen):', JSON.stringify(why), ' puan=puan yetmedi · kart=kart koymadı · alan=kart vardı · sonra=felaketten sonra');

const again = results.filter((r) => r.after !== null && r.after !== undefined);
console.log(`Tekrar oynama: ${again.length}/${results.length} oyun aynı oturumda bir öncekinin ardından başladı; medyan ara ${again.length ? again.map((r) => r.after).sort((a, b) => a - b)[Math.floor(again.length / 2)] : '-'} sn`);

console.log(bad.length ? `\n⚠ Tekrar oynatınca skoru tutmayan ${bad.length} oyun (hile ya da sürüm farkı):\n  ${bad.join('\n  ')}` : '\nTüm oyunlar tekrar oynatınca aynı skoru verdi.');
