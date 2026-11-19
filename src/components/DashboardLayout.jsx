import BottomNav from './BottomNav';

export default function DashboardLayout({ children, className = 'bg-[#f6fbff]' }) {
  return (
    <div className={`min-h-screen ${className} pb-24`}>
      {children}
      <BottomNav />
    </div>
  );
}