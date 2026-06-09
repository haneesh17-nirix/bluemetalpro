'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, FileText,
  BarChart3, Wrench, DollarSign, Mountain, Settings, LogOut,
  Scale, Camera, ChevronRight, Factory,
} from 'lucide-react';

const nav = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','sales_operator','report_viewer','accounts','quarry_operator'] },
  { href: '/sales',       label: 'Sales',         icon: ShoppingCart,    roles: ['admin','sales_operator','accounts'] },
  { href: '/purchases',   label: 'Purchases',     icon: Package,         roles: ['admin','accounts'] },
  { href: '/quarry',      label: 'Quarry',        icon: Mountain,        roles: ['admin','quarry_operator','accounts'] },
  { href: '/weighbridge', label: 'Weighbridge',   icon: Scale,           roles: ['admin','sales_operator','accounts','quarry_operator'] },
  { href: '/parties',     label: 'Parties',       icon: Users,           roles: ['admin','sales_operator','accounts'] },
  { href: '/vehicles',    label: 'Vehicles',      icon: Truck,           roles: ['admin','vehicle_manager','sales_operator'] },
  { href: '/ledger',      label: 'Ledger',        icon: DollarSign,      roles: ['admin','accounts'] },
  { href: '/reports',     label: 'Reports',       icon: BarChart3,       roles: ['admin','report_viewer','accounts'] },
  { href: '/cameras',     label: 'Live Cameras',  icon: Camera,          roles: ['admin','vehicle_manager'] },
  { href: '/maintenance', label: 'Maintenance',   icon: Wrench,          roles: ['admin','vehicle_manager'] },
  { href: '/wages',       label: 'Wages',         icon: FileText,        roles: ['admin','accounts'] },
  { href: '/users',       label: 'Users',         icon: Users,           roles: ['admin'] },
  { href: '/crushers',    label: 'Crushers',      icon: Factory,         roles: ['admin'] },
  { href: '/settings',    label: 'Settings',      icon: Settings,        roles: ['admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  sales_operator: 'Sales Operator',
  accounts: 'Accounts',
  report_viewer: 'Report Viewer',
  vehicle_manager: 'Vehicle Manager',
  quarry_operator: 'Quarry Operator',
};

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

  // Initials for avatar fallback
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BM';

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 flex-shrink-0"
      style={{ background: 'linear-gradient(180deg, #0a1e3d 0%, #0e2544 100%)', borderRight: '1px solid #1e4270' }}>

      {/* ── Logo ── */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #1e4270' }}>
        <Image src="/logo-icon.png" alt="BlueMetal Pro" width={40} height={40}
          className="rounded-xl flex-shrink-0" unoptimized />
        <div className="min-w-0">
          <p className="font-bold text-sm text-white truncate">BlueMetal Pro</p>
          <p className="text-[10px] font-medium mt-0.5 truncate"
            style={{ background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Quarry ERP
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {filtered.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative
                ${active
                  ? 'text-white font-medium'
                  : 'text-white/55 hover:text-white hover:bg-white/6'
                }`}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.06))',
                border: '1px solid rgba(201,168,76,0.2)',
              } : {}}>
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #e8c96a, #c9a84c)' }} />
              )}
              <item.icon size={17} className={active ? 'text-gold-light' : 'text-white/40 group-hover:text-white/70'} />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight size={13} className="text-gold/60" />}
            </Link>
          );
        })}
      </nav>

      {/* ── User profile ── */}
      <div className="p-3" style={{ borderTop: '1px solid #1e4270' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-brand"
            style={{ background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-white/40 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150">
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
