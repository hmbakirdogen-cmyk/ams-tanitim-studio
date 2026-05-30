/*
 * NE      : Karizmatik kullanici avatari - islenmis portreyi isiltili SMC cercevesi + derinlik gradyani + hafif renk gradesi ile gosterir.
 * NEDEN   : "kisi taninir ama cok karizmatik gorunsun" - her portre profesyonel/sinematik dursun; foto yoksa bas harfler.
 * NASIL   : Disda conic-gradient halka (glow) + ic dairede object-cover (ust-merkez) + alt gradyan + contrast/saturation filtresi.
 * YAN ETKI: Saf gorsel; her yerde (giris kartlari, sidebar, profil) ayni karizmatik gorunum.
 */
import type { User } from '@/auth/users'
import { resolvePhoto } from '@/lib/asset'

export function Avatar({ user, size = 64, ring = true }: { user: Pick<User, 'firstName' | 'lastName' | 'photo'>; size?: number; ring?: boolean }) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`
  const photo = resolvePhoto(user.photo) // base-uyumlu (varsayilan public foto) + data:/http oldugu gibi
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full"
        style={
          ring
            ? {
                padding: 2,
                background: 'conic-gradient(from 200deg, #0072CE, #2E9BFF, #36E0C8, #0072CE)',
                boxShadow: '0 0 24px -6px rgba(46,155,255,0.75)',
              }
            : undefined
        }
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-[#071427]">
          {photo ? (
            <>
              <img
                src={photo}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: 'center 30%', filter: 'contrast(1.06) saturate(1.08) brightness(1.02)' }}
              />
              {/* Alt gradyan - sinematik derinlik */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,6,15,0.42), transparent 55%)' }} />
            </>
          ) : (
            <div
              className="grid h-full w-full place-items-center font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#0072CE,#003A78)', fontSize: size * 0.36 }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
