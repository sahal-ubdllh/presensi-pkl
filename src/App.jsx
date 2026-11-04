import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Presensi from "./pages/Presensi";
import PresensiManual from "./pages/PresensiManual";
import RiwayatPresensi from "./pages/RiwayatPresensi";
import Kegiatan from "./pages/Kegiatan";
import LogbookKegiatan from "./pages/LogbookKegiatan";
import DraftKegiatan from "./pages/DraftKegiatan";
import RiwayatKegiatan from "./pages/RiwayatKegiatan";
import DetailKegiatan from "./pages/DetailKegiatan";
import Profil from "./pages/Profil";
import EditProfil from "./pages/EditProfil";
import Pengumuman from "./pages/Pengumuman";
import DashboardPembimbing from "./pages/DashboardPembimbing";
import ManageUsers from "./pages/ManageUsers";
import StatistikPeserta from "./pages/StatistikPeserta";
import DashboardAdmin from "./pages/DashboardAdmin";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Route yang hanya boleh diakses jika role cocok
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Memuat...
      </div>
    );

  if (!profile || !allowedRoles.includes(profile.role)) {
    toast.error("Akses ditolak. Anda tidak memiliki izin.");
    // Redirect ke home yang sesuai role
    const roleHome =
      profile?.role === "admin"
        ? "/dashboard-admin"
        : profile?.role === "pembimbing"
          ? "/dashboard-pembimbing"
          : "/login";
    return <Navigate to={roleHome} replace />;
  }
  return children;
};

// Redirect halaman utama berdasarkan role
const HomeRedirect = () => {
  const { profile, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Memuat...
      </div>
    );

  if (!profile) return <Navigate to="/login" replace />;

  if (profile.role === "admin")
    return <Navigate to="/dashboard-admin" replace />;
  if (profile.role === "pembimbing")
    return <Navigate to="/dashboard-pembimbing" replace />;

  // Peserta → tampilkan Dashboard biasa
  return <Dashboard />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Halaman utama — redirect otomatis berdasarkan role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      {/* Route khusus PESERTA */}
      <Route
        path="/presensi"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <Presensi />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/presensi-manual"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <PresensiManual />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/riwayat-presensi"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <RiwayatPresensi />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/kegiatan"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <Kegiatan />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/logbook"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <LogbookKegiatan />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/draft-kegiatan"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <DraftKegiatan />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/riwayat-kegiatan"
        element={
          <RoleProtectedRoute allowedRoles={["peserta"]}>
            <RiwayatKegiatan />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/kegiatan/:id"
        element={
          <ProtectedRoute>
            <DetailKegiatan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <ProtectedRoute>
            <Profil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-profil"
        element={
          <ProtectedRoute>
            <EditProfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pengumuman"
        element={
          <ProtectedRoute>
            <Pengumuman />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-pembimbing"
        element={
          <RoleProtectedRoute allowedRoles={["pembimbing", "admin"]}>
            <DashboardPembimbing />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/dashboard-admin"
        element={
          <RoleProtectedRoute allowedRoles={["admin"]}>
            <DashboardAdmin />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/statistik-peserta"
        element={
          <RoleProtectedRoute allowedRoles={["pembimbing", "admin"]}>
            <StatistikPeserta />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/manage-users"
        element={
          <RoleProtectedRoute allowedRoles={["admin"]}>
            <ManageUsers />
          </RoleProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: "10px", background: "#333", color: "#fff" },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
