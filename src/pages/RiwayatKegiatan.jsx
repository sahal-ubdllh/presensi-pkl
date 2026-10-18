import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";

export default function RiwayatKegiatan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKegiatan = async () => {
      try {
        const { data, error } = await supabase
          .from("kegiatan")
          .select("*")
          .eq("user_id", profile.id)
          .neq("status", "draft")
          .order("tanggal", { ascending: false });

        if (error) throw error;
        setKegiatan(data || []);
      } catch (error) {
        toast.error(error.message || "Gagal memuat riwayat");
      } finally {
        setLoading(false);
      }
    };

    if (profile) fetchKegiatan();
  }, [profile]);

  const getStatusBadge = (status) => {
    const styles = {
      disetujui: "bg-emerald-50 text-emerald-600",
      menunggu: "bg-amber-50 text-amber-600",
      ditolak: "bg-rose-50 text-rose-600",
    };
    const labels = {
      disetujui: "Disetujui",
      menunggu: "Menunggu",
      ditolak: "Ditolak",
    };
    return {
      className: styles[status] || "bg-slate-50 text-slate-600",
      label: labels[status] || status,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">
          Riwayat Kegiatan
        </h1>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : kegiatan.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada riwayat kegiatan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kegiatan.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/kegiatan/${item.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-500">
                        {formatDate(item.tanggal)}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {item.uraian}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}