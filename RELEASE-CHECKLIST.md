# AMS Release Checklist (Japan)

## 1) Teknik kalite kapisi

- npm ci
- npm run release:verify

## 2) Islevsel smoke kontrolu (5-7 dk)

- Uygulama acilis suresi normal (takilma yok)
- Canli Panel acilis ve sayfa gecisleri akici
- Geri Bildirim cekmecesi ac/kapa + gonder akisi
- Canli baglanti kilavuzunda otomatik bul akisi
- Kayit al + listele + sil + tekrar ac
- TR / EN / JA dil gecisleri

## 3) Paketleme

- npm run release:package
- Cikti: paket/SMC-AMS-Tanitim.zip
- Cikti boyutu ve tarih damgasi kontrolu

## 4) Dagitim oncesi git

- git status temiz
- commit mesaji release amacini acik yazar
- dogru dala push tamam

## 5) Gonderim dosyasi

- Masaustu kopya: Desktop/SMC-AMS-Tanitim.zip
- SHA/zip bozulma kontrolu icin tek sefer ac-kapa test
