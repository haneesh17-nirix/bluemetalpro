'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { log } from '@bluemetal/shared';
import { getCrushers, getCrusherUsers } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Factory, Users, ChevronDown, ChevronUp } from 'lucide-react';


function CrusherRow({ crusher }: { crusher: any }) {
  const [expanded, setExpanded] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['crusher-users', crusher.id],
    queryFn: () => getCrusherUsers(crusher.id),
    enabled: expanded,
  });

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--surface-border, rgba(255,255,255,0.1))' }}>
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.2)' }}>
              {crusher.logo_url
                ? <img src={crusher.logo_url} alt={crusher.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
                : <span className="text-gold text-sm font-bold">{crusher.name?.charAt(0)}</span>
              }
            </div>
            <span className="font-medium text-white text-sm">{crusher.name}</span>
          </div>
        </td>
        <td className="text-sm text-white/60" style={{ padding: '12px 16px' }}>{crusher.legal_name || '—'}</td>
        <td className="text-sm text-white/60 font-mono" style={{ padding: '12px 16px' }}>{crusher.gstin || '—'}</td>
        <td className="text-sm text-white/60" style={{ padding: '12px 16px' }}>{[crusher.city, crusher.state].filter(Boolean).join(', ') || '—'}</td>
        <td style={{ padding: '12px 16px' }}>
          <span className={`badge ${crusher.is_active !== false ? 'badge-blue' : 'badge-gray'}`}>
            {crusher.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style={{ padding: '12px 16px' }}>
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost text-xs" style={{ padding: 6, display: 'flex', alignItems: 'center', gap: 4 }} title="Users">
            <Users size={14} />
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: '12px 16px', background: 'var(--surface-hover, rgba(255,255,255,0.03))' }}>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ marginBottom: 12 }}>Users with Access</p>
            {users.length === 0 ? (
              <p className="text-white/30 text-sm py-2">No users assigned</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(users as any[]).map((u: any) => (
                  <div key={u.user_id || u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-sm text-white font-medium">{u.name || u.user_name}</p>
                      <p className="text-xs text-white/40">{u.email} · <span className="text-gold/70">{u.role}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function CrushersPage() {
  const { data: crushers = [], isLoading } = useQuery({ queryKey: ['crushers'], queryFn: getCrushers });

  useEffect(() => { log.page('Crushers'); }, []);

  return (
    <AppLayout title="Crusher Management" subtitle="Crushing plants in your company">
      <div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--surface-border, rgba(255,255,255,0.1))' }}>
              <Factory size={18} className="text-gold" />
              <h2 className="font-semibold text-white" style={{ marginLeft: 12 }}>All Crushers</h2>
              <span className="badge badge-gray" style={{ marginLeft: 8 }}>{crushers.length}</span>
            </div>

            <div className="table-wrapper">
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border, rgba(255,255,255,0.1))' }}>
                    {['Name', 'Legal Name', 'GSTIN', 'Location', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider" style={{ padding: '12px 16px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center text-white/30" style={{ padding: '32px 16px' }}>Loading…</td></tr>
                  ) : crushers.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-white/30" style={{ padding: '32px 16px' }}>No crushers found</td></tr>
                  ) : crushers.map((c: any) => (
                    <CrusherRow key={c.id} crusher={c} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </AppLayout>
  );
}
