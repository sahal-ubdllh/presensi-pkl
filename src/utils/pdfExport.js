// Ekspor riwayat ke PDF (A4, Times New Roman 12pt, berkop Dinas Sosial).
// Seluruh proses berjalan di browser. jsPDF dimuat hanya saat tombol Download
// ditekan (tidak memperberat halaman awal).
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import logoUrl from "../assets/logo-dinsos.png";
import { MEREK } from "./merek";

// Font bawaan PDF hanya mendukung karakter Latin. Ganti tanda baca "pintar" dan
// buang emoji/karakter lain supaya teks tidak berubah menjadi simbol aneh.
const clean = (value) =>
  String(value ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/[^ -ÿ]/g, "")
    .trim();

const tgl = (d) => {
  try {
    return format(new Date(d), "dd MMM yyyy", { locale: localeId });
  } catch {
    return "-";
  }
};
const jam = (d) => {
  try {
    return format(new Date(d), "HH:mm");
  } catch {
    return "-";
  }
};

const safeName = (s) =>
  clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  "peserta";

// ---- Tata letak A4 (mm) ----
const FONT = "times"; // Times New Roman (font bawaan PDF)
const UKURAN = 12;
const MARGIN = 20; // kiri/kanan
const LEBAR = 210 - MARGIN * 2; // 170 mm
const TENGAH = 105;

// Logo dimuat sebagai data URL agar bisa disematkan ke PDF
async function muatLogo() {
  try {
    const blob = await (await fetch(logoUrl)).blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null; // tanpa logo bila gagal dimuat; PDF tetap jadi
  }
}

async function newDoc() {
  const [{ jsPDF }, autoTableModule, logo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    muatLogo(),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(UKURAN);
  return { doc, autoTable, logo };
}

// Kop surat + judul + identitas. Mengembalikan posisi Y awal tabel.
function header(doc, logo, title, profile, ringkasan) {
  // Logo di kiri, teks kop di tengah
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, 11, 22, 22);
    } catch {
      /* lewati logo bila format tidak terbaca */
    }
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, "bold");
  doc.setFontSize(UKURAN);
  doc.text("PEMERINTAH KABUPATEN MAJALENGKA", TENGAH + 8, 17, { align: "center" });
  doc.setFontSize(16);
  doc.text("DINAS SOSIAL", TENGAH + 8, 24, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(UKURAN);
  doc.text(`${MEREK.nama} - ${MEREK.keterangan}`, TENGAH + 8, 30.5, { align: "center" });

  // Garis kop (tebal di atas, tipis di bawah)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, 36, 210 - MARGIN, 36);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, 37.4, 210 - MARGIN, 37.4);

  // Judul dokumen
  doc.setFont(FONT, "bold");
  doc.setFontSize(UKURAN);
  const judul = title.toUpperCase();
  doc.text(judul, TENGAH, 47, { align: "center" });
  const w = doc.getTextWidth(judul);
  doc.setLineWidth(0.3);
  doc.line(TENGAH - w / 2, 48.2, TENGAH + w / 2, 48.2);

  // Identitas (label : nilai, titik dua sejajar)
  doc.setFont(FONT, "normal");
  const baris = [
    ["Nama", clean(profile?.nama_lengkap) || "-"],
    ["Instansi", clean(profile?.asal_instansi) || "-"],
    ["Dicetak", format(new Date(), "dd MMMM yyyy, HH:mm", { locale: localeId })],
  ];
  let y = 57;
  baris.forEach(([label, nilai]) => {
    doc.text(label, MARGIN, y);
    doc.text(":", MARGIN + 24, y);
    const potong = doc.splitTextToSize(nilai, LEBAR - 28);
    doc.text(potong, MARGIN + 28, y);
    y += 6 * potong.length;
  });

  // Ringkasan
  doc.text("Ringkasan", MARGIN, y);
  doc.text(":", MARGIN + 24, y);
  const rk = doc.splitTextToSize(clean(ringkasan), LEBAR - 28);
  doc.text(rk, MARGIN + 28, y);
  y += 6 * rk.length;

  return y + 3; // posisi Y awal tabel
}

function footer(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 284, 210 - MARGIN, 284);
    doc.text(`${MEREK.nama} - ${MEREK.instansi}`, MARGIN, 289);
    doc.text(`Halaman ${i} dari ${total}`, 210 - MARGIN, 289, { align: "right" });
  }
}

// Gaya tabel bersama: bergaris, Times 12pt, kepala abu-abu muda
const gayaTabel = {
  theme: "grid",
  styles: {
    font: FONT,
    fontSize: UKURAN,
    cellPadding: { top: 2, bottom: 2, left: 2.2, right: 2.2 },
    overflow: "linebreak",
    valign: "middle",
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    lineWidth: 0.2,
  },
  headStyles: {
    font: FONT,
    fontStyle: "bold",
    fillColor: [226, 226, 226],
    textColor: [0, 0, 0],
    halign: "center",
  },
  margin: { top: 20, left: MARGIN, right: MARGIN, bottom: 20 },
  tableWidth: LEBAR,
};

const labelPresensi = (r) => {
  if (r.status === "menunggu") return "Menunggu persetujuan";
  if (r.status === "ditolak") return "Ditolak";
  if (r.status === "hadir") return "Hadir";
  if (r.status === "terlambat") return "Terlambat";
  if (r.status === "izin") return "Izin";
  if (r.status === "sakit") return "Sakit";
  return clean(r.status) || "-";
};

// ---------------- Presensi ----------------
export async function buildPresensiPdf(profile, rows) {
  const { doc, autoTable, logo } = await newDoc();
  const hadirRows = rows.filter(
    (r) => (r.status === "hadir" || r.status === "terlambat") && r.jenis === "masuk",
  );
  const hadirHari = new Set(hadirRows.map((r) => r.tanggal)).size;
  const terlambatHari = new Set(
    hadirRows.filter((r) => r.status === "terlambat").map((r) => r.tanggal),
  ).size;
  const hariUnik = (st) =>
    new Set(rows.filter((r) => r.status === st && r.jenis === "masuk").map((r) => r.tanggal)).size;
  const startY = header(
    doc,
    logo,
    "Riwayat Presensi",
    profile,
    `Total catatan ${rows.length}; hadir ${hadirHari} hari; terlambat ${terlambatHari} hari; izin ${hariUnik("izin")} hari; sakit ${hariUnik("sakit")} hari.`,
  );

  autoTable(doc, {
    ...gayaTabel,
    startY,
    head: [["No", "Tanggal", "Jenis", "Jam", "Metode", "Status", "Keterangan"]],
    body: rows.map((r, i) => [
      i + 1,
      tgl(r.tanggal),
      r.jenis === "pulang" ? "Pulang" : "Masuk",
      r.metode === "manual" ? "-" : jam(r.created_at),
      r.metode === "manual" ? "Manual" : "Otomatis",
      labelPresensi(r),
      r.metode === "manual"
        ? clean(r.alasan) || "-"
        : r.dalam_radius
          ? "Di area kantor"
          : "Di luar area",
    ]),
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 27 },
      2: { cellWidth: 17, halign: "center" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 21, halign: "center" },
      5: { cellWidth: 30 },
      6: { cellWidth: "auto" },
    },
  });
  footer(doc);
  return doc;
}

export async function downloadPresensiPdf(profile, rows) {
  const doc = await buildPresensiPdf(profile, rows);
  doc.save(`riwayat-presensi_${safeName(profile?.nama_lengkap)}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ---------------- Kegiatan ----------------
// Kotak tanda tangan pembimbing (tanda tangan basah) di bawah tabel.
// Jika sisa halaman tidak cukup, kotak dipindah utuh ke halaman berikutnya.
function kotakTandaTangan(doc) {
  const TINGGI = 52; // tempat, jabatan, ruang tanda tangan, garis nama
  const batasBawah = 280;
  let y = (doc.lastAutoTable?.finalY ?? 60) + 12;
  if (y + TINGGI > batasBawah) {
    doc.addPage();
    y = 30;
  }
  const x = 210 - MARGIN - 35; // titik tengah blok, rata kanan
  doc.setFont(FONT, "normal");
  doc.setFontSize(UKURAN);
  doc.setTextColor(0, 0, 0);
  doc.text(`Majalengka, ${format(new Date(), "dd MMMM yyyy", { locale: localeId })}`, x, y, { align: "center" });
  doc.text("Pembimbing Lapangan,", x, y + 6, { align: "center" });
  // ruang kosong 28 mm untuk tanda tangan basah
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(x - 35, y + 42, x + 35, y + 42);
  doc.text("Nama / NIP", x, y + 47, { align: "center" });
}

export async function buildKegiatanPdf(profile, rows) {
  const { doc, autoTable, logo } = await newDoc();
  const adaJudul = rows.some((r) => clean(r.judul));
  const startY = header(
    doc,
    logo,
    "Riwayat Kegiatan",
    profile,
    `Total ${rows.length} kegiatan.`,
  );

  autoTable(doc, {
    ...gayaTabel,
    startY,
    head: [adaJudul ? ["No", "Tanggal", "Judul", "Uraian Kegiatan"] : ["No", "Tanggal", "Uraian Kegiatan"]],
    body: rows.map((r, i) => [
      i + 1,
      tgl(r.tanggal || r.created_at),
      ...(adaJudul ? [clean(r.judul) || "-"] : []),
      clean(r.uraian) || "-",
    ]),
    styles: { ...gayaTabel.styles, valign: "top" },
    columnStyles: adaJudul
      ? { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 27 }, 2: { cellWidth: 40 }, 3: { cellWidth: "auto" } }
      : { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 27 }, 2: { cellWidth: "auto" } },
  });
  kotakTandaTangan(doc);
  footer(doc);
  return doc;
}

export async function downloadKegiatanPdf(profile, rows) {
  const doc = await buildKegiatanPdf(profile, rows);
  doc.save(`riwayat-kegiatan_${safeName(profile?.nama_lengkap)}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
