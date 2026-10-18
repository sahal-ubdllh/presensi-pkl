/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Upload, Save, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";

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
          : "Kegiatan berhasil dikirim!"
      );
      navigate(status === "draft" ? "/draft-kegiatan" : "/riwayat-kegiatan");
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan kegiatan");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Loading screen jika profile belum ada
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Memuat data profil...</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold text-slate-900">
          Buat Kegiatan / Logbook
        </h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Tanggal */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <label className="text-xs text-slate-500 mb-1 block">
            Tanggal Kegiatan
          </label>
          <input
            type="date"
            value={formData.tanggal}
            onChange={(e) =>
              setFormData({ ...formData, tanggal: e.target.value })
            }
            className="input-field"
            required
          />
        </div>

        {/* Uraian Kegiatan */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700">
              Uraian Kegiatan
            </label>
            <span className="text-xs text-slate-400">
              {formData.uraian.length}/1000
            </span>
          </div>
          <textarea
            value={formData.uraian}
            onChange={(e) => {
              if (e.target.value.length <= 1000) {
                setFormData({ ...formData, uraian: e.target.value });
              }
            }}
            placeholder="Tuliskan kegiatan yang telah dilakukan..."
            className="input-field min-h-[150px] resize-none"
            required
          />
        </div>

        {/* Upload Bukti */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Upload Bukti (opsional)
          </label>
          {formData.bukti_file ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <Upload className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate">
                  {formData.bukti_file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, bukti_file: null })
                }
                className="p-1 text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Pilih File</p>
              <p className="text-xs text-slate-400 mt-1">
                Format: jpg, png, pdf (maks. 5MB)
              </p>
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

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            className="bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Draft
              </>
            )}
          </button>
          <button
            onClick={() => handleSubmit("menunggu")}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}