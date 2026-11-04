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
  Calendar,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  RefreshCw,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getCurrentMonthYear, getTodayString } from "../utils/dateUtils";
import { supabase } from "../lib/supabase";
import Pengumuman from "./Pengumuman";
import toast from "react-hot-toast";

// Menu grid items
const menuItems = [
  {
    id: "kehadiran",
    label: "Buat Kehadiran",
    icon: LogIn,
    path: "/presensi",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "manual",
    label: "Kehadiran Manual",
    icon: FileEdit,
    path: "/presensi-manual",
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: "riwayat-presensi",
    label: "Riwayat Hadir",
    icon: History,
    path: "/riwayat-presensi",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    id: "kegiatan",
    label: "Buat Kegiatan",
    icon: FilePlus,
    path: "/logbook",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "draft",
    label: "Draft Kegiatan",
    icon: FileEdit,
    path: "/draft-kegiatan",
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: "riwayat-kegiatan",
    label: "Riwayat Kegiatan",
    icon: FileText,
    path: "/riwayat-kegiatan",
    color: "bg-rose-50 text-rose-600",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loadingStats, setLoadingStats] = useState(true);
  const [todayStats, setTodayStats] = useState({
    jamMasuk: null,
    jamKeluar: null,
  });
  const [monthlyStats, setMonthlyStats] = useState({
    hadir: 0,
    izin: 0,
    sakit: 0,
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
        .select("jenis, created_at")
        .eq("user_id", profile.id)
        .eq("tanggal", todayStr);

      if (todayErr) throw todayErr;

      const masukRow = todayRows?.find((r) => r.jenis === "masuk");
      const pulangRow = todayRows?.find((r) => r.jenis === "pulang");

      setTodayStats({
        jamMasuk: masukRow
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
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data: monthRows, error: monthErr } = await supabase
        .from("presensi")
        .select("tanggal, status")
        .eq("user_id", profile.id)
        .eq("jenis", "masuk")
        .gte("tanggal", firstDay)
        .lte("tanggal", lastDay);

      if (monthErr) throw monthErr;

      // Hitung unik per tanggal
      const uniqueDays = [
        ...new Set(
          monthRows?.filter((r) => r.status === "hadir").map((r) => r.tanggal) ||
            [],
        ),
      ];
      const hadir = monthRows?.filter((r) => r.status === "hadir").length || 0;
      const izin = monthRows?.filter((r) => r.status === "izin").length || 0;
      const sakit = monthRows?.filter((r) => r.status === "sakit").length || 0;

      // Hitung hari kerja bulan ini (Senin–Jumat)
      let hariKerja = 0;
      const cursor = new Date(firstDay);
      const last = new Date(lastDay);
      while (cursor <= last) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) hariKerja++;
        cursor.setDate(cursor.getDate() + 1);
      }

      setMonthlyStats({
        hadir: uniqueDays.length,
        izin,
        sakit,
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
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const attendancePercentage =
    monthlyStats.totalHariKerja > 0
      ? Math.min(
          100,
          Math.round((monthlyStats.hadir / monthlyStats.totalHariKerja) * 100),
        )
      : 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900">
            Halo, {profile?.nama_lengkap?.split(" ")[0] || "Peserta"}! 👋
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => navigate("/pengumuman")}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative"
          >
            <Bell className="w-5 h-5" />
          </button>
          <div
            className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all"
            onClick={() => navigate("/profil")}
          >
            {profile?.foto_profil ? (
              <img
                src={profile.foto_profil}
                className="w-full h-full rounded-full object-cover"
                alt="avatar"
              />
            ) : (
              <span className="text-sm font-semibold text-primary-700">
                {profile?.nama_lengkap?.charAt(0) || "U"}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 space-y-5 pb-24">
        {/* Kartu Jam Masuk / Keluar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Presensi Hari Ini
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <LogIn className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Jam Masuk</p>
                <p
                  className={`text-lg font-bold ${todayStats.jamMasuk ? "text-slate-900" : "text-slate-300"}`}
                >
                  {loadingStats ? "..." : todayStats.jamMasuk || "--:--"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Jam Pulang</p>
                <p
                  className={`text-lg font-bold ${todayStats.jamKeluar ? "text-slate-900" : "text-slate-300"}`}
                >
                  {loadingStats ? "..." : todayStats.jamKeluar || "--:--"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Menu Utama
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center gap-2 text-center"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-3 flex flex-col gap-3">
          {/* Statistik Kehadiran REAL */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-700">
                Statistik Kehadiran ({getCurrentMonthYear()})
              </p>
              {loadingStats && (
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">
                  {monthlyStats.hadir}
                </p>
                <p className="text-[10px] text-slate-500">Hadir</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">
                  {monthlyStats.izin}
                </p>
                <p className="text-[10px] text-slate-500">Izin</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <Thermometer className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">
                  {monthlyStats.sakit}
                </p>
                <p className="text-[10px] text-slate-500">Sakit</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-600 font-medium">
                  Tingkat Kehadiran
                </span>
                <span className="text-xs font-bold text-primary-600">
                  {attendancePercentage}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${attendancePercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {monthlyStats.hadir} dari {monthlyStats.totalHariKerja} hari
                kerja
              </p>
            </div>
          </div>

          <Pengumuman readOnly />
        </div>
      </div>
    </DashboardLayout>
  );
}
