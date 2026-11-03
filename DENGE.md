# Yumurta Evrimi · Denge incelemesi

Hedef (Kadir, 4 Kasım):
- Yumurta sayısında **sabit sınır yok**. Nüfusu doğal yollar düşürür: yem, kalabalık, felaketler.
- İyi yöneten oyuncu **sonsuza gidebilirmiş gibi hisseder**, ama oyun yavaş yavaş zorlaşır ve sonunda herkes bir yerde düşer.
- Hedef tur süreleri: ortalama oyuncu **8–15 dk**, iyi oyuncu **20–30 dk**, çok iyi oyuncu 40 dk ve üstü (4× hızda gerçek süre bunun dörtte biri).
- Evrim sayısı uzun bir turda **30–60** civarında olmalı, 272 değil.

---

## 1. Hesapla bulunan sorunlar

| # | Metrik | Şu an | Sorun |
|---|---|---|---|
| 1 | Nüfus freni | Sabit 5000 tavan, başka fren yok | Tavan yapay. Bereket ×7 + küçük yumurtalar (gider ~0,5/sn) olursa yem 10.000+ yumurtayı besleyebilir; tek fren tavan. |
| 2 | Bereket | +%100 / seviye, 6 seviye (×7) | Doğrusal ve çok güçlü; tek başına nüfusu 7 katına çıkarıyor. |
| 3 | Kart alanı | 165 yarıçap, Geniş alan +%20 × 4 → 297 | 297 yarıçaplı alan kabın %35'i. Kalıcı +30 sn ile kart 60 sn sürüyor, yani en uzun felaketten uzun. Geç oyunda tek kart felaketi bitiriyor. |
| 4 | Kart fiyatı | Hep 3 puan | Puan 10→16 tavana ve %50 daha hızlı dolmaya çıkabiliyor; fiyat sabit olduğu için geç oyunda kartlar bedava. Karar ortadan kalkıyor. |
| 5 | Zorluk artışı | Şiddet sınırsız artıyor ama alanın içi %100 korunuyor; 10. felaketten sonra tempo sabit (60 sn felaket / 30 sn sakin) | İyi oyuncu için 10. felaketten sonra oyun düzleşiyor (62 dk tur bundan). |
| 6 | Avcı | Avcı boyu 2+0,1k, 10. felakette 3,0'da duruyor; boyu avcının %85'ini geçen yumurtayı yiyemiyor | Yumurtalar 1,9–2,6 boya çıkınca avcı işe yaramıyor. Tuzak kartı da gereksizleşiyor. |
| 7 | Meteor | Sayı ve yarıçap sınırsız (40. felakette 175 yarıçaplı 260 meteor) | Kalkanın dışı tamamen siliniyor; ya hep ya hiç. |
| 8 | Tür sayımı | 25 bireye ulaşan her aday tür isim alıyor | 3000 yumurtada 25 birey çok küçük bir grup; sürekli yeni tür doğuyor (272 evrim). |
| 9 | Doğurganlık | Üreme eşiği 0,75 → 0,47 | Daha hızlı üreme = daha hızlı nesil = **doğrudan skor**. Her oyunda ilk seçilmesi gereken yükseltme olur. |
| 10 | Verimli toprak | Sadece yeni zengin bölge ekliyor | Toplam yem artmıyor, yalnızca yerini değiştiriyor; zayıf seçim. |
| 11 | Boy üst sınırı | 3,2 (ekranda çok büyük) | Dev yumurtalar kabı kaplıyor, avcıya da bağışık. |

## 2. Yapılan değişiklikler

| # | Değişiklik | Neden |
|---|---|---|
| 1 | Sabit tavan kalktı. Yerine **kalabalık stresi** geldi: kabın her küçük karesinde (40×40) 6'dan fazla yumurta varsa oradaki yumurtaların enerji gideri artar. | Gerçek hayattaki gibi: sıkışan yumurtalar aç kalır, dağılanlar yaşar. Nüfusa üst sınır koymaz ama büyümeyi doğal olarak yavaşlatır. |
| 2 | Bereket +%40, en fazla 5 (×3) | Güçlü ama tek başına oyunu kırmıyor. |
| 3 | Geniş alan +%12 × 3 (→ 224 yarıçap, kabın %20'si). Kalıcı +6 sn × 3 (→ 48 sn) | Geç felaketler (60 sn) yine iki kart istiyor. |
| 4 | Kart fiyatı her 8 felakette +1 (3 → 4 → 5 → …). Puan her 6 sn'de +1, Hızlı puan ×0,85 × 3, Büyük cep +2 × 2 | Puan ekonomisi oyun boyunca sıkı kalır. |
| 5 | 6. felaketten sonra her ikinci felaket çifte, 16. felaketten sonra hepsi çifte, 24.'den sonra her üçüncüsü üçlü. Sakin ara 30 sn'nin altına iner (en az 22 sn). | İyi oyuncu için de oyun zorlaşmaya devam eder. |
| 6 | Avcının boyu sınırsız büyür (2 + 0,08k). Kendi boyundan küçük **her** yumurtayı yiyebilir. | Devler bir süre kaçar, sonra onlar da avlanır. |
| 7 | Meteor yarıçapı en fazla 110; sayısı yavaşça artar. | Kalkanın dışı da şansa bağlı ama hayatta kalınabilir. |
| 8 | Tür ismi için gereken birey: en az 25, nüfusun %1,5'i. Tür eşiği 0,5 → 0,6 | Uzun turda 30–60 evrim. |
| 9 | Doğurganlık −0,05 × 3 (en düşük 0,6) | Hâlâ iyi ama zorunlu değil. |
| 10 | Verimli toprak yeni bölge **ve** +%15 yem | Gerçek bir seçenek olur. |
| 11 | Boy üst sınırı 2,6 | Ekranda okunur, avcıdan da sonsuza kadar kaçamaz. |

## 3. Bot testleri

Ayrıntılar `tools/bot_test.mjs` içinde. Aşağıdaki bot tarzları her tohumda oynatılır:
- **pasif:** hiç kart oynamaz
- **telaşlı:** felaket başlayınca kalabalığın ortasına kart atar
- **akıllı:** kartı felaket başlamadan hemen önce atar, süresi bitmek üzereyse yeniler, puanını biriktirir
- yükseltme tercihleri: **büyüme**, **savunma**, **rastgele**

Ölçülenler: tur süresi, son nesil, en kalabalık an, evrim sayısı, ölüm sebebi (hangi felaket), puanın tavanda boşa beklediği süre, en çok seçilen yükseltme.

## 4. Botların bulduğu sorunlar ve ayarlar

| Tur | Bulgu | Ayar |
|---|---|---|
| 1 | Kart oynamayan bot da 25 dk yaşıyor, kartlar fark yaratmıyor. Buzul sadece boyu 1,45'ten küçükleri, sıcak sadece 0,75'ten büyükleri vuruyordu; nüfus hemen güvenli boya evrimleşiyordu. | Soğuk ve sıcak **herkesi** vurur: soğuk gideri 1,6 × şiddet ÷ boy, sıcak gideri 1,1 × şiddet × boy. Kıtlık geç oyunda yemi %5'e kadar düşürür. |
| 2 | Nüfus en fazla ~800, bin olmuyor. | Kalabalık eşiği 6 → 8. |
| 3 | Ölçüm (`tools/pop_probe.mjs`): kalabalık freni hiç devreye girmiyor, sınırı **yem** koyuyor. Yumurtalar ~1,45 boyda ve pahalı. | Bereket **çarpımsal**: seviye başına ×1,5 (5 seviyede ×7,6). Verimli toprak ×1,15. |
| 4 | Evrim sayısı yine 100+. Savunma yükseltmeleri zayıf (savunma botu büyüme botundan erken ölüyor). | Tür eşiği 0,7, isim için nüfusun %3'ü. Geniş alan +%15, Kalıcı +8 sn, Hızlı puan ×0,8. |
| 5 | Felaket şiddeti: 1,3 + 0,35 × felaket sırası. | (sabit) |

## 5. Son durum (bot ortalamaları, oyun dakikası; 4× hızda gerçek süre ÷4)

| Tarz | Süre | Nesil | En kalabalık | Evrim | Nasıl ölüyor |
|---|---|---|---|---|---|
| Kart oynamayan | 16 dk (≈4 gerçek dk) | 51 | 570 | 7 | Erken çifte felaket |
| Telaşlı + büyüme | 55 dk | 143 | 3.280 | 56 | Çifte/üçlü felaket |
| Telaşlı + savunma | 55 dk | 137 | 2.740 | 67 | Çifte/üçlü felaket |
| Akıllı + büyüme | 86 dk (≈21 gerçek dk) | 213 | 3.540 | 132 | Üçlü felaket |
| Akıllı + savunma | 83 dk | 185 | 2.840 | 136 | Üçlü felaket |

- Yumurta sayısında sabit sınır yok. Nüfusu yem, kalabalık ve felaketler düşürüyor. Telefon çökmesin diye 20.000'de bir emniyet var; testlerde en fazla 3.550'ye çıkıldı.
- İyi oynayan bot 1,5 saate yakın yaşıyor, ama sonunda üçlü felaketlerde düşüyor: "sonsuza gidebilirim" hissi var, oyun yine de bitiyor.
- Aynı hamleler aynı skoru veriyor (tekrar oynatma testi geçti).

## 6. Botların göremediği, insan testinde bakılacaklar
- Kartı **nereye** koyduğun (botlar hep en kalabalık yere koyuyor). İnsanın asıl becerisi bu.
- Puanın %20–25'i tavanda boşa bekliyor; insan için "harcayacak bir şey yok" hissi olursa puanla alınan küçük bir şey (ör. anlık yem) eklenebilir.
- Uzun turda evrim sayısı ~1,5/dk; 90 dakikalık turda 130 evrim. Çizelge kalabalıklaşırsa yalnızca büyük türler gösterilir (zaten öyle).
