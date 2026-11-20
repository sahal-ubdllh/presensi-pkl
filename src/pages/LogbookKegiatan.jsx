/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Upload, Save, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import PageShell, { DaftarLangkah } from "../components/PageShell";
import { FONT, TINTA, INPUT_CLS } from "../utils/tema";

const LANGKAH = [
  ["01", "Tulis uraian kegiatan"],
  ["02", "Lampirkan bukti bila ada"],
  ["03", "Simpan sebagai draft atau langsung catat"],
];

export default function LogbookKegiatan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: getTodayString(),
    uraian: "",
    bukti_file: null,
  });

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({ ...prev }));
    }
  }, [profile]);

  const handleSubmit = async (status) => {
    // ✅ Guard clause: cek profile ada
    if (!profile) {
      toast.error("Profile belum ter-load. Silakan refresh halaman.");
      return;
    }

    if (!formData.uraian.trim()) {
      toast.error("Uraian kegiatan wajib diisi");
      return;
    }

    setLoading(true);
    try {
      let buktiUrl = null;

      // Upload file jika ada
      if (formData.bukti_file) {
        const fileExt = formData.bukti_file.name.split(".").pop();
        const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("bukti-kegiatan")
          .upload(filePath, formData.bukti_file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("bukti-kegiatan").getPublicUrl(filePath);
        buktiUrl = publicUrl;
      }

      const { error } = await supabase.from("kegiatan").insert([
        {
          user_id: profile.id,
          tanggal: formData.tanggal,
          uraian: formData.uraian,
          bukti_file: buktiUrl,
          status: status,
        },
      ]);

      if (error) throw error;

      toast.success(
        status === "draft"
          ? "Draft berhasil disimpan!"
          : "Kegiatan berhasil disimpan!"
      );
      navigate(status === "draft" ? "/draft-kegiatan" : "/riwayat-kegiatan");
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan kegiatan");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f3efe6]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
          <p className="text-sm text-[#14213d]/65">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      onBack={() => navigate(-1)}
      judul="Buat kegiatan"
      deskripsi="Catat apa yang Anda kerjakan. Kegiatan yang disimpan langsung tercatat, tanpa perlu persetujuan."
      samping={<DaftarLangkah langkah={LANGKAH} />}
      tengah
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="tanggal" className="mb-1.5 block text-sm font-semibold">
            Tanggal kegiatan
          </label>
          <input
            id="tanggal"
            type="date"
            value={formData.tanggal}
            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
            className={`${INPUT_CLS} h-11`}
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="uraian" className="text-sm font-semibold">
              Uraian kegiatan
            </label>
            <span className="font-mono text-xs text-[#14213d]/50">
              {formData.uraian.length}/1000
            </span>
          </div>
          <textarea
            id="uraian"
            value={formData.uraian}
            onChange={(e) => {
              if (e.target.value.length <= 1000) {
                setFormData({ ...formData, uraian: e.target.value });
              }
            }}
            placeholder="Tuliskan kegiatan yang telah dilakukan..."
            className={`${INPUT_CLS} min-h-[160px] resize-none py-3`}
            required
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Bukti (opsional)</span>
          {formData.bukti_file ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#14213d]/15 bg-[#f3efe6] px-3.5 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 shrink-0 text-[#2b4c7e]" />
                <span className="truncate text-sm">{formData.bukti_file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bukti_file: null })}
                className="rounded p-1 text-[#14213d]/60 hover:bg-[#14213d]/10 hover:text-[#14213d]"
                aria-label="Hapus file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#14213d]/30 bg-[#f3efe6]/50 transition-colors hover:bg-[#f3efe6]">
              <Upload className="mb-1.5 h-6 w-6 text-[#2b4c7e]" strokeWidth={1.8} />
              <span className="text-sm">Pilih file</span>
              <span className="mt-0.5 text-xs text-[#14213d]/55">
                JPG, PNG atau PDF, maksimal 5MB
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.size > 5 * 1024 * 1024) {
                    toast.error("Ukuran file maksimal 5MB");
                    return;
                  }
                  setFormData({ ...formData, bukti_file: file });
                }}
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#14213d]/25 bg-white text-sm font-semibold text-[#14213d] transition hover:bg-[#f3efe6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Simpan draft
          </button>
          <button
            onClick={() => handleSubmit("tercatat")}
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Simpan kegiatan
              </>
            )}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
