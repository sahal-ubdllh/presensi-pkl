/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Megaphone, Plus, X, Send, Save, Trash2, Pencil } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { FONT, TINTA, WARNA, LATAR_KONTUR, INPUT_CLS } from "../utils/tema";

// RLS yang menolak perintah TIDAK menghasilkan error, hanya 0 baris terpengaruh.
// Karena itu hasilnya wajib dicek lewat .select() agar tidak menampilkan "berhasil" palsu.
const pastikanBerubah = (data, pesan) => {
  if (!data || data.length === 0) throw new Error(pesan);
};

// ─── Komponen kecil ────────────────────────────────────────────────────────────

function AnnouncementCard({ item, canManage, onEdit, onDelete }) {
  return (
    <li className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{item.judul}</h3>
          <p className="mt-0.5 font-mono text-xs text-[#2b4c7e]">{formatDate(item.created_at)}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => onEdit(item)}
              className="rounded-lg p-2 text-[#14213d]/60 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
              title="Edit pengumuman"
              aria-label="Edit pengumuman"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-lg p-2 transition-colors hover:bg-[#a63d2f]/10"
              style={{ color: WARNA.merah }}
              title="Hapus pengumuman"
              aria-label="Hapus pengumuman"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[#14213d]/85">{item.isi}</p>
    </li>
  );
}

// Formulir untuk membuat (initial kosong) dan mengedit (initial = pengumuman yang dipilih)
function FormModal({ initial, onClose, onSaved }) {
  const { profile } = useAuth();
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    judul: initial?.judul ?? "",
    isi: initial?.isi ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Tutup dengan tombol Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const judul = form.judul.trim();
    const isi = form.isi.trim();
    if (!judul || !isi) {
      toast.error("Judul dan isi pengumuman wajib diisi");
      return;
    }
    if (editing && judul === initial.judul && isi === initial.isi) {
      toast("Tidak ada perubahan");
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const { data, error } = await supabase
          .from("pengumuman")
          .update({ judul, isi })
          .eq("id", initial.id)
          .select("id");
        if (error) throw error;
        pastikanBerubah(
          data,
          "Pengumuman tidak tersimpan. Database menolak perubahan (cek izin pembimbing).",
        );
        toast.success("Pengumuman berhasil diperbarui!");
      } else {
        const { error } = await supabase.from("pengumuman").insert([
          { judul, isi, dibuat_oleh: profile.id },
        ]);
        if (error) throw error;
        toast.success("Pengumuman berhasil dibuat!");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || (editing ? "Gagal menyimpan perubahan" : "Gagal membuat pengumuman"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#14213d]/50 p-4 backdrop-blur-sm sm:items-center"
      style={{ ...FONT, color: TINTA }}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit pengumuman" : "Buat pengumuman"}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-[#14213d]/50 hover:bg-[#14213d]/10 hover:text-[#14213d]"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-5 text-lg font-bold tracking-tight">
          {editing ? "Edit pengumuman" : "Buat pengumuman"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="p-judul" className="mb-1.5 block text-sm font-semibold">
              Judul pengumuman
            </label>
            <input
              id="p-judul"
              required
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              placeholder="Contoh: Libur Hari Raya 2026"
              className={`${INPUT_CLS} h-11`}
            />
          </div>
          <div>
            <label htmlFor="p-isi" className="mb-1.5 block text-sm font-semibold">
              Isi pengumuman
            </label>
            <textarea
              id="p-isi"
              required
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
              placeholder="Tulis isi pengumuman di sini..."
              className={`${INPUT_CLS} min-h-[130px] resize-none py-3`}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : editing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Menyimpan..." : editing ? "Simpan perubahan" : "Kirim pengumuman"}
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
  // null = tertutup | { item: null } = buat baru | { item } = edit pengumuman itu
  const [formState, setFormState] = useState(null);

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

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus pengumuman "${item.judul}"?`)) return;
    try {
      const { data, error } = await supabase
        .from("pengumuman")
        .delete()
        .eq("id", item.id)
        .select("id");
      if (error) throw error;
      pastikanBerubah(
        data,
        "Pengumuman tidak terhapus. Database menolak penghapusan (cek izin pembimbing).",
      );
      toast.success("Pengumuman dihapus");
      setPengumuman((prev) => prev.filter((p) => p.id !== item.id));
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
    <DashboardLayout className="bg-[#f3efe6]">
      <div style={{ ...FONT, color: TINTA }}>
        <header style={LATAR_KONTUR} className="pb-12 pt-10">
          <div className="mx-auto flex max-w-5xl items-end justify-between gap-4 px-5 sm:px-8">
            <div>
              <p className="font-mono text-xs tracking-wide text-[#2b4c7e]">Dinas Sosial Majalengka</p>
              <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Pengumuman
              </h1>
              <p className="mt-2 text-[15px] text-[#14213d]/70">Informasi terbaru dari pembimbing.</p>
            </div>
            {canManage && (
              <button
                onClick={() => setFormState({ item: null })}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
              >
                <Plus className="h-4 w-4" />
                Buat
              </button>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 pb-28 pt-6 sm:px-8">
          <div className="lg:max-w-3xl">
            {loading ? (
              <div className="flex justify-center rounded-xl border border-[#14213d]/10 bg-white py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
              </div>
            ) : pengumuman.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#14213d]/25 bg-white/60 px-6 py-14 text-center">
                <p className="text-[15px] text-[#14213d]/70">Belum ada pengumuman.</p>
                {canManage && (
                  <button
                    onClick={() => setFormState({ item: null })}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-sm font-semibold text-white hover:bg-[#1e40af]"
                  >
                    <Plus className="h-4 w-4" />
                    Buat pengumuman pertama
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white">
                {pengumuman.map((item) => (
                  <AnnouncementCard
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={(it) => setFormState({ item: it })}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {formState && (
        <FormModal
          key={formState.item?.id ?? "baru"}
          initial={formState.item}
          onClose={() => setFormState(null)}
          onSaved={fetchPengumuman}
        />
      )}
    </DashboardLayout>
  );
}
