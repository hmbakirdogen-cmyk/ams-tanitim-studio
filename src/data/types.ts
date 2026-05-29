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

// Cihazdan (veya demodan) gelen tek bir anlik olcum
export interface Reading {
  t: number            // baslangictan beri gecen sure (ms)
  flow: number         // Hava tuketimi / Debi (litre/dakika)
  pressure: number     // Basinc (MPa)
  temperature: number  // Sicaklik (Celsius)
  humidity: number     // Nem (%)
  mode: Mode           // o anki calisma modu
}

// Veri kaynagi sozlesmesi - demo ya da canli cihaz ayni arayuzu doldurur
export interface DataSource {
  readonly kind: 'demo' | 'live'
  start(onReading: (r: Reading) => void): void
  stop(): void
  // Mod secimi (Normal/Tasarruf/Kesinti butonlari). Canli cihaz yazma desteklemezse no-op olabilir.
  setMode?(mode: Mode): void
}
