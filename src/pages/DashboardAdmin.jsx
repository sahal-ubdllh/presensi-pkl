import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCog,
  ShieldCheck,
  CheckCircle,
  Clock,
  Megaphone,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import BottomNav from "../components/BottomNav";

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}
    >
      <Icon size={20} />
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);

const ActionCard = ({ icon: Icon, title, desc, onClick }) => (
  <button
    onClick={onClick}
    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 text-left hover:border-primary-500 transition-colors"
  >
    <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
      <Icon size={22} />
    </div>
    <div className="min-w-0">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  </button>
);

export default function DashboardAdmin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    peserta: 0,
    pembimbing: 0,
    admin: 0,
    hadirHariIni: 0,
    pendingKegiatan: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const countUsers = (role) =>
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", role);

    const load = async () => {
      try {
        const [peserta, pembimbing, admin, hadir, pending] = await Promise.all([
          countUsers("peserta"),
          countUsers("pembimbing"),
          countUsers("admin"),
          supabase
            .from("presensi")
            .select("*", { count: "exact", head: true })
            .eq("tanggal", getTodayString())
            .eq("jenis", "masuk")
            .eq("status", "hadir"),
          supabase
            .from("kegiatan")
            .select("*", { count: "exact", head: true })
            .eq("status", "menunggu"),
        ]);
        setStats({
          peserta: peserta.count || 0,
          pembimbing: pembimbing.count || 0,
          admin: admin.count || 0,
          hadirHariIni: hadir.count || 0,
          pendingKegiatan: pending.count || 0,
        });
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return <div className="p-10 text-center">Memuat dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-24">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
      <p className="text-sm text-slate-500 mt-0.5">
        Selamat datang,{" "}
        <span className="font-semibold text-primary-600">
          {profile?.nama_lengkap || "Admin"}
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 mb-8">
        <StatCard icon={Users} label="Peserta" value={stats.peserta} color="blue" />
        <StatCard icon={UserCog} label="Pembimbing" value={stats.pembimbing} color="violet" />
        <StatCard icon={ShieldCheck} label="Admin" value={stats.admin} color="rose" />
        <StatCard icon={CheckCircle} label="Presensi Hari Ini" value={stats.hadirHariIni} color="emerald" />
        <StatCard icon={Clock} label="Kegiatan Menunggu" value={stats.pendingKegiatan} color="amber" />
      </div>

      <h2 className="font-semibold text-slate-900 mb-3">Menu Administrasi</h2>
      <div className="space-y-3">
        <ActionCard
          icon={Users}
          title="Kelola Pengguna"
          desc="Tambah, lihat, dan nonaktifkan akun peserta & pembimbing"
          onClick={() => navigate("/manage-users")}
        />
        <ActionCard
          icon={ClipboardCheck}
          title="Review Kegiatan & Presensi"
          desc="Setujui atau tolak logbook dan presensi manual peserta"
          onClick={() => navigate("/dashboard-pembimbing")}
        />
        <ActionCard
          icon={BarChart3}
          title="Statistik Peserta"
          desc="Kehadiran dan kegiatan tiap peserta PKL"
          onClick={() => navigate("/statistik-peserta")}
        />
        <ActionCard
          icon={Megaphone}
          title="Pengumuman"
          desc="Buat dan kelola pengumuman"
          onClick={() => navigate("/pengumuman")}
        />
      </div>

      <BottomNav />
    </div>
  );
}
