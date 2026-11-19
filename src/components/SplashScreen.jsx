import { useEffect, useState } from "react";
import "@fontsource-variable/public-sans";
import { MEREK } from "../utils/merek";
import { KERTAS, TINTA, FONT, LATAR_KONTUR, PITA_LOGO } from "../utils/tema";

// Layar pembuka: tampil sekali per sesi peramban, bisa dilewati dengan klik/ketuk.
const KUNCI = "sigap-splash-selesai";
const DURASI_TAMPIL = 2500; // ms sebelum mulai memudar
const DURASI_PUDAR = 450; // ms

function sudahTampil() {
  try {
    return sessionStorage.getItem(KUNCI) === "1";
  } catch {
    return false;
  }
}

export default function SplashScreen() {
  const [tahap, setTahap] = useState(() => (sudahTampil() ? "selesai" : "tampil"));

  useEffect(() => {
    if (tahap === "selesai") return undefined;
    if (tahap === "tampil") {
      const t = setTimeout(() => setTahap("pudar"), DURASI_TAMPIL);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(KUNCI, "1");
      } catch {
        /* abaikan: splash akan tampil lagi pada muat ulang berikutnya */
      }
      setTahap("selesai");
    }, DURASI_PUDAR);
    return () => clearTimeout(t);
  }, [tahap]);

  if (tahap === "selesai") return null;

  return (
    <div
      role="presentation"
      onClick={() => tahap === "tampil" && setTahap("pudar")}
      className={`sigap-splash fixed inset-0 z-[9999] flex cursor-pointer flex-col items-center justify-center ${
        tahap === "pudar" ? "sigap-pudar" : ""
      }`}
      style={{ ...LATAR_KONTUR, backgroundColor: KERTAS, color: TINTA, ...FONT }}
    >
      <style>{`
        .sigap-splash { transition: opacity ${DURASI_PUDAR}ms ease; }
        .sigap-splash.sigap-pudar { opacity: 0; pointer-events: none; }
        .sg-ubin { transform-origin: 50% 50%; animation: sg-muncul .55s cubic-bezier(.2,.8,.2,1) both; }
        .sg-cincin1, .sg-cincin2, .sg-centang { stroke-dasharray: 1; stroke-dashoffset: 1; }
        .sg-cincin1 { animation: sg-gambar .7s ease-out .25s forwards; }
        .sg-cincin2 { animation: sg-gambar .7s ease-out .45s forwards; }
        .sg-centang { animation: sg-gambar .45s cubic-bezier(.3,.7,.2,1) .95s forwards; }
        .sg-nama { opacity: 0; animation: sg-naik .6s ease-out 1.35s forwards; }
        .sg-ket { opacity: 0; animation: sg-naik .6s ease-out 1.65s forwards; }
        .sg-kaki { opacity: 0; animation: sg-naik .6s ease-out 1.9s forwards; }
        .sg-garis { transform-origin: left; transform: scaleX(0); animation: sg-isi ${DURASI_TAMPIL}ms linear forwards; }
        @keyframes sg-muncul { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
        @keyframes sg-gambar { to { stroke-dashoffset: 0; } }
        @keyframes sg-naik { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sg-isi { to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sg-ubin, .sg-nama, .sg-ket, .sg-kaki { animation: none; opacity: 1; transform: none; }
          .sg-cincin1, .sg-cincin2, .sg-centang { animation: none; stroke-dashoffset: 0; }
          .sg-garis { animation: none; transform: scaleX(1); }
        }
      `}</style>

      <svg viewBox="0 0 64 64" className="sg-ubin h-28 w-28 drop-shadow-[0_12px_28px_rgba(2,132,199,0.35)]" aria-hidden="true">
        <defs><linearGradient id="sg-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#0369a1" /></linearGradient></defs>
        <rect width="64" height="64" rx="16" fill="url(#sg-g)" />
        <circle className="sg-cincin1" cx="32" cy="32" r="25" pathLength="1" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.5" />
        <circle className="sg-cincin2" cx="32" cy="32" r="17" pathLength="1" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2.5" />
        <path className="sg-centang" d="M21 33l8 8 15-17" pathLength="1" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <h1 className="sg-nama mt-7 text-5xl font-extrabold tracking-tight text-[#0c2d48]">{MEREK.nama}</h1>
      <p className="sg-ket mt-2 text-base font-semibold text-primary-700">{MEREK.keterangan}</p>

      <div className="sg-kaki absolute bottom-10 flex flex-col items-center gap-3 px-6 text-center">
        <div className="h-1 w-28 overflow-hidden rounded-full bg-[#0c2d48]/10">
          <div className="sg-garis h-full" style={{ backgroundImage: PITA_LOGO }} />
        </div>
        <p className="text-xs text-[#0c2d48]/60">{MEREK.instansi}</p>
      </div>
    </div>
  );
}