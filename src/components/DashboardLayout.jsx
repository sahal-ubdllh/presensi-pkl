import BottomNav from './BottomNav';

export default function DashboardLayout({ children, className = 'bg-slate-50' }) {
  return (
    <div className={`min-h-screen ${className} pb-24`}>
      {children}
      <BottomNav />
    </div>
  );
}