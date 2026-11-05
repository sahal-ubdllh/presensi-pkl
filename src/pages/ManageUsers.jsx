/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
        `Yakin ingin menghapus ${email}? Data tidak bisa dikembalikan.`,
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            Kelola Pengguna
          </h1>
        </div>
        <button
          onClick={() => {
            setNewUser((prev) => ({
              ...prev,
              role: activeTab === "peserta" ? "peserta" : "pembimbing",
            }));
            setShowModal(true);
          }}
          className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </header>

      <div className="p-5 space-y-4">
        {/* Tabs Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setActiveTab("peserta");
              setSearchTerm("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "peserta" ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Daftar Peserta
          </button>
          <button
            onClick={() => {
              setActiveTab("pembimbing");
              setSearchTerm("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "pembimbing" ? "bg-primary-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Daftar Pembimbing
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* List Users */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            Tidak ada data ditemukan.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {user.nama_lengkap}
                    </h3>
                    {user.role === "pembimbing" && (
                      <ShieldCheck size={14} className="text-primary-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {user.email}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {user.jenis_peserta} • {user.asal_instansi}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => bukaReset(user)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Reset password"
                    aria-label="Reset password"
                  >
                    <KeyRound className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Nonaktifkan akun"
                    aria-label="Nonaktifkan akun"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={tutupReset}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Tutup"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Reset Password</h2>
            <p className="text-sm text-slate-500 mb-4 break-all">
              {resetTarget.nama_lengkap}
              <br />
              <span className="text-xs">{resetTarget.email}</span>
            </p>

            {resetDone ? (
              <div className="space-y-4">
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
                  Password berhasil diubah. Berikan password ini kepada pengguna,
                  lalu minta mereka menyimpannya. Password tidak akan ditampilkan lagi.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base font-mono tracking-wide">
                    {resetPw}
                  </code>
                  <button
                    type="button"
                    onClick={salinPassword}
                    className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"
                    aria-label="Salin password"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={tutupReset}
                  className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl hover:bg-primary-700"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Password baru
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="off"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setResetPw(passwordAcak())}
                      className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"
                      title="Buat acak"
                      aria-label="Buat password acak"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Minimal 6 karakter. Pengguna lama yang sedang login tidak otomatis keluar.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={resetting}
                  className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl hover:bg-primary-700 disabled:opacity-60"
                >
                  {resetting ? "Menyimpan..." : "Simpan Password Baru"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah User */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Tambah{" "}
              {activeTab === "peserta" ? "Peserta Baru" : "Pembimbing Baru"}
            </h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Password Default
                </label>
                <input
                  required
                  type="text"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="input-field"
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  type="text"
                  value={newUser.nama_lengkap}
                  onChange={(e) =>
                    setNewUser({ ...newUser, nama_lengkap: e.target.value })
                  }
                  className="input-field"
                />
              </div>

              {/* Dropdown Role Dinamis */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Role Akun
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="peserta">Peserta PKL</option>
                  <option value="pembimbing">Pembimbing Lapangan</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Field khusus Peserta — sembunyikan jika role bukan peserta */}
              {newUser.role === "peserta" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Jenis
                    </label>
                    <select
                      value={newUser.jenis_peserta}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          jenis_peserta: e.target.value,
                        })
                      }
                      className="input-field"
                    >
                      <option value="Mahasiswa">Mahasiswa (D3/S1)</option>
                      <option value="Siswa">Siswa (SMK/SMA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Instansi
                    </label>
                    <input
                      required
                      type="text"
                      value={newUser.asal_instansi}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          asal_instansi: e.target.value,
                        })
                      }
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? "Memproses..." : "Simpan Akun"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
