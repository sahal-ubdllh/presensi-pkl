import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/presensi"
        element={
          <ProtectedRoute>
            <Presensi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/presensi-manual"
        element={
          <ProtectedRoute>
            <PresensiManual />
          </ProtectedRoute>
        }
      />
      <Route
        path="/riwayat-presensi"
        element={
          <ProtectedRoute>
            <RiwayatPresensi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kegiatan"
        element={
          <ProtectedRoute>
            <Kegiatan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/logbook"
        element={
          <ProtectedRoute>
            <LogbookKegiatan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/draft-kegiatan"
        element={
          <ProtectedRoute>
            <DraftKegiatan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/riwayat-kegiatan"
        element={
          <ProtectedRoute>
            <RiwayatKegiatan />
          </ProtectedRoute>
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
