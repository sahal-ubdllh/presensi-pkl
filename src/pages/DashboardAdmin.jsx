import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ClipboardCheck, Megaphone, BarChart3, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, LATAR_KONTUR } from "../utils/tema";

const ActionCard = ({ icon: Icon, title, desc, onClick, utama }) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-4 rounded-xl border border-[#14213d]/10 bg-white p-4 text-left transition-colors hover:border-[#14213d]/25 sm:p-5"
  >
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
        utama ? "bg-[#1d4ed8] text-white" : "bg-[#14213d]/[0.07] text-[#14213d]"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.9} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-[#14213d]/60">{desc}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-[#14213d]/40 transition-transform group-hover:translate-x-0.5" />
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
    kegiatanHariIni: 0,
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
            .neq("status", "draft")
            .eq("tanggal", getTodayString()),
        ]);
        setStats({
          peserta: peserta.count || 0,
          pembimbing: pembimbing.count || 0,
          admin: admin.count || 0,
          hadirHariIni: hadir.count || 0,
          kegiatanHariIni: pending.count || 0,
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
        className="flex min-h-screen items-center justify-center bg-[#f3efe6]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
          <p className="text-sm text-[#14213d]/65">Memuat dashboard...</p>
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
    <DashboardLayout className="bg-[#f3efe6]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="pb-16 pt-6">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <img src="/logo-dinsos.png" alt="Logo Dinas Sosial" className="h-9 w-auto" />
              <div className="border-l border-[#14213d]/20 pl-3 text-xs leading-snug">
                <p className="font-semibold">Dinas Sosial</p>
                <p className="text-[#14213d]/65">Kabupaten Majalengka</p>
              </div>
            </div>
            <div className="mt-8">
              <p className="font-mono text-xs tracking-wide text-[#2b4c7e]">{tanggal}</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Halo, {namaDepan}
              </h1>
              <p className="mt-1 text-[15px] text-[#14213d]/70">Dashboard Admin</p>
            </div>
          </div>
        </header>

        <div className="mx-auto -mt-10 max-w-6xl space-y-8 px-5 pb-28 sm:px-8">
          <section className="rounded-xl bg-[#14213d] p-5 text-white shadow-[0_8px_24px_-12px_rgba(20,33,61,0.6)] sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Hari ini
              </p>
              <div className="mt-4 flex items-end gap-10">
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {stats.hadirHariIni}
                  </p>
                  <p className="mt-2 text-sm text-white/70">Presensi masuk</p>
                </div>
                <div className="h-14 w-px bg-white/15" />
                <div>
                  <p className="font-mono text-5xl font-semibold tabular-nums leading-none">
                    {stats.kegiatanHariIni}
                  </p>
                  <p className="mt-2 text-sm text-white/70">Kegiatan hari ini</p>
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5 lg:mt-0 lg:w-[22rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {akun.map(([label, nilai], i) => (
                <div key={label} className={i === 0 ? "pr-3" : "px-3"}>
                  <dd className="font-mono text-2xl font-semibold tabular-nums leading-none">{nilai}</dd>
                  <dt className="mt-1.5 text-[11px] leading-tight text-white/65">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
              <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">01</span>
              Menu administrasi
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                utama
                icon={Users}
                title="Kelola pengguna"
                desc="Tambah, lihat, dan nonaktifkan akun peserta dan pembimbing"
                onClick={() => navigate("/manage-users")}
              />
              <ActionCard
                icon={ClipboardCheck}
                title="Review kegiatan dan presensi"
                desc="Setujui atau tolak logbook dan presensi manual peserta"
                onClick={() => navigate("/dashboard-pembimbing")}
              />
              <ActionCard
                icon={BarChart3}
                title="Statistik peserta"
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
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
