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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/" || path === "/dashboard-pembimbing" || path === "/dashboard-admin"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors min-w-0 ${
                isActive
                  ? "text-primary-600"
                  : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`}
                />
                <span
                  className={`text-[10px] font-medium truncate ${isActive ? "text-primary-600" : ""}`}
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