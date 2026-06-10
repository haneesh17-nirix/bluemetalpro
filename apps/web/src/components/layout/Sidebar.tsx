'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, FileText,
  BarChart3, Wrench, DollarSign, Mountain, Settings,
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

function NavItem({ item, pathname }: { item: typeof nav[0]; pathname: string }) {
  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

  const activeStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(184,149,62,0.14) 0%, rgba(184,149,62,0.06) 100%)',
    border: '1px solid rgba(184,149,62,0.2)',
    borderLeft: '3px solid #c9a84c',
    color: '#d4aa52',
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
        transition: 'all 0.15s', position: 'relative',
        ...(active ? activeStyle : inactiveStyle),
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLAnchorElement).style.color = '#e8edf5';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(200,212,232,0.65)';
        }
      }}
    >
      <item.icon size={15} style={{ color: active ? '#c9a84c' : 'rgba(200,212,232,0.45)', flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      {active && <ChevronRight size={12} style={{ color: 'rgba(184,149,62,0.5)', flexShrink: 0 }} />}
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

  return (
    <aside style={{
      width: 256, minWidth: 256, display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #050e1e 0%, #081525 50%, #0a1c35 100%)',
      borderRight: '1px solid rgba(30,52,88,0.8)',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 20px 18px', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, borderBottom: '1px solid rgba(30,52,88,0.8)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 18, color: '#0c1f3d',
          background: 'linear-gradient(135deg, #7a5e22, #c9a84c)',
          boxShadow: '0 4px 12px rgba(184,149,62,0.25)',
        }}>B</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2, margin: 0 }}>
            BlueMetal Pro
          </p>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginTop: 3,
            background: 'linear-gradient(135deg, #b8953e, #d4aa52)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>QUARRY ERP</p>
        </div>
      </div>

      {/* ── Crusher badge ── */}
      {crusherName && (
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 20,
            background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.18)',
            fontSize: 11, fontWeight: 600, color: '#c9a84c',
          }}>
            <Factory size={10} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {crusherName}
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {mainItems.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}

        {adminItems.length > 0 && (
          <>
            <div style={{
              margin: '12px 6px 6px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(184,149,62,0.45)', textTransform: 'uppercase',
              }}>Admin</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(184,149,62,0.1)' }} />
            </div>
            {adminItems.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}
          </>
        )}
      </nav>

    </aside>
  );
}
