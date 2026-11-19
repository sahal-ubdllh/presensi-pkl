import { ArrowLeft } from "lucide-react";
import { FONT, LATAR_KONTUR, TINTA, PITA_LOGO } from "../utils/tema";

/**
 * Kerangka halaman peserta: pita kontur di atas (mobile) / panel kiri (desktop),
 * isi halaman di sisi kanan. Sama dengan susunan halaman Login.
 *
 * @param judul, deskripsi  teks utama di sisi kontur
 * @param atas              elemen di atas judul (mis. foto profil)
 * @param samping           isi tambahan di sisi kontur (ringkasan, langkah, dsb.)
 * @param aksi              tombol di pojok kanan atas sisi kontur
 * @param lebar            kelas lebar maksimum isi kanan di desktop
 * @param tengah            true: isi kanan diletakkan di tengah vertikal (untuk formulir)
 */
export default function PageShell({
  onBack,
  aksi,
  judul,
  deskripsi,
  atas,
  samping,
  tengah = false,
  lebar = "lg:max-w-md",
  children,
}) {
  return (
    <div
      className="min-h-screen bg-[#f0f9ff] lg:grid lg:grid-cols-[1.08fr_1fr]"
      style={{ ...FONT, color: TINTA }}
    >
      <aside
        style={LATAR_KONTUR}
        className="relative px-5 pb-6 pt-5 sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
        <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:mx-0 lg:max-w-none">
          <button
            onClick={onBack}
            className="-ml-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-white/70 hover:text-primary-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          {aksi}
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-lg">
          {atas}
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-5xl lg:leading-[1.1]">
            {judul}
          </h1>
          {deskripsi && (
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-[#0c2d48]/70 lg:mt-3 lg:text-base">
              {deskripsi}
            </p>
          )}
          {samping}
        </div>

        <p className="hidden text-xs text-[#0c2d48]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      <main
        className={`lg:min-h-screen lg:bg-white lg:px-16 lg:py-12 ${
          tengah ? "lg:flex lg:items-center lg:justify-center" : ""
        }`}
      >
        <div className={`mx-auto mt-6 w-full max-w-xl px-5 pb-16 sm:px-8 lg:mt-0 ${lebar} lg:px-0 lg:pb-0`}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Daftar langkah bernomor ala halaman Login (hanya tampil di desktop)
export function DaftarLangkah({ langkah }) {
  return (
    <ol className="mt-10 hidden max-w-sm space-y-2.5 lg:block">
      {langkah.map(([no, teks]) => (
        <li key={no} className="flex items-center gap-4 rounded-2xl bg-white/80 px-4 py-3 shadow-kartu ring-1 ring-primary-100 backdrop-blur">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-xs font-semibold tabular-nums text-primary-700">{no}</span>
          <span className="text-[15px] font-medium">{teks}</span>
        </li>
      ))}
    </ol>
  );
}

// Deretan angka ringkasan (mono, dipisah garis) di sisi kontur, hanya desktop
export function RingkasanAngka({ data, memuat }) {
  return (
    <dl
      className="mt-10 hidden max-w-sm divide-x divide-primary-100 rounded-2xl bg-white/80 py-4 shadow-kartu ring-1 ring-primary-100 backdrop-blur lg:grid"
      style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
    >
      {data.map(([label, nilai, warna], i) => (
        <div key={label} className={i === 0 ? "pl-5 pr-4" : "px-4"}>
          <dd className="font-mono text-3xl font-semibold tabular-nums leading-none text-primary-700" style={warna ? { color: warna } : undefined}>
            {memuat ? "-" : nilai}
          </dd>
          <dt className="mt-2 text-xs text-[#0c2d48]/65">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

// Foto profil bulat; bila belum ada foto, tampil inisial
export function Avatar({ profile, className = "" }) {
  return (
    <div
      className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-400 to-primary-700 ring-4 ring-white shadow-kartu lg:h-28 lg:w-28 ${className}`}
    >
      {profile?.foto_profil ? (
        <img src={profile.foto_profil} alt="Foto profil" className="h-full w-full object-cover" />
      ) : (
        <span className="text-3xl font-bold text-white lg:text-4xl">
          {profile?.nama_lengkap?.charAt(0)?.toUpperCase() || "U"}
        </span>
      )}
    </div>
  );
}
