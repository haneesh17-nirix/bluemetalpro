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
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','sales_operator','report_viewer','accounts','quarry_operator','partner'] },
  { href: '/sales',       label: 'Sales',         icon: ShoppingCart,    roles: ['admin','sales_operator','accounts','partner'] },
  { href: '/purchases',   label: 'Purchases',     icon: Package,         roles: ['admin','accounts','partner'] },
  { href: '/quarry',      label: 'Quarry',        icon: Mountain,        roles: ['admin','quarry_operator','accounts'] },
  { href: '/weighbridge', label: 'Weighbridge',   icon: Scale,           roles: ['admin','sales_operator','accounts','quarry_operator'] },
  { href: '/parties',     label: 'Parties',       icon: Users,           roles: ['admin','sales_operator','accounts'] },
  { href: '/vehicles',    label: 'Vehicles',      icon: Truck,           roles: ['admin','vehicle_manager','sales_operator'] },
  { href: '/ledger',      label: 'Ledger',        icon: DollarSign,      roles: ['admin','accounts','partner'] },
  { href: '/reports',     label: 'Reports',       icon: BarChart3,       roles: ['admin','report_viewer','accounts','partner'] },
  { href: '/cameras',     label: 'Live Cameras',  icon: Camera,          roles: ['admin','vehicle_manager'] },
  { href: '/maintenance', label: 'Maintenance',   icon: Wrench,          roles: ['admin','vehicle_manager'] },
  { href: '/wages',       label: 'Wages',         icon: FileText,        roles: ['admin','accounts'] },
  { href: '/users',       label: 'Users',         icon: Users,           roles: ['admin'] },
  { href: '/crushers',    label: 'Crushers',      icon: Factory,         roles: ['admin'] },
  { href: '/settings',    label: 'Settings',      icon: Settings,        roles: ['admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin:            'Administrator',
  sales_operator:   'Sales Operator',
  accounts:         'Accounts',
  report_viewer:    'Report Viewer',
  vehicle_manager:  'Vehicle Manager',
  quarry_operator:  'Quarry Operator',
  partner:          'Partner',
};

export default function Sidebar() {
  const pathname = usePathname();
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const filtered = nav.filter(item => !user || item.roles.includes(user.role));

  const logout = () => {
    ['token', 'user', 'crusher', 'crushers_list'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BM';

  return (
    <aside
      className="w-64 flex flex-col h-screen sticky top-0 flex-shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #060f20 0%, #091628 50%, #0c1f3d 100%)',
        borderRight: '1px solid #1f3659',
      }}
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div
        className="px-5 py-5 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #1f3659' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg"
          style={{
            background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)',
            color: '#0c1f3d',
            boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
          }}
        >
          B
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white leading-tight">BlueMetal Pro</p>
          <p
            className="text-[10px] font-semibold mt-0.5 tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #f0d878)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            QUARRY ERP
          </p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {filtered.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative select-none"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)',
                      border: '1px solid rgba(201,168,76,0.25)',
                      color: '#f0d878',
                    }
                  : {
                      border: '1px solid transparent',
                      color: 'rgba(200,212,232,0.65)',
                    }
              }
            >
              {/* Active left accent */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #f0d878, #c9a84c)' }}
                />
              )}

              <item.icon
                size={16}
                style={{ color: active ? '#e8c96a' : 'rgba(200,212,232,0.5)', flexShrink: 0 }}
                className="transition-colors group-hover:!text-white/80"
              />
              <span className="flex-1 truncate font-medium group-hover:text-white transition-colors">
                {item.label}
              </span>
              {active && (
                <ChevronRight size={12} style={{ color: 'rgba(201,168,76,0.6)', flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User profile ──────────────────────────── */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #1f3659' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)',
              color: '#0c1f3d',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(200,212,232,0.5)' }}>
              {ROLE_LABELS[user?.role] || user?.role || 'Unknown role'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-all duration-150"
          style={{ color: 'rgba(200,212,232,0.5)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,212,232,0.5)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
