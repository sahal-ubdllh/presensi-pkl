import { MEREK } from "../utils/merek";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "@fontsource-variable/public-sans";
import { useAuth } from "../context/AuthContext";
import ContactAdminModal from "../components/ContactAdminModal";
import { FONT, TINTA, LATAR_KONTUR, PITA_LOGO } from "../utils/tema";
import { Eye, EyeOff } from "lucide-react";

// Latar & teks lencana nomor: biru, hijau, kuning (selaras fungsi: presensi, logbook, tinjauan)
const SOFT_LANGKAH = [
  ["#e0f2fe", "#0369a1"],
  ["#dcfce7", "#2e7d32"],
  ["#fef9c3", "#a16207"],
];

const LANGKAH = [
  ["01", "Presensi di area kantor"],
  ["02", "Isi logbook harian"],
  ["03", "Ditinjau oleh pembimbing"],
];

// Pesan dari Supabase berbahasa Inggris dan bisa membocorkan teknis,
// jadi diterjemahkan. Sengaja tidak membedakan "email salah" dan "password
// salah" agar orang luar tidak bisa menebak email yang terdaftar.
function pesanLogin(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Email atau password salah";
  if (msg.includes("email not confirmed")) return "Email belum dikonfirmasi. Hubungi admin.";
  if (msg.includes("banned") || msg.includes("not allowed")) return "Akun tidak dapat digunakan. Hubungi admin.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "Tidak bisa terhubung ke server. Periksa koneksi internet.";
  return "Email atau password salah";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const [remember, setRemember] = useState(true);
  const [kontak, setKontak] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password, remember);
      toast.success("Selamat datang kembali!");
      navigate("/");
    } catch (error) {
      toast.error(pesanLogin(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-white lg:grid lg:grid-cols-[1.08fr_1fr]"
      style={{ ...FONT, color: TINTA }}
    >
      {/* ── Sisi merek: pita di atas (mobile) / panel kiri penuh (desktop) ── */}
      <aside
        className="relative flex flex-col px-6 pb-7 pt-8 sm:px-10 lg:min-h-screen lg:justify-between lg:px-14 lg:py-12 xl:px-20"
        style={LATAR_KONTUR}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundImage: PITA_LOGO }} />
        <div className="mx-auto w-full max-w-[22rem] lg:mx-0 lg:max-w-none">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-kartu ring-1 ring-primary-100 lg:h-20 lg:w-20">
              <img
                src="/logo-dinsos.png"
                alt="Logo Dinas Sosial"
                className="h-14 w-auto lg:h-[4.5rem]"
              />
            </span>
            <div className="text-sm leading-snug lg:text-[15px]">
              <p className="font-semibold">Dinas Sosial</p>
              <p className="text-[#0c2d48]/70">Kabupaten Majalengka</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[22rem] lg:mx-0 lg:mt-0 lg:max-w-xl">
          <h1 className="text-5xl font-extrabold leading-none tracking-tight text-[#0c2d48] sm:text-6xl lg:text-7xl">
            {MEREK.nama}
          </h1>
          <p className="mt-2 text-lg font-semibold text-primary-700 lg:text-xl">
            {MEREK.keterangan}
          </p>
          <p className="mt-4 hidden max-w-md text-base leading-relaxed text-[#0c2d48]/75 lg:block">
            Catat kehadiran dan logbook harian peserta praktik kerja lapangan,
            ditinjau langsung oleh pembimbing.
          </p>

          <ol className="mt-10 hidden max-w-sm space-y-2.5 lg:block">
            {LANGKAH.map(([no, teks], i) => (
              <li key={no} className="flex items-center gap-4 rounded-2xl bg-white/85 px-4 py-3 shadow-kartu ring-1 ring-primary-100 backdrop-blur">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums"
                  style={{ backgroundColor: SOFT_LANGKAH[i][0], color: SOFT_LANGKAH[i][1] }}
                >
                  {no}
                </span>
                <span className="text-[15px] font-medium">{teks}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-[#0c2d48]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      {/* ── Sisi formulir ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-[22rem]">
          <h2 className="text-2xl font-bold tracking-tight">Masuk ke {MEREK.nama}</h2>
          <p className="mt-1.5 text-[15px] text-slate-600">
            Gunakan email dan password dari admin.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/15"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setKontak("password")}
                  className="text-sm text-primary-700 underline-offset-2 hover:underline focus-visible:underline"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/15"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3.5 text-slate-400 transition-colors hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={20} strokeWidth={1.8} />
                  ) : (
                    <Eye size={20} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            <label
              htmlFor="remember"
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0369a1]"
              />
              Ingat saya di perangkat ini
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-700 font-semibold text-white shadow-[0_6px_16px_rgba(3,105,161,0.28)] transition-all hover:bg-primary-600 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memproses
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
            Belum punya akun?{" "}
            <button
              type="button"
              onClick={() => setKontak("akun")}
              className="font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:underline"
            >
              Hubungi admin
            </button>
          </p>
        </div>
      </main>

      <ContactAdminModal
        jenis={kontak}
        email={email}
        onClose={() => setKontak(null)}
      />
    </div>
  );
}