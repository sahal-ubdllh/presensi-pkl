import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Send,
  FileText,
  X,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate, getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";

// ─── Modal Edit Draft ──────────────────────────────────────────────────────────
function EditDraftModal({ draft, onClose, onSaved }) {
  const [form, setForm] = useState({
    tanggal: draft.tanggal,
    uraian: draft.uraian,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (status) => {
    if (!form.uraian.trim()) {
      toast.error("Uraian kegiatan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ tanggal: form.tanggal, uraian: form.uraian, status })
        .eq("id", draft.id);

      if (error) throw error;

      toast.success(
        status === "draft"
          ? "Draft berhasil diperbarui!"
          : "Kegiatan berhasil dikirim!",
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-in slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Draft</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Tanggal Kegiatan
            </label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="input-field"
              max={getTodayString()}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700">
                Uraian Kegiatan
              </label>
              <span className="text-xs text-slate-400">
                {form.uraian.length}/1000
              </span>
            </div>
            <textarea
              value={form.uraian}
              onChange={(e) => {
                if (e.target.value.length <= 1000)
                  setForm({ ...form, uraian: e.target.value });
              }}
              className="input-field min-h-[140px] resize-none"
              placeholder="Tuliskan kegiatan yang telah dilakukan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan
            </button>
            <button
              onClick={() => handleSave("menunggu")}
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Halaman DraftKegiatan ─────────────────────────────────────────────────────
export default function DraftKegiatan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState(null);

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

  useEffect(() => {
    if (profile) fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleKirim = async (id) => {
    const toastId = toast.loading("Mengirim kegiatan...");
    try {
      const { error } = await supabase
        .from("kegiatan")
        .update({ status: "menunggu" })
        .eq("id", id);

      if (error) throw error;

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Kegiatan berhasil dikirim!", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Gagal mengirim", { id: toastId });
    }
  };

  const handleHapus = async (id) => {
    const toastId = toast.loading("Menghapus draft...");
    try {
      const { error } = await supabase.from("kegiatan").delete().eq("id", id);
      if (error) throw error;

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Draft berhasil dihapus", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Gagal menghapus draft", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Draft Kegiatan
            </h1>
            {!loading && (
              <p className="text-xs text-slate-400">
                {drafts.length} draft tersimpan
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
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
                {/* Info */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-1">
                      {formatDate(item.tanggal)}
                    </p>
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {item.uraian}
                    </p>
                  </div>
                  {/* Tombol Edit */}
                  <button
                    onClick={() => setEditingDraft(item)}
                    className="ml-3 p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                    title="Edit draft"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Aksi */}
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

      {/* Modal Edit */}
      {editingDraft && (
        <EditDraftModal
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSaved={fetchDrafts}
        />
      )}
    </div>
  );
}
