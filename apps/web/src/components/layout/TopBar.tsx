'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Bell, CheckCheck, X, LogOut, ArrowRight, RefreshCw,
  ShoppingCart, Package, Wrench, Mountain, FileText,
  Truck, Users, Scale, DollarSign, Inbox,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string; title: string; body: string; type: string;
  is_read: boolean; sent_at: string;
}

const TYPE_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  sale:        { icon: ShoppingCart, color: '#d4a828', bg: 'rgba(200,144,24,0.14)', label: 'Sale' },
  purchase:    { icon: Package,      color: '#7aacec', bg: 'rgba(26,53,112,0.22)',  label: 'Purchase' },
  maintenance: { icon: Wrench,       color: '#f87171', bg: 'rgba(248,113,113,0.12)',label: 'Maintenance' },
  quarry:      { icon: Mountain,     color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', label: 'Quarry' },
  wages:       { icon: FileText,     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',label: 'Wages' },
  vehicle:     { icon: Truck,        color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Vehicle' },
  party:       { icon: Users,        color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Party' },
  weighbridge: { icon: Scale,        color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Weighbridge' },
  payment:     { icon: DollarSign,   color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: 'Payment' },
};
const DEFAULT_META = { icon: Bell, color: '#7aacec', bg: 'rgba(26,53,112,0.15)', label: 'Other' };

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Super Admin',
  admin: 'Admin',
  operations: 'Operator',
  report_viewer: 'Partner',
};

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r: any) => r.data.count as number),
    refetchInterval: 30_000,
    initialData: 0,
  });
  const unread: number = unreadData ?? 0;

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'AU';
  const crusherStr = typeof window !== 'undefined' ? localStorage.getItem('crusher') : null;
  const crusherName = crusherStr ? (() => { try { return JSON.parse(crusherStr)?.name; } catch { return null; } })() : null;
  const tenantStr = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
  const tenantName = tenantStr ? (() => { try { return JSON.parse(tenantStr)?.name; } catch { return null; } })() : null;

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('temp_token');
    ['user', 'tenant', 'crusher', 'crushers_list', 'tenants_list'].forEach(k => localStorage.removeItem(k));
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  const switchCrusher = async () => {
    setUserOpen(false);
    try {
      const token = sessionStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }
      const payload: any = JSON.parse(atob(token.split('.')[1]));
      const tenantId = payload.tenant_id;
      if (!tenantId) { window.location.href = '/select-tenant'; return; }
      const res = await api.post('/auth/select-tenant', { tenant_id: tenantId });
      sessionStorage.setItem('temp_token', res.data.temp_token);
      localStorage.setItem('crushers_list', JSON.stringify(res.data.crushers));
      sessionStorage.removeItem('token');
      localStorage.removeItem('crusher');
      window.location.href = '/select-crusher';
    } catch {
      window.location.href = '/login';
    }
  };

  // SSE for real-time notifications
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
    if (!token) return;
    let aborted = false;
    const controller = new AbortController();
    const connect = async () => {
      try {
        // NEXT_PUBLIC_API_URL already ends with /api — do not add /api again
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (!aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.notifications?.length) {
                  qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
                  toast(data.notifications[0].title, {
                    icon: '🔔',
                    style: { background: '#121e30', color: '#e8edf5', border: '1px solid rgba(26,53,112,0.55)' },
                  });
                  setItems(prev => prev.length ? [...data.notifications, ...prev] : prev);
                }
              } catch { /* ignore malformed SSE */ }
            }
          }
        }
      } catch (err: any) {
        if (!aborted && err?.name !== 'AbortError') setTimeout(connect, 5000);
      }
    };
    connect();
    return () => { aborted = true; controller.abort(); };
  }, [qc]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openNotif = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (userOpen) setUserOpen(false);
    if (next) {
      setLoading(true);
      setFilter('all');
      try {
        const r = await api.get('/notifications?limit=30');
        setItems(r.data);
      } catch { /* ignore */ } finally { setLoading(false); }
    } else {
      // refresh count when closing
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read');
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const markRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await api.patch(`/notifications/${id}/read`);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  // Compute available type filters from loaded items
  const typesInItems = [...new Set(items.map(n => n.type))];

  const filtered = filter === 'all' ? items
    : filter === 'unread' ? items.filter(n => !n.is_read)
    : items.filter(n => n.type === filter);

  const localUnread = items.filter(n => !n.is_read).length;

  return (
    <>
      {/* Bell shake animation */}
      <style>{`
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(4deg); }
        }
        .bell-shake { animation: bell-shake 0.6s ease; }
        .notif-item-btn { opacity: 0; transition: opacity 0.12s; }
        .notif-item:hover .notif-item-btn { opacity: 1; }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', flexShrink: 0, position: 'relative',
        background: 'rgba(11,15,20,0.94)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(26,53,112,0.45)',
        boxShadow: '0 1px 0 rgba(184,149,62,0.06), 0 4px 24px rgba(0,0,0,0.35)',
        zIndex: 40,
      }}>
        {/* Left: title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 12, marginTop: 3, fontWeight: 500, color: 'rgba(200,212,232,0.5)' }}>{subtitle}</p>
            )}
          </div>
          {tenantName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 10px', borderRadius: 20, background: 'rgba(26,53,112,0.18)', border: '1px solid rgba(26,53,112,0.4)', fontSize: 11, fontWeight: 600, color: 'rgba(180,200,230,0.7)' }}>
              {tenantName}
            </div>
          )}
          {crusherName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 10px', borderRadius: 20, background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.18)', fontSize: 11, fontWeight: 600, color: '#c9a84c' }}>
              {crusherName}
            </div>
          )}
        </div>

        {/* Right: actions + bell + user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}

          {/* ── Notification bell ── */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={openNotif}
              className={unread > 0 && !notifOpen ? 'bell-shake' : ''}
              style={{
                width: 36, height: 36, borderRadius: 10, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                background: notifOpen ? 'rgba(184,149,62,0.14)' : 'rgba(255,255,255,0.05)',
                border: notifOpen ? '1px solid rgba(184,149,62,0.35)' : '1px solid rgba(26,53,112,0.55)',
                outline: 'none',
              }}
            >
              <Bell
                size={15}
                style={{ color: notifOpen ? '#c9a84c' : unread > 0 ? 'rgba(201,168,76,0.85)' : 'rgba(200,212,232,0.6)' }}
              />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 17, height: 17, padding: '0 4px',
                  borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #c9a84c, #e8c855)',
                  color: '#0c1f3d',
                  border: '2px solid #050e1e',
                  boxShadow: '0 0 8px rgba(201,168,76,0.5)',
                }}>{unread > 99 ? '99+' : unread}</span>
              )}
            </button>

            {/* ── Notification dropdown ── */}
            {notifOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: 380, borderRadius: 16,
                background: 'linear-gradient(160deg, #0f1f38 0%, #091629 100%)',
                border: '1px solid rgba(26,53,112,0.6)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(184,149,62,0.06)',
                zIndex: 100,
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px 11px', borderBottom: '1px solid rgba(26,53,112,0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={13} style={{ color: '#c9a84c' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8edf5' }}>Notifications</span>
                    {localUnread > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(201,168,76,0.14)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}>
                        {localUnread} unread
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {localUnread > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(200,212,232,0.7)', outline: 'none' }}
                      >
                        <CheckCheck size={11} /> Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,212,232,0.45)', outline: 'none' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 5, padding: '9px 12px 8px', overflowX: 'auto', borderBottom: '1px solid rgba(26,53,112,0.25)' }}>
                  {(['all', 'unread'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
                        cursor: 'pointer', outline: 'none', transition: 'all 0.12s',
                        background: filter === f ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                        border: filter === f ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.07)',
                        color: filter === f ? '#c9a84c' : 'rgba(200,212,232,0.5)',
                      }}
                    >
                      {f === 'all' ? `All (${items.length})` : `Unread (${localUnread})`}
                    </button>
                  ))}
                  {typesInItems.map(type => {
                    const m = TYPE_META[type] ?? DEFAULT_META;
                    return (
                      <button
                        key={type}
                        onClick={() => setFilter(filter === type ? 'all' : type)}
                        style={{
                          padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
                          cursor: 'pointer', outline: 'none', transition: 'all 0.12s',
                          background: filter === type ? m.bg : 'rgba(255,255,255,0.04)',
                          border: filter === type ? `1px solid ${m.color}40` : '1px solid rgba(255,255,255,0.07)',
                          color: filter === type ? m.color : 'rgba(200,212,232,0.5)',
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* List */}
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ height: 58, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                      <Inbox size={24} style={{ color: 'rgba(200,212,232,0.15)', display: 'block', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 12, color: 'rgba(200,212,232,0.3)' }}>
                        {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                      </p>
                    </div>
                  ) : filtered.map((n, idx) => {
                    const m = TYPE_META[n.type] ?? DEFAULT_META;
                    const Icon = m.icon;
                    return (
                      <div
                        key={n.id}
                        className="notif-item"
                        style={{
                          display: 'flex', gap: 11, padding: '10px 14px', cursor: 'pointer',
                          background: n.is_read ? 'transparent' : 'rgba(201,168,76,0.035)',
                          borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          transition: 'background 0.12s', position: 'relative',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(201,168,76,0.035)'; }}
                        onClick={() => !n.is_read && markRead(n.id)}
                      >
                        {/* Type icon */}
                        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.bg, border: `1px solid ${m.color}30`, marginTop: 1 }}>
                          <Icon size={14} style={{ color: m.color }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: n.is_read ? 'rgba(200,212,232,0.6)' : '#e8edf5', lineHeight: 1.35, margin: 0 }}>
                              {n.title}
                            </p>
                            <span style={{ fontSize: 10, color: 'rgba(200,212,232,0.3)', flexShrink: 0, marginTop: 1, whiteSpace: 'nowrap' }}>
                              {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                            </span>
                          </div>
                          {n.body && (
                            <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(200,212,232,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
                              {n.body}
                            </p>
                          )}
                        </div>

                        {/* Unread dot + mark-read button on hover */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2 }}>
                          {!n.is_read && (
                            <>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a84c', boxShadow: '0 0 5px rgba(201,168,76,0.6)' }} />
                              <button
                                className="notif-item-btn"
                                onClick={e => markRead(n.id, e)}
                                title="Mark as read"
                                style={{ width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(200,212,232,0.6)', outline: 'none' }}
                              >
                                <CheckCheck size={10} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid rgba(26,53,112,0.35)', padding: '8px 12px' }}>
                  <Link
                    href="/notifications"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
                      fontSize: 12, fontWeight: 600, color: '#c9a84c',
                      background: 'rgba(184,149,62,0.07)', border: '1px solid rgba(184,149,62,0.15)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(184,149,62,0.13)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(184,149,62,0.07)'; }}
                  >
                    View all notifications <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── User avatar + dropdown ── */}
          <div style={{ position: 'relative' }} ref={userRef}>
            <button
              onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px',
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                background: userOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: userOpen ? '1px solid rgba(26,53,112,0.55)' : '1px solid rgba(26,53,112,0.35)',
                outline: 'none',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#0c1f3d', background: 'linear-gradient(135deg, #7a5e22, #c9a84c)' }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#e8edf5', lineHeight: 1, whiteSpace: 'nowrap', margin: 0 }}>{user?.name || 'User'}</p>
                <p style={{ fontSize: 10, color: 'rgba(200,212,232,0.45)', marginTop: 2, whiteSpace: 'nowrap', margin: '2px 0 0' }}>{ROLE_LABELS[user?.role] || user?.role}</p>
              </div>
            </button>

            {userOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 210, borderRadius: 14,
                background: 'linear-gradient(160deg, #0f1f38 0%, #091629 100%)',
                border: '1px solid rgba(26,53,112,0.6)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
                zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,53,112,0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#0c1f3d', background: 'linear-gradient(135deg, #7a5e22, #c9a84c)' }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.name || 'User'}</p>
                      <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)', marginTop: 2, margin: '2px 0 0' }}>{ROLE_LABELS[user?.role] || user?.role}</p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 6 }}>
                  <button
                    onClick={switchCrusher}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none', color: 'rgba(200,212,232,0.6)', transition: 'all 0.12s', textAlign: 'left', outline: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,212,232,0.6)'; }}
                  >
                    <RefreshCw size={14} /> Switch Plant
                  </button>
                  <button
                    onClick={logout}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none', color: 'rgba(200,212,232,0.6)', transition: 'all 0.12s', textAlign: 'left', outline: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,212,232,0.6)'; }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
