import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  LogIn,
  LogOut,
  History,
  FilePlus,
  FileEdit,
  FileText,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import "@fontsource-variable/public-sans";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getCurrentMonthYear, getTodayString } from "../utils/dateUtils";
import { supabase } from "../lib/supabase";
import {
  rentangBulan,
  hitungHariKerja,
  parseTanggal,
} from "../utils/statistikPeserta";
import Pengumuman from "./Pengumuman";
import toast from "react-hot-toast";
import { FONT, TINTA, LATAR_KONTUR, SOFT, WARNA, PITA_LOGO } from "../utils/tema";


// Menu dikelompokkan supaya tidak berupa 6 kotak yang sama rata
const menuGroups = [
  {
    no: "01",
    title: "Kehadiran",
    items: [
      { id: "kehadiran", label: "Buat kehadiran", icon: LogIn, path: "/presensi", utama: true, warna: "biru" },
      { id: "manual", label: "Kehadiran manual", icon: FileEdit, path: "/presensi-manual", warna: "kuning" },
      { id: "riwayat-presensi", label: "Riwayat hadir", icon: History, path: "/riwayat-presensi", warna: "biru" },
    ],
  },
  {
    no: "02",
    title: "Kegiatan",
    items: [
      { id: "kegiatan", label: "Buat kegiatan", icon: FilePlus, path: "/logbook", utama: true, warna: "hijau" },
      { id: "draft", label: "Draft kegiatan", icon: FileEdit, path: "/draft-kegiatan", warna: "kuning" },
      { id: "riwayat-kegiatan", label: "Riwayat kegiatan", icon: FileText, path: "/riwayat-kegiatan", warna: "biru" },
    ],
  },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loadingStats, setLoadingStats] = useState(true);
  const [todayStats, setTodayStats] = useState({
    jamMasuk: null,
    jamKeluar: null,
    kategori: null, // "izin" | "sakit" bila hari ini tidak masuk
    menunggu: false, // pengajuan izin/sakit hari ini belum disetujui
  });
  const [monthlyStats, setMonthlyStats] = useState({
    hadir: 0,
    izin: 0,
    sakit: 0,
    terlambat: 0,
    totalHariKerja: 0,
  });

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const loadStats = async () => {
    if (!profile) return;
    setLoadingStats(true);

    try {
      const todayStr = getTodayString();

      // ── 1. Presensi hari ini (jam masuk & jam keluar) ──────────────
      const { data: todayRows, error: todayErr } = await supabase
        .from("presensi")
        .select("jenis, status, kategori, created_at")
        .eq("user_id", profile.id)
        .eq("tanggal", todayStr);

      if (todayErr) throw todayErr;

      const masukRow = todayRows?.find((r) => r.jenis === "masuk");
      const pulangRow = todayRows?.find((r) => r.jenis === "pulang");
      const kategori =
        masukRow?.kategori === "izin" || masukRow?.kategori === "sakit"
          ? masukRow.kategori
          : masukRow?.status === "izin" || masukRow?.status === "sakit"
            ? masukRow.status
            : null;

      setTodayStats({
        kategori,
        menunggu: !!kategori && masukRow?.status === "menunggu",
        jamMasuk: masukRow && !kategori
          ? new Date(masukRow.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        jamKeluar: pulangRow
          ? new Date(pulangRow.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
      });

      // ── 2. Statistik bulan ini ──────────────────────────────────────
      // Aturan sama dengan halaman Statistik pembimbing: hari kerja dihitung sejak
      // presensi pertama peserta sampai hari ini (bukan sebulan penuh).
      const now = new Date();
      const { awal: firstDay, akhir: lastDay } = rentangBulan(
        now.getFullYear(),
        now.getMonth(),
      );

      const { data: monthRows, error: monthErr } = await supabase
        .from("presensi")
        .select("tanggal, status")
        .eq("user_id", profile.id)
        .eq("jenis", "masuk")
        .gte("tanggal", firstDay)
        .lte("tanggal", lastDay);

      if (monthErr) throw monthErr;

      // Presensi pertama sepanjang riwayat (hadir/izin/sakit)
      const { data: firstRows, error: firstErr } = await supabase
        .from("presensi")
        .select("tanggal")
        .eq("user_id", profile.id)
        .eq("jenis", "masuk")
        .in("status", ["hadir", "terlambat", "izin", "sakit"])
        .order("tanggal", { ascending: true })
        .limit(1);

      if (firstErr) throw firstErr;
      const mulai = firstRows?.[0]?.tanggal || null;

      // Hitung hari unik per status
      const hariUnik = (status) =>
        new Set(
          monthRows?.filter((r) => r.status === status).map((r) => r.tanggal) ||
            [],
        ).size;
      // "terlambat" tetap dihitung hadir, hanya dicatat terpisah
      const terlambat = hariUnik("terlambat");
      const hadir = hariUnik("hadir") + terlambat;
      const izin = hariUnik("izin");
      const sakit = hariUnik("sakit");

      const hariKerja = mulai
        ? hitungHariKerja(
            now.getFullYear(),
            now.getMonth(),
            now,
            parseTanggal(mulai),
          )
        : 0;

      setMonthlyStats({
        hadir,
        izin,
        sakit,
        terlambat,
        totalHariKerja: hariKerja,
        rawHadir: hadir,
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
      toast.error("Gagal memuat statistik");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadStats(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const attendancePercentage =
    monthlyStats.totalHariKerja > 0
      ? Math.min(
          100,
          Math.round((monthlyStats.hadir / monthlyStats.totalHariKerja) * 100),
        )
      : 0;

  // Hijau bila baik, kuning bila perlu perhatian, merah bila rendah (sama dengan halaman Statistik)
  const warnaPersen =
    attendancePercentage >= 80 ? WARNA.hijau : attendancePercentage >= 60 ? WARNA.ochre : WARNA.merah;

  const namaDepan = profile?.nama_lengkap?.split(" ")[0] || "Peserta";

  const labelKategori = todayStats.kategori === "izin" ? "izin" : "sakit";
  const statusHariIni = todayStats.kategori
    ? todayStats.menunggu
      ? `Pengajuan ${labelKategori} menunggu persetujuan`
      : `Hari ini tercatat ${labelKategori}`
    : !todayStats.jamMasuk
    ? "Belum presensi masuk"
    : !todayStats.jamKeluar
      ? "Sudah masuk, menunggu presensi pulang"
      : "Presensi hari ini selesai";
  const selesai = !!todayStats.kategori || (todayStats.jamMasuk && todayStats.jamKeluar);

  const statistik = [
    { label: "Hadir", nilai: monthlyStats.hadir, titik: WARNA.hijau, soft: SOFT.hijau },
    { label: "Izin", nilai: monthlyStats.izin, titik: WARNA.ochre, soft: SOFT.kuning },
    { label: "Sakit", nilai: monthlyStats.sakit, titik: WARNA.merah, soft: SOFT.merah },
  ];

  return (
    <DashboardLayout className="bg-[#f0f9ff]">
      <div style={{ ...FONT, color: TINTA }}>
        {/* ── Kepala halaman: latar kontur seperti halaman Login ── */}
        <header style={LATAR_KONTUR} className="relative pb-16 pt-6">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-kartu ring-1 ring-primary-100"><img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" /></span>
                <div className="text-xs leading-snug">
                  <p className="font-semibold">Dinas Sosial</p>
                  <p className="text-[#0c2d48]/65">Kabupaten Majalengka</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadStats}
                  className="rounded-full p-2.5 text-primary-700 transition-colors hover:bg-white/80"
                  title="Muat ulang"
                  aria-label="Muat ulang"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => navigate("/pengumuman")}
                  className="rounded-full p-2.5 text-primary-700 transition-colors hover:bg-white/80"
                  title="Pengumuman"
                  aria-label="Pengumuman"
                >
                  <Bell className="h-5 w-5" />
                </button>
                <div
                  className="ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 ring-2 ring-white shadow-kartu transition hover:ring-primary-300"
                  onClick={() => navigate("/profil")}
                >
                  {profile?.foto_profil ? (
                    <img src={profile.foto_profil} className="h-full w-full rounded-full object-cover" alt="avatar" />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {profile?.nama_lengkap?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="inline-block rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-medium tracking-wide text-primary-700 ring-1 ring-primary-100">{today}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
            </div>
          </div>
        </header>

        <div className="relative mx-auto -mt-10 max-w-5xl space-y-8 px-5 pb-28 sm:px-8">
          {/* ── Presensi hari ini ── */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-[0_12px_28px_-12px_rgba(3,105,161,0.65)] sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                  Presensi hari ini
                </p>
                <p
                  className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: loadingStats ? "rgba(255,255,255,.18)" : selesai ? SOFT.hijau.bg : todayStats.jamMasuk ? SOFT.biru.bg : SOFT.kuning.bg,
                    color: loadingStats ? "#fff" : selesai ? SOFT.hijau.fg : todayStats.jamMasuk ? SOFT.biru.fg : SOFT.kuning.fg,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {loadingStats ? "Memuat..." : statusHariIni}
                </p>
                <div className="mt-5 flex items-center gap-6 sm:gap-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <LogIn className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] text-white/75">Masuk</p>
                      <p className={`font-mono text-2xl font-semibold tabular-nums ${todayStats.jamMasuk ? "" : "text-white/40"}`}>
                        {loadingStats ? "..." : todayStats.jamMasuk || "--:--"}
                      </p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/25" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <LogOut className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] text-white/75">Pulang</p>
                      <p className={`font-mono text-2xl font-semibold tabular-nums ${todayStats.jamKeluar ? "" : "text-white/40"}`}>
                        {loadingStats ? "..." : todayStats.jamKeluar || "--:--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {!loadingStats && !selesai && (
                <button
                  onClick={() => navigate("/presensi")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-primary-700 shadow-[0_6px_16px_rgba(0,0,0,0.15)] transition hover:bg-primary-50 active:scale-[0.98]"
                >
                  {todayStats.jamMasuk ? "Presensi pulang" : "Presensi masuk"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>

          {/* ── Menu ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {menuGroups.map((g) => (
              <section key={g.no}>
                <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">{g.no}</span>
                  {g.title}
                </h2>
                <div className="grid grid-cols-3 gap-2.5">
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-primary-100 bg-white px-2 py-4 text-center shadow-kartu transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md active:scale-[0.98]"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={
                          item.utama
                            ? { backgroundColor: SOFT[item.warna].fg, color: "#fff" }
                            : { backgroundColor: SOFT[item.warna].bg, color: SOFT[item.warna].fg }
                        }
                      >
                        <item.icon className="h-5 w-5" strokeWidth={1.9} />
                      </span>
                      <span className="text-[12px] font-semibold leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* ── Statistik + pengumuman ── */}
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-kartu sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Statistik kehadiran</h2>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 font-mono text-xs text-primary-700">{getCurrentMonthYear()}</span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {statistik.map((s) => (
                  <div key={s.label} className="rounded-xl px-3 py-3" style={{ backgroundColor: s.soft.bg }}>
                    <p className="font-mono text-3xl font-semibold tabular-nums leading-none" style={{ color: s.titik }}>{s.nilai}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: s.titik }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.titik }} />
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[#0c2d48]/75">Tingkat kehadiran</span>
                  <span className="font-mono text-sm font-bold" style={{ color: warnaPersen }}>{attendancePercentage}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendancePercentage}%`, backgroundColor: warnaPersen }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#0c2d48]/55">
                  {monthlyStats.hadir} dari {monthlyStats.totalHariKerja} hari kerja
                  {monthlyStats.terlambat > 0 && ` · ${monthlyStats.terlambat}x terlambat`}
                </p>
              </div>
            </section>

            <Pengumuman readOnly />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
