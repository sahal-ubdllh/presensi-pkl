/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "../lib/supabase";
import { hitungStatistik, rentangBulan } from "../utils/statistikPeserta";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, WARNA, LATAR_KONTUR, INPUT_CLS, SOFT, PITA_LOGO } from "../utils/tema";

// Ambil semua baris (Supabase membatasi 1000 baris per permintaan)
const fetchAll = async (buildQuery) => {
  const rows = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await buildQuery().range(from, from + size - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < size) break;
  }
  return rows;
};

const warna = (persen) =>
  persen >= 80 ? WARNA.hijau : persen >= 60 ? WARNA.ochre : WARNA.merah;

export default function StatistikPeserta() {
  const sekarang = new Date();
  const [bulan, setBulan] = useState({ year: sekarang.getFullYear(), month: sekarang.getMonth() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [urut, setUrut] = useState("nama");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const { awal, akhir } = rentangBulan(bulan.year, bulan.month);
      const [peserta, presensi, kegiatan] = await Promise.all([
        fetchAll(() =>
          supabase
            .from("users")
            .select("id, nama_lengkap, asal_instansi, jenis_peserta")
            .eq("role", "peserta")
            .order("nama_lengkap"),
        ),
        // Seluruh riwayat sampai akhir bulan: dibutuhkan untuk mengetahui presensi pertama tiap peserta
        fetchAll(() =>
          supabase
            .from("presensi")
            .select("user_id, tanggal, status")
            .eq("jenis", "masuk")
            .lte("tanggal", akhir)
            .order("tanggal", { ascending: true })
            .order("user_id", { ascending: true }),
        ),
        fetchAll(() =>
          supabase
            .from("kegiatan")
            .select("user_id, status, tanggal")
            .neq("status", "draft")
            .gte("tanggal", awal)
            .lte("tanggal", akhir),
        ),
      ]);
      setData(
        hitungStatistik({ peserta, presensi, kegiatan, year: bulan.year, month: bulan.month, today: new Date() }),
      );
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat statistik: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, [bulan]);

  useEffect(() => {
    muat();
  }, [muat]);

  const geser = (delta) =>
    setBulan(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const bulanIni = bulan.year === sekarang.getFullYear() && bulan.month === sekarang.getMonth();
  const label = format(new Date(bulan.year, bulan.month, 1), "MMMM yyyy", { locale: localeId });

  const daftar = useMemo(() => {
    if (!data) return [];
    const q = cari.trim().toLowerCase();
    const hasil = data.daftar.filter(
      (p) =>
        !q ||
        (p.nama_lengkap || "").toLowerCase().includes(q) ||
        (p.asal_instansi || "").toLowerCase().includes(q),
    );
    if (urut === "terendah") hasil.sort((a, b) => a.persen - b.persen || (a.nama_lengkap || "").localeCompare(b.nama_lengkap || ""));
    return hasil;
  }, [data, cari, urut]);

  const ringkasan = data
    ? [
        ["Peserta", data.ringkasan.totalPeserta, SOFT.biru],
        ["Rata-rata hadir", `${data.ringkasan.rataKehadiran}%`, SOFT.hijau],
        ["Kegiatan menunggu", data.ringkasan.kegiatanMenunggu, SOFT.kuning],
      ]
    : [];

  return (
    <DashboardLayout className="bg-[#f0f9ff]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="relative pb-12 pt-10">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-block rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-medium tracking-wide text-primary-700 ring-1 ring-primary-100">Sigap</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Statistik peserta
              </h1>
              <p className="mt-2 text-[15px] text-[#0c2d48]/70">
                Kehadiran dan kegiatan tiap peserta PKL.
              </p>
            </div>

            {/* Pemilih bulan */}
            <div className="flex w-full items-center justify-between rounded-full border border-primary-100 bg-white p-1 shadow-kartu md:w-64">
              <button
                onClick={() => geser(-1)}
                className="rounded-full p-2 text-primary-700 hover:bg-primary-50"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold capitalize">{label}</span>
              <button
                onClick={() => geser(1)}
                disabled={bulanIni}
                className="rounded-full p-2 text-primary-700 hover:bg-primary-50 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 pb-28 pt-6 sm:px-8">
          {loading || !data ? (
            <div className="flex justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Ringkasan */}
              <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {ringkasan.map(([label, nilai, soft]) => (
                  <div key={label} className="rounded-2xl border px-4 py-4 sm:px-5" style={{ backgroundColor: soft.bg, borderColor: soft.garis }}>
                    <dd className="font-mono text-3xl font-semibold tabular-nums leading-none sm:text-4xl" style={{ color: soft.fg }}>
                      {nilai}
                    </dd>
                    <dt className="mt-2 text-xs font-medium" style={{ color: soft.fg }}>{label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-2.5 text-xs leading-relaxed text-[#0c2d48]/55">
                Hari kerja (Senin-Jumat) dihitung sejak presensi pertama tiap peserta; libur nasional
                tidak dikurangi. Presensi manual yang belum disetujui belum dihitung hadir.
              </p>

              {/* Cari & urut */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500" />
                  <input
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    placeholder="Cari nama atau instansi..."
                    className={`${INPUT_CLS} h-12 pl-10 text-sm`}
                  />
                </div>
                <select
                  value={urut}
                  onChange={(e) => setUrut(e.target.value)}
                  className={`${INPUT_CLS} h-12 text-sm sm:w-56`}
                >
                  <option value="nama">Urut nama</option>
                  <option value="terendah">Kehadiran terendah</option>
                </select>
              </div>

              {/* Daftar peserta */}
              {daftar.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 px-6 py-12 text-center text-sm text-[#0c2d48]/65">
                  {data.daftar.length === 0 ? "Belum ada peserta" : "Peserta tidak ditemukan"}
                </div>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {daftar.map((p) => {
                    const w = warna(p.persen);
                    return (
                      <article
                        key={p.id}
                        className="rounded-2xl border border-l-4 border-primary-100 bg-white p-4 shadow-kartu sm:p-5"
                        style={{ borderLeftColor: p.belumMulai ? "#cbd5e1" : w }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{p.nama_lengkap || "-"}</p>
                            <p className="mt-0.5 truncate text-xs text-[#0c2d48]/60">
                              {[p.jenis_peserta, p.asal_instansi].filter(Boolean).join(" · ") || "-"}
                            </p>
                          </div>
                          {p.belumMulai ? (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              Belum mulai
                            </span>
                          ) : (
                            <span
                              className="shrink-0 font-mono text-2xl font-semibold tabular-nums leading-none"
                              style={{ color: w }}
                            >
                              {p.persen}%
                            </span>
                          )}
                        </div>

                        <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.persen}%`, backgroundColor: w }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#0c2d48]/55">
                          {p.mulai
                            ? `Mulai presensi ${format(new Date(p.mulai), "dd MMM yyyy", { locale: localeId })}${
                                p.belumMulai
                                  ? " (setelah bulan ini)"
                                  : ` · ${p.hariKerja} hari kerja${p.terlambat > 0 ? ` · ${p.terlambat}x terlambat` : ""}`
                              }`
                            : "Belum pernah presensi"}
                        </p>

                        <dl className="mt-4 grid grid-cols-4 gap-1.5">
                          <Mini nilai={p.hadir} label="Hadir" warna={WARNA.hijau} soft={SOFT.hijau} />
                          <Mini nilai={p.izin} label="Izin" warna={WARNA.ochre} soft={SOFT.kuning} />
                          <Mini nilai={p.sakit} label="Sakit" warna={WARNA.merah} soft={SOFT.merah} />
                          <Mini nilai={p.tidakHadir} label="Tidak hadir" warna="#475569" soft={{ bg: "#f1f5f9" }} />
                        </dl>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#0c2d48]/60">
                          <span className="font-semibold text-[#0c2d48]">Kegiatan {p.kegiatan.total}</span>
                          <span style={{ color: WARNA.hijau }}>{p.kegiatan.disetujui} disetujui</span>
                          <span style={{ color: WARNA.biru }}>{p.kegiatan.menunggu} menunggu</span>
                          <span style={{ color: WARNA.merah }}>{p.kegiatan.ditolak} ditolak</span>
                          <span className="ml-auto font-mono">
                            Terakhir hadir{" "}
                            {p.terakhir ? format(new Date(p.terakhir), "dd MMM", { locale: localeId }) : "-"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Mini({ nilai, label, warna: w, soft }) {
  return (
    <div className="rounded-xl px-1 py-2.5 text-center" style={{ backgroundColor: soft.bg }}>
      <dd className="font-mono text-xl font-semibold tabular-nums leading-none" style={{ color: w }}>
        {nilai}
      </dd>
      <dt className="mt-1.5 text-[10px] font-medium" style={{ color: w }}>{label}</dt>
    </div>
  );
}
