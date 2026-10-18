import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getTodayString } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export default function PresensiManual() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: getTodayString(),
    jenis: 'masuk',
    alasan: '',
    bukti_file: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let buktiUrl = null;

      // Upload file jika ada
      if (formData.bukti_file) {
        const fileExt = formData.bukti_file.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('bukti-presensi') // Pastikan bucket ini sudah dibuat di Supabase Storage
          .upload(filePath, formData.bukti_file);
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('bukti-presensi')
          .getPublicUrl(filePath);
          
        buktiUrl = publicUrl;
      }

      // Insert data presensi
      const { error } = await supabase.from('presensi').insert([
        {
          user_id: profile.id,
          tanggal: formData.tanggal,
          jenis: formData.jenis,
          metode: 'manual',
          alasan: formData.alasan,
          bukti_file: buktiUrl,
          status: 'hadir', // Bisa diubah jadi 'menunggu' jika butuh approval
        },
      ]);

      if (error) throw error;

      toast.success('Presensi manual berhasil dikirim!');
      navigate('/riwayat-presensi');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim presensi manual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Presensi Manual</h1>
      </header>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tanggal */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Tanggal</label>
            <input
              type="date"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              className="input-field"
              required
            />
          </div>

          {/* Jenis Presensi */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Jenis Presensi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jenis: 'masuk' })}
                className={`py-3 rounded-xl font-semibold transition-colors ${
                  formData.jenis === 'masuk' ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jenis: 'pulang' })}
                className={`py-3 rounded-xl font-semibold transition-colors ${
                  formData.jenis === 'pulang' ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                Pulang
              </button>
            </div>
          </div>

          {/* Alasan */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Alasan Presensi Manual</label>
            <textarea
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
              className="input-field min-h-[120px] resize-none"
              placeholder="Jelaskan alasan Anda melakukan presensi manual..."
              required
            />
          </div>

          {/* Upload Bukti */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Upload Bukti (Opsional)</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">
                  {formData.bukti_file ? formData.bukti_file.name : 'Klik untuk upload file'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG atau PDF (MAX. 5MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={(e) => setFormData({ ...formData, bukti_file: e.target.files[0] })} 
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim Presensi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}