import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";
import PageShell from "../components/PageShell";
import { FONT, TINTA, WARNA, gayaChip } from "../utils/tema";
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
        className="flex min-h-screen items-center justify-center bg-[#f3efe6]"
        style={{ ...FONT, color: TINTA }}
      >
        {loading ? (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
        ) : (
          <div className="text-center">
            <p className="text-[#14213d]/70">Kegiatan tidak ditemukan</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-3 text-sm font-semibold text-[#1d4ed8] hover:underline"
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
          <span className="font-mono text-sm text-[#2b4c7e]">{formatDate(kegiatan.tanggal)}</span>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
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
          <p className="whitespace-pre-wrap rounded-xl border border-[#14213d]/10 bg-white p-4 text-[15px] leading-relaxed lg:border-[#14213d]/20">
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
                className="w-full rounded-xl border border-[#14213d]/15"
              />
            ) : (
              <a
                href={kegiatan.bukti_file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[#14213d]/15 bg-white p-4 transition-colors hover:bg-[#f3efe6]"
              >
                <FileText className="h-5 w-5 text-[#2b4c7e]" />
                <span className="flex-1 truncate text-sm">Lihat file</span>
                <ExternalLink className="h-4 w-4 text-[#14213d]/40" />
              </a>
            )}
          </section>
        )}

        {kegiatan.catatan_pembimbing && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Catatan pembimbing</h2>
            <p className="rounded-xl border-l-2 border-[#2b4c7e] bg-[#f3efe6] p-4 text-[15px] leading-relaxed">
              {kegiatan.catatan_pembimbing}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}
