import "@fontsource-variable/public-sans";

/**
 * Tema Sigap: bersih, terang, mengacu pada warna logo Dinas Sosial Majalengka
 * (merah-koral, biru langit, hijau, kuning) di atas dasar putih.
 *
 * Aturan pemakaian warna (supaya fungsi tetap terbaca):
 *   biru langit -> aksi utama, tautan, status "menunggu"
 *   hijau       -> berhasil / hadir / disetujui
 *   kuning      -> perhatian / izin / terlambat
 *   merah       -> gagal / ditolak / di luar area / tidak hadir
 */

// Latar & teks dasar
export const KERTAS = "#f0f9ff"; // biru langit sangat muda (latar halaman)
export const TINTA = "#0c2d48"; // biru tua keabu-abuan untuk teks utama
export const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };

// Warna semantik. Semua lolos kontras teks (>= 4.5:1) di atas putih.
export const WARNA = {
  tinta: "#0c2d48",
  biru: "#0369a1", // aksi utama / menunggu
  langit: "#0ea5e9", // aksen terang (ikon, garis, grafik)
  ochre: "#a16207", // kuning: izin / terlambat / perhatian
  merah: "#d32f2f", // merah logo: ditolak / gagal
  hijau: "#2e7d32", // hijau: hadir / disetujui
};

// Pasangan latar lembut untuk kartu, ikon, dan banner status
export const SOFT = {
  biru: { bg: "#e0f2fe", fg: "#0369a1", garis: "#bae6fd" },
  hijau: { bg: "#dcfce7", fg: "#2e7d32", garis: "#bbf7d0" },
  kuning: { bg: "#fef9c3", fg: "#a16207", garis: "#fde68a" },
  merah: { bg: "#fee2e2", fg: "#d32f2f", garis: "#fecaca" },
};

// Latar "hero": putih dengan semburat biru langit, hijau, dan kuning yang lembut.
// (Nama LATAR_KONTUR dipertahankan agar semua halaman tetap memakainya.)
export const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: [
    "radial-gradient(60% 55% at 100% 0%, rgba(56,189,248,.30) 0%, rgba(56,189,248,0) 70%)",
    "radial-gradient(48% 45% at 0% 100%, rgba(134,239,172,.32) 0%, rgba(134,239,172,0) 70%)",
    "radial-gradient(34% 32% at 100% 100%, rgba(253,224,71,.24) 0%, rgba(253,224,71,0) 70%)",
  ].join(","),
};

// Pita empat warna logo (merah, kuning, hijau, biru) sebagai aksen tipis
export const PITA_LOGO =
  "linear-gradient(90deg,#e53935 0%,#e53935 25%,#facc15 25%,#facc15 50%,#4caf50 50%,#4caf50 75%,#0ea5e9 75%,#0ea5e9 100%)";

export const INPUT_CLS =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/15";

// Label status berwarna: teks warna penuh, latar warna yang sama dengan opasitas rendah
const LATAR_CHIP = {
  [WARNA.biru]: SOFT.biru.bg,
  [WARNA.hijau]: SOFT.hijau.bg,
  [WARNA.ochre]: SOFT.kuning.bg,
  [WARNA.merah]: SOFT.merah.bg,
};
export const gayaChip = (warna) => ({ color: warna, backgroundColor: LATAR_CHIP[warna] || `${warna}1a` });
