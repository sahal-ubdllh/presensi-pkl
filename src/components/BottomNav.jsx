import { NavLink } from "react-router-dom";
import { Home, MapPin, FileText, User, LayoutDashboard, Users, BarChart3 } from "lucide-react"; // Tambahkan icon Users
import { useAuth } from "../context/AuthContext";

export default function BottomNav() {
  const { profile } = useAuth();
  
  // Cek role user
  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isPembimbing = role === 'pembimbing';

  // Menu Khusus ADMIN (Review + Manage Users + Profil)
  const adminNavItems = [
    { path: "/dashboard-admin", icon: Home, label: "Beranda" },
    { path: "/dashboard-pembimbing", icon: LayoutDashboard, label: "Review" },
    { path: "/statistik-peserta", icon: BarChart3, label: "Statistik" },
    { path: "/manage-users", icon: Users, label: "Pengguna" }, // Hanya admin
    { path: "/profil", icon: User, label: "Profil" },
  ];

  // Menu Khusus PEMBIMBING (Review + Profil)
  const pembimbingNavItems = [
    { path: "/dashboard-pembimbing", icon: LayoutDashboard, label: "Review" },
    { path: "/statistik-peserta", icon: BarChart3, label: "Statistik" },
    { path: "/profil", icon: User, label: "Profil" },
  ];

  // Menu Peserta Biasa
  const userNavItems = [
    { path: "/", icon: Home, label: "Beranda" },
    { path: "/presensi", icon: MapPin, label: "Presensi" },
    { path: "/kegiatan", icon: FileText, label: "Kegiatan" },
    { path: "/profil", icon: User, label: "Profil" },
  ];

  // Tentukan menu mana yang ditampilkan
  let navItems = userNavItems;
  if (isAdmin) navItems = adminNavItems;
  else if (isPembimbing) navItems = pembimbingNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(12,45,72,0.06)] backdrop-blur">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/" || path === "/dashboard-pembimbing" || path === "/dashboard-admin"}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-0.5 px-1 py-1 transition-colors ${
                isActive ? "text-primary-700" : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-primary-100" : ""
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.4px]" : ""}`} />
                </span>
                <span
                  className={`truncate text-[10px] ${isActive ? "font-bold text-primary-700" : "font-medium"}`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}