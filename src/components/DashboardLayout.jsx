import BottomNav from './BottomNav';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {children}
      <BottomNav />
    </div>
  );
}