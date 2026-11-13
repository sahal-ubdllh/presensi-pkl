import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Search,
  UserPlus,
  X,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Copy,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import PageShell, { RingkasanAngka } from "../components/PageShell";
import { FONT, TINTA, WARNA, INPUT_CLS } from "../utils/tema";

// Panggil Edge Function admin-users dan ambil pesan error yang jelas
const callAdminUsers = async (body) => {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* abaikan */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export default function ManageUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Reset password oleh admin
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("peserta"); // Tab: peserta | pembimbing

  // State form tambah user
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    nama_lengkap: "",
    jenis_peserta: "Mahasiswa",
    asal_instansi: "",
    role: "peserta",
  });

  // Fetch users berdasarkan tab yang aktif
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", activeTab === "peserta" ? "peserta" : "pembimbing")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error(err);
        toast.error(`Gagal memuat daftar ${activeTab}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Akun dibuat di server (Edge Function), sesi admin tidak tertimpa
      await callAdminUsers({ action: "create", ...newUser });

      toast.success(
        `${newUser.role === "pembimbing" ? "Pembimbing" : "Peserta"} berhasil ditambahkan!`,
      );
      setShowModal(false);
      setNewUser({
        email: "",
        password: "",
        nama_lengkap: "",
        jenis_peserta: "Mahasiswa",
        asal_instansi: "",
        role: activeTab === "peserta" ? "peserta" : "pembimbing",
      });

      // Refresh list setelah delay singkat agar trigger DB selesai
      setTimeout(() => {
        const fetchUsers = async () => {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("role", activeTab === "peserta" ? "peserta" : "pembimbing");
          setUsers(data || []);
        };
        fetchUsers();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menambahkan user");
    } finally {
      setLoading(false);
    }
  };

  const passwordAcak = () => {
    const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const acak = new Uint32Array(10);
    crypto.getRandomValues(acak);
    return Array.from(acak, (n) => abjad[n % abjad.length]).join("");
  };

  const bukaReset = (user) => {
    setResetTarget(user);
    setResetPw(passwordAcak());
    setResetDone(false);
  };

  const tutupReset = () => {
    setResetTarget(null);
    setResetPw("");
    setResetDone(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPw.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setResetting(true);
    try {
      await callAdminUsers({
        action: "reset_password",
        id: resetTarget.id,
        password: resetPw,
      });
      setResetDone(true);
      toast.success("Password berhasil diubah");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal mengubah password");
    } finally {
      setResetting(false);
    }
  };

  const salinPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPw);
      toast.success("Password disalin");
    } catch {
      toast.error("Tidak bisa menyalin, salin manual");
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (
      !window.confirm(
        `Yakin ingin menonaktifkan ${email}? Akun ini tidak akan bisa login lagi.`,
      )
    )
      return;

    try {
      // Nonaktifkan di server: akun diblokir login + ditandai deleted
      await callAdminUsers({ action: "deactivate", id });

      toast.success("User berhasil dinonaktifkan");
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menonaktifkan user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const peranTab = activeTab === "peserta" ? "Peserta" : "Pembimbing";

  const bukaTambah = () => {
    setNewUser((prev) => ({
      ...prev,
      role: activeTab === "peserta" ? "peserta" : "pembimbing",
    }));
    setShowModal(true);
  };

  const labelCls = "mb-1.5 block text-sm font-semibold";
  const overlayCls =
    "fixed inset-0 z-50 flex items-end justify-center bg-[#14213d]/50 p-4 backdrop-blur-sm sm:items-center";
  const panelCls =
    "relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-[#14213d]";
  const tutupCls =
    "absolute right-4 top-4 rounded p-1 text-[#14213d]/50 hover:bg-[#14213d]/10 hover:text-[#14213d]";

  return (
    <>
      <PageShell
        onBack={() => navigate(-1)}
        aksi={
          <button
            onClick={bukaTambah}
            className="flex items-center gap-1.5 rounded-lg bg-[#1d4ed8] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1e40af]"
          >
            <UserPlus className="h-4 w-4" />
            Tambah akun
          </button>
        }
        judul="Kelola pengguna"
        deskripsi="Tambah, lihat, dan nonaktifkan akun peserta dan pembimbing."
        samping={<RingkasanAngka data={[[peranTab, users.length]]} memuat={loading} />}
        lebar="lg:max-w-xl"
      >
        <div className="space-y-4">
          {/* Tab */}
          <div className="grid grid-cols-2 rounded-lg border border-[#14213d]/15 bg-white p-1">
            {["peserta", "pembimbing"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm("");
                }}
                className={`h-9 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[#14213d] text-white"
                    : "text-[#14213d]/70 hover:bg-[#f3efe6]"
                }`}
              >
                {tab === "peserta" ? "Peserta" : "Pembimbing"}
              </button>
            ))}
          </div>

          {/* Cari */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14213d]/40" />
            <input
              type="text"
              placeholder={`Cari ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${INPUT_CLS} h-11 pl-10 text-sm`}
            />
          </div>

          {/* Daftar */}
          {loading ? (
            <div className="flex justify-center rounded-xl border border-[#14213d]/10 bg-white py-14">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2b4c7e] border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#14213d]/25 px-6 py-12 text-center text-sm text-[#14213d]/65">
              Tidak ada data ditemukan.
            </div>
          ) : (
            <ul className="divide-y divide-[#14213d]/10 overflow-hidden rounded-xl border border-[#14213d]/10 bg-white lg:border-[#14213d]/20">
              {filteredUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#14213d]/[0.07] text-sm font-semibold">
                    {user.nama_lengkap?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{user.nama_lengkap}</p>
                      {user.role === "pembimbing" && (
                        <ShieldCheck size={14} className="shrink-0 text-[#2b4c7e]" />
                      )}
                    </div>
                    <p className="truncate text-xs text-[#14213d]/60">{user.email}</p>
                    {(user.jenis_peserta || user.asal_instansi) && (
                      <p className="mt-0.5 truncate text-[11px] text-[#14213d]/45">
                        {[user.jenis_peserta, user.asal_instansi].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => bukaReset(user)}
                      className="rounded-lg p-2 text-[#14213d]/60 transition-colors hover:bg-[#14213d]/10 hover:text-[#14213d]"
                      title="Reset password"
                      aria-label="Reset password"
                    >
                      <KeyRound className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="rounded-lg p-2 transition-colors hover:bg-[#a63d2f]/10"
                      style={{ color: WARNA.merah }}
                      title="Nonaktifkan akun"
                      aria-label="Nonaktifkan akun"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageShell>

      {/* Modal reset password */}
      {resetTarget && (
        <div className={overlayCls} style={{ ...FONT, color: TINTA }}>
          <div className={panelCls}>
            <button onClick={tutupReset} className={tutupCls} aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold tracking-tight">Reset password</h2>
            <p className="mb-5 mt-1 break-all text-sm text-[#14213d]/65">
              {resetTarget.nama_lengkap}
              <br />
              <span className="text-xs">{resetTarget.email}</span>
            </p>

            {resetDone ? (
              <div className="space-y-4">
                <p
                  className="rounded-lg p-3 text-sm leading-relaxed"
                  style={{ color: WARNA.hijau, backgroundColor: `${WARNA.hijau}14` }}
                >
                  Password berhasil diubah. Berikan password ini kepada pengguna, lalu minta
                  mereka menyimpannya. Password tidak akan ditampilkan lagi.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-[#f3efe6] px-4 py-3 font-mono text-base tracking-wide">
                    {resetPw}
                  </code>
                  <button
                    type="button"
                    onClick={salinPassword}
                    className="rounded-lg bg-[#f3efe6] p-3 hover:bg-[#ebe5d6]"
                    aria-label="Salin password"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={tutupReset}
                  className="h-11 w-full rounded-lg bg-[#1d4ed8] font-semibold text-white hover:bg-[#1e40af]"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="pw-baru" className={labelCls}>
                    Password baru
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="pw-baru"
                      type="text"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="off"
                      className={`${INPUT_CLS} h-11 flex-1 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setResetPw(passwordAcak())}
                      className="rounded-lg bg-[#f3efe6] p-3 hover:bg-[#ebe5d6]"
                      title="Buat acak"
                      aria-label="Buat password acak"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#14213d]/55">
                    Minimal 6 karakter. Pengguna yang sedang login tidak otomatis keluar.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={resetting}
                  className="h-11 w-full rounded-lg bg-[#1d4ed8] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
                >
                  {resetting ? "Menyimpan..." : "Simpan password baru"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal tambah user */}
      {showModal && (
        <div className={overlayCls} style={{ ...FONT, color: TINTA }}>
          <div className={panelCls}>
            <button onClick={() => setShowModal(false)} className={tutupCls} aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-5 text-lg font-bold tracking-tight">
              Tambah {activeTab === "peserta" ? "peserta baru" : "pembimbing baru"}
            </h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="u-email" className={labelCls}>Email</label>
                <input
                  id="u-email"
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className={`${INPUT_CLS} h-11`}
                />
              </div>
              <div>
                <label htmlFor="u-pw" className={labelCls}>Password default</label>
                <input
                  id="u-pw"
                  required
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className={`${INPUT_CLS} h-11`}
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div>
                <label htmlFor="u-nama" className={labelCls}>Nama lengkap</label>
                <input
                  id="u-nama"
                  required
                  type="text"
                  value={newUser.nama_lengkap}
                  onChange={(e) => setNewUser({ ...newUser, nama_lengkap: e.target.value })}
                  className={`${INPUT_CLS} h-11`}
                />
              </div>

              <div>
                <label htmlFor="u-role" className={labelCls}>Role akun</label>
                <select
                  id="u-role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className={`${INPUT_CLS} h-11`}
                >
                  <option value="peserta">Peserta PKL</option>
                  <option value="pembimbing">Pembimbing Lapangan</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Isian khusus peserta */}
              {newUser.role === "peserta" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="u-jenis" className={labelCls}>Jenis</label>
                    <select
                      id="u-jenis"
                      value={newUser.jenis_peserta}
                      onChange={(e) => setNewUser({ ...newUser, jenis_peserta: e.target.value })}
                      className={`${INPUT_CLS} h-11`}
                    >
                      <option value="Mahasiswa">Mahasiswa (D3/S1)</option>
                      <option value="Siswa">Siswa (SMK/SMA)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="u-inst" className={labelCls}>Instansi</label>
                    <input
                      id="u-inst"
                      required
                      type="text"
                      value={newUser.asal_instansi}
                      onChange={(e) => setNewUser({ ...newUser, asal_instansi: e.target.value })}
                      className={`${INPUT_CLS} h-11`}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-lg bg-[#1d4ed8] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
              >
                {loading ? "Memproses..." : "Simpan akun"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
