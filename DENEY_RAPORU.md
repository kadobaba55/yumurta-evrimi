# Yumurta Evrimi · Karar ve eğlence incelemesi (4 Kasım)

Deneyleri tekrar çalıştırmak için: `node tools/deney.mjs yerlesim|oyun|yukseltme|sade [tohum]`

**Nasıl ölçüldü**
- Simülasyon aynı anda çatallanır (fork) ve dallar arasında yalnızca tek şey değiştirilir.
- Plasebo kontrolü: ilgisiz bir kart oynamak sonucu %0 değiştirdi. Yani dallar arasındaki farklar gürültü değil, değişikliğin kendisinden geliyor.
- Tohumlar sabit, adım 1/30 sn.

**Sınırlar**
- Botlar basit kurallarla oynar.
- Deney rng akışı gerçek oyundakinden farklıdır. Sonuçlar kendi içinde karşılaştırılabilir ama gerçek oyunla birebir aynı değil.
- Deney başına 6–8 tohum var. Yükseltme farkları gürültü düzeyinde (aşağıda).
- **Hiçbir bot sonucu eğlencenin kanıtı değildir.**

---

## Ham sonuçlar

### Deney 1 · Tek felakette kart yerleşimi
8 tohum, felaketler 1–5 (her tür bir kez). Tablodaki değer: felaket bitiminde nüfusun felaket başındaki nüfusa oranı.

| Felaket | Kartsız | Bot (kalabalığa) | Izgara en kötü | Medyan | En iyi | Kapsama↔sonuç korelasyonu |
|---|---|---|---|---|---|---|
| Kıtlık | 25% | 35% | 30% | 35% | 39% | 0,2 |
| Buzul | 61% | 66% | 55% | 62% | 71% | 0,4 |
| Meteor | 93% | 95% | 84% | 93% | 102% | 0,1 |
| Sıcak | 46% | 52% | 42% | 47% | 56% | 0,6 |
| Avcı | 111% | 123% | 103% | 116% | 130% | 0,1 |

### Deney 2 · Ölçümlü tam oyunlar
6 tohum, büyüme tercihi. Süreler oyun dakikası (4× hızda ÷4).

| | Kartsız | Telaşlı | Akıllı |
|---|---|---|---|
| Süre | 33 dk | 70 dk | 83 dk |
| Nesil | 105 | 170 | 179 |
| Tekli felakette ort. kayıp: kıtlık / sıcak / buzul / meteor / avcı | 80 / 61 / 50 / 24 / 5% | 73 / 46 / 44 / 25 / 6% | 72 / 47 / 45 / 23 / 4% |
| Ölümden önceki 3 felakette kayıp | 75% | 72% | 75% |
| Puan tavanda (sürenin) | 98% | 29% | 21% |
| Felakette kart lazım ama puan yok | 0 sn | 480 sn | 639 sn |
| Felaket başında gereken kartların parası var | 91% | 48% | 18% |
| Kararlar arası medyan | 99 sn | 22 sn | 22 sn |

Aynı tohumda kartsız ve akıllı oyun karşılaştırması:
- Tohum 101'de kartsız bot daha yüksek skor yaptı: 204 nesil, akıllı 154.
- Kartsız botun süresi tohuma göre 15 ile 63 dk arasında değişiyor.

### Deney 3 · Yükseltme faydası
Aynı anda çatallandı, her dalda farklı bir yükseltme zorlandı, sonra 15 oyun-dk oynandı. 6 tohum.

| | 2. felaketten sonra seçilince | 7. felaketten sonra seçilince |
|---|---|---|
| Nesil, en iyiden en kötüye | Geniş 119% … Doğurganlık 92% | Doğurganlık 124% … Hızlı puan 83% |
| Bereket'in nüfusa etkisi | 376 (diğerleri 150–230) | 882 (diğerleri 390–600) |
| Bereket'in nesle etkisi | 104% | 105% |

Nesil sıralaması iki ölçüm anı arasında ters dönüyor: Geniş birinci sıradan sondan üçüncüye, Doğurganlık sondan birinciye. 6 tohumla nesil farkları **gürültü düzeyinde**. Tutarlı tek sinyal: Bereket nüfusu yaklaşık +%75 artırıyor, skoru neredeyse hiç artırmıyor.

### Deney 4 · Zorluk sadeleştirme
Her seferde tek değişiklik; akıllı bot, 6 tohum, 120 dk sınır.

| | Mevcut | Sabit fiyat (3) | Sabit süre (45 sn) |
|---|---|---|---|
| Süre | 83 dk | **120 dk sınırına ulaştı, hiç ölüm yok** | 70 dk |
| Puan tavanda | 21% | 53% | 32% |
| Puansız kalınan süre | 639 sn | 0 sn | 437 sn |
| Kararlar arası medyan | 22 sn | 5 sn | 20 sn |

---

## Öncelik sırasıyla sorunlar

### 1. Oyunu bitiren gizli saat kart fiyatı; oyuncu bunu görmüyor (Hipotez 1 kısmen doğrulandı)

**Dayanak**
- Yalnızca fiyat artışı kaldırılınca akıllı bot 120 dakikada hiç ölmedi. Şiddet, süre, kısalan ara ve çifte/üçlü felaketler birlikte kaldıkları hâlde ölüm gelmedi.
- Mevcut oyunda felaketlerin yalnızca %18'inde gereken kartların parası var.
- Felaket sürerken toplam 639 sn karşı kartsız ve parasız geçiyor.
- Ölüm "birden" gelmiyor: son 3 felakette kayıp zaten %75 civarında. Ama oyuncunun gördüğü sebep yanlış olabilir. Ölümü felaket gibi görüyor, asıl sebep parasız kalmak. Bitiş ekranında ölüm sebebi de yazmıyor.

**En küçük değişiklik:** Fiyat artışını kaldır, kart her zaman 3 puan olsun. Zorluğu **görünür tek bir kaynağa** bırak: çifte/üçlü felaket sıklığı. Önce yalnızca fiyatı sabitleyip ölüm gelmediği görüldü. Sonraki adımda tek parametre değişir: üçlü felaket "her 3.'de bir" yerine "her 2.'de bir".

**İşe yaradığını nasıl ölçeriz**
- Akıllı bot 60–100 dk arasında ölüyor mu?
- Ölüm türü bir felaket kombinasyonu mu, puansızlık kısa mı kalıyor?
- İnsan testinde "neden kaybettin?" cevabı telemetriyle eşleşiyor mu?

### 2. Felaketler eşit değil, iki kart neredeyse anlamsız (Hipotez 5)

**Dayanak**
- Kartsız oyunda kayıp: Kıtlık %80, Avcı %5.
- Avcı ilk geldiğinde nüfus felaket sırasında **büyüyor** (kartsız 111%). Tuzak kartı hiçbir zaman kritik değil.
- Kıtlıkta en iyi konumdaki kart bile nüfusun yalnızca %39'unu tutuyor (kartsız %25). Yağmurun saniyede 6 yemi yüzlerce yumurtaya yetmiyor.
- Oyuncu kıtlıkta doğru kartı doğru yere koysa da çoğunu kaybediyor. Avcıda ise karar yok.

**En küçük değişiklik (önce yalnız biri):** Tohum yağmurunun yem hızını 6 → 15/sn yap. Ayrı bir testte avcı sayısını k=0'da 3'ten 6'ya çıkar.

**Nasıl ölçeriz:** Deney 1 tablosu. Hedef: her felakette (bot − kartsız) ≥ 15 puan, kartsız kayıplar birbirine yakın (ör. %30–60 bandı).

### 3. Puan akışı ters zamanlanmış (Hipotez 1, 4)

**Dayanak:** Akıllı bot sürenin %21'inde puanı tavanda tutup boşa harcıyor, ama felaketlerde 639 sn parasız kalıyor. Sakin dönemde biriktirilemeyen puan, tam gerektiğinde yok.

**En küçük değişiklik:** En fazla puan 10 → 16. Dolma hızı ve fiyat aynı kalır.

**Nasıl ölçeriz:** Puan tavanda kalma oranı ↓, puansız kalınan süre ↓, "felaket başında para var" oranı ↑. Tur süresi değil, bu üçü.

### 4. Skor ekosistemi ödüllendirmiyor, şans payı yüksek (Hipotez 2 ve 3)

**Dayanak**
- Bereket nüfusu yaklaşık +%75 artırıyor ama nesli +%4–5 artırıyor. "Bereket zorunlu" hipotezi **doğrulanmadı**: nüfusu şişiriyor, skoru değil.
- Nesil fiilen "ne kadar uzun yaşadın" demek.
- Aynı bot, tohuma göre 15 ile 63 dk arası yaşıyor. Bir tohumda kart oynamayan bot akıllı botu geçti.
- Yükseltmelerin nesil sıralaması gürültü içinde; zorunlu bir yükseltme görünmüyor ama bu henüz kanıtlanmış değil.

**En küçük değişiklik:** Skora dokunma. Bitiş ekranında ve liderlikte nesil yanında **en kalabalık an** ile **evrim sayısını** göster. Sonra insan testinde farklı stratejilerin konuşulup konuşulmadığına bak.

**Nasıl ölçeriz**
- 20+ tohumla Deney 3'ü tekrarla. Hedef: hiçbir yükseltmenin nesil etkisi diğerlerinin %20'sinden fazla üstünde olmasın.
- Liderlikte nesil ile en kalabalık an arasındaki korelasyon.

### 5. Bazı kayıplar okunamıyor (Hipotez 4)

**Dayanak**
- Meteor hedef halkası düşmeden 1,5 oyun-sn önce çıkıyor; 4× hızda bu 0,4 gerçek saniye.
- Kalkanın konumu ile sonuç arasında korelasyon 0,1. Meteorda iyi konum, şansla aynı.
- Bitiş ekranı ölüm sebebini göstermiyor.

**En küçük değişiklik:** Bitiş ekranına tek satır ekle: "Seni bitiren: Kıtlık + Sıcak · kartın vardı / puanın yetmedi". Ayrı bir değişiklik olarak meteor halkası 1,5 → 4 sn.

**Nasıl ölçeriz:** İnsan testinde oyuncunun kendi anlattığı ölüm sebebi telemetriyle uyuşuyor mu? Hedef: %80 ve üstü.

### 6. Konum kararı var ama öğrenilemez (Hipotez 5)

**Dayanak**
- Konum becerisi farkı (en iyi − en kötü) felakete göre 9–27 puan. Konum önemli.
- Ama "en kalabalık yere koy" kuralı sonucu zayıf açıklıyor: korelasyon sıcakta 0,6, diğerlerinde 0,1–0,4.
- En iyi konum oyuncunun görebildiği bir şeyle bağlantılı değil.
- Konum karar otomatik değil, ama oyuncu neyin işe yaradığını da öğrenemiyor.

**En küçük değişiklik:** Kural değişmez. Felaket bitince haritada kartın kurtardığı yumurta sayısını göster ("Isıtıcı 48 yumurtayı kurtardı"). Böylece konumun sonucu görünür olur.

**Nasıl ölçeriz:** İnsan testinde 3. turda kartı nereye koyduğunu açıklayabiliyor mu? Turlar arasında Deney 1'deki "medyan → en iyi" farkına yaklaşıyor mu? Bunun için hamle kaydı gerekiyor (aşağıda).

### 7. Karar sıklığı aktif oyunda yeterli; kanıtı insanda (Hipotez 6)

**Dayanak**
- Aktif botlarda kararlar arası medyan 22 oyun-sn (4× hızda ~5,5 gerçek sn), dakikada ~11 karar.
- Kartsız oyunda kararlar arası 99 sn; ölçülen kararların hepsi yükseltme seçimi.
- İlk felakete kadar (70 sn) hiç karar yok.
- Bu sayılar yalnızca "kararın mümkün olduğu" anları ölçer, kararların anlamlı ya da hissedilir olduğunu göstermez.

**Değişiklik:** Şimdilik yok. Önce insan verisi lazım.

---

## Test planı

### A. Hamle kaydı (her şeyin önkoşulu, en küçük iş)
- Liderliğe skorla birlikte tohum ve `actions` listesini kaydet.
- Bu oyun tam deterministik, yani her gerçek oyun sunucuda baştan oynatılabilir.
- Aşağıdaki tüm metrikler **gerçek oyuncular için** botlarla aynı araçla hesaplanabilir.

### B. Metrikler
`tools/deney.mjs oyun` gerçek oyunların tekrar oynatımında da aynen çalışır.

| Metrik | Nasıl | Hedef / bakılacak |
|---|---|---|
| Felaket öncesi/sonrası nüfus, en büyük kayıp | Her felaketin uyarı, başlangıç ve bitişindeki nüfus | Hiçbir tekli felaket ortalamada %70'ten fazla yıkmasın; kayıp felaket sırasıyla yavaş artsın |
| Türe ve sıraya göre elenme | Ölüm anındaki felaket ve sırası | Ölümler tek bir türde toplanmasın |
| Kartlı ve kartsız fark | Aynı tohumda kartsız ve oyuncunun hamleleri; ayrıca Deney 1 | Her felakette kart ≥ 15 puan fark yaratsın |
| Yükseltme seçilme oranı | Gerçek oyunlarda teklif edilip seçilme oranı | Hiçbiri teklif edildiğinde %60'tan fazla seçilmesin |
| Yükseltme faydası | Deney 3, 20+ tohum, aynı an | En iyi / en kötü yükseltme farkı < %20 |
| Puan tavanda / puansız kritik an | Saniye ve "felaket başında para var" oranı | Tavanda < %10, puansız < %5 |
| Kararlar arası süre | Kart ve yükseltme zaman damgaları | Medyan < 10 gerçek sn, ilk 30 gerçek sn içinde bir karar |
| Kaybetme nedenini anlama | İnsan testi + bitiş ekranı | Oyuncunun anlattığı sebep telemetriyle %80 uyuşsun |
| Tekrar oynama isteği | Bitişten sonra "tekrar oyna"ya basma oranı ve süresi | Yeniden başlatma > %50, 10 sn içinde |

### C. İnsan testi (5–8 kişi, her biri 3 tur)
- Her ölümden sonra iki soru:
  - "Neden kaybettin?" (serbest cevap)
  - "Bir tur daha oynar mısın?" (evet/hayır)
- Son turda: "Kartı nereye koyacağına nasıl karar verdin?"
- Telemetri cevaplarla eşleştirilir.
- Bot tablosu yalnızca denge sağlamlığını gösterir; eğlence kararını bu test verir.

### D. Sıralama (her seferinde tek değişiklik)
1. Hamle kaydı (A) ve bitiş ekranında ölüm sebebi (#5). Bunlar ölçüm aracı; dengeyi değiştirmez.
2. Tohum yağmuru 6 → 15 (#2). Deney 1 tekrarlanır.
3. En fazla puan 10 → 16 (#3). Deney 2 tekrarlanır.
4. Sabit kart fiyatı + üçlü felaket sıklığı (#1). Deney 4 tekrarlanır.
5. Her adımdan sonra 3–5 kişilik kısa insan testi.
