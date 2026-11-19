import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Plus } from "lucide-react";
import "@fontsource-variable/public-sans";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { downloadPresensiPdf } from "../utils/pdfExport";
import toast from "react-hot-toast";
import { FONT, TINTA, LATAR_KONTUR, PITA_LOGO, gayaChip, WARNA as WARNA_TEMA } from "../utils/tema";


const WARNA = { ...WARNA_TEMA, izin: WARNA_TEMA.ochre };

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
  else if (item.dalam_radius) chip = { teks: "Di area kantor", warna: WARNA.hijau };
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
    ["Hadir", hariUnik((r) => r.jenis === "masuk" && (r.status === "hadir" || r.status === "terlambat")), WARNA.hijau],
    ["Izin", hariUnik((r) => r.status === "izin"), WARNA.ochre],
    ["Sakit", hariUnik((r) => r.status === "sakit"), WARNA.merah],
    ["Menunggu", hariUnik((r) => r.status === "menunggu"), WARNA.biru],
  ];

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
            onClick={() => navigate(-1)}
            className="-ml-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-white/70 hover:text-primary-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || loading}
            className="flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(3,105,161,0.25)] transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Menyiapkan..." : "Unduh PDF"}
          </button>
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-5xl lg:leading-[1.1]">
            Riwayat presensi
          </h1>
          <p className="mt-1.5 text-[15px] text-[#0c2d48]/70 lg:mt-3 lg:text-base">
            50 catatan terbaru. PDF memuat seluruh riwayat.
          </p>

          <dl className="mt-10 hidden max-w-sm grid-cols-4 divide-x divide-primary-100 rounded-2xl bg-white/80 py-4 shadow-kartu ring-1 ring-primary-100 backdrop-blur lg:grid">
            {ringkasan.map(([label, nilai, warna], i) => (
              <div key={label} className={i === 0 ? "pl-5 pr-4" : "px-4"}>
                <dd className="font-mono text-3xl font-semibold tabular-nums leading-none" style={{ color: warna }}>
                  {loading ? "-" : nilai}
                </dd>
                <dt className="mt-2 text-xs text-[#0c2d48]/65">{label}</dt>
              </div>
            ))}
          </dl>
          <button
            onClick={() => navigate("/presensi-manual")}
            className="mt-6 hidden items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition hover:bg-white lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Buat presensi manual
          </button>
        </div>

        <p className="hidden text-xs text-[#0c2d48]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      <main className="lg:min-h-screen lg:bg-white lg:px-16 lg:py-12">
        <div className="mx-auto mt-6 w-full max-w-xl px-5 pb-16 sm:px-8 lg:mt-0 lg:max-w-lg lg:px-0 lg:pb-0">
          {loading ? (
            <div className="flex justify-center rounded-2xl border border-primary-100 bg-white py-14 shadow-kartu">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
            </div>
          ) : riwayat.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 px-6 py-12 text-center">
              <p className="text-[15px] text-[#0c2d48]/70">Belum ada riwayat presensi.</p>
              <button
                onClick={() => navigate("/presensi-manual")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
              >
                <Plus className="h-4 w-4" />
                Buat presensi manual
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {riwayat.map((item) => {
                const { judul, chip, metode } = uraikan(item);
                const t = pecahTanggal(item.tanggal);
                return (
                  <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-l-4 border-primary-100 bg-white px-4 py-3.5 shadow-kartu sm:px-5" style={{ borderLeftColor: chip.warna }}>
                    <div className="w-12 shrink-0 rounded-xl bg-primary-50 py-1.5 text-center">
                      <p className="font-mono text-2xl font-semibold leading-none tabular-nums">
                        {t.hari}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#0c2d48]/55">
                        {t.bulan}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {judul}
                        <span className="ml-2 font-normal text-[#0c2d48]/55">{t.nama}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#0c2d48]/60">
                        {metode}
                        {item.alasan && ` · ${item.alasan}`}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={gayaChip(chip.warna)}
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
