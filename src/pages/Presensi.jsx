/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { hitungJarak } from "../utils/distanceUtils";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import L from "leaflet";

// Fix default marker icon issue in Leaflet + React
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function Presensi() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [officeLocation, setOfficeLocation] = useState(null);
  const [radius, setRadius] = useState(100);
  const [distance, setDistance] = useState(null);
  const [isInRadius, setIsInRadius] = useState(false);
  const [todayPresensi, setTodayPresensi] = useState({
    masuk: false,
    pulang: false,
  });
  const [masukStatus, setMasukStatus] = useState(null); // 'hadir' | 'terlambat'
  // Jam presensi (dibaca dari tabel konfigurasi; nilai bawaan bila belum diatur)
  const [jam, setJam] = useState({
    masukBatas: "07:30",
    pulangMulai: "15:45",
    pulangBatas: "16:00",
  });

  // ✅ Pindahkan loadData ke dalam useEffect atau gunakan useCallback
  useEffect(() => {
    // Guard clause: tunggu profile tersedia
    if (!profile) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // 1. Ambil konfigurasi kantor dari Supabase
        const { data: config, error: configError } = await supabase
          .from("konfigurasi")
          .select("*");

        if (configError) throw configError;

        if (!config || config.length === 0) {
          throw new Error("Konfigurasi lokasi kantor belum diatur");
        }

        const configObj = {};
        config.forEach((c) => (configObj[c.key] = c.value));

        const officeLat = parseFloat(configObj.lokasi_kantor_lat);
        const officeLng = parseFloat(configObj.lokasi_kantor_lng);
        const radiusVal = parseFloat(configObj.radius_presensi);

        setOfficeLocation([officeLat, officeLng]);
        setRadius(radiusVal);

        const hhmm = (v, bawaan) =>
          /^\d{1,2}:\d{2}/.test(String(v || "")) ? String(v).slice(0, 5) : bawaan;
        setJam({
          masukBatas: hhmm(configObj.jam_masuk_batas, "07:30"),
          pulangMulai: hhmm(configObj.jam_pulang_mulai, "15:45"),
          pulangBatas: hhmm(configObj.jam_pulang_batas, "16:00"),
        });

        // 2. Cek presensi hari ini
        const today = getTodayString();
        const { data: presensiHariIni, error: presensiError } = await supabase
          .from("presensi")
          .select("jenis, status")
          .eq("user_id", profile.id)
          .eq("tanggal", today);

        if (presensiError) throw presensiError;

        const masuk = presensiHariIni.some((p) => p.jenis === "masuk");
        const pulang = presensiHariIni.some((p) => p.jenis === "pulang");
        setTodayPresensi({ masuk, pulang });
        const barisMasuk = presensiHariIni.find((p) => p.jenis === "masuk");
        setMasukStatus(barisMasuk?.status || null);

        // 3. Minta lokasi user
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              setUserLocation([lat, lng]);

              const jarak = hitungJarak(lat, lng, officeLat, officeLng);
              setDistance(Math.round(jarak));
              setIsInRadius(jarak <= radiusVal);
              setLoading(false);
            },
            (error) => {
              toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
              console.error(error);
              setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          toast.error("Geolocation tidak didukung browser Anda.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading presensi:", error);
        toast.error(error.message || "Gagal memuat data presensi");
        setLoading(false);
      }
    };

    loadData();
  }, [profile]); // ✅ Dependency array yang benar

  const handlePresensi = async (jenis) => {
    // Guard clause
    if (!profile) {
      toast.error("Profile belum ter-load. Silakan refresh.");
      return;
    }

    if (!userLocation) {
      toast.error("Lokasi belum tersedia. Tunggu beberapa saat.");
      return;
    }

    if (!isInRadius && jenis === "masuk") {
      toast.error("Anda berada di luar radius kantor!");
      return;
    }
    if (!isInRadius && jenis === "pulang") {
      toast.error("Anda berada di luar radius kantor!");
      return;
    }

    try {
      // Radius, tanggal, dan status dihitung di server (fungsi catat_presensi)
      const { data, error } = await supabase.rpc("catat_presensi", {
        p_jenis: jenis,
        p_lat: userLocation[0],
        p_lng: userLocation[1],
      });

      if (error) throw error;

      if (jenis === "masuk" && data?.status === "terlambat") {
        toast(`Presensi masuk tercatat pukul ${data.jam}: TERLAMBAT`, {
          icon: "⏰",
          duration: 5000,
        });
      } else {
        toast.success(`Presensi ${jenis} berhasil!`);
      }
      if (jenis === "masuk") setMasukStatus(data?.status || "hadir");
      setTodayPresensi((prev) => ({ ...prev, [jenis]: true }));
    } catch (error) {
      toast.error(error.message || "Gagal melakukan presensi");
    }
  };

  // Loading screen
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Memuat data presensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">
          Presensi Hari Ini
        </h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Status Lokasi Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl ${isInRadius ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                {isInRadius
                  ? "Anda Berada di Area Kantor"
                  : "Anda di Luar Area Kantor"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Jarak:{" "}
                {distance !== null ? `${distance} meter` : "Menghitung..."} dari
                kantor
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Radius presensi: {radius} meter
              </p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {userLocation && officeLocation && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-64 relative z-0">
            <MapContainer
              center={userLocation}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Circle
                center={officeLocation}
                radius={radius}
                pathOptions={{
                  color: "blue",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.1,
                }}
              />
              <Marker position={officeLocation}>
                <Popup>Kantor Dinas Sosial</Popup>
              </Marker>
              <Marker position={userLocation}>
                <Popup>Lokasi Anda</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Jam presensi */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" /> Jam Presensi
          </p>
          <p>
            Masuk: tepat waktu sampai {jam.masukBatas}, lewat dari itu tercatat{" "}
            <span className="font-medium text-amber-600">Terlambat</span>
          </p>
          <p>
            Pulang: pukul {jam.pulangMulai} - {jam.pulangBatas}
          </p>
        </div>

        {/* Tombol Presensi */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handlePresensi("masuk")}
            disabled={todayPresensi.masuk || !userLocation}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              todayPresensi.masuk
                ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
                : "bg-white border border-slate-200 text-slate-700 hover:border-primary-500 hover:text-primary-600 shadow-sm"
            }`}
          >
            <div
              className={`p-2.5 rounded-xl ${todayPresensi.masuk ? "bg-emerald-200" : "bg-primary-50 text-primary-600"}`}
            >
              {todayPresensi.masuk ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <span className="font-semibold text-sm">
              {todayPresensi.masuk ? "Sudah Masuk" : "Presensi Masuk"}
            </span>
            {/* Baris keterangan: selalu ada di kedua kartu agar tinggi & posisi ikon sejajar */}
            <span
              className={`text-[11px] font-medium min-h-4 ${
                todayPresensi.masuk && masukStatus === "terlambat"
                  ? "text-amber-600"
                  : todayPresensi.masuk
                    ? "text-emerald-700"
                    : "text-slate-400"
              }`}
            >
              {todayPresensi.masuk
                ? masukStatus === "terlambat"
                  ? "Terlambat"
                  : "Tepat waktu"
                : `Batas ${jam.masukBatas}`}
            </span>
          </button>

          <button
            onClick={() => handlePresensi("pulang")}
            disabled={
              todayPresensi.pulang || !todayPresensi.masuk || !userLocation
            }
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              todayPresensi.pulang
                ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
                : "bg-white border border-slate-200 text-slate-700 hover:border-primary-500 hover:text-primary-600 shadow-sm"
            }`}
          >
            <div
              className={`p-2.5 rounded-xl ${todayPresensi.pulang ? "bg-emerald-200" : "bg-rose-50 text-rose-600"}`}
            >
              {todayPresensi.pulang ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
            </div>
            <span className="font-semibold text-sm">
              {todayPresensi.pulang ? "Sudah Pulang" : "Presensi Pulang"}
            </span>
            <span
              className={`text-[11px] font-medium min-h-4 ${
                todayPresensi.pulang ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              {todayPresensi.pulang
                ? "Tercatat"
                : `${jam.pulangMulai} - ${jam.pulangBatas}`}
            </span>
          </button>
        </div>

        {/* Link ke Presensi Manual & Riwayat */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate("/presensi-manual")}
            className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Presensi Manual (Di Luar Kantor)
          </button>
          <button
            onClick={() => navigate("/riwayat-presensi")}
            className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            Lihat Riwayat Presensi
          </button>
        </div>
      </div>
    </div>
  );
}