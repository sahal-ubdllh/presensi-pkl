/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function EditProfil() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isFirstRender = useRef(true);

  // Inisialisasi form data
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    jenis_peserta: "Mahasiswa",
    asal_instansi: "",
    no_telepon: "",
  });

  // Update formData hanya saat profile berubah (dan bukan render pertama)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (profile) {
      setFormData({
        nama_lengkap: profile.nama_lengkap || "",
        jenis_peserta: profile.jenis_peserta || "Mahasiswa",
        asal_instansi: profile.asal_instansi || "",
        no_telepon: profile.no_telepon || "",
      });
    }
  }, [profile]);

  // Fungsi Upload Foto Profil
  const handleImageUpload = async (e) => {
    if (!profile) return;
    
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 2MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("foto-profil")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("foto-profil")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ foto_profil: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Foto profil berhasil diperbarui");
    } catch (error) {
      toast.error(error.message || "Gagal mengupload foto");
    } finally {
      setUploading(false);
    }
  };

  // Fungsi Simpan Perubahan Data
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update(formData)
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profil berhasil diperbarui");
      navigate("/profil");
    } catch (error) {
      toast.error(error?.message || "Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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
        <h1 className="text-lg font-semibold text-slate-900">Edit Profil</h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
              {profile?.foto_profil ? (
                <img
                  src={profile.foto_profil}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary-600">
                  {profile?.nama_lengkap?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <label
              className={`absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md transition-colors ${
                uploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Ketuk ikon kamera untuk mengubah foto (Max 2MB)
          </p>
        </div>

        {/* Form Edit Data */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.nama_lengkap}
              onChange={(e) =>
                setFormData({ ...formData, nama_lengkap: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">
              Jenis Peserta
            </label>
            <select
              value={formData.jenis_peserta}
              onChange={(e) =>
                setFormData({ ...formData, jenis_peserta: e.target.value })
              }
              className="input-field appearance-none bg-white"
            >
              <option value="Mahasiswa">Mahasiswa</option>
              <option value="Siswa">Siswa</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">
              Asal Instansi
            </label>
            <input
              type="text"
              value={formData.asal_instansi}
              onChange={(e) =>
                setFormData({ ...formData, asal_instansi: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">
              No. Telepon
            </label>
            <input
              type="tel"
              value={formData.no_telepon}
              onChange={(e) =>
                setFormData({ ...formData, no_telepon: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}