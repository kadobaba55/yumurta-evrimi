// Yumurta Evrimi · online sıralama istemcisi
// API boşken sıralama düğmeleri gizlenir; oyun çevrimdışı da oynanır.
export const API = '';

export const enabled = () => !!API;

export async function submitScore(payload) {
  const r = await fetch(`${API}/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`skor gönderilemedi (${r.status})`);
  return r.json(); // { rank, players }
}

export async function fetchBoard(period = 'all') {
  const r = await fetch(`${API}/board?period=${period}`);
  if (!r.ok) throw new Error(`sıralama alınamadı (${r.status})`);
  return r.json(); // { top: [{ name, team, score }], teams: { Çatlak: { total, players }, Patlak: {...} } }
}
