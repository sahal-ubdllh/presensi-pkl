/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, FileText, TrendingUp, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "../lib/supabase";
import { hitungStatistik, rentangBulan } from "../utils/statistikPeserta";
import toast from "react-hot-toast";
import BottomNav from "../components/BottomNav";

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
  persen >= 80
    ? { bar: "bg-emerald-500", teks: "text-emerald-600" }
    : persen >= 60
      ? { bar: "bg-amber-500", teks: "text-amber-600" }
      : { bar: "bg-rose-500", teks: "text-rose-600" };

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
        fetchAll(() =>
          supabase
            .from("presensi")
            .select("user_id, tanggal, status")
            .eq("jenis", "masuk")
            .gte("tanggal", awal)
            .lte("tanggal", akhir),
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

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-24">
      <h1 className="text-2xl font-bold text-slate-900">Statistik Peserta</h1>
      <p className="text-sm text-slate-500 mt-0.5">Kehadiran dan kegiatan tiap peserta PKL</p>

      {/* Pemilih bulan */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-2 py-2 mt-5">
        <button onClick={() => geser(-1)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Bulan sebelumnya">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-slate-800 capitalize">{label}</span>
        <button
          onClick={() => geser(1)}
          disabled={bulanIni}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading || !data ? (
        <div className="p-10 text-center text-slate-500">Memuat statistik...</div>
      ) : (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Ringkas ikon={Users} nilai={data.ringkasan.totalPeserta} label="Peserta" kelas="bg-blue-50 text-blue-600" />
            <Ringkas ikon={TrendingUp} nilai={`${data.ringkasan.rataKehadiran}%`} label="Rata-rata hadir" kelas="bg-emerald-50 text-emerald-600" />
            <Ringkas ikon={FileText} nilai={data.ringkasan.kegiatanMenunggu} label="Kegiatan menunggu" kelas="bg-amber-50 text-amber-600" />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Dihitung dari {data.hariKerja} hari kerja (Senin-Jumat, libur nasional tidak dikurangi).
            Presensi manual yang belum disetujui belum dihitung hadir.
          </p>

          {/* Cari & urut */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama atau instansi..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            <select
              value={urut}
              onChange={(e) => setUrut(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 text-sm"
            >
              <option value="nama">Urut nama</option>
              <option value="terendah">Kehadiran terendah</option>
            </select>
          </div>

          {/* Daftar peserta */}
          {daftar.length === 0 ? (
            <div className="text-center text-slate-500 py-12 border border-dashed border-slate-200 rounded-2xl mt-4 bg-white">
              {data.daftar.length === 0 ? "Belum ada peserta" : "Peserta tidak ditemukan"}
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {daftar.map((p) => {
                const w = warna(p.persen);
                return (
                  <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.nama_lengkap || "-"}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {[p.jenis_peserta, p.asal_instansi].filter(Boolean).join(" • ") || "-"}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${w.teks}`}>{p.persen}%</span>
                    </div>

                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div className={`h-full rounded-full ${w.bar}`} style={{ width: `${p.persen}%` }} />
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                      <Mini nilai={p.hadir} label="Hadir" kelas="text-emerald-600" />
                      <Mini nilai={p.izin} label="Izin" kelas="text-amber-600" />
                      <Mini nilai={p.sakit} label="Sakit" kelas="text-sky-600" />
                      <Mini nilai={p.tidakHadir} label="Tidak hadir" kelas="text-rose-600" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Kegiatan: {p.kegiatan.total}</span>
                      <span className="text-emerald-600">{p.kegiatan.disetujui} disetujui</span>
                      <span className="text-amber-600">{p.kegiatan.menunggu} menunggu</span>
                      <span className="text-rose-600">{p.kegiatan.ditolak} ditolak</span>
                      <span className="ml-auto">
                        Terakhir hadir:{" "}
                        {p.terakhir ? format(new Date(p.terakhir), "dd MMM", { locale: localeId }) : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <BottomNav />
    </div>
  );
}

function Ringkas({ ikon: Ikon, nilai, label, kelas }) {
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kelas}`}>
        <Ikon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-slate-900">{nilai}</p>
      <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
    </div>
  );
}

function Mini({ nilai, label, kelas }) {
  return (
    <div className="bg-slate-50 rounded-xl py-2">
      <p className={`text-base font-bold ${kelas}`}>{nilai}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
