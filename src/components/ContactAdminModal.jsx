import { X, MessageCircle, Mail } from 'lucide-react';

// Atur di .env.local (lalu jalankan ulang npm run dev / build):
//   VITE_ADMIN_WHATSAPP=6281234567890     (boleh diawali 0 atau 62)
//   VITE_ADMIN_EMAIL=admin@contoh.go.id   (opsional)
const rapikanNomor = (v = '') => {
  const angka = String(v).replace(/\D/g, '');
  return angka.startsWith('0') ? '62' + angka.slice(1) : angka;
};
const WHATSAPP = rapikanNomor(import.meta.env.VITE_ADMIN_WHATSAPP);
const EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim();

const ISI = {
  password: {
    judul: 'Lupa password?',
    teks: 'Password direset oleh admin. Hubungi admin dan sebutkan email akun Anda, lalu admin akan memberikan password baru. Setelah masuk, segera simpan password baru Anda.',
    subjek: 'Reset password akun Sistem Presensi PKL',
    pesan: (email) =>
      `Halo Admin, saya lupa password akun Sistem Presensi PKL.${email ? ` Email akun saya: ${email}.` : ''} Mohon bantuan untuk mereset password saya. Terima kasih.`,
  },
  akun: {
    judul: 'Belum punya akun?',
    teks: 'Akun dibuat oleh admin. Hubungi admin dan sebutkan nama lengkap, jenis peserta (siswa/mahasiswa), asal instansi, dan email aktif Anda.',
    subjek: 'Permintaan akun Sistem Presensi PKL',
    pesan: () =>
      'Halo Admin, saya ingin meminta akun Sistem Presensi PKL.\nNama lengkap: \nJenis peserta (siswa/mahasiswa): \nAsal instansi: \nEmail aktif: ',
  },
};

export default function ContactAdminModal({ jenis, email, onClose }) {
  if (!jenis || !ISI[jenis]) return null;
  const isi = ISI[jenis];
  const pesan = isi.pesan((email || '').trim());
  const adaKontak = Boolean(WHATSAPP || EMAIL);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Tutup"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-2 pr-8">{isi.judul}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{isi.teks}</p>

        <div className="mt-5 space-y-2">
          {WHATSAPP && (
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(pesan)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700"
            >
              <MessageCircle className="w-5 h-5" /> Chat WhatsApp Admin
            </a>
          )}
          {EMAIL && (
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent(isi.subjek)}&body=${encodeURIComponent(pesan)}`}
              className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200"
            >
              <Mail className="w-5 h-5" /> Kirim Email ke Admin
            </a>
          )}
          {!adaKontak && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
              Silakan temui atau hubungi admin Dinas Sosial secara langsung.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-slate-500 text-sm font-medium py-2 hover:text-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
