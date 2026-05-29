/*
 * NE      : Aktif urun kimligi - marka + ad + seri kodu. Tum basliklar/etiketler buradan beslenir.
 * NEDEN   : Mehmet Bey: "program basliklarina hangi urun oldugunu da ekle". Ayrica urun-bagimsiz cekirdek -> baska urun = tek nokta degisir.
 * NASIL   : PageHeader ust etiketi + ilgili yerler PRODUCT.code'u gosterir.
 * YAN ETKI: Yeni SMC urunu icin sadece bu sabit guncellenir.
 */
export const PRODUCT = {
  brand: 'SMC',
  name: 'Hava Yönetim Sistemi',
  code: 'AMS20/30/40/60',
  family: 'Air Management System',
}
