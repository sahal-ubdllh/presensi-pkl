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
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import "@fontsource-variable/public-sans";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import { FONT, TINTA, LATAR_KONTUR, PITA_LOGO, INPUT_CLS } from "../utils/tema";


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
  ["02", "Isi alasan dan bukti"],
  ["03", "Pembimbing meninjau pengajuan"],
];

const inputCls = INPUT_CLS;

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
  const pilihJenis = (id) => setFormData((f) => ({ ...f, jenis: id }));

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
            p_tanggal: getTodayString(),
            p_kategori: formData.jenis,
            p_alasan: formData.alasan,
            p_bukti_file: buktiUrl,
          })
        : await supabase.rpc("catat_presensi_manual", {
            p_tanggal: getTodayString(),
            p_jenis: formData.jenis,
            p_alasan: formData.alasan,
            p_bukti_file: buktiUrl,
          });

      if (dbError) {
        console.error("DB error:", dbError);
        if (izinSakit && dbError.code === "PGRST202") {
          throw new Error(
            "Pengajuan izin/sakit belum bisa digunakan saat ini. Hubungi admin atau pengembang aplikasi.",
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
      className="min-h-screen bg-[#f0f9ff] lg:grid lg:grid-cols-[1.08fr_1fr]"
      style={{ ...FONT, color: TINTA }}
    >
      {/* Sisi judul: pita di atas (mobile) / panel kiri penuh (desktop) */}
      <aside
        style={LATAR_KONTUR}
        className="relative px-5 pb-6 pt-5 sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: PITA_LOGO }} />
        <div className="mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-white/70 hover:text-primary-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl lg:mx-0 lg:mt-0 lg:max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-5xl lg:leading-[1.1]">
            Presensi manual
          </h1>
          <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-[#0c2d48]/70 lg:mt-3 lg:text-base">
            Untuk presensi di luar kantor, izin, atau sakit. Semua pengajuan
            ditinjau pembimbing.
          </p>

          <ol className="mt-10 hidden max-w-sm space-y-2.5 lg:block">
            {LANGKAH.map(([no, teks]) => (
              <li key={no} className="flex items-center gap-4 rounded-2xl bg-white/80 px-4 py-3 shadow-kartu ring-1 ring-primary-100 backdrop-blur">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-mono text-xs font-semibold tabular-nums text-primary-700">{no}</span>
                <span className="text-[15px] font-medium">{teks}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-[#0c2d48]/55 lg:block">
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
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">01</span>
              Presensi
            </h2>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-primary-50 p-1 ring-1 ring-primary-100">
              {[
                { id: "masuk", label: "Masuk", ikon: LogIn },
                { id: "pulang", label: "Pulang", ikon: LogOut },
              ].map((t) => {
                const aktif = (t.id === "pulang") === (formData.jenis === "pulang");
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pilihJenis(t.id)}
                    aria-pressed={aktif}
                    className={`flex items-center justify-center gap-2 rounded-xl px-1 py-3 text-sm font-semibold transition ${
                      aktif ? "bg-primary-700 text-white shadow-[0_4px_12px_rgba(3,105,161,0.3)]" : "text-primary-800 hover:bg-white"
                    }`}
                  >
                    <t.ikon className="h-5 w-5" strokeWidth={1.9} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {formData.jenis !== "pulang" && (
              <div className="mt-4">
                <label htmlFor="keperluan" className="mb-1.5 block text-sm font-semibold">
                  Keterangan
                </label>
                <select
                  id="keperluan"
                  value={formData.jenis}
                  onChange={(e) => pilihJenis(e.target.value)}
                  className={`${inputCls} h-12`}
                >
                  <option value="masuk">Presensi di luar kantor</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                </select>
              </div>
            )}
            <p className="mt-3 min-h-[2.5rem] text-[13px] leading-relaxed text-[#0c2d48]/70">
              {jenis.ket}
            </p>
          </section>

          <section className="space-y-5 rounded-2xl border border-primary-100 bg-white p-5 shadow-kartu sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h2 className="flex items-baseline gap-3 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-mono text-[11px] font-bold tabular-nums text-primary-700">02</span>
              Detail
            </h2>

            <div>
              <span className="mb-1.5 block text-sm font-semibold">Tanggal</span>
              <p className="flex h-12 items-center rounded-xl border border-primary-200 bg-primary-50 px-3.5 text-base">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}
              </p>
              <p className="mt-1.5 text-xs text-[#0c2d48]/55">
                Presensi manual hanya untuk hari ini.
              </p>
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
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-3">
                  <span className="truncate text-sm">{formData.bukti_file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bukti_file: null })}
                    className="rounded p-1 text-[#0c2d48]/60 hover:bg-[#0c2d48]/10 hover:text-[#0c2d48]"
                    aria-label="Hapus file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/60 transition-colors hover:bg-primary-50">
                  <Upload className="mb-1.5 h-6 w-6 text-[#0369a1]" strokeWidth={1.8} />
                  <span className="text-sm font-semibold text-primary-700">Pilih file</span>
                  <span className="mt-0.5 text-xs text-[#0c2d48]/55">
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-700 text-base font-bold text-white shadow-[0_6px_16px_rgba(3,105,161,0.28)] transition hover:bg-primary-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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