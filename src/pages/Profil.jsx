import { useNavigate } from "react-router-dom";
import { User, Briefcase, Building2, Mail, Phone, LogOut, Edit3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageShell, { Avatar } from "../components/PageShell";
import toast from "react-hot-toast";
import { SOFT } from "../utils/tema";

export default function Profil() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Konfirmasi sebelum logout
    if (!window.confirm("Apakah Anda yakin ingin keluar?")) return;

    try {
      await logout();
      toast.success("Berhasil keluar");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Gagal keluar");
    }
  };

  // Jenis peserta & asal instansi hanya relevan untuk peserta PKL
  const isPeserta = profile?.role === "peserta";
  const roleLabel = { admin: "Admin", pembimbing: "Pembimbing" }[profile?.role];

  const dataDiri = [
    { label: "Nama lengkap", value: profile?.nama_lengkap || "-", icon: User, soft: SOFT.biru },
    ...(isPeserta
      ? [
          { label: "Jenis peserta", value: profile?.jenis_peserta || "-", icon: Briefcase, soft: SOFT.kuning },
          { label: "Asal instansi", value: profile?.asal_instansi || "-", icon: Building2, soft: SOFT.hijau },
        ]
      : []),
    { label: "Email", value: profile?.email || "-", icon: Mail, soft: SOFT.biru },
    { label: "No. telepon", value: profile?.no_telepon || "-", icon: Phone, soft: SOFT.hijau },
  ];

  return (
    <PageShell
      onBack={() => navigate(-1)}
      atas={<Avatar profile={profile} className="mb-5" />}
      judul={profile?.nama_lengkap || "Peserta PKL"}
      deskripsi={isPeserta ? profile?.jenis_peserta || "Peserta" : roleLabel || "-"}
      tengah
    >
      <section>
        <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">01</span>
          Data diri
        </h2>
        <dl className="space-y-2.5">
          {dataDiri.map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-primary-100 bg-white px-4 py-3 shadow-kartu">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: item.soft.bg, color: item.soft.fg }}>
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-[#0c2d48]/65">{item.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/edit-profil")}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-700 text-sm font-bold text-white shadow-[0_6px_16px_rgba(3,105,161,0.28)] transition hover:bg-primary-600 active:scale-[0.98]"
        >
          <Edit3 className="h-4 w-4" />
          Edit profil
        </button>
        <button
          onClick={handleLogout}
          style={{ backgroundColor: SOFT.merah.bg, borderColor: SOFT.merah.garis }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold text-[#d32f2f] transition hover:brightness-95 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </PageShell>
  );
}
