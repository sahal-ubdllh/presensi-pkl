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
import konturUrl from "../assets/kontur.svg";
import toast from "react-hot-toast";

// Palet mengikuti halaman Login: kertas hangat + tinta biru
const KERTAS = "#f3efe6";
const TINTA = "#14213d";
const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };
const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: `url(${konturUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "right bottom",
};

// Menu dikelompokkan supaya tidak berupa 6 kotak yang sama rata
const menuGroups = [
  {
    no: "01",
    title: "Kehadiran",
    items: [
      { id: "kehadiran", label: "Buat kehadiran", icon: LogIn, path: "/presensi", utama: true },
      { id: "manual", label: "Kehadiran manual", icon: FileEdit, path: "/presensi-manual" },
      { id: "riwayat-presensi", label: "Riwayat hadir", icon: History, path: "/riwayat-presensi" },
    ],
  },
  {
    no: "02",
    title: "Kegiatan",
    items: [
      { id: "kegiatan", label: "Buat kegiatan", icon: FilePlus, path: "/logbook", utama: true },
      { id: "draft", label: "Draft kegiatan", icon: FileEdit, path: "/draft-kegiatan" },
      { id: "riwayat-kegiatan", label: "Riwayat kegiatan", icon: FileText, path: "/riwayat-kegiatan" },
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
    { label: "Hadir", nilai: monthlyStats.hadir, titik: "#14213d" },
    { label: "Izin", nilai: monthlyStats.izin, titik: "#b7791f" },
    { label: "Sakit", nilai: monthlyStats.sakit, titik: "#a63d2f" },
  ];

  return (
    <DashboardLayout className="bg-[#f3efe6]">
      <div style={{ ...FONT, color: TINTA }}>
        {/* ── Kepala halaman: latar kontur seperti halaman Login ── */}
        <header style={LATAR_KONTUR} className="pb-16 pt-6">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" />
                <div className="border-l border-[#14213d]/20 pl-3 text-xs leading-snug">
                  <p className="font-semibold">Dinas Sosial</p>
                  <p className="text-[#14213d]/65">Kabupaten Majalengka</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadStats}
                  className="rounded-lg p-2 text-[#14213d]/60 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
                  title="Muat ulang"
                  aria-label="Muat ulang"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => navigate("/pengumuman")}
                  className="rounded-lg p-2 text-[#14213d]/60 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
                  title="Pengumuman"
                  aria-label="Pengumuman"
                >
                  <Bell className="h-5 w-5" />
                </button>
                <div
                  className="ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#14213d] ring-2 ring-white/70 transition hover:ring-[#2b4c7e]"
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
              <p className="font-mono text-xs tracking-wide text-[#2b4c7e]">{today}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
            </div>
          </div>
        </header>

        <div className="mx-auto -mt-10 max-w-5xl space-y-8 px-5 pb-28 sm:px-8">
          {/* ── Presensi hari ini ── */}
          <section className="rounded-xl bg-[#14213d] p-5 text-white shadow-[0_8px_24px_-12px_rgba(20,33,61,0.6)] sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                  Presensi hari ini
                </p>
                <p className="mt-1 text-sm text-white/85">{loadingStats ? "Memuat..." : statusHariIni}</p>
                <div className="mt-4 flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <LogIn className="h-5 w-5 text-white/60" />
                    <div>
                      <p className="text-[11px] text-white/60">Masuk</p>
                      <p className={`font-mono text-2xl font-semibold tabular-nums ${todayStats.jamMasuk ? "" : "text-white/30"}`}>
                        {loadingStats ? "..." : todayStats.jamMasuk || "--:--"}
                      </p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/15" />
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-white/60" />
                    <div>
                      <p className="text-[11px] text-white/60">Pulang</p>
                      <p className={`font-mono text-2xl font-semibold tabular-nums ${todayStats.jamKeluar ? "" : "text-white/30"}`}>
                        {loadingStats ? "..." : todayStats.jamKeluar || "--:--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {!loadingStats && !selesai && (
                <button
                  onClick={() => navigate("/presensi")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-[#14213d] transition hover:bg-[#f3efe6]"
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
                  <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">{g.no}</span>
                  {g.title}
                </h2>
                <div className="grid grid-cols-3 divide-x divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white">
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="group flex flex-col items-center gap-2.5 px-2 py-4 text-center transition-colors hover:bg-[#f3efe6]"
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-transform group-hover:-translate-y-0.5 ${
                          item.utama ? "bg-[#1d4ed8] text-white" : "bg-[#14213d]/[0.07] text-[#14213d]"
                        }`}
                      >
                        <item.icon className="h-5 w-5" strokeWidth={1.9} />
                      </span>
                      <span className="text-[12px] font-medium leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* ── Statistik + pengumuman ── */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <section className="rounded-xl border border-[#14213d]/10 bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Statistik kehadiran</h2>
                <span className="font-mono text-xs text-[#14213d]/55">{getCurrentMonthYear()}</span>
              </div>

              <div className="mt-5 grid grid-cols-3 divide-x divide-[#14213d]/10">
                {statistik.map((s, i) => (
                  <div key={s.label} className={i === 0 ? "pr-4" : "px-4"}>
                    <p className="font-mono text-4xl font-semibold tabular-nums leading-none">{s.nilai}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#14213d]/65">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.titik }} />
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[#14213d]/75">Tingkat kehadiran</span>
                  <span className="font-mono text-sm font-semibold text-[#1d4ed8]">{attendancePercentage}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#14213d]/10">
                  <div
                    className="h-full rounded-full bg-[#2b4c7e] transition-all duration-500"
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#14213d]/55">
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
