// Perhitungan statistik per peserta untuk satu bulan.
// Fungsi murni (tanpa akses database) agar mudah diuji.
//
// Aturan: hari kerja tiap peserta dihitung mulai dari PRESENSI PERTAMA-nya
// (hadir/izin/sakit; presensi yang masih menunggu atau ditolak tidak menjadi tanda mulai),
// bukan dari awal bulan.

const pad = (n) => String(n).padStart(2, "0");
const STATUS_MULAI = ["hadir", "terlambat", "izin", "sakit"]; // "terlambat" tetap dihitung hadir

export const rentangBulan = (year, month) => {
  const lastDate = new Date(year, month + 1, 0).getDate();
  return {
    awal: `${year}-${pad(month + 1)}-01`,
    akhir: `${year}-${pad(month + 1)}-${pad(lastDate)}`,
    jumlahHari: lastDate,
  };
};

export const parseTanggal = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Jumlah hari Senin-Jumat dari `dari` sampai `sampai` (inklusif). Libur nasional tidak dikurangi.
export const hariKerjaAntara = (dari, sampai) => {
  const c = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  const end = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate());
  let total = 0;
  while (c <= end) {
    const h = c.getDay();
    if (h !== 0 && h !== 6) total++;
    c.setDate(c.getDate() + 1);
  }
  return total;
};

// Hari kerja dalam satu bulan: dari (awal bulan atau tanggal mulai, mana yang lebih akhir)
// sampai (akhir bulan atau hari ini, mana yang lebih awal).
export const hitungHariKerja = (year, month, today = new Date(), mulai = null) => {
  const awalBulan = new Date(year, month, 1);
  const akhirBulan = new Date(year, month + 1, 0);
  const hariIni = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dari = mulai && mulai > awalBulan ? mulai : awalBulan;
  const sampai = hariIni < akhirBulan ? hariIni : akhirBulan;
  return dari > sampai ? 0 : hariKerjaAntara(dari, sampai);
};

/**
 * presensi: SELURUH riwayat presensi masuk sampai akhir bulan yang dilihat
 *           (dibutuhkan untuk mengetahui tanggal presensi pertama tiap peserta).
 */
export function hitungStatistik({ peserta, presensi, kegiatan, year, month, today }) {
  const { awal, akhir } = rentangBulan(year, month);

  const perUser = new Map(
    peserta.map((p) => [
      p.id,
      {
        mulai: null,
        hadir: new Set(),
        terlambat: new Set(),
        izin: new Set(),
        sakit: new Set(),
        terakhir: null,
        kegiatan: { total: 0, disetujui: 0, menunggu: 0, ditolak: 0 },
      },
    ]),
  );

  for (const r of presensi) {
    const u = perUser.get(r.user_id);
    if (!u || !STATUS_MULAI.includes(r.status)) continue;
    if (!u.mulai || r.tanggal < u.mulai) u.mulai = r.tanggal;
    if (r.tanggal < awal || r.tanggal > akhir) continue; // hitung bulan ini saja
    if (r.status === "hadir" || r.status === "terlambat") {
      u.hadir.add(r.tanggal);
      if (r.status === "terlambat") u.terlambat.add(r.tanggal);
      if (!u.terakhir || r.tanggal > u.terakhir) u.terakhir = r.tanggal;
    } else if (r.status === "izin") u.izin.add(r.tanggal);
    else u.sakit.add(r.tanggal);
  }

  for (const k of kegiatan) {
    const u = perUser.get(k.user_id);
    if (!u) continue;
    u.kegiatan.total++;
    if (u.kegiatan[k.status] !== undefined) u.kegiatan[k.status]++;
  }

  const daftar = peserta.map((p) => {
    const u = perUser.get(p.id);
    const belumMulai = !u.mulai || u.mulai > akhir;
    const hariKerja = belumMulai ? 0 : hitungHariKerja(year, month, today, parseTanggal(u.mulai));
    const hadir = u.hadir.size;
    const terlambat = u.terlambat.size;
    const izin = u.izin.size;
    const sakit = u.sakit.size;
    const tidakHadir = Math.max(0, hariKerja - hadir - izin - sakit);
    const persen = hariKerja > 0 ? Math.min(100, Math.round((hadir / hariKerja) * 100)) : 0;
    return {
      ...p,
      mulai: u.mulai,
      belumMulai,
      hariKerja,
      hadir,
      terlambat,
      izin,
      sakit,
      tidakHadir,
      persen,
      terakhir: u.terakhir,
      kegiatan: u.kegiatan,
    };
  });

  const aktif = daftar.filter((p) => p.hariKerja > 0);
  return {
    daftar,
    ringkasan: {
      totalPeserta: daftar.length,
      rataKehadiran: aktif.length
        ? Math.round(aktif.reduce((a, p) => a + p.persen, 0) / aktif.length)
        : 0,
      kegiatanMenunggu: daftar.reduce((a, p) => a + p.kegiatan.menunggu, 0),
    },
  };
}
