import { ArrowLeft } from "lucide-react";
import { FONT, LATAR_KONTUR, TINTA } from "../utils/tema";

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
      className="min-h-screen bg-[#f3efe6] lg:grid lg:grid-cols-[1.08fr_1fr]"
      style={{ ...FONT, color: TINTA }}
    >
      <aside
        style={LATAR_KONTUR}
        className="px-5 pb-6 pt-5 sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20"
      >
        <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:mx-0 lg:max-w-none">
          <button
            onClick={onBack}
            className="-ml-2 flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-[#14213d]/70 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
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
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-[#14213d]/70 lg:mt-3 lg:text-base">
              {deskripsi}
            </p>
          )}
          {samping}
        </div>

        <p className="hidden text-xs text-[#14213d]/55 lg:block">
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
    <ol className="mt-10 hidden max-w-sm divide-y divide-[#14213d]/10 border-y border-[#14213d]/10 lg:block">
      {langkah.map(([no, teks]) => (
        <li key={no} className="flex items-baseline gap-5 py-3">
          <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">{no}</span>
          <span className="text-[15px]">{teks}</span>
        </li>
      ))}
    </ol>
  );
}

// Deretan angka ringkasan (mono, dipisah garis) di sisi kontur, hanya desktop
export function RingkasanAngka({ data, memuat }) {
  return (
    <dl
      className="mt-10 hidden max-w-sm divide-x divide-[#14213d]/10 border-y border-[#14213d]/10 py-4 lg:grid"
      style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
    >
      {data.map(([label, nilai], i) => (
        <div key={label} className={i === 0 ? "pr-4" : "px-4"}>
          <dd className="font-mono text-3xl font-semibold tabular-nums leading-none">
            {memuat ? "-" : nilai}
          </dd>
          <dt className="mt-2 text-xs text-[#14213d]/65">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

// Foto profil bulat; bila belum ada foto, tampil inisial
export function Avatar({ profile, className = "" }) {
  return (
    <div
      className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#14213d] ring-4 ring-white/80 lg:h-28 lg:w-28 ${className}`}
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
