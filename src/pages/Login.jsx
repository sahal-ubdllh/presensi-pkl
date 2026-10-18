import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Selamat datang kembali!');
      navigate('/'); 
    } catch (error) {
      toast.error(error.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white">
      {/* Top Section: Branding & Logo */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-6">
        {/* Logo Icon */}
        <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Building2 className="w-10 h-10 text-primary-600" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 text-center leading-tight">
          Sistem Presensi &<br />Monitoring PKL
        </h1>
        <p className="text-slate-500 mt-2 text-center text-sm">
          Dinas Sosial Kabupaten Majalengka
        </p>
      </div>

      {/* Bottom Section: Form Card */}
      <div className="bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="remember" 
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
            />
            <label htmlFor="remember" className="text-sm text-slate-600">Ingat saya di perangkat ini</label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-4"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Belum punya akun?{' '}
            <button className="text-primary-600 font-semibold hover:text-primary-700">
              Hubungi Admin
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}