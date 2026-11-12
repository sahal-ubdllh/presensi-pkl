import { useNavigate } from "react-router-dom";
import { FilePlus, FileEdit, FileText, ChevronRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, LATAR_KONTUR, TINTA } from "../utils/tema";

const menuItems = [
  {
    label: "Buat kegiatan",
    desc: "Catat kegiatan harian Anda",
    icon: FilePlus,
    path: "/logbook",
    utama: true,
  },
  {
    label: "Draft kegiatan",
    desc: "Kegiatan yang belum dikirim",
    icon: FileEdit,
    path: "/draft-kegiatan",
  },
  {
    label: "Riwayat kegiatan",
    desc: "Lihat semua kegiatan Anda",
    icon: FileText,
    path: "/riwayat-kegiatan",
  },
];

export default function Kegiatan() {
  const navigate = useNavigate();

  return (
    <DashboardLayout className="bg-[#f3efe6]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="pb-12 pt-10">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <p className="font-mono text-xs tracking-wide text-[#2b4c7e]">Logbook PKL</p>
            <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Kegiatan
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#14213d]/70">
              Catat dan kelola kegiatan harian selama PKL.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 pb-28 pt-6 sm:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="group flex items-center gap-4 rounded-xl border border-[#14213d]/10 bg-white p-4 text-left transition-colors hover:border-[#14213d]/25 md:flex-col md:items-start md:gap-5 md:p-6"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                    item.utama ? "bg-[#1d4ed8] text-white" : "bg-[#14213d]/[0.07] text-[#14213d]"
                  }`}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-[#14213d]/60">{item.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#14213d]/40 transition-transform group-hover:translate-x-0.5 md:self-end" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
