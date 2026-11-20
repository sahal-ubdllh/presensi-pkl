import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import { downloadKegiatanPdf } from "../utils/pdfExport";
import PageShell, { RingkasanAngka } from "../components/PageShell";
import toast from "react-hot-toast";

export default function RiwayatKegiatan() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchKegiatan = async () => {
      try {
        const { data, error } = await supabase
          .from("kegiatan")
          .select("*")
          .eq("user_id", profile.id)
          .neq("status", "draft")
          .order("tanggal", { ascending: false });

        if (error) throw error;
        setKegiatan(data || []);
      } catch (error) {
        toast.error(error.message || "Gagal memuat riwayat");
      } finally {
        setLoading(false);
      }
    };

    if (profile) fetchKegiatan();
  }, [profile]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadKegiatanPdf(profile, kegiatan);
      toast.success("PDF berhasil dibuat");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  };

  const bulanIni = new Date().toISOString().slice(0, 7);
  const totalBulanIni = kegiatan.filter((k) => String(k.tanggal).startsWith(bulanIni)).length;

  return (
    <PageShell
      onBack={() => navigate(-1)}
      aksi={
        <button
          onClick={handleDownload}
          disabled={downloading || loading || kegiatan.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-[#14213d] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1d2d52] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Menyiapkan..." : "Unduh PDF"}
        </button>
      }
      judul="Riwayat kegiatan"
      deskripsi="Semua kegiatan yang sudah Anda catat. Cetak PDF-nya untuk ditandatangani pembimbing."
      samping={
        <>
          <RingkasanAngka
            memuat={loading}
            data={[
              ["Total kegiatan", kegiatan.length],
              ["Bulan ini", totalBulanIni],
            ]}
          />
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
      ) : kegiatan.length === 0 ? (
        <div className="rounded-xl border border-[#14213d]/10 bg-white px-6 py-12 text-center">
          <p className="text-[15px] text-[#14213d]/70">Belum ada riwayat kegiatan.</p>
          <button
            onClick={() => navigate("/logbook")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d4ed8] hover:underline"
          >
            <Plus className="h-4 w-4" />
            Buat kegiatan
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
          {kegiatan.map((item) => {
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(`/kegiatan/${item.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f3efe6] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-[#2b4c7e]">{formatDate(item.tanggal)}</p>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed">{item.uraian}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#14213d]/40" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
