/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Paperclip } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, WARNA, LATAR_KONTUR, gayaChip, SOFT, PITA_LOGO } from "../utils/tema";

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
        className="flex min-h-screen items-center justify-center bg-[#f0f9ff]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
          <p className="text-sm text-[#0c2d48]/65">Memuat dashboard...</p>
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
    <DashboardLayout className="bg-[#f0f9ff]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="relative pb-16 pt-6">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-kartu ring-1 ring-primary-100"><img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" /></span>
                <div className="text-xs leading-snug">
                  <p className="font-semibold">Dinas Sosial</p>
                  <p className="text-[#0c2d48]/65">Kabupaten Majalengka</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/pengumuman")}
                className="flex h-11 items-center gap-2 rounded-full bg-primary-700 px-5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(3,105,161,0.28)] transition hover:bg-primary-600"
              >
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Buat pengumuman</span>
                <span className="sm:hidden">Pengumuman</span>
              </button>
            </div>

            <div className="mt-8">
              <p className="inline-block rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-medium tracking-wide text-primary-700 ring-1 ring-primary-100">{tanggal}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
              <p className="mt-1 text-[15px] font-medium text-primary-700">Dashboard {peran}</p>
            </div>
          </div>
        </header>

        <div className="relative mx-auto -mt-10 max-w-6xl space-y-8 px-5 pb-28 sm:px-8">
          {/* Ringkasan */}
          <section className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-[0_12px_28px_-12px_rgba(3,105,161,0.65)] sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                Perlu ditinjau
              </p>
              <div className="mt-4 flex items-end gap-10">
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {jumlahPresensi}
                  </p>
                  <p className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: SOFT.kuning.bg, color: SOFT.kuning.fg }}>Presensi manual</p>
                </div>
                <div className="h-14 w-px bg-white/25" />
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {stats.pendingKegiatan}
                  </p>
                  <p className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: SOFT.kuning.bg, color: SOFT.kuning.fg }}>Kegiatan</p>
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-white/25 border-t border-white/25 pt-5 lg:mt-0 lg:w-[22rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {ringkasan.map(([label, nilai], i) => (
                <div key={label} className={i === 0 ? "pr-3" : "px-3"}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums leading-none">{nilai}</dd>
                  <dt className="mt-1.5 text-[11px] leading-tight text-white/80">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Presensi manual menunggu persetujuan */}
            <section>
              <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">01</span>
                Presensi manual menunggu persetujuan
              </h2>
              {pendingPresensi.length === 0 ? (
                <Kosong pesan="Tidak ada presensi manual yang menunggu." />
              ) : (
                <ul className="space-y-2.5">
                  {pendingPresensi.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-l-4 border-primary-100 bg-white p-4 shadow-kartu sm:p-5" style={{ borderLeftColor: SOFT.kuning.fg }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {item.users?.nama_lengkap || "Peserta"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-medium text-primary-700">
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
                        <p className="mt-2.5 text-sm leading-relaxed text-[#0c2d48]/85">{item.alasan}</p>
                      )}
                      {typeof item.bukti_file === "string" && item.bukti_file.startsWith("http") && (
                        <a
                          href={item.bukti_file}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
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
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">02</span>
                Kegiatan terbaru
              </h2>
              {recentActivities.length === 0 ? (
                <Kosong pesan="Belum ada kegiatan yang dilaporkan." />
              ) : (
                <ul className="space-y-2.5">
                  {recentActivities.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-l-4 border-primary-100 bg-white p-4 shadow-kartu sm:p-5" style={{ borderLeftColor: item.status === "disetujui" ? WARNA.hijau : item.status === "ditolak" ? WARNA.merah : WARNA.langit }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {item.users?.nama_lengkap || "Peserta"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs font-medium text-primary-700">
                            {new Date(item.tanggal || item.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.judul && <p className="mt-2 text-sm font-medium">{item.judul}</p>}
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#0c2d48]/85">
                        {item.uraian}
                      </p>
                      {item.status === "menunggu" && (
                        <TombolTinjau
                          onSetuju={() => handleApprove(item.id, true)}
                          onTolak={() => handleApprove(item.id, false)}
                        />
                      )}
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
        className="h-10 flex-1 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: WARNA.hijau }}
      >
        Setujui
      </button>
      <button
        onClick={onTolak}
        className="h-10 flex-1 rounded-xl border text-sm font-bold transition hover:brightness-95 active:scale-[0.98]"
        style={{ color: WARNA.merah, borderColor: SOFT.merah.garis, backgroundColor: SOFT.merah.bg }}
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
    <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 px-6 py-10 text-center text-sm text-primary-800">
      {pesan}
    </div>
  );
}
