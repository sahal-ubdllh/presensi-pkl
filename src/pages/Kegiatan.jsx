import { useNavigate } from "react-router-dom";
import { FilePlus, FileEdit, FileText, ChevronRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, LATAR_KONTUR, TINTA, SOFT, PITA_LOGO } from "../utils/tema";

const menuItems = [
  {
    label: "Buat kegiatan",
    desc: "Catat kegiatan harian Anda",
    icon: FilePlus,
    path: "/logbook",
    utama: true,
    warna: "hijau",
  },
  {
    label: "Draft kegiatan",
    desc: "Kegiatan yang belum dikirim",
    icon: FileEdit,
    path: "/draft-kegiatan",
    warna: "kuning",
  },
  {
    label: "Riwayat kegiatan",
    desc: "Lihat semua kegiatan Anda",
    icon: FileText,
    path: "/riwayat-kegiatan",
    warna: "biru",
  },
];

export default function Kegiatan() {
  const navigate = useNavigate();

  return (
    <DashboardLayout className="bg-[#f0f9ff]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="relative pb-12 pt-10">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <p className="inline-block rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-medium tracking-wide text-primary-700 ring-1 ring-primary-100">Logbook PKL</p>
            <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Kegiatan
            </h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#0c2d48]/70">
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
                className="group flex items-center gap-4 rounded-2xl border border-primary-100 bg-white p-4 text-left shadow-kartu transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md active:scale-[0.99] md:flex-col md:items-start md:gap-5 md:p-6"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={
                    item.utama
                      ? { backgroundColor: SOFT[item.warna].fg, color: "#fff" }
                      : { backgroundColor: SOFT[item.warna].bg, color: SOFT[item.warna].fg }
                  }
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-[#0c2d48]/60">{item.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-primary-400 transition-transform group-hover:translate-x-0.5 md:self-end" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
