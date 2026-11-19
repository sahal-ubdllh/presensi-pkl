import { useEffect, useState } from 'react';
import { X, MessageCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Kontak admin dibaca dari tabel `konfigurasi` di Supabase (baris
// kontak_admin_whatsapp dan kontak_admin_email), jadi bisa diganti lewat Table
// Editor tanpa mengubah kode atau deploy ulang.
// Cadangan bila tabel kosong / gagal dibaca: variabel .env (opsional)
//   VITE_ADMIN_WHATSAPP=6281234567890     (boleh diawali 0 atau 62)
//   VITE_ADMIN_EMAIL=admin@contoh.go.id
const rapikanNomor = (v = '') => {
  const angka = String(v).replace(/\D/g, '');
  return angka.startsWith('0') ? '62' + angka.slice(1) : angka;
};
const WHATSAPP_ENV = rapikanNomor(import.meta.env.VITE_ADMIN_WHATSAPP);
const EMAIL_ENV = (import.meta.env.VITE_ADMIN_EMAIL || '').trim();

// Dimuat sekali per kunjungan, lalu dipakai ulang
let kontakCache = null;
let kontakJanji = null;
function muatKontak() {
  if (!kontakJanji) {
    kontakJanji = supabase
      .from('konfigurasi')
      .select('key, value')
      .in('key', ['kontak_admin_whatsapp', 'kontak_admin_email'])
      .then(({ data }) => {
        const o = {};
        (data || []).forEach((r) => {
          o[r.key] = String(r.value ?? '').trim();
        });
        kontakCache = {
          whatsapp: rapikanNomor(o.kontak_admin_whatsapp) || WHATSAPP_ENV,
          email: o.kontak_admin_email || EMAIL_ENV,
        };
        return kontakCache;
      })
      .catch(() => {
        kontakCache = { whatsapp: WHATSAPP_ENV, email: EMAIL_ENV };
        return kontakCache;
      });
  }
  return kontakJanji;
}

function useKontakAdmin(aktif) {
  const [kontak, setKontak] = useState(kontakCache);
  useEffect(() => {
    if (!aktif || kontak) return undefined;
    let batal = false;
    muatKontak().then((k) => {
      if (!batal) setKontak(k);
    });
    return () => {
      batal = true;
    };
  }, [aktif, kontak]);
  return kontak;
}

const ISI = {
  password: {
    judul: 'Lupa password?',
    teks: 'Password direset oleh admin. Hubungi admin dan sebutkan email akun Anda, lalu admin akan memberikan password baru. Setelah masuk, segera simpan password baru Anda.',
    subjek: 'Reset password akun Sigap (Presensi dan Monitoring PKL)',
    pesan: (email) =>
      `Halo Admin, saya lupa password akun Sigap (Presensi dan Monitoring PKL).${email ? ` Email akun saya: ${email}.` : ''} Mohon bantuan untuk mereset password saya. Terima kasih.`,
  },
  akun: {
    judul: 'Belum punya akun?',
    teks: 'Akun dibuat oleh admin. Hubungi admin dan sebutkan nama lengkap, jenis peserta (siswa/mahasiswa), asal instansi, dan email aktif Anda.',
    subjek: 'Permintaan akun Sigap (Presensi dan Monitoring PKL)',
    pesan: () =>
      'Halo Admin, saya ingin meminta akun Sigap (Presensi dan Monitoring PKL).\nNama lengkap: \nJenis peserta (siswa/mahasiswa): \nAsal instansi: \nEmail aktif: ',
  },
};

export default function ContactAdminModal({ jenis, email, onClose }) {
  const kontak = useKontakAdmin(Boolean(jenis));
  if (!jenis || !ISI[jenis]) return null;
  const isi = ISI[jenis];
  const pesan = isi.pesan((email || '').trim());
  const memuat = !kontak;
  const WHATSAPP = kontak?.whatsapp || '';
  const EMAIL = kontak?.email || '';
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
          {memuat && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">Memuat kontak admin...</p>
          )}
          {!memuat && !adaKontak && (
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