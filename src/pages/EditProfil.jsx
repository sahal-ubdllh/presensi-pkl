import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import PageShell, { Avatar } from "../components/PageShell";
import { FONT, TINTA, INPUT_CLS } from "../utils/tema";
import toast from "react-hot-toast";

export default function EditProfil() {
  const { profile } = useAuth();

  // Form hanya dipasang setelah profil tersedia, jadi isian awal langsung terisi
  if (!profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f3efe6]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
      </div>
    );
  }
  return <FormEditProfil profile={profile} />;
}

function FormEditProfil({ profile }) {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  // Jenis peserta & asal instansi hanya untuk peserta PKL (bukan pembimbing/admin)
  const isPeserta = profile.role === "peserta";
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: profile.nama_lengkap || "",
    jenis_peserta: profile.jenis_peserta || "Mahasiswa",
    asal_instansi: profile.asal_instansi || "",
    no_telepon: profile.no_telepon || "",
  });

  // Fungsi Upload Foto Profil
  const handleImageUpload = async (e) => {
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

      const {
        data: { publicUrl },
      } = supabase.storage.from("foto-profil").getPublicUrl(filePath);

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
    setLoading(true);

    try {
      const payload = isPeserta
        ? formData
        : { nama_lengkap: formData.nama_lengkap, no_telepon: formData.no_telepon };
      const { error } = await supabase.from("users").update(payload).eq("id", profile.id);

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

  const ubah = (kolom) => (e) => setFormData({ ...formData, [kolom]: e.target.value });

  return (
    <PageShell
      onBack={() => navigate(-1)}
      atas={
        <div className="relative mb-5 w-fit">
          <Avatar profile={profile} />
          <label
            className={`absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-[#1d4ed8] p-2 text-white shadow transition hover:bg-[#1e40af] ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
            title="Ganti foto"
          >
            <Camera className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
      }
      judul="Edit profil"
      deskripsi="Perbarui data diri Anda. Ketuk ikon kamera untuk mengganti foto (maksimal 2MB)."
      tengah
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="nama" className="mb-1.5 block text-sm font-semibold">
            Nama lengkap
          </label>
          <input
            id="nama"
            type="text"
            value={formData.nama_lengkap}
            onChange={ubah("nama_lengkap")}
            className={`${INPUT_CLS} h-11`}
            required
          />
        </div>

        {isPeserta && (
          <>
            <div>
              <label htmlFor="jenis" className="mb-1.5 block text-sm font-semibold">
                Jenis peserta
              </label>
              <select
                id="jenis"
                value={formData.jenis_peserta}
                onChange={ubah("jenis_peserta")}
                className={`${INPUT_CLS} h-11`}
              >
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Siswa">Siswa</option>
              </select>
            </div>

            <div>
              <label htmlFor="instansi" className="mb-1.5 block text-sm font-semibold">
                Asal instansi
              </label>
              <input
                id="instansi"
                type="text"
                value={formData.asal_instansi}
                onChange={ubah("asal_instansi")}
                className={`${INPUT_CLS} h-11`}
                required
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="telp" className="mb-1.5 block text-sm font-semibold">
            No. telepon
          </label>
          <input
            id="telp"
            type="tel"
            value={formData.no_telepon}
            onChange={ubah("no_telepon")}
            className={`${INPUT_CLS} h-11`}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] text-base font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan perubahan
            </>
          )}
        </button>
      </form>
    </PageShell>
  );
}
