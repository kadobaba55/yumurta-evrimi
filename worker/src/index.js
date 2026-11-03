// Yumurta Evrimi · sıralama sunucusu (Cloudflare Worker + D1)
// GET  /board?period=all|week  → en iyi 20 oyuncu + takım toplamları
// POST /score {name, team, score, seed, simt, cards} → { rank, players }

const ALLOWED = ['https://kadobaba55.github.io', 'https://kadomakesgames.com', 'http://localhost:8765'];
const WEEK = 7 * 24 * 3600 * 1000;

function cors(req) {
  const o = req.headers.get('origin') || '';
  return {
    'access-control-allow-origin': ALLOWED.includes(o) ? o : ALLOWED[0],
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}
const json = (req, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(req) } });

function since(period) {
  return period === 'week' ? Date.now() - WEEK : 0;
}

async function board(req, env, url) {
  const from = since(url.searchParams.get('period'));
  const top = await env.DB.prepare(
    `SELECT name, team, MAX(score) AS score FROM scores WHERE created >= ?1
     GROUP BY lower(name) ORDER BY score DESC, MIN(created) ASC LIMIT 20`,
  ).bind(from).all();
  const teams = await env.DB.prepare(
    `SELECT team, SUM(best) AS total, COUNT(*) AS players FROM
       (SELECT team, lower(name) AS n, MAX(score) AS best FROM scores WHERE created >= ?1 GROUP BY team, n)
     GROUP BY team`,
  ).bind(from).all();
  const t = {};
  for (const r of teams.results) t[r.team] = { total: r.total, players: r.players };
  return json(req, { top: top.results, teams: t });
}

async function score(req, env) {
  let b;
  try { b = await req.json(); } catch { return json(req, { error: 'json' }, 400); }
  const name = String(b.name || '').replace(/[^\p{L}\p{N}_.@ -]/gu, '').trim().slice(0, 20);
  const team = b.team === 'Patlak' ? 'Patlak' : b.team === 'Çatlak' ? 'Çatlak' : null;
  const sc = Math.floor(Number(b.score)), simt = Number(b.simt), cards = Math.floor(Number(b.cards) || 0);
  // kaba hile kontrolü: nesil hızı bir sınırı aşamaz (yaklaşık 1 nesil / 8 sn)
  if (!name || !team || !Number.isFinite(sc) || sc < 0 || sc > 5000) return json(req, { error: 'geçersiz' }, 400);
  if (!Number.isFinite(simt) || simt < 0 || simt > 6 * 3600 || sc > simt / 4 + 10) return json(req, { error: 'geçersiz' }, 400);

  const ip = req.headers.get('cf-connecting-ip') || '';
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE ip = ?1 AND created > ?2')
    .bind(ip, Date.now() - 15000).first();
  if (recent.n > 0) return json(req, { error: 'yavaş' }, 429);

  await env.DB.prepare('INSERT INTO scores (name, team, score, seed, simt, cards, created, ip) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)')
    .bind(name, team, sc, Math.floor(Number(b.seed) || 0), simt, cards, Date.now(), ip).run();

  const rank = await env.DB.prepare(
    `SELECT COUNT(*) + 1 AS r FROM (SELECT MAX(score) AS s FROM scores GROUP BY lower(name)) WHERE s > ?1`,
  ).bind(sc).first();
  const players = await env.DB.prepare('SELECT COUNT(DISTINCT lower(name)) AS n FROM scores').first();
  return json(req, { rank: rank.r, players: players.n });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    try {
      if (req.method === 'GET' && url.pathname === '/board') return await board(req, env, url);
      if (req.method === 'POST' && url.pathname === '/score') return await score(req, env);
      return json(req, { error: 'yok' }, 404);
    } catch (e) {
      return json(req, { error: 'sunucu' }, 500);
    }
  },
};
