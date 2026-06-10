'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { log } from '@bluemetal/shared';
import toast from 'react-hot-toast';
import {
  getCrushers, createCrusher, updateCrusher,
  getCrusherUsers, grantCrusherAccess, revokeCrusherAccess, getUsers,
} from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Factory, Plus, Pencil, Users, X, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const FIELDS = [
  { key: 'name',          label: 'Name *',           required: true },
  { key: 'legal_name',    label: 'Legal Name' },
  { key: 'gstin',         label: 'GSTIN' },
  { key: 'pan',           label: 'PAN' },
  { key: 'address',       label: 'Address' },
  { key: 'city',          label: 'City' },
  { key: 'state',         label: 'State' },
  { key: 'phone',         label: 'Phone' },
  { key: 'email',         label: 'Email' },
  { key: 'invoice_prefix',         label: 'Invoice Prefix' },
  { key: 'quarry_invoice_prefix',  label: 'Quarry Invoice Prefix' },
  { key: 'bank_name',     label: 'Bank Name' },
  { key: 'bank_account',  label: 'Bank Account' },
  { key: 'bank_ifsc',     label: 'Bank IFSC' },
  { key: 'bank_branch',   label: 'Bank Branch' },
];

const ROLES = ['admin', 'sales_operator', 'accounts', 'report_viewer', 'vehicle_manager', 'quarry_operator'];

function CrusherModal({ crusher, onClose }: { crusher: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(crusher || {});

  const mutation = useMutation({
    mutationFn: (data: any) => crusher ? updateCrusher(crusher.id, data) : createCrusher(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crushers'] });
      toast.success(crusher ? 'Crusher updated' : 'Crusher created');
      onClose();
    },
    onError: () => toast.error('Failed to save crusher'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-full max-w-2xl card p-6 max-h-[90vh] overflow-y-auto" style={{ overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="text-lg font-bold text-white">{crusher ? 'Edit Crusher' : 'Add Crusher'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={f.key === 'address' ? { gridColumn: 'span 2' } : {}}>
              <label className="label">{f.label}</label>
              <input
                className="input"
                required={f.required}
                value={form[f.key] || ''}
                onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrantModal({ crusherId, onClose }: { crusherId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('sales_operator');

  const mutation = useMutation({
    mutationFn: () => grantCrusherAccess(crusherId, { user_id: userId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crusher-users', crusherId] });
      toast.success('Access granted');
      onClose();
    },
    onError: () => toast.error('Failed to grant access'),
  });

  return (
    <div className="fixed inset-0 z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-full max-w-sm card p-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="text-base font-bold text-white">Grant Access</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">User</label>
            <select className="input" value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">Select user…</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!userId || mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Grant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrusherRow({ crusher }: { crusher: any }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);

  const { data: users = [], refetch } = useQuery({
    queryKey: ['crusher-users', crusher.id],
    queryFn: () => getCrusherUsers(crusher.id),
    enabled: expanded,
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => revokeCrusherAccess(crusher.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crusher-users', crusher.id] });
      toast.success('Access revoked');
    },
    onError: () => toast.error('Failed to revoke access'),
  });

  return (
    <>
      {editOpen && <CrusherModal crusher={crusher} onClose={() => setEditOpen(false)} />}
      {grantOpen && <GrantModal crusherId={crusher.id} onClose={() => { setGrantOpen(false); refetch(); }} />}
      <tr className="border-b border-surface-border hover:bg-white/2 transition-colors">
        <td className="px-4 py-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.2)' }}>
              {crusher.logo_url
                ? <img src={crusher.logo_url} alt={crusher.name} className="w-7 h-7 object-contain rounded" />
                : <span className="text-gold text-sm font-bold">{crusher.name?.charAt(0)}</span>
              }
            </div>
            <span className="font-medium text-white text-sm">{crusher.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-white/60">{crusher.legal_name || '—'}</td>
        <td className="px-4 py-3 text-sm text-white/60 font-mono">{crusher.gstin || '—'}</td>
        <td className="px-4 py-3 text-sm text-white/60">{[crusher.city, crusher.state].filter(Boolean).join(', ') || '—'}</td>
        <td className="px-4 py-3">
          <span className={`badge ${crusher.is_active !== false ? 'badge-blue' : 'badge-gray'}`}>
            {crusher.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setEditOpen(true)} className="btn-ghost p-1.5" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={() => setExpanded(v => !v)} className="btn-ghost p-1.5 text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Users">
              <Users size={14} />
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-surface-hover">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Users with Access</p>
              <button onClick={() => setGrantOpen(true)} className="btn-primary text-xs py-1 px-3">
                <Plus size={12} /> Add User
              </button>
            </div>
            {users.length === 0 ? (
              <p className="text-white/30 text-sm py-2">No users assigned</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map((u: any) => (
                  <div key={u.user_id || u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-sm text-white font-medium">{u.name || u.user_name}</p>
                      <p className="text-xs text-white/40">{u.email} · <span className="text-gold/70">{u.role}</span></p>
                    </div>
                    <button onClick={() => revoke.mutate(u.user_id || u.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
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
  const [addOpen, setAddOpen] = useState(false);
  const { data: crushers = [], isLoading } = useQuery({ queryKey: ['crushers'], queryFn: getCrushers });

  useEffect(() => { log.page('Crushers'); }, []);

  return (
    <AppLayout title="Crusher Management" subtitle="Manage crushing plants and user access">
      <div>
          {addOpen && <CrusherModal crusher={null} onClose={() => setAddOpen(false)} />}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface-border, rgba(255,255,255,0.1))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Factory size={18} className="text-gold" />
                <h2 className="font-semibold text-white">All Crushers</h2>
                <span className="badge badge-gray">{crushers.length}</span>
              </div>
              <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
                <Plus size={15} /> Add Crusher
              </button>
            </div>

            <div className="table-wrapper">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Name', 'Legal Name', 'GSTIN', 'Location', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">Loading…</td></tr>
                  ) : crushers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No crushers found</td></tr>
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
