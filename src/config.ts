/*
 * NE      : Uygulama geneli sade yapilandirma bayraklari (TEK yerden ac/kapa).
 * NEDEN   : Mehmet Abi: "giris Halil'e ozel olmasin SIMDILIK; program herkese TANITIM amacli sunulacak." Tanitim/uretim
 *           davranis farki tek bayrakla, GERI DONULEBILIR bicimde yonetilsin (kod silinmeden).
 * NASIL   : DEMO_OPEN=true iken giris/sifre YOK -> basit "Demo'ya Gir" karsilamasi sonrasi uygulama acilir (isimsiz misafir).
 *           false yapilirsa ESKI personel girisi (LoginScreen + auth/users) AYNEN geri gelir (tum auth kodu yerinde durur).
 * YAN ETKI: Yok (saf sabit). boolean olarak tiplenir -> her iki dal da gecerli kalir (tsc/eslint "always true" uyarisi cikmaz).
 */
export const DEMO_OPEN: boolean = true

/*
 * MOBIL: Mehmet Abi "mobil uygulamasini da acalim." false -> telefon/tablette MOBIL WEB + PWA acik (responsive demo,
 * "Ana Ekrana Ekle" ile tam ekran). true -> eski "bilgisayardan acin" engeli (MobileBlocked) geri gelir.
 * Not: mobilde CANLI cihaz yok (connection.ts mobil=demo kilidi); telefon yalniz demo izler.
 */
export const MOBILE_BLOCKED: boolean = false

/*
 * SHOWCASE / VİTRİN modu: SMC Japonya HQ sunumu gibi "vitrin" ortamlarda beta/test öğelerini gizle.
 * true -> "Hata Bildir / Report a Bug" FAB render EDİLMEZ (HQ önünde profesyonel görünüm; beta hissi yok). Kod SİLİNMEZ.
 * İç kullanım/test için false yapılınca geri bildirim FAB'ı AYNEN geri gelir.
 */
export const SHOWCASE_MODE: boolean = true
