'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string; title: string; body: string; type: string;
  is_read: boolean; sent_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  sale: '#4ade80', purchase: '#60a5fa', maintenance: '#f59e0b',
  quarry: '#a78bfa', wages: '#34d399', payment: '#c9a84c',
};

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    api.get('/notifications/unread-count').then((r: { data: { count: number } }) => setUnread(r.data.count)).catch(() => {});
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
                  setUnread(u => u + data.notifications.length);
                  toast(data.notifications[0].title, {
                    icon: '🔔',
                    style: { background: '#172d54', color: '#e8edf5', border: '1px solid rgba(42,69,112,0.8)' },
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
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try { const r = await api.get('/notifications?limit=20'); setItems(r.data); }
      catch { /* ignore */ } finally { setLoading(false); }
    }
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read');
    setUnread(0);
    setItems(items.map(i => ({ ...i, is_read: true })));
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setItems(items.map(i => i.id === id ? { ...i, is_read: true } : i));
    setUnread(u => Math.max(0, u - 1));
  };

  const crusherStr = typeof window !== 'undefined' ? localStorage.getItem('crusher') : null;
  const crusherName = crusherStr ? (() => { try { return JSON.parse(crusherStr)?.name; } catch { return null; } })() : null;

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', flexShrink: 0, position: 'relative',
      background: 'rgba(5,14,30,0.9)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(30,52,88,0.9)',
      boxShadow: '0 1px 0 rgba(184,149,62,0.06), 0 4px 24px rgba(0,0,0,0.35)',
      zIndex: 40,
    }}>
      {/* Left: title + crusher badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: '#fff',
            lineHeight: 1, letterSpacing: '-0.02em', margin: 0,
          }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 12, marginTop: 4, fontWeight: 500, color: 'rgba(200,212,232,0.5)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {crusherName && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.18)',
            fontSize: 11, fontWeight: 600, color: '#c9a84c',
          }}>{crusherName}</div>
        )}
      </div>

      {/* Right: bell + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} ref={panelRef}>
        {/* Bell */}
        <button onClick={openPanel} style={{
          position: 'relative', width: 38, height: 38, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
          background: open ? 'rgba(184,149,62,0.12)' : 'rgba(255,255,255,0.05)',
          border: open ? '1px solid rgba(184,149,62,0.3)' : '1px solid rgba(42,69,112,0.7)',
        }}>
          <Bell size={15} style={{ color: open ? '#c9a84c' : 'rgba(200,212,232,0.65)' }} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              minWidth: 18, height: 18, padding: '0 4px',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              background: '#c9a84c', color: '#0c1f3d',
              border: '2px solid #050e1e',
            }}>{unread > 99 ? '99+' : unread}</span>
          )}
        </button>

        {/* Notification dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', right: 16, marginTop: 8,
            width: 380, borderRadius: 16, overflow: 'hidden',
            background: 'linear-gradient(160deg, #172d54 0%, #102241 100%)',
            border: '1px solid rgba(42,69,112,0.8)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            zIndex: 50,
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: '1px solid rgba(42,69,112,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={14} style={{ color: '#c9a84c' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#e8edf5' }}>Notifications</span>
                {unread > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: 'rgba(184,149,62,0.15)', color: '#c9a84c',
                  }}>{unread} new</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,212,232,0.7)',
                  }}>
                    <CheckCheck size={11} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,212,232,0.5)',
                }}>
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(200,212,232,0.4)' }}>
                  Loading…
                </div>
              ) : items.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                  <Bell size={24} style={{ color: 'rgba(200,212,232,0.15)', display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'rgba(200,212,232,0.35)' }}>No notifications yet</p>
                </div>
              ) : items.map(n => (
                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                    background: n.is_read ? 'transparent' : 'rgba(184,149,62,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(184,149,62,0.04)'; }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: TYPE_COLORS[n.type] ?? '#60a5fa',
                    boxShadow: `0 0 6px ${TYPE_COLORS[n.type] ?? '#60a5fa'}60`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: n.is_read ? 'rgba(200,212,232,0.6)' : '#e8edf5' }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(200,212,232,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: 'rgba(200,212,232,0.3)' }}>
                      {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6, background: '#c9a84c' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {actions}
      </div>
    </header>
  );
}
