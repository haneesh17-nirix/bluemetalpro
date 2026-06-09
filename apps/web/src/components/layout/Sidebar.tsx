'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, FileText,
  BarChart3, Wrench, DollarSign, Mountain, Settings, LogOut, Bell,
  Scale, Camera
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales_operator', 'report_viewer', 'accounts', 'quarry_operator'] },
  { href: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['admin', 'sales_operator', 'accounts'] },
  { href: '/purchases', label: 'Purchases', icon: Package, roles: ['admin', 'accounts'] },
  { href: '/quarry', label: 'Quarry', icon: Mountain, roles: ['admin', 'quarry_operator', 'accounts'] },
  { href: '/weighbridge', label: 'Weighbridge', icon: Scale, roles: ['admin', 'sales_operator', 'accounts', 'quarry_operator'] },
  { href: '/parties', label: 'Parties', icon: Users, roles: ['admin', 'sales_operator', 'accounts'] },
  { href: '/vehicles', label: 'Vehicles', icon: Truck, roles: ['admin', 'vehicle_manager', 'sales_operator'] },
  { href: '/ledger', label: 'Ledger', icon: DollarSign, roles: ['admin', 'accounts'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'report_viewer', 'accounts'] },
  { href: '/cameras', label: 'Live Cameras', icon: Camera, roles: ['admin', 'vehicle_manager'] },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'vehicle_manager'] },
  { href: '/wages', label: 'Wages', icon: FileText, roles: ['admin', 'accounts'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;

  const filtered = nav.filter(item => !user || item.roles.includes(user.role));

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-[#1a3c5e] text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-[#1a3c5e] font-bold text-sm">SC</span>
          </div>
          <div>
            <p className="font-bold text-sm">BlueMetal Pro</p>
            <p className="text-xs text-white/60 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {filtered.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                active ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}>
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-white/60 mb-1">{user?.name}</div>
        <div className="text-xs text-white/40 mb-3">{user?.email}</div>
        <button onClick={logout} className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
