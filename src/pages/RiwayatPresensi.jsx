import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Plus } from "lucide-react";
import "@fontsource-variable/public-sans";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { downloadPresensiPdf } from "../utils/pdfExport";
import konturUrl from "../assets/kontur.svg";
import toast from "react-hot-toast";

// Palet sama dengan Login dan Dashboard
const KERTAS = "#f3efe6";
const TINTA = "#14213d";
const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };
const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: `url(${konturUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "right bottom",
};

const WARNA = {
  tinta: "#14213d",
  biru: "#2b4c7e",
  izin: "#b7791f",
  merah: "#a63d2f",
};

// Judul baris + label status untuk satu catatan presensi
function uraikan(item) {
  const kategori =
    item.kategori === "izin" || item.kategori === "sakit"
      ? item.kategori
      : item.status === "izin" || item.status === "sakit"
        ? item.status
        : null;

  const judul = kategori
    ? kategori === "izin"
      ? "Izin"
      : "Sakit"
    : item.jenis === "masuk"
      ? "Masuk"
      : "Pulang";

  let chip;
  if (item.status === "menunggu") chip = { teks: "Menunggu persetujuan", warna: WARNA.biru };
  else if (item.status === "ditolak") chip = { teks: "Ditolak", warna: WARNA.merah };
  else if (kategori === "izin") chip = { teks: "Izin", warna: WARNA.izin };
  else if (kategori === "sakit") chip = { teks: "Sakit", warna: WARNA.merah };
  else if (item.status === "terlambat") chip = { teks: "Terlambat", warna: WARNA.izin };
  else if (item.metode === "manual") chip = { teks: "Manual", warna: WARNA.biru };
  else if (item.dalam_radius) chip = { teks: "Di area kantor", warna: WARNA.tinta };
  else chip = { teks: "Di luar area", warna: WARNA.merah };

  const metode = kategori
    ? "Pengajuan"
    : item.metode === "otomatis"
      ? "Otomatis"
      : "Manual";

  return { judul, chip, metode };
}

function pecahTanggal(tanggal) {
  const d = new Date(tanggal);
  return {
    hari: d.toLocaleDateString("id-ID", { day: "2-digit" }),
    bulan: d.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
    nama: d.toLocaleDateString("id-ID", { weekday: "long" }),
  };
}

export default function RiwayatPresensi() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let batal = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("presensi")
          .select("*")
          .eq("user_id", profile.id)
          .order("tanggal", { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!batal) setRiwayat(data || []);
      } catch (error) {
        if (!batal) toast.error(error.message || "Gagal memuat riwayat");
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [profile?.id]);

  // Ambil SEMUA riwayat (tampilan hanya memuat 50 terbaru), lalu buat PDF
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from("presensi")
        .select("*")
        .eq("user_id", profile.id)
        .order("tanggal", { ascending: false })
        .order("jenis", { ascending: true })
        .limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Belum ada data untuk diunduh");
        return;
      }
      await downloadPresensiPdf(profile, data);
      toast.success("PDF berhasil dibuat");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  };

  const hariUnik = (fn) => new Set(riwayat.filter(fn).map((r) => r.tanggal)).size;
  const ringkasan = [
    ["Hadir", hariUnik((r) => r.jenis === "masuk" && (r.status === "hadir" || r.status === "terlambat"))],
    ["Izin", hariUnik((r) => r.status === "izin")],
    ["Sakit", hariUnik((r) => r.status === "sakit")],
    ["Menunggu", hariUnik((r) => r.status === "menunggu")],
  ];

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
            onClick={() => navigate(-1)}
            className="-ml-2 flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-[#14213d]/70 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || loading}
            className="flex items-center gap-1.5 rounded-lg bg-[#14213d] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1d2d52] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Menyiapkan..." : "Unduh PDF"}
          </button>
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-5xl lg:leading-[1.1]">
            Riwayat presensi
          </h1>
          <p className="mt-1.5 text-[15px] text-[#14213d]/70 lg:mt-3 lg:text-base">
            50 catatan terbaru. PDF memuat seluruh riwayat.
          </p>

          <dl className="mt-10 hidden max-w-sm grid-cols-4 divide-x divide-[#14213d]/10 border-y border-[#14213d]/10 py-4 lg:grid">
            {ringkasan.map(([label, nilai], i) => (
              <div key={label} className={i === 0 ? "pr-4" : "px-4"}>
                <dd className="font-mono text-3xl font-semibold tabular-nums leading-none">
                  {loading ? "-" : nilai}
                </dd>
                <dt className="mt-2 text-xs text-[#14213d]/65">{label}</dt>
              </div>
            ))}
          </dl>
          <button
            onClick={() => navigate("/presensi-manual")}
            className="mt-6 hidden items-center gap-1.5 text-sm font-semibold text-[#1d4ed8] hover:underline lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Buat presensi manual
          </button>
        </div>

        <p className="hidden text-xs text-[#14213d]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      <main className="lg:min-h-screen lg:bg-white lg:px-16 lg:py-12">
        <div className="mx-auto mt-6 w-full max-w-xl px-5 pb-16 sm:px-8 lg:mt-0 lg:max-w-lg lg:px-0 lg:pb-0">
          {loading ? (
            <div className="flex justify-center rounded-xl border border-[#14213d]/10 bg-white py-14">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
            </div>
          ) : riwayat.length === 0 ? (
            <div className="rounded-xl border border-[#14213d]/10 bg-white px-6 py-12 text-center">
              <p className="text-[15px] text-[#14213d]/70">Belum ada riwayat presensi.</p>
              <button
                onClick={() => navigate("/presensi-manual")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d4ed8] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Buat presensi manual
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
              {riwayat.map((item) => {
                const { judul, chip, metode } = uraikan(item);
                const t = pecahTanggal(item.tanggal);
                return (
                  <li key={item.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                    <div className="w-12 shrink-0 text-center">
                      <p className="font-mono text-2xl font-semibold leading-none tabular-nums">
                        {t.hari}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#14213d]/55">
                        {t.bulan}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {judul}
                        <span className="ml-2 font-normal text-[#14213d]/55">{t.nama}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#14213d]/60">
                        {metode}
                        {item.alasan && ` · ${item.alasan}`}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ color: chip.warna, backgroundColor: `${chip.warna}14` }}
                    >
                      {chip.teks}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
