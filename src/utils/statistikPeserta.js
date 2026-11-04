// Perhitungan statistik per peserta untuk satu bulan.
// Fungsi murni (tanpa akses database) agar mudah diuji.

const pad = (n) => String(n).padStart(2, "0");

export const rentangBulan = (year, month) => {
  const lastDate = new Date(year, month + 1, 0).getDate();
  return {
    awal: `${year}-${pad(month + 1)}-01`,
    akhir: `${year}-${pad(month + 1)}-${pad(lastDate)}`,
    jumlahHari: lastDate,
  };
};

// Hari kerja (Senin-Jumat) sampai hari ini bila bulan berjalan, atau sebulan penuh bila sudah lewat.
// Hari libur nasional tidak diperhitungkan.
export const hitungHariKerja = (year, month, today = new Date()) => {
  const { jumlahHari } = rentangBulan(year, month);
  const bulanIni = today.getFullYear() === year && today.getMonth() === month;
  const bulanDepan =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());
  if (bulanDepan) return 0;
  const sampai = bulanIni ? today.getDate() : jumlahHari;
  let total = 0;
  for (let d = 1; d <= sampai; d++) {
    const hari = new Date(year, month, d).getDay();
    if (hari !== 0 && hari !== 6) total++;
  }
  return total;
};

export function hitungStatistik({ peserta, presensi, kegiatan, year, month, today }) {
  const hariKerja = hitungHariKerja(year, month, today);

  const perUser = new Map(
    peserta.map((p) => [
      p.id,
      {
        hadir: new Set(),
        izin: new Set(),
        sakit: new Set(),
        terakhir: null,
        kegiatan: { total: 0, disetujui: 0, menunggu: 0, ditolak: 0 },
      },
    ]),
  );

  for (const r of presensi) {
    const u = perUser.get(r.user_id);
    if (!u) continue;
    if (r.status === "hadir") {
      u.hadir.add(r.tanggal);
      if (!u.terakhir || r.tanggal > u.terakhir) u.terakhir = r.tanggal;
    } else if (r.status === "izin") u.izin.add(r.tanggal);
    else if (r.status === "sakit") u.sakit.add(r.tanggal);
  }

  for (const k of kegiatan) {
    const u = perUser.get(k.user_id);
    if (!u) continue;
    u.kegiatan.total++;
    if (u.kegiatan[k.status] !== undefined) u.kegiatan[k.status]++;
  }

  const daftar = peserta.map((p) => {
    const u = perUser.get(p.id);
    const hadir = u.hadir.size;
    const izin = u.izin.size;
    const sakit = u.sakit.size;
    const tidakHadir = Math.max(0, hariKerja - hadir - izin - sakit);
    const persen = hariKerja > 0 ? Math.min(100, Math.round((hadir / hariKerja) * 100)) : 0;
    return { ...p, hadir, izin, sakit, tidakHadir, persen, terakhir: u.terakhir, kegiatan: u.kegiatan };
  });

  const rata =
    daftar.length > 0 && hariKerja > 0
      ? Math.round(daftar.reduce((a, p) => a + p.persen, 0) / daftar.length)
      : 0;

  return {
    hariKerja,
    daftar,
    ringkasan: {
      totalPeserta: daftar.length,
      rataKehadiran: rata,
      kegiatanMenunggu: daftar.reduce((a, p) => a + p.kegiatan.menunggu, 0),
    },
  };
}
