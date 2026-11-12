import "@fontsource-variable/public-sans";
import konturUrl from "../assets/kontur.svg";

// Palet halaman peserta: kertas hangat + tinta biru (mengacu pada halaman Login)
export const KERTAS = "#f3efe6";
export const TINTA = "#14213d";
export const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };
export const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: `url(${konturUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "right bottom",
};

export const WARNA = {
  tinta: "#14213d",
  biru: "#2b4c7e",
  ochre: "#b7791f",
  merah: "#a63d2f",
  hijau: "#2f6b4f",
};

export const INPUT_CLS =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20";

// Label status berwarna: teks warna penuh, latar warna yang sama dengan opasitas rendah
export const gayaChip = (warna) => ({ color: warna, backgroundColor: `${warna}14` });
