'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { selectTenant } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string; title: string; body: string; type: string;
  is_read: boolean; sent_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  sale: '#4ade80', purchase: '#60a5fa', maintenance: '#f59e0b',
  quarry: '#a78bfa', wages: '#34d399', payment: '#c9a84c',
};

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
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r: { data: { count: number } }) => r.data.count),
    initialData: 0,
  });
  const unread: number = unreadData ?? 0;

  // Load user info
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'AU';
  const crusherStr = typeof window !== 'undefined' ? localStorage.getItem('crusher') : null;
  const crusherName = crusherStr ? (() => { try { return JSON.parse(crusherStr)?.name; } catch { return null; } })() : null;
  const tenantStr = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
  const tenantName = tenantStr ? (() => { try { return JSON.parse(tenantStr)?.name; } catch { return null; } })() : null;

  const logout = () => {
    ['token', 'temp_token', 'user', 'tenant', 'crusher', 'crushers_list', 'tenants_list'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const switchCrusher = async () => {
    setUserOpen(false);
    try {
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/login'; return; }
      const payload: any = JSON.parse(atob(token.split('.')[1]));
      const tenantId = payload.tenant_id;
      if (!tenantId) { window.location.href = '/select-tenant'; return; }
      const res = await api.post('/auth/select-tenant', { tenant_id: tenantId });
      localStorage.setItem('temp_token', res.data.temp_token);
      localStorage.setItem('crushers_list', JSON.stringify(res.data.crushers));
      localStorage.removeItem('token');
      localStorage.removeItem('crusher');
      window.location.href = '/select-crusher';
    } catch {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    let aborted = false;
    const controller = new AbortController();
    const connect = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
        const res = await fetch(`${apiUrl}/api/notifications/stream`, {
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
              } catch { /* ignore */ }
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
      try { const r = await api.get('/notifications?limit=20'); setItems(r.data); }
      catch { /* ignore */ } finally { setLoading(false); }
    }
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read');
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    setItems(items.map(i => ({ ...i, is_read: true })));
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setItems(items.map(i => i.id === id ? { ...i, is_read: true } : i));
    qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', flexShrink: 0, position: 'relative',
      background: 'rgba(11,15,20,0.94)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(26,53,112,0.45)',
      boxShadow: '0 1px 0 rgba(184,149,62,0.06), 0 4px 24px rgba(0,0,0,0.35)',
      zIndex: 40,
    }}>
      {/* Left: title + crusher badge */}
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(26,53,112,0.18)', border: '1px solid rgba(26,53,112,0.4)',
            fontSize: 11, fontWeight: 600, color: 'rgba(180,200,230,0.7)',
          }}>{tenantName}</div>
        )}
        {crusherName && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.18)',
            fontSize: 11, fontWeight: 600, color: '#c9a84c',
          }}>{crusherName}</div>
        )}
      </div>

      {/* Right: actions + bell + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {actions}

        {/* Notification bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button onClick={openNotif} style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            background: notifOpen ? 'rgba(184,149,62,0.12)' : 'rgba(255,255,255,0.05)',
            border: notifOpen ? '1px solid rgba(184,149,62,0.3)' : '1px solid rgba(26,53,112,0.55)',
          }}>
            <Bell size={15} style={{ color: notifOpen ? '#c9a84c' : 'rgba(200,212,232,0.65)' }} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, padding: '0 3px',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                background: '#c9a84c', color: '#0c1f3d',
                border: '2px solid #050e1e',
              }}>{unread > 99 ? '99+' : unread}</span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 360, borderRadius: 14, overflow: 'hidden',
              background: 'linear-gradient(160deg, #172d54 0%, #102241 100%)',
              border: '1px solid rgba(26,53,112,0.55)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(26,53,112,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={13} style={{ color: '#c9a84c' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8edf5' }}>Notifications</span>
                  {unread > 0 && <span style={{ padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(184,149,62,0.15)', color: '#c9a84c' }}>{unread} new</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,212,232,0.7)' }}>
                      <CheckCheck size={11} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,212,232,0.5)' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'rgba(200,212,232,0.4)' }}>Loading…</div>
                ) : items.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <Bell size={22} style={{ color: 'rgba(200,212,232,0.15)', display: 'block', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'rgba(200,212,232,0.35)' }}>No notifications yet</p>
                  </div>
                ) : items.map(n => (
                  <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                    style={{ display: 'flex', gap: 10, padding: '11px 16px', cursor: 'pointer', background: n.is_read ? 'transparent' : 'rgba(184,149,62,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(184,149,62,0.04)'; }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: TYPE_COLORS[n.type] ?? '#60a5fa' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: n.is_read ? 'rgba(200,212,232,0.6)' : '#e8edf5', lineHeight: 1.3 }}>{n.title}</p>
                      {n.body && <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(200,212,232,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                      <p style={{ fontSize: 10, marginTop: 3, color: 'rgba(200,212,232,0.3)' }}>{formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}</p>
                    </div>
                    {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: '#c9a84c' }} />}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(26,53,112,0.4)', padding: '8px 12px' }}>
                <Link href="/notifications" onClick={() => setNotifOpen(false)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 8, textDecoration: 'none',
                  fontSize: 12, fontWeight: 600, color: '#c9a84c',
                  background: 'rgba(184,149,62,0.07)', border: '1px solid rgba(184,149,62,0.15)',
                  transition: 'all 0.15s',
                }}>
                  View all notifications <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <button onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px',
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
            background: userOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: userOpen ? '1px solid rgba(26,53,112,0.55)' : '1px solid rgba(26,53,112,0.35)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 11, color: '#0c1f3d',
              background: 'linear-gradient(135deg, #7a5e22, #c9a84c)',
            }}>{initials}</div>
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#e8edf5', lineHeight: 1, whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
              <p style={{ fontSize: 10, color: 'rgba(200,212,232,0.45)', marginTop: 2, whiteSpace: 'nowrap' }}>{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
          </button>

          {userOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 200, borderRadius: 12, overflow: 'hidden',
              background: 'linear-gradient(160deg, #172d54 0%, #102241 100%)',
              border: '1px solid rgba(26,53,112,0.55)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              zIndex: 50,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,53,112,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#0c1f3d', background: 'linear-gradient(135deg, #7a5e22, #c9a84c)' }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
                    <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)', marginTop: 2 }}>{ROLE_LABELS[user?.role] || user?.role}</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: 6 }}>
                <button onClick={switchCrusher} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', background: 'transparent', border: 'none',
                  color: 'rgba(200,212,232,0.6)', transition: 'all 0.12s', textAlign: 'left',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,212,232,0.6)'; }}
                >
                  <RefreshCw size={14} /> Switch Plant
                </button>
                <button onClick={logout} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', background: 'transparent', border: 'none',
                  color: 'rgba(200,212,232,0.6)', transition: 'all 0.12s', textAlign: 'left',
                }}
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
  );
}
