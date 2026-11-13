import { useNavigate } from "react-router-dom";
import { User, Briefcase, Building2, Mail, Phone, LogOut, Edit3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageShell, { Avatar } from "../components/PageShell";
import toast from "react-hot-toast";

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
    { label: "Nama lengkap", value: profile?.nama_lengkap || "-", icon: User },
    ...(isPeserta
      ? [
          { label: "Jenis peserta", value: profile?.jenis_peserta || "-", icon: Briefcase },
          { label: "Asal instansi", value: profile?.asal_instansi || "-", icon: Building2 },
        ]
      : []),
    { label: "Email", value: profile?.email || "-", icon: Mail },
    { label: "No. telepon", value: profile?.no_telepon || "-", icon: Phone },
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
          <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">01</span>
          Data diri
        </h2>
        <dl className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
          {dataDiri.map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-4 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#14213d]/[0.07] text-[#14213d]">
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-[#14213d]/60">{item.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/edit-profil")}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] text-sm font-semibold text-white transition hover:bg-[#1e40af]"
        >
          <Edit3 className="h-4 w-4" />
          Edit profil
        </button>
        <button
          onClick={handleLogout}
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#a63d2f]/35 text-sm font-semibold text-[#a63d2f] transition hover:bg-[#a63d2f]/10"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </PageShell>
  );
}
