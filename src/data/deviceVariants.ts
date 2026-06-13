/*
 * NE      : Cihazın PARÇA-KODUNA/TİPİNE göre BİREBİR görsel-variant özellikleri (regülatör tipi, analog saat, konnektör, LED etiketleri).
 *           DeviceFlowChart bunu tüketerek seçili modele uygun çizim yapar (tek doğruluk; tip-koşulları dağılmaz).
 * NEDEN   : Mehmet abi (SMC Japonya teslimi): "cihaz parça koduyla BİREBİR olsun." İki referans kod:
 *             • AMS30A-R03D-SA-KLG → Tip A: elektro-pnömatik (uzaktan/IO-Link) regülatör + dijital ekran, ANALOG SAAT YOK.
 *             • AMS30B-R03C-PN-KLG → Tip B: elle-ayar regülatör + 270° ANALOG BASINÇ SAATİ, dijital reg ekranı YOK; konnektör PROFINET.
 * NASIL   : variantForModel(model) → DeviceVariant. type=A/B model.ts'ten gelir; konnektör/saat/etiket farkları burada tek yerde.
 *           Konnektör kodu parça-kodu son ekinden (SA=IO-Link sınıfı, PN=PROFINET) çıkar; bilinmeyen → tipe göre makul varsayılan.
 * YAN ETKI: SAF veri/yardımcı (render YOK). Görsel variant çizimi DeviceFlowChart'ta, Mehmet abi gözüyle DOĞRULANARAK açılır
 *           (REG_SWAP_ENABLED gibi guard'lı; kırık görüntü ASLA). Bu dosya yalnız "ne farklı" sorusunun tek kaynağı.
 */
import type { AmsModel } from './model'

export type ConnectorKind = 'iolink' | 'profinet'

export interface DeviceVariant {
  type: 'A' | 'B'
  /** A: elektro-pnömatik (uzaktan/dijital ayar) · B: elle (manuel) */
  regulator: 'electro-pneumatic' | 'manual'
  /** B'de 270° analog basınç saati VAR (iğne canlı basınçla) */
  hasAnalogGauge: boolean
  /** A'da kırmızı DİJİTAL regülatör ekranı VAR (canlı MPa) */
  hasDigitalRegPanel: boolean
  /** Haberleşme konnektörü/protokolü (parça-kodu son ekinden) */
  connector: ConnectorKind
  /** Hub durum LED etiketleri (gerçek cihaz; manual om_ams_20-30-40-60 + Mehmet abi gözüyle doğrulanır) */
  hubLedLabels: readonly string[]
  /** Regülatör/port LED etiketleri */
  regLedLabels: readonly string[]
}

/** Parça-kodundan konnektör sınıfını çıkar (…-SA-… = IO-Link sınıfı, …-PN-… = PROFINET). Bilinmezse tipe göre varsayılan. */
export function connectorFromCode(code: string | null | undefined, type: 'A' | 'B'): ConnectorKind {
  const c = (code ?? '').toUpperCase()
  if (/-PN-|PROFINET/.test(c)) return 'profinet'
  if (/-SA-|IO-?LINK/.test(c)) return 'iolink'
  return type === 'B' ? 'profinet' : 'iolink' // referans kodlara göre makul varsayılan
}

// NOT: LED etiket setleri "en iyi bilinen" değerlerdir; SMC Japonya teslimi öncesi Mehmet abi gözü + kılavuzla BİREBİR doğrulanır.
//   (PROFINET tanısı tipik: SF=System Fault, BF=Bus Fault · IO-Link/güç-mod tarafı: PWR/MODE/SIG vb.)
const HUB_LED_A = ['BF', 'PWR', 'MODE', 'SIG'] as const
const HUB_LED_B = ['SF', 'BF', 'PWR', 'MODE'] as const
const REG_LED_A = ['COMMUNICATION', 'POWER'] as const // IO-Link
const REG_LED_B = ['PORT1', 'PORT2'] as const          // PROFINET port tanı

export function variantForModel(m: AmsModel, fullCode?: string): DeviceVariant {
  const connector = connectorFromCode(fullCode ?? m.code, m.type)
  if (m.type === 'B') {
    return {
      type: 'B',
      regulator: 'manual',
      hasAnalogGauge: true,
      hasDigitalRegPanel: false,
      connector,
      hubLedLabels: HUB_LED_B,
      regLedLabels: REG_LED_B,
    }
  }
  return {
    type: 'A',
    regulator: 'electro-pneumatic',
    hasAnalogGauge: false,
    hasDigitalRegPanel: true,
    connector,
    hubLedLabels: HUB_LED_A,
    regLedLabels: REG_LED_A,
  }
}
