# Yumurta Evrimi 🥚

Soyunu kaç nesil yaşatabilirsin? Petri kabındaki yumurtalar yer, ürer ve evrimleşir; felaketler gittikçe sertleşir. Her felaketin bir karşı kartı var: kartı kaba sürükle, alanı korusun.

**Oyna:** https://kadobaba55.github.io/yumurta-evrimi/

- `js/sim.js`: simülasyon (tohumlu, aynı hamleler = aynı skor)
- `js/render.js`, `js/hud.js`: çizim ve oyun ekranı (1080×1920 tuval)
- `js/main.js`: döngü, dokunma, sürükle-bırak, rekor, paylaşım, kayıt
- `js/net.js`: online sıralama istemcisi
- `worker/`: sıralama sunucusu (Cloudflare Worker + D1)

Yerelde çalıştırmak için: `python -m http.server 8765` ve http://localhost:8765

kadomakesgames
