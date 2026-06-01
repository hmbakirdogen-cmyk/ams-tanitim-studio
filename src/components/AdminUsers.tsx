/*
 * NE      : Yonetici kullanici paneli - listele, YENI EKLE (ad/soyad/rol/sifre + unvan/telefon/e-posta), DETAY DUZENLE, sifre sifirla, sil.
 * NEDEN   : Mehmet Bey: yonetici (Karakelle Bey) arkadaslarinin detayli verilerini (unvan/telefon/e-posta) girebilsin + sifre tanimlasin.
 * NASIL   : auth.addUser(details) / auth.updateUser(id,patch) / auth.setPassword / auth.removeUser; her satir genisleyip detay duzenlenir.
 * YAN ETKI: Sadece yonetici erisir. KATI: cıplak sifre asla gosterilmez; kullanici kendini silemez.
 */
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Trash2, KeyRound, Pencil, Check, ShieldCheck, User as UserIcon, Download, Upload, ArrowLeftRight, DatabaseBackup } from 'lucide-react'
import { sound } from '@/lib/sound'
import { download } from '@/data/recordings'
import { exportAll, importAll } from '@/data/backup'
import { Avatar } from './Avatar'
import { useLang } from '@/i18n'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import type { Auth } from '@/auth/useAuth'
import type { Role } from '@/auth/users'

const field = 'w-full rounded-lg border border-[var(--hair)] bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--ink-soft)]'

export function AdminUsers({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const { t } = useLang()
  useEscapeKey(onClose) // Escape ile kapat (QA)
  // Ekleme formu
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pw, setPw] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  // Duzenleme / sifre
  const [editId, setEditId] = useState<string | null>(null)
  const [eTitle, setETitle] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState('')
  // Laptoplar arasi tasima
  const fileRef = useRef<HTMLInputElement>(null)
  const fullFileRef = useRef<HTMLInputElement>(null)
  const [transferMsg, setTransferMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // TAM YEDEK: personel + TUM veriler (kayitlar, gecmis, ayarlar, ekonomi, model, moduller, tema, baglanti)
  const doFullExport = () => {
    sound.click()
    download('ams-tam-yedek.json', exportAll(Date.now()), 'application/json')
    setTransferMsg({ ok: true, text: t('Personel + TÜM veriler (kayıtlar, geçmiş, ayarlar, ekonomi, model…) "ams-tam-yedek.json" dosyasına aktarıldı.') })
  }
  const onPickFullFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      // Tam yedek mevcut TUM veriyi degistirir -> once onay
      if (!window.confirm(t('Bu bilgisayardaki TÜM veriler (personel, kayıtlar, geçmiş, ayarlar) bu yedekle DEĞİŞTİRİLECEK. Devam edilsin mi?'))) return
      try {
        importAll(text)
        sound.click()
        window.location.reload() // tum store'lar yeniden okusun
      } catch {
        setTransferMsg({ ok: false, text: t('Dosya okunamadı ya da geçersiz yedek dosyası.') })
      }
    }
    reader.readAsText(f)
  }

  const doExport = () => {
    sound.click()
    download('ams-personel.json', auth.exportUsers(), 'application/json')
    setTransferMsg({ ok: true, text: `${auth.users.length} ${t('kişi "ams-personel.json" dosyasına aktarıldı. USB/e-posta ile diğer laptoplara taşıyın.')}` })
  }
  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // ayni dosya tekrar secilebilsin
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const res = auth.importUsers(String(reader.result))
        sound.click()
        setTransferMsg({ ok: true, text: `${t('İçe aktarıldı:')} ${res.added} ${t('kişi eklendi,')} ${res.updated} ${t('kişi güncellendi. (Mevcut kişiler silinmedi.)')}` })
      } catch {
        setTransferMsg({ ok: false, text: t('Dosya okunamadı ya da geçersiz personel dosyası.') })
      }
    }
    reader.readAsText(f)
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !pw) return
    await auth.addUser(firstName, lastName, role, pw, { title, phone, email })
    sound.click()
    setFirstName(''); setLastName(''); setPw(''); setRole('user'); setTitle(''); setPhone(''); setEmail('')
  }
  const openEdit = (id: string, title?: string, phone?: string, email?: string) => { // param adları t/p/m -> çeviri t()'yi gölgelemesin
    setEditId(id); setETitle(title ?? ''); setEPhone(phone ?? ''); setEEmail(email ?? ''); setResetId(null)
  }
  const saveEdit = () => {
    if (!editId) return
    auth.updateUser(editId, { title: eTitle, phone: ePhone, email: eEmail })
    sound.click(); setEditId(null)
  }
  const doReset = async (id: string) => {
    if (!resetPw) return
    await auth.setPassword(id, resetPw)
    setResetId(null); setResetPw('')
  }

  return (
    <motion.div
      className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-7"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t('Kullanıcılar')}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {auth.users.map((u) => (
            <div key={u.id} className="rounded-xl border border-[var(--hair)] px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar user={u} size={38} ring={false} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {u.firstName} {u.lastName}
                    {u.role === 'admin' ? <ShieldCheck size={13} className="text-[var(--smc-bright)]" /> : <UserIcon size={13} className="text-[var(--ink-soft)]" />}
                  </div>
                  <div className="truncate text-[11px] text-[var(--ink-soft)]">
                    {[u.title, u.phone, u.email].filter(Boolean).join(' · ') || (u.role === 'admin' ? t('Yönetici') : t('Personel'))}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => openEdit(u.id, u.title, u.phone, u.email)} title={t('Detayları düzenle')} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><Pencil size={15} /></button>
                  <button onClick={() => { setResetId(u.id); setResetPw(''); setEditId(null) }} title={t('Şifre sıfırla')} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><KeyRound size={15} /></button>
                  {/* Sil: kendini DEĞİL + SON YÖNETİCİYİ gösterme (sistemde admin'siz kalıp panele erişim kaybı olmasın) */}
                  {auth.user?.id !== u.id && !(u.role === 'admin' && auth.users.filter((x) => x.role === 'admin').length <= 1) && (
                    <button onClick={() => { sound.click(); auth.removeUser(u.id) }} title={t('Sil')} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[#ff8a8a] transition hover:bg-white/5"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>

              {editId === u.id && (
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[var(--hair)] pt-3 md:grid-cols-3">
                  <input value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder={t('Ünvan')} className={field} />
                  <input value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder={t('Telefon')} className={field} />
                  <input value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder={t('E‑posta')} className={field} />
                  <button onClick={saveEdit} className="keep-white flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white md:col-span-3" style={{ background: 'var(--smc)' }}><Check size={15} /> {t('Detayları Kaydet')}</button>
                </div>
              )}

              {resetId === u.id && (
                <div className="mt-3 flex items-center gap-2 border-t border-[var(--hair)] pt-3">
                  <input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder={t('Yeni şifre')} className={field} />
                  <button onClick={() => doReset(u.id)} className="keep-white shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: 'var(--smc)' }}>{t('Kaydet')}</button>
                  <button onClick={() => { setResetId(null); setResetPw('') }} className="shrink-0 text-xs text-[var(--ink-soft)]">{t('vazgeç')}</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} className="mt-6 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><UserPlus size={16} /> {t('Yeni Kullanıcı')}</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('Ad')} className={field} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('Soyad')} className={field} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Ünvan')} className={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Telefon')} className={field} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('E‑posta')} className={field} />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('Şifre')} className={field} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${field} md:col-span-2`}>
              <option value="user" className="bg-[#071427]">{t('Personel')}</option>
              <option value="admin" className="bg-[#071427]">{t('Yönetici')}</option>
            </select>
          </div>
          <button type="submit" className="keep-white mt-3 w-full rounded-lg py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>{t('Ekle')}</button>
        </form>

        {/* TAM YEDEK - personel + TUM veriler (laptoplar arasi tam tasima) */}
        <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(46,155,255,0.4)', background: 'rgba(46,155,255,0.06)' }}>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white"><DatabaseBackup size={16} className="text-[var(--smc-bright)]" /> {t('Tam Yedek (personel + tüm veriler)')}</div>
          <div className="mb-3 text-xs leading-relaxed text-[var(--ink-soft)]">{t('Personel + kayıtlar + geçmiş + tüm ayarları (ekonomi, model, modüller, bağlantı, tema) tek dosyada taşır. İnternet gerekmez.')}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={doFullExport} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] bg-white/[0.03] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Download size={15} className="text-[var(--smc-bright)]" /> {t('Tam Dışa Aktar')}</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">{t('Bu bilgisayardaki personel + TÜM verileri tek dosyaya kaydeder.')}</span>
            </button>
            <button onClick={() => fullFileRef.current?.click()} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] bg-white/[0.03] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Upload size={15} className="text-[var(--c-saving)]" /> {t('Tam İçe Aktar')}</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">{t('Dosyadaki yedekle bu bilgisayarın TÜM verisini değiştirir (önce onay ister).')}</span>
            </button>
          </div>
          <input ref={fullFileRef} type="file" accept="application/json,.json" onChange={onPickFullFile} className="hidden" />
        </div>

        {/* SADECE PERSONEL (birlestir) - mevcut kisiler silinmeden personel ekler/gunceller */}
        <div className="mt-4 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white"><ArrowLeftRight size={16} className="text-[var(--smc-bright)]" /> {t('Sadece Personel (birleştir)')}</div>
          <div className="mb-3 text-xs leading-relaxed text-[var(--ink-soft)]">{t('Yalnızca personel listesini taşır ve')} <b className="text-[var(--ink)]">{t('birleştirir')}</b> {t('(mevcut kişiler/veriler silinmez). Diğer verileri taşımak için yukarıdaki Tam Yedek’i kullanın.')}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={doExport} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Download size={15} className="text-[var(--smc-bright)]" /> {t('Dışa Aktar')}</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">{t('Bu bilgisayardaki TÜM personeli (şifreleriyle) bir dosyaya kaydeder.')}</span>
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Upload size={15} className="text-[var(--c-saving)]" /> {t('İçe Aktar')}</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">{t('Dosyadaki personeli bu bilgisayara EKLER/GÜNCELLER. Mevcut kişiler silinmez.')}</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} className="hidden" />
          {transferMsg && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: transferMsg.ok ? 'rgba(65,224,138,0.12)' : 'rgba(255,107,107,0.12)', color: transferMsg.ok ? 'var(--c-saving)' : '#ff8a8a' }}>
              {transferMsg.text}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
