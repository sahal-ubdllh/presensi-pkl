import { useState, useEffect } from "react";
import { Megaphone, Calendar, Plus, X, Send, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";
import BottomNav from "../components/BottomNav";

// ─── Komponen kecil ────────────────────────────────────────────────────────────

function AnnouncementCard({ item, canDelete, onDelete }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 flex-shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              {item.judul}
            </h3>
            {canDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="p-1 text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 mb-1.5 mt-0.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">
              {formatDate(item.created_at)}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{item.isi}</p>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ judul: "", isi: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.isi.trim()) {
      toast.error("Judul dan isi pengumuman wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("pengumuman").insert([
        {
          judul: form.judul.trim(),
          isi: form.isi.trim(),
          dibuat_oleh: profile.id,
        },
      ]);
      if (error) throw error;
      toast.success("Pengumuman berhasil dibuat!");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal membuat pengumuman");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Buat Pengumuman
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Judul Pengumuman
            </label>
            <input
              required
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="Contoh: Libur Hari Raya 2024"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Isi Pengumuman
            </label>
            <textarea
              required
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
              placeholder="Tulis isi pengumuman di sini..."
              className="input-field min-h-[120px] resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "Mengirim..." : "Kirim Pengumuman"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Komponen utama ────────────────────────────────────────────────────────────

/**
 * @param {boolean} readOnly  — jika true, tampilkan versi mini untuk embed di Dashboard
 */
export default function Pengumuman({ readOnly = false }) {
  const { profile } = useAuth();
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const canManage = profile?.role === "pembimbing" || profile?.role === "admin";

  const fetchPengumuman = async () => {
    try {
      const { data, error } = await supabase
        .from("pengumuman")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(readOnly ? 3 : 50);

      if (error) throw error;
      setPengumuman(data || []);
    } catch (err) {
      console.error(err);
      if (!readOnly) toast.error("Gagal memuat pengumuman");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPengumuman();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus pengumuman ini?")) return;
    try {
      const { error } = await supabase.from("pengumuman").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pengumuman dihapus");
      setPengumuman((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  // ── MODE EMBED (di dalam Dashboard peserta) ────────────────────────────────
  if (readOnly) {
    return (
      <section className="rounded-xl border border-[#14213d]/10 bg-white p-5 text-[#14213d] sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Pengumuman terbaru</h2>
          <Megaphone className="h-4 w-4 text-[#2b4c7e]" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
          </div>
        ) : pengumuman.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#14213d]/50">Belum ada pengumuman</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#14213d]/10">
            {pengumuman.map((item) => (
              <li key={item.id} className="py-3 first:pt-1 last:pb-0">
                <p className="line-clamp-1 text-sm font-semibold">{item.judul}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#14213d]/70">{item.isi}</p>
                <p className="mt-1.5 font-mono text-[11px] text-[#2b4c7e]">{formatDate(item.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  // ── MODE FULL PAGE ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Pengumuman</h1>
            <p className="text-xs text-slate-500">
              Informasi terbaru dari pembimbing
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Buat
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-16 h-16 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">Belum ada pengumuman</p>
            {canManage && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 btn-primary inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Buat Pengumuman Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pengumuman.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                canDelete={canManage}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreated={fetchPengumuman}
        />
      )}

      <BottomNav />
    </div>
  );
}
