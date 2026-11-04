/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Users,
  FileText,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import BottomNav from "../components/BottomNav";

export default function DashboardPembimbing() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPeserta: 0,
    hadirHariIni: 0,
    pendingKegiatan: 0,
    totalPengumuman: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingPresensi, setPendingPresensi] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Total Peserta
      const { count: totalPeserta } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "peserta");

      // 2. Presensi Hari Ini
      const today = getTodayString();
      const { count: hadirHariIni } = await supabase
        .from("presensi")
        .select("*", { count: "exact", head: true })
        .eq("tanggal", today)
        .eq("jenis", "masuk")
        .eq("status", "hadir");

      // 2b. Presensi manual yang menunggu persetujuan
      const { data: presensiRows, error: presensiErr } = await supabase
        .from("presensi")
        .select("*")
        .eq("status", "menunggu")
        .order("tanggal", { ascending: false })
        .limit(20);
      if (presensiErr) {
        console.error(presensiErr);
        toast.error("Gagal memuat presensi manual: " + presensiErr.message);
      }
      let pendingRows = presensiRows || [];
      const presensiIds = [...new Set(pendingRows.map((r) => r.user_id))];
      if (presensiIds.length > 0) {
        const { data: namaPresensi } = await supabase
          .from("users")
          .select("id, nama_lengkap")
          .in("id", presensiIds);
        const namaById = Object.fromEntries(
          (namaPresensi || []).map((u) => [u.id, u]),
        );
        pendingRows = pendingRows.map((r) => ({
          ...r,
          users: namaById[r.user_id] || null,
        }));
      }

      // 3. Kegiatan Pending
      const { count: pendingKegiatan } = await supabase
        .from("kegiatan")
        .select("*", { count: "exact", head: true })
        .eq("status", "menunggu");

      // 4. Total Pengumuman
      const { count: totalPengumuman } = await supabase
        .from("pengumuman")
        .select("*", { count: "exact", head: true });

      // 5. Kegiatan Terbaru (Monitoring)
      // Draft peserta bersifat privat, jadi tidak ditampilkan ke reviewer.
      // Nama diambil lewat query terpisah agar tidak bergantung pada relasi FK.
      const { data: actRows, error: actError } = await supabase
        .from("kegiatan")
        .select("*")
        .neq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(5);
      if (actError) {
        console.error(actError);
        toast.error("Gagal memuat daftar kegiatan: " + actError.message);
      }
      let activities = actRows || [];
      const ids = [...new Set(activities.map((a) => a.user_id))];
      if (ids.length > 0) {
        const { data: namaRows } = await supabase
          .from("users")
          .select("id, nama_lengkap")
          .in("id", ids);
        const byId = Object.fromEntries((namaRows || []).map((u) => [u.id, u]));
        activities = activities.map((a) => ({ ...a, users: byId[a.user_id] || null }));
      }

      setStats({
        totalPeserta: totalPeserta || 0,
        hadirHariIni: hadirHariIni || 0,
        pendingKegiatan: pendingKegiatan || 0,
        totalPengumuman: totalPengumuman || 0,
      });
      setRecentActivities(activities || []);
      setPendingPresensi(pendingRows);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    loadDashboardData();
  }, [profile, loadDashboardData]);

  const handleApprove = async (id, isApproved) => {
    try {
      const target = isApproved ? "disetujui" : "ditolak";
      // .select() mengembalikan baris yang benar-benar berubah. RLS yang menolak
      // update TIDAK menghasilkan error, hanya 0 baris, jadi hasilnya wajib dicek.
      const { data, error } = await supabase
        .from("kegiatan")
        .update({ status: target, disetujui_oleh: profile.id })
        .eq("id", id)
        .select("id, status");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Status tidak berubah. Database menolak update (cek izin pembimbing).",
        );
      }

      toast.success(isApproved ? "Disetujui!" : "Ditolak!");
    } catch (err) {
      toast.error(err.message || "Gagal update status");
    } finally {
      loadDashboardData(); // Selalu muat ulang agar tampilan sama dengan database
    }
  };

  const handleReviewPresensi = async (id, isApproved) => {
    try {
      const target = isApproved ? "hadir" : "ditolak";
      const { data, error } = await supabase
        .from("presensi")
        .update({ status: target })
        .eq("id", id)
        .select("id, status");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Status tidak berubah. Database menolak update (cek izin pembimbing).",
        );
      }
      toast.success(
        isApproved ? "Presensi disetujui!" : "Presensi ditolak!",
      );
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui presensi");
    } finally {
      loadDashboardData();
    }
  };

  if (loading)
    return <div className="p-10 text-center">Memuat dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-24">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Pembimbing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Selamat datang,{" "}
            <span className="font-semibold text-primary-600">
              {profile?.nama_lengkap || "Pembimbing"}
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate("/pengumuman")}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Megaphone size={16} /> Buat Pengumuman
        </button>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-5">
        <StatCard
          icon={Users}
          label="Total Peserta"
          value={stats.totalPeserta}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Hadir Hari Ini"
          value={stats.hadirHariIni}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Pending Review"
          value={stats.pendingKegiatan}
          color="amber"
        />
        <StatCard
          icon={FileText}
          label="Pengumuman"
          value={stats.totalPengumuman}
          color="purple"
        />
      </div>

      {/* Presensi Manual Menunggu Persetujuan */}
      {pendingPresensi.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Presensi Manual Menunggu Persetujuan
          </h2>
          <div className="space-y-3">
            {pendingPresensi.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-semibold text-slate-900 truncate">
                      {item.users?.nama_lengkap || "Peserta"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      • Presensi {item.jenis}
                    </p>
                  </div>
                  <StatusBadge status="menunggu" />
                </div>
                {item.alasan && (
                  <p className="text-sm text-slate-700 mb-2">{item.alasan}</p>
                )}
                {typeof item.bukti_file === "string" &&
                  item.bukti_file.startsWith("http") && (
                    <a
                      href={item.bukti_file}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs font-medium text-primary-600 underline mb-3"
                    >
                      Lihat bukti
                    </a>
                  )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleReviewPresensi(item.id, true)}
                    className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100"
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => handleReviewPresensi(item.id, false)}
                    className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Kegiatan Terbaru */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Monitoring Kegiatan Terbaru
      </h2>
      {recentActivities.length === 0 ? (
        <EmptyState message="Belum ada kegiatan yang dilaporkan" />
      ) : (
        <div className="space-y-3">
          {recentActivities.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-semibold text-slate-900 truncate">
                    {item.users?.nama_lengkap}
                  </p>
                  {item.judul && (
                    <p className="text-xs font-medium text-primary-600 truncate">
                      {item.judul}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(
                      item.tanggal || item.created_at,
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm text-slate-700 mb-4 line-clamp-2">
                {item.uraian}
              </p>

              {item.status === "menunggu" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.id, true)}
                    className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100"
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => handleApprove(item.id, false)}
                    className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

// Komponen Pendukung agar kode rapi
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700" },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      value: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      value: "text-amber-700",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      value: "text-purple-700",
    },
  };
  const c = colors[color];
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <div className={`inline-flex p-2.5 rounded-xl ${c.bg} mb-3`}>
        <Icon size={20} className={c.icon} />
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    menunggu: "bg-amber-100 text-amber-700",
    disetujui: "bg-emerald-100 text-emerald-700",
    ditolak: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
      <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
