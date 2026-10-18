import { useNavigate } from "react-router-dom";
import { FilePlus, FileEdit, FileText, ArrowRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

export default function Kegiatan() {
  const navigate = useNavigate();

  const menuItems = [
    { 
      label: "Buat Kegiatan", 
      desc: "Catat kegiatan harian Anda",
      icon: FilePlus, 
      path: "/logbook", 
      color: "bg-emerald-50 text-emerald-600" 
    },
    { 
      label: "Draft Kegiatan", 
      desc: "Kegiatan yang belum dikirim",
      icon: FileEdit, 
      path: "/draft-kegiatan", 
      color: "bg-purple-50 text-purple-600" 
    },
    { 
      label: "Riwayat Kegiatan", 
      desc: "Lihat semua kegiatan Anda",
      icon: FileText, 
      path: "/riwayat-kegiatan", 
      color: "bg-rose-50 text-rose-600" 
    },
  ];

  return (
    <DashboardLayout>
      <header className="bg-white px-4 py-4 border-b border-slate-100">
        <h1 className="text-lg font-semibold text-slate-900">Kegiatan</h1>
        <p className="text-sm text-slate-500">Kelola logbook kegiatan PKL</p>
      </header>

      <div className="p-5 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className={`p-3 rounded-xl ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">{item.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </button>
        ))}
      </div>
    </DashboardLayout>
  );
}