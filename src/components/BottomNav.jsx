import { NavLink } from "react-router-dom";
import { Home, MapPin, FileText, User, Megaphone } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Beranda" },
  { path: "/presensi", icon: MapPin, label: "Presensi" },
  { path: "/pengumuman", icon: Megaphone, label: "Info" },
  { path: "/kegiatan", icon: FileText, label: "Kegiatan" },
  { path: "/profil", icon: User, label: "Profil" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
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
