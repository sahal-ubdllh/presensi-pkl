import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Trash2, Send, X, Save, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate, getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import PageShell, { RingkasanAngka } from "../components/PageShell";
import { INPUT_CLS } from "../utils/tema";

// RLS yang menolak perintah TIDAK menghasilkan error, hanya 0 baris terpengaruh.
// Karena itu hasilnya wajib dicek lewat .select() agar tidak menampilkan "berhasil" palsu.
const pastikanBerubah = (data, pesan) => {
  if (!data || data.length === 0) throw new Error(pesan);
};

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
      const { data, error } = await supabase
        .from("kegiatan")
        .update({ tanggal: form.tanggal, uraian: form.uraian, status })
        .eq("id", draft.id)
        .select("id");

      if (error) throw error;
      pastikanBerubah(
        data,
        "Draft tidak tersimpan. Database menolak perubahan (cek izin peserta).",
      );

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14213d]/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-[#14213d]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-[#14213d]/50 hover:bg-[#14213d]/10 hover:text-[#14213d]"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-5 text-lg font-bold tracking-tight">Edit draft</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-tanggal" className="mb-1.5 block text-sm font-semibold">
              Tanggal kegiatan
            </label>
            <input
              id="edit-tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className={`${INPUT_CLS} h-11`}
              max={getTodayString()}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="edit-uraian" className="text-sm font-semibold">
                Uraian kegiatan
              </label>
              <span className="font-mono text-xs text-[#14213d]/50">{form.uraian.length}/1000</span>
            </div>
            <textarea
              id="edit-uraian"
              value={form.uraian}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setForm({ ...form, uraian: e.target.value });
              }}
              className={`${INPUT_CLS} min-h-[140px] resize-none py-3`}
              placeholder="Tuliskan kegiatan yang telah dilakukan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#14213d]/25 text-sm font-semibold transition hover:bg-[#f3efe6] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Simpan
            </button>
            <button
              onClick={() => handleSave("menunggu")}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Kirim
                </>
              )}
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
    if (!profile) return;

    const timer = setTimeout(() => {
      fetchDrafts();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleKirim = async (id) => {
    const toastId = toast.loading("Mengirim kegiatan...");
    try {
      const { data, error } = await supabase
        .from("kegiatan")
        .update({ status: "menunggu" })
        .eq("id", id)
        .select("id");

      if (error) throw error;
      pastikanBerubah(
        data,
        "Kegiatan tidak terkirim. Database menolak perubahan (cek izin peserta).",
      );

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Kegiatan berhasil dikirim!", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Gagal mengirim", { id: toastId });
    }
  };

  const handleHapus = async (id) => {
    const toastId = toast.loading("Menghapus draft...");
    try {
      const { data, error } = await supabase
        .from("kegiatan")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      pastikanBerubah(
        data,
        "Draft tidak terhapus. Database menolak penghapusan (cek izin peserta).",
      );

      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Draft berhasil dihapus", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Gagal menghapus draft", { id: toastId });
    }
  };

  return (
    <>
      <PageShell
        onBack={() => navigate(-1)}
        judul="Draft kegiatan"
        deskripsi="Kegiatan yang sudah ditulis tapi belum dikirim ke pembimbing."
        samping={
          <>
            <RingkasanAngka data={[["Draft tersimpan", drafts.length]]} memuat={loading} />
            <button
              onClick={() => navigate("/logbook")}
              className="mt-6 hidden items-center gap-1.5 text-sm font-semibold text-[#1d4ed8] hover:underline lg:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Buat kegiatan baru
            </button>
          </>
        }
        lebar="lg:max-w-lg"
      >
        {loading ? (
          <div className="flex justify-center rounded-xl border border-[#14213d]/10 bg-white py-14">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-[#14213d]/10 bg-white px-6 py-12 text-center">
            <p className="text-[15px] text-[#14213d]/70">Belum ada draft kegiatan.</p>
            <button
              onClick={() => navigate("/logbook")}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
            >
              <Edit3 className="h-4 w-4" />
              Buat kegiatan baru
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
            {drafts.map((item) => (
              <li key={item.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[#2b4c7e]">{formatDate(item.tanggal)}</p>
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed">{item.uraian}</p>
                  </div>
                  <button
                    onClick={() => setEditingDraft(item)}
                    className="shrink-0 rounded-lg p-2 text-[#14213d]/50 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
                    title="Edit draft"
                    aria-label="Edit draft"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleKirim(item.id)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1d4ed8] text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Kirim
                  </button>
                  <button
                    onClick={() => handleHapus(item.id)}
                    className="flex h-9 items-center justify-center rounded-lg border border-[#a63d2f]/30 px-3 text-[#a63d2f] transition hover:bg-[#a63d2f]/10"
                    title="Hapus draft"
                    aria-label="Hapus draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>

      {editingDraft && (
        <EditDraftModal
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSaved={fetchDrafts}
        />
      )}
    </>
  );
}
