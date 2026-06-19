/*
 * NE      : Veri katmaninin cekirdek tipleri - tek bir okuma (Reading), calisma modu (Mode), veri kaynagi sozlesmesi (DataSource).
 * NEDEN   : Demo verisi ile gercek cihaz (OPC UA) verisini AYNI arayuze sokmak; ileride baska SMC urunu = sadece yeni DataSource.
 * NASIL   : DataSource arayuzu start/stop ve kind ('demo'|'live') tanimlar; UI hangi kaynaktan geldigini bilmeden cizer.
 * YAN ETKI: Tum gorsel katman bu tiplere baglidir; cihaz adaptoru sonra bu sozlesmeyi uygulayacak (urun-bagimsiz cekirdek).
 */

// Cihazin uc calisma modu (kullaniciya acik Turkce - kisaltma yok)
export type Mode = 'normal' | 'standby' | 'isolation'

export const MODE_LABEL: Record<Mode, string> = {
  normal: 'Normal Çalışma',
  standby: 'Tasarruf Modu',
  isolation: 'Hava Kesintisi',
}

export const MODE_DESC: Record<Mode, string> = {
  normal: 'Ekipman tam basınçla çalışıyor',
  standby: 'Basınç düşürüldü, hava tüketimi azaldı',
  isolation: 'Hava tamamen kesildi',
}

// Mod renkleri - EKRAN (koyu tema) paleti, TEK dogruluk kaynagi (HeroKPI + AnalysisPage buradan okur).
// Not: ReportView beyaz kagit icin bilerek koyu varyant kullanir (orada ayrica tanimli).
export const MODE_COLOR: Record<Mode, string> = {
  normal: '#2E9BFF',
  standby: '#41E08A',
  isolation: '#FFB04D',
}

// Cihazin GERCEK durum bayraklari (OPC UA BOOL etiketlerinden; LED'leri birebir surmek icin).
// Hepsi OPSIYONEL: cihaz/etiket gondermezse undefined -> DeviceFlowChart eski (mod-turetimli) davranisa duser.
export interface DeviceStatus {
  standby?: boolean       // AMS30_Standby — tasarruf modu aktif
  forcedStandby?: boolean // AMS30_ForcedStandBy — zorlanmis standby
  valveOpen?: boolean     // AMS30_VP_DV_NO — kesme valfi durumu
  doOut?: boolean         // AMS30_PF3A_DOout — dijital cikis (alarm/esik) [PF3A: Efekan Bey saha duzeltmesi 2026-06-19]
  operation?: boolean     // calisiyor/devrede
}

// Cihazdan (veya demodan) gelen tek bir anlik olcum
export interface Reading {
  t: number            // baslangictan beri gecen sure (ms)
  flow: number         // Hava tuketimi / Debi (litre/dakika) — ANLIK
  pressure: number     // Basinc (MPa)
  temperature: number  // Sicaklik (Celsius)
  humidity: number     // Nem (%)
  mode: Mode           // o anki calisma modu
  // OPSIYONEL (yalniz canli cihaz gonderince; demo/eski cihaz -> undefined, eski davranis korunur):
  totalFlow?: number   // TOPLAM debi / totalizer (L) — cihazin AccumFlow degeri (hub alt-sag ekran)
  status?: DeviceStatus // gercek durum bayraklari (LED'ler birebir)
}

// Veri kaynagi sozlesmesi - demo ya da canli cihaz ayni arayuzu doldurur
export interface DataSource {
  readonly kind: 'demo' | 'live'
  start(onReading: (r: Reading) => void): void
  stop(): void
  // Mod secimi (Normal/Tasarruf/Kesinti butonlari). Canli cihaz yazma desteklemezse no-op olabilir.
  setMode?(mode: Mode): void
  // HIBRIT senkron (donanim gelince): kullanici Urun Ayarlari'nda degistirince cihaza yazilir.
  // Tip cevrimsel bagimliligi onlemek icin parametre gevsek (deviceSettings.DeviceSettings sekli) tutulur.
  setSettings?(settings: { standbyPressure: number; autoIsolationSec: number; standbyThreshold: number; valveMode: 'NC' | 'NO' }): void
}
