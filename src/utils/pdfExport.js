// Ekspor riwayat ke PDF. Seluruh proses berjalan di browser.
// jsPDF dimuat hanya saat tombol Download ditekan (tidak memperberat halaman awal).
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Font bawaan PDF hanya mendukung karakter Latin. Ganti tanda baca "pintar" dan
// buang emoji/karakter lain supaya teks tidak berubah menjadi simbol aneh.
const clean = (value) =>
  String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/[^\u0020-\u00FF]/g, "")
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

const BRAND = [37, 99, 235];

async function newDoc() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  return { doc, autoTable };
}

function header(doc, title, profile, ringkasan) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const baris = [
    `Nama: ${clean(profile?.nama_lengkap) || "-"}`,
    `Instansi: ${clean(profile?.asal_instansi) || "-"}`,
    `Dicetak: ${format(new Date(), "dd MMMM yyyy, HH:mm", { locale: localeId })}`,
    ringkasan,
  ];
  baris.forEach((t, i) => doc.text(clean(t), 14, 26 + i * 5.5));
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 26 + baris.length * 5.5 - 2, 196, 26 + baris.length * 5.5 - 2);
  return 26 + baris.length * 5.5 + 2; // posisi Y awal tabel
}

function footer(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Halaman ${i} dari ${total}`, 196, 290, { align: "right" });
    doc.text("Sistem Monitoring PKL", 14, 290);
  }
}

const labelPresensi = (r) => {
  if (r.status === "menunggu") return "Menunggu persetujuan";
  if (r.status === "ditolak") return "Ditolak";
  if (r.status === "hadir") return "Hadir";
  return clean(r.status) || "-";
};

// ---------------- Presensi ----------------
export async function buildPresensiPdf(profile, rows) {
  const { doc, autoTable } = await newDoc();
  const hadirHari = new Set(
    rows.filter((r) => r.status === "hadir" && r.jenis === "masuk").map((r) => r.tanggal),
  ).size;
  const startY = header(
    doc,
    "Riwayat Presensi",
    profile,
    `Total catatan: ${rows.length}   |   Hari hadir: ${hadirHari}`,
  );

  autoTable(doc, {
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
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: BRAND, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 27 },
      2: { cellWidth: 17 },
      3: { cellWidth: 13 },
      4: { cellWidth: 20 },
      5: { cellWidth: 32 },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });
  footer(doc);
  return doc;
}

export async function downloadPresensiPdf(profile, rows) {
  const doc = await buildPresensiPdf(profile, rows);
  doc.save(`riwayat-presensi_${safeName(profile?.nama_lengkap)}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ---------------- Kegiatan ----------------
const labelKegiatan = { disetujui: "Disetujui", menunggu: "Menunggu", ditolak: "Ditolak" };

export async function buildKegiatanPdf(profile, rows) {
  const { doc, autoTable } = await newDoc();
  const hitung = (s) => rows.filter((r) => r.status === s).length;
  const startY = header(
    doc,
    "Riwayat Kegiatan",
    profile,
    `Total: ${rows.length}   |   Disetujui: ${hitung("disetujui")}   |   Menunggu: ${hitung("menunggu")}   |   Ditolak: ${hitung("ditolak")}`,
  );

  autoTable(doc, {
    startY,
    head: [["No", "Tanggal", "Judul", "Uraian Kegiatan", "Status"]],
    body: rows.map((r, i) => [
      i + 1,
      tgl(r.tanggal || r.created_at),
      clean(r.judul) || "-",
      clean(r.uraian) || "-",
      labelKegiatan[r.status] || clean(r.status) || "-",
    ]),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: BRAND, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 27 },
      2: { cellWidth: 38 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });
  footer(doc);
  return doc;
}

export async function downloadKegiatanPdf(profile, rows) {
  const doc = await buildKegiatanPdf(profile, rows);
  doc.save(`riwayat-kegiatan_${safeName(profile?.nama_lengkap)}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
