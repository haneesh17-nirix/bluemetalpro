'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import { getUsers, createUser, updateUser } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, ShieldCheck, Eye, EyeOff, Users, UserCheck, Shield } from 'lucide-react';

type UserRole = 'admin' | 'operations' | 'report_viewer';

const roleConfig: Record<UserRole, { label: string; badge: string; permissions: string[] }> = {
  admin: {
    label: 'Admin',
    badge: 'badge-red',
    permissions: ['Full access to all modules', 'User management', 'Company config', 'Cancel records'],
  },
  operations: {
    label: 'Operations',
    badge: 'badge-blue',
    permissions: ['Sales, purchases & quarry', 'Vehicles & maintenance', 'Ledger & receipts', 'Wages & payroll'],
  },
  report_viewer: {
    label: 'Report Viewer',
    badge: 'badge-gem',
    permissions: ['View all reports', 'View sales & ledger', 'No create/edit access'],
  },
};

const emptyForm = { name: '', email: '', phone: '', role: 'operations' as UserRole, password: '', is_active: true };

export default function UsersPage() {
  useEffect(() => { log.page('Users'); }, []);
  const router = useRouter();
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (typeof window !== 'undefined' && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, router]);

  if (!isAdmin) return null;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [resetModal, setResetModal] = useState<{ user: any; password: string } | null>(null);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editUser ? updateUser(editUser.id, data) : createUser(data),
    onSuccess: (data: any) => {
      log.action('User created', { email: data?.email, role: data?.role });
      toast.success(editUser ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditUser(null);
      setForm(emptyForm);
    },
    onError: (err: any) => { log.error('User creation failed'); toast.error(err.response?.data?.error || 'Failed to save user'); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/users/${id}`, { is_active }).then(r => r.data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: () => { toast.success('Password reset'); setResetModal(null); },
    onError: () => toast.error('Failed to reset password'),
  });

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, phone: user.phone || '', role: user.role, password: '', is_active: user.is_active });
    setShowForm(true);
  };

  const roleGroups = Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][];

  const pageActions = isAdmin ? (
    <button
      onClick={() => { setEditUser(null); setForm(emptyForm); setShowForm(true); }}
      className="btn-primary text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <Plus size={16} /> Add User
    </button>
  ) : null;

  const activeCount = (users as any[]).filter((u: any) => u.is_active).length;
  const adminCount = (users as any[]).filter((u: any) => u.role === 'admin').length;

  const userStats = [
    { label: 'Total Users', value: String((users as any[]).length), icon: Users, color: '#60a5fa' },
    { label: 'Active', value: String(activeCount), sub: 'Can log in', icon: UserCheck, color: '#34d399' },
    { label: 'Administrators', value: String(adminCount), icon: Shield, color: '#f87171' },
    { label: 'Roles in Use', value: String(new Set((users as any[]).map((u: any) => u.role)).size), icon: ShieldCheck, color: '#e8c96a' },
  ];

  return (
    <AppLayout title="Users" subtitle="Team accounts and access control" actions={pageActions}>
      <StatsRow stats={userStats} />

      {/* Table + Role docs side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

        {/* Users table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="text-sm" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Role', 'Status', 'Created', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium text-white">{u.name}</td>
                    <td className="text-white/60">{u.email}</td>
                    <td className="text-white/50">{u.phone || '—'}</td>
                    <td>
                      <span className={roleConfig[u.role as UserRole]?.badge || 'badge-gray'}>
                        {roleConfig[u.role as UserRole]?.label || u.role}
                      </span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                          className={`text-xs font-medium transition-colors ${u.is_active ? 'badge-gem' : 'badge-red'}`}
                          style={{ padding: '2px 8px', borderRadius: 9999 }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`text-xs font-medium ${u.is_active ? 'badge-gem' : 'badge-red'}`} style={{ padding: '2px 8px', borderRadius: 9999 }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="text-white/40 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button onClick={() => openEdit(u)} className="text-xs text-[#c9a84c] hover:underline font-medium">Edit</button>
                          <button onClick={() => setResetModal({ user: u, password: '' })} className="text-xs text-white/50 hover:text-white hover:underline font-medium">Reset pwd</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!(users as any[]).length && <p className="text-center text-white/30 py-10">No users found</p>}
          </div>
        </div>

        {/* Role reference — right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(184,149,62,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Role Permissions</p>
          {roleGroups.map(([role, cfg]) => (
            <div key={role} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />
                <span className={cfg.badge} style={{ fontSize: 11 }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(200,212,232,0.3)', marginLeft: 'auto' }}>
                  {(users as any[]).filter((u: any) => u.role === role && u.is_active).length} active
                </span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {cfg.permissions.map(p => (
                  <li key={p} style={{ display: 'flex', gap: 6, fontSize: 11, color: 'rgba(200,212,232,0.45)' }}>
                    <span style={{ color: '#34d399', flexShrink: 0 }}>✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>

      {/* Add/Edit User modal */}
      {isAdmin && showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="card-gold" style={{ width: '100%', maxWidth: 512, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="text-lg font-bold text-white">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div>
                    <label className="label">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" disabled={!!editUser} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="select">
                    {roleGroups.map(([r, cfg]) => <option key={r} value={r}>{cfg.label}</option>)}
                  </select>
                  <p className="text-xs text-white/30" style={{ marginTop: 4 }}>
                    {roleConfig[form.role]?.permissions.slice(0, 2).join(' · ')}
                  </p>
                </div>
                {!editUser && (
                  <div>
                    <label className="label">Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input required type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="input" style={{ paddingRight: 40 }} minLength={8} placeholder="Min 8 characters" />
                      <button type="button" className="text-white/40 hover:text-white/70" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPassword(s => !s)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
                {editUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ borderRadius: 4 }} />
                    <label htmlFor="is_active" className="text-sm text-white/70">Active (can log in)</label>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-60">
                  {saveMutation.isPending ? 'Saving…' : editUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {isAdmin && resetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="card-gold" style={{ width: '100%', maxWidth: 384, padding: 24 }}>
            <h2 className="text-lg font-bold text-white" style={{ marginBottom: 4 }}>Reset Password</h2>
            <p className="text-sm text-white/50" style={{ marginBottom: 16 }}>Set a new password for <strong className="text-white">{resetModal.user.name}</strong></p>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input type={showPassword ? 'text' : 'password'} value={resetModal.password}
                onChange={e => setResetModal(m => m ? { ...m, password: e.target.value } : m)}
                className="input" style={{ paddingRight: 40 }} minLength={8} placeholder="New password (min 8 chars)" />
              <button type="button" className="text-white/40 hover:text-white/70" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPassword(s => !s)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setResetModal(null)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resetModal.user.id, password: resetModal.password })}
                disabled={resetPasswordMutation.isPending || resetModal.password.length < 8}
                className="btn-primary disabled:opacity-60" style={{ flex: 1 }}
              >
                {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
