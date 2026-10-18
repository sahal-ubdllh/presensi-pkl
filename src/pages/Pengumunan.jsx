import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";

export default function Pengumuman() {
  const navigate = useNavigate();
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPengumuman = async () => {
      try {
        const { data, error } = await supabase
          .from("pengumuman")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setPengumuman(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Gagal memuat pengumuman");
      } finally {
        setLoading(false);
      }
    };

    fetchPengumuman();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Pengumuman</h1>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada pengumuman</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pengumuman.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">
                      {item.judul}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.isi}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}