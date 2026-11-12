import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "@fontsource-variable/public-sans";
import { useAuth } from "../context/AuthContext";
import ContactAdminModal from "../components/ContactAdminModal";
import konturUrl from "../assets/kontur.svg";
import { Eye, EyeOff } from "lucide-react";

// Warna dan font khusus halaman ini (kertas hangat + tinta biru, mengacu pada peta topografi)
const KERTAS = "#f3efe6";
const TINTA = "#14213d";
const FONT = { fontFamily: '"Public Sans Variable", system-ui, sans-serif' };
const LATAR_KONTUR = {
  backgroundColor: KERTAS,
  backgroundImage: `url(${konturUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "right bottom",
};

const LANGKAH = [
  ["01", "Presensi di area kantor"],
  ["02", "Isi logbook harian"],
  ["03", "Ditinjau oleh pembimbing"],
];

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
      toast.error(error.message || "Email atau password salah");
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
        <div className="mx-auto w-full max-w-[22rem] lg:mx-0 lg:max-w-none">
          <div className="flex items-center gap-4">
            <img
              src="/logo-dinsos.png"
              alt="Logo Dinas Sosial"
              className="h-12 w-auto lg:h-16"
            />
            <div className="border-l border-[#14213d]/20 pl-4 text-sm leading-snug lg:text-[15px]">
              <p className="font-semibold">Dinas Sosial</p>
              <p className="text-[#14213d]/70">Kabupaten Majalengka</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[22rem] lg:mx-0 lg:mt-0 lg:max-w-xl">
          <h1 className="text-[26px] font-bold leading-[1.12] tracking-tight sm:text-3xl lg:text-5xl">
            Presensi dan
            <br />
            Monitoring PKL
          </h1>
          <p className="mt-3 hidden max-w-md text-base leading-relaxed text-[#14213d]/75 lg:block">
            Catat kehadiran dan logbook harian peserta praktik kerja lapangan,
            ditinjau langsung oleh pembimbing.
          </p>

          <ol className="mt-10 hidden max-w-sm divide-y divide-[#14213d]/10 border-y border-[#14213d]/10 lg:block">
            {LANGKAH.map(([no, teks]) => (
              <li key={no} className="flex items-baseline gap-5 py-3">
                <span className="font-mono text-xs tabular-nums text-[#2b4c7e]">
                  {no}
                </span>
                <span className="text-[15px]">{teks}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-[#14213d]/55 lg:block">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten Majalengka
        </p>
      </aside>

      {/* ── Sisi formulir ── */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-[22rem]">
          <h2 className="text-2xl font-bold tracking-tight">Masuk</h2>
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
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20"
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
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-12 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20"
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
                className="h-4 w-4 rounded border-slate-300 accent-[#1d4ed8]"
              />
              Ingat saya di perangkat ini
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-700 font-semibold text-white transition-colors hover:bg-primary-600 active:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
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
