import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Trash2, Send, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";

export default function DraftKegiatan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const { data, error } = await supabase
          .from("kegiatan")
          .select("*")
          .eq("user_id", profile.id)
          .eq("status", "draft")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDrafts(data || []);
      } catch (error) {
        toast.error(error.message || "Gagal memuat draft");
      } finally {
        setLoading(false);
      }
    };

    if (profile) fetchDrafts();
  }, [profile]);

  const handleKirim = async (id) => {
    if (!window.confirm("Kirim kegiatan ini untuk review pembimbing?")) return;

    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ status: "menunggu" })
        .eq("id", id);

      if (error) throw error;

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Kegiatan berhasil dikirim!");
    } catch (error) {
      toast.error(error.message || "Gagal mengirim kegiatan");
    }
  };

  const handleHapus = async (id) => {
    if (!window.confirm("Hapus draft ini?")) return;

    try {
      const { error } = await supabase
        .from("kegiatan")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Draft berhasil dihapus");
    } catch (error) {
      toast.error(error.message || "Gagal menghapus draft");
    }
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
        <h1 className="text-lg font-semibold text-slate-900">Draft Kegiatan</h1>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">Belum ada draft kegiatan</p>
            <button
              onClick={() => navigate("/logbook")}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Buat Kegiatan Baru
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1">
                      {formatDate(item.tanggal)}
                    </p>
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {item.uraian}
                    </p>
                  </div>
                  <Edit3 className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleKirim(item.id)}
                    className="flex-1 bg-primary-50 text-primary-600 py-2 rounded-lg text-sm font-semibold hover:bg-primary-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim
                  </button>
                  <button
                    onClick={() => handleHapus(item.id)}
                    className="px-3 bg-rose-50 text-rose-600 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}