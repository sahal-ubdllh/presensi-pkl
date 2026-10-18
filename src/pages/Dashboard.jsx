import { useNavigate } from "react-router-dom";
import {
  Bell,
  Menu,
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
  Megaphone,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getCurrentMonthYear } from "../utils/dateUtils";

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
  {
    id: "pengumuman",
    label: "Pengumuman",
    icon: Megaphone,
    path: "/pengumuman",
    color: "bg-orange-50 text-orange-600",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // TODO: Ganti dengan data real dari Supabase
  const todayStats = {
    jamMasuk: "07:45",
    jamKeluar: "--:--",
  };

  const monthlyStats = {
    hadir: 18,
    izin: 1,
    sakit: 0,
    totalHariKerja: 20,
  };

  const attendancePercentage = Math.round(
    (monthlyStats.hadir / monthlyStats.totalHariKerja) * 100,
  );

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 z-40">
        <button className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-700">
              {profile?.nama_lengkap?.charAt(0) || "U"}
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-5">
        {/* Greeting Section */}
        <div className="pt-2">
          <h1 className="text-xl font-bold text-slate-900">
            Halo, {profile?.nama_lengkap?.split(" ")[0] || "Peserta"}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profile?.jenis_peserta || "Peserta PKL"}
          </p>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {today}
          </p>
        </div>

        {/* Jam Masuk/Keluar Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <LogIn className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Jam Masuk</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayStats.jamMasuk}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Jam Keluar</p>
                <p className="text-lg font-bold text-slate-900">
                  {todayStats.jamKeluar}
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

        {/* Statistik Kehadiran */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Informasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Statistik Kehadiran ({getCurrentMonthYear()})
              </p>
            </div>
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
          <div>
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
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                style={{ width: `${attendancePercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
