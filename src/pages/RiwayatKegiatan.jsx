import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import { downloadKegiatanPdf } from "../utils/pdfExport";
import PageShell, { RingkasanAngka } from "../components/PageShell";
import { WARNA, gayaChip } from "../utils/tema";
import toast from "react-hot-toast";

const STATUS = {
  disetujui: { label: "Disetujui", warna: WARNA.hijau },
  menunggu: { label: "Menunggu", warna: WARNA.biru },
  ditolak: { label: "Ditolak", warna: WARNA.merah },
};

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

  const hitung = (st) => kegiatan.filter((k) => k.status === st).length;

  return (
    <PageShell
      onBack={() => navigate(-1)}
      aksi={
        <button
          onClick={handleDownload}
          disabled={downloading || loading || kegiatan.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(3,105,161,0.25)] transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Menyiapkan..." : "Unduh PDF"}
        </button>
      }
      judul="Riwayat kegiatan"
      deskripsi="Semua kegiatan yang sudah Anda kirim ke pembimbing."
      samping={
        <>
          <RingkasanAngka
            memuat={loading}
            data={[
              ["Disetujui", hitung("disetujui"), WARNA.hijau],
              ["Menunggu", hitung("menunggu"), WARNA.biru],
              ["Ditolak", hitung("ditolak"), WARNA.merah],
            ]}
          />
          <button
            onClick={() => navigate("/logbook")}
            className="mt-6 hidden items-center gap-1.5 text-sm font-semibold text-[#0369a1] hover:underline lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Buat kegiatan baru
          </button>
        </>
      }
      lebar="lg:max-w-lg"
    >
      {loading ? (
        <div className="flex justify-center rounded-2xl border border-primary-100 bg-white py-14 shadow-kartu">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
        </div>
      ) : kegiatan.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 px-6 py-12 text-center">
          <p className="text-[15px] text-[#0c2d48]/70">Belum ada riwayat kegiatan.</p>
          <button
            onClick={() => navigate("/logbook")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0369a1] hover:underline"
          >
            <Plus className="h-4 w-4" />
            Buat kegiatan
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {kegiatan.map((item) => {
            const st = STATUS[item.status] || { label: item.status, warna: WARNA.tinta };
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(`/kegiatan/${item.id}`)}
                  style={{ borderLeftColor: st.warna }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-l-4 border-primary-100 bg-white px-4 py-4 text-left shadow-kartu transition hover:-translate-y-0.5 hover:border-primary-200 active:scale-[0.99] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs font-medium text-primary-700">{formatDate(item.tanggal)}</p>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={gayaChip(st.warna)}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed">{item.uraian}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
