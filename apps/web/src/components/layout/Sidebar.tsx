'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, FileText,
  BarChart3, Wrench, DollarSign, Mountain, Settings,
  Scale, Camera, ChevronRight, Factory, MapPin, Phone, Mail,
  ChevronDown, RefreshCw, Check, Building2,
} from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';
import { useCrusher } from '@/contexts/CrusherContext';
import { getCrushers, selectCrusher } from '@/lib/api';

const ALL = ['admin', 'operations', 'report_viewer'];

const nav = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ALL,    admin: false },
  { href: '/sales',       label: 'Sales',         icon: ShoppingCart,    roles: ALL,    admin: false },
  { href: '/purchases',   label: 'Purchases',     icon: Package,         roles: ALL,    admin: false },
  { href: '/quarry',      label: 'Quarry',        icon: Mountain,        roles: ALL,    admin: false },
  { href: '/weighbridge', label: 'Weighbridge',   icon: Scale,           roles: ALL,    admin: false },
  { href: '/vehicles',    label: 'Vehicles',      icon: Truck,           roles: ALL,    admin: false },
  { href: '/ledger',      label: 'Ledger',        icon: DollarSign,      roles: ALL,    admin: false },
  { href: '/reports',     label: 'Reports',       icon: BarChart3,       roles: ALL,    admin: false },
  { href: '/cameras',     label: 'Live Cameras',  icon: Camera,          roles: ALL,    admin: false },
  { href: '/maintenance', label: 'Maintenance',   icon: Wrench,          roles: ALL,    admin: false },
  { href: '/wages',       label: 'Wages',         icon: FileText,        roles: ALL,    admin: false },
  { href: '/users',       label: 'Users',         icon: Users,           roles: ['admin'],    admin: true },
  { href: '/crushers',    label: 'Crushers',      icon: Factory,         roles: ['admin'],      admin: true },
  { href: '/settings',    label: 'Settings',      icon: Settings,        roles: ['admin'],    admin: true },
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

function CrusherCard() {
  const router = useRouter();
  const { crusher, setCrusher } = useCrusher();
  const [open, setOpen] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && plants.length === 0) {
      getCrushers().then(setPlants).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = async (plant: any) => {
    if (plant.id === crusher?.id) { setOpen(false); return; }
    setSwitching(plant.id);
    try {
      const data = await selectCrusher(plant.id);
      sessionStorage.setItem('token', data.token);
      document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
      localStorage.setItem('user', JSON.stringify(data.user));
      setCrusher(data.crusher);
      setOpen(false);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setSwitching(null);
    }
  };

  if (!crusher) return null;

  // Logo green: extracted from /logo-icon.png dominant hue — forest emerald
  const G = {
    base:   'rgba(34,160,90,0.12)',
    border: 'rgba(34,160,90,0.28)',
    glow:   'rgba(34,160,90,0.08)',
    icon:   '#22a05a',
    iconBg: 'rgba(34,160,90,0.15)',
    iconBorder: 'rgba(34,160,90,0.35)',
    text:   '#4dd68c',
    muted:  'rgba(34,160,90,0.45)',
    dim:    'rgba(34,160,90,0.25)',
  };

  return (
    <div ref={ref} style={{ padding: '10px 12px 0', position: 'relative' }}>
      {/* ── Card ── */}
      <div style={{
        borderRadius: 12,
        background: `linear-gradient(145deg, ${G.base}, rgba(34,160,90,0.05))`,
        border: `1px solid ${G.border}`,
        boxShadow: `0 0 16px ${G.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* green top-edge glow stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(34,160,90,0.6) 40%, rgba(72,210,130,0.8) 60%, transparent 100%)',
        }} />

        <div style={{ padding: '10px 11px 9px' }}>
          {/* header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${G.iconBg}, rgba(34,160,90,0.08))`,
              border: `1px solid ${G.iconBorder}`,
              boxShadow: `0 0 8px rgba(34,160,90,0.2)`,
            }}>
              <Building2 size={14} style={{ color: G.icon }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 11, fontWeight: 700,
                color: G.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2,
                textShadow: `0 0 12px rgba(34,160,90,0.4)`,
              }}>{crusher.name}</p>
              {crusher.city && (
                <p style={{ margin: 0, fontSize: 9, color: 'rgba(180,210,195,0.5)', lineHeight: 1.3 }}>
                  {crusher.city}{crusher.state ? `, ${crusher.state}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* detail rows */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            paddingBottom: 9, marginBottom: 8,
            borderBottom: `1px solid ${G.dim}`,
          }}>
            {crusher.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <MapPin size={9} style={{ color: G.muted, flexShrink: 0, marginTop: 1 }} />
                <span style={{
                  fontSize: 9.5, color: 'rgba(180,210,195,0.55)', lineHeight: 1.35,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{crusher.address}</span>
              </div>
            )}
            {crusher.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={9} style={{ color: G.muted, flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, color: 'rgba(180,210,195,0.55)' }}>{crusher.phone}</span>
              </div>
            )}
            {crusher.gstin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={9} style={{ color: G.muted, flexShrink: 0 }} />
                <span style={{ fontSize: 9.5, color: 'rgba(180,210,195,0.55)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                  {crusher.gstin}
                </span>
              </div>
            )}
          </div>

          {/* ── Switch button ── */}
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
              background: open
                ? 'linear-gradient(135deg, rgba(34,160,90,0.28), rgba(34,160,90,0.18))'
                : 'linear-gradient(135deg, rgba(34,160,90,0.18), rgba(34,160,90,0.10))',
              border: `1px solid ${open ? 'rgba(34,160,90,0.5)' : 'rgba(34,160,90,0.3)'}`,
              boxShadow: open ? '0 0 10px rgba(34,160,90,0.2)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <RefreshCw size={9} style={{ color: G.text, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: G.text, letterSpacing: '0.05em' }}>
              Switch Plant
            </span>
            <ChevronDown size={9} style={{
              color: G.muted, flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.18s ease',
            }} />
          </button>
        </div>
      </div>

      {/* plant switcher dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 12, right: 12, zIndex: 200,
          background: 'linear-gradient(145deg, #0c1a12, #0a1610)',
          border: `1px solid ${G.border}`, borderRadius: 10,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(34,160,90,0.06)`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '7px 10px 5px',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: G.muted, textTransform: 'uppercase',
            borderBottom: `1px solid ${G.dim}`,
          }}>Select Plant</div>
          {plants.length === 0 ? (
            <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
              <RefreshCw size={12} style={{ color: G.muted, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : plants.map(p => {
            const isCurrent = p.id === crusher?.id;
            const isLoading = switching === p.id;
            return (
              <button key={p.id} onClick={() => handleSwitch(p)} style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', cursor: isCurrent ? 'default' : 'pointer',
                background: isCurrent ? 'rgba(34,160,90,0.1)' : 'transparent',
                border: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,160,90,0.06)'; }}
              onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCurrent ? G.iconBg : 'rgba(34,160,90,0.06)',
                  border: `1px solid ${isCurrent ? G.iconBorder : G.dim}`,
                }}>
                  {isLoading
                    ? <RefreshCw size={10} style={{ color: G.icon, animation: 'spin 0.8s linear infinite' }} />
                    : <Factory size={10} style={{ color: isCurrent ? G.icon : G.muted }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? G.text : 'rgba(210,230,215,0.7)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</p>
                  {p.city && <p style={{ margin: 0, fontSize: 9, color: 'rgba(180,210,195,0.35)' }}>{p.city}</p>}
                </div>
                {isCurrent && <Check size={11} style={{ color: G.icon, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const filtered = nav.filter(item => !user || item.roles.includes(user.role));

  const mainItems = filtered.filter(item => !item.admin);
  const adminItems = filtered.filter(item => item.admin);

  return (
    <aside style={{
      width: 256, minWidth: 256, display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #0c1118 0%, #0e1420 50%, #0c1118 100%)',
      borderRight: '1px solid rgba(26,53,112,0.45)',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 20px 18px', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, borderBottom: '1px solid rgba(26,53,112,0.45)',
      }}>
        <div style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 16px rgba(160,112,32,0.45))' }}>
          <LogoIcon size={56} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em' }}>
            BlueMetal Pro
          </p>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', marginTop: 4,
            background: 'linear-gradient(135deg, #b8953e, #d4aa52)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>QUARRY ERP</p>
        </div>
      </div>

      {/* ── Crusher mini-dashboard card ── */}
      <CrusherCard />

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
