/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateUtils";
import { downloadPresensiPdf } from "../utils/pdfExport";
import toast from "react-hot-toast";

export default function RiwayatPresensi() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRiwayat = async () => {
    try {
      const { data, error } = await supabase
        .from("presensi")
        .select("*")
        .eq("user_id", profile.id)
        .order("tanggal", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRiwayat(data);
    } catch (error) {
      toast.error(error.message || "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiwayat();
  },);

  const [downloading, setDownloading] = useState(false);

  // Ambil SEMUA riwayat (tampilan hanya memuat 50 terbaru), lalu buat PDF
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase
        .from("presensi")
        .select("*")
        .eq("user_id", profile.id)
        .order("tanggal", { ascending: false })
        .order("jenis", { ascending: true })
        .limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Belum ada data untuk diunduh");
        return;
      }
      await downloadPresensiPdf(profile, data);
      toast.success("PDF berhasil dibuat");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getStatusIcon = (metode, dalam_radius, statusPresensi) => {
    if (statusPresensi === "ditolak")
      return <AlertCircle className="w-4 h-4 text-rose-500" />;
    if (metode === "manual")
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (dalam_radius)
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <AlertCircle className="w-4 h-4 text-rose-500" />;
  };

  const getStatusText = (metode, dalam_radius, statusPresensi) => {
    if (statusPresensi === "menunggu")
      return {
        text: "Menunggu Persetujuan",
        color: "text-amber-600 bg-amber-50",
      };
    if (statusPresensi === "ditolak")
      return { text: "Ditolak", color: "text-rose-600 bg-rose-50" };
    if (metode === "manual")
      return { text: "Manual", color: "text-amber-600 bg-amber-50" };
    if (dalam_radius)
      return {
        text: "Di Area Kantor",
        color: "text-emerald-600 bg-emerald-50",
      };
    return { text: "Di Luar Area", color: "text-rose-600 bg-rose-50" };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">
          Riwayat Presensi
        </h1>
        <button
          onClick={handleDownload}
          disabled={downloading || loading}
          className="ml-auto flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Menyiapkan..." : "PDF"}
        </button>
      </header>

      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : riwayat.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            Belum ada riwayat presensi.
          </div>
        ) : (
          <div className="space-y-3">
            {riwayat.map((item) => {
              const status = getStatusText(item.metode, item.dalam_radius, item.status);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
                >
                  <div className={`p-2.5 rounded-xl ${status.color}`}>
                    {getStatusIcon(item.metode, item.dalam_radius, item.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {formatDate(item.tanggal)}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span
                        className={`font-medium ${item.jenis === "masuk" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {item.jenis === "masuk" ? "Masuk" : "Pulang"}
                      </span>
                      <span>•</span>
                      <span>
                        {item.metode === "otomatis" ? "Otomatis" : "Manual"}
                      </span>
                      {item.alasan && (
                        <span>• {item.alasan.substring(0, 20)}...</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
