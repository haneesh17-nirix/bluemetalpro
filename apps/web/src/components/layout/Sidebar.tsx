'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, FileText,
  BarChart3, Wrench, DollarSign, Mountain, Settings, LogOut,
  Scale, Camera, ChevronRight, Factory,
} from 'lucide-react';

const nav = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','sales_operator','report_viewer','accounts','quarry_operator','partner'], admin: false },
  { href: '/sales',       label: 'Sales',         icon: ShoppingCart,    roles: ['admin','sales_operator','accounts','partner'], admin: false },
  { href: '/purchases',   label: 'Purchases',     icon: Package,         roles: ['admin','accounts','partner'], admin: false },
  { href: '/quarry',      label: 'Quarry',        icon: Mountain,        roles: ['admin','quarry_operator','accounts'], admin: false },
  { href: '/weighbridge', label: 'Weighbridge',   icon: Scale,           roles: ['admin','sales_operator','accounts','quarry_operator'], admin: false },
  { href: '/parties',     label: 'Parties',       icon: Users,           roles: ['admin','sales_operator','accounts'], admin: false },
  { href: '/vehicles',    label: 'Vehicles',      icon: Truck,           roles: ['admin','vehicle_manager','sales_operator'], admin: false },
  { href: '/ledger',      label: 'Ledger',        icon: DollarSign,      roles: ['admin','accounts','partner'], admin: false },
  { href: '/reports',     label: 'Reports',       icon: BarChart3,       roles: ['admin','report_viewer','accounts','partner'], admin: false },
  { href: '/cameras',     label: 'Live Cameras',  icon: Camera,          roles: ['admin','vehicle_manager'], admin: false },
  { href: '/maintenance', label: 'Maintenance',   icon: Wrench,          roles: ['admin','vehicle_manager'], admin: false },
  { href: '/wages',       label: 'Wages',         icon: FileText,        roles: ['admin','accounts'], admin: false },
  { href: '/users',       label: 'Users',         icon: Users,           roles: ['admin'], admin: true },
  { href: '/crushers',    label: 'Crushers',      icon: Factory,         roles: ['admin'], admin: true },
  { href: '/settings',    label: 'Settings',      icon: Settings,        roles: ['admin'], admin: true },
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

function NavItem({ item, pathname }: { item: typeof nav[0]; pathname: string }) {
  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

  const activeStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    color: '#f0d878',
    borderLeft: '3px solid #e8c96a',
    paddingLeft: 10,
  };
  const inactiveStyle: React.CSSProperties = {
    border: '1px solid transparent',
    color: 'rgba(200,212,232,0.65)',
  };

  return (
    <Link
      href={item.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 12,
        fontSize: 13, fontWeight: 500, textDecoration: 'none',
        transition: 'all 0.15s',
        position: 'relative',
        ...(active ? activeStyle : inactiveStyle),
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(200,212,232,0.65)';
        }
      }}
    >
      <item.icon size={15} style={{ color: active ? '#e8c96a' : 'rgba(200,212,232,0.5)', flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      {active && <ChevronRight size={12} style={{ color: 'rgba(201,168,76,0.6)', flexShrink: 0 }} />}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const crusherStr = typeof window !== 'undefined' ? localStorage.getItem('crusher') : null;
  const crusherName = crusherStr ? (() => { try { return JSON.parse(crusherStr)?.name; } catch { return null; } })() : null;
  const filtered = nav.filter(item => !user || item.roles.includes(user.role));

  const mainItems = filtered.filter(item => !item.admin);
  const adminItems = filtered.filter(item => item.admin);

  const logout = () => {
    ['token', 'user', 'crusher', 'crushers_list'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BM';

  return (
    <aside
      style={{
        width: '256px',
        minWidth: '256px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        overflow: 'hidden',
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

      {/* ── Crusher badge ─────────────────────────── */}
      {crusherName && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
            fontSize: 11, fontWeight: 600, color: '#e8c96a',
            maxWidth: '100%',
          }}>
            <Factory size={11} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crusherName}</span>
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mainItems.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}

        {adminItems.length > 0 && (
          <>
            <div style={{ margin: '10px 4px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(200,212,232,0.3)', textTransform: 'uppercase' }}>Admin</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(42,69,112,0.6)' }} />
            </div>
            {adminItems.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}
          </>
        )}
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
