// Menambal src/pages/Login.jsx milik Anda tanpa menimpa logo/tampilan yang sudah Anda ubah.
// Jalankan dari folder proyek:   node patch-login.mjs
// File asli dicadangkan ke src/pages/Login.jsx.bak
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

const path = process.argv[2] || "src/pages/Login.jsx";
if (!existsSync(path)) {
  console.error(`File tidak ditemukan: ${path}\nJalankan skrip ini dari folder utama proyek (yang berisi folder src).`);
  process.exit(1);
}

const asli = readFileSync(path, "utf8");
const crlf = asli.includes("\r\n");
let s = asli.replace(/\r\n/g, "\n");

if (s.includes("ContactAdminModal")) {
  console.log("Login.jsx sudah pernah ditambal. Tidak ada yang diubah.");
  process.exit(0);
}

const langkah = [
  [
    "impor dialog kontak admin",
    /(import\s*\{\s*useAuth\s*\}\s*from\s*['"]\.\.\/context\/AuthContext['"];?)/,
    "$1\nimport ContactAdminModal from '../components/ContactAdminModal';",
  ],
  [
    "state 'ingat saya' dan dialog kontak",
    /(const\s*\{\s*login\s*\}\s*=\s*useAuth\(\);)/,
    "$1\n  const [remember, setRemember] = useState(true);\n  const [kontak, setKontak] = useState(null);",
  ],
  [
    "kirim pilihan 'ingat saya' saat login",
    /await\s+login\(\s*email\s*,\s*password\s*\)/,
    "await login(email, password, remember)",
  ],
  [
    "tombol 'Lupa password?'",
    /<button([^>]*?)>(\s*)Lupa password\?/,
    "<button$1 onClick={() => setKontak('password')}>$2Lupa password?",
  ],
  [
    "kotak centang 'Ingat saya'",
    /(<input\s+type="checkbox"\s+id="remember")/,
    "$1\n              checked={remember}\n              onChange={(e) => setRemember(e.target.checked)}",
  ],
  [
    "tombol 'Hubungi Admin'",
    /<button\s+className="([^"]*)">(\s*)Hubungi Admin/,
    "<button type=\"button\" onClick={() => setKontak('akun')} className=\"$1\">$2Hubungi Admin",
  ],
  [
    "pasang dialog di akhir halaman",
    /\n(\s*)<\/div>\s*\n\s*\);\s*\n\}\s*$/,
    "\n$1  <ContactAdminModal jenis={kontak} email={email} onClose={() => setKontak(null)} />\n$1</div>\n  );\n}\n",
  ],
];

for (const [nama, pola, ganti] of langkah) {
  if (!pola.test(s)) {
    console.error(`GAGAL pada bagian: ${nama}\nBentuk kode di Login.jsx Anda berbeda dari yang diperkirakan. Tidak ada file yang diubah.\nKirim isi Login.jsx Anda ke Claude agar disesuaikan.`);
    process.exit(1);
  }
  s = s.replace(pola, ganti);
}

copyFileSync(path, path + ".bak");
writeFileSync(path, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log(`Berhasil. ${langkah.length} perubahan diterapkan.\nCadangan: ${path}.bak`);
