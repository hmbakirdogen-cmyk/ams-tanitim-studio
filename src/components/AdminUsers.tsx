/*
 * NE      : Yonetici kullanici paneli - listele, YENI EKLE (ad/soyad/rol/sifre + unvan/telefon/e-posta), DETAY DUZENLE, sifre sifirla, sil.
 * NEDEN   : Mehmet Bey: yonetici (Karakelle Bey) arkadaslarinin detayli verilerini (unvan/telefon/e-posta) girebilsin + sifre tanimlasin.
 * NASIL   : auth.addUser(details) / auth.updateUser(id,patch) / auth.setPassword / auth.removeUser; her satir genisleyip detay duzenlenir.
 * YAN ETKI: Sadece yonetici erisir. KATI: cıplak sifre asla gosterilmez; kullanici kendini silemez.
 */
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Trash2, KeyRound, Pencil, Check, ShieldCheck, User as UserIcon, Download, Upload, ArrowLeftRight } from 'lucide-react'
import { sound } from '@/lib/sound'
import { download } from '@/data/recordings'
import { Avatar } from './Avatar'
import type { Auth } from '@/auth/useAuth'
import type { Role } from '@/auth/users'

const field = 'w-full rounded-lg border border-[var(--hair)] bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--ink-soft)]'

export function AdminUsers({ auth, onClose }: { auth: Auth; onClose: () => void }) {
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
  const [transferMsg, setTransferMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const doExport = () => {
    sound.click()
    download('ams-personel.json', auth.exportUsers(), 'application/json')
    setTransferMsg({ ok: true, text: `${auth.users.length} kişi "ams-personel.json" dosyasına aktarıldı. USB/e-posta ile diğer laptoplara taşıyın.` })
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
        setTransferMsg({ ok: true, text: `İçe aktarıldı: ${res.added} kişi eklendi, ${res.updated} kişi güncellendi. (Mevcut kişiler silinmedi.)` })
      } catch {
        setTransferMsg({ ok: false, text: 'Dosya okunamadı ya da geçersiz personel dosyası.' })
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
  const openEdit = (id: string, t?: string, p?: string, m?: string) => {
    setEditId(id); setETitle(t ?? ''); setEPhone(p ?? ''); setEEmail(m ?? ''); setResetId(null)
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
          <h2 className="text-xl font-bold text-white">Kullanıcılar</h2>
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
                    {[u.title, u.phone, u.email].filter(Boolean).join(' · ') || (u.role === 'admin' ? 'Yönetici' : 'Personel')}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => openEdit(u.id, u.title, u.phone, u.email)} title="Detayları düzenle" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><Pencil size={15} /></button>
                  <button onClick={() => { setResetId(u.id); setResetPw(''); setEditId(null) }} title="Şifre sıfırla" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><KeyRound size={15} /></button>
                  {auth.user?.id !== u.id && (
                    <button onClick={() => { sound.click(); auth.removeUser(u.id) }} title="Sil" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[#ff8a8a] transition hover:bg-white/5"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>

              {editId === u.id && (
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[var(--hair)] pt-3 md:grid-cols-3">
                  <input value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Ünvan" className={field} />
                  <input value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="Telefon" className={field} />
                  <input value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="E‑posta" className={field} />
                  <button onClick={saveEdit} className="keep-white flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white md:col-span-3" style={{ background: 'var(--smc)' }}><Check size={15} /> Detayları Kaydet</button>
                </div>
              )}

              {resetId === u.id && (
                <div className="mt-3 flex items-center gap-2 border-t border-[var(--hair)] pt-3">
                  <input type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Yeni şifre" className={field} />
                  <button onClick={() => doReset(u.id)} className="keep-white shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: 'var(--smc)' }}>Kaydet</button>
                  <button onClick={() => { setResetId(null); setResetPw('') }} className="shrink-0 text-xs text-[var(--ink-soft)]">vazgeç</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={add} className="mt-6 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><UserPlus size={16} /> Yeni Kullanıcı</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ad" className={field} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Soyad" className={field} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ünvan" className={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className={field} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E‑posta" className={field} />
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Şifre" className={field} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${field} md:col-span-2`}>
              <option value="user" className="bg-[#071427]">Personel</option>
              <option value="admin" className="bg-[#071427]">Yönetici</option>
            </select>
          </div>
          <button type="submit" className="keep-white mt-3 w-full rounded-lg py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>Ekle</button>
        </form>

        {/* Laptoplar arasi tasima - HER butonun NE yaptigi acikca yazili */}
        <div className="mt-6 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white"><ArrowLeftRight size={16} className="text-[var(--smc-bright)]" /> Personeli Taşı (laptoplar arası)</div>
          <div className="mb-3 text-xs leading-relaxed text-[var(--ink-soft)]">Her bilgisayar bağımsızdır. Listeyi bir kez kurup diğer laptoplara taşıyın — internet gerekmez.</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={doExport} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Download size={15} className="text-[var(--smc-bright)]" /> Dışa Aktar</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">Bu bilgisayardaki TÜM personeli (şifreleriyle) bir dosyaya kaydeder.</span>
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-start gap-0.5 rounded-xl border border-[var(--hair)] p-3 text-left transition hover:bg-white/5">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Upload size={15} className="text-[var(--c-saving)]" /> İçe Aktar</span>
              <span className="text-[11px] leading-snug text-[var(--ink-soft)]">Dosyadaki personeli bu bilgisayara EKLER/GÜNCELLER. Mevcut kişiler silinmez.</span>
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
