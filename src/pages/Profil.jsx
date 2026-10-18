import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, Building2, Mail, Phone, LogOut, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profil() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Konfirmasi sebelum logout
    if (!window.confirm('Apakah Anda yakin ingin keluar?')) return;
    
    try {
      await logout();
      toast.success('Berhasil keluar');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Gagal keluar');
    }
  };

  const menuItems = [
    { label: 'Nama Lengkap', value: profile?.nama_lengkap || '-', icon: User },
    { label: 'Jenis Peserta', value: profile?.jenis_peserta || '-', icon: Briefcase },
    { label: 'Asal Instansi', value: profile?.asal_instansi || '-', icon: Building2 },
    { label: 'Email', value: profile?.email || '-', icon: Mail },
    { label: 'No. Telepon', value: profile?.no_telepon || '-', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Profil Saya</h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Avatar & Nama Section */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-3 overflow-hidden border-4 border-white shadow-sm">
            {profile?.foto_profil ? (
              <img src={profile.foto_profil} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary-600">
                {profile?.nama_lengkap?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{profile?.nama_lengkap || 'Peserta PKL'}</h2>
          <p className="text-sm text-slate-500">{profile?.jenis_peserta || 'Peserta'}</p>
        </div>

        {/* Info List Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {menuItems.map((item, index) => (
            <div key={index} className={`flex items-center gap-4 p-4 ${index !== menuItems.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate('/edit-profil')}
            className="w-full bg-white text-primary-600 border border-primary-200 py-3.5 rounded-xl font-semibold hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profil
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-rose-50 text-rose-600 py-3.5 rounded-xl font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}