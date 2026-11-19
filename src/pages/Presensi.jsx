/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, CheckCircle2, ChevronRight, FileEdit, History } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { hitungJarak } from "../utils/distanceUtils";
import { getTodayString } from "../utils/dateUtils";
import toast from "react-hot-toast";
import L from "leaflet";
import PageShell from "../components/PageShell";
import { FONT, TINTA, WARNA, SOFT } from "../utils/tema";

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
  const [izinHariIni, setIzinHariIni] = useState(null); // 'izin' | 'sakit' | null
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
          .select("jenis, status, kategori")
          .eq("user_id", profile.id)
          .eq("tanggal", today);

        if (presensiError) throw presensiError;

        const masuk = presensiHariIni.some((p) => p.jenis === "masuk");
        const pulang = presensiHariIni.some((p) => p.jenis === "pulang");
        setTodayPresensi({ masuk, pulang });
        // Pengajuan izin/sakit (yang belum ditolak) menutup presensi hari ini
        const pengajuan = presensiHariIni.find(
          (p) => (p.kategori === "izin" || p.kategori === "sakit") && p.status !== "ditolak",
        );
        setIzinHariIni(pengajuan ? pengajuan.kategori : null);
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

    if (izinHariIni) {
      toast.error(`Hari ini Anda tercatat ${izinHariIni}, presensi tidak dapat dilakukan`);
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
        toast(`Presensi masuk tercatat pukul ${data.jam}: terlambat`, {
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
      <div
        className="flex min-h-screen items-center justify-center bg-[#f0f9ff]"
        style={{ ...FONT, color: TINTA }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#0369a1] border-t-transparent" />
          <p className="text-sm text-[#0c2d48]/65">Memuat data presensi...</p>
        </div>
      </div>
    );
  }

  const soft = isInRadius ? SOFT.hijau : SOFT.merah;
  const warnaStatus = soft.fg;

  const infoJam = (
    <dl className="space-y-2.5 text-[15px]">
      <div className="flex items-start gap-4 rounded-2xl border border-primary-100 bg-white/90 px-4 py-3 shadow-kartu">
        <dt className="mt-0.5 w-14 shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-center font-mono text-xs font-semibold text-primary-700">Masuk</dt>
        <dd>
          Tepat waktu sampai {jam.masukBatas}, setelah itu tercatat{" "}
          <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ color: SOFT.kuning.fg, backgroundColor: SOFT.kuning.bg }}>
            terlambat
          </span>
        </dd>
      </div>
      <div className="flex items-start gap-4 rounded-2xl border border-primary-100 bg-white/90 px-4 py-3 shadow-kartu">
        <dt className="mt-0.5 w-14 shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-center font-mono text-xs font-semibold text-primary-700">Pulang</dt>
        <dd>
          Pukul {jam.pulangMulai} sampai {jam.pulangBatas}
        </dd>
      </div>
    </dl>
  );

  const statusLokasi = (
    <div className="mt-6 max-w-sm rounded-2xl border p-4 shadow-kartu" style={{ backgroundColor: soft.bg, borderColor: soft.garis }}>
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full ring-4 ring-white/70" style={{ backgroundColor: warnaStatus }} />
        <p className="text-sm font-semibold" style={{ color: warnaStatus }}>
          {isInRadius ? "Anda berada di area kantor" : "Anda di luar area kantor"}
        </p>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tabular-nums leading-none text-[#0c2d48]">
        {distance !== null ? `${distance} m` : "..."}
      </p>
      <p className="mt-1.5 text-xs text-[#0c2d48]/70">
        dari kantor, radius presensi {radius} m
      </p>
    </div>
  );

  return (
    <PageShell
      onBack={() => navigate(-1)}
      judul="Presensi hari ini"
      deskripsi="Presensi dicatat lewat GPS dan hanya bisa dilakukan di area kantor."
      samping={
        <>
          {statusLokasi}
          <div className="mt-8 hidden max-w-sm lg:block">{infoJam}</div>
        </>
      }
      lebar="lg:max-w-lg"
    >
      <div className="space-y-6">
        {/* Peta */}
        {userLocation && officeLocation ? (
          <div className="relative z-0 h-64 overflow-hidden rounded-2xl border-2 border-white shadow-kartu ring-1 ring-primary-200 lg:h-80">
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
                pathOptions={{ color: WARNA.biru, fillColor: WARNA.biru, fillOpacity: 0.12 }}
              />
              <Marker position={officeLocation}>
                <Popup>Kantor Dinas Sosial</Popup>
              </Marker>
              <Marker position={userLocation}>
                <Popup>Lokasi Anda</Popup>
              </Marker>
            </MapContainer>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-primary-300 bg-primary-50 px-4 py-6 text-center text-sm text-primary-800">
            Lokasi belum tersedia. Aktifkan GPS dan izinkan akses lokasi, lalu muat ulang halaman.
          </p>
        )}

        {/* Jam presensi (mobile; di desktop ada di sisi kiri) */}
        <div className="lg:hidden">{infoJam}</div>

        {izinHariIni && (
          <p className="rounded-2xl border px-4 py-3 text-sm text-[#0c2d48]" style={{ backgroundColor: SOFT.kuning.bg, borderColor: SOFT.kuning.garis }}>
            Hari ini Anda tercatat <strong>{izinHariIni}</strong>, jadi presensi masuk dan pulang
            tidak dapat dilakukan.
          </p>
        )}

        {/* Tombol presensi */}
        <div className="grid grid-cols-2 gap-3">
          <TombolPresensi
            ikon={LogIn}
            warna={SOFT.hijau}
            selesai={todayPresensi.masuk && !izinHariIni}
            judul="Presensi masuk"
            judulSelesai="Sudah masuk"
            ket={`Batas ${jam.masukBatas}`}
            ketSelesai={masukStatus === "terlambat" ? "Terlambat" : "Tepat waktu"}
            warnaKetSelesai={masukStatus === "terlambat" ? WARNA.ochre : WARNA.hijau}
            nonaktif={todayPresensi.masuk || !userLocation || !!izinHariIni}
            onClick={() => handlePresensi("masuk")}
          />
          <TombolPresensi
            ikon={LogOut}
            warna={SOFT.biru}
            selesai={todayPresensi.pulang}
            judul="Presensi pulang"
            judulSelesai="Sudah pulang"
            ket={`${jam.pulangMulai} - ${jam.pulangBatas}`}
            ketSelesai="Tercatat"
            warnaKetSelesai={WARNA.hijau}
            nonaktif={todayPresensi.pulang || !todayPresensi.masuk || !userLocation || !!izinHariIni}
            onClick={() => handlePresensi("pulang")}
          />
        </div>

        {/* Tautan */}
        <div className="space-y-2.5">
          <TautanBaris
            judul="Presensi manual"
            ket="Di luar kantor, izin, atau sakit"
            ikon={FileEdit}
            warna={SOFT.kuning}
            onClick={() => navigate("/presensi-manual")}
          />
          <TautanBaris
            judul="Riwayat presensi"
            ket="Lihat catatan dan unduh PDF"
            ikon={History}
            warna={SOFT.biru}
            onClick={() => navigate("/riwayat-presensi")}
          />
        </div>
      </div>
    </PageShell>
  );
}

function TombolPresensi({
  ikon: Ikon,
  warna,
  selesai,
  judul,
  judulSelesai,
  ket,
  ketSelesai,
  warnaKetSelesai,
  nonaktif,
  onClick,
}) {
  const gaya = selesai
    ? "border cursor-default"
    : nonaktif
      ? "border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
      : "text-white shadow-[0_8px_18px_-8px_rgba(12,45,72,0.5)] hover:brightness-110 active:scale-[0.98]";
  const style = selesai
    ? { backgroundColor: SOFT.hijau.bg, borderColor: SOFT.hijau.garis, color: "#0c2d48" }
    : nonaktif
      ? undefined
      : { backgroundColor: warna.fg };
  return (
    <button
      onClick={onClick}
      disabled={nonaktif}
      style={style}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-5 transition ${gaya}`}
    >
      {selesai ? (
        <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} style={{ color: WARNA.hijau }} />
      ) : (
        <Ikon className="h-7 w-7" strokeWidth={1.8} />
      )}
      <span className="text-sm font-bold">{selesai ? judulSelesai : judul}</span>
      <span
        className={`font-mono text-[11px] ${selesai ? "font-semibold" : "opacity-80"}`}
        style={selesai ? { color: warnaKetSelesai } : undefined}
      >
        {selesai ? ketSelesai : ket}
      </span>
    </button>
  );
}

function TautanBaris({ judul, ket, ikon: Ikon, warna, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-primary-100 bg-white px-4 py-3.5 text-left shadow-kartu transition hover:-translate-y-0.5 hover:border-primary-200 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: warna.bg, color: warna.fg }}>
        <Ikon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{judul}</span>
        <span className="block text-xs text-[#0c2d48]/65">{ket}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-primary-400" />
    </button>
  );
}
