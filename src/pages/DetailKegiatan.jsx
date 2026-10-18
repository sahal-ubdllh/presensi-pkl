import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";

export default function DetailKegiatan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("kegiatan")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setKegiatan(data);
      } catch (error) {
        toast.error(error.message || "Gagal memuat detail");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const getStatusInfo = (status) => {
    const info = {
      disetujui: {
        label: "Disetujui",
        color: "bg-emerald-50 text-emerald-600",
        icon: CheckCircle2,
      },
      menunggu: {
        label: "Menunggu Review",
        color: "bg-amber-50 text-amber-600",
        icon: Clock,
      },
      ditolak: {
        label: "Ditolak",
        color: "bg-rose-50 text-rose-600",
        icon: XCircle,
      },
    };
    return info[status] || info.menunggu;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!kegiatan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Kegiatan tidak ditemukan</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(kegiatan.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Detail Kegiatan</h1>
      </header>

      <div className="p-5 space-y-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(kegiatan.tanggal)}</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${statusInfo.color}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Uraian */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Uraian Kegiatan
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {kegiatan.uraian}
          </p>
        </div>

        {/* Bukti Kegiatan */}
        {kegiatan.bukti_file && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Bukti Kegiatan
            </h2>
            {kegiatan.bukti_file.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img
                src={kegiatan.bukti_file}
                alt="Bukti"
                className="w-full rounded-xl border border-slate-200"
              />
            ) : (
              <a
                href={kegiatan.bukti_file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-slate-700 flex-1 truncate">
                  Lihat File
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            )}
          </div>
        )}

        {/* Catatan Pembimbing */}
        {kegiatan.catatan_pembimbing && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              Catatan Pembimbing
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
              {kegiatan.catatan_pembimbing}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}