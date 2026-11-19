import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";
import PageShell from "../components/PageShell";
import { FONT, TINTA, WARNA, SOFT, gayaChip } from "../utils/tema";
import toast from "react-hot-toast";

const STATUS = {
  disetujui: { label: "Disetujui", warna: WARNA.hijau },
  menunggu: { label: "Menunggu review", warna: WARNA.biru },
  ditolak: { label: "Ditolak", warna: WARNA.merah },
};

export default function DetailKegiatan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("kegiatan")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setKegiatan(data);
      } catch (error) {
        toast.error(error.message || "Gagal memuat detail");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading || !kegiatan) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f0f9ff]"
        style={{ ...FONT, color: TINTA }}
      >
        {loading ? (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
        ) : (
          <div className="text-center">
            <p className="text-[#0c2d48]/70">Kegiatan tidak ditemukan</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-3 text-sm font-semibold text-[#0369a1] hover:underline"
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    );
  }

  const st = STATUS[kegiatan.status] || STATUS.menunggu;

  return (
    <PageShell
      onBack={() => navigate(-1)}
      judul="Detail kegiatan"
      deskripsi={undefined}
      samping={
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/80 px-3 py-1 font-mono text-sm font-medium text-primary-700 ring-1 ring-primary-100">{formatDate(kegiatan.tanggal)}</span>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={gayaChip(st.warna)}
          >
            {st.label}
          </span>
        </div>
      }
      lebar="lg:max-w-lg"
    >
      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Uraian kegiatan</h2>
          <p className="whitespace-pre-wrap rounded-2xl border border-primary-100 bg-white p-4 text-[15px] leading-relaxed shadow-kartu">
            {kegiatan.uraian}
          </p>
        </section>

        {kegiatan.bukti_file && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Bukti kegiatan</h2>
            {kegiatan.bukti_file.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img
                src={kegiatan.bukti_file}
                alt="Bukti kegiatan"
                className="w-full rounded-2xl border border-primary-100 shadow-kartu"
              />
            ) : (
              <a
                href={kegiatan.bukti_file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-4 shadow-kartu transition hover:border-primary-200"
              >
                <FileText className="h-5 w-5 text-[#0369a1]" />
                <span className="flex-1 truncate text-sm">Lihat file</span>
                <ExternalLink className="h-4 w-4 text-[#0c2d48]/40" />
              </a>
            )}
          </section>
        )}

        {kegiatan.catatan_pembimbing && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Catatan pembimbing</h2>
            <p
              className="rounded-2xl border-l-4 p-4 text-[15px] leading-relaxed"
              style={{
                backgroundColor: (kegiatan.status === "disetujui" ? SOFT.hijau : kegiatan.status === "ditolak" ? SOFT.merah : SOFT.kuning).bg,
                borderLeftColor: st.warna === WARNA.biru ? WARNA.ochre : st.warna,
              }}
            >
              {kegiatan.catatan_pembimbing}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}
