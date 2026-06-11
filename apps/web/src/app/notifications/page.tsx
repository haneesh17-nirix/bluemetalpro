'use client';
import { useEffect, useState } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import {
  Bell, ShoppingCart, Package, Wrench, Mountain,
  FileText, Truck, Users, Scale, DollarSign, CheckCheck, Inbox,
} from 'lucide-react';

const EVENT_META: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  sale:        { icon: ShoppingCart, color: '#d4a828', bg: 'rgba(200,144,24,0.12)',  border: 'rgba(200,144,24,0.3)' },
  purchase:    { icon: Package,      color: '#7aacec', bg: 'rgba(26,53,112,0.2)',    border: 'rgba(46,88,168,0.35)' },
  maintenance: { icon: Wrench,       color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.2)' },
  quarry:      { icon: Mountain,     color: '#a78bfa', bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.2)' },
  wages:       { icon: FileText,     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.15)' },
  vehicle:     { icon: Truck,        color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   border: 'rgba(56,189,248,0.2)' },
  party:       { icon: Users,        color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)' },
  weighbridge: { icon: Scale,        color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.2)' },
  ledger:      { icon: DollarSign,   color: '#3ec86a', bg: 'rgba(42,128,64,0.15)',   border: 'rgba(42,128,64,0.25)' },
};

const DEFAULT_META = { icon: Bell, color: '#7aacec', bg: 'rgba(26,53,112,0.15)', border: 'rgba(46,88,168,0.3)' };

function groupByDate(items: any[]) {
  const groups: Record<string, any[]> = {};
  for (const n of items) {
    const d = new Date(n.sent_at);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  useEffect(() => { log.page('Notifications'); }, []);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 100],
    queryFn: () => getNotifications(100),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 100] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications', 100] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const EVENT_TYPES = [...new Set(notifications.map((n: any) => n.type))];
  const filtered = filter === 'all' ? notifications
    : filter === 'unread' ? notifications.filter((n: any) => !n.is_read)
    : notifications.filter((n: any) => n.type === filter);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const groups = groupByDate(filtered);

  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      {unreadCount > 0 && (
        <button
          onClick={() => readAllMutation.mutate()}
          disabled={readAllMutation.isPending}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px' }}
        >
          <CheckCheck size={14} /> Mark all read
        </button>
      )}
    </div>
  );

  return (
    <AppLayout
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      actions={actions}
    >
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f ? 'rgba(200,144,24,0.15)' : 'rgba(255,255,255,0.04)',
              border: filter === f ? '1px solid rgba(200,144,24,0.35)' : '1px solid rgba(255,255,255,0.07)',
              color: filter === f ? '#d4a828' : 'rgba(200,212,232,0.55)',
            }}
          >
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
        {EVENT_TYPES.map((type: any) => {
          const meta = EVENT_META[type] ?? DEFAULT_META;
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: filter === type ? meta.bg : 'rgba(255,255,255,0.04)',
                border: filter === type ? `1px solid ${meta.border}` : '1px solid rgba(255,255,255,0.07)',
                color: filter === type ? meta.color : 'rgba(200,212,232,0.55)',
              }}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Inbox size={36} style={{ color: 'rgba(200,212,232,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(200,212,232,0.4)', fontSize: 14 }}>No notifications found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(groups).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="section-title" style={{ marginBottom: 8 }}>{dateLabel}</p>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((n: any, idx: number) => {
                  const meta = EVENT_META[n.type] ?? DEFAULT_META;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.is_read) readMutation.mutate(n.id); }}
                      style={{
                        display: 'flex', gap: 14, padding: '14px 18px',
                        cursor: n.is_read ? 'default' : 'pointer',
                        background: n.is_read ? 'transparent' : 'rgba(200,144,24,0.03)',
                        borderBottom: idx < items.length - 1 ? '1px solid rgba(42,78,138,0.2)' : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!n.is_read) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'rgba(200,144,24,0.03)'; }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: meta.bg, border: `1px solid ${meta.border}`,
                      }}>
                        <Icon size={16} style={{ color: meta.color }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <p style={{
                            fontSize: 13, fontWeight: n.is_read ? 400 : 600, lineHeight: 1.3,
                            color: n.is_read ? 'rgba(200,212,232,0.65)' : '#e8edf5',
                          }}>{n.title}</p>
                          <span style={{ fontSize: 11, color: 'rgba(200,212,232,0.3)', flexShrink: 0, marginTop: 1 }}>
                            {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                          </span>
                        </div>
                        {n.body && (
                          <p style={{ fontSize: 12, marginTop: 3, color: 'rgba(200,212,232,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.body}
                          </p>
                        )}
                        <span style={{
                          display: 'inline-block', marginTop: 5,
                          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                        }}>{n.type}</span>
                      </div>

                      {/* Unread dot */}
                      {!n.is_read && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c89018', flexShrink: 0, marginTop: 6 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
