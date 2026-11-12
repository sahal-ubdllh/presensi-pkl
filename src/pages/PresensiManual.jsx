import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Upload,
  X,
  LogIn,
  LogOut,
  CalendarOff,
  Thermometer,
} from "lucide-react";
import { format, subDays } from "date-fns";
import "@fontsource-variable/public-sans";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import konturUrl from "../assets/kontur.svg";
import toast from "react-hot-toast";

// Palet sama dengan Login dan Dashboard
const KERTAS = "#f3efe6";
const TINTA = "#14213d";
const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };
const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: `url(${konturUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "right bottom",
};

const MAKS_HARI_MUNDUR_IZIN = 7; // harus sama dengan batas di izin-sakit.sql

const JENIS = [
  {
    id: "masuk",
    label: "Masuk",
    ikon: LogIn,
    ket: "Anda bekerja di luar area kantor, jadi presensi GPS tidak bisa dipakai. Tercatat hadir setelah disetujui pembimbing.",
    alasanLabel: "Alasan presensi manual",
    placeholder: "Mis. bertugas di lokasi kegiatan di luar kantor...",
    buktiLabel: "Bukti (opsional)",
  },
  {
    id: "pulang",
    label: "Pulang",
    ikon: LogOut,
    ket: "Presensi pulang dari luar area kantor. Tercatat setelah disetujui pembimbing.",
    alasanLabel: "Alasan presensi manual",
    placeholder: "Mis. kegiatan selesai di lokasi luar kantor...",
    buktiLabel: "Bukti (opsional)",
  },
  {
    id: "izin",
    label: "Izin",
    ikon: CalendarOff,
    ket: "Tidak masuk karena ada keperluan. Tercatat sebagai izin setelah disetujui pembimbing.",
    alasanLabel: "Keperluan izin",
    placeholder: "Jelaskan keperluan izin Anda...",
    buktiLabel: "Surat atau bukti pendukung (opsional)",
  },
  {
    id: "sakit",
    label: "Sakit",
    ikon: Thermometer,
    ket: "Tidak masuk karena sakit. Tercatat sebagai sakit setelah disetujui pembimbing.",
    alasanLabel: "Keterangan sakit",
    placeholder: "Mis. demam, istirahat dari dokter...",
    buktiLabel: "Surat dokter (opsional)",
  },
];

const LANGKAH = [
  ["01", "Pilih keperluan"],
  ["02", "Isi tanggal, alasan, dan bukti"],
  ["03", "Pembimbing meninjau pengajuan"],
];

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20";

export default function PresensiManual() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: getTodayString(),
    jenis: "masuk",
    alasan: "",
    bukti_file: null,
  });

  const jenis = JENIS.find((j) => j.id === formData.jenis);
  const izinSakit = formData.jenis === "izin" || formData.jenis === "sakit";
  const hariIni = getTodayString();
  const batasAwal = format(subDays(new Date(), MAKS_HARI_MUNDUR_IZIN), "yyyy-MM-dd");

  const pilihJenis = (id) => {
    setFormData((f) => {
      const k = id === "izin" || id === "sakit";
      // Izin/sakit tidak boleh bertanggal di luar 7 hari terakhir
      const tanggal = k && f.tanggal < batasAwal ? hariIni : f.tanggal;
      return { ...f, jenis: id, tanggal };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.alasan.trim()) {
      toast.error(`${jenis.alasanLabel} wajib diisi`);
      return;
    }

    setLoading(true);
    try {
      let buktiUrl = null;

      if (formData.bukti_file) {
        if (formData.bukti_file.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran file maksimal 5MB");
        }

        const fileExt = formData.bukti_file.name.split(".").pop();
        const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("bukti-presensi")
          .upload(filePath, formData.bukti_file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Gagal mengupload bukti: " + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from("bukti-presensi")
          .getPublicUrl(filePath);

        buktiUrl = urlData.publicUrl;
      }

      // Validasi tanggal & penyimpanan dilakukan di server.
      // Izin/sakit memakai fungsi sendiri (lihat izin-sakit.sql).
      const { error: dbError } = izinSakit
        ? await supabase.rpc("catat_izin_sakit", {
            p_tanggal: formData.tanggal,
            p_kategori: formData.jenis,
            p_alasan: formData.alasan,
            p_bukti_file: buktiUrl,
          })
        : await supabase.rpc("catat_presensi_manual", {
            p_tanggal: formData.tanggal,
            p_jenis: formData.jenis,
            p_alasan: formData.alasan,
            p_bukti_file: buktiUrl,
          });

      if (dbError) {
        console.error("DB error:", dbError);
        if (izinSakit && dbError.code === "PGRST202") {
          throw new Error(
            "Fitur izin/sakit belum aktif di database. Minta admin menjalankan izin-sakit.sql.",
          );
        }
        throw dbError;
      }

      toast.success(
        izinSakit
          ? `Pengajuan ${formData.jenis} terkirim, menunggu persetujuan pembimbing.`
          : "Presensi manual terkirim, menunggu persetujuan pembimbing.",
      );
      navigate("/riwayat-presensi");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.message || "Gagal mengirim presensi manual");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f3efe6] lg:grid lg:grid-cols-[1.08fr_1fr]"
      style={{ ...FONT, color: TINTA }}
    >
      {/* Sisi judul: pita di atas (mobile) / panel kiri penuh (desktop) */}
      <aside
        style={LATAR_KONTUR}
        className="px-5 pb-6 pt-5 sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20"
      >
        <div className="mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-[#14213d]/70 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-5xl lg:leading-[1.1]">
            Presensi manual
          </h1>
          <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-[#14213d]/70 lg:mt-3 lg:text-base">
            Untuk presensi di luar kantor, izin, atau sakit. Semua pengajuan
            ditinjau pembimbing.
          </p>

          <ol className="mt-10 hidden max-w-sm divide-y divide-[#14213d]/10 border-y border-[#14213d]/10 lg:block">
            {LANGKAH.map(([no, teks]) => (
              <li key={no} className="flex items-baseline gap-5 py-3">
                <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">{no}</span>
                <span className="text-[15px]">{teks}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-[#14213d]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      {/* Sisi formulir */}
      <main className="lg:flex lg:min-h-screen lg:items-center lg:justify-center lg:bg-white lg:px-16 lg:py-12">
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 w-full max-w-xl space-y-6 px-5 pb-16 sm:px-8 lg:mt-0 lg:max-w-md lg:space-y-7 lg:px-0 lg:pb-0"
        >
          <section>
            <h2 className="mb-2.5 flex items-baseline gap-3 text-sm font-semibold">
              <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">01</span>
              Keperluan
            </h2>
            <div className="grid grid-cols-4 divide-x divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
              {JENIS.map((j) => {
                const aktif = formData.jenis === j.id;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => pilihJenis(j.id)}
                    aria-pressed={aktif}
                    className={`flex flex-col items-center gap-2 px-1 py-3.5 text-[13px] font-medium transition-colors ${
                      aktif ? "bg-[#14213d] text-white" : "text-[#14213d] hover:bg-[#f3efe6]"
                    }`}
                  >
                    <j.ikon className="h-5 w-5" strokeWidth={1.9} />
                    {j.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 min-h-[2.5rem] text-[13px] leading-relaxed text-[#14213d]/70">
              {jenis.ket}
            </p>
          </section>

          <section className="space-y-5 rounded-xl border border-[#14213d]/10 bg-white p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <h2 className="flex items-baseline gap-3 text-sm font-semibold">
              <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">02</span>
              Detail
            </h2>

            <div>
              <label htmlFor="tanggal" className="mb-1.5 block text-sm font-semibold">
                Tanggal
              </label>
              <input
                id="tanggal"
                type="date"
                value={formData.tanggal}
                max={hariIni}
                min={izinSakit ? batasAwal : undefined}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className={`${inputCls} h-11`}
                required
              />
              {izinSakit && (
                <p className="mt-1.5 text-xs text-[#14213d]/55">
                  Bisa untuk hari ini sampai {MAKS_HARI_MUNDUR_IZIN} hari ke belakang.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="alasan" className="mb-1.5 block text-sm font-semibold">
                {jenis.alasanLabel}
              </label>
              <textarea
                id="alasan"
                value={formData.alasan}
                onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                className={`${inputCls} min-h-[120px] resize-none py-3`}
                placeholder={jenis.placeholder}
                required
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-semibold">{jenis.buktiLabel}</span>
              {formData.bukti_file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#14213d]/15 bg-[#f3efe6] px-3.5 py-3">
                  <span className="truncate text-sm">{formData.bukti_file.name}</span>
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
                    PNG, JPG atau PDF, maksimal 5MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFormData({ ...formData, bukti_file: e.target.files[0] || null })
                    }
                  />
                </label>
              )}
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] text-base font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                {izinSakit ? `Ajukan ${jenis.label.toLowerCase()}` : "Kirim presensi"}
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
