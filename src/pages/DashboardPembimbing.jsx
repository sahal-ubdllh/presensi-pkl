/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Paperclip } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, WARNA, LATAR_KONTUR, gayaChip } from "../utils/tema";

export default function DashboardPembimbing() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPeserta: 0,
    hadirHariIni: 0,
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
        .in("status", ["hadir", "terlambat"]);

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

  const handleReviewPresensi = async (id, isApproved, kategori) => {
    try {
      // Pengajuan izin/sakit disetujui menjadi izin/sakit, bukan hadir
      const disetujui = kategori === "izin" || kategori === "sakit" ? kategori : "hadir";
      const target = isApproved ? disetujui : "ditolak";
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
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f3efe6]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
          <p className="text-sm text-[#14213d]/65">Memuat dashboard...</p>
        </div>
      </div>
    );

  const namaDepan = profile?.nama_lengkap?.split(" ")[0] || "Pembimbing";
  const peran = profile?.role === "admin" ? "Admin" : "Pembimbing";
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Daftar presensi menunggu dibatasi 20 baris
  const jumlahPresensi = pendingPresensi.length >= 20 ? "20+" : pendingPresensi.length;

  const ringkasan = [
    ["Peserta", stats.totalPeserta],
    ["Hadir hari ini", stats.hadirHariIni],
    ["Pengumuman", stats.totalPengumuman],
  ];

  return (
    <DashboardLayout className="bg-[#f3efe6]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="pb-16 pt-6">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" />
                <div className="border-l border-[#14213d]/20 pl-3 text-xs leading-snug">
                  <p className="font-semibold">Dinas Sosial</p>
                  <p className="text-[#14213d]/65">Kabupaten Majalengka</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/pengumuman")}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
              >
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Buat pengumuman</span>
                <span className="sm:hidden">Pengumuman</span>
              </button>
            </div>

            <div className="mt-8">
              <p className="font-mono text-xs tracking-wide text-[#2b4c7e]">{tanggal}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
              <p className="mt-1 text-[15px] text-[#14213d]/70">Dashboard {peran}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto -mt-10 max-w-6xl space-y-8 px-5 pb-28 sm:px-8">
          {/* Ringkasan */}
          <section className="rounded-xl bg-[#14213d] p-5 text-white shadow-[0_8px_24px_-12px_rgba(20,33,61,0.6)] sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Perlu ditinjau
              </p>
              <div className="mt-4 flex items-end gap-10">
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {jumlahPresensi}
                  </p>
                  <p className="mt-2 text-sm text-white/70">Presensi manual</p>
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5 lg:mt-0 lg:w-[22rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {ringkasan.map(([label, nilai], i) => (
                <div key={label} className={i === 0 ? "pr-3" : "px-3"}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums leading-none">{nilai}</dd>
                  <dt className="mt-1.5 text-[11px] leading-tight text-white/65">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Presensi manual menunggu persetujuan */}
            <section>
              <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
                <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">01</span>
                Presensi manual menunggu persetujuan
              </h2>
              {pendingPresensi.length === 0 ? (
                <Kosong pesan="Tidak ada presensi manual yang menunggu." />
              ) : (
                <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white">
                  {pendingPresensi.map((item) => (
                    <li key={item.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {item.users?.nama_lengkap || "Peserta"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#2b4c7e]">
                            {new Date(item.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {" · "}
                            {item.kategori === "izin"
                              ? "Pengajuan izin"
                              : item.kategori === "sakit"
                                ? "Pengajuan sakit"
                                : `Presensi ${item.jenis}`}
                          </p>
                        </div>
                        <StatusBadge status="menunggu" />
                      </div>
                      {item.alasan && (
                        <p className="mt-2.5 text-sm leading-relaxed text-[#14213d]/85">{item.alasan}</p>
                      )}
                      {typeof item.bukti_file === "string" && item.bukti_file.startsWith("http") && (
                        <a
                          href={item.bukti_file}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d4ed8] hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Lihat bukti
                        </a>
                      )}
                      <TombolTinjau
                        onSetuju={() => handleReviewPresensi(item.id, true, item.kategori)}
                        onTolak={() => handleReviewPresensi(item.id, false, item.kategori)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Monitoring kegiatan terbaru */}
            <section>
              <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
                <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">02</span>
                Kegiatan terbaru
              </h2>
              {recentActivities.length === 0 ? (
                <Kosong pesan="Belum ada kegiatan yang dilaporkan." />
              ) : (
                <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white">
                  {recentActivities.map((item) => (
                    <li key={item.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {item.users?.nama_lengkap || "Peserta"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#2b4c7e]">
                            {new Date(item.tanggal || item.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      {item.judul && <p className="mt-2 text-sm font-medium">{item.judul}</p>}
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#14213d]/85">
                        {item.uraian}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Komponen pendukung
function TombolTinjau({ onSetuju, onTolak }) {
  return (
    <div className="mt-3.5 flex gap-2">
      <button
        onClick={onSetuju}
        className="h-9 flex-1 rounded-lg text-sm font-semibold text-white transition hover:brightness-110"
        style={{ backgroundColor: WARNA.hijau }}
      >
        Setujui
      </button>
      <button
        onClick={onTolak}
        className="h-9 flex-1 rounded-lg border text-sm font-semibold transition hover:bg-[#a63d2f]/10"
        style={{ color: WARNA.merah, borderColor: `${WARNA.merah}59` }}
      >
        Tolak
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const peta = {
    menunggu: { label: "Menunggu", warna: WARNA.biru },
    disetujui: { label: "Disetujui", warna: WARNA.hijau },
    ditolak: { label: "Ditolak", warna: WARNA.merah },
  };
  const st = peta[status] || { label: status, warna: WARNA.tinta };
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={gayaChip(st.warna)}
    >
      {st.label}
    </span>
  );
}

function Kosong({ pesan }) {
  return (
    <div className="rounded-xl border border-dashed border-[#14213d]/25 bg-white/60 px-6 py-10 text-center text-sm text-[#14213d]/65">
      {pesan}
    </div>
  );
}
