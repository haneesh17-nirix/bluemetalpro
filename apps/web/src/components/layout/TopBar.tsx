'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  sent_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  sale: '#4ade80',
  purchase: '#60a5fa',
  maintenance: '#f59e0b',
  quarry: '#a78bfa',
  wages: '#34d399',
  payment: '#e8c96a',
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

  // Fetch unread count + open SSE stream on mount
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
          const text = decoder.decode(value);
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.notifications?.length) {
                  setUnread(u => u + data.notifications.length);
                  const first = data.notifications[0];
                  toast(first.title, {
                    icon: '🔔',
                    style: { background: '#162c52', color: '#e8edf5', border: '1px solid #2a4570' },
                  });
                  // Prepend to open panel if it's showing
                  setItems(prev => prev.length ? [...data.notifications, ...prev] : prev);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      } catch (err: any) {
        if (!aborted && err?.name !== 'AbortError') {
          setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  // Close panel on outside click
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
      try {
        const r = await api.get('/notifications?limit=20');
        setItems(r.data);
      } catch { /* ignore */ } finally { setLoading(false); }
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

  return (
    <header
      className="flex items-center justify-between px-6 py-4 flex-shrink-0 relative"
      style={{
        borderBottom: '1px solid #1f3659',
        background: 'rgba(9,22,40,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 40,
      }}
    >
      <div>
        <h1 className="text-xl font-bold text-white leading-none tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(200,212,232,0.55)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3" ref={panelRef}>
        {/* Bell button */}
        <button
          onClick={openPanel}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{
            background: open ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
            border: open ? '1px solid rgba(201,168,76,0.3)' : '1px solid #2a4570',
          }}
        >
          <Bell size={16} style={{ color: open ? '#e8c96a' : 'rgba(200,212,232,0.7)' }} />
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: '#e8c96a', color: '#0c1f3d' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className="absolute top-full right-4 mt-2 w-96 rounded-2xl overflow-hidden"
            style={{
              background: '#0f1f3a',
              border: '1px solid #2a4570',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid #1f3659' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={14} style={{ color: '#e8c96a' }} />
                <span className="text-sm font-semibold text-white">Notifications</span>
                {unread > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(232,201,106,0.15)', color: '#e8c96a' }}
                  >
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{ color: 'rgba(200,212,232,0.6)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: 'rgba(200,212,232,0.4)', background: 'rgba(255,255,255,0.05)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm" style={{ color: 'rgba(200,212,232,0.4)' }}>
                  Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={24} className="mx-auto mb-2" style={{ color: 'rgba(200,212,232,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(200,212,232,0.35)' }}>No notifications yet</p>
                </div>
              ) : (
                items.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    className="flex gap-3 px-4 py-3 transition-all cursor-pointer"
                    style={{
                      background: n.is_read ? 'transparent' : 'rgba(201,168,76,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(201,168,76,0.04)'; }}
                  >
                    {/* Type dot */}
                    <div
                      className="flex-shrink-0 mt-1 w-2 h-2 rounded-full"
                      style={{
                        background: TYPE_COLORS[n.type] ?? '#60a5fa',
                        boxShadow: `0 0 6px ${TYPE_COLORS[n.type] ?? '#60a5fa'}60`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium leading-tight"
                        style={{ color: n.is_read ? 'rgba(200,212,232,0.6)' : '#e8edf5' }}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(200,212,232,0.4)' }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(200,212,232,0.3)' }}>
                        {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ background: '#e8c96a' }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {actions}
      </div>
    </header>
  );
}
