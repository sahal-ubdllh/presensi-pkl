import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ClipboardCheck, Megaphone, BarChart3, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, LATAR_KONTUR, SOFT, PITA_LOGO } from "../utils/tema";

const ActionCard = ({ icon: Icon, title, desc, onClick, utama, warna = "biru" }) => (

  <button
    onClick={onClick}
    className="group flex w-full items-center gap-4 rounded-2xl border border-primary-100 bg-white p-4 text-left shadow-kartu transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md active:scale-[0.99] sm:p-5"
  >
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
      style={
        utama
          ? { backgroundColor: SOFT[warna].fg, color: "#fff" }
          : { backgroundColor: SOFT[warna].bg, color: SOFT[warna].fg }
      }
    >
      <Icon className="h-5 w-5" strokeWidth={1.9} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-[#0c2d48]/60">{desc}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-primary-400 transition-transform group-hover:translate-x-0.5" />
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
            .in("status", ["hadir", "terlambat"]),
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

  const namaDepan = profile?.nama_lengkap?.split(" ")[0] || "Admin";
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const akun = [
    ["Peserta", stats.peserta],
    ["Pembimbing", stats.pembimbing],
    ["Admin", stats.admin],
  ];

  return (
    <DashboardLayout className="bg-[#f0f9ff]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="relative pb-16 pt-6">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-kartu ring-1 ring-primary-100"><img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" /></span>
              <div className="text-xs leading-snug">
                <p className="font-semibold">Dinas Sosial</p>
                <p className="text-[#0c2d48]/65">Kabupaten Majalengka</p>
              </div>
            </div>
            <div className="mt-8">
              <p className="inline-block rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-medium tracking-wide text-primary-700 ring-1 ring-primary-100">{tanggal}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
              <p className="mt-1 text-[15px] font-medium text-primary-700">Dashboard Admin</p>
            </div>
          </div>
        </header>

        <div className="relative mx-auto -mt-10 max-w-6xl space-y-8 px-5 pb-28 sm:px-8">
          <section className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-[0_12px_28px_-12px_rgba(3,105,161,0.65)] sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                Hari ini
              </p>
              <div className="mt-4 flex items-end gap-10">
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {stats.hadirHariIni}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: SOFT.hijau.bg, color: SOFT.hijau.fg }}>Presensi masuk</p>
                </div>
                <div className="h-14 w-px bg-white/25" />
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {stats.pendingKegiatan}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: SOFT.kuning.bg, color: SOFT.kuning.fg }}>Kegiatan menunggu</p>
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-white/25 border-t border-white/25 pt-5 lg:mt-0 lg:w-[22rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {akun.map(([label, nilai], i) => (
                <div key={label} className={i === 0 ? "pr-3" : "px-3"}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums leading-none">{nilai}</dd>
                  <dt className="mt-1.5 text-[11px] leading-tight text-white/80">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">01</span>
              Menu administrasi
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                utama
                warna="biru"
                icon={Users}
                title="Kelola pengguna"
                desc="Tambah, lihat, dan nonaktifkan akun peserta dan pembimbing"
                onClick={() => navigate("/manage-users")}
              />
              <ActionCard
                warna="kuning"
                icon={ClipboardCheck}
                title="Review kegiatan dan presensi"
                desc="Setujui atau tolak logbook dan presensi manual peserta"
                onClick={() => navigate("/dashboard-pembimbing")}
              />
              <ActionCard
                warna="hijau"
                icon={BarChart3}
                title="Statistik peserta"
                desc="Kehadiran dan kegiatan tiap peserta PKL"
                onClick={() => navigate("/statistik-peserta")}
              />
              <ActionCard
                warna="biru"
                icon={Megaphone}
                title="Pengumuman"
                desc="Buat dan kelola pengumuman"
                onClick={() => navigate("/pengumuman")}
              />
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
